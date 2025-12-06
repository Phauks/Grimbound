/**
 * Blood on the Clocktower Token Generator
 * PNG Exporter - Single PNG download functionality
 */

import { canvasToBlob, downloadFile } from '../utils/index.js';
import { embedPngMetadata, buildTokenMetadata } from './pngMetadata.js';
import type { Token, PngExportOptions } from '../types/index.js';

/**
 * Download a single token as PNG
 * @param token - Token object with canvas
 * @param pngSettings - Optional PNG export settings
 */
export async function downloadTokenPNG(
    token: Token,
    pngSettings?: PngExportOptions
): Promise<void> {
    let blob = await canvasToBlob(token.canvas);

    // Embed metadata if enabled
    if (pngSettings?.embedMetadata) {
        const metadata = buildTokenMetadata(token);
        blob = await embedPngMetadata(blob, metadata);
    }

    downloadFile(blob, `${token.filename}.png`);
}
