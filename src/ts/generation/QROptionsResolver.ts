/**
 * Blood on the Clocktower Token Generator
 * QR Options Resolver - Resolves QR code options with defaults
 *
 * Extracted from TokenGenerator to reduce cognitive complexity.
 * Centralizes QR option default resolution in one place.
 */

import { QR_COLORS } from '@/ts/constants.js';
import type {
  QRCodeOptions,
  QRCornerDotType,
  QRCornerSquareType,
  QRDotType,
  QRErrorCorrectionLevel,
  QRGradientType,
} from '@/ts/types/tokenOptions.js';

/**
 * Default QR code options
 * Centralized here for single source of truth
 */
export const DEFAULT_QR_OPTIONS: Required<QRCodeOptions> = {
  // Token options
  showAlmanacLabel: true,
  showLogo: true,
  showAuthor: true,

  // Dots options
  dotType: 'extra-rounded',
  dotsUseGradient: true,
  dotsGradientType: 'linear',
  dotsGradientRotation: 45,
  dotsColorStart: QR_COLORS.GRADIENT_START,
  dotsColorEnd: QR_COLORS.GRADIENT_END,

  // Corner square options
  cornerSquareType: 'extra-rounded',
  cornerSquareUseGradient: false,
  cornerSquareGradientType: 'linear',
  cornerSquareGradientRotation: 45,
  cornerSquareColorStart: QR_COLORS.GRADIENT_START,
  cornerSquareColorEnd: QR_COLORS.GRADIENT_START,

  // Corner dot options
  cornerDotType: 'dot',
  cornerDotUseGradient: false,
  cornerDotGradientType: 'linear',
  cornerDotGradientRotation: 45,
  cornerDotColorStart: QR_COLORS.GRADIENT_END,
  cornerDotColorEnd: QR_COLORS.GRADIENT_END,

  // Background options
  backgroundUseGradient: false,
  backgroundGradientType: 'linear',
  backgroundGradientRotation: 45,
  backgroundColorStart: QR_COLORS.BACKGROUND,
  backgroundColorEnd: QR_COLORS.BACKGROUND,
  backgroundOpacity: 100,
  backgroundRoundedCorners: false,

  // Image options
  imageSource: 'script-logo',
  imageHideBackgroundDots: true,
  imageSize: 30,
  imageMargin: 4,

  // QR options
  errorCorrectionLevel: 'H',
};

/**
 * Resolve partial QR options with defaults
 * Returns a complete QRCodeOptions object with all properties defined
 *
 * @param userOptions - Partial user-provided options
 * @returns Complete QR options with defaults applied
 */
export function resolveQROptions(userOptions?: Partial<QRCodeOptions>): Required<QRCodeOptions> {
  if (!userOptions) {
    return { ...DEFAULT_QR_OPTIONS };
  }

  return {
    ...DEFAULT_QR_OPTIONS,
    ...userOptions,
  };
}

/**
 * Options passed to generateStyledQRCode
 * This interface matches what the QR generation function expects
 */
export interface StyledQRCodeParams {
  text: string;
  size: number;
  logoUrl?: string;
  showLogo: boolean;
  // Dots
  dotType: QRDotType;
  dotsUseGradient: boolean;
  dotsGradientType: QRGradientType;
  dotsGradientRotation: number;
  dotsColorStart: string;
  dotsColorEnd: string;
  // Corner squares
  cornerSquareType: QRCornerSquareType;
  cornerSquareUseGradient: boolean;
  cornerSquareGradientType: QRGradientType;
  cornerSquareColorStart: string;
  cornerSquareColorEnd: string;
  // Corner dots
  cornerDotType: QRCornerDotType;
  cornerDotUseGradient: boolean;
  cornerDotGradientType: QRGradientType;
  cornerDotColorStart: string;
  cornerDotColorEnd: string;
  // Background
  backgroundUseGradient: boolean;
  backgroundGradientType: QRGradientType;
  backgroundColorStart: string;
  backgroundColorEnd: string;
  backgroundOpacity: number;
  backgroundRoundedCorners: boolean;
  // Image
  imageHideBackgroundDots: boolean;
  imageSize: number;
  imageMargin: number;
  // QR
  errorCorrectionLevel: QRErrorCorrectionLevel;
}

/**
 * Build styled QR code parameters from resolved options
 *
 * @param almanacUrl - The URL to encode in the QR code
 * @param qrSize - The size of the QR code in pixels
 * @param logoDataUrl - Optional pre-loaded logo as data URL
 * @param opts - Resolved QR options
 * @returns Parameters ready for generateStyledQRCode
 */
export function buildStyledQRParams(
  almanacUrl: string,
  qrSize: number,
  logoDataUrl: string | undefined,
  opts: Required<QRCodeOptions>
): StyledQRCodeParams {
  return {
    text: almanacUrl,
    size: qrSize,
    logoUrl: logoDataUrl,
    showLogo: opts.showLogo && !!logoDataUrl,
    // Dots
    dotType: opts.dotType,
    dotsUseGradient: opts.dotsUseGradient,
    dotsGradientType: opts.dotsGradientType,
    dotsGradientRotation: opts.dotsGradientRotation,
    dotsColorStart: opts.dotsColorStart,
    dotsColorEnd: opts.dotsColorEnd,
    // Corner squares
    cornerSquareType: opts.cornerSquareType,
    cornerSquareUseGradient: opts.cornerSquareUseGradient,
    cornerSquareGradientType: opts.cornerSquareGradientType,
    cornerSquareColorStart: opts.cornerSquareColorStart,
    cornerSquareColorEnd: opts.cornerSquareColorEnd,
    // Corner dots
    cornerDotType: opts.cornerDotType,
    cornerDotUseGradient: opts.cornerDotUseGradient,
    cornerDotGradientType: opts.cornerDotGradientType,
    cornerDotColorStart: opts.cornerDotColorStart,
    cornerDotColorEnd: opts.cornerDotColorEnd,
    // Background
    backgroundUseGradient: opts.backgroundUseGradient,
    backgroundGradientType: opts.backgroundGradientType,
    backgroundColorStart: opts.backgroundColorStart,
    backgroundColorEnd: opts.backgroundColorEnd,
    backgroundOpacity: opts.backgroundOpacity,
    backgroundRoundedCorners: opts.backgroundRoundedCorners,
    // Image
    imageHideBackgroundDots: opts.imageHideBackgroundDots,
    imageSize: opts.imageSize,
    imageMargin: opts.imageMargin,
    // QR
    errorCorrectionLevel: opts.errorCorrectionLevel,
  };
}
