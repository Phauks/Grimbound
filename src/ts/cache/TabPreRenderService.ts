/**
 * Tab Pre-Render Service
 *
 * Unified service for handling all tab hover pre-rendering.
 * Consolidates previously scattered pre-render logic into a single,
 * consistent API with proper caching and invalidation.
 *
 * Architecture: Application Service (Facade Pattern)
 *
 * @module ts/cache/TabPreRenderService
 */

import type { Character, GenerationOptions, ScriptEntry, ScriptMeta, Token } from '@/ts/types/index.js';
import type { NightOrderResult } from '@/ts/nightOrder/nightOrderUtils.js';
import { buildNightOrder } from '@/ts/nightOrder/nightOrderUtils.js';
import { isCharacter } from '@/ts/data/scriptParser.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { cacheManager } from './CacheManager.js';
import { hashArray } from './utils/hashUtils.js';
import { CacheLogger } from './utils/CacheLogger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported tab types for pre-rendering
 */
export type PreRenderableTab = 'characters' | 'tokens' | 'script';

/**
 * Context for tab pre-rendering
 */
export interface TabPreRenderContext {
  /** Characters from the current script */
  characters: Character[];
  /** Generated tokens */
  tokens: Token[];
  /** Script metadata (optional) */
  scriptMeta?: ScriptMeta | null;
  /** Token generation options */
  generationOptions?: GenerationOptions;
  /** Last selected character UUID (for characters tab) */
  lastSelectedCharacterUuid?: string;
}

/**
 * Result of a tab pre-render operation
 */
export interface TabPreRenderResult {
  /** Whether the pre-render was successful */
  success: boolean;
  /** Tab that was pre-rendered */
  tab: PreRenderableTab;
  /** Whether data was served from cache */
  fromCache: boolean;
  /** Number of items processed */
  itemCount: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Cached night order data
 */
interface NightOrderCacheEntry {
  hash: string;
  firstNight: NightOrderResult;
  otherNight: NightOrderResult;
  timestamp: number;
}

/**
 * Cached gallery token data URLs
 */
interface GalleryCacheEntry {
  dataUrls: Map<string, string>;
  tokenCount: number;
  timestamp: number;
}

/**
 * Cached resolved character image URLs for night order
 * Key: characterId, Value: resolved URL
 */
interface CharacterImageCacheEntry {
  resolvedUrls: Map<string, string>;
  timestamp: number;
}

// ============================================================================
// Tab Pre-Render Service
// ============================================================================

/**
 * Unified service for tab hover pre-rendering.
 *
 * Provides a consistent API for pre-rendering data when users hover over tabs,
 * improving perceived performance when navigating between views.
 *
 * @example
 * ```typescript
 * // In TabNavigation component
 * const handleTabHover = (tabId: EditorTab) => {
 *   tabPreRenderService.preRenderTab(tabId, {
 *     characters,
 *     tokens,
 *     scriptMeta,
 *     generationOptions,
 *   });
 * };
 *
 * // In target view component
 * const cached = tabPreRenderService.getCachedNightOrder(scriptData);
 * if (cached) {
 *   // Use cached data immediately
 * }
 * ```
 */
export class TabPreRenderService {
  // Night order cache (lightweight data computation)
  private nightOrderCache: NightOrderCacheEntry | null = null;

  // Gallery token data URL cache
  private galleryCache: GalleryCacheEntry = {
    dataUrls: new Map(),
    tokenCount: 0,
    timestamp: 0,
  };

  // Character image URL cache (for night order)
  private characterImageCache: CharacterImageCacheEntry = {
    resolvedUrls: new Map(),
    timestamp: 0,
  };

  // Prevent concurrent gallery pre-rendering
  private isPreRenderingGallery = false;

  // Prevent concurrent character image pre-rendering
  private isPreRenderingCharacterImages = false;

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Pre-render data for a specific tab.
   * Call this on tab hover to warm caches.
   *
   * @param tab - Tab to pre-render for
   * @param context - Pre-render context with required data
   * @returns Result of pre-render operation
   */
  preRenderTab(tab: PreRenderableTab, context: TabPreRenderContext): TabPreRenderResult {
    CacheLogger.debug(`Pre-rendering tab: ${tab}`, {
      characterCount: context.characters.length,
      tokenCount: context.tokens.length,
    });

    switch (tab) {
      case 'characters':
        return this.preRenderCharacters(context);
      case 'tokens':
        return this.preRenderTokens(context);
      case 'script':
        return this.preRenderScript(context);
      default:
        return {
          success: false,
          tab,
          fromCache: false,
          itemCount: 0,
          error: `Unknown tab: ${tab}`,
        };
    }
  }

