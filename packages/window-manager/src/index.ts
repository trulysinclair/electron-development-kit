/**
 * @electron-devkit/window-manager
 *
 * Advanced window and view management for Electron applications with multi-window
 * support and drag/drop functionality.
 */

// Core classes
export {
  WindowManager,
  ElectronWindow,
  ElectronView,
  DragDropManager,
} from './core';

// Configuration types
export type {
  AuxiliaryWindowConfig,
  DragDropConfig,
} from './core/DragDropManager';

// All interfaces and types
export * from './types';

// Utilities
export {
  PointerCoords,
  EventEmitter,
  isPointInBounds,
  doRectsIntersect,
  getIntersection,
  getUnion,
  centerRectInRect,
  clampRectToBounds,
  scaleRect,
  getRectArea,
  isValidRect,
  rectFromPoints,
  cutMenuItem,
  copyMenuItem,
  pasteMenuItem,
  selectAllMenuItem,
  separatorMenuItem,
  undoMenuItem,
  redoMenuItem,
  getStandardEditingMenuItems,
  getBasicMenuItems,
  createAddToDictionaryMenuItem,
  createSpellingSuggestionMenuItems,
} from './utils';

// Package version and metadata
export const VERSION = '1.0.0';
export const PACKAGE_NAME = '@electron-devkit/window-manager';
