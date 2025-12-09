import type { Token, Character, GenerationOptions } from '../ts/types/index.js'
import { regenerateCharacterAndReminders } from '../ts/ui/detailViewUtils'

/**
 * Shared pre-render cache for CustomizeView
 * Allows pre-rendering tokens on tab hover for instant display
 */

interface PreRenderCacheEntry {
  characterToken: Token
  reminderTokens: Token[]
  characterUuid: string
  optionsHash: string
}

let preRenderCache: PreRenderCacheEntry | null = null
let isPreRendering = false

/**
 * Hash only the appearance-affecting properties of GenerationOptions
 * This is more efficient than hashing the entire options object
 */
export function hashOptions(options: GenerationOptions): string {
  // Extract only properties that affect token appearance
  const appearanceProps = {
    displayAbilityText: options.displayAbilityText,
    tokenCount: options.tokenCount,
    setupFlowerStyle: options.setupFlowerStyle,
    reminderBackground: options.reminderBackground,
    reminderBackgroundImage: options.reminderBackgroundImage,
    reminderBackgroundType: options.reminderBackgroundType,
    characterBackground: options.characterBackground,
    characterBackgroundColor: options.characterBackgroundColor,
    characterBackgroundType: options.characterBackgroundType,
    metaBackground: options.metaBackground,
    metaBackgroundColor: options.metaBackgroundColor,
    metaBackgroundType: options.metaBackgroundType,
    characterNameFont: options.characterNameFont,
    characterNameColor: options.characterNameColor,
    characterReminderFont: options.characterReminderFont,
    abilityTextFont: options.abilityTextFont,
    abilityTextColor: options.abilityTextColor,
    reminderTextColor: options.reminderTextColor,
    leafGeneration: options.leafGeneration,
    maximumLeaves: options.maximumLeaves,
    leafPopulationProbability: options.leafPopulationProbability,
    leafArcSpan: options.leafArcSpan,
    leafSlots: options.leafSlots,
    dpi: options.dpi,
    fontSpacing: options.fontSpacing,
    textShadow: options.textShadow,
    iconSettings: options.iconSettings,
    pngSettings: options.pngSettings?.transparentBackground,
  }
  return JSON.stringify(appearanceProps)
}

/**
 * Pre-render a character's tokens and cache them
 * Uses character UUID for unique identification across projects
 */
export async function preRenderFirstCharacter(
  character: Character,
  options: GenerationOptions
): Promise<void> {
  // Don't start if already pre-rendering or missing UUID
  if (isPreRendering || !character.uuid) return
  
  const optionsHash = hashOptions(options)
  
  // Skip if already cached for this character UUID and options
  if (preRenderCache && 
      preRenderCache.characterUuid === character.uuid && 
      preRenderCache.optionsHash === optionsHash) {
    return
  }
  
  isPreRendering = true
  
  try {
    const { characterToken, reminderTokens } = await regenerateCharacterAndReminders(
      character,
      options
    )
    
    preRenderCache = {
      characterToken,
      reminderTokens,
      characterUuid: character.uuid,
      optionsHash
    }
  } catch (error) {
    console.error('Failed to pre-render character:', error)
  } finally {
    isPreRendering = false
  }
}

/**
 * Get cached pre-rendered tokens for a character
 * Returns null if not cached or options changed
 */
export function getPreRenderedTokens(
  characterUuid: string,
  options: GenerationOptions
): { characterToken: Token; reminderTokens: Token[] } | null {
  if (!preRenderCache) return null
  
  const optionsHash = hashOptions(options)
  
  if (preRenderCache.characterUuid === characterUuid && 
      preRenderCache.optionsHash === optionsHash) {
    return {
      characterToken: preRenderCache.characterToken,
      reminderTokens: preRenderCache.reminderTokens
    }
  }
  
  return null
}

/**
 * Clear the pre-render cache
 */
export function clearPreRenderCache(): void {
  preRenderCache = null
}

/**
 * Check if pre-rendering is in progress
 */
export function isPreRenderingInProgress(): boolean {
  return isPreRendering
}
