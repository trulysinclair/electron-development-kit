import { Rectangle } from 'electron';

/**
 * Utility functions for working with bounds and rectangles
 */

/**
 * Check if a point is within a rectangle
 */
export function isPointInBounds(
  point: { x: number; y: number },
  bounds: Rectangle
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Check if two rectangles intersect
 */
export function doRectsIntersect(rect1: Rectangle, rect2: Rectangle): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Calculate the intersection of two rectangles
 */
export function getIntersection(
  rect1: Rectangle,
  rect2: Rectangle
): Rectangle | null {
  if (!doRectsIntersect(rect1, rect2)) {
    return null;
  }

  const x = Math.max(rect1.x, rect2.x);
  const y = Math.max(rect1.y, rect2.y);
  const width = Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - x;
  const height = Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - y;

  return { x, y, width, height };
}

/**
 * Calculate the union of two rectangles
 */
export function getUnion(rect1: Rectangle, rect2: Rectangle): Rectangle {
  const x = Math.min(rect1.x, rect2.x);
  const y = Math.min(rect1.y, rect2.y);
  const width = Math.max(rect1.x + rect1.width, rect2.x + rect2.width) - x;
  const height = Math.max(rect1.y + rect1.height, rect2.y + rect2.height) - y;

  return { x, y, width, height };
}

/**
 * Center a rectangle within another rectangle
 */
export function centerRectInRect(
  inner: Rectangle,
  outer: Rectangle
): Rectangle {
  const x = outer.x + (outer.width - inner.width) / 2;
  const y = outer.y + (outer.height - inner.height) / 2;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: inner.width,
    height: inner.height,
  };
}

/**
 * Ensure a rectangle fits within bounds (clamp it)
 */
export function clampRectToBounds(
  rect: Rectangle,
  bounds: Rectangle
): Rectangle {
  let { x, y, width, height } = rect;

  // Clamp width and height to fit within bounds
  width = Math.min(width, bounds.width);
  height = Math.min(height, bounds.height);

  // Clamp position to keep rectangle within bounds
  x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - width));
  y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Scale a rectangle by a factor
 */
export function scaleRect(rect: Rectangle, scale: number): Rectangle {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.round(rect.width * scale),
    height: Math.round(rect.height * scale),
  };
}

/**
 * Calculate the area of a rectangle
 */
export function getRectArea(rect: Rectangle): number {
  return rect.width * rect.height;
}

/**
 * Check if a rectangle has valid dimensions (positive width and height)
 */
export function isValidRect(rect: Rectangle): boolean {
  return rect.width > 0 && rect.height > 0;
}

/**
 * Create a rectangle from two points
 */
export function rectFromPoints(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): Rectangle {
  const x = Math.min(point1.x, point2.x);
  const y = Math.min(point1.y, point2.y);
  const width = Math.abs(point2.x - point1.x);
  const height = Math.abs(point2.y - point1.y);

  return { x, y, width, height };
}
