import { BrowserView, Menu, MenuItem, Rectangle } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from '../utils';
import { IElectronView, ViewConfig, LoggerCallback } from '../types';
import {
  getBasicMenuItems,
  createAddToDictionaryMenuItem,
  createSpellingSuggestionMenuItems,
  separatorMenuItem,
} from '../utils/menu-items';

/**
 * A wrapper around the Electron BrowserView that provides enhanced functionality,
 * context menus, navigation state, and event handling.
 */
export class ElectronView extends EventEmitter implements IElectronView {
  public readonly id: string;
  public readonly instance: BrowserView;
  public title: string;
  public category: string;
  public url: string;
  public favicon: string[] = [];
  public isLoading = true;
  public canGoBack = false;
  public canGoForward = false;
  public zoomLevel = 0;

  private _isActive = false;
  private contextMenuRegistry = new Map<string, MenuItem>();
  private config: ViewConfig;
  private logger?: LoggerCallback;

  constructor(config: ViewConfig, logger?: LoggerCallback) {
    super();

    this.id = uuidv4();
    this.config = config;
    this.logger = logger;

    // Initialize properties from config
    this.title = config.name;
    this.category = config.category || '';
    this.url = config.url;

    this.logger?.debug(`Creating view ${this.id} for URL: ${config.url}`);

    // Create the BrowserView
    this.instance = new BrowserView();

    // Configure the view
    this.setupView();
    this.setupEventListeners();
    this.setupContextMenu();
  }

  /**
   * Whether this view is currently active/focused
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Set whether this view is active
   */
  setIsActive(isActive: boolean): void {
    if (this._isActive !== isActive) {
      this._isActive = isActive;
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    }
  }

  /**
   * Load the view's URL
   */
  async load(): Promise<void> {
    try {
      this.logger?.debug(`Loading URL in view ${this.id}: ${this.url}`);
      await this.instance.webContents.loadURL(this.url);
    } catch (error) {
      this.logger?.error(`Failed to load URL in view ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Close the view
   */
  close(): void {
    this.logger?.debug(`Closing view ${this.id}`);
    this.instance.webContents.close({ waitForBeforeUnload: true });
  }

  /**
   * Navigate backward
   */
  goBack(): void {
    if (this.canGoBack) {
      this.logger?.debug(`Navigating back in view ${this.id}`);
      this.instance.webContents.goBack();
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    }
  }

  /**
   * Navigate forward
   */
  goForward(): void {
    if (this.canGoForward) {
      this.logger?.debug(`Navigating forward in view ${this.id}`);
      this.instance.webContents.goForward();
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    }
  }

  /**
   * Reload the view
   */
  reload(): void {
    this.logger?.debug(`Reloading view ${this.id}`);
    this.instance.webContents.reload();
    this.emit('view:state-changed', { windowId: '', viewId: this.id });
  }

  /**
   * Set the bounds of the view
   */
  setBounds(bounds: Rectangle): void {
    const roundedBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    };

    this.instance.setBounds(roundedBounds);
    this.logger?.debug(`Set bounds for view ${this.id}:`, roundedBounds);
  }

  /**
   * Reset zoom level to default (0)
   */
  resetZoomLevel(): void {
    this.setZoomLevel(0);
  }

  /**
   * Set zoom level
   */
  setZoomLevel(zoomLevel: number): void {
    this.instance.webContents.setZoomLevel(zoomLevel);
    this.zoomLevel = zoomLevel;
    this.logger?.debug(`Set zoom level for view ${this.id}: ${zoomLevel}`);
    this.emit('view:state-changed', { windowId: '', viewId: this.id });
  }

  /**
   * Register a custom context menu item
   */
  registerContextMenuItem(menuItem: MenuItem): void {
    if (!menuItem.label) {
      throw new Error('Cannot register a context menu item without a label');
    }

    this.contextMenuRegistry.set(menuItem.label, menuItem);
    this.logger?.debug(
      `Registered context menu item "${menuItem.label}" for view ${this.id}`
    );
  }

  /**
   * Unregister a context menu item by label
   */
  unregisterContextMenuItem(label: string): void {
    if (!this.contextMenuRegistry.has(label)) {
      throw new Error(
        `Cannot unregister context menu item "${label}" - it doesn't exist`
      );
    }

    this.contextMenuRegistry.delete(label);
    this.logger?.debug(
      `Unregistered context menu item "${label}" for view ${this.id}`
    );
  }

