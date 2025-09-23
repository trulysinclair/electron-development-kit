import { app, crashReporter } from 'electron';
import { EventEmitter, PointerCoords, isPointInBounds } from '../utils';
import { ElectronWindow } from './ElectronWindow';
import { ElectronView } from './ElectronView';
import {
  IWindowManager,
  IElectronWindow,
  IElectronView,
  WindowConfig,
  ViewConfig,
  WindowManagerConfig,
  SanitizedView,
  LoggerCallback,
} from '../types';

/**
 * Core window manager that orchestrates multiple windows and their views.
 * Provides advanced features like cross-window view dragging and automatic cleanup.
 */
export class WindowManager extends EventEmitter implements IWindowManager {
  public mainWindowId: string | null = null;

  private windows = new Map<string, IElectronWindow>();
  private views = new Map<string, IElectronView>();
  private viewRegistry = new Map<string, Set<string>>(); // windowId -> Set<viewId>
  private activeViews = new Map<string, string>(); // windowId -> activeViewId
  private closeQueue = Promise.resolve();
  private config: WindowManagerConfig;
  private logger?: LoggerCallback;

  constructor(config: WindowManagerConfig = {}) {
    super();

    this.config = config;
    this.logger = config.logger;

    this.logger?.info('WindowManager initialized');

    // Set up crash reporting if not already configured
    if (!crashReporter.getParameters()?.['submitURL']) {
      crashReporter.start({
        uploadToServer: false,
        submitURL: '',
        extra: {
          windowManager: 'true',
        },
      });
    }

    // Log crash dumps location for debugging
    this.logger?.info(`Crash dumps location: ${app.getPath('crashDumps')}`);
  }

  /**
   * Create a new window
   */
  createWindow(config: WindowConfig): IElectronWindow {
    this.logger?.info(`Creating window: ${config.title}`);

    const window = new ElectronWindow(config, this.logger);
    this.registerWindow(window);

    if (config.isMainWindow) {
      this.mainWindowId = window.id;
      this.logger?.info(`Set main window ID: ${window.id}`);
    }

    this.emit('window:created', { windowId: window.id });
    return window;
  }

  /**
   * Get a window by ID
   */
  getWindow(windowId: string): IElectronWindow {
    const window = this.windows.get(windowId);
    if (!window) {
      throw new Error(`Window with ID ${windowId} not found`);
    }
    return window;
  }

