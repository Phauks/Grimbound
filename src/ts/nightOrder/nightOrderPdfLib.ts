/**
 * Night Order PDF Generator using pdf-lib
 *
 * High-performance PDF generation for night order sheets.
 * Uses pdf-lib + @pdf-lib/fontkit for native OTF support.
 *
 * Features:
 * - Custom font embedding (Dumbledor, Goudy, TradeGothic)
 * - Character icon rendering
 * - Dynamic scaling to fit all entries on one page
 * - Progress reporting
 * - Cancellation support
 * - Parallel page rendering
 */

import { PDFDocument, type PDFImage, type PDFPage, rgb } from 'pdf-lib';
import type { ScriptMeta } from '../types/index.js';
import { resolveCharacterImageUrl } from '../utils/characterImageResolver.js';
import { globalImageCache } from '../utils/imageCache.js';
import { logger } from '../utils/logger.js';
import { type FontSet, loadFonts } from './fontLoader.js';
import {
  ABILITY_LINE_HEIGHT_RATIO,
  BASELINE_ENTRY_PADDING,
  BASELINE_ICON_TEXT_GAP,
  calculateScaleConfig,
  inchesToPoints,
  MARGIN,
  MARGIN_SIDE,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type ScaleConfig,
} from './nightOrderLayout.js';
import type { NightOrderEntry, NightOrderState } from './nightOrderTypes.js';
import { getTeamColor, parseAbilityText } from './nightOrderUtils.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Progress phases for export
 */
export type ExportPhase =
  | 'initializing'
  | 'loading-fonts'
  | 'loading-images'
  | 'rendering-first'
  | 'rendering-other'
  | 'saving';

/**
 * Progress callback function
 */
export type ProgressCallback = (phase: ExportPhase, progress: number, total: number) => void;

/**
 * Export options for PDF generation
 */
export interface NightOrderPdfOptions {
  /** Include First Night sheet */
  includeFirstNight?: boolean;
  /** Include Other Nights sheet */
  includeOtherNight?: boolean;
  /** Show script name in header */
  showScriptName?: boolean;
  /** Progress callback */
  onProgress?: ProgressCallback;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

// ============================================================================
// Constants
// ============================================================================

/** Page dimensions in points (72 points = 1 inch) */
const PAGE_WIDTH_PT = inchesToPoints(PAGE_WIDTH);
const PAGE_HEIGHT_PT = inchesToPoints(PAGE_HEIGHT);

/** Colors */
const COLORS = {
  PARCHMENT_BG: rgb(244 / 255, 237 / 255, 217 / 255),
  FIRST_NIGHT_TITLE: rgb(26 / 255, 58 / 255, 90 / 255),
  OTHER_NIGHT_TITLE: rgb(74 / 255, 42 / 255, 106 / 255),
  TEXT_DARK: rgb(26 / 255, 26 / 255, 26 / 255),
  TEXT_SECONDARY: rgb(90 / 255, 80 / 255, 64 / 255),
  SEPARATOR: rgb(200 / 255, 195 / 255, 180 / 255),
  CIRCLE_GREY: rgb(136 / 255, 136 / 255, 136 / 255),
  SCRIPT_NAME: rgb(42 / 255, 90 / 255, 42 / 255),
} as const;

/** Team colors */
const TEAM_COLORS: Record<string, ReturnType<typeof rgb>> = {
  townsfolk: rgb(26 / 255, 95 / 255, 42 / 255),
  outsider: rgb(26 / 255, 63 / 255, 95 / 255),
  minion: rgb(95 / 255, 26 / 255, 63 / 255),
  demon: rgb(139 / 255, 0, 0),
  traveller: rgb(95 / 255, 79 / 255, 26 / 255),
  fabled: rgb(79 / 255, 26 / 255, 95 / 255),
  loric: rgb(42 / 255, 95 / 255, 95 / 255),
  special: rgb(74 / 255, 74 / 255, 74 / 255),
};

// ============================================================================
// Image Loading (Parallel with Caching)
// ============================================================================

/** Batch size for parallel image loading (matches browser connection limit) */
const IMAGE_BATCH_SIZE = 6;

/** Cache for fetched image bytes (persists across exports for instant re-export) */
const imageBytesCache = new Map<string, { bytes: ArrayBuffer; type: 'png' | 'jpg' | 'webp' }>();

/** Image type detection result */
type ImageType = 'png' | 'jpg' | 'webp' | 'unknown';

/**
 * Detect image type from bytes using magic numbers
 */
function detectImageType(bytes: ArrayBuffer): ImageType {
  const uint8 = new Uint8Array(bytes);
  // PNG magic: 89 50 4E 47
  if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e && uint8[3] === 0x47) {
    return 'png';
  }
  // JPEG magic: FF D8 FF
  if (uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff) {
    return 'jpg';
  }
  // WebP: RIFF header
  if (uint8[0] === 0x52 && uint8[1] === 0x49 && uint8[2] === 0x46 && uint8[3] === 0x46) {
    return 'webp';
  }
  return 'unknown';
}

