/**
 * Cache Warming Policies
 *
 * Configurable strategies for proactively warming caches to improve
 * perceived performance. Policies determine when and what to warm based
 * on application context.
 *
 * Architecture: Strategy Pattern (Domain Services)
 */

import { assetStorageService } from '@/ts/services/upload/AssetStorageService.js';
import type { Character, Token } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import { cacheManager } from '@/ts/cache/CacheManager.js';
import type { PreRenderContext } from '@/ts/cache/core/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Application context for determining warming strategy
 */
export interface AppContext {
  /** Current route/page */
  route?: string;
  /** Active project ID */
  projectId?: string;
  /** Script characters */
  characters?: Character[];
  /** Tokens to display */
  tokens?: Token[];
  /** Whether user is idle */
  isIdle?: boolean;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Warming policy interface
 */
export interface WarmingPolicy {
  /** Policy name for logging */
  name: string;

  /** Priority (higher = executed first) */
  priority: number;

  /**
   * Determine if this policy should execute for given context
   * @param context - Application context
   * @returns True if policy should warm caches
   */
  shouldWarm(context: AppContext): boolean;

  /**
   * Execute cache warming
   * @param context - Application context
   * @param onProgress - Optional progress callback (loaded, total, message)
   * @returns Promise that resolves when warming complete
   */
  warm(
    context: AppContext,
    onProgress?: (loaded: number, total: number, message?: string) => void
  ): Promise<void>;
}

/**
 * Result of warming operation
 */
export interface WarmingResult {
  policy: string;
  duration: number;
  itemsWarmed: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// Project Open Warming Policy
// ============================================================================

/**
 * Warms caches when a project is opened.
 *
 * Strategy:
 * 1. Load official character images for all characters in project script
 * 2. Load project-specific custom assets (backgrounds, logos)
 * 3. Pre-render first 10 tokens (most likely to be viewed immediately)
 *
 * Runs during idle time to avoid blocking UI interactions.
 */
export class ProjectOpenWarmingPolicy implements WarmingPolicy {
  name = 'project-open';
  priority = 100;

  constructor(
    private options: {
      /** Max characters to warm images for (default: 50) */
      maxCharacters?: number;
      /** Max tokens to pre-render (default: 10) */
      maxTokensToPreRender?: number;
      /** Whether to use idle callback (default: true) */
      useIdleCallback?: boolean;
    } = {}
  ) {}

  shouldWarm(context: AppContext): boolean {
    // Warm when project is opened and has characters
    return !!(context.projectId && context.characters && context.characters.length > 0);
  }

