/**
 * Character Hooks
 *
 * Hooks for character editing, CRUD operations, downloads, and image resolution.
 *
 * @module hooks/characters
 */

export { useBackgroundImageUrl } from './useBackgroundImageUrl.js';
// Character CRUD - Sub-hooks (for direct use or testing)
export {
  type UseCharacterCRUDOptions,
  type UseCharacterCRUDResult,
  useCharacterCRUD,
} from './useCharacterCRUD.js';
// Character downloads
export {
  type UseCharacterDownloadsOptions,
  type UseCharacterDownloadsResult,
  useCharacterDownloads,
} from './useCharacterDownloads.js';
// Character editing
export {
  type UseCharacterEditorOptions,
  type UseCharacterEditorResult,
  useCharacterEditor,
} from './useCharacterEditor.js';
// Image resolution
export { useCharacterImageResolver } from './useCharacterImageResolver.js';
export {
  type UseCharacterMetadataOptions,
  type UseCharacterMetadataResult,
  useCharacterMetadata,
} from './useCharacterMetadata.js';
// Character CRUD operations - Orchestrator
export {
  type UseCharacterOperationsOptions,
  type UseCharacterOperationsResult,
  useCharacterOperations,
} from './useCharacterOperations.js';
