/**
 * Hybrid Renderer Constants
 *
 * Constants used by both Night Order and Player Script renderers.
 */

/** Letter page size in inches */
export const PAGE_WIDTH_INCHES = 8.5;
export const PAGE_HEIGHT_INCHES = 11;

/** UI preview container width (must match CSS module sizes) */
export const UI_PREVIEW_WIDTH = 680;

/** Timeout for image loading (ms) */
export const IMAGE_LOAD_TIMEOUT = 15000;

/** Font families used in script PDFs */
export const SCRIPT_FONT_FAMILIES = [
  'Dumbledor',
  'Goudy Old Style',
  'TradeGothic',
  'TradeGothicBold',
] as const;

/** Cached Snapdom module (lazy loaded) */
export let snapdomModule: typeof import('@zumer/snapdom') | null = null;

/**
 * Set the Snapdom module cache (for internal use)
 */
export function setSnapdomModule(module: typeof import('@zumer/snapdom')): void {
  snapdomModule = module;
}
