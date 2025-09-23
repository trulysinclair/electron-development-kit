/**
 * Basic Usage Example
 *
 * This example demonstrates the fundamental features of @electron-devkit/window-manager:
 * - Creating a window manager
 * - Creating and managing windows
 * - Creating and managing views within windows
 * - Basic navigation and view operations
 */

import { app, BrowserWindow } from 'electron';
import {
  WindowManager,
  WindowConfig,
  ViewConfig,
  WindowMode,
} from '@electron-devkit/window-manager';

let windowManager: WindowManager;

// Initialize the window manager when Electron is ready
app.whenReady().then(async () => {
  console.log('🚀 Starting basic window manager example...');

  // Create a window manager with logging enabled
  windowManager = new WindowManager({
    cleanup: {
      autoCloseViewlessWindows: true, // Automatically close windows that have no views
      forceClosingWindows: false, // Don't force close windows during cleanup
    },
    logger: console, // Use console for logging (optional)
  });

  // Listen to window manager events
  setupEventListeners();

  // Create the main application window
  await createMainWindow();

  console.log('✅ Basic example setup complete!');
});

/**
 * Create the main application window with some example views
 */
async function createMainWindow() {
  // Configure the main window
  const mainWindowConfig: WindowConfig = {
    title: 'Window Manager - Basic Example',
    state: {
      width: 1200,
      height: 800,
      mode: WindowMode.NORMAL,
    },
    options: {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // Add any other webPreferences you need
      },
      titleBarStyle: 'default',
      show: true,
    },
    entryUrl: 'basic-example.html', // Your HTML file
    isEntryUrl: false, // Load as file path, not URL
    isExternalUrl: false,
    isMainWindow: true,
  };

  // Create the window
  const mainWindow = windowManager.createWindow(mainWindowConfig);

  try {
    // Load the window content
    await mainWindow.load();
    console.log(`📱 Main window created: ${mainWindow.id}`);

    // Create some example views
    await createExampleViews(mainWindow.id);
  } catch (error) {
    console.error('❌ Failed to load main window:', error);
  }
}

/**
 * Create some example views to demonstrate view management
 */
async function createExampleViews(windowId: string) {
  console.log('🖼️ Creating example views...');

  // Example view configurations
  const viewConfigs: ViewConfig[] = [
    {
      name: 'GitHub',
      url: 'https://github.com',
      category: 'development',
      enableBasicContextMenu: true,
      enableSpellCheck: true,
    },
    {
      name: 'Electron Documentation',
      url: 'https://www.electronjs.org/docs',
      category: 'documentation',
      enableBasicContextMenu: true,
      enableSpellCheck: true,
    },
    {
      name: 'Example Website',
      url: 'https://example.com',
      category: 'web',
      enableBasicContextMenu: true,
      enableSpellCheck: false, // Disable spell check for this view
    },
  ];

  // Create each view
  for (const config of viewConfigs) {
    try {
      const view = windowManager.createWindowView(windowId, config);

      // Load the view content
      await view.load();

      console.log(`  ✅ Created view: ${view.title} (${view.id})`);

      // Set bounds for the view (you would typically calculate these based on your layout)
      view.setBounds({
        x: 0,
        y: 60, // Leave space for a title bar or toolbar
        width: 1200,
        height: 740,
      });
    } catch (error) {
      console.error(`  ❌ Failed to create view ${config.name}:`, error);
    }
  }

  // Focus the first view
  const views = windowManager.getAllWindowViews(windowId);
  if (views.length > 0) {
    windowManager.focusWindowView(windowId, views[0].id);
    console.log(`🎯 Focused first view: ${views[0].title}`);
  }
}

/**
 * Set up event listeners to demonstrate window manager events
 */
function setupEventListeners() {
  console.log('👂 Setting up event listeners...');

  // Window events
  windowManager.on('window:created', ({ windowId }) => {
    console.log(`📱 Window created: ${windowId}`);
  });

  windowManager.on('window:closed', ({ windowId }) => {
    console.log(`📱 Window closed: ${windowId}`);
  });

  // View events
  windowManager.on('view:created', ({ windowId, viewId }) => {
    console.log(`🖼️ View created: ${viewId} in window ${windowId}`);
  });

  windowManager.on('view:focused', ({ windowId, viewId }) => {
    const view = windowManager.getWindowView(windowId, viewId);
    console.log(`🎯 View focused: ${view.title} (${viewId})`);
  });

  windowManager.on('view:closed', ({ windowId, viewId }) => {
    console.log(`🖼️ View closed: ${viewId} from window ${windowId}`);
  });

  windowManager.on('views:changed', ({ windowId, reason }) => {
    const views = windowManager.getAllWindowViews(windowId);
    console.log(
      `🔄 Views changed in window ${windowId}: ${reason} (${views.length} views)`
    );
  });
}

// Handle app lifecycle events
app.on('window-all-closed', () => {
  console.log('👋 All windows closed');

  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // On macOS, re-create the window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

// Example functions that you might call from your renderer process
// (via IPC or other communication methods)

/**
 * Example: Create a new view programmatically
 */
export async function createNewView(
  windowId: string,
  url: string,
  title: string
) {
  try {
    const view = windowManager.createWindowView(windowId, {
      name: title,
      url: url,
      category: 'user-created',
      enableBasicContextMenu: true,
      enableSpellCheck: true,
    });

    await view.load();

    // Set bounds (you would calculate these based on your UI)
    view.setBounds({ x: 0, y: 60, width: 1200, height: 740 });

    // Focus the new view
    windowManager.focusWindowView(windowId, view.id);

    return view.id;
  } catch (error) {
    console.error('Failed to create new view:', error);
    throw error;
  }
}

/**
 * Example: Close a view
 */
export async function closeView(windowId: string, viewId: string) {
  try {
    await windowManager.closeWindowView(windowId, viewId);
    console.log(`Closed view: ${viewId}`);
  } catch (error) {
    console.error('Failed to close view:', error);
    throw error;
  }
}

/**
 * Example: Navigate a view
 */
export function navigateView(
  windowId: string,
  viewId: string,
  action: 'back' | 'forward' | 'reload'
) {
  try {
    const view = windowManager.getWindowView(windowId, viewId);

    switch (action) {
      case 'back':
        if (view.canGoBack) {
          view.goBack();
        }
        break;
      case 'forward':
        if (view.canGoForward) {
          view.goForward();
        }
        break;
      case 'reload':
        view.reload();
        break;
    }
  } catch (error) {
    console.error('Failed to navigate view:', error);
    throw error;
  }
}
