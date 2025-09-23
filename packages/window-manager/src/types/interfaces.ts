import { BrowserWindowConstructorOptions, MenuItem, Rectangle } from 'electron';

/**
 * Configuration for creating a new window
 */
export interface WindowConfig {
  /** The title of the window */
  title: string;
  /** Initial window state */
  state: WindowState;
  /** Electron BrowserWindow options */
  options: BrowserWindowConstructorOptions;
  /** Entry URL to load in the window */
  entryUrl: string;
  /** Whether this URL should be loaded directly (true) or as a file path (false) */
  isEntryUrl: boolean;
  /** Whether this is an external URL that should be loaded directly */
  isExternalUrl: boolean;
  /** Whether this is the main window of the application */
  isMainWindow?: boolean;
  /** Optional home directory path */
  homeDir?: string;
  /** Optional temp directory path */
  tempDir?: string;
  /** Optional user data directory path */
  userDataDir?: string;
}

/**
 * Window state configuration
 */
export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  mode: WindowMode;
}

/**
 * Window display modes
 */
export enum WindowMode {
  MAXIMIZED,
  NORMAL,
  MINIMIZED,
  FULLSCREEN,
}

/**
 * Window ready states
 */
export enum WindowReadyState {
  /** The window is not ready yet */
  NONE,
  /** The window is currently navigating */
  NAVIGATING,
  /** The window finished loading and is ready for IPC communication */
  READY,
}

/**
 * Configuration for creating a new view
 */
export interface ViewConfig {
  /** Display name for the view */
  name: string;
  /** Category/tag for grouping views */
  category?: string;
  /** URL to load in the view */
  url: string;
  /** Whether to register basic context menu items (cut, copy, paste, etc.) */
  enableBasicContextMenu?: boolean;
  /** Whether to enable spell checking */
  enableSpellCheck?: boolean;
  /** Background color for the view */
  backgroundColor?: string;
  /** Spell checker languages */
  spellCheckerLanguages?: string[];
}

/**
 * Interface for managed windows
 */
export interface IElectronWindow {
  /** Unique identifier for the window */
  readonly id: string;
  /** The underlying Electron BrowserWindow instance */
  readonly instance: Electron.BrowserWindow;
  /** Whether this is the main window */
  readonly isMainWindow: boolean;

  /** Focus the window */
  focus(): void;
  /** Load content in the window */
  load(): Promise<void>;
  /** Close the window */
  close(): void;
  /** Dispose of the window and clean up resources */
  dispose(): void;
  /** Set the entry URL for the window */
  setEntryUrl(url: string): void;
}

/**
 * Interface for managed views
 */
export interface IElectronView {
  /** Unique identifier for the view */
  readonly id: string;
  /** The underlying Electron BrowserView instance */
  readonly instance: Electron.BrowserView;
  /** Display title of the view */
  title: string;
  /** Category/tag of the view */
  category: string;
  /** Current URL of the view */
  url: string;
  /** Array of favicon URLs */
  favicon: string[];
  /** Whether the view is currently loading */
  isLoading: boolean;
  /** Whether the view is the active/focused view */
  isActive: boolean;
  /** Whether the view can navigate backward */
  canGoBack: boolean;
  /** Whether the view can navigate forward */
  canGoForward: boolean;
  /** Current zoom level of the view */
  zoomLevel: number;

  /** Register a custom context menu item */
  registerContextMenuItem(menuItem: MenuItem): void;
  /** Unregister a context menu item by label */
  unregisterContextMenuItem(label: string): void;
  /** Set the bounds of the view */
  setBounds(bounds: Rectangle): void;
  /** Load the view's URL */
  load(): Promise<void>;
  /** Close the view */
  close(): void;
  /** Navigate backward */
  goBack(): void;
  /** Navigate forward */
  goForward(): void;
  /** Reload the view */
  reload(): void;
  /** Set whether this view is active */
  setIsActive(isActive: boolean): void;
  /** Reset zoom level to default (0) */
  resetZoomLevel(): void;
  /** Set zoom level */
  setZoomLevel(zoomLevel: number): void;
}

