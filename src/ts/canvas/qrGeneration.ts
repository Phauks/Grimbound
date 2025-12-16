/**
 * Blood on the Clocktower Token Generator
 * QR Code Generation Utilities
 *
 * Uses qr-code-styling for modern, customizable QR codes with:
 * - Gradient coloring (linear/radial)
 * - Multiple dot/corner styles
 * - Logo embedding with error correction
 */

import type { CornerDotType, CornerSquareType, DotType, Gradient } from 'qr-code-styling';
import QRCodeStyling from 'qr-code-styling';
import type {
  QRCornerDotType,
  QRCornerSquareType,
  QRDotType,
  QRErrorCorrectionLevel,
  QRGradientType,
} from '../types/tokenOptions.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// QR CODE TYPES
// ============================================================================

/**
 * Full styled QR code generation options
 */
export interface StyledQRCodeOptions {
  /** The URL or text to encode */
  text: string;
  /** Size in pixels */
  size: number;
  /** Optional logo URL to embed in center */
  logoUrl?: string;
  /** Whether to show the logo */
  showLogo?: boolean;

  // Dots options
  dotType?: QRDotType;
  dotsUseGradient?: boolean;
  dotsGradientType?: QRGradientType;
  dotsGradientRotation?: number;
  dotsColorStart?: string;
  dotsColorEnd?: string;

  // Corner square options
  cornerSquareType?: QRCornerSquareType;
  cornerSquareUseGradient?: boolean;
  cornerSquareGradientType?: QRGradientType;
  cornerSquareGradientRotation?: number;
  cornerSquareColorStart?: string;
  cornerSquareColorEnd?: string;

  // Corner dot options
  cornerDotType?: QRCornerDotType;
  cornerDotUseGradient?: boolean;
  cornerDotGradientType?: QRGradientType;
  cornerDotGradientRotation?: number;
  cornerDotColorStart?: string;
  cornerDotColorEnd?: string;

  // Background options
  backgroundUseGradient?: boolean;
  backgroundGradientType?: QRGradientType;
  backgroundGradientRotation?: number;
  backgroundColorStart?: string;
  backgroundColorEnd?: string;
  /** Background opacity 0-100 (default: 100) */
  backgroundOpacity?: number;
  /** Whether to use rounded corners on background (default: false) */
  backgroundRoundedCorners?: boolean;

  // Image options
  /** Whether to hide background dots behind the image (default: true) */
  imageHideBackgroundDots?: boolean;
  /** Image size as percentage of QR code (5-50, default: 30) */
  imageSize?: number;
  /** Image margin in pixels (0-20, default: 4) */
  imageMargin?: number;

  // QR options
  errorCorrectionLevel?: QRErrorCorrectionLevel;
}

/**
 * Default QR styling values
 */
