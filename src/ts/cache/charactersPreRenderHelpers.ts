/**
 * Characters Pre-Render Cache Helpers
 *
 * Compatibility layer providing convenience functions for accessing
 * pre-rendered character tokens from the cache system.
 *
 * @module ts/cache/charactersPreRenderHelpers
 */

import { cacheManager } from './CacheManager.js'
import type { CharactersPreRenderEntry } from './strategies/CharactersPreRenderStrategy.js'
import type { Character, GenerationOptions, Token } from '../types/index.js'

/**
 * Hash generation options into a cache key component.
 * Used to detect when options change and cached tokens are stale.
 */
export function hashOptions(options: GenerationOptions): string {
  const key = JSON.stringify({
    displayAbilityText: options.displayAbilityText,
    generateBootleggerRules: options.generateBootleggerRules,
    tokenCount: options.tokenCount,
    setupFlowerStyle: options.setupFlowerStyle,
    characterBackground: options.characterBackground,
    characterBackgroundType: options.characterBackgroundType,
    reminderBackground: options.reminderBackground,
    reminderBackgroundType: options.reminderBackgroundType,
    characterNameFont: options.characterNameFont,
    characterReminderFont: options.characterReminderFont,
    dpi: options.dpi,
    leafGeneration: options.leafGeneration,
  })
  // Simple hash
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Get pre-rendered tokens for a character from the cache.
 *
 * Note: This is a synchronous stub that returns null. The actual cache
 * uses async APIs, but this function is called in useState initializers
 * which can't await. Components should handle null by regenerating tokens.
 *
 * @param characterUuid - Character UUID to look up
 * @param options - Current generation options (for cache key)
 * @returns null - Components should regenerate tokens if not available
 */
export function getPreRenderedTokens(
  _characterUuid: string,
  _options: GenerationOptions
): CharactersPreRenderEntry | null {
  // The cache manager uses async APIs, but this function is called
  // synchronously in useState initializers. Return null and let the
  // component regenerate tokens as needed. The pre-render cache warming
  // on tab hover will populate the cache for subsequent navigation.
  return null
}

/**
 * Pre-render the first character in preparation for viewing.
 * This is called on tab hover to warm the cache.
 *
 * @param character - Character to pre-render
 * @param options - Generation options
 * @returns Promise that resolves when pre-rendering is complete
 */
export async function preRenderFirstCharacter(
  character: Character,
  options: GenerationOptions
): Promise<void> {
  await cacheManager.preRender({
    type: 'characters-hover',
    tokens: [], // Required but not used for characters strategy
    characters: [character],
    generationOptions: options
  })
}