/**
 * Result from loading a single image
 */
interface ImageLoadResult {
  id: string;
  bytes: ArrayBuffer;
  type: ImageType;
  url: string;
  blobUrl?: string;
}

/**
 * Convert an HTMLImageElement to PNG ArrayBuffer via canvas
 * This is fast since the image is already decoded in memory
 */
async function imageElementToBytes(img: HTMLImageElement): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          blob
            .arrayBuffer()
            .then(resolve)
            .catch(() => resolve(null));
        } else {
          resolve(null);
        }
      }, 'image/png');
    } catch {
      resolve(null);
    }
  });
}

/**
 * Load a single image and return bytes + metadata
 * Priority: 1. PDF bytes cache, 2. globalImageCache (token generation), 3. Network fetch
 *
 * IMPORTANT: globalImageCache uses the RAW image string (entry.image) as the cache key,
 * NOT the resolved URL. This matches how token generator caches images.
 */
async function loadSingleImage(
  entry: NightOrderEntry,
  signal?: AbortSignal
): Promise<ImageLoadResult | null> {
  const startTime = performance.now();

  if (signal?.aborted) {
    throw new DOMException('Cancelled', 'AbortError');
  }

  if (!entry.image) {
    return null;
  }

  // Cache key is the raw image string - SAME as token generator uses!
  const cacheKey = entry.image;

  // Priority 1: Check PDF bytes cache (instant for repeat exports)
  const cached = imageBytesCache.get(cacheKey);
  if (cached) {
    console.log(
      `⚡ ${entry.id}: bytes cache hit (${(performance.now() - startTime).toFixed(0)}ms)`
    );
    return {
      id: entry.id,
      bytes: cached.bytes,
      type: cached.type,
      url: entry.image,
    };
  }

  try {
    // Priority 2: Check globalImageCache using the RAW entry.image string
    // This is the SAME key that token generator uses when caching!
    if (globalImageCache.has(cacheKey)) {
      const cacheStart = performance.now();
      const cachedImg = await globalImageCache.get(cacheKey);
      const bytes = await imageElementToBytes(cachedImg);
      if (bytes) {
        console.log(
          `🎯 ${entry.id}: global cache hit, converted in ${(performance.now() - cacheStart).toFixed(0)}ms`
        );
        imageBytesCache.set(cacheKey, { bytes, type: 'png' });
        return {
          id: entry.id,
          bytes,
          type: 'png',
          url: cacheKey,
        };
      }
    }

    // Priority 3: Not in cache - need to resolve and fetch
    // Resolve image URL (only needed for network fetch now)
    const resolveStart = performance.now();
    const result = await resolveCharacterImageUrl(entry.image, entry.id, {
      logContext: 'NightOrderPdfLib',
    });
    console.log(
      `📍 ${entry.id}: URL resolved in ${(performance.now() - resolveStart).toFixed(0)}ms → ${result.url?.substring(0, 50)}...`
    );

    if (!result.url) {
      return null;
    }

    // Fetch from network
    console.log(`🌐 ${entry.id}: fetching from network...`);
    const fetchStart = performance.now();
    const response = await fetch(result.url);
    if (!response.ok) {
      logger.warn('NightOrderPdfLib', `Failed to fetch image for ${entry.id}: ${response.status}`);
      return null;
    }

    const bytes = await response.arrayBuffer();
    console.log(
      `✅ ${entry.id}: network fetch completed in ${(performance.now() - fetchStart).toFixed(0)}ms`
    );

    const type = detectImageType(bytes);

    // Cache for future exports
    if (type !== 'unknown') {
      imageBytesCache.set(cacheKey, { bytes, type });
    }

    return {
      id: entry.id,
      bytes,
      type,
      url: result.url,
      blobUrl: result.blobUrl,
    };
  } catch (error) {
    logger.warn('NightOrderPdfLib', `Failed to load image for ${entry.id}`, error);
    return null;
  }
}