/**
 * Configuration for the WindowManager
 */
export interface WindowManagerConfig {
  /** Cleanup behavior configuration */
  cleanup?: {
    /** Whether to force close windows during cleanup */
    forceClosingWindows?: boolean;
    /** Whether to automatically close windows that have no views */
    autoCloseViewlessWindows?: boolean;
  };
  /** Optional logging callback */
  logger?: LoggerCallback;
}

/**
 * Logging callback interface
 */
export interface LoggerCallback {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Interface for the main window manager
 */
export interface IWindowManager {
  /** ID of the main window, if set */
  readonly mainWindowId: string | null;

  /** Create a new window */
  createWindow(config: WindowConfig): IElectronWindow;
  /** Get a window by ID */
  getWindow(windowId: string): IElectronWindow;
  /** Get all managed windows */
  getAllWindows(): IElectronWindow[];
  /** Close a window */
  closeWindow(
    windowId: string,
    cleanup?: boolean,
    force?: boolean
  ): Promise<void>;

  /** Create a view in a specific window */
  createWindowView(windowId: string, config: ViewConfig): IElectronView;
  /** Get a specific view from a window */
  getWindowView(windowId: string, viewId: string): IElectronView;
  /** Get all views for a specific window */
  getAllWindowViews(windowId: string): IElectronView[];
  /** Close a specific view */
  closeWindowView(windowId: string, viewId: string): Promise<void>;
  /** Close all views in a window */
  closeAllWindowViews(windowId: string): Promise<void>;
  /** Move a view from one window to another */
  moveViewToWindow(viewId: string, targetWindowId: string): Promise<void>;
  /** Focus a specific view in a window */
  focusWindowView(windowId: string, viewId: string): void;
  /** Hide a specific view */
  hideWindowView(viewId: string, windowId: string): Promise<void>;
  /** Hide all views in a window */
  hideAllWindowViews(windowId: string): Promise<void>;
  /** Show a specific view */
  showWindowView(windowId: string, viewId: string): Promise<void>;
  /** Show all views in a window */
  showAllWindowViews(windowId: string): Promise<void>;
  /** Check if pointer coordinates are within a window's bounds */
  isWithinWindowBounds(windowId: string, coords: PointerCoords): boolean;
  /** Get sanitized view data safe for IPC */
  getSanitizedViews(views: IElectronView[]): SanitizedView[];
}

/**
 * Sanitized view data safe for sending across IPC
 */
export type SanitizedView = Pick<
  IElectronView,
  | 'id'
  | 'title'
  | 'url'
  | 'category'
  | 'isActive'
  | 'canGoBack'
  | 'canGoForward'
  | 'favicon'
  | 'isLoading'
  | 'zoomLevel'
>;

/**
 * Pointer coordinate information
 */
export interface PointerCoords {
  /** Screen X coordinate */
  screenX: number;
  /** Screen Y coordinate */
  screenY: number;
}

/**
 * Interface for drag and drop management
 */
export interface IDragDropManager {
  /** ID of the source window for current drag operation */
  readonly sourceWindowId: string | null;
  /** ID of the target window for current drag operation */
  readonly targetWindowId: string | null;
  /** Set of view IDs being dragged */
  readonly viewIds: Set<string>;
  /** Whether a drop has occurred */
  readonly didDrop: boolean;

  /** Handle drag start */
  handleDragStart(sourceWindowId: string, viewIds: string[]): Promise<void>;
  /** Handle drag enter over a target */
  handleDragEnter(targetWindowId: string, coords: PointerCoords): Promise<void>;
  /** Handle drag over a target */
  handleDragOver(targetWindowId: string, coords: PointerCoords): Promise<void>;
  /** Handle drag leave from a target */
  handleDragLeave(targetWindowId: string): Promise<void>;
  /** Handle drop onto a target */
  handleDrop(targetWindowId: string): Promise<void>;
  /** Handle drag end */
  handleDragEnd(sourceWindowId: string, coords: PointerCoords): Promise<void>;
}
