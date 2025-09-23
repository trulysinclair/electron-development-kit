/**
 * Multi-Window Example
 *
 * This example demonstrates advanced features of @electron-devkit/window-manager:
 * - Managing multiple windows
 * - Cross-window view dragging and dropping
 * - Creating auxiliary windows from external drops
 * - Advanced drag and drop event handling
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import {
  WindowManager,
  DragDropManager,
  WindowConfig,
  ViewConfig,
  WindowMode,
  PointerCoords,
} from '@electron-devkit/window-manager';

let windowManager: WindowManager;
let dragDropManager: DragDropManager;

// Track our application windows
const appWindows = new Map<string, string>(); // windowId -> window type

app.whenReady().then(async () => {
  console.log('🚀 Starting multi-window example...');

  // Create window manager
  windowManager = new WindowManager({
    cleanup: {
      autoCloseViewlessWindows: true,
      forceClosingWindows: false,
    },
    logger: console,
  });

  // Create drag & drop manager with custom auxiliary window configuration
  dragDropManager = new DragDropManager(windowManager, {
    enableAuxiliaryWindows: true,
    auxiliaryWindow: {
      title: 'Detached Views',
      width: 900,
      height: 650,
      resizable: true,
      frame: true,
      // Custom configuration factory for auxiliary windows
      configFactory: (x: number, y: number) => ({
        state: {
          width: 900,
          height: 650,
          x: x - 50, // Offset slightly from drop point
          y: y - 50,
          mode: WindowMode.NORMAL,
        },
        options: {
          titleBarStyle: 'default',
          backgroundColor: '#f0f0f0',
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      }),
    },
    logger: console,
  });

  // Set up event listeners
  setupEventListeners();
  setupIpcHandlers();

  // Create multiple windows
  await createMainWindow();
  await createSecondaryWindow();

  console.log('✅ Multi-window example setup complete!');
  console.log(
    '💡 Try dragging views between windows or outside windows to create new ones!'
  );
});

/**
 * Create the main application window
 */
async function createMainWindow() {
  const config: WindowConfig = {
    title: 'Main Window - Multi-Window Example',
    state: {
      width: 1000,
      height: 700,
      x: 100,
      y: 100,
      mode: WindowMode.NORMAL,
    },
    options: {
      webPreferences: {
        nodeIntegration: true, // Enable for IPC in this example
        contextIsolation: false,
        preload: undefined, // You would set your preload script here
      },
      titleBarStyle: 'default',
      show: true,
    },
    entryUrl: 'multi-window-main.html',
    isEntryUrl: false,
    isExternalUrl: false,
    isMainWindow: true,
  };

  const mainWindow = windowManager.createWindow(config);
  await mainWindow.load();

  appWindows.set(mainWindow.id, 'main');

  // Create some views in the main window
  await createViewsInWindow(mainWindow.id, [
    { name: 'GitHub', url: 'https://github.com', category: 'dev' },
    {
      name: 'Stack Overflow',
      url: 'https://stackoverflow.com',
      category: 'dev',
    },
  ]);

  console.log(`📱 Main window created: ${mainWindow.id}`);
}

/**
 * Create a secondary window
 */
async function createSecondaryWindow() {
  const config: WindowConfig = {
    title: 'Secondary Window - Multi-Window Example',
    state: {
      width: 800,
      height: 600,
      x: 1200, // Position to the right of main window
      y: 100,
      mode: WindowMode.NORMAL,
    },
    options: {
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      titleBarStyle: 'default',
      show: true,
    },
    entryUrl: 'multi-window-secondary.html',
    isEntryUrl: false,
    isExternalUrl: false,
    isMainWindow: false,
  };

  const secondaryWindow = windowManager.createWindow(config);
  await secondaryWindow.load();

  appWindows.set(secondaryWindow.id, 'secondary');

  // Create different views in the secondary window
  await createViewsInWindow(secondaryWindow.id, [
    {
      name: 'MDN Docs',
      url: 'https://developer.mozilla.org',
      category: 'docs',
    },
    { name: 'npm', url: 'https://www.npmjs.com', category: 'tools' },
  ]);

  console.log(`📱 Secondary window created: ${secondaryWindow.id}`);
}

