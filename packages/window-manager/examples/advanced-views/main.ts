/**
 * Advanced Views Example
 *
 * This example demonstrates advanced view features:
 * - Custom context menus with specialized actions
 * - View categorization and filtering
 * - Advanced navigation controls
 * - Zoom management
 * - Custom view lifecycle handling
 * - View state persistence
 */

import { app, BrowserWindow, MenuItem, ipcMain } from 'electron';
import {
  WindowManager,
  WindowConfig,
  ViewConfig,
  WindowMode,
  IElectronView,
  SanitizedView,
} from '@electron-devkit/window-manager';

let windowManager: WindowManager;

// View categories for organization
const VIEW_CATEGORIES = {
  DEVELOPMENT: 'development',
  DOCUMENTATION: 'documentation',
  SOCIAL: 'social',
  TOOLS: 'tools',
  PERSONAL: 'personal',
} as const;

// Store view states for persistence
interface ViewState {
  id: string;
  url: string;
  title: string;
  category: string;
  zoomLevel: number;
  timestamp: number;
}

const viewStates = new Map<string, ViewState>();

app.whenReady().then(async () => {
  console.log('🚀 Starting advanced views example...');

  // Create window manager with custom configuration
  windowManager = new WindowManager({
    cleanup: {
      autoCloseViewlessWindows: true,
      forceClosingWindows: false,
    },
    logger: {
      debug: (msg, ...args) => console.log(`🔍 ${msg}`, ...args),
      info: (msg, ...args) => console.log(`ℹ️ ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`⚠️ ${msg}`, ...args),
      error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
    },
  });

  setupEventListeners();
  setupIpcHandlers();

  await createMainWindow();

  console.log('✅ Advanced views example setup complete!');
});

/**
 * Create the main window with advanced view management
 */
async function createMainWindow() {
  const config: WindowConfig = {
    title: 'Advanced Views - Window Manager Example',
    state: {
      width: 1400,
      height: 900,
      mode: WindowMode.NORMAL,
    },
    options: {
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false, // For demo purposes only
      },
      titleBarStyle: 'default',
      show: true,
      minWidth: 800,
      minHeight: 600,
    },
    entryUrl: 'advanced-views.html',
    isEntryUrl: false,
    isExternalUrl: false,
    isMainWindow: true,
  };

  const mainWindow = windowManager.createWindow(config);
  await mainWindow.load();

  // Create categorized views
  await createCategorizedViews(mainWindow.id);

  console.log(`📱 Main window created: ${mainWindow.id}`);
}

/**
 * Create views organized by categories
 */
async function createCategorizedViews(windowId: string) {
  const viewConfigs = [
    // Development category
    {
      name: 'GitHub',
      url: 'https://github.com',
      category: VIEW_CATEGORIES.DEVELOPMENT,
      customMenuItems: ['Open in Browser', 'Copy URL', 'Bookmark'],
    },
    {
      name: 'VS Code Web',
      url: 'https://vscode.dev',
      category: VIEW_CATEGORIES.DEVELOPMENT,
      customMenuItems: ['New File', 'Open Folder', 'Settings'],
    },

    // Documentation category
    {
      name: 'Electron Docs',
      url: 'https://www.electronjs.org/docs',
      category: VIEW_CATEGORIES.DOCUMENTATION,
      customMenuItems: ['Search Docs', 'API Reference', 'Copy Link'],
    },
    {
      name: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      category: VIEW_CATEGORIES.DOCUMENTATION,
      customMenuItems: ['Search MDN', 'Copy Code Example'],
    },

    // Tools category
    {
      name: 'npm Registry',
      url: 'https://www.npmjs.com',
      category: VIEW_CATEGORIES.TOOLS,
      customMenuItems: ['Search Packages', 'View Dependencies'],
    },
  ];

  for (const config of viewConfigs) {
    await createAdvancedView(windowId, config);
  }
}

/**
 * Create a view with advanced features and custom context menu
 */
async function createAdvancedView(
  windowId: string,
  config: {
    name: string;
    url: string;
    category: string;
    customMenuItems?: string[];
  }
) {
  console.log(`🖼️ Creating advanced view: ${config.name}`);

  const viewConfig: ViewConfig = {
    name: config.name,
    url: config.url,
    category: config.category,
    enableBasicContextMenu: true,
    enableSpellCheck: true,
    backgroundColor: '#ffffff',
    spellCheckerLanguages: ['en-US', 'en-GB'],
  };

  try {
    const view = windowManager.createWindowView(windowId, viewConfig);

    // Add custom context menu items
    setupCustomContextMenu(view, config.customMenuItems || []);

    // Set up view-specific event handlers
    setupViewEventHandlers(view, windowId);

    await view.load();

    // Set initial bounds (you would calculate these based on your layout)
    view.setBounds({
      x: 0,
      y: 100, // Leave space for controls
      width: 1400,
      height: 800,
    });

    // Store initial view state
    saveViewState(view);

    console.log(`  ✅ Created advanced view: ${view.title} (${view.id})`);
  } catch (error) {
    console.error(`  ❌ Failed to create view ${config.name}:`, error);
  }
}

/**
 * Set up custom context menu for a view
 */
function setupCustomContextMenu(view: IElectronView, customItems: string[]) {
  // Add custom menu items based on view category
  customItems.forEach((itemLabel) => {
    const menuItem = new MenuItem({
      label: itemLabel,
      click: () => {
        console.log(
          `🎯 Custom menu action: ${itemLabel} on view ${view.title}`
        );
        handleCustomMenuAction(view, itemLabel);
      },
    });

    view.registerContextMenuItem(menuItem);
  });

  // Add category-specific menu items
  if (view.category === VIEW_CATEGORIES.DEVELOPMENT) {
    view.registerContextMenuItem(
      new MenuItem({
        label: 'Open DevTools',
        click: () => {
          view.instance.webContents.openDevTools();
        },
      })
    );
  }

  // Add zoom controls
  view.registerContextMenuItem(new MenuItem({ type: 'separator' }));

  view.registerContextMenuItem(
    new MenuItem({
      label: 'Zoom In',
      accelerator: 'CmdOrCtrl+=',
      click: () => {
        const newZoom = view.zoomLevel + 0.5;
        view.setZoomLevel(newZoom);
        saveViewState(view);
      },
    })
  );

  view.registerContextMenuItem(
    new MenuItem({
      label: 'Zoom Out',
      accelerator: 'CmdOrCtrl+-',
      click: () => {
        const newZoom = view.zoomLevel - 0.5;
        view.setZoomLevel(newZoom);
        saveViewState(view);
      },
    })
  );

  view.registerContextMenuItem(
    new MenuItem({
      label: 'Reset Zoom',
      accelerator: 'CmdOrCtrl+0',
      click: () => {
        view.resetZoomLevel();
        saveViewState(view);
      },
    })
  );
}

/**
 * Handle custom menu actions
 */
function handleCustomMenuAction(view: IElectronView, action: string) {
  switch (action) {
    case 'Open in Browser':
      require('electron').shell.openExternal(view.url);
      break;

    case 'Copy URL':
      require('electron').clipboard.writeText(view.url);
      console.log(`📋 Copied URL: ${view.url}`);
      break;

    case 'Bookmark':
      // In a real app, you'd save this to a bookmarks store
      console.log(`🔖 Bookmarked: ${view.title} - ${view.url}`);
      break;

    case 'Search Docs':
    case 'Search MDN':
    case 'Search Packages':
      // Focus the search input on the page
      view.instance.webContents.executeJavaScript(`
        const searchInput = document.querySelector('input[type="search"], input[name="q"], .search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      `);
      break;

    default:
      console.log(`🎯 Unhandled custom action: ${action}`);
  }
}

/**
 * Set up event handlers for a specific view
 */
function setupViewEventHandlers(view: IElectronView, windowId: string) {
  // Listen for view state changes
  view.on('view:state-changed', () => {
    saveViewState(view);

    // Send updated state to renderer if needed
    const window = windowManager.getWindow(windowId);
    window.instance.webContents.send('view-state-updated', {
      viewId: view.id,
      state: getViewState(view.id),
    });
  });

  // Handle navigation events specifically
  view.instance.webContents.on('did-navigate', (event, url) => {
    console.log(`🧭 View ${view.title} navigated to: ${url}`);
    view.url = url; // Update the URL
    saveViewState(view);
  });

  // Handle title updates
  view.instance.webContents.on('page-title-updated', (event, title) => {
    console.log(`📝 View title updated: ${title}`);
    saveViewState(view);
  });

  // Handle load completion
  view.instance.webContents.on('did-finish-load', () => {
    console.log(`✅ View ${view.title} finished loading`);

    // Auto-inject some useful functionality
    injectViewEnhancements(view);
  });
}

/**
 * Inject enhancements into the view
 */
function injectViewEnhancements(view: IElectronView) {
  // Inject keyboard shortcuts and other enhancements
  view.instance.webContents
    .executeJavaScript(
      `
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            if (e.shiftKey) {
              e.preventDefault();
              window.location.reload(true); // Force reload
            }
            break;
        }
      }
    });

    // Add visual indicator for the view
    const indicator = document.createElement('div');
    indicator.style.cssText = \`
      position: fixed;
      top: 0;
      right: 0;
      background: rgba(0, 123, 255, 0.8);
      color: white;
      padding: 4px 8px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
    \`;
    indicator.textContent = '${view.category}';
    document.body.appendChild(indicator);

    console.log('✨ View enhancements injected for ${view.title}');
  `
    )
    .catch((err) => {
      console.warn('Failed to inject enhancements:', err);
    });
}

/**
 * Save view state for persistence
 */
function saveViewState(view: IElectronView) {
  const state: ViewState = {
    id: view.id,
    url: view.url,
    title: view.title,
    category: view.category,
    zoomLevel: view.zoomLevel,
    timestamp: Date.now(),
  };

  viewStates.set(view.id, state);
}

/**
 * Get saved view state
 */
function getViewState(viewId: string): ViewState | null {
  return viewStates.get(viewId) || null;
}

/**
 * Set up comprehensive event listeners
 */
function setupEventListeners() {
  windowManager.on('view:created', ({ windowId, viewId }) => {
    const view = windowManager.getWindowView(windowId, viewId);
    console.log(
      `🖼️ Advanced view created: ${view.title} (category: ${view.category})`
    );
  });

  windowManager.on('view:closed', ({ windowId, viewId }) => {
    // Clean up saved state
    viewStates.delete(viewId);
    console.log(`🗑️ Cleaned up state for closed view: ${viewId}`);
  });

  windowManager.on('views:changed', ({ windowId, reason }) => {
    const views = windowManager.getAllWindowViews(windowId);
    const categoryCounts = views.reduce(
      (counts, view) => {
        counts[view.category] = (counts[view.category] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    console.log(`📊 Views changed (${reason}):`, categoryCounts);
  });
}

/**
 * Set up IPC handlers for advanced view operations
 */
function setupIpcHandlers() {
  // Get views by category
  ipcMain.handle(
    'get-views-by-category',
    async (event, windowId: string, category?: string) => {
      try {
        const allViews = windowManager.getAllWindowViews(windowId);
        const filteredViews = category
          ? allViews.filter((view) => view.category === category)
          : allViews;

        return {
          success: true,
          views: windowManager.getSanitizedViews(filteredViews),
          categories: Object.values(VIEW_CATEGORIES),
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Set view zoom
  ipcMain.handle(
    'set-view-zoom',
    async (event, windowId: string, viewId: string, zoomLevel: number) => {
      try {
        const view = windowManager.getWindowView(windowId, viewId);
        view.setZoomLevel(zoomLevel);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Navigate view
  ipcMain.handle(
    'navigate-view',
    async (
      event,
      windowId: string,
      viewId: string,
      action: 'back' | 'forward' | 'reload'
    ) => {
      try {
        const view = windowManager.getWindowView(windowId, viewId);

        switch (action) {
          case 'back':
            if (view.canGoBack) view.goBack();
            break;
          case 'forward':
            if (view.canGoForward) view.goForward();
            break;
          case 'reload':
            view.reload();
            break;
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Get view states
  ipcMain.handle('get-view-states', async () => {
    return Array.from(viewStates.values());
  });

  // Create view with category
  ipcMain.handle(
    'create-categorized-view',
    async (
      event,
      windowId: string,
      name: string,
      url: string,
      category: string
    ) => {
      try {
        await createAdvancedView(windowId, { name, url, category });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );
}

// App lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});