  /**
   * Get cached night order if available and valid.
   *
   * @param scriptData - Script data to validate cache against
   * @returns Cached night order or null if cache miss
   */
  getCachedNightOrder(scriptData: ScriptEntry[]): {
    firstNight: NightOrderResult;
    otherNight: NightOrderResult;
  } | null {
    if (!this.nightOrderCache) return null;

    const hash = this.hashScriptData(scriptData);
    if (this.nightOrderCache.hash !== hash) return null;

    return {
      firstNight: this.nightOrderCache.firstNight,
      otherNight: this.nightOrderCache.otherNight,
    };
  }

  /**
   * Get cached data URL for a token.
   *
   * @param filename - Token filename
   * @returns Data URL or undefined if not cached
   */
  getCachedTokenDataUrl(filename: string): string | undefined {
    return this.galleryCache.dataUrls.get(filename);
  }

  /**
   * Check if a token data URL is cached.
   *
   * @param filename - Token filename
   * @returns True if cached
   */
  hasTokenDataUrl(filename: string): boolean {
    return this.galleryCache.dataUrls.has(filename);
  }

  /**
   * Get cached resolved image URL for a character.
   * Used by NightOrderEntry to avoid async image resolution flash.
   *
   * @param characterId - Character ID
   * @returns Resolved URL or undefined if not cached
   */
  getCachedCharacterImageUrl(characterId: string): string | undefined {
    return this.characterImageCache.resolvedUrls.get(characterId);
  }

  /**
   * Check if a character image URL is cached.
   *
   * @param characterId - Character ID
   * @returns True if cached
   */
  hasCharacterImageUrl(characterId: string): boolean {
    return this.characterImageCache.resolvedUrls.has(characterId);
  }

  /**
   * Clear all tab pre-render caches.
   */
  clearAll(): void {
    this.nightOrderCache = null;
    this.galleryCache.dataUrls.clear();
    this.galleryCache.tokenCount = 0;
    this.characterImageCache.resolvedUrls.clear();
    CacheLogger.info('All tab pre-render caches cleared');
  }

  /**
   * Clear cache for a specific tab.
   *
   * @param tab - Tab to clear cache for
   */
  clearCache(tab: PreRenderableTab): void {
    switch (tab) {
      case 'script':
        this.nightOrderCache = null;
        this.characterImageCache.resolvedUrls.clear();
        break;
      case 'tokens':
        this.galleryCache.dataUrls.clear();
        this.galleryCache.tokenCount = 0;
        break;
      case 'characters':
        // Characters cache is managed by CacheManager
        cacheManager.clearCache('characters').catch(() => {});
        break;
    }
    CacheLogger.debug(`Cache cleared for tab: ${tab}`);
  }

  // ============================================================================
  // Private: Tab-Specific Pre-Render Methods
  // ============================================================================

  /**
   * Pre-render for Characters tab.
   * Delegates to CacheManager strategy system.
   */
  private preRenderCharacters(context: TabPreRenderContext): TabPreRenderResult {
    const { characters, generationOptions, lastSelectedCharacterUuid } = context;

    if (characters.length === 0 || !generationOptions) {
      return {
        success: true,
        tab: 'characters',
        fromCache: true,
        itemCount: 0,
      };
    }

    // Find character to pre-render (last selected or first)
    let characterToPreRender = characters[0];
    if (lastSelectedCharacterUuid) {
      const lastSelected = characters.find((c) => c.uuid === lastSelectedCharacterUuid);
      if (lastSelected) {
        characterToPreRender = lastSelected;
      }
    }

    // Delegate to CacheManager (async, fire-and-forget)
    cacheManager
      .preRender({
        type: 'characters-hover',
        tokens: [],
        characters: [characterToPreRender],
        generationOptions,
      })
      .catch((err) => {
        CacheLogger.warn('Characters pre-render failed', { error: err });
      });

    return {
      success: true,
      tab: 'characters',
      fromCache: false,
      itemCount: 1,
    };
  }

