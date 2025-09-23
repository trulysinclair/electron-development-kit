import { EventEmitter, PointerCoords } from '../utils';
import {
  IWindowManager,
  IDragDropManager,
  WindowConfig,
  LoggerCallback,
} from '../types';

/**
 * Configuration for auxiliary windows created during drag operations
 */
export interface AuxiliaryWindowConfig {
  /** Title for the auxiliary window */
  title: string;
  /** Width of the auxiliary window */
  width: number;
  /** Height of the auxiliary window */
  height: number;
  /** Whether the auxiliary window should be resizable */
  resizable?: boolean;
  /** Whether to show the auxiliary window frame */
  frame?: boolean;
  /** Custom window configuration factory */
  configFactory?: (x: number, y: number) => Partial<WindowConfig>;
}

/**
 * Configuration for the DragDropManager
 */
export interface DragDropConfig {
  /** Configuration for auxiliary windows created during drag operations */
  auxiliaryWindow?: AuxiliaryWindowConfig;
  /** Whether to enable creating auxiliary windows on external drops */
  enableAuxiliaryWindows?: boolean;
  /** Custom logic for handling external drops */
  onExternalDrop?: (
    coords: PointerCoords,
    viewIds: string[],
    manager: DragDropManager
  ) => Promise<void>;
  /** Optional logging callback */
  logger?: LoggerCallback;
}

/**
 * Manages drag and drop operations for views between windows.
 * Supports creating auxiliary windows when views are dropped outside existing windows.
 */
export class DragDropManager extends EventEmitter implements IDragDropManager {
  public sourceWindowId: string | null = null;
  public targetWindowId: string | null = null;
  public readonly viewIds = new Set<string>();
  public didDrop = false;

  private windowManager: IWindowManager;
  private config: DragDropConfig;
  private logger?: LoggerCallback;

  constructor(windowManager: IWindowManager, config: DragDropConfig = {}) {
    super();

    this.windowManager = windowManager;
    this.config = config;
    this.logger = config.logger;

    this.logger?.debug('DragDropManager initialized');
  }

  /**
   * Handle the start of a drag operation
   */
  async handleDragStart(
    sourceWindowId: string,
    viewIds: string[]
  ): Promise<void> {
    this.logger?.debug(
      `Drag started from window ${sourceWindowId} with ${viewIds.length} views`
    );

    this.sourceWindowId = sourceWindowId;
    this.didDrop = false;

    // Clear previous view IDs and add new ones
    this.viewIds.clear();
    viewIds.forEach((id) => this.viewIds.add(id));

    this.emit('drag:started', {
      sourceWindowId,
      viewIds: Array.from(this.viewIds),
    });
  }

  /**
   * Handle drag entering a target window
   */
  async handleDragEnter(
    targetWindowId: string,
    coords: PointerCoords
  ): Promise<void> {
    this.logger?.debug(
      `Drag entered window ${targetWindowId} at (${coords.screenX}, ${coords.screenY})`
    );

    this.targetWindowId = targetWindowId;

    if (this.sourceWindowId) {
      this.emit('drag:enter', {
        targetWindowId,
        sourceWindowId: this.sourceWindowId,
      });
    }
  }

  /**
   * Handle drag moving over a target window
   */
  async handleDragOver(
    targetWindowId: string,
    coords: PointerCoords
  ): Promise<void> {
    this.targetWindowId = targetWindowId;

    // Check if the coordinates are within the target window bounds
    const isWithinBounds = this.windowManager.isWithinWindowBounds(
      targetWindowId,
      coords
    );

    if (isWithinBounds) {
      this.logger?.debug(`Drag is within bounds of window ${targetWindowId}`);
    }

    if (this.sourceWindowId) {
      this.emit('drag:over', {
        targetWindowId,
        sourceWindowId: this.sourceWindowId,
      });
    }
  }

  /**
   * Handle drag leaving a target window
   */
  async handleDragLeave(targetWindowId: string): Promise<void> {
    this.logger?.debug(`Drag left window ${targetWindowId}`);

    if (this.targetWindowId === targetWindowId) {
      this.targetWindowId = null;
    }

    if (this.sourceWindowId) {
      this.emit('drag:leave', {
        targetWindowId,
        sourceWindowId: this.sourceWindowId,
      });
    }
  }

  /**
   * Handle a drop operation onto a target window
   */
  async handleDrop(targetWindowId: string): Promise<void> {
    this.logger?.info(
      `Drop occurred on window ${targetWindowId} with ${this.viewIds.size} views`
    );

    this.didDrop = true;

    if (this.sourceWindowId && this.viewIds.size > 0) {
      // Move all dragged views to the target window
      for (const viewId of this.viewIds) {
        await this.windowManager.moveViewToWindow(viewId, targetWindowId);

        // Focus the view if it was active
        const view = this.windowManager.getWindowView(targetWindowId, viewId);
        if (view.isActive) {
          this.windowManager.focusWindowView(targetWindowId, viewId);
        }
      }

      this.emit('drag:drop', {
        targetWindowId,
        sourceWindowId: this.sourceWindowId,
        viewIds: Array.from(this.viewIds),
      });
    }

    await this.resetDragState();
  }

