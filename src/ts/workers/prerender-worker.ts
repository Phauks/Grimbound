/**
 * Pre-Render Web Worker
 * Handles CPU-intensive canvas encoding operations off the main thread.
 * Uses OffscreenCanvas for non-blocking rendering.
 */

/**
 * Message types for worker communication.
 */
export type WorkerMessageType = 'ENCODE_CANVAS' | 'ENCODE_BATCH';

/**
 * Task sent from main thread to worker.
 */
export interface WorkerTask {
  type: WorkerMessageType;
  id: string; // Unique task ID for response matching
  data: EncodeCanvasTask | EncodeBatchTask;
}

/**
 * Worker response data types.
 */
export interface EncodeCanvasResult {
  dataUrl: string;
}

export interface EncodeBatchResult {
  dataUrls: string[];
}

/**
 * Response sent from worker to main thread.
 */
export interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR';
  id: string; // Matches task ID
  data?: EncodeCanvasResult | EncodeBatchResult;
  error?: string;
}

/**
 * Supported output formats for canvas encoding.
 */
export type OutputFormat = 'image/png' | 'image/webp' | 'image/jpeg';

/**
 * Canvas encoding task data.
 */
export interface EncodeCanvasTask {
  imageData: ImageData; // Transferable (via buffer)
  width: number;
  height: number;
  /** Encoding quality 0.0-1.0 (only used for WebP and JPEG, ignored for PNG) */
  quality?: number;
  /** Output format (default: 'image/webp' for better compression with quality support) */
  format?: OutputFormat;
}

/**
 * Batch encoding task data.
 */
export interface EncodeBatchTask {
  encodings: EncodeCanvasTask[];
}

/**
 * Check if OffscreenCanvas is supported.
 */
const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

/**
 * Encode ImageData to data URL using OffscreenCanvas.
 * @param imageData - Image data to encode
 * @param width - Canvas width
 * @param height - Canvas height
 * @param quality - Encoding quality (0.0-1.0), only used for WebP and JPEG
 * @param format - Output format (default: 'image/webp')
 * @returns Data URL string
 */
async function encodeImageData(
  imageData: ImageData,
  width: number,
  height: number,
  quality: number = 0.92,
  format: OutputFormat = 'image/webp'
): Promise<string> {
  if (!supportsOffscreenCanvas) {
    throw new Error('OffscreenCanvas not supported in this browser');
  }

  // Create OffscreenCanvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2d context from OffscreenCanvas');
  }

  // Put image data on canvas
  ctx.putImageData(imageData, 0, 0);

  // Convert to blob (quality is only used for WebP and JPEG, ignored for PNG)
  const blobOptions: ImageEncodeOptions = { type: format };
  if (format !== 'image/png') {
    blobOptions.quality = quality;
  }

  const blob = await canvas.convertToBlob(blobOptions);

  // Convert blob to data URL
  const dataUrl = await blobToDataURL(blob);
  return dataUrl;
}

/**
 * Convert Blob to data URL.
 * @param blob - Blob to convert
 * @returns Data URL string
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Handle incoming messages from main thread.
 */
self.onmessage = async (e: MessageEvent<WorkerTask>) => {
  const { type, id, data } = e.data;

  try {
    if (type === 'ENCODE_CANVAS') {
      const task = data as EncodeCanvasTask;
      const dataUrl = await encodeImageData(
        task.imageData,
        task.width,
        task.height,
        task.quality,
        task.format
      );

      const response: WorkerResponse = {
        type: 'SUCCESS',
        id,
        data: { dataUrl },
      };

      self.postMessage(response);
    } else if (type === 'ENCODE_BATCH') {
      const task = data as EncodeBatchTask;
      const results: string[] = [];

      // Process batch sequentially in worker (main thread handles parallelism via multiple workers)
      for (const encoding of task.encodings) {
        const dataUrl = await encodeImageData(
          encoding.imageData,
          encoding.width,
          encoding.height,
          encoding.quality,
          encoding.format
        );
        results.push(dataUrl);
      }

      const response: WorkerResponse = {
        type: 'SUCCESS',
        id,
        data: { dataUrls: results },
      };

      self.postMessage(response);
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'ERROR',
      id,
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(response);
  }
};

// Notify main thread that worker is ready
interface ReadyMessage {
  type: 'READY';
}
self.postMessage({ type: 'READY' } as ReadyMessage);
