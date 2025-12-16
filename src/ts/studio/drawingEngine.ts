/**
 * Drawing Engine
 *
 * Core drawing logic for brush, eraser, shapes, and text tools
 */

import type { Point, ToolSettings } from '../types/index.js';

/**
 * Drawing Engine class for handling all drawing operations
 */
export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentStroke: Point[] = [];
  private isDrawing: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  // ============================================================================
  // Brush Tool
  // ============================================================================

  /**
   * Start a new brush stroke
   */
  startBrushStroke(point: Point, settings: ToolSettings['brush']): void {
    this.isDrawing = true;
    this.currentStroke = [point];

    // Set brush properties
    this.ctx.strokeStyle = settings.color;
    this.ctx.lineWidth = settings.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = settings.opacity;

    // Begin path at starting point
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }

  /**
   * Continue the current brush stroke
   */
  continueBrushStroke(point: Point, _settings: ToolSettings['brush']): void {
    if (!this.isDrawing) return;

    this.currentStroke.push(point);

    // Draw line to new point
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  /**
   * End the current brush stroke
   */
  endBrushStroke(): Point[] {
    this.isDrawing = false;
    const stroke = [...this.currentStroke];
    this.currentStroke = [];
    this.ctx.globalAlpha = 1; // Reset alpha
    return stroke;
  }

  /**
   * Draw a complete stroke (for redo operations)
   */
  drawStroke(points: Point[], settings: ToolSettings['brush']): void {
    if (points.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = settings.color;
    this.ctx.lineWidth = settings.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = settings.opacity;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  // ============================================================================
  // Eraser Tool
  // ============================================================================

  /**
   * Start erasing
   */
  startErase(point: Point, size: number): void {
    this.isDrawing = true;
    this.currentStroke = [point];

    // Use destination-out composite mode to erase
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.lineWidth = size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(point.x, point.y);
  }

  /**
   * Continue erasing
   */
  continueErase(point: Point): void {
    if (!this.isDrawing) return;

    this.currentStroke.push(point);
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  /**
   * End erasing
   */
  endErase(): Point[] {
    this.isDrawing = false;
    const stroke = [...this.currentStroke];
    this.currentStroke = [];
    this.ctx.restore(); // Restore composite mode
    return stroke;
  }

  // ============================================================================
  // Shape Tool
  // ============================================================================

  /**
   * Draw a circle
   */
  drawCircle(center: Point, radius: number, settings: ToolSettings['shape']): void {
    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);

    // Fill
    if (settings.fill && settings.fill !== 'transparent') {
      this.ctx.fillStyle = settings.fill;
      this.ctx.fill();
    }

    // Stroke
    if (settings.stroke && settings.strokeWidth > 0) {
      this.ctx.strokeStyle = settings.stroke;
      this.ctx.lineWidth = settings.strokeWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Draw a rectangle
   */
  drawRectangle(
    topLeft: Point,
    width: number,
    height: number,
    settings: ToolSettings['shape']
  ): void {
    this.ctx.save();

    // Fill
    if (settings.fill && settings.fill !== 'transparent') {
      this.ctx.fillStyle = settings.fill;
      this.ctx.fillRect(topLeft.x, topLeft.y, width, height);
    }

    // Stroke
    if (settings.stroke && settings.strokeWidth > 0) {
      this.ctx.strokeStyle = settings.stroke;
      this.ctx.lineWidth = settings.strokeWidth;
      this.ctx.strokeRect(topLeft.x, topLeft.y, width, height);
    }

    this.ctx.restore();
  }

  /**
   * Draw a line
   */
  drawLine(start: Point, end: Point, settings: ToolSettings['shape']): void {
    this.ctx.save();

    this.ctx.strokeStyle = settings.stroke;
    this.ctx.lineWidth = settings.strokeWidth;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw an ellipse
   */
  drawEllipse(
    center: Point,
    radiusX: number,
    radiusY: number,
    settings: ToolSettings['shape']
  ): void {
    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);

    // Fill
    if (settings.fill && settings.fill !== 'transparent') {
      this.ctx.fillStyle = settings.fill;
      this.ctx.fill();
    }

    // Stroke
    if (settings.stroke && settings.strokeWidth > 0) {
      this.ctx.strokeStyle = settings.stroke;
      this.ctx.lineWidth = settings.strokeWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  // ============================================================================
  // Text Tool
  // ============================================================================

  /**
   * Draw text on the canvas
   */
  drawText(text: string, position: Point, settings: ToolSettings['text']): void {
    this.ctx.save();

    // Set font
    this.ctx.font = `${settings.size}px ${settings.font}`;
    this.ctx.fillStyle = settings.color;
    this.ctx.textAlign = settings.alignment || 'left';
    this.ctx.textBaseline = 'top';

    // Apply letter spacing manually if needed
    if (settings.letterSpacing && settings.letterSpacing !== 0) {
      this.drawTextWithLetterSpacing(text, position, settings);
    } else {
      this.ctx.fillText(text, position.x, position.y);
    }

    this.ctx.restore();
  }

  /**
   * Draw text with custom letter spacing
   */
  private drawTextWithLetterSpacing(
    text: string,
    position: Point,
    settings: ToolSettings['text']
  ): void {
    let x = position.x;
    const y = position.y;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      this.ctx.fillText(char, x, y);
      const charWidth = this.ctx.measureText(char).width;
      x += charWidth + settings.letterSpacing;
    }
  }

  /**
   * Measure text dimensions
   */
  measureText(text: string, settings: ToolSettings['text']): { width: number; height: number } {
    this.ctx.save();
    this.ctx.font = `${settings.size}px ${settings.font}`;

    const metrics = this.ctx.measureText(text);
    const width = metrics.width + settings.letterSpacing * (text.length - 1);
    const height = settings.size; // Approximate height

    this.ctx.restore();

    return { width, height };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear the entire canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Fill the entire canvas with a color
   */
  fill(color: string): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  /**
   * Get the current canvas
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Set a new canvas for drawing
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
  }

  /**
   * Draw a preview shape (for showing shape outline before finalizing)
   */
  drawPreview(drawFn: () => void): void {
    this.ctx.save();
    this.ctx.setLineDash([5, 5]); // Dashed line for preview
    this.ctx.globalAlpha = 0.5;
    drawFn();
    this.ctx.restore();
  }

  /**
   * Calculate distance between two points
   */
  static distance(p1: Point, p2: Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Calculate the center point between two points
   */
  static midpoint(p1: Point, p2: Point): Point {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  /**
   * Get the bounding box for a set of points
   */
  static getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