  /**
   * Handle the end of a drag operation
   */
  async handleDragEnd(
    sourceWindowId: string,
    coords: PointerCoords
  ): Promise<void> {
    this.logger?.debug(
      `Drag ended from window ${sourceWindowId} at (${coords.screenX}, ${coords.screenY})`
    );

    if (this.sourceWindowId && !this.didDrop) {
      // Check if the drop occurred outside all windows
      const isOutsideAllWindows = this.checkIfOutsideAllWindows(coords);

      if (isOutsideAllWindows) {
        await this.handleExternalDrop(coords);
      }
    }

    const completed = this.didDrop;

    this.emit('drag:end', {
      sourceWindowId,
      completed,
    });

    await this.resetDragState();
  }

  /**
   * Check if coordinates are outside all managed windows
   */
  private checkIfOutsideAllWindows(coords: PointerCoords): boolean {
    const allWindows = this.windowManager.getAllWindows();

    for (const window of allWindows) {
      if (this.windowManager.isWithinWindowBounds(window.id, coords)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle drops that occur outside of any existing window
   */
  private async handleExternalDrop(coords: PointerCoords): Promise<void> {
    this.logger?.info(
      `External drop detected at (${coords.screenX}, ${coords.screenY})`
    );

    if (this.config.onExternalDrop) {
      // Use custom external drop handler
      await this.config.onExternalDrop(coords, Array.from(this.viewIds), this);
      return;
    }

    if (this.config.enableAuxiliaryWindows !== false && this.viewIds.size > 0) {
      await this.createAuxiliaryWindow(coords);
    }
  }

  /**
   * Create an auxiliary window at the drop coordinates
   */
  private async createAuxiliaryWindow(coords: PointerCoords): Promise<void> {
    const auxConfig =
      this.config.auxiliaryWindow || this.getDefaultAuxiliaryConfig();

    let windowConfig: WindowConfig;

    if (auxConfig.configFactory) {
      // Use custom config factory
      const customConfig = auxConfig.configFactory(
        coords.screenX,
        coords.screenY
      );
      windowConfig = {
        title: auxConfig.title,
        state: {
          width: auxConfig.width,
          height: auxConfig.height,
          x: coords.screenX,
          y: coords.screenY,
          mode: 1, // WindowMode.NORMAL
        },
        options: {
          resizable: auxConfig.resizable ?? true,
          frame: auxConfig.frame ?? true,
          show: true,
        },
        entryUrl: '',
        isEntryUrl: false,
        isExternalUrl: false,
        isMainWindow: false,
        ...customConfig,
      };
    } else {
      // Use default configuration
      windowConfig = {
        title: auxConfig.title,
        state: {
          width: auxConfig.width,
          height: auxConfig.height,
          x: coords.screenX,
          y: coords.screenY,
          mode: 1, // WindowMode.NORMAL
        },
        options: {
          resizable: auxConfig.resizable ?? true,
          frame: auxConfig.frame ?? true,
          show: true,
        },
        entryUrl: '',
        isEntryUrl: false,
        isExternalUrl: false,
        isMainWindow: false,
      };
    }

    this.logger?.info(
      `Creating auxiliary window at (${coords.screenX}, ${coords.screenY})`
    );

    try {
      const auxiliaryWindow = this.windowManager.createWindow(windowConfig);

      // Wait for the window to be ready
      await auxiliaryWindow.load();

      // Move all dragged views to the new window
      for (const viewId of this.viewIds) {
        await this.windowManager.moveViewToWindow(viewId, auxiliaryWindow.id);

        // Focus the first active view
        const view = this.windowManager.getWindowView(
          auxiliaryWindow.id,
          viewId
        );
        if (view.isActive) {
          this.windowManager.focusWindowView(auxiliaryWindow.id, viewId);
        }
      }

      this.logger?.info(
        `Successfully created auxiliary window ${auxiliaryWindow.id} with ${this.viewIds.size} views`
      );
    } catch (error) {
      this.logger?.error('Failed to create auxiliary window:', error);
      throw error;
    }
  }

  /**
   * Get default configuration for auxiliary windows
   */
  private getDefaultAuxiliaryConfig(): AuxiliaryWindowConfig {
    return {
      title: 'Auxiliary Window',
      width: 800,
      height: 600,
      resizable: true,
      frame: true,
    };
  }

  /**
   * Reset the drag state
   */
  private async resetDragState(): Promise<void> {
    this.sourceWindowId = null;
    this.targetWindowId = null;
    this.didDrop = false;
    this.viewIds.clear();

    this.logger?.debug('Drag state reset');
  }

  /**
   * Get the current drag state (useful for debugging)
   */
  getDragState() {
    return {
      sourceWindowId: this.sourceWindowId,
      targetWindowId: this.targetWindowId,
      viewIds: Array.from(this.viewIds),
      didDrop: this.didDrop,
    };
  }

  /**
   * Check if a drag operation is currently in progress
   */
  isDragging(): boolean {
    return this.sourceWindowId !== null && this.viewIds.size > 0;
  }

  /**
   * Cancel the current drag operation
   */
  async cancelDrag(): Promise<void> {
    if (this.isDragging()) {
      this.logger?.info('Cancelling drag operation');

      this.emit('drag:end', {
        sourceWindowId: this.sourceWindowId!,
        completed: false,
      });

      await this.resetDragState();
    }
  }
}