  async warm(
    context: AppContext,
    onProgress?: (loaded: number, total: number, message?: string) => void
  ): Promise<void> {
    const { characters = [], tokens = [], projectId } = context;
    const maxCharacters = this.options.maxCharacters ?? 50;
    const maxTokensToPreRender = this.options.maxTokensToPreRender ?? 10;

    let totalSteps = 0;
    let completedSteps = 0;

    // Calculate total steps
    const charactersToWarm = characters.slice(0, maxCharacters);
    const tokensToPreRender = tokens.slice(0, maxTokensToPreRender);

    totalSteps =
      charactersToWarm.length + (projectId ? 1 : 0) + (tokensToPreRender.length > 0 ? 1 : 0);

    const updateProgress = (message?: string) => {
      completedSteps++;
      onProgress?.(completedSteps, totalSteps, message);
    };

    // Step 1: Warm character images
    logger.debug('WarmingPolicy', '[ProjectOpen] Warming character images...', {
      count: charactersToWarm.length,
    });

    const imageUrls = charactersToWarm
      .map((char) => {
        if (Array.isArray(char.image)) {
          return char.image[0]; // Use first image if multiple
        }
        return char.image;
      })
      .filter(Boolean) as string[];

    if (imageUrls.length > 0) {
      await cacheManager.preloadImages(imageUrls, false, (loaded, total) => {
        if (loaded === total) {
          updateProgress(`Loaded ${total} character images`);
        }
      });
    }

    // Step 2: Load project-specific custom assets (if project ID provided)
    if (projectId) {
      logger.debug('WarmingPolicy', '[ProjectOpen] Loading project assets...', { projectId });

      try {
        const assets = await assetStorageService.list({
          projectId,
          type: ['character-icon', 'token-background', 'logo'],
        });

        if (assets.length > 0) {
          const assetUrls = await Promise.all(
            assets.map(async (asset) => {
              const url = await assetStorageService.getAssetUrl(asset.id);
              return url;
            })
          );

          const validUrls = assetUrls.filter(Boolean) as string[];
          if (validUrls.length > 0) {
            await cacheManager.preloadImages(validUrls);
          }
        }

        updateProgress(`Loaded ${assets.length} project assets`);
      } catch (error) {
        logger.warn('WarmingPolicy', '[ProjectOpen] Failed to load project assets:', error);
        updateProgress('Failed to load project assets');
      }
    }

    // Step 3: Pre-render first N tokens (most likely to be viewed)
    if (tokensToPreRender.length > 0) {
      logger.debug('WarmingPolicy', '[ProjectOpen] Pre-rendering tokens...', {
        count: tokensToPreRender.length,
      });

      const preRenderContext: PreRenderContext = {
        type: 'project-open',
        tokens: tokensToPreRender,
        characters,
        projectId,
      };

      try {
        const result = await cacheManager.preRender(preRenderContext);
        updateProgress(`Pre-rendered ${result.rendered} tokens`);
      } catch (error) {
        logger.warn('WarmingPolicy', '[ProjectOpen] Failed to pre-render tokens:', error);
        updateProgress('Failed to pre-render tokens');
      }
    }

    logger.debug('WarmingPolicy', '[ProjectOpen] Warming complete');
  }
}

// ============================================================================
// App Start Warming Policy
// ============================================================================

/**
 * Warms caches when the application first loads.
 *
 * Strategy:
 * 1. Warm most commonly used official character images (e.g., trouble brewing characters)
 * 2. Pre-resolve cached assets from IndexedDB to object URLs
 *
 * Runs during idle time after initial app load to avoid blocking rendering.
 */
export class AppStartWarmingPolicy implements WarmingPolicy {
  name = 'app-start';
  priority = 50;

  constructor(
    private options: {
      /** Common character images to warm (default: trouble brewing) */
      commonCharacters?: string[];
      /** Max assets to pre-resolve (default: 20) */
      maxAssetsToResolve?: number;
    } = {}
  ) {}

  shouldWarm(context: AppContext): boolean {
    // Only warm on app start (no route or route is root)
    return !context.route || context.route === '/' || context.route === '';
  }

  async warm(
    _context: AppContext,
    onProgress?: (loaded: number, total: number, message?: string) => void
  ): Promise<void> {
    const totalSteps = 2; // character images + asset resolution
    let completedSteps = 0;

    const updateProgress = (message?: string) => {
      completedSteps++;
      onProgress?.(completedSteps, totalSteps, message);
    };

    // Step 1: Warm common character images (Trouble Brewing by default)
    const commonCharacters = this.options.commonCharacters ?? [
      'icons/washerwoman.webp',
      'icons/librarian.webp',
      'icons/investigator.webp',
      'icons/chef.webp',
      'icons/empath.webp',
      'icons/fortuneteller.webp',
      'icons/undertaker.webp',
      'icons/monk.webp',
      'icons/ravenkeeper.webp',
      'icons/virgin.webp',
      'icons/slayer.webp',
      'icons/soldier.webp',
      'icons/mayor.webp',
      'icons/butler.webp',
      'icons/drunk.webp',
      'icons/recluse.webp',
      'icons/saint.webp',
      'icons/poisoner.webp',
      'icons/spy.webp',
      'icons/scarletwoman.webp',
      'icons/baron.webp',
      'icons/imp.webp',
    ];

    logger.debug('WarmingPolicy', '[AppStart] Warming common character images...', {
      count: commonCharacters.length,
    });

    try {
      await cacheManager.preloadImages(commonCharacters, false, (loaded, total) => {
        if (loaded === total) {
          updateProgress(`Loaded ${total} common characters`);
        }
      });
    } catch (error) {
      logger.warn('WarmingPolicy', '[AppStart] Failed to warm character images:', error);
      updateProgress('Failed to load character images');
    }

    // Step 2: Pre-resolve recently used assets from IndexedDB
    const maxAssets = this.options.maxAssetsToResolve ?? 20;

    logger.debug('WarmingPolicy', '[AppStart] Pre-resolving cached assets...', {
      maxAssets,
    });

    try {
      const recentAssets = await assetStorageService.list({
        limit: maxAssets,
        sortBy: 'lastUsedAt',
        sortDirection: 'desc',
      });

      if (recentAssets.length > 0) {
        // Pre-generate object URLs for most recently used assets
        const urls = await Promise.all(
          recentAssets.map(async (asset) => {
            try {
              return await assetStorageService.getAssetUrl(asset.id);
            } catch {
              return null;
            }
          })
        );

        const validUrls = urls.filter(Boolean);
        updateProgress(`Pre-resolved ${validUrls.length} cached assets`);
      } else {
        updateProgress('No cached assets to resolve');
      }
    } catch (error) {
      logger.warn('WarmingPolicy', '[AppStart] Failed to pre-resolve assets:', error);
      updateProgress('Failed to resolve cached assets');
    }

    logger.debug('WarmingPolicy', '[AppStart] Warming complete');
  }
}

// ============================================================================
// Warming Policy Manager
// ============================================================================

/**
 * Manages and executes warming policies based on application context.
 */
export class WarmingPolicyManager {
  private policies: WarmingPolicy[] = [];

