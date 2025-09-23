/**
 * Utility class for handling pointer/mouse coordinates
 */
export class PointerCoords {
  constructor(
    public readonly screenX: number,
    public readonly screenY: number
  ) {}

  /**
   * Create PointerCoords from a mouse event
   */
  static fromEvent(event: { screenX: number; screenY: number }): PointerCoords {
    return new PointerCoords(event.screenX, event.screenY);
  }

  /**
   * Create PointerCoords from an object
   */
  static fromObject(coords: {
    screenX: number;
    screenY: number;
  }): PointerCoords {
    return new PointerCoords(coords.screenX, coords.screenY);
  }

  /**
   * Check if these coordinates are within a rectangular bounds
   */
  isWithinBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    return (
      this.screenX >= bounds.x &&
      this.screenX <= bounds.x + bounds.width &&
      this.screenY >= bounds.y &&
      this.screenY <= bounds.y + bounds.height
    );
  }

  /**
   * Calculate distance to another point
   */
  distanceTo(other: PointerCoords): number {
    const dx = this.screenX - other.screenX;
    const dy = this.screenY - other.screenY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Create a new PointerCoords offset by the given amounts
   */
  offset(deltaX: number, deltaY: number): PointerCoords {
    return new PointerCoords(this.screenX + deltaX, this.screenY + deltaY);
  }

  /**
   * Convert to a plain object
   */
  toObject(): { screenX: number; screenY: number } {
    return {
      screenX: this.screenX,
      screenY: this.screenY,
    };
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `PointerCoords(${this.screenX}, ${this.screenY})`;
  }
}
