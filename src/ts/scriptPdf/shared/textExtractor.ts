/**
 * Text Extractor for Script PDF Rendering
 *
 * Extracts text positions from the rendered DOM for hybrid PDF rendering.
 * This allows us to capture the visual layout with Snapdom (fast, no font embedding)
 * and then overlay text using pdf-lib with properly embedded fonts.
 *
 * Used by both Night Order and Player Script renderers.
 */

import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a piece of extracted text with its position and styling
 */
export interface ExtractedText {
  /** The text content */
  text: string;
  /** X position relative to container (in pixels at UI scale) */
  x: number;
  /** Y position relative to container (in pixels at UI scale) */
  y: number;
  /** Width of the text element */
  width: number;
  /** Height of the text element */
  height: number;
  /** Font family */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight (normal, bold, 600, 700, etc.) */
  fontWeight: string;
  /** Text color as CSS color string */
  color: string;
  /** Text type for semantic grouping */
  type:
    | 'title'
    | 'scriptName'
    | 'characterName'
    | 'ability'
    | 'reminderToken'
    | 'reminderCircle'
    | 'other';
  /** Line height ratio */
  lineHeight: number;
}

/**
 * Result of text extraction
 */
export interface TextExtractionResult {
  /** All extracted text elements */
  texts: ExtractedText[];
  /** Container dimensions */
  containerWidth: number;
  containerHeight: number;
  /** Extraction timing */
  extractionTimeMs: number;
}

// ============================================================================
// Font Family Mapping
// ============================================================================

/**
 * Maps CSS font-family values to our known fonts
 */
function normalizeFontFamily(fontFamily: string): string {
  const lower = fontFamily.toLowerCase();

  if (lower.includes('dumbledor')) {
    return 'Dumbledor';
  }
  if (lower.includes('goudy')) {
    return 'GoudyOldStyle';
  }
  if (lower.includes('tradegothicbold')) {
    return 'TradeGothicBold';
  }
  if (lower.includes('tradegothic')) {
    return 'TradeGothic';
  }

  // Fallback
  return 'TradeGothic';
}

/**
 * Normalize Unicode ligatures to their component characters.
 *
 * Some fonts render character combinations like "fi" as single ligature glyphs.
 * These are represented as special Unicode codepoints that pdf-lib fonts may not support.
 * We normalize them back to separate characters for reliable PDF rendering.
 */
function normalizeLigatures(text: string): string {
  return text
    .replace(/\uFB00/g, 'ff') // ﬀ → ff
    .replace(/\uFB01/g, 'fi') // ﬁ → fi
    .replace(/\uFB02/g, 'fl') // ﬂ → fl
    .replace(/\uFB03/g, 'ffi') // ﬃ → ffi
    .replace(/\uFB04/g, 'ffl') // ﬄ → ffl
    .replace(/\uFB05/g, 'st') // ﬅ → st (long s + t)
    .replace(/\uFB06/g, 'st'); // ﬆ → st
}

/**
 * Determine text type based on element classes and context
 */
function determineTextType(element: Element): ExtractedText['type'] {
  const classList = element.classList;
  const parentClassList = element.parentElement?.classList;

  // Check for title
  if (classList.contains('title') || element.tagName === 'H2') {
    return 'title';
  }

  // Check for script name
  if (classList.contains('scriptName')) {
    return 'scriptName';
  }

  // Check for character name
  if (classList.contains('name') || parentClassList?.contains('name')) {
    return 'characterName';
  }

  // Check for reminder token (bold ability text)
  if (element.tagName === 'STRONG' || classList.contains('reminderToken')) {
    return 'reminderToken';
  }

  // Check for ability text
  if (
    classList.contains('ability') ||
    classList.contains('abilityText') ||
    parentClassList?.contains('ability')
  ) {
    return 'ability';
  }

  return 'other';
}

// ============================================================================
// Text Extraction
// ============================================================================

/**
 * Get all text nodes within an element
 */
function getTextNodes(element: Element): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let node = walker.nextNode() as Text | null;
  while (node) {
    // Skip empty or whitespace-only text nodes
    if (node.textContent?.trim()) {
      textNodes.push(node);
    }
    node = walker.nextNode() as Text | null;
  }

  return textNodes;
}

/**
 * Find line break positions using word boundaries.
 * This avoids ligature issues by probing at word boundaries instead of characters.
 */
function findLineBreaks(textNode: Text, fontSize: number): number[] {
  const text = textNode.textContent || '';
  if (!text) return [];

  const range = document.createRange();
  const breaks: number[] = [];

  // Find all word boundary positions (spaces, punctuation)
  const boundaryPositions = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' || text[i] === '\n' || text[i] === '\t') {
      boundaryPositions.push(i + 1); // Position after the space
    }
  }
  boundaryPositions.push(text.length);

  // Check Y position at each word boundary
  let lastY: number | null = null;

  for (const pos of boundaryPositions) {
    if (pos >= text.length) continue;

    // Find next non-space character to get accurate Y
    let checkPos = pos;
    while (checkPos < text.length && text[checkPos] === ' ') {
      checkPos++;
    }
    if (checkPos >= text.length) continue;

    range.setStart(textNode, checkPos);
    range.setEnd(textNode, Math.min(checkPos + 1, text.length));

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    const currentY = Math.round(rect.top);

    if (lastY !== null && Math.abs(currentY - lastY) > fontSize * 0.5) {
      // Line break detected - find the actual break point
      breaks.push(pos);
    }
    lastY = currentY;
  }

  return breaks;
}

