/**
 * Shared PDF Constants
 *
 * Constants used by both Night Order and Player Script PDF exporters.
 */

/** Letter page size in points (72 points = 1 inch) */
export const PAGE_WIDTH_PT = 8.5 * 72; // 612
export const PAGE_HEIGHT_PT = 11 * 72; // 792

/** JPEG quality for PDF embedding (0-1) */
export const JPEG_QUALITY = 0.92;

/** Font file paths for PDF embedding */
export const FONT_PATHS = {
  Dumbledor: '/fonts/Dumbledor/Dumbledor.ttf',
  GoudyOldStyle: '/fonts/GoudyOldStyle/GoudyOldStyle.ttf',
  TradeGothic: '/fonts/TradeGothic/TradeGothic.otf',
  TradeGothicBold: '/fonts/TradeGothic/TradeGothicBold.otf',
} as const;

/** Font names used in the application */
export type FontName = keyof typeof FONT_PATHS;