/**
 * Helper function to create views in a window
 */
async function createViewsInWindow(
  windowId: string,
  viewConfigs: Array<{ name: string; url: string; category: string }>
) {
  for (const config of viewConfigs) {
    try {
      const viewConfig: ViewConfig = {
        name: config.name,
        url: config.url,
        category: config.category,
        enableBasicContextMenu: true,
        enableSpellCheck: true,
      };

      const view = windowManager.createWindowView(windowId, viewConfig);
      await view.load();

      // Set bounds (in a real app, you'd calculate these based on your layout)
      view.setBounds({ x: 0, y: 80, width: 800, height: 520 });

      console.log(`  ✅ Created view: ${view.title} in window ${windowId}`);
    } catch (error) {
      console.error(`  ❌ Failed to create view ${config.name}:`, error);
    }
  }
}

/**
 * Set up comprehensive event listeners for all window manager events
 */
function setupEventListeners() {
  console.log('👂 Setting up comprehensive event listeners...');

  // Window events
  windowManager.on('window:created', ({ windowId }) => {
    console.log(`📱 Window created: ${windowId}`);
  });

  windowManager.on('window:closed', ({ windowId }) => {
    appWindows.delete(windowId);
    console.log(`📱 Window closed: ${windowId}`);
  });

  // View events
  windowManager.on('view:created', ({ windowId, viewId }) => {
    console.log(`🖼️ View created: ${viewId} in window ${windowId}`);
  });

  windowManager.on('view:moved', ({ viewId, fromWindowId, toWindowId }) => {
    const view = windowManager.getWindowView(toWindowId, viewId);
    console.log(
      `🚚 View moved: ${view.title} from ${fromWindowId} to ${toWindowId}`
    );
  });

  windowManager.on('view:focused', ({ windowId, viewId }) => {
    const view = windowManager.getWindowView(windowId, viewId);
    console.log(`🎯 View focused: ${view.title}`);
  });

  // Drag & Drop events
  dragDropManager.on('drag:started', ({ sourceWindowId, viewIds }) => {
    console.log(
      `🎭 Drag started from ${sourceWindowId} with views: ${viewIds.join(', ')}`
    );
  });

  dragDropManager.on('drag:enter', ({ targetWindowId, sourceWindowId }) => {
    console.log(
      `🎯 Drag entered window ${targetWindowId} from ${sourceWindowId}`
    );
  });

  dragDropManager.on('drag:over', ({ targetWindowId }) => {
    // This fires frequently, so we'll log less verbosely
    // console.log(`🔄 Drag over window ${targetWindowId}`);
  });

  dragDropManager.on('drag:leave', ({ targetWindowId, sourceWindowId }) => {
    console.log(`🚪 Drag left window ${targetWindowId}`);
  });

  dragDropManager.on(
    'drag:drop',
    ({ targetWindowId, sourceWindowId, viewIds }) => {
      console.log(
        `🎯 Drop completed! Moved ${viewIds.length} views to ${targetWindowId}`
      );
    }
  );

  dragDropManager.on('drag:end', ({ sourceWindowId, completed }) => {
    const status = completed ? 'completed' : 'cancelled';
    console.log(`🏁 Drag ${status} from window ${sourceWindowId}`);
  });
}

/**
 * Set up IPC handlers for communication with renderer processes
 */