/**
 * Extract text from a single text node
 * Returns an array because wrapped text may span multiple lines
 *
 * Uses word-boundary probing to find line breaks, avoiding ligature issues.
 *
 * IMPORTANT: We preserve leading/trailing spaces in text content because
 * inline elements (span, strong) may have spaces that separate words.
 * E.g., "Show the **BOLD** token" has spaces around BOLD that must be kept.
 */
function extractTextFromNode(textNode: Text, containerRect: DOMRect): ExtractedText[] {
  const parent = textNode.parentElement;
  if (!parent) return [];

  // Get text content and normalize ligatures for PDF compatibility
  const rawText = textNode.textContent || '';
  const fullText = normalizeLigatures(rawText);
  // Skip whitespace-only nodes, but preserve spaces in actual content
  if (!fullText.trim()) return [];

  // Get computed styles from parent element
  const computedStyle = window.getComputedStyle(parent);

  // Parse font size
  const fontSizeStr = computedStyle.fontSize;
  const fontSize = Number.parseFloat(fontSizeStr) || 16;

  // Parse line height
  const lineHeightStr = computedStyle.lineHeight;
  let lineHeight = 1.2;
  if (lineHeightStr !== 'normal') {
    const parsedLh = Number.parseFloat(lineHeightStr);
    if (!Number.isNaN(parsedLh)) {
      lineHeight = lineHeightStr.includes('px') ? parsedLh / fontSize : parsedLh;
    }
  }

  const textType = determineTextType(parent);
  const fontFamily = normalizeFontFamily(computedStyle.fontFamily);
  const fontWeight = computedStyle.fontWeight;
  const color = computedStyle.color;

  // Get the overall bounding rect
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rects = range.getClientRects();

  if (rects.length === 0) {
    return [];
  }

  // Single line - simple case
  // Preserve original text with spaces (don't trim)
  if (rects.length === 1) {
    const rect = rects[0];
    if (rect.width === 0 || rect.height === 0) {
      return [];
    }
    return [
      {
        text: fullText,
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
        fontFamily,
        fontSize,
        fontWeight,
        color,
        type: textType,
        lineHeight,
      },
    ];
  }

  // Multiple lines - find break points using word boundaries
  const breaks = findLineBreaks(textNode, fontSize);

  // Split text at break points, preserving spaces within each line
  // Only trim trailing spaces at line breaks (leading space of next line is preserved)
  const lineTexts: string[] = [];
  let start = 0;
  for (const breakPos of breaks) {
    lineTexts.push(fullText.substring(start, breakPos).trimEnd());
    start = breakPos;
  }
  // Last segment: trim end but preserve leading space
  lineTexts.push(fullText.substring(start).trimEnd());

  // Match line texts to rects
  const results: ExtractedText[] = [];
  const validRects = Array.from(rects).filter((r) => r.width > 0 && r.height > 0);

  for (let i = 0; i < Math.min(lineTexts.length, validRects.length); i++) {
    const lineText = lineTexts[i];
    // Skip empty lines but allow lines with just spaces (they might be intentional)
    if (lineText === '') continue;

    const rect = validRects[i];
    results.push({
      text: lineText,
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      fontFamily,
      fontSize,
      fontWeight,
      color,
      type: textType,
      lineHeight,
    });
  }

  // If we have more text lines than rects, append remaining to last line
  if (lineTexts.length > validRects.length && results.length > 0) {
    const lastResult = results[results.length - 1];
    const remainingTexts = lineTexts.slice(validRects.length).filter((t) => t !== '');
    if (remainingTexts.length > 0) {
      lastResult.text += ` ${remainingTexts.join(' ')}`;
    }
  }

  return results;
}

/**
 * Extract all text from a script container
 *
 * @param container - The container element to extract text from
 * @returns Extraction result with all text positions
 */
export function extractTextFromContainer(container: HTMLElement): TextExtractionResult {
  const startTime = performance.now();
  const texts: ExtractedText[] = [];

  const containerRect = container.getBoundingClientRect();

  // Find all text-containing elements
  const textNodes = getTextNodes(container);

  for (const textNode of textNodes) {
    const extracted = extractTextFromNode(textNode, containerRect);
    texts.push(...extracted);
  }

  const extractionTimeMs = performance.now() - startTime;

  logger.debug('TextExtractor', `Extracted ${texts.length} text elements`, {
    extractionTimeMs: extractionTimeMs.toFixed(1),
    byType: {
      title: texts.filter((t) => t.type === 'title').length,
      characterName: texts.filter((t) => t.type === 'characterName').length,
      ability: texts.filter((t) => t.type === 'ability').length,
      reminderToken: texts.filter((t) => t.type === 'reminderToken').length,
    },
  });

  return {
    texts,
    containerWidth: containerRect.width,
    containerHeight: containerRect.height,
    extractionTimeMs,
  };
}

/**
 * Scale extracted text positions for PDF output
 *
 * @param result - Original extraction result at UI scale
 * @param targetWidth - Target PDF width in points
 * @param targetHeight - Target PDF height in points
 * @returns Scaled extraction result
 */
export function scaleTextPositions(
  result: TextExtractionResult,
  targetWidth: number,
  targetHeight: number
): TextExtractionResult {
  const scaleX = targetWidth / result.containerWidth;
  const scaleY = targetHeight / result.containerHeight;

  // Use uniform scale to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);

  const scaledTexts = result.texts.map((text) => ({
    ...text,
    x: text.x * scale,
    y: text.y * scale,
    width: text.width * scale,
    height: text.height * scale,
    fontSize: text.fontSize * scale,
  }));

  return {
    texts: scaledTexts,
    containerWidth: targetWidth,
    containerHeight: targetHeight,
    extractionTimeMs: result.extractionTimeMs,
  };
}
