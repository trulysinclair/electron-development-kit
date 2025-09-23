import { BrowserWindow, app } from 'electron';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  IElectronWindow,
  WindowConfig,
  WindowReadyState,
  LoggerCallback,
} from '../types';

/**
 * A wrapper around the Electron BrowserWindow that provides enhanced functionality
 * and lifecycle management.
 */
export class ElectronWindow implements IElectronWindow {
  public readonly id: string;
  public readonly isMainWindow: boolean;
  public readonly instance: BrowserWindow;

  private readyState: WindowReadyState = WindowReadyState.NONE;
  private config: WindowConfig;
  private logger?: LoggerCallback;

  constructor(config: WindowConfig, logger?: LoggerCallback) {
    this.id = uuidv4();
    this.isMainWindow = config.isMainWindow ?? false;
    this.config = config;
    this.logger = logger;

    this.logger?.debug(
      `Creating window ${this.id} with title: ${config.title}`
    );

    // Create the BrowserWindow with the provided configuration
    this.instance = new BrowserWindow({
      ...config.options,
      title: config.title,
      width: config.state.width,
      height: config.state.height,
      x: config.state.x,
      y: config.state.y,
    });

    this.setupWindowHandlers();
  }

  /**
   * Set the entry URL for this window
   */
  setEntryUrl(url: string): void {
    this.config.entryUrl = url;
  }

  /**
   * Load content in the window based on the configuration
   */
  async load(): Promise<void> {
    this.readyState = WindowReadyState.NAVIGATING;

    try {
      if (this.config.isEntryUrl) {
        this.logger?.debug(
          `Loading URL for window ${this.id}: ${this.config.entryUrl}`
        );
        await this.instance.loadURL(this.config.entryUrl);
      } else if (this.config.isExternalUrl) {
        this.logger?.debug(
          `Loading external URL for window ${this.id}: ${this.config.entryUrl}`
        );
        await this.instance.loadURL(this.config.entryUrl);
      } else if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
        // Development mode - use the dev server
        const devUrl = `${process.env.ELECTRON_RENDERER_URL}/${this.config.entryUrl}`;
        this.logger?.debug(
          `Loading development URL for window ${this.id}: ${devUrl}`
        );
        await this.instance.loadURL(devUrl);
      } else {
        // Production mode - load from file
        const filePath = join(
          __dirname,
          '..',
          'renderer',
          this.config.entryUrl
        );
        this.logger?.debug(`Loading file for window ${this.id}: ${filePath}`);
        await this.instance.loadFile(filePath);
      }

      this.readyState = WindowReadyState.READY;
      this.logger?.debug(`Window ${this.id} finished loading`);
    } catch (error) {
      this.logger?.error(`Failed to load content in window ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Focus the window
   */
  focus(): void {
    if (!this.instance || this.instance.isDestroyed()) {
      this.logger?.warn(`Cannot focus destroyed window ${this.id}`);
      return;
    }

    if (this.instance.isMinimized()) {
      this.instance.restore();
    }

    this.instance.focus();
    this.logger?.debug(`Focused window ${this.id}`);
  }

  /**
   * Close the window gracefully
   */
  close(): void {
    if (!this.instance || this.instance.isDestroyed()) {
      this.logger?.warn(`Cannot close destroyed window ${this.id}`);
      return;
    }

    this.logger?.debug(`Closing window ${this.id}`);
    this.instance.close();
  }

  /**
   * Dispose of the window and clean up resources
   */
  dispose(): void {
    if (!this.instance || this.instance.isDestroyed()) {
      this.logger?.warn(`Window ${this.id} already destroyed`);
      return;
    }

    this.logger?.debug(`Disposing window ${this.id}`);

    // Remove all listeners to prevent memory leaks
    this.instance.removeAllListeners();

    // Close the window if it's still open
    if (!this.instance.isDestroyed()) {
      this.instance.close();
    }
  }

  /**
   * Get the current ready state of the window
   */
  getReadyState(): WindowReadyState {
    return this.readyState;
  }

  /**
   * Check if the window is ready for interaction
   */
  isReady(): boolean {
    return this.readyState === WindowReadyState.READY;
  }

  /**
   * Set up event handlers for the window
   */
  private setupWindowHandlers(): void {
    // Handle window open requests (e.g., from target="_blank" links)
    this.instance.webContents.setWindowOpenHandler(({ url }) => {
      // Only allow about:blank by default - consumers can override this
      if (url === 'about:blank') {
        return { action: 'allow' };
      }

      this.logger?.debug(
        `Denied window open request for ${url} from window ${this.id}`
      );
      return { action: 'deny' };
    });

    // Log navigation events in debug mode
    this.instance.webContents.on('did-start-loading', () => {
      this.readyState = WindowReadyState.NAVIGATING;
      this.logger?.debug(`Window ${this.id} started loading`);
    });

    this.instance.webContents.on('did-finish-load', () => {
      this.readyState = WindowReadyState.READY;
      this.logger?.debug(`Window ${this.id} finished loading`);
    });

    this.instance.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription, validatedURL) => {
        this.readyState = WindowReadyState.NONE;
        this.logger?.error(
          `Window ${this.id} failed to load ${validatedURL}: ${errorDescription} (${errorCode})`
        );
      }
    );

    // Handle window lifecycle events
    this.instance.on('ready-to-show', () => {
      this.logger?.debug(`Window ${this.id} is ready to show`);
    });

    this.instance.on('closed', () => {
      this.logger?.debug(`Window ${this.id} closed`);
    });

    this.instance.on('focus', () => {
      this.logger?.debug(`Window ${this.id} gained focus`);
    });

    this.instance.on('blur', () => {
      this.logger?.debug(`Window ${this.id} lost focus`);
    });
  }
}