/**
 * Embed image bytes into PDF document
 */
async function embedImageInPdf(
  pdfDoc: PDFDocument,
  bytes: ArrayBuffer,
  type: ImageType,
  url: string
): Promise<PDFImage | null> {
  try {
    switch (type) {
      case 'png':
        return await pdfDoc.embedPng(bytes);
      case 'jpg':
        return await pdfDoc.embedJpg(bytes);
      case 'webp': {
        // WebP requires canvas conversion to PNG
        const pngBytes = await convertWebPtoPng(url);
        if (pngBytes) {
          return await pdfDoc.embedPng(pngBytes);
        }
        return null;
      }
      default:
        return null;
    }
  } catch (error) {
    logger.warn('NightOrderPdfLib', `Failed to embed image: ${error}`);
    return null;
  }
}

/**
 * Load and embed character images into PDF using parallel batched loading
 *
 * Performance: ~6x faster than sequential loading due to parallel network requests
 * Caching: Bytes are cached, so repeat exports are near-instant
 */
async function loadCharacterImages(
  pdfDoc: PDFDocument,
  entries: NightOrderEntry[],
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<Map<string, PDFImage>> {
  // DEBUG: Verify parallel code is running
  console.log(
    '🚀 PARALLEL IMAGE LOADING - Batch size:',
    IMAGE_BATCH_SIZE,
    'Total entries:',
    entries.length
  );

  const imageMap = new Map<string, PDFImage>();
  const blobUrls: string[] = [];

  const total = entries.length;
  let loaded = 0;

  const startTime = performance.now();

  // Process in parallel batches
  for (let i = 0; i < entries.length; i += IMAGE_BATCH_SIZE) {
    console.log(
      `🔄 Processing batch ${Math.floor(i / IMAGE_BATCH_SIZE) + 1} of ${Math.ceil(entries.length / IMAGE_BATCH_SIZE)}`
    );
    // Check for cancellation between batches
    if (signal?.aborted) {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
      throw new DOMException('Export cancelled', 'AbortError');
    }

    const batch = entries.slice(i, i + IMAGE_BATCH_SIZE);

    // Load batch in parallel using Promise.allSettled for fault tolerance
    const results = await Promise.allSettled(batch.map((entry) => loadSingleImage(entry, signal)));

    // Process results and embed successfully loaded images
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const { id, bytes, type, url, blobUrl } = result.value;

        // Track blob URLs for cleanup
        if (blobUrl) {
          blobUrls.push(blobUrl);
        }

        // Embed image into PDF
        const pdfImage = await embedImageInPdf(pdfDoc, bytes, type, url);
        if (pdfImage) {
          imageMap.set(id, pdfImage);
        }
      }

      loaded++;
      onProgress?.(loaded, total);
    }
  }

  // Cleanup blob URLs
  blobUrls.forEach((url) => URL.revokeObjectURL(url));

  const elapsed = performance.now() - startTime;
  logger.info(
    'NightOrderPdfLib',
    `Loaded ${imageMap.size}/${entries.length} images in ${elapsed.toFixed(0)}ms (batch size ${IMAGE_BATCH_SIZE})`
  );

  return imageMap;
}

/**
 * Convert WebP to PNG using canvas (browser only)
 */
async function convertWebPtoPng(url: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          blob
            .arrayBuffer()
            .then(resolve)
            .catch(() => resolve(null));
        } else {
          resolve(null);
        }
      }, 'image/png');
    };

    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ============================================================================
// Page Rendering
// ============================================================================

/**
 * Draw parchment background
 */
function drawBackground(page: PDFPage): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
    color: COLORS.PARCHMENT_BG,
  });
}

/**
 * Draw decorative gradient border at bottom
 */
