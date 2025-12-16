/**
 * Night Order Layout Calculator
 *
 * Central calculation engine for dynamic scaling of night order sheets.
 * Ensures WYSIWYG (What You See Is What You Get) by using the same
 * scaling logic for both preview and PDF export.
 *
 * Key Principle: When entries exceed page capacity, scale fonts, icons,
 * and spacing proportionally to fit everything on one 8.5" × 11" page.
 */

import type { NightOrderEntry } from './nightOrderTypes.js'

// ============================================================================
// Constants - Page Dimensions
// ============================================================================

/** Standard letter page height in inches */
export const PAGE_HEIGHT = 11

/** Standard letter page width in inches */
export const PAGE_WIDTH = 8.5

/** Margin: top/bottom smaller, left/right minimal */
export const MARGIN = 0.25  // Top margin
export const MARGIN_SIDE = 0.15  // Left/right margins

/** Header height (title + script info + border) in inches - compact */
export const HEADER_HEIGHT = 0.4

/** Footer reserved space in inches (for safety margin) */
export const FOOTER_HEIGHT = 0.15

/** Calculate available content height */
export const AVAILABLE_HEIGHT = PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT - HEADER_HEIGHT

// ============================================================================
// Constants - Baseline Dimensions (at scale factor 1.0)
// ============================================================================

/** Baseline entry height at full scale - compact */
export const BASELINE_ENTRY_HEIGHT = 0.32

/** Baseline icon size at full scale */
export const BASELINE_ICON_SIZE = 0.32

/** Baseline character name font size (in points) */
export const BASELINE_NAME_FONT_SIZE = 11

/** Baseline ability text font size (in points) */
export const BASELINE_ABILITY_FONT_SIZE = 9

/** Baseline spacing between entries - minimal */
export const BASELINE_ENTRY_SPACING = 0.02

/** Baseline header font size multiplier */
export const BASELINE_HEADER_FONT = 1.5

// ============================================================================
// Constants - CSS/PDF Sync (WYSIWYG)
// These values match the CSS in NightOrderEntry.module.css
// ============================================================================

/** Gap between icon and text content (CSS: gap: 0.4rem = 6.4px = 0.067in) */
export const BASELINE_ICON_TEXT_GAP = 0.067  // inches

/** Vertical padding per entry (CSS: padding: 0.15rem = 2.4px = 0.025in) */
export const BASELINE_ENTRY_PADDING = 0.025  // inches

/** Line height ratio for ability text (CSS: line-height: 1.2) */
export const ABILITY_LINE_HEIGHT_RATIO = 1.2

// ============================================================================
// Constants - Scale Factor Limits
// ============================================================================

/** Minimum scale factor (below this, text becomes unreadable) */
export const MIN_SCALE_FACTOR = 0.6

/** Maximum scale factor (no scaling applied) */
export const MAX_SCALE_FACTOR = 1.0

// ============================================================================
// Types
// ============================================================================

/**
 * Scale configuration for a night order sheet
 * Contains all scaled dimensions for consistent rendering
 */
export interface ScaleConfig {
    /** Global scale multiplier (0.6 - 1.0) */
    scaleFactor: number

    /** Scaled entry height in inches */
    entryHeight: number

    /** Scaled icon size in inches */
    iconSize: number

    /** Scaled character name font size in points */
    nameFontSize: number

    /** Scaled ability text font size in points */
    abilityFontSize: number

    /** Scaled spacing between entries in inches */
    entrySpacing: number

    /** Scaled header font size (rem multiplier) */
    headerFontSize: number

    /** Warning flag: true if hit minimum scale threshold */
    isMinimumScale: boolean

    /** Total height needed at current scale */
    totalHeight: number

    /** Number of entries being scaled */
    entryCount: number
}

// ============================================================================
// Entry Height Estimation
// ============================================================================

/**
 * Estimate the height of a single entry in inches
 *
 * Takes into account:
 * - Base entry padding and spacing
 * - Ability text length (longer text wraps to multiple lines)
 * - Icon size
 *
 * @param entry - Night order entry to estimate
 * @param scaleFactor - Current scale factor (default 1.0)
 * @returns Estimated height in inches
 */
export function estimateEntryHeight(
    entry: NightOrderEntry,
    scaleFactor: number = 1.0
): number {
    // Base height at current scale
    let height = BASELINE_ENTRY_HEIGHT * scaleFactor

    // Adjust for long ability text (rough heuristic: ~60 chars per line at scale 1.0)
    const abilityLength = entry.ability.length
    const charsPerLine = Math.floor(60 / scaleFactor) // Fewer chars fit per line when scaled down
    const estimatedLines = Math.ceil(abilityLength / charsPerLine)

    // If ability text wraps to multiple lines, add extra height
    if (estimatedLines > 1) {
        const extraLines = estimatedLines - 1
        const lineHeight = (BASELINE_ABILITY_FONT_SIZE * 1.4) / 72 // Convert pt to inches (72 pt/inch)
        height += extraLines * lineHeight * scaleFactor
    }

    return height
}

