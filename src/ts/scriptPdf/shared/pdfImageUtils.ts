/**
 * PDF Image Utilities
 *
 * Shared image processing utilities for PDF generation.
 */

import { JPEG_QUALITY } from './pdfConstants.js';

/**
 * Convert canvas to JPEG bytes for PDF embedding
 */
export async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