function drawBottomBorder(page: PDFPage): void {
  const borderHeight = inchesToPoints(0.4);
  const steps = 5;
  const stepHeight = borderHeight / steps;

  for (let i = 0; i < steps; i++) {
    const alpha = 1 - i / steps;
    const r = (20 + (50 - 20) * (1 - alpha)) / 255;
    const g = (61 + (138 - 61) * (1 - alpha)) / 255;
    const b = (20 + (50 - 20) * (1 - alpha)) / 255;

    page.drawRectangle({
      x: 0,
      y: i * stepHeight,
      width: PAGE_WIDTH_PT,
      height: stepHeight,
      color: rgb(r, g, b),
    });
  }
}

/**
 * Draw header with title and optional script name
 */
function drawHeader(
  page: PDFPage,
  fonts: FontSet,
  nightType: 'first' | 'other',
  scriptMeta: ScriptMeta | null,
  scaleConfig: ScaleConfig,
  showScriptName: boolean
): number {
  const margin = inchesToPoints(MARGIN_SIDE);
  const topY = PAGE_HEIGHT_PT - inchesToPoints(MARGIN) - inchesToPoints(0.2);

  const title = nightType === 'first' ? 'First Night' : 'Other Nights';
  const titleColor = nightType === 'first' ? COLORS.FIRST_NIGHT_TITLE : COLORS.OTHER_NIGHT_TITLE;

  // Scale title font (baseline is ~28pt at scale 1.0)
  const titleFontSize = Math.round(28 * scaleConfig.scaleFactor);

  // Draw title
  page.drawText(title, {
    x: margin,
    y: topY,
    font: fonts.title,
    size: titleFontSize,
    color: titleColor,
  });

  // Draw script name on right (if provided)
  if (showScriptName && scriptMeta?.name) {
    const scriptFontSize = Math.round(titleFontSize * 0.6);
    const scriptWidth = fonts.title.widthOfTextAtSize(scriptMeta.name, scriptFontSize);

    page.drawText(scriptMeta.name, {
      x: PAGE_WIDTH_PT - margin - scriptWidth,
      y: topY,
      font: fonts.title,
      size: scriptFontSize,
      color: COLORS.SCRIPT_NAME,
    });
  }

  // Draw divider line
  const lineY = topY - inchesToPoints(0.15 * scaleConfig.scaleFactor);
  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: PAGE_WIDTH_PT - margin, y: lineY },
    thickness: 1.5,
    color: titleColor,
  });

  // Return Y position for entries
  return lineY - inchesToPoints(0.2 * scaleConfig.scaleFactor);
}

/**
 * Calculate image dimensions to fit within a max size while preserving aspect ratio
 * Matches CSS object-fit: contain behavior (WYSIWYG)
 */
function calculateContainedImageSize(
  image: PDFImage,
  maxSize: number
): { width: number; height: number; xOffset: number; yOffset: number } {
  const aspectRatio = image.width / image.height;
  let width: number, height: number;

  if (aspectRatio > 1) {
    // Wider than tall
    width = maxSize;
    height = maxSize / aspectRatio;
  } else {
    // Taller than wide or square
    width = maxSize * aspectRatio;
    height = maxSize;
  }

  return {
    width,
    height,
    xOffset: (maxSize - width) / 2,
    yOffset: (maxSize - height) / 2,
  };
}

/**
 * Draw a single entry (character name + ability text + icon)
 */
