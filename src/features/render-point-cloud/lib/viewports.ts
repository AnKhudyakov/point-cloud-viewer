export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SplitViewports {
  main: Rect;
  plan: Rect | null;
}

/**
 * Splits the canvas between the perspective view and the plan view.
 *
 * Both views share one WebGL context and one canvas, drawn through two
 * viewports with the scissor test on. A second renderer would mean a second
 * context, and a browser only grants a handful of those.
 *
 * Rect coordinates are top left based, as the DOM measures them. The renderer
 * wants bottom left, which `toGlViewport` converts.
 */
export function splitViewports(
  width: number,
  height: number,
  split: boolean,
  rightInset = 0,
): SplitViewports {
  const usable = Math.max(width - Math.max(rightInset, 0), 0);

  if (!split || usable < 2) {
    return { main: { x: 0, y: 0, width, height }, plan: null };
  }

  const half = Math.floor(usable / 2);

  return {
    main: { x: 0, y: 0, width: half, height },
    plan: { x: half, y: 0, width: usable - half, height },
  };
}

export function toGlViewport(rect: Rect, canvasHeight: number): Rect {
  return {
    x: rect.x,
    y: canvasHeight - rect.y - rect.height,
    width: rect.width,
    height: rect.height,
  };
}

export function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

/** Normalised device coordinates of a point inside a viewport. */
export function toNdc(rect: Rect, x: number, y: number): { x: number; y: number } {
  return {
    x: ((x - rect.x) / rect.width) * 2 - 1,
    y: -((y - rect.y) / rect.height) * 2 + 1,
  };
}
