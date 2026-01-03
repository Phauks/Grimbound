/**
 * Blood on the Clocktower Token Generator
 * PNG Exporter - Single PNG download functionality
 */

import type { Token } from '@/ts/types/index.js';
import { downloadFile, getTokenBlob } from '@/ts/utils/index.js';

/**
 * Download a single token as PNG.
 * Uses token.dataUrl when available (memory-efficient path).
 *
 * @param token - Token object with dataUrl and/or canvas
 */
export function downloadTokenPNG(token: Token): void {
  const blob = getTokenBlob(token);
  downloadFile(blob, `${token.filename}.png`);
}
