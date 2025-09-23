# @electron-devkit/window-manager

Advanced window and view management for Electron applications with multi-window support and drag/drop functionality.

## Features

- 🪟 **Multi-Window Management** - Create and manage multiple Electron windows with ease
- 🖼️ **Advanced BrowserView Support** - Tab-like view system within windows
- 🔄 **Cross-Window Drag & Drop** - Drag views between windows or create new windows
- 🎯 **Focus Management** - Intelligent view focusing and z-ordering
- 🔍 **Navigation Controls** - Built-in back/forward/reload/zoom functionality
- 📋 **Context Menus** - Rich context menus with spell checking support
- 🧹 **Automatic Cleanup** - Smart window and view lifecycle management
- 📦 **Zero Dependencies** - Pure Electron APIs with minimal external dependencies
- 🎨 **Framework Agnostic** - Works with any frontend framework or vanilla JS

## Installation

```bash
npm install @electron-devkit/window-manager
```

## Quick Start

```typescript
import { WindowManager, WindowConfig } from '@electron-devkit/window-manager';

// Create a window manager
const windowManager = new WindowManager({
  cleanup: {
    autoCloseViewlessWindows: true,
    forceClosingWindows: false,
  },
});

// Create a main window
const mainWindowConfig: WindowConfig = {
  title: 'My App',
  state: {
    width: 1200,
    height: 800,
    mode: WindowMode.NORMAL,
  },
  options: {
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  },
  entryUrl: 'index.html',
  isEntryUrl: false,
  isExternalUrl: false,
  isMainWindow: true,
};

const mainWindow = windowManager.createWindow(mainWindowConfig);
await mainWindow.load();

// Create a view in the window
const view = windowManager.createWindowView(mainWindow.id, {
  name: 'GitHub',
  url: 'https://github.com',
  category: 'dev-tools',
  enableBasicContextMenu: true,
  enableSpellCheck: true,
});

await view.load();
```

## Core Concepts

### WindowManager

The `WindowManager` is the central orchestrator that manages all windows and views:

```typescript
const windowManager = new WindowManager({
  cleanup: {
    autoCloseViewlessWindows: true, // Auto-close windows with no views
    forceClosingWindows: false, // Whether to force close during cleanup
  },
  logger: console, // Optional logging
});
```

### Windows

Windows are Electron `BrowserWindow` wrappers with enhanced functionality:

```typescript
// Create a window
const window = windowManager.createWindow({
  title: 'My Window',
  state: { width: 800, height: 600, mode: WindowMode.NORMAL },
  options: {
    /* BrowserWindow options */
  },
  entryUrl: 'app.html',
  isEntryUrl: false,
  isExternalUrl: false,
});

// Window operations
window.focus();
await window.load();
window.close();
```

### Views

Views are `BrowserView` wrappers that provide tab-like functionality:

```typescript
// Create a view
const view = windowManager.createWindowView(windowId, {
  name: 'Example',
  url: 'https://example.com',
  category: 'web',
  enableBasicContextMenu: true,
  enableSpellCheck: true,
});

// View operations
view.goBack();
view.goForward();
view.reload();
view.setZoomLevel(1.5);
view.resetZoomLevel();
```

### Drag & Drop

Enable cross-window view dragging with the `DragDropManager`:

```typescript
import { DragDropManager } from '@electron-devkit/window-manager';

const dragDropManager = new DragDropManager(windowManager, {
  enableAuxiliaryWindows: true,
  auxiliaryWindow: {
    title: 'Detached Views',
    width: 800,
    height: 600,
  },
});

// Handle drag operations
await dragDropManager.handleDragStart(sourceWindowId, [viewId]);
await dragDropManager.handleDrop(targetWindowId);
```

## Advanced Usage

### Event Handling

The window manager emits events for all operations:

```typescript
windowManager.on('window:created', ({ windowId }) => {
  console.log(`Window created: ${windowId}`);
});

windowManager.on('view:moved', ({ viewId, fromWindowId, toWindowId }) => {
  console.log(`View ${viewId} moved from ${fromWindowId} to ${toWindowId}`);
});

windowManager.on('drag:drop', ({ targetWindowId, sourceWindowId, viewIds }) => {
  console.log(`Dropped ${viewIds.length} views onto ${targetWindowId}`);
});
```

### Custom Context Menus

Add custom menu items to views:

```typescript
import { MenuItem } from 'electron';

const customMenuItem = new MenuItem({
  label: 'Custom Action',
  click: () => console.log('Custom action triggered'),
});

view.registerContextMenuItem(customMenuItem);
```

### Custom Auxiliary Windows

Customize the behavior when views are dragged outside windows:

```typescript
const dragDropManager = new DragDropManager(windowManager, {
  onExternalDrop: async (coords, viewIds, manager) => {
    // Custom logic for external drops
    const customWindow = windowManager.createWindow({
      title: `Dropped Views (${viewIds.length})`,
      state: {
        width: 1000,
        height: 700,
        x: coords.screenX,
        y: coords.screenY,
        mode: WindowMode.NORMAL,
      },
      // ... other config
    });

    for (const viewId of viewIds) {
      await windowManager.moveViewToWindow(viewId, customWindow.id);
    }
  },
});
```

### Bounds and Coordinates

Work with window bounds and coordinates:

```typescript
import {
  PointerCoords,
  isPointInBounds,
  clampRectToBounds,
} from '@electron-devkit/window-manager';

const coords = new PointerCoords(100, 200);
const isInside = windowManager.isWithinWindowBounds(windowId, coords);

// Utility functions for bounds calculations
const intersection = getIntersection(rect1, rect2);
const clampedRect = clampRectToBounds(rect, bounds);
```

## API Reference

### WindowManager

| Method                                     | Description               |
| ------------------------------------------ | ------------------------- |
| `createWindow(config)`                     | Create a new window       |
| `getWindow(windowId)`                      | Get window by ID          |
| `getAllWindows()`                          | Get all managed windows   |
| `closeWindow(windowId, cleanup?, force?)`  | Close a window            |
| `createWindowView(windowId, config)`       | Create a view in a window |
| `getWindowView(windowId, viewId)`          | Get a specific view       |
| `getAllWindowViews(windowId)`              | Get all views in a window |
| `closeWindowView(windowId, viewId)`        | Close a specific view     |
| `moveViewToWindow(viewId, targetWindowId)` | Move view between windows |
| `focusWindowView(windowId, viewId)`        | Focus a view              |

### ElectronWindow

| Property/Method | Description                     |
| --------------- | ------------------------------- |
| `id`            | Unique window identifier        |
| `instance`      | Electron BrowserWindow instance |
| `isMainWindow`  | Whether this is the main window |
| `focus()`       | Focus the window                |
| `load()`        | Load window content             |
| `close()`       | Close the window                |

### ElectronView

| Property/Method          | Description                   |
| ------------------------ | ----------------------------- |
| `id`                     | Unique view identifier        |
| `instance`               | Electron BrowserView instance |
| `title`                  | View title                    |
| `url`                    | Current URL                   |
| `isActive`               | Whether view is active        |
| `canGoBack/canGoForward` | Navigation capabilities       |
| `goBack()`               | Navigate backward             |
| `goForward()`            | Navigate forward              |
| `reload()`               | Reload the view               |
| `setZoomLevel(level)`    | Set zoom level                |

## Examples

See the `examples/` directory for complete working examples:

- `basic-usage/` - Simple window and view management
- `multi-window/` - Cross-window operations and drag/drop
- `advanced-views/` - Complex view scenarios with custom menus

## Requirements

- Electron >= 29.0.0
- Node.js >= 18.0.0

## License

MIT