  /**
   * Set up the view with initial configuration
   */
  private setupView(): void {
    // Set background color
    const backgroundColor = this.config.backgroundColor || '#ffffff';
    this.instance.setBackgroundColor(backgroundColor);

    // Configure spell checking
    if (this.config.enableSpellCheck !== false) {
      const languages = this.config.spellCheckerLanguages || ['en-US'];
      this.instance.webContents.session.setSpellCheckerLanguages(languages);
    }

    // Set auto-resize behavior (removed in later Electron versions, but keeping for compatibility)
    if (typeof this.instance.setAutoResize === 'function') {
      this.instance.setAutoResize({
        width: true,
        height: true,
        horizontal: true,
        vertical: true,
      });
    }
  }

  /**
   * Set up event listeners for the view
   */
  private setupEventListeners(): void {
    const webContents = this.instance.webContents;

    // Navigation events
    webContents.on('did-navigate', () => {
      this.updateNavigationState();
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    webContents.on('did-navigate-in-page', () => {
      this.updateNavigationState();
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    // Loading events
    webContents.on('did-start-loading', () => {
      this.isLoading = true;
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    webContents.on('did-finish-load', () => {
      this.isLoading = false;
      this.updateNavigationState();
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    webContents.on('did-fail-load', () => {
      this.isLoading = false;
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    webContents.on('did-stop-loading', () => {
      this.isLoading = false;
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    // Page title updates
    webContents.on('page-title-updated', (event, title) => {
      this.title = title;
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    // Favicon updates
    webContents.on('page-favicon-updated', (event, favicons) => {
      this.favicon = favicons;
      this.emit('view:state-changed', { windowId: '', viewId: this.id });
    });

    // Zoom events
    webContents.on('zoom-changed', (event, direction) => {
      const currentZoom = webContents.getZoomLevel();
      const newZoom = currentZoom + (direction === 'in' ? 1 : -1);
      this.setZoomLevel(newZoom);
    });

    // Handle unload prevention
    webContents.on('will-prevent-unload', () => {
      this.logger?.warn(`View ${this.id} prevented unload`);
    });
  }

  /**
   * Set up context menu handling
   */
  private setupContextMenu(): void {
    // Register basic context menu items if enabled
    if (this.config.enableBasicContextMenu !== false) {
      const basicItems = getBasicMenuItems();
      basicItems.forEach((item) => {
        if (item.label) {
          this.contextMenuRegistry.set(item.label, item);
        }
      });
    }

    // Handle context menu events
    this.instance.webContents.on('context-menu', (event, params) => {
      event.preventDefault();
      this.showContextMenu(params);
    });
  }

  /**
   * Show the context menu
   */
  private showContextMenu(params: Electron.ContextMenuParams): void {
    const menuItems: MenuItem[] = [];

    // Add spell checking suggestions if there's a misspelled word
    if (params.misspelledWord && this.config.enableSpellCheck !== false) {
      const suggestions = createSpellingSuggestionMenuItems(
        params.dictionarySuggestions,
        this.instance.webContents
      );
      menuItems.push(...suggestions);

      if (suggestions.length > 0) {
        menuItems.push(separatorMenuItem);
      }

      // Add "Add to dictionary" option
      const addToDictionary = createAddToDictionaryMenuItem(
        params.misspelledWord,
        this.instance.webContents.session
      );
      menuItems.push(addToDictionary);
      menuItems.push(separatorMenuItem);
    }

    // Add registered context menu items
    const registeredItems = Array.from(this.contextMenuRegistry.values());
    if (registeredItems.length > 0) {
      menuItems.push(...registeredItems);
    }

    // Show the menu if there are items
    if (menuItems.length > 0) {
      const contextMenu = Menu.buildFromTemplate(menuItems);

      // Position the menu near the click location
      // Note: These coordinates may need adjustment based on window positioning
      contextMenu.popup({
        x: params.x,
        y: params.y,
      });
    }
  }

  /**
   * Update navigation state (back/forward capabilities)
   */
  private updateNavigationState(): void {
    const webContents = this.instance.webContents;
    this.canGoBack = webContents.canGoBack();
    this.canGoForward = webContents.canGoForward();
    this.url = webContents.getURL();
  }
}