  /**
   * Register a warming policy.
   *
   * @param policy - Warming policy to register
   */
  register(policy: WarmingPolicy): void {
    this.policies.push(policy);
    // Sort by priority (highest first)
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unregister a warming policy by name.
   *
   * @param name - Policy name to remove
   */
  unregister(name: string): void {
    this.policies = this.policies.filter((p) => p.name !== name);
  }

  /**
   * Execute warming policies for given context.
   *
   * @param context - Application context
   * @param onProgress - Optional progress callback
   * @returns Array of warming results
   *
   * @example
   * ```typescript
   * const results = await warmingManager.warm({
   *   projectId: 'project-123',
   *   characters: allCharacters,
   *   tokens: allTokens
   * })
   *
   * results.forEach(result => {
   *   console.log(`${result.policy}: ${result.itemsWarmed} items in ${result.duration}ms`)
   * })
   * ```
   */
  async warm(
    context: AppContext,
    onProgress?: (policy: string, loaded: number, total: number, message?: string) => void
  ): Promise<WarmingResult[]> {
    const results: WarmingResult[] = [];

    // Find policies that should warm for this context
    const applicablePolicies = this.policies.filter((p) => p.shouldWarm(context));

    if (applicablePolicies.length === 0) {
      logger.debug('WarmingPolicyManager', 'No applicable policies for context', context);
      return results;
    }

    logger.debug('WarmingPolicyManager', 'Executing warming policies', {
      policies: applicablePolicies.map((p) => p.name),
    });

    // Execute policies in priority order
    for (const policy of applicablePolicies) {
      const startTime = Date.now();
      let itemsWarmed = 0;

      try {
        await policy.warm(context, (loaded, total, message) => {
          itemsWarmed = loaded;
          onProgress?.(policy.name, loaded, total, message);
        });

        results.push({
          policy: policy.name,
          duration: Date.now() - startTime,
          itemsWarmed,
          success: true,
        });
      } catch (error) {
        logger.error('WarmingPolicyManager', `Policy '${policy.name}' failed:`, error);
        results.push({
          policy: policy.name,
          duration: Date.now() - startTime,
          itemsWarmed,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.debug('WarmingPolicyManager', 'Warming complete', { results });
    return results;
  }

  /**
   * Get registered policy names.
   */
  getPolicyNames(): string[] {
    return this.policies.map((p) => p.name);
  }

  /**
   * Check if a policy is registered.
   *
   * @param name - Policy name
   * @returns True if policy is registered
   */
  hasPolicy(name: string): boolean {
    return this.policies.some((p) => p.name === name);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global warming policy manager singleton.
 * Pre-registered with default policies (app-start, project-open).
 */
export const warmingPolicyManager = new WarmingPolicyManager();

// Register default policies
warmingPolicyManager.register(new AppStartWarmingPolicy());
warmingPolicyManager.register(new ProjectOpenWarmingPolicy());

export default warmingPolicyManager;
