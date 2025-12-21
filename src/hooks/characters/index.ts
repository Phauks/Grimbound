/**
 * Character Hooks
 *
 * Hooks for character editing, CRUD operations, downloads, and image resolution.
 *
 * @module hooks/characters
 */

// Character editing
export {
  useCharacterEditor,
  type UseCharacterEditorOptions,
  type UseCharacterEditorResult,
} from './useCharacterEditor.js';

// Character CRUD operations
export {
  useCharacterOperations,
  type UseCharacterOperationsOptions,
  type UseCharacterOperationsResult,
} from './useCharacterOperations.js';

// Character downloads
export {
  useCharacterDownloads,
  type UseCharacterDownloadsOptions,
  type UseCharacterDownloadsResult,
} from './useCharacterDownloads.js';

// Image resolution
export { useCharacterImageResolver } from './useCharacterImageResolver.js';
export { useBackgroundImageUrl } from './useBackgroundImageUrl.js';
