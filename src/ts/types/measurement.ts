/**
 * Measurement System Types
 *
 * Defines types for the unified measurement system that supports
 * inches and millimeters with automatic DPI-based pixel conversion.
 */

/**
 * Supported measurement units for display
 * - inches: Primary unit for US users, matches physical token sizes
 * - millimeters: International standard, derived from inches (× 25.4)
 */
export type MeasurementUnit = 'inches' | 'millimeters';

/**
 * Configuration for a measurement input control
 * All bounds are stored in canonical inches for consistency
 */
export interface MeasurementConfig {
    /** Minimum value in inches */
    minInches: number;
    /** Maximum value in inches */
    maxInches: number;
    /** Step increment in inches */
    stepInches: number;
    /** Default value in inches */
    defaultInches: number;
    /** Label for the measurement (displayed in UI) */
    label: string;
    /** Aria label for accessibility */
    ariaLabel: string;
}

/**
 * Result of formatting a measurement for display
 */
export interface DisplayMeasurement {
    /** Numeric value in user's preferred unit */
    displayValue: number;
    /** Formatted string with unit suffix (e.g., "0.125"" or "3.18mm") */
    formatted: string;
    /** Unit suffix string (e.g., '"' or 'mm') */
    unitSuffix: string;
}

/**
 * Measurement settings stored in GenerationOptions
 */
export interface MeasurementSettings {
    /** User's preferred display unit */
    displayUnit: MeasurementUnit;
}