export const QR_DEFAULTS = {
  DOT_TYPE: 'extra-rounded' as QRDotType,
  DOTS_GRADIENT_TYPE: 'linear' as QRGradientType,
  DOTS_GRADIENT_ROTATION: 45,
  DOTS_COLOR_START: '#8B0000',
  DOTS_COLOR_END: '#1a1a1a',
  CORNER_SQUARE_TYPE: 'extra-rounded' as QRCornerSquareType,
  CORNER_SQUARE_COLOR: '#8B0000',
  CORNER_DOT_TYPE: 'dot' as QRCornerDotType,
  CORNER_DOT_COLOR: '#1a1a1a',
  BACKGROUND: '#FFFFFF',
  ERROR_CORRECTION: 'H' as QRErrorCorrectionLevel,
  LOGO_SIZE: 0.3,
  LOGO_MARGIN: 4,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert hex color + opacity (0-100) to rgba string
 */
function hexToRgba(hex: string, opacity: number): string {
  // Parse hex color
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const a = Math.max(0, Math.min(100, opacity)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Create a gradient configuration for qr-code-styling
 */
function createGradient(
  type: QRGradientType,
  colorStart: string,
  colorEnd: string,
  rotation: number = 45
): Gradient {
  return {
    type: type,
    rotation: type === 'linear' ? rotation : undefined,
    colorStops: [
      { offset: 0, color: colorStart },
      { offset: 1, color: colorEnd },
    ],
  };
}

// ============================================================================
// STYLED QR CODE GENERATION
// ============================================================================

/**
 * Generate a styled QR code with full customization options
 */
export async function generateStyledQRCode(
  options: StyledQRCodeOptions
): Promise<HTMLCanvasElement> {
  const {
    text,
    size,
    logoUrl,
    showLogo = true,
    // Dots
    dotType = QR_DEFAULTS.DOT_TYPE,
    dotsUseGradient = true,
    dotsGradientType = QR_DEFAULTS.DOTS_GRADIENT_TYPE,
    dotsGradientRotation = QR_DEFAULTS.DOTS_GRADIENT_ROTATION,
    dotsColorStart = QR_DEFAULTS.DOTS_COLOR_START,
    dotsColorEnd = QR_DEFAULTS.DOTS_COLOR_END,
    // Corner squares
    cornerSquareType = QR_DEFAULTS.CORNER_SQUARE_TYPE,
    cornerSquareUseGradient = false,
    cornerSquareGradientType = 'linear',
    cornerSquareColorStart = QR_DEFAULTS.CORNER_SQUARE_COLOR,
    cornerSquareColorEnd = QR_DEFAULTS.CORNER_SQUARE_COLOR,
    // Corner dots
    cornerDotType = QR_DEFAULTS.CORNER_DOT_TYPE,
    cornerDotUseGradient = false,
    cornerDotGradientType = 'linear',
    cornerDotColorStart = QR_DEFAULTS.CORNER_DOT_COLOR,
    cornerDotColorEnd = QR_DEFAULTS.CORNER_DOT_COLOR,
    // Background
    backgroundUseGradient = false,
    backgroundGradientType = 'linear',
    backgroundColorStart = QR_DEFAULTS.BACKGROUND,
    backgroundColorEnd = QR_DEFAULTS.BACKGROUND,
    backgroundOpacity = 100,
    backgroundRoundedCorners = false,
    // Image options
    imageHideBackgroundDots = true,
    imageSize = QR_DEFAULTS.LOGO_SIZE * 100, // Convert default from 0.3 to 30
    imageMargin = QR_DEFAULTS.LOGO_MARGIN,
    // QR options
    errorCorrectionLevel = QR_DEFAULTS.ERROR_CORRECTION,
  } = options;

  logger.debug('QRGeneration', 'Generating styled QR code', {
    textLength: text.length,
    size,
    hasLogo: !!logoUrl && showLogo,
    dotType,
    errorCorrectionLevel,
  });

  try {
    // Build dots options
    const dotsOptions: { type: DotType; color?: string; gradient?: Gradient } = {
      type: dotType as DotType,
    };
    if (dotsUseGradient) {
      dotsOptions.gradient = createGradient(
        dotsGradientType,
        dotsColorStart,
        dotsColorEnd,
        dotsGradientRotation
      );
    } else {
      dotsOptions.color = dotsColorStart;
    }

    // Build corner square options
    const cornersSquareOptions: { type: CornerSquareType; color?: string; gradient?: Gradient } = {
      type: cornerSquareType as CornerSquareType,
    };
    if (cornerSquareUseGradient) {
      cornersSquareOptions.gradient = createGradient(
        cornerSquareGradientType,
        cornerSquareColorStart,
        cornerSquareColorEnd
      );
    } else {
      cornersSquareOptions.color = cornerSquareColorStart;
    }

    // Build corner dot options
    const cornersDotOptions: { type: CornerDotType; color?: string; gradient?: Gradient } = {
      type: cornerDotType as CornerDotType,
    };
    if (cornerDotUseGradient) {
      cornersDotOptions.gradient = createGradient(
        cornerDotGradientType,
        cornerDotColorStart,
        cornerDotColorEnd
      );
    } else {
      cornersDotOptions.color = cornerDotColorStart;
    }

    // Build background options (with opacity and rounded corners support)
    const backgroundOptions: { color?: string; gradient?: Gradient; round?: number } = {};
    if (backgroundUseGradient) {
      // Apply opacity to gradient colors
      const startWithOpacity = hexToRgba(backgroundColorStart, backgroundOpacity);
      const endWithOpacity = hexToRgba(backgroundColorEnd, backgroundOpacity);
      backgroundOptions.gradient = createGradient(
        backgroundGradientType,
        startWithOpacity,
        endWithOpacity
      );
    } else {
      // Apply opacity to solid color
      backgroundOptions.color = hexToRgba(backgroundColorStart, backgroundOpacity);
    }
    // Apply rounded corners (0.5 = 50% corner radius for nice rounded look)
    if (backgroundRoundedCorners) {
      backgroundOptions.round = 0.15;
    }

    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'canvas',
      data: text,
      image: showLogo && logoUrl ? logoUrl : undefined,
      dotsOptions,
      cornersSquareOptions,
      cornersDotOptions,
      backgroundOptions,
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: imageMargin,
        imageSize: imageSize / 100, // Convert percentage to decimal (30 -> 0.3)
        hideBackgroundDots: imageHideBackgroundDots,
      },
      qrOptions: {
        errorCorrectionLevel: errorCorrectionLevel,
      },
    });

    // Get the raw data as a blob and convert to canvas
    const blob = await qrCode.getRawData('png');

    if (!blob) {
      throw new Error('Failed to generate QR code blob');
    }

    // Create an image from the blob
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load QR code image'));
      img.src = blobUrl;
    });

    // Draw to canvas
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = size;
    resultCanvas.height = size;
    const ctx = resultCanvas.getContext('2d');

    if (!ctx) {
      URL.revokeObjectURL(blobUrl);
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(blobUrl);

    logger.info('QRGeneration', 'Styled QR code generated successfully');
    return resultCanvas;
  } catch (error) {
    logger.error('QRGeneration', 'Failed to generate styled QR code', error);
    throw error;
  }
}
