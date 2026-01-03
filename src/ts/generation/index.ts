/**
 * Blood on the Clocktower Token Generator
 * Generation Module - Barrel export for all token generation functionality
 */

// Batch generation (orchestration layer)
export {
  calculateTokenCountsByType,
  generateAllTokens as generateAllTokensBatch,
  generateAllTokens,
  type TokenCountsByType,
} from './batchGenerator.js';
// Export image cache adapter
export { defaultImageCache } from './ImageCacheAdapter.js';
// Presets utilities (no built-in presets - users create their own)
export { createPreset, duplicatePreset, getDefaultOptions, isValidPreset } from './presets.js';
// QR code options resolution
export {
  buildStyledQRParams,
  DEFAULT_QR_OPTIONS,
  resolveQROptions,
  type StyledQRCodeParams,
} from './QROptionsResolver.js';
// Token Factory (Token object creation)
export {
  type CharacterTokenOptions,
  type MetaTokenOptions,
  type MetaTokenType,
  type ReminderTokenOptions,
  TokenFactory,
  type VariantInfo,
} from './TokenFactory.js';
// Token Generator class (canvas rendering, uses composition and DI)
export { TokenGenerator } from './TokenGenerator.js';
// Export renderers for advanced usage
export { type IImageCache, TokenImageRenderer } from './TokenImageRenderer.js';
export { TokenTextRenderer } from './TokenTextRenderer.js';
// Team variant generation (auto-generation of team color variants)
export {
  applyTeamRecolor,
  createRecoloredImage,
  createRecoloredImageUrl,
  generateTeamVariantCanvas,
  getTeamDisplayName,
  getTeamsToGenerate,
  shouldGenerateTeamVariant,
  TEAM_VARIANT_CONFIG,
  type TeamVariantConfig,
  type TeamVariantResult,
} from './teamVariantGenerator.js';
