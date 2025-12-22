/**
 * Characters Pre-Render Cache Helpers
 *
 * Compatibility layer providing convenience functions for accessing
 * pre-rendered character tokens from the TabPreRenderService.
 *
 * All caching is centralized in TabPreRenderService. This module provides
 * backward-compatible functions that delegate to the centralized service.
 *
 * @module ts/cache/charactersPreRenderHelpers
 */

import type { Character, GenerationOptions } from '@/ts/types/index.js';
import type { CharactersPreRenderEntry } from './strategies/CharactersPreRenderStrategy.js';
import { tabPreRenderService } from './TabPreRenderService.js';
import { hashGenerationOptions } from './utils/hashUtils.js';

// ============================================================================
// Hash Utilities (re-export for backward compatibility)
// ============================================================================

/**
 * Hash generation options into a cache key component.
 * Used to detect when options change and cached tokens are stale.
 *
 * @deprecated Use hashGenerationOptions from utils/hashUtils.js directly
 */
export function hashOptions(options: GenerationOptions): string {
  return hashGenerationOptions(options);
}

// ============================================================================
// Cache Access (delegates to TabPreRenderService)
// ============================================================================

/**
 * Get pre-rendered tokens for a character from the centralized cache.
 *
 * @param characterUuid - Character UUID to look up
 * @param options - Current generation options (for cache key)
 * @returns Cached entry or null if not available
 */
export function getPreRenderedTokens(
  characterUuid: string,
  options: GenerationOptions
): CharactersPreRenderEntry | null {
  const cached = tabPreRenderService.getCachedCharacterTokens(characterUuid, options);
  if (!cached) return null;

  // Convert to CharactersPreRenderEntry format
  return {
    characterToken: cached.characterToken,
    reminderTokens: cached.reminderTokens,
    characterUuid: cached.characterUuid,
    optionsHash: cached.optionsHash,
  };
}

/**
 * Pre-render the first character in preparation for viewing.
 * Delegates to TabPreRenderService.preRenderTab().
 *
 * @deprecated Use tabPreRenderService.preRenderTab('characters', context) directly
 * @param character - Character to pre-render
 * @param options - Generation options
 */
export function preRenderFirstCharacter(character: Character, options: GenerationOptions): void {
  tabPreRenderService.preRenderTab('characters', {
    characters: [character],
    tokens: [],
    generationOptions: options,
  });
}

/**
 * Clear the pre-render cache for characters.
 * Delegates to TabPreRenderService.clearCache().
 */
export function clearPreRenderCache(): void {
  tabPreRenderService.clearCache('characters');
}
