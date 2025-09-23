# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron DevKit (EDK) is a monorepo containing specialized packages to simplify Electron application development. The primary package is `@electron-devkit/window-manager`, which provides advanced window and view management with multi-window support and drag/drop functionality.

## Development Commands

### Monorepo Level (Root)

- `pnpm build` - Build all packages in dependency order
- `pnpm dev` - Start development mode for all packages
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm test` - Run tests for all packages
- `pnpm clean` - Clean build artifacts from all packages
- `pnpm format` - Format code with Prettier

### Window Manager Package

Navigate to `packages/window-manager/` first:

- `pnpm build` - Compile TypeScript to dist/
- `pnpm build:watch` - Build in watch mode
- `pnpm test` - Run Jest tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm lint` - Lint with ESLint
- `pnpm format` - Format with Prettier
- `pnpm clean` - Remove dist/ directory

## Architecture

### Core Components

The window manager follows a modular architecture with these key components:

**WindowManager** (`src/core/WindowManager.ts:20`)

- Central orchestrator that manages multiple windows and their views
- Handles cross-window view dragging and automatic cleanup
- Maintains registries: windows, views, view-to-window mapping, active views
- Provides event-driven architecture with EventEmitter

**ElectronWindow** (`src/core/ElectronWindow.ts:10`)

- Wrapper around Electron's BrowserWindow with enhanced lifecycle management
- Handles loading states (NONE, NAVIGATING, READY)
- Supports both development (dev server) and production (file) loading modes
- Auto-configures window handlers and navigation security

**ElectronView** (`src/core/ElectronView.ts:16`)

- Wrapper around Electron's BrowserView with enhanced functionality
- Provides context menus, navigation state tracking, and spell checking
- Maintains state: title, URL, loading status, navigation capabilities, zoom level
- Supports custom context menu item registration

### Event System

All components extend EventEmitter and emit structured events:

- Window events: `window:created`, `window:closed`
- View events: `view:created`, `view:focused`, `view:closed`, `view:moved`
- State events: `views:changed`, `view:state-changed`

### Type System

Comprehensive TypeScript interfaces in `src/types/interfaces.ts`:

- `IWindowManager` - Main manager interface
- `IElectronWindow` - Window abstraction
- `IElectronView` - View abstraction
- `WindowConfig`, `ViewConfig` - Configuration objects
- `SanitizedView` - IPC-safe view data

### Key Features

**Cross-Window View Management**

- Views can be moved between windows via `moveViewToWindow()`
- Automatic cleanup of viewless windows (configurable)
- Active view tracking per window

**Lifecycle Management**

- Graceful shutdown with cleanup queues
- Resource disposal and memory leak prevention
- Crash reporting integration

**Development vs Production**

- Automatic detection of packaged vs development mode
- Environment-based URL loading (dev server vs file paths)
- Configurable logging levels

## Package Structure

```
packages/window-manager/
├── src/
│   ├── core/           # Core classes (WindowManager, ElectronWindow, ElectronView)
│   ├── types/          # TypeScript interfaces and types
│   ├── utils/          # Utilities (EventEmitter, bounds, menu items)
│   └── index.ts        # Main exports
├── examples/           # Usage examples
└── dist/              # Compiled output (generated)
```

## Usage Patterns

### Basic Setup

```typescript
const windowManager = new WindowManager({
  cleanup: { autoCloseViewlessWindows: true },
  logger: console,
});
```

### Window Creation

```typescript
const window = windowManager.createWindow({
  title: "App Window",
  state: { width: 1200, height: 800, mode: WindowMode.NORMAL },
  options: { webPreferences: { contextIsolation: true } },
  entryUrl: "index.html",
  isMainWindow: true,
});
```

### View Management

```typescript
const view = windowManager.createWindowView(windowId, {
  name: "GitHub",
  url: "https://github.com",
  category: "development",
});
```

## Key Dependencies

- **Electron**: >=29.0.0 (peer dependency)
- **uuid**: For generating unique IDs
- **TypeScript**: Built with strict type checking
- Uses Electron's BrowserWindow and BrowserView APIs extensively

## Development Notes

- The codebase uses modern TypeScript with strict settings
- Event-driven architecture for loose coupling
- Comprehensive error handling and logging
- Memory management with explicit cleanup patterns
- Security-conscious (context isolation, controlled navigation)