function setupIpcHandlers() {
  console.log('📡 Setting up IPC handlers...');

  // Handle drag start from renderer
  ipcMain.handle(
    'window-manager:drag-start',
    async (event, sourceWindowId: string, viewIds: string[]) => {
      try {
        await dragDropManager.handleDragStart(sourceWindowId, viewIds);
        return { success: true };
      } catch (error) {
        console.error('Failed to start drag:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Handle drag enter
  ipcMain.handle(
    'window-manager:drag-enter',
    async (
      event,
      targetWindowId: string,
      coords: { screenX: number; screenY: number }
    ) => {
      try {
        const pointerCoords = PointerCoords.fromObject(coords);
        await dragDropManager.handleDragEnter(targetWindowId, pointerCoords);
        return { success: true };
      } catch (error) {
        console.error('Failed to handle drag enter:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Handle drag over
  ipcMain.handle(
    'window-manager:drag-over',
    async (
      event,
      targetWindowId: string,
      coords: { screenX: number; screenY: number }
    ) => {
      try {
        const pointerCoords = PointerCoords.fromObject(coords);
        await dragDropManager.handleDragOver(targetWindowId, pointerCoords);
        return { success: true };
      } catch (error) {
        console.error('Failed to handle drag over:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Handle drag leave
  ipcMain.handle(
    'window-manager:drag-leave',
    async (event, targetWindowId: string) => {
      try {
        await dragDropManager.handleDragLeave(targetWindowId);
        return { success: true };
      } catch (error) {
        console.error('Failed to handle drag leave:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Handle drop
  ipcMain.handle(
    'window-manager:drop',
    async (event, targetWindowId: string) => {
      try {
        await dragDropManager.handleDrop(targetWindowId);
        return { success: true };
      } catch (error) {
        console.error('Failed to handle drop:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Handle drag end
  ipcMain.handle(
    'window-manager:drag-end',
    async (
      event,
      sourceWindowId: string,
      coords: { screenX: number; screenY: number }
    ) => {
      try {
        const pointerCoords = PointerCoords.fromObject(coords);
        await dragDropManager.handleDragEnd(sourceWindowId, pointerCoords);
        return { success: true };
      } catch (error) {
        console.error('Failed to handle drag end:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Get current window info
  ipcMain.handle('window-manager:get-window-info', async (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!senderWindow) return null;

    // Find our window ID
    let windowId: string | null = null;
    for (const [id, window] of windowManager['windows']) {
      if (window.instance === senderWindow) {
        windowId = id;
        break;
      }
    }

    if (!windowId) return null;

    const views = windowManager.getAllWindowViews(windowId);
    return {
      windowId,
      windowType: appWindows.get(windowId) || 'unknown',
      viewCount: views.length,
      views: windowManager.getSanitizedViews(views),
    };
  });

  // Create a new view
  ipcMain.handle(
    'window-manager:create-view',
    async (event, windowId: string, config: ViewConfig) => {
      try {
        const view = windowManager.createWindowView(windowId, config);
        await view.load();

        // Set default bounds
        view.setBounds({ x: 0, y: 80, width: 800, height: 520 });

        return { success: true, viewId: view.id };
      } catch (error) {
        console.error('Failed to create view:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Focus a view
  ipcMain.handle(
    'window-manager:focus-view',
    async (event, windowId: string, viewId: string) => {
      try {
        windowManager.focusWindowView(windowId, viewId);
        return { success: true };
      } catch (error) {
        console.error('Failed to focus view:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Close a view
  ipcMain.handle(
    'window-manager:close-view',
    async (event, windowId: string, viewId: string) => {
      try {
        await windowManager.closeWindowView(windowId, viewId);
        return { success: true };
      } catch (error) {
        console.error('Failed to close view:', error);
        return { success: false, error: error.message };
      }
    }
  );
}

// App lifecycle
app.on('window-all-closed', () => {
  console.log('👋 All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

// Example of creating a new window programmatically
export async function createAdditionalWindow(
  title: string = 'Additional Window'
) {
  const config: WindowConfig = {
    title,
    state: {
      width: 700,
      height: 500,
      mode: WindowMode.NORMAL,
    },
    options: {
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      show: true,
    },
    entryUrl: 'additional-window.html',
    isEntryUrl: false,
    isExternalUrl: false,
    isMainWindow: false,
  };

  const window = windowManager.createWindow(config);
  await window.load();

  appWindows.set(window.id, 'additional');

  console.log(`📱 Additional window created: ${window.id}`);
  return window.id;
}
