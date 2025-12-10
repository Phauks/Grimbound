/**
 * Customize tab pre-rendering strategy.
 * Pre-renders first character + reminders for instant customize view display.
 */

import type {
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
  ICacheStrategy
} from '../core/index.js'
import type { Token, Character, GenerationOptions } from '../../types/index.js'
import { regenerateCharacterAndReminders } from '../../ui/detailViewUtils.js'

/**
 * Cache entry for pre-rendered character tokens.
 */
export interface CustomizePreRenderEntry {
  /** Main character token */
  characterToken: Token
  /** Array of reminder tokens */
  reminderTokens: Token[]
  /** Character UUID for identity */
  characterUuid: string
  /** Hash of generation options */
  optionsHash: string
}

/**
 * Configuration options for customize pre-rendering.
 */
export interface CustomizeStrategyOptions {
  /** Include reminder tokens (default: true) */
  includeReminders: boolean
}

/**
 * Domain Service: Customize pre-rendering strategy.
 * Pre-renders first character and its reminders for instant customize view.
 */
export class CustomizePreRenderStrategy implements IPreRenderStrategy {
  readonly name = 'customize'
  readonly priority = 2

  constructor(
    private cache: ICacheStrategy<string, CustomizePreRenderEntry>,
    private options: CustomizeStrategyOptions = {
      includeReminders: true
    }
  ) {}

  shouldTrigger(context: PreRenderContext): boolean {
    return (
      context.type === 'customize-hover' &&
      context.characters != null &&
      context.characters.length > 0 &&
      context.generationOptions != null
    )
  }

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    const { characters, generationOptions } = context

    if (!characters || characters.length === 0 || !generationOptions) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'Missing characters or generation options'
      }
    }

    // Pre-render only first character
    const character = characters[0]
    const cacheKey = this.getCacheKey(character, generationOptions)

    // Check if already cached with same options
    if (this.cache.has(cacheKey)) {
      return {
        success: true,
        rendered: 0,
        skipped: 1,
        metadata: {
          strategy: this.name,
          cached: true
        }
      }
    }

    try {
      // Generate character and reminder tokens
      const { characterToken, reminderTokens } = await regenerateCharacterAndReminders(
        character,
        generationOptions
      )

      // Store in cache
      const entry: CustomizePreRenderEntry = {
        characterToken,
        reminderTokens: this.options.includeReminders ? reminderTokens : [],
        characterUuid: character.id,
        optionsHash: this.hashOptions(generationOptions)
      }

      await this.cache.set(cacheKey, entry)

      return {
        success: true,
        rendered: 1,
        skipped: 0,
        metadata: {
          strategy: this.name,
          characterId: character.id,
          reminderCount: reminderTokens.length,
          cacheStats: this.cache.getStats()
        }
      }
    } catch (error) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get pre-rendered tokens for a character if cached.
   * @param character - Character to retrieve
   * @param options - Generation options
   * @returns Cached entry or null
   */
  async getPreRendered(
    character: Character,
    options: GenerationOptions
  ): Promise<CustomizePreRenderEntry | null> {
    const cacheKey = this.getCacheKey(character, options)
    const entry = await this.cache.get(cacheKey)
    return entry?.value ?? null
  }

  /**
   * Generate cache key for character + options.
   * @param character - Character
   * @param options - Generation options
   * @returns Cache key string
   */
  private getCacheKey(character: Character, options: GenerationOptions): string {
    const optionsHash = this.hashOptions(options)
    return `${character.id}_${optionsHash}`
  }

  /**
   * Hash generation options that affect rendering.
   * Only includes options that actually change the visual output.
   *
   * @param options - Generation options
   * @returns Hash string
   */
  private hashOptions(options: GenerationOptions): string {
    // Hash all appearance-affecting options
    // Note: We exclude non-visual options like generateImageVariants, tokenCount badge
    const relevantOptions = {
      displayAbilityText: options.displayAbilityText,
      generateBootleggerRules: options.generateBootleggerRules,
      setupFlowerStyle: options.setupFlowerStyle,
      reminderBackground: options.reminderBackground,
      reminderBackgroundImage: options.reminderBackgroundImage,
      reminderBackgroundType: options.reminderBackgroundType,
      characterBackground: options.characterBackground,
      characterBackgroundColor: options.characterBackgroundColor,
      characterBackgroundType: options.characterBackgroundType,
      characterNameFont: options.characterNameFont,
      characterNameColor: options.characterNameColor,
      dpi: options.dpi
      // Note: Omitting generateImageVariants, tokenCount as they don't affect individual token appearance
    }

    // Simple hash: stringify and create hash code
    const str = JSON.stringify(relevantOptions)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }
}
