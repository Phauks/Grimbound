/**
 * Measurement Utilities
 *
 * Single Source of Truth (SSOT) for all unit conversions in the application.
 * Internal canonical unit: INCHES
 *
 * Design rationale:
 * - Token physical sizes are defined in inches (1.75" character, 1.0" reminder)
 * - Formula: inches × DPI = pixels (clean and intuitive)
 * - Millimeters derived via: inches × 25.4
 */

import type { MeasurementUnit, MeasurementConfig, DisplayMeasurement } from '../types/measurement.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Millimeters per inch (exact conversion factor) */
export const MM_PER_INCH = 25.4;

/** Default step sizes for common UI inputs (all in inches) */
export const STEP_SIZES = {
    /** Fine adjustment: 1/100 inch = 0.254mm */
    FINE: 0.01,
    /** Medium adjustment: 1/32 inch = ~0.79mm */
    MEDIUM: 0.03125,
    /** Coarse adjustment: 1/16 inch = 1.59mm */
    COARSE: 0.0625,
} as const;

/** Decimal places for display formatting by unit */
export const DECIMAL_PLACES: Record<MeasurementUnit, number> = {
    inches: 3,       // e.g., 0.125"
    millimeters: 2,  // e.g., 3.18mm
};

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert inches to millimeters
 * @param inches - Value in inches
 * @returns Value in millimeters
 */
export function inchesToMm(inches: number): number {
    return inches * MM_PER_INCH;
}

/**
 * Convert millimeters to inches
 * @param mm - Value in millimeters
 * @returns Value in inches
 */
export function mmToInches(mm: number): number {
    return mm / MM_PER_INCH;
}

/**
 * Convert inches to pixels at a given DPI
 * @param inches - Value in inches
 * @param dpi - Dots per inch (resolution)
 * @returns Value in pixels
 */
export function inchesToPixels(inches: number, dpi: number): number {
    return inches * dpi;
}

/**
 * Convert pixels to inches at a given DPI
 * @param pixels - Value in pixels
 * @param dpi - Dots per inch (resolution)
 * @returns Value in inches
 */
export function pixelsToInches(pixels: number, dpi: number): number {
    return pixels / dpi;
}

/**
 * Convert a value from user's display unit to canonical inches
 * @param value - Value in the source unit
 * @param fromUnit - Source unit type
 * @returns Value in inches
 */
export function toCanonicalInches(value: number, fromUnit: MeasurementUnit): number {
    switch (fromUnit) {
        case 'inches':
            return value;
        case 'millimeters':
            return mmToInches(value);
        default:
            return value;
    }
}

/**
 * Convert canonical inches to user's display unit
 * @param inches - Value in inches
 * @param toUnit - Target unit type
 * @returns Value in target unit
 */
export function fromCanonicalInches(inches: number, toUnit: MeasurementUnit): number {
    switch (toUnit) {
        case 'inches':
            return inches;
        case 'millimeters':
            return inchesToMm(inches);
        default:
            return inches;
    }
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Get the unit suffix string for display
 * @param unit - Measurement unit
 * @returns Unit suffix (e.g., '"' for inches, 'mm' for millimeters)
 */
export function getUnitSuffix(unit: MeasurementUnit): string {
    switch (unit) {
        case 'inches':
            return '"';
        case 'millimeters':
            return 'mm';
        default:
            return '';
    }
}

/**
 * Format a measurement value for display
 * @param canonicalInches - Value in canonical inches
 * @param displayUnit - Target display unit
 * @returns Formatted display measurement object
 */
export function formatMeasurement(
    canonicalInches: number,
    displayUnit: MeasurementUnit
): DisplayMeasurement {
    const displayValue = fromCanonicalInches(canonicalInches, displayUnit);
    const decimals = DECIMAL_PLACES[displayUnit];
    const unitSuffix = getUnitSuffix(displayUnit);
    const roundedValue = Number(displayValue.toFixed(decimals));

    return {
        displayValue: roundedValue,
        formatted: `${displayValue.toFixed(decimals)}${unitSuffix}`,
        unitSuffix,
    };
}

/**
 * Round a value to the nearest step increment
 * @param value - Value to round
 * @param step - Step increment
 * @returns Rounded value
 */
export function roundToStep(value: number, step: number): number {
    return Math.round(value / step) * step;
}

/**
 * Convert MeasurementConfig bounds to display unit values
 * @param config - Measurement configuration (in inches)
 * @param displayUnit - Target display unit
 * @returns Config values converted to display unit
 */
export function convertConfigToDisplayUnit(
    config: MeasurementConfig,
    displayUnit: MeasurementUnit
): {
    min: number;
    max: number;
    step: number;
    defaultValue: number;
} {
    return {
        min: Number(fromCanonicalInches(config.minInches, displayUnit).toFixed(DECIMAL_PLACES[displayUnit])),
        max: Number(fromCanonicalInches(config.maxInches, displayUnit).toFixed(DECIMAL_PLACES[displayUnit])),
        step: Number(fromCanonicalInches(config.stepInches, displayUnit).toFixed(DECIMAL_PLACES[displayUnit])),
        defaultValue: Number(fromCanonicalInches(config.defaultInches, displayUnit).toFixed(DECIMAL_PLACES[displayUnit])),
    };
}

// ============================================================================
// MEASUREMENT CONFIGURATIONS (Presets for common UI controls)
// ============================================================================

/**
 * Configuration for icon offset controls
 * Range: ±0.5" (±12.7mm) in 0.01" (0.254mm) steps
 * Provides fine-grained control for positioning character/reminder/meta icons
 */
export const ICON_OFFSET_CONFIG: MeasurementConfig = {
    minInches: -0.5,
    maxInches: 0.5,
    stepInches: STEP_SIZES.FINE,
    defaultInches: 0,
    label: 'Icon Offset',
    ariaLabel: 'Icon Position Offset',
};

/**
 * Configuration for PDF alignment offset controls
 * Range: ±0.5" in 1/16" (0.0625") steps
 * Used for fine-tuning printer alignment
 */
export const PDF_OFFSET_CONFIG: MeasurementConfig = {
    minInches: -0.5,
    maxInches: 0.5,
    stepInches: STEP_SIZES.COARSE,
    defaultInches: 0,
    label: 'PDF Offset',
    ariaLabel: 'PDF Alignment Offset',
};

/**
 * Configuration for print bleed controls
 * Range: 0" to 0.125" (1/8") in 1/32" steps
 * Extends edge colors outward for clean cutting
 */
export const BLEED_CONFIG: MeasurementConfig = {
    minInches: 0,
    maxInches: 0.125,
    stepInches: STEP_SIZES.MEDIUM,
    defaultInches: 0.125,
    label: 'Print Bleed',
    ariaLabel: 'Print Bleed Margin',
};