  /**
   * Get all managed windows
   */
  getAllWindows(): IElectronWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Close a window
   */
  async closeWindow(
    windowId: string,
    cleanup = true,
    force = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const windowViews = this.viewRegistry.get(windowId);
      if (!windowViews) {
        reject(new Error(`Window ${windowId} not found`));
        return;
      }

      this.logger?.debug(
        `Closing window ${windowId} with ${windowViews.size} views (cleanup=${cleanup}, force=${force})`
      );

      const window = this.getWindow(windowId);

      if (windowViews.size === 0) {
        // No views to clean up, just close the window
        this.cleanupWindow(window, resolve);
        return;
      }

      if (cleanup) {
        // Close all views first
        const closePromises = Array.from(windowViews).map((viewId) => {
          return this.closeViewInternal(windowId, viewId);
        });

        Promise.all(closePromises)
          .then(() => {
            this.cleanupWindow(window, resolve);
          })
          .catch(reject);
      } else {
        reject(
          new Error(
            `Window ${windowId} has ${windowViews.size} views open. Cannot close without cleanup.`
          )
        );
      }
    });
  }

  /**
   * Create a view in a specific window
   */
  createWindowView(windowId: string, config: ViewConfig): IElectronView {
    const window = this.getWindow(windowId);

    this.logger?.debug(`Creating view in window ${windowId}: ${config.name}`);

    const view = new ElectronView(config, this.logger);

    // Set up view auto-resize if available
    if (typeof view.instance.setAutoResize === 'function') {
      view.instance.setAutoResize({
        width: true,
        height: true,
        horizontal: true,
        vertical: true,
      });
    }

    this.registerViewForWindow(windowId, view);
    window.instance.addBrowserView(view.instance);

    // Listen for view state changes
    view.on('view:state-changed', (data) => {
      this.emit('views:changed', {
        windowId,
        reason: `View ${view.id} state changed`,
      });
    });

    this.emit('view:created', { windowId, viewId: view.id });
    this.emit('views:changed', {
      windowId,
      reason: `Created view ${view.id}`,
    });

    return view;
  }

  /**
   * Get a specific view from a window
   */
  getWindowView(windowId: string, viewId: string): IElectronView {
    const windowViews = this.viewRegistry.get(windowId);
    if (!windowViews || !windowViews.has(viewId)) {
      throw new Error(`View ${viewId} not found in window ${windowId}`);
    }

    const view = this.views.get(viewId);
    if (!view) {
      throw new Error(`View ${viewId} not found`);
    }

    return view;
  }

  /**
   * Get all views for a specific window
   */
  getAllWindowViews(windowId: string): IElectronView[] {
    const viewIds = this.viewRegistry.get(windowId);
    if (!viewIds) {
      return [];
    }

    const views: IElectronView[] = [];
    for (const viewId of viewIds) {
      const view = this.views.get(viewId);
      if (view) {
        views.push(view);
      }
    }

    return views;
  }

  /**
   * Close a specific view
   */
  async closeWindowView(windowId: string, viewId: string): Promise<void> {
    const nextActiveViewId = this.getNextActiveViewId(windowId, viewId);

    await this.closeViewInternal(windowId, viewId);

    if (nextActiveViewId) {
      this.setActiveWindowView(windowId, nextActiveViewId);
    }

    await this.performCleanup();

    this.emit('view:closed', { windowId, viewId });
    this.emit('views:changed', {
      windowId,
      reason: `Closed view ${viewId}`,
    });
  }

  /**
   * Close all views in a window
   */
  async closeAllWindowViews(windowId: string): Promise<void> {
    const windowViews = this.viewRegistry.get(windowId);
    if (!windowViews || windowViews.size === 0) {
      return;
    }

    this.logger?.info(
      `Closing all ${windowViews.size} views for window ${windowId}`
    );

    // Close views sequentially to avoid race conditions
    for (const viewId of Array.from(windowViews)) {
      await this.queueViewClose(windowId, viewId);
    }

    await this.performCleanup();

    this.emit('views:changed', {
      windowId,
      reason: 'Closed all views',
    });
  }

  /**
   * Move a view from one window to another
   */
  async moveViewToWindow(
    viewId: string,
    targetWindowId: string
  ): Promise<void> {
    const sourceWindowId = this.findWindowIdForView(viewId);
    if (!sourceWindowId) {
      throw new Error(`View ${viewId} not found in any window`);
    }

    if (sourceWindowId === targetWindowId) {
      this.logger?.debug(
        `View ${viewId} is already in target window ${targetWindowId}`
      );
      return;
    }

    const sourceWindow = this.getWindow(sourceWindowId);
    const targetWindow = this.getWindow(targetWindowId);
    const view = this.views.get(viewId);

    if (!view) {
      throw new Error(`View ${viewId} not found`);
    }

    this.logger?.debug(
      `Moving view ${viewId} from window ${sourceWindowId} to ${targetWindowId}`
    );

    // Remove from source window
    sourceWindow.instance.removeBrowserView(view.instance);
    this.viewRegistry.get(sourceWindowId)?.delete(viewId);

    // Update active view in source window
    const nextActiveSourceViewId = this.getNextActiveViewId(
      sourceWindowId,
      viewId
    );
    if (nextActiveSourceViewId) {
      this.setActiveWindowView(sourceWindowId, nextActiveSourceViewId);
    }

    // Add to target window
    targetWindow.instance.addBrowserView(view.instance);
    this.viewRegistry.get(targetWindowId)?.add(viewId);

    // Set as active in target window
    this.setActiveWindowView(targetWindowId, viewId);

    await this.performCleanup();

    this.emit('view:moved', {
      viewId,
      fromWindowId: sourceWindowId,
      toWindowId: targetWindowId,
    });

    this.emit('views:changed', {
      windowId: sourceWindowId,
      reason: `Moved view ${viewId} to window ${targetWindowId}`,
    });

    this.emit('views:changed', {
      windowId: targetWindowId,
      reason: `Received view ${viewId} from window ${sourceWindowId}`,
    });
  }

  /**
   * Focus a specific view in a window
   */
  focusWindowView(windowId: string, viewId: string): void {
    this.setActiveWindowView(windowId, viewId);

    this.emit('view:focused', { windowId, viewId });
    this.emit('views:changed', {
      windowId,
      reason: `Focused view ${viewId}`,
    });
  }

  /**
   * Hide a specific view
   */
  async hideWindowView(viewId: string, windowId: string): Promise<void> {
    const window = this.getWindow(windowId);
    const view = this.views.get(viewId);

    if (view) {
      if (view.isActive) {
        this.activeViews.set(windowId, viewId);
        view.setIsActive(false);
      }
      window.instance.removeBrowserView(view.instance);
    }

    this.emit('views:changed', {
      windowId,
      reason: `Hidden view ${viewId}`,
    });
  }

  /**
   * Hide all views in a window
   */
  async hideAllWindowViews(windowId: string): Promise<void> {
    const views = this.getAllWindowViews(windowId);

    for (const view of views) {
      if (view.isActive) {
        this.activeViews.set(windowId, view.id);
      }
      await this.hideWindowView(view.id, windowId);
    }

    this.emit('views:changed', {
      windowId,
      reason: 'Hidden all views',
    });
  }

  /**
   * Show a specific view
   */
  async showWindowView(windowId: string, viewId: string): Promise<void> {
    const window = this.getWindow(windowId);
    const view = this.views.get(viewId);

    if (view) {
      window.instance.addBrowserView(view.instance);

      const wasActive = this.activeViews.get(windowId);
      if (wasActive === viewId) {
        this.setActiveWindowView(windowId, viewId);
        this.activeViews.delete(windowId);
      }
    }

    this.emit('views:changed', {
      windowId,
      reason: `Shown view ${viewId}`,
    });
  }

  /**
   * Show all views in a window
   */
  async showAllWindowViews(windowId: string): Promise<void> {
    const views = this.getAllWindowViews(windowId);

    for (const view of views) {
      await this.showWindowView(windowId, view.id);
    }

    this.emit('views:changed', {
      windowId,
      reason: 'Shown all views',
    });
  }

  /**
   * Check if pointer coordinates are within a window's bounds
   */
  isWithinWindowBounds(windowId: string, coords: PointerCoords): boolean {
    const window = this.getWindow(windowId);
    const bounds = window.instance.getBounds();

    return isPointInBounds({ x: coords.screenX, y: coords.screenY }, bounds);
  }

  /**
   * Get sanitized view data safe for IPC
   */
  getSanitizedViews(views: IElectronView[]): SanitizedView[] {
    return views.map((view) => ({
      id: view.id,
      title: view.title,
      url: view.url,
      category: view.category,
      isActive: view.isActive,
      canGoBack: view.canGoBack,
      canGoForward: view.canGoForward,
      favicon: view.favicon,
      isLoading: view.isLoading,
      zoomLevel: view.zoomLevel,
    }));
  }

  /**
   * Find which window contains a specific view
   */
  private findWindowIdForView(viewId: string): string | undefined {
    for (const [windowId, viewIds] of this.viewRegistry) {
      if (viewIds.has(viewId)) {
        return windowId;
      }
    }
    return undefined;
  }

  /**
   * Get the next view that should be active when closing a view
   */
  private getNextActiveViewId(
    windowId: string,
    closingViewId: string
  ): string | null {
    const views = this.getAllWindowViews(windowId);
    const currentIndex = views.findIndex((view) => view.id === closingViewId);

    if (currentIndex === -1) return null;

    // Try next view first, then previous
    if (currentIndex + 1 < views.length) {
      return views[currentIndex + 1].id;
    } else if (currentIndex > 0) {
      return views[currentIndex - 1].id;
    }

    return null;
  }

  /**
   * Register a window with the manager
   */
  private registerWindow(window: IElectronWindow): void {
    this.windows.set(window.id, window);
    this.viewRegistry.set(window.id, new Set());

    // Handle window close event
    window.instance.on('close', async () => {
      this.logger?.debug(`Window ${window.id} close event triggered`);
      await this.closeWindow(window.id, true, true);
    });

    this.logger?.debug(`Registered window ${window.id}`);
  }

  /**
   * Register a view for a specific window
   */
  private registerViewForWindow(windowId: string, view: IElectronView): void {
    const windowViews = this.viewRegistry.get(windowId);
    if (!windowViews) {
      throw new Error(`Window ${windowId} not found in registry`);
    }

    this.views.set(view.id, view);
    windowViews.add(view.id);

    this.logger?.debug(`Registered view ${view.id} for window ${windowId}`);
  }

  /**
   * Set the active view for a window
   */
  private setActiveWindowView(windowId: string, viewId: string): void {
    const windowViews = this.viewRegistry.get(windowId);
    if (!windowViews || !windowViews.has(viewId)) {
      this.logger?.warn(
        `Cannot set active view ${viewId} - not found in window ${windowId}`
      );
      return;
    }

    const window = this.getWindow(windowId);

    // Deactivate all other views in the window
    for (const currentViewId of windowViews) {
      const view = this.views.get(currentViewId);
      if (view) {
        view.setIsActive(currentViewId === viewId);

        if (currentViewId === viewId) {
          window.instance.setTopBrowserView(view.instance);
          this.logger?.debug(
            `Set view ${viewId} as active in window ${windowId}`
          );
        }
      }
    }
  }

  /**
   * Clean up a window and remove it from management
   */
  private cleanupWindow(window: IElectronWindow, callback: () => void): void {
    window.instance.on('closed', () => {
      this.logger?.debug(`Cleaning up closed window ${window.id}`);

      this.windows.delete(window.id);
      this.viewRegistry.delete(window.id);
      this.activeViews.delete(window.id);

      if (this.mainWindowId === window.id) {
        this.mainWindowId = null;
      }

      this.emit('window:closed', { windowId: window.id });
      callback();
    });

    window.dispose();
  }

  /**
   * Close a view internally without triggering cleanup
   */
  private closeViewInternal(windowId: string, viewId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const windowViews = this.viewRegistry.get(windowId);
      if (!windowViews || !windowViews.has(viewId)) {
        reject(new Error(`View ${viewId} not found in window ${windowId}`));
        return;
      }

      const window = this.getWindow(windowId);
      const view = this.views.get(viewId);

      if (!view) {
        reject(new Error(`View ${viewId} not found`));
        return;
      }

      // Remove from window
      window.instance.removeBrowserView(view.instance);

      // Listen for destruction
      view.instance.webContents.once('destroyed', () => {
        this.logger?.debug(`View ${viewId} destroyed`);

        windowViews.delete(viewId);
        this.views.delete(viewId);

        resolve();
      });

      // Close the view
      view.close();
    });
  }

  /**
   * Queue a view close operation to prevent race conditions
   */
  private async queueViewClose(
    windowId: string,
    viewId: string
  ): Promise<void> {
    this.closeQueue = this.closeQueue
      .then(async () => {
        await this.closeViewInternal(windowId, viewId);
      })
      .catch((error) => {
        this.logger?.error(`Error in close queue for view ${viewId}:`, error);
      });

    await this.closeQueue;
  }

  /**
   * Perform cleanup operations like closing viewless windows
   */
  private async performCleanup(): Promise<void> {
    if (!this.config.cleanup?.autoCloseViewlessWindows) {
      return;
    }

    const windowsToClose: string[] = [];

    for (const [windowId, viewIds] of this.viewRegistry) {
      if (viewIds.size === 0 && windowId !== this.mainWindowId) {
        windowsToClose.push(windowId);
      }
    }

    for (const windowId of windowsToClose) {
      this.logger?.info(`Auto-closing viewless window ${windowId}`);
      await this.closeWindow(
        windowId,
        true,
        this.config.cleanup?.forceClosingWindows
      );
    }
  }
}
