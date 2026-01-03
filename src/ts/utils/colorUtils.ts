/**
 * Blood on the Clocktower Token Generator
 * Color Utility Functions
 */

import type { RGB } from '@/ts/types/index.js';

/**
 * Convert hex color to RGB object
 * Supports both 3-character (#RGB) and 6-character (#RRGGBB) hex formats
 * @param hex - Hex color string (e.g., '#FFF', '#FFFFFF', 'ABC', 'AABBCC')
 * @returns RGB object with r, g, b properties, or null if invalid
 */
export function hexToRgb(hex: string): RGB | null {
  // Try 6-character hex first
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  // Try 3-character hex (expand each digit: F -> FF)
  result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1] + result[1], 16),
      g: parseInt(result[2] + result[2], 16),
      b: parseInt(result[3] + result[3], 16),
    };
  }

  return null;
}

/**
 * Get contrast color (black or white) for given background
 * @param hexColor - Background hex color
 * @returns '#000000' or '#FFFFFF'
 */
export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Parse hex color to RGB with guaranteed result
 * Falls back to black if parsing fails
 *
 * @param hex - Hex color string (e.g., '#FF5500' or '#F50')
 * @returns RGB object (never null)
 */
export function parseHexColor(hex: string): RGB {
  const result = hexToRgb(hex);
  return result ?? { r: 0, g: 0, b: 0 };
}

// ============================================================================
// HSL CONVERSIONS
// ============================================================================

/**
 * Convert RGB to HSL color space
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Tuple of [hue (0-360), saturation (0-1), lightness (0-1)]
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        // max is always one of r, g, or b
        break;
    }
  }

  return [h * 360, s, l];
}

/**
 * Convert HSL to RGB color space
 *
 * @param h - Hue (0-360)
 * @param s - Saturation (0-1)
 * @param l - Lightness (0-1)
 * @returns Tuple of [red (0-255), green (0-255), blue (0-255)]
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Interpolate between two hex colors
 *
 * @param color1 - First color (hex)
 * @param color2 - Second color (hex)
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated color (hex)
 */
