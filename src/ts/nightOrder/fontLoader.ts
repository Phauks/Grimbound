/**
 * Night Order Font Loader
 *
 * Loads and caches custom fonts for PDF generation using pdf-lib + fontkit.
 * Supports TTF and OTF fonts natively.
 *
 * Fonts used:
 * - Dumbledor: Title headers ("First Night", "Other Nights")
 * - Goudy Old Style: Character names
 * - TradeGothic: Ability text
 * - TradeGothic Bold: Bold reminder tokens
 */

import fontkit from '@pdf-lib/fontkit'
import type { PDFDocument, PDFFont } from 'pdf-lib'
import { logger } from '../utils/logger.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Set of embedded fonts for night order PDF
 */
export interface FontSet {
    /** Dumbledor - for title headers */
    title: PDFFont
    /** Goudy Old Style - for character names */
    name: PDFFont
    /** TradeGothic - for ability text */
    ability: PDFFont
    /** TradeGothic Bold - for bold reminder tokens */
    abilityBold: PDFFont
}

/**
 * Font configuration for loading
 */
interface FontConfig {
    key: keyof FontSet
    path: string
    fallbackPath?: string
}

// ============================================================================
// Font Paths
// ============================================================================

const FONT_CONFIGS: FontConfig[] = [
    {
        key: 'title',
        path: '/assets/fonts/Dumbledor/Dumbledor.ttf',
    },
    {
        key: 'name',
        path: '/assets/fonts/GoudyOldStyle/GoudyOldStyle.ttf',
    },
    {
        key: 'ability',
        path: '/assets/fonts/TradeGothic/TradeGothic.otf',
    },
    {
        key: 'abilityBold',
        path: '/assets/fonts/TradeGothic/TradeGothicBold.otf',
    },
]

// ============================================================================
// Caches
// ============================================================================

/**
 * Cache for font file bytes (ArrayBuffer)
 * Persists across PDF documents to avoid re-fetching
 */
const fontBytesCache = new Map<string, ArrayBuffer>()

/**
 * Cache for embedded fonts per PDF document
 * Uses WeakMap so fonts are garbage collected when document is released
 */
const embeddedFontsCache = new WeakMap<PDFDocument, Map<string, PDFFont>>()

/**
 * Flag to track if fontkit has been registered on a document
 */
const fontkitRegistered = new WeakSet<PDFDocument>()

// ============================================================================
// Font Loading Functions
// ============================================================================

/**
 * Fetch and cache font bytes from a URL
 *
 * @param path - Font file path
 * @returns Font bytes as ArrayBuffer
 */
async function fetchFontBytes(path: string): Promise<ArrayBuffer> {
    // Check cache first
    const cached = fontBytesCache.get(path)
    if (cached) {
        logger.debug('FontLoader', `Using cached font: ${path}`)
        return cached
    }

    logger.debug('FontLoader', `Fetching font: ${path}`)

    const response = await fetch(path)
    if (!response.ok) {
        throw new Error(`Failed to fetch font: ${path} (${response.status})`)
    }

    const bytes = await response.arrayBuffer()
    fontBytesCache.set(path, bytes)

    return bytes
}

/**
 * Register fontkit on a PDF document (only once)
 *
 * @param pdfDoc - PDF document to register fontkit on
 */
function registerFontkit(pdfDoc: PDFDocument): void {
    if (!fontkitRegistered.has(pdfDoc)) {
        pdfDoc.registerFontkit(fontkit)
        fontkitRegistered.add(pdfDoc)
        logger.debug('FontLoader', 'Registered fontkit on PDF document')
    }
}

/**
 * Load and embed all custom fonts into a PDF document
 *
 * Fonts are cached at two levels:
 * 1. Font bytes (ArrayBuffer) - cached globally, fetched once per session
 * 2. Embedded fonts - cached per PDF document
 *
 * @param pdfDoc - PDF document to embed fonts into
 * @returns FontSet with all embedded fonts
 * @throws Error if any font fails to load (will log warning and use fallback)
 */
export async function loadFonts(pdfDoc: PDFDocument): Promise<FontSet> {
    // Register fontkit for OTF support
    registerFontkit(pdfDoc)

    // Check if fonts are already embedded in this document
    let embeddedMap = embeddedFontsCache.get(pdfDoc)
    if (embeddedMap?.size === FONT_CONFIGS.length) {
        logger.debug('FontLoader', 'Using cached embedded fonts')
        return {
            title: embeddedMap.get('title')!,
            name: embeddedMap.get('name')!,
            ability: embeddedMap.get('ability')!,
            abilityBold: embeddedMap.get('abilityBold')!,
        }
    }

    // Create new map for embedded fonts
    embeddedMap = new Map()

    // Load and embed each font
    const startTime = performance.now()

    for (const config of FONT_CONFIGS) {
        try {
            const bytes = await fetchFontBytes(config.path)
            const font = await pdfDoc.embedFont(bytes)
            embeddedMap.set(config.key, font)
            logger.debug('FontLoader', `Embedded font: ${config.key}`)
        } catch (error) {
            logger.error('FontLoader', `Failed to load font ${config.key} from ${config.path}`, error)

            // Try fallback path if available
            if (config.fallbackPath) {
                try {
                    const bytes = await fetchFontBytes(config.fallbackPath)
                    const font = await pdfDoc.embedFont(bytes)
                    embeddedMap.set(config.key, font)
                    logger.warn('FontLoader', `Used fallback font for ${config.key}`)
                } catch (fallbackError) {
                    throw new Error(`Failed to load font ${config.key}: ${error}`)
                }
            } else {
                throw new Error(`Failed to load font ${config.key}: ${error}`)
            }
        }
    }

    // Cache the embedded fonts for this document
    embeddedFontsCache.set(pdfDoc, embeddedMap)

    const elapsed = performance.now() - startTime
    logger.info('FontLoader', `Loaded ${FONT_CONFIGS.length} fonts in ${elapsed.toFixed(0)}ms`)

    return {
        title: embeddedMap.get('title')!,
        name: embeddedMap.get('name')!,
        ability: embeddedMap.get('ability')!,
        abilityBold: embeddedMap.get('abilityBold')!,
    }
}

/**
 * Preload font bytes into cache (call during app initialization)
 * This allows fonts to be loaded in the background before PDF export
 *
 * @returns Promise that resolves when all fonts are cached
 */
export async function preloadFonts(): Promise<void> {
    logger.info('FontLoader', 'Preloading fonts...')
    const startTime = performance.now()

    await Promise.all(
        FONT_CONFIGS.map(async (config) => {
            try {
                await fetchFontBytes(config.path)
            } catch (error) {
                logger.warn('FontLoader', `Failed to preload font: ${config.path}`, error)
            }
        })
    )

    const elapsed = performance.now() - startTime
    logger.info('FontLoader', `Preloaded fonts in ${elapsed.toFixed(0)}ms`)
}

/**
 * Clear all cached fonts (useful for testing or memory management)
 */
export function clearFontCache(): void {
    fontBytesCache.clear()
    logger.debug('FontLoader', 'Cleared font cache')
}

/**
 * Get the number of cached font files
 */
export function getCachedFontCount(): number {
    return fontBytesCache.size
}
