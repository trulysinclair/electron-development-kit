import { EventEmitter as NodeEventEmitter } from 'events';
import {
  IEventEmitter,
  WindowManagerEvents,
  EventListener,
} from '../types/events';

/**
 * TypeScript-friendly event emitter wrapper for window manager events
 */
export class EventEmitter extends NodeEventEmitter implements IEventEmitter {
  /**
   * Add an event listener
   */
  on<T extends keyof WindowManagerEvents>(
    event: T,
    listener: EventListener<T>
  ): void {
    super.on(event, listener);
  }

  /**
   * Remove an event listener
   */
  off<T extends keyof WindowManagerEvents>(
    event: T,
    listener: EventListener<T>
  ): void {
    super.off(event, listener);
  }

  /**
   * Emit an event
   */
  emit<T extends keyof WindowManagerEvents>(
    event: T,
    data: WindowManagerEvents[T]
  ): void {
    super.emit(event, data);
  }

  /**
   * Add a one-time event listener
   */
  once<T extends keyof WindowManagerEvents>(
    event: T,
    listener: EventListener<T>
  ): void {
    super.once(event, listener);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<T extends keyof WindowManagerEvents>(event?: T): void {
    super.removeAllListeners(event);
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<T extends keyof WindowManagerEvents>(event: T): number {
    return super.listenerCount(event);
  }
}