function drawEntry(
  page: PDFPage,
  fonts: FontSet,
  entry: NightOrderEntry,
  imageMap: Map<string, PDFImage>,
  yPos: number,
  scaleConfig: ScaleConfig
): number {
  const margin = inchesToPoints(MARGIN_SIDE);
  const contentWidth = PAGE_WIDTH_PT - margin * 2;
  const iconSize = inchesToPoints(scaleConfig.iconSize);
  // Use WYSIWYG constant: CSS gap: 0.4rem = 0.067in
  const iconTextGap = inchesToPoints(BASELINE_ICON_TEXT_GAP * scaleConfig.scaleFactor);
  const textStartX = margin + iconSize + iconTextGap;

  // Get team color
  const _teamColorHex = getTeamColor(entry.team);
  const teamColor = TEAM_COLORS[entry.team || 'special'] || TEAM_COLORS.special;

  // Draw icon if available
  const image = imageMap.get(entry.id);
  if (image) {
    // WYSIWYG: Preserve aspect ratio like CSS object-fit: contain
    const imgDims = calculateContainedImageSize(image, iconSize);
    page.drawImage(image, {
      x: margin + imgDims.xOffset,
      y: yPos - iconSize + imgDims.yOffset,
      width: imgDims.width,
      height: imgDims.height,
    });
  }

  // Draw character name
  const nameFontSize = scaleConfig.nameFontSize;
  page.drawText(entry.name, {
    x: textStartX,
    y: yPos,
    font: fonts.name,
    size: nameFontSize,
    color: teamColor,
  });

  // Draw ability text with formatting
  let currentY = yPos - inchesToPoints(0.16 * scaleConfig.scaleFactor);
  const abilityFontSize = scaleConfig.abilityFontSize;
  // WYSIWYG: text wrap width matches CSS container (content - icon - gap)
  const maxTextWidth = contentWidth - iconSize - iconTextGap;
  // WYSIWYG: line height matches CSS line-height: 1.2
  const lineHeight = abilityFontSize * ABILITY_LINE_HEIGHT_RATIO;

  // Parse ability text for bold tokens and circle indicators
  const segments = parseAbilityText(entry.ability);
  let currentX = textStartX;

  for (const segment of segments) {
    if (segment.isCircle) {
      // Draw grey circle indicator
      const circleRadius = abilityFontSize * 0.3;

      // Check if fits on current line
      if (currentX + circleRadius * 2 - textStartX > maxTextWidth) {
        currentY -= lineHeight;
        currentX = textStartX;
      }

      page.drawCircle({
        x: currentX + circleRadius,
        y: currentY - circleRadius * 0.3,
        size: circleRadius,
        color: COLORS.CIRCLE_GREY,
      });

      currentX += circleRadius * 2 + abilityFontSize * 0.2;
    } else if (segment.text) {
      // Text segment (bold or normal)
      const font = segment.isBold ? fonts.abilityBold : fonts.ability;
      const words = segment.text.split(' ');

      for (const word of words) {
        if (!word) continue;
        const wordText = `${word} `;
        const wordWidth = font.widthOfTextAtSize(wordText, abilityFontSize);

        // Word wrap check
        if (currentX + wordWidth - textStartX > maxTextWidth) {
          currentY -= lineHeight;
          currentX = textStartX;
        }

        page.drawText(wordText, {
          x: currentX,
          y: currentY,
          font: font,
          size: abilityFontSize,
          color: COLORS.TEXT_DARK,
        });

        currentX += wordWidth;
      }
    }
  }

  // WYSIWYG: No separator lines between entries (matches UI CSS)
  // Calculate next entry Y position with proper padding
  const entryPadding = inchesToPoints(BASELINE_ENTRY_PADDING * scaleConfig.scaleFactor);
  return currentY - inchesToPoints(scaleConfig.entrySpacing) - entryPadding * 2;
}

/**
 * Draw footer with credits
 */
function _drawFooter(page: PDFPage, fonts: FontSet): void {
  const margin = inchesToPoints(MARGIN_SIDE);
  const footerY = inchesToPoints(0.5);
  const fontSize = 8;

  const copyright = '© Steven Medway bloodontheclocktower.com';
  const template = 'Script template by John Forster ravenswoodstudio.xyz';

  const copyrightWidth = fonts.ability.widthOfTextAtSize(copyright, fontSize);
  const templateWidth = fonts.ability.widthOfTextAtSize(template, fontSize);

  page.drawText(copyright, {
    x: PAGE_WIDTH_PT - margin - copyrightWidth,
    y: footerY,
    font: fonts.ability,
    size: fontSize,
    color: COLORS.TEXT_SECONDARY,
  });

  page.drawText(template, {
    x: PAGE_WIDTH_PT - margin - templateWidth,
    y: footerY - 10,
    font: fonts.ability,
    size: fontSize,
    color: COLORS.TEXT_SECONDARY,
  });
}

/**
 * Render a complete night sheet page
 */
