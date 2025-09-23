# Examples

This directory contains comprehensive examples demonstrating how to use `@electron-devkit/window-manager` in real-world scenarios.

## Available Examples

### 1. Basic Usage (`basic-usage/`)

**What it demonstrates:**

- Creating a window manager
- Managing windows and their lifecycle
- Creating and managing views within windows
- Basic navigation and view operations
- Event handling for window/view changes

**Key Features:**

- Simple window creation with standard configuration
- Multiple views (GitHub, Electron Docs, Example site)
- Basic context menus and spell checking
- View focusing and bounds management
- Comprehensive event logging

**Best for:** Getting started with the library and understanding core concepts.

### 2. Multi-Window (`multi-window/`)

**What it demonstrates:**

- Managing multiple windows simultaneously
- Cross-window view dragging and dropping
- Creating auxiliary windows from external drops
- Advanced drag and drop event handling
- IPC communication for drag/drop operations

**Key Features:**

- Main and secondary windows with different configurations
- Custom auxiliary window creation on external drops
- Complete drag/drop event chain handling
- IPC handlers for renderer communication
- Window type tracking and management

**Best for:** Applications that need multiple windows and advanced view management.

### 3. Advanced Views (`advanced-views/`)

**What it demonstrates:**

- Custom context menus with specialized actions
- View categorization and filtering
- Advanced navigation controls
- Zoom management and view state persistence
- Custom view lifecycle handling
- Code injection and view enhancements

**Key Features:**

- Category-based view organization
- Rich context menus with custom actions
- View state persistence and restoration
- Automatic view enhancements via code injection
- Advanced keyboard shortcuts
- Comprehensive state management

**Best for:** Complex applications requiring sophisticated view management and customization.

## Running the Examples

Each example is a complete Electron application. To run them:

### Prerequisites

1. Install dependencies in the main package:

   ```bash
   cd electron-window-manager
   npm install
   npm run build
   ```

2. Navigate to an example directory:

   ```bash
   cd examples/basic-usage
   ```

3. Install example dependencies:

   ```bash
   npm install
   ```

4. Run the example:
   ```bash
   npm start
   ```

### Example Package Structure

Each example follows this structure:

```
example-name/
├── main.ts              # Main process code
├── package.json         # Example-specific dependencies
├── renderer/            # Renderer process files
│   ├── index.html      # Main window HTML
│   ├── style.css       # Styles
│   └── renderer.js     # Renderer process JS
└── README.md           # Example-specific documentation
```

## Common Patterns

### Window Configuration

All examples demonstrate different window configuration patterns:

```typescript
const windowConfig: WindowConfig = {
  title: 'My App Window',
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
```

### View Creation

Standard view creation pattern:

```typescript
const view = windowManager.createWindowView(windowId, {
  name: 'View Title',
  url: 'https://example.com',
  category: 'web',
  enableBasicContextMenu: true,
  enableSpellCheck: true,
});

await view.load();
view.setBounds({ x: 0, y: 60, width: 1200, height: 740 });
```

### Event Handling

Comprehensive event handling pattern:

```typescript
// Window events
windowManager.on('window:created', ({ windowId }) => {
  console.log(`Window created: ${windowId}`);
});

// View events
windowManager.on('view:moved', ({ viewId, fromWindowId, toWindowId }) => {
  console.log(`View ${viewId} moved from ${fromWindowId} to ${toWindowId}`);
});

// Drag & drop events
dragDropManager.on('drag:drop', ({ targetWindowId, viewIds }) => {
  console.log(`Dropped ${viewIds.length} views onto ${targetWindowId}`);
});
```

## Integration Tips

### IPC Communication

For renderer-main communication, set up IPC handlers:

```typescript
// Main process
ipcMain.handle(
  'window-manager:create-view',
  async (event, windowId, config) => {
    try {
      const view = windowManager.createWindowView(windowId, config);
      await view.load();
      return { success: true, viewId: view.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

// Renderer process
const result = await ipcRenderer.invoke(
  'window-manager:create-view',
  windowId,
  {
    name: 'New View',
    url: 'https://example.com',
    category: 'web',
  }
);
```

### Error Handling

Implement robust error handling:

```typescript
try {
  const view = windowManager.createWindowView(windowId, config);
  await view.load();

  // Success handling
  console.log(`View created: ${view.id}`);
} catch (error) {
  // Error handling
  console.error('Failed to create view:', error);
  // Show user notification, retry logic, etc.
}
```

### Custom Context Menus

Add application-specific menu items:

```typescript
import { MenuItem } from 'electron';

const customMenuItem = new MenuItem({
  label: 'Custom Action',
  accelerator: 'CmdOrCtrl+K',
  click: () => {
    // Custom action logic
    handleCustomAction(view);
  },
});

view.registerContextMenuItem(customMenuItem);
```

## Next Steps

After running the examples:

1. **Study the code**: Each example is heavily commented to explain the concepts
2. **Modify the examples**: Try changing configurations and adding features
3. **Integrate into your app**: Use the patterns in your own Electron application
4. **Read the API docs**: Check the main README for detailed API documentation

## Troubleshooting

**Views not displaying correctly:**

- Check that bounds are set properly with `view.setBounds()`
- Ensure the window size accommodates the view bounds
- Verify the URL is accessible and loads correctly

**Drag/drop not working:**

- Ensure IPC handlers are set up correctly
- Check that pointer coordinates are being passed properly
- Verify drag/drop manager is initialized with the window manager

**Context menus not appearing:**

- Make sure `enableBasicContextMenu` is set to `true`
- Check that custom menu items are registered after view creation
- Verify spell checking is enabled if using spell check features

For more help, check the main package documentation or open an issue on GitHub.
