/**
 * Canvas Overlay Utilities
 *
 * Draw grid, guides, and other overlay helpers on the canvas
 */

import type { GridConfig, Guide, Point } from '@/ts/types/index.js';

/**
 * Draw grid overlay on canvas
 *
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param config - Grid configuration
 * @param zoom - Current zoom level
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GridConfig,
  zoom: number = 1.0
): void {
  if (!config.enabled) return;

  const spacing = config.spacing * zoom;

  ctx.save();
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.lineWidth;
  ctx.globalAlpha = config.opacity;

  // Draw vertical lines
  for (let x = 0; x <= width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw guides overlay on canvas
 *
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param guides - Array of guides to draw
 * @param zoom - Current zoom level
 */
export function drawGuides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guides: Guide[],
  zoom: number = 1.0
): void {
  if (guides.length === 0) return;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8;

  for (const guide of guides) {
    ctx.strokeStyle = guide.color ?? '#00BFFF'; // Default: cyan
    const position = guide.position * zoom;

    ctx.beginPath();
    if (guide.orientation === 'vertical') {
      ctx.moveTo(position, 0);
      ctx.lineTo(position, height);
    } else {
      ctx.moveTo(0, position);
      ctx.lineTo(width, position);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw both grid and guides
 *
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param grid - Grid configuration
 * @param guides - Array of guides
 * @param zoom - Current zoom level
 */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: GridConfig,
  guides: Guide[],
  zoom: number = 1.0
): void {
  // Draw grid first (underneath guides)
  drawGrid(ctx, width, height, grid, zoom);

  // Draw guides on top
  drawGuides(ctx, width, height, guides, zoom);
}

/**
 * Snap point to grid if snapping is enabled
 *
 * @param point - Point to snap
 * @param gridSize - Grid spacing
 * @param enabled - Whether snapping is enabled
 * @returns Snapped point
 */
export function snapToGrid(point: Point, gridSize: number, enabled: boolean): Point {
  if (!enabled || gridSize <= 0) {
    return point;
  }

  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Find nearest grid intersection to a point
 *
 * @param point - Point to find nearest intersection
 * @param gridSize - Grid spacing
 * @returns Nearest grid intersection point
 */
export function getNearestGridPoint(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Check if a point is near a guide (within threshold)
 *
 * @param point - Point to check
 * @param guides - Array of guides
 * @param threshold - Distance threshold in pixels
 * @returns Nearest guide if within threshold, null otherwise
 */
export function getNearestGuide(
  point: Point,
  guides: Guide[],
  threshold: number = 10
): Guide | null {
  let nearestGuide: Guide | null = null;
  let minDistance = threshold;

  for (const guide of guides) {
    const distance =
      guide.orientation === 'vertical'
        ? Math.abs(point.x - guide.position)
        : Math.abs(point.y - guide.position);

    if (distance < minDistance) {
      minDistance = distance;
      nearestGuide = guide;
    }
  }

  return nearestGuide;
}

/**
 * Snap point to nearest guide if within threshold
 *
 * @param point - Point to snap
 * @param guides - Array of guides
 * @param enabled - Whether snapping is enabled
 * @param threshold - Distance threshold in pixels
 * @returns Snapped point
 */
export function snapToGuides(
  point: Point,
  guides: Guide[],
  enabled: boolean,
  threshold: number = 10
): Point {
  if (!enabled || guides.length === 0) {
    return point;
  }

  const nearestGuide = getNearestGuide(point, guides, threshold);
  if (!nearestGuide) {
    return point;
  }

  if (nearestGuide.orientation === 'vertical') {
    return { ...point, x: nearestGuide.position };
  } else {
    return { ...point, y: nearestGuide.position };
  }
}

/**
 * Create a new guide
 *
 * @param orientation - Guide orientation (vertical or horizontal)
 * @param position - Position in pixels
 * @param color - Guide color
 * @returns New guide
 */
export function createGuide(
  orientation: 'vertical' | 'horizontal',
  position: number,
  color: string = '#00BFFF'
): Guide {
  return {
    id: crypto.randomUUID(),
    orientation,
    position,
    color,
  };
}

/**
 * Draw ruler along canvas edge
 *
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param zoom - Current zoom level
 * @param rulerSize - Size of ruler in pixels
 */
export function drawRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number = 1.0,
  rulerSize: number = 20
): void {
  ctx.save();

  // Ruler background
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(0, 0, width, rulerSize); // Top ruler
  ctx.fillRect(0, 0, rulerSize, height); // Left ruler

  // Ruler markings
  ctx.strokeStyle = '#808080';
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const spacing = 50 * zoom; // Major tick every 50px (scaled)
  const minorSpacing = 10 * zoom; // Minor tick every 10px (scaled)

  // Top ruler
  for (let x = 0; x <= width; x += minorSpacing) {
    const isMajor = x % spacing === 0;
    const tickHeight = isMajor ? rulerSize * 0.6 : rulerSize * 0.3;

    ctx.beginPath();
    ctx.moveTo(x, rulerSize);
    ctx.lineTo(x, rulerSize - tickHeight);
    ctx.stroke();

    if (isMajor && x > 0) {
      ctx.fillText(Math.round(x / zoom).toString(), x, rulerSize / 2);
    }
  }

  // Left ruler
  for (let y = 0; y <= height; y += minorSpacing) {
    const isMajor = y % spacing === 0;
    const tickWidth = isMajor ? rulerSize * 0.6 : rulerSize * 0.3;

    ctx.beginPath();
    ctx.moveTo(rulerSize, y);
    ctx.lineTo(rulerSize - tickWidth, y);
    ctx.stroke();

    if (isMajor && y > 0) {
      ctx.save();
      ctx.translate(rulerSize / 2, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(Math.round(y / zoom).toString(), 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
}