function renderNightSheet(
  page: PDFPage,
  fonts: FontSet,
  entries: NightOrderEntry[],
  imageMap: Map<string, PDFImage>,
  nightType: 'first' | 'other',
  scriptMeta: ScriptMeta | null,
  showScriptName: boolean
): void {
  // Calculate scaling
  const scaleConfig = calculateScaleConfig(entries);

  // Draw background
  drawBackground(page);

  // Draw decorative border
  drawBottomBorder(page);

  // Draw header and get starting Y position
  let yPos = drawHeader(page, fonts, nightType, scriptMeta, scaleConfig, showScriptName);

  // Draw each entry
  for (const entry of entries) {
    yPos = drawEntry(page, fonts, entry, imageMap, yPos, scaleConfig);
  }

  // Footer removed to match UI preview (WYSIWYG)
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate Night Order PDF using pdf-lib
 *
 * @param firstNight - First night state
 * @param otherNight - Other nights state
 * @param scriptMeta - Script metadata
 * @param options - Export options
 * @returns PDF document as Uint8Array
 */
export async function generateNightOrderPdf(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  options: NightOrderPdfOptions = {}
): Promise<Uint8Array> {
  const {
    includeFirstNight = true,
    includeOtherNight = true,
    showScriptName = true,
    onProgress,
    signal,
  } = options;

  const startTime = performance.now();
  logger.info('NightOrderPdfLib', 'Starting PDF generation');

  // Check for cancellation
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Phase: Initializing
  onProgress?.('initializing', 0, 1);

  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Phase: Loading fonts
  onProgress?.('loading-fonts', 0, 1);
  const fonts = await loadFonts(pdfDoc);
  onProgress?.('loading-fonts', 1, 1);

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Collect all entries for image loading
  const allEntries: NightOrderEntry[] = [];
  if (includeFirstNight) allEntries.push(...firstNight.entries);
  if (includeOtherNight) allEntries.push(...otherNight.entries);

  // Deduplicate entries by ID
  const uniqueEntries = Array.from(new Map(allEntries.map((e) => [e.id, e])).values());

  // Phase: Loading images
  onProgress?.('loading-images', 0, uniqueEntries.length);
  const imageMap = await loadCharacterImages(
    pdfDoc,
    uniqueEntries,
    (loaded, total) => onProgress?.('loading-images', loaded, total),
    signal
  );

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Phase: Rendering pages (parallel when both pages included)
  const renderFirstNight = async () => {
    if (!includeFirstNight || firstNight.entries.length === 0) return null;
    onProgress?.('rendering-first', 0, 1);
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    renderNightSheet(
      page,
      fonts,
      firstNight.entries,
      imageMap,
      'first',
      scriptMeta,
      showScriptName
    );
    onProgress?.('rendering-first', 1, 1);
    return page;
  };

  const renderOtherNight = async () => {
    if (!includeOtherNight || otherNight.entries.length === 0) return null;
    onProgress?.('rendering-other', 0, 1);
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    renderNightSheet(
      page,
      fonts,
      otherNight.entries,
      imageMap,
      'other',
      scriptMeta,
      showScriptName
    );
    onProgress?.('rendering-other', 1, 1);
    return page;
  };

  // Render pages (sequential for correct page order)
  await renderFirstNight();

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  await renderOtherNight();

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Phase: Saving
  onProgress?.('saving', 0, 1);
  const pdfBytes = await pdfDoc.save();
  onProgress?.('saving', 1, 1);

  const elapsed = performance.now() - startTime;
  logger.info('NightOrderPdfLib', `PDF generated in ${elapsed.toFixed(0)}ms`);

  return pdfBytes;
}

/**
 * Download Night Order PDF
 *
 * @param firstNight - First night state
 * @param otherNight - Other nights state
 * @param scriptMeta - Script metadata
 * @param filename - Output filename
 * @param options - Export options
 */
export async function downloadNightOrderPdf(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  filename: string = 'night-order.pdf',
  options: NightOrderPdfOptions = {}
): Promise<void> {
  const pdfBytes = await generateNightOrderPdf(firstNight, otherNight, scriptMeta, options);

  // Create blob and download (cast to ArrayBuffer for TypeScript compatibility)
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Get Night Order PDF as Blob
 *
 * @param firstNight - First night state
 * @param otherNight - Other nights state
 * @param scriptMeta - Script metadata
 * @param options - Export options
 * @returns PDF as Blob
 */
export async function getNightOrderPdfBlob(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  options: NightOrderPdfOptions = {}
): Promise<Blob> {
  const pdfBytes = await generateNightOrderPdf(firstNight, otherNight, scriptMeta, options);
  // Cast to ArrayBuffer for TypeScript compatibility
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
