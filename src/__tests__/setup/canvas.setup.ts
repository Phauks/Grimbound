import { vi } from 'vitest';

/**
 * Canvas mocking for jsdom environment.
 * jsdom doesn't support canvas natively, so we mock essential methods.
 */

export interface MockCanvasContext extends Partial<CanvasRenderingContext2D> {
  __isMock: true;
}

export const createMockContext = (): MockCanvasContext => ({
  __isMock: true,
  canvas: document.createElement('canvas'),

  // Drawing methods
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),

  // Image data
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  }),

  // Transformations
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  transform: vi.fn(),

  // Drawing images
  drawImage: vi.fn(),

  // State
  save: vi.fn(),
  restore: vi.fn(),

  // Paths
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),

  // Clipping
  clip: vi.fn(),
  isPointInPath: vi.fn().mockReturnValue(false),
  isPointInStroke: vi.fn().mockReturnValue(false),

  // Text
  measureText: vi.fn().mockReturnValue({
    width: 100,
    actualBoundingBoxAscent: 10,
    actualBoundingBoxDescent: 2,
    fontBoundingBoxAscent: 12,
    fontBoundingBoxDescent: 3,
  }),
  fillText: vi.fn(),
  strokeText: vi.fn(),

  // Gradients
  createLinearGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  createConicGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  createPattern: vi.fn().mockReturnValue(null),

  // Properties (with default values)
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  direction: 'ltr' as CanvasDirection,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  shadowBlur: 0,
  shadowColor: 'rgba(0,0,0,0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low' as ImageSmoothingQuality,

  // Line dash
  getLineDash: vi.fn().mockReturnValue([]),
  setLineDash: vi.fn(),

  // Path2D
  getContextAttributes: vi.fn().mockReturnValue({
    alpha: true,
    colorSpace: 'srgb',
    desynchronized: false,
    willReadFrequently: false,
  }),
});

// Mock HTMLCanvasElement.prototype.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function (
  this: HTMLCanvasElement,
  contextId: string,
  _options?: CanvasRenderingContext2DSettings
) {
  if (contextId === '2d') {
    const ctx = createMockContext();
    ctx.canvas = this;
    return ctx;
  }
  return originalGetContext.call(this, contextId, _options);
}) as typeof HTMLCanvasElement.prototype.getContext;

// Mock toDataURL
HTMLCanvasElement.prototype.toDataURL = vi
  .fn()
  .mockReturnValue(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  );

// Mock toBlob
HTMLCanvasElement.prototype.toBlob = vi
  .fn()
  .mockImplementation((callback: BlobCallback, type?: string, _quality?: number) => {
    const blob = new Blob(['mock-image-data'], { type: type || 'image/png' });
    setTimeout(() => callback(blob), 0);
  });

// Export for use in tests that need to verify canvas operations
export { createMockContext as createMockCanvasContext };