export function interpolateColors(color1: string, color2: string, t: number): string {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate a random hex color
 *
 * @returns Random hex color string (e.g., '#A3F2C1')
 */
export function randomHexColor(): string {
  return `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, '0')}`;
}

// ============================================================================
// HSV CONVERSIONS
// ============================================================================

/** HSV color representation */
export interface HSV {
  /** Hue (0-360) */
  h: number;
  /** Saturation (0-100) */
  s: number;
  /** Value/Brightness (0-100) */
  v: number;
}

/**
 * Convert RGB values to hex color string
 *
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Uppercase hex color string (e.g., '#FF5500')
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(x)));
    const hex = clamped.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert hex color to HSV values
 *
 * @param hex - Hex color string (e.g., '#FF5500')
 * @returns HSV object with h (0-360), s (0-100), v (0-100)
 */
export function hexToHsv(hex: string): HSV {
  const rgb = parseHexColor(hex);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
}

/**
 * Convert HSV values to hex color string
 *
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param v - Value/Brightness (0-100)
 * @returns Uppercase hex color string (e.g., '#FF5500')
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const hue = h / 360;
  const sat = s / 100;
  const val = v / 100;

  let r: number;
  let g: number;
  let b: number;

  const i = Math.floor(hue * 6);
  const f = hue * 6 - i;
  const p = val * (1 - sat);
  const q = val * (1 - f * sat);
  const t = val * (1 - (1 - f) * sat);

  switch (i % 6) {
    case 0:
      r = val;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = val;
      b = p;
      break;
    case 2:
      r = p;
      g = val;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = val;
      break;
    case 4:
      r = t;
      g = p;
      b = val;
      break;
    default:
      r = val;
      g = p;
      b = q;
      break;
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// ============================================================================
// COLOR ANALYSIS
// ============================================================================

/**
 * Determine if a color is light or dark based on luminance
 *
 * @param hex - Hex color string
 * @returns true if the color is light (luminance > 0.5)
 */
export function isLightColor(hex: string): boolean {
  const rgb = parseHexColor(hex);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Get a human-readable color name from a hex value
 * Returns a common name if recognized, or 'Custom' for unknown colors
 *
 * @param hex - Hex color string
 * @returns Human-readable color name
 */
export function getColorName(hex: string): string {
  const normalized = hex.toUpperCase();
  const commonNames: Record<string, string> = {
    '#FFFFFF': 'White',
    '#000000': 'Black',
    '#FF0000': 'Red',
    '#00FF00': 'Lime',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
    '#808080': 'Gray',
    '#C0C0C0': 'Silver',
    '#800000': 'Maroon',
    '#008000': 'Green',
    '#000080': 'Navy',
    '#808000': 'Olive',
    '#800080': 'Purple',
    '#008080': 'Teal',
    '#FFA500': 'Orange',
    '#FFC0CB': 'Pink',
    '#A52A2A': 'Brown',
  };

  return commonNames[normalized] || 'Custom';
}

// ============================================================================
// THEME DERIVATION UTILITIES
// ============================================================================

/**
 * Lighten a hex color by a given amount
 *
 * @param hex - Hex color string (e.g., '#FF5500')
 * @param amount - Amount to lighten (0-1, where 1 is white)
 * @returns Lightened hex color
 */
export function lighten(hex: string, amount: number): string {
  const rgb = parseHexColor(hex);
  const clampedAmount = Math.max(0, Math.min(1, amount));

  const r = Math.round(rgb.r + (255 - rgb.r) * clampedAmount);
  const g = Math.round(rgb.g + (255 - rgb.g) * clampedAmount);
  const b = Math.round(rgb.b + (255 - rgb.b) * clampedAmount);

  return rgbToHex(r, g, b);
}

/**
 * Darken a hex color by a given amount
 *
 * @param hex - Hex color string (e.g., '#FF5500')
 * @param amount - Amount to darken (0-1, where 1 is black)
 * @returns Darkened hex color
 */
export function darken(hex: string, amount: number): string {
  const rgb = parseHexColor(hex);
  const clampedAmount = Math.max(0, Math.min(1, amount));

  const r = Math.round(rgb.r * (1 - clampedAmount));
  const g = Math.round(rgb.g * (1 - clampedAmount));
  const b = Math.round(rgb.b * (1 - clampedAmount));

  return rgbToHex(r, g, b);
}

/**
 * Adjust saturation of a color
 *
 * @param hex - Hex color string
 * @param amount - Saturation adjustment (-1 to 1, negative desaturates)
 * @returns Adjusted hex color
 */
export function adjustSaturation(hex: string, amount: number): string {
  const hsv = hexToHsv(hex);
  const newSat = Math.max(0, Math.min(100, hsv.s + amount * 100));
  return hsvToHex(hsv.h, newSat, hsv.v);
}

/**
 * Shift hue of a color
 *
 * @param hex - Hex color string
 * @param degrees - Degrees to shift hue (can be negative)
 * @returns Color with shifted hue
 */
export function shiftHue(hex: string, degrees: number): string {
  const hsv = hexToHsv(hex);
  let newHue = (hsv.h + degrees) % 360;
  if (newHue < 0) newHue += 360;
  return hsvToHex(newHue, hsv.s, hsv.v);
}

/**
 * Get appropriate text color for a background (with accessibility check)
 *
 * @param bgColor - Background hex color
 * @param preferredLight - Preferred light text color (default white)
 * @param preferredDark - Preferred dark text color (default near-black)
 * @returns Appropriate text color for readability
 */
export function deriveTextColor(
  bgColor: string,
  preferredLight = '#F5F5F5',
  preferredDark = '#1A1A1A'
): string {
  return isLightColor(bgColor) ? preferredDark : preferredLight;
}

/**
 * Derive CodeMirror JSON syntax colors from an accent color
 * Generates harmonious colors for JSON keys, strings, numbers, etc.
 *
 * @param accent - Accent hex color to base syntax colors on
 * @param isDark - Whether the theme is dark mode
 * @returns Object with CodeMirror syntax color variables
 */
export function deriveSyntaxColors(accent: string, isDark: boolean): Record<string, string> {
  const hsv = hexToHsv(accent);

  if (isDark) {
    // Dark mode: Bright, saturated colors
    return {
      '--cm-json-key': hsvToHex((hsv.h + 180) % 360, Math.min(hsv.s, 60), 85), // Complementary, lighter
      '--cm-json-string': hsvToHex((hsv.h + 30) % 360, Math.min(hsv.s, 70), 75), // Analogous warm
      '--cm-json-number': hsvToHex((hsv.h + 90) % 360, Math.min(hsv.s, 50), 80), // Triadic
      '--cm-json-boolean': hsvToHex((hsv.h + 240) % 360, Math.min(hsv.s, 55), 75), // Split complementary
      '--cm-json-null': hsvToHex(hsv.h, Math.min(hsv.s, 45), 70), // Same hue, muted
    };
  }
  // Light mode: Darker, less saturated for readability
  return {
    '--cm-json-key': hsvToHex((hsv.h + 180) % 360, Math.min(hsv.s, 70), 45),
    '--cm-json-string': hsvToHex((hsv.h + 30) % 360, Math.min(hsv.s, 80), 40),
    '--cm-json-number': hsvToHex((hsv.h + 90) % 360, Math.min(hsv.s, 60), 50),
    '--cm-json-boolean': hsvToHex((hsv.h + 240) % 360, Math.min(hsv.s, 65), 45),
    '--cm-json-null': hsvToHex(hsv.h, Math.min(hsv.s, 55), 50),
  };
}

/** Background shade configuration for theme derivation */
export interface BackgroundShades {
  '--bg-main': string;
  '--bg-primary': string;
  '--bg-panel': string;
  '--bg-card': string;
  '--bg-input': string;
  '--bg-hover': string;
  '--bg-tertiary': string;
  '--bg-secondary': string;
  '--color-background': string;
}

/**
 * Derive all background shade variations from a base color
 *
 * @param baseColor - Base background hex color
 * @param isDark - Whether generating for dark mode
 * @returns Object with all background CSS variables
 */
export function deriveBackgroundShades(baseColor: string, isDark: boolean): BackgroundShades {
  if (isDark) {
    // Dark mode: progressively lighter shades
    return {
      '--bg-main': baseColor,
      '--bg-primary': baseColor,
      '--bg-panel': lighten(baseColor, 0.04),
      '--bg-card': lighten(baseColor, 0.08),
      '--bg-input': lighten(baseColor, 0.12),
      '--bg-hover': lighten(baseColor, 0.16),
      '--bg-tertiary': lighten(baseColor, 0.06),
      '--bg-secondary': lighten(baseColor, 0.03),
      '--color-background': baseColor,
    };
  }
  // Light mode: progressively darker shades
  return {
    '--bg-main': baseColor,
    '--bg-primary': baseColor,
    '--bg-panel': darken(baseColor, 0.02),
    '--bg-card': darken(baseColor, 0.04),
    '--bg-input': lighten(baseColor, 0.02), // Input lighter for contrast
    '--bg-hover': darken(baseColor, 0.06),
    '--bg-tertiary': darken(baseColor, 0.03),
    '--bg-secondary': darken(baseColor, 0.01),
    '--color-background': baseColor,
  };
}

/** Text color configuration for theme derivation */
export interface TextColors {
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--text-disabled': string;
}

/**
 * Derive text color variations based on background
 *
 * @param bgColor - Background hex color
 * @param isDark - Whether the theme is dark mode
 * @returns Object with text CSS variables
 */
export function deriveTextColors(bgColor: string, isDark: boolean): TextColors {
  // Derive text colors with contrast against background
  if (isDark) {
    // Light text on dark backgrounds - use lighter variants of bg for muted/disabled
    return {
      '--text-primary': '#F5F5F5',
      '--text-secondary': '#B0B0B0',
      '--text-muted': lighten(bgColor, 0.35),
      '--text-disabled': lighten(bgColor, 0.25),
    };
  }
  // Dark text on light backgrounds - use darker variants of bg for muted/disabled
  return {
    '--text-primary': '#1A1A1A',
    '--text-secondary': '#4A4A4A',
    '--text-muted': darken(bgColor, 0.35),
    '--text-disabled': darken(bgColor, 0.25),
  };
}

/** Border color configuration for theme derivation */
export interface BorderColors {
  '--border-color': string;
  '--border-color-light': string;
}

/**
 * Derive border colors from background
 *
 * @param bgColor - Background hex color
 * @param isDark - Whether the theme is dark mode
 * @returns Object with border CSS variables
 */
export function deriveBorderColors(bgColor: string, isDark: boolean): BorderColors {
  if (isDark) {
    return {
      '--border-color': lighten(bgColor, 0.15),
      '--border-color-light': lighten(bgColor, 0.22),
    };
  }
  return {
    '--border-color': darken(bgColor, 0.12),
    '--border-color-light': darken(bgColor, 0.08),
  };
}

/**
 * Extract RGB string from hex for use in rgba() CSS functions
 *
 * @param hex - Hex color string
 * @returns RGB string like "255, 128, 64"
 */
export function hexToRgbString(hex: string): string {
  const rgb = parseHexColor(hex);
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

/** Primary color configuration */
export interface PrimaryColors {
  '--color-primary': string;
  '--color-primary-dark': string;
  '--color-primary-light': string;
  '--color-primary-subtle': string;
  '--primary-rgb': string;
}

/**
 * Derive primary color variations
 *
 * @param primary - Primary hex color
 * @returns Object with primary color CSS variables
 */
export function derivePrimaryColors(primary: string): PrimaryColors {
  return {
    '--color-primary': primary,
    '--color-primary-dark': darken(primary, 0.25),
    '--color-primary-light': lighten(primary, 0.15),
    '--color-primary-subtle': `rgba(${hexToRgbString(primary)}, 0.1)`,
    '--primary-rgb': hexToRgbString(primary),
  };
}

/** Accent color configuration */
export interface AccentColors {
  '--color-accent': string;
  '--color-accent-light': string;
  '--color-accent-dark': string;
  '--accent-rgb': string;
}

/**
 * Derive accent color variations
 *
 * @param accent - Accent hex color
 * @returns Object with accent color CSS variables
 */
export function deriveAccentColors(accent: string): AccentColors {
  return {
    '--color-accent': accent,
    '--color-accent-light': lighten(accent, 0.2),
    '--color-accent-dark': darken(accent, 0.15),
    '--accent-rgb': hexToRgbString(accent),
  };
}