  /**
   * Pre-render for Tokens tab.
   * Encodes token canvases to data URLs.
   */
  private preRenderTokens(context: TabPreRenderContext): TabPreRenderResult {
    const { tokens } = context;
    const maxTokens = 20;

    if (tokens.length === 0) {
      return {
        success: true,
        tab: 'tokens',
        fromCache: true,
        itemCount: 0,
      };
    }

    // Prevent concurrent pre-rendering
    if (this.isPreRenderingGallery) {
      return {
        success: true,
        tab: 'tokens',
        fromCache: true,
        itemCount: this.galleryCache.dataUrls.size,
      };
    }

    this.isPreRenderingGallery = true;

    // Use requestIdleCallback for non-blocking encoding
    const encode = () => {
      let count = 0;
      for (const token of tokens) {
        if (count >= maxTokens) break;
        if (!token.canvas) continue;
        if (this.galleryCache.dataUrls.has(token.filename)) continue;

        // Encode and cache
        this.galleryCache.dataUrls.set(token.filename, token.canvas.toDataURL('image/png'));
        count++;
      }
      this.galleryCache.tokenCount = tokens.length;
      this.galleryCache.timestamp = Date.now();
      this.isPreRenderingGallery = false;
    };

    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number })
        .requestIdleCallback(encode, { timeout: 100 });
    } else {
      setTimeout(encode, 0);
    }

    return {
      success: true,
      tab: 'tokens',
      fromCache: false,
      itemCount: Math.min(tokens.length, maxTokens),
    };
  }

  /**
   * Pre-render for Script tab.
   * Builds night order data structures and preloads character images.
   */
  private preRenderScript(context: TabPreRenderContext): TabPreRenderResult {
    const { characters, scriptMeta } = context;

    if (characters.length === 0) {
      return {
        success: true,
        tab: 'script',
        fromCache: true,
        itemCount: 0,
      };
    }

    // Build script data array (matching ScriptView's format)
    const scriptData = scriptMeta ? [scriptMeta, ...characters] : characters;
    const hash = this.hashScriptData(scriptData);

    // Check cache
    if (this.nightOrderCache && this.nightOrderCache.hash === hash) {
      // Even if night order is cached, still preload images if needed
      this.preloadCharacterImages(characters);
      return {
        success: true,
        tab: 'script',
        fromCache: true,
        itemCount: this.nightOrderCache.firstNight.entries.length,
      };
    }

    // Build and cache
    const firstNight = buildNightOrder(scriptData, 'first');
    const otherNight = buildNightOrder(scriptData, 'other');

    this.nightOrderCache = {
      hash,
      firstNight,
      otherNight,
      timestamp: Date.now(),
    };

    // Preload character images for instant display
    this.preloadCharacterImages(characters);

    return {
      success: true,
      tab: 'script',
      fromCache: false,
      itemCount: firstNight.entries.length,
    };
  }

  /**
   * Preload character images for night order display.
   * Resolves image URLs and caches them for instant access.
   */
  private preloadCharacterImages(characters: Character[]): void {
    // Prevent concurrent preloading
    if (this.isPreRenderingCharacterImages) return;
    this.isPreRenderingCharacterImages = true;

    // Filter characters that need image resolution
    const toResolve = characters.filter((c) => !this.characterImageCache.resolvedUrls.has(c.id));

    if (toResolve.length === 0) {
      this.isPreRenderingCharacterImages = false;
      return;
    }

    CacheLogger.debug(`Preloading ${toResolve.length} character images for night order`);

    // Resolve images asynchronously (fire-and-forget)
    const resolveAll = async () => {
      for (const character of toResolve) {
        try {
          // Normalize image to string (handle arrays and AssetReference)
          const imageUrl = Array.isArray(character.image)
            ? character.image[0]
            : typeof character.image === 'object' && character.image !== null
              ? (character.image as { url?: string }).url || ''
              : character.image;

          if (!imageUrl || typeof imageUrl !== 'string') continue;

          const result = await resolveCharacterImageUrl(imageUrl, character.id, {
            logContext: 'TabPreRenderService',
          });
          this.characterImageCache.resolvedUrls.set(character.id, result.url);
        } catch {
          // Fallback to original image URL on error (extract first valid URL)
          const fallbackUrl = Array.isArray(character.image)
            ? character.image[0]
            : typeof character.image === 'string'
              ? character.image
              : '';
          if (fallbackUrl && typeof fallbackUrl === 'string') {
            this.characterImageCache.resolvedUrls.set(character.id, fallbackUrl);
          }
        }
      }
      this.characterImageCache.timestamp = Date.now();
      this.isPreRenderingCharacterImages = false;
      CacheLogger.debug(`Finished preloading ${toResolve.length} character images`);
    };

    // Use requestIdleCallback for non-blocking resolution
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => number })
        .requestIdleCallback(() => { resolveAll(); }, { timeout: 200 });
    } else {
      setTimeout(resolveAll, 0);
    }
  }

  // ============================================================================
  // Private: Hash Utilities
  // ============================================================================

  /**
   * Hash script data for cache key validation.
   */
  private hashScriptData(scriptData: ScriptEntry[]): string {
    return hashArray(scriptData, (entry) =>
      typeof entry === 'string' ? entry : isCharacter(entry) ? entry.id : '_meta'
    );
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global tab pre-render service singleton.
 *
 * @example
 * ```typescript
 * import { tabPreRenderService } from '@/ts/cache/TabPreRenderService.js';
 *
 * // Pre-render on tab hover
 * tabPreRenderService.preRenderTab('script', {
 *   characters,
 *   tokens,
 *   scriptMeta,
 * });
 *
 * // Get cached data
 * const cached = tabPreRenderService.getCachedNightOrder(scriptData);
 * ```
 */
export const tabPreRenderService = new TabPreRenderService();

export default tabPreRenderService;
