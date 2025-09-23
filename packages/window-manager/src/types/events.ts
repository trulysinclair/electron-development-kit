/**
 * Event types emitted by the window manager system
 */
export interface WindowManagerEvents {
  /** Emitted when a new window is created */
  'window:created': { windowId: string };
  /** Emitted when a window is updated */
  'window:updated': { windowId: string };
  /** Emitted when a window is closed */
  'window:closed': { windowId: string };

  /** Emitted when a new view is created */
  'view:created': { windowId: string; viewId: string };
  /** Emitted when a view is updated */
  'view:updated': { windowId: string; viewId: string };
  /** Emitted when a view is closed */
  'view:closed': { windowId: string; viewId: string };
  /** Emitted when a view is moved between windows */
  'view:moved': { viewId: string; fromWindowId: string; toWindowId: string };
  /** Emitted when a view becomes focused/active */
  'view:focused': { windowId: string; viewId: string };
  /** Emitted when a view's state changes (loading, navigation, etc.) */
  'view:state-changed': { windowId: string; viewId: string };

  /** Emitted when views in a window change */
  'views:changed': { windowId: string; reason: string };

  /** Emitted when a drag operation starts */
  'drag:started': { sourceWindowId: string; viewIds: string[] };
  /** Emitted when something is dragged over a target */
  'drag:over': { targetWindowId: string; sourceWindowId: string };
  /** Emitted when a drag operation enters a target */
  'drag:enter': { targetWindowId: string; sourceWindowId: string };
  /** Emitted when a drag operation leaves a target */
  'drag:leave': { targetWindowId: string; sourceWindowId: string };
  /** Emitted when a drop occurs */
  'drag:drop': {
    targetWindowId: string;
    sourceWindowId: string;
    viewIds: string[];
  };
  /** Emitted when a drag operation ends */
  'drag:end': { sourceWindowId: string; completed: boolean };
}

/**
 * Type helper for event listener callback functions
 */
export type EventListener<T extends keyof WindowManagerEvents> = (
  data: WindowManagerEvents[T]
) => void;

/**
 * Generic event emitter interface for the window manager
 */
export interface IEventEmitter {
  /** Add an event listener */
  on<T extends keyof WindowManagerEvents>(
    event: T,
    listener: EventListener<T>
  ): void;

  /** Remove an event listener */
  off<T extends keyof WindowManagerEvents>(
    event: T,
    listener: EventListener<T>
  ): void;

  /** Emit an event */
  emit<T extends keyof WindowManagerEvents>(
    event: T,
    data: WindowManagerEvents[T]
  ): void;

  /** Add a one-time event listener */
  once<T extends keyof WindowManagerEvents>(
    event: T,
    listener: EventListener<T>
  ): void;

  /** Remove all listeners for an event */
  removeAllListeners<T extends keyof WindowManagerEvents>(event?: T): void;

  /** Get the number of listeners for an event */
  listenerCount<T extends keyof WindowManagerEvents>(event: T): number;
}