/**
 * Calculate total height needed for all entries
 *
 * @param entries - Array of night order entries
 * @param scaleFactor - Current scale factor
 * @returns Total height in inches
 */
function calculateTotalHeight(
    entries: NightOrderEntry[],
    scaleFactor: number
): number {
    if (entries.length === 0) return 0

    // Sum up all entry heights
    const entriesHeight = entries.reduce((sum, entry) => {
        return sum + estimateEntryHeight(entry, scaleFactor)
    }, 0)

    // Add spacing between entries
    const spacingHeight = (entries.length - 1) * BASELINE_ENTRY_SPACING * scaleFactor

    return entriesHeight + spacingHeight
}

// ============================================================================
// Scale Calculation
// ============================================================================

/**
 * Calculate optimal scale configuration for a set of entries
 *
 * Algorithm:
 * 1. Start with baseline dimensions (scale = 1.0)
 * 2. Calculate total height needed
 * 3. If exceeds available height, calculate scale factor
 * 4. Clamp to min/max scale limits
 * 5. Return scaled dimensions
 *
 * @param entries - Night order entries to fit on page
 * @returns Scale configuration with all dimensions
 */
export function calculateScaleConfig(entries: NightOrderEntry[]): ScaleConfig {
    const entryCount = entries.length

    // Empty case: no scaling needed
    if (entryCount === 0) {
        return {
            scaleFactor: MAX_SCALE_FACTOR,
            entryHeight: BASELINE_ENTRY_HEIGHT,
            iconSize: BASELINE_ICON_SIZE,
            nameFontSize: BASELINE_NAME_FONT_SIZE,
            abilityFontSize: BASELINE_ABILITY_FONT_SIZE,
            entrySpacing: BASELINE_ENTRY_SPACING,
            headerFontSize: BASELINE_HEADER_FONT,
            isMinimumScale: false,
            totalHeight: 0,
            entryCount: 0,
        }
    }

    // Calculate height needed at full scale (1.0)
    const heightAtFullScale = calculateTotalHeight(entries, MAX_SCALE_FACTOR)

    // Determine required scale factor
    let scaleFactor = MAX_SCALE_FACTOR

    if (heightAtFullScale > AVAILABLE_HEIGHT) {
        // Need to scale down to fit
        scaleFactor = AVAILABLE_HEIGHT / heightAtFullScale

        // Clamp to minimum readable scale
        scaleFactor = Math.max(scaleFactor, MIN_SCALE_FACTOR)
    }

    // Calculate scaled dimensions
    const entryHeight = BASELINE_ENTRY_HEIGHT * scaleFactor
    const iconSize = BASELINE_ICON_SIZE * scaleFactor
    const nameFontSize = BASELINE_NAME_FONT_SIZE * scaleFactor
    const abilityFontSize = BASELINE_ABILITY_FONT_SIZE * scaleFactor
    const entrySpacing = BASELINE_ENTRY_SPACING * scaleFactor
    const headerFontSize = BASELINE_HEADER_FONT * scaleFactor

    // Calculate actual total height at this scale
    const totalHeight = calculateTotalHeight(entries, scaleFactor)

    // Check if we hit the minimum scale threshold
    const isMinimumScale = scaleFactor <= MIN_SCALE_FACTOR

    return {
        scaleFactor,
        entryHeight,
        iconSize,
        nameFontSize,
        abilityFontSize,
        entrySpacing,
        headerFontSize,
        isMinimumScale,
        totalHeight,
        entryCount,
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert points to inches (72 points = 1 inch)
 */
export function pointsToInches(points: number): number {
    return points / 72
}

/**
 * Convert inches to points (1 inch = 72 points)
 */
export function inchesToPoints(inches: number): number {
    return inches * 72
}

/**
 * Format scale factor as percentage for display
 *
 * @param scaleFactor - Scale factor (0.6 - 1.0)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatScalePercentage(scaleFactor: number): string {
    return `${Math.round(scaleFactor * 100)}%`
}

/**
 * Get a warning message if scaling is at minimum threshold
 *
 * @param config - Scale configuration
 * @returns Warning message or null
 */
export function getScaleWarning(config: ScaleConfig): string | null {
    if (config.isMinimumScale) {
        return `⚠️ ${config.entryCount} entries scaled to minimum size (${formatScalePercentage(config.scaleFactor)}). Consider splitting into multiple scripts for better readability.`
    }
    return null
}
