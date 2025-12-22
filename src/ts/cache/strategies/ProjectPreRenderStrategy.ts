/**
 * Project pre-rendering strategy.
 * Pre-renders script name tokens when hovering over projects.
 */

import type {
  ICacheStrategy,
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
} from '@/ts/cache/core/index.js';
import type { Token } from '@/ts/types/index.js';

/**
 * Configuration options for project pre-rendering.
 */
export interface ProjectStrategyOptions {
  /** Allow aborting if user hovers away (default: true) */
  abortOnUnhover: boolean;
}

/**
 * Domain Service: Project pre-rendering strategy.
 * Pre-renders script name tokens for project cards on hover.
 */
export class ProjectPreRenderStrategy implements IPreRenderStrategy {
  readonly name = 'project';
  readonly priority = 3;

  private abortControllers = new Map<string, AbortController>();

  constructor(
    private cache: ICacheStrategy<string, Token>, // Key: projectId, Value: script-name token
    private options: ProjectStrategyOptions = {
      abortOnUnhover: true,
    }
  ) {}

  shouldTrigger(context: PreRenderContext): boolean {
    return (
      context.type === 'project-hover' && context.projectId != null && context.tokens.length > 0
    );
  }

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    const { projectId, tokens } = context;

    if (!projectId) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'Missing project ID',
      };
    }

    // Check if already cached
    if (this.cache.has(projectId)) {
      return {
        success: true,
        rendered: 0,
        skipped: 1,
        metadata: {
          strategy: this.name,
          cached: true,
          projectId,
        },
      };
    }

    // Find script-name token
    const scriptNameToken = tokens.find((t) => t.type === 'script-name');
    if (!scriptNameToken) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'No script-name token found',
      };
    }

    try {
      // Set up abort controller if configured
      let abortController: AbortController | undefined;
      if (this.options.abortOnUnhover) {
        // Cancel any existing render for this project
        this.cancelRender(projectId);

        abortController = new AbortController();
        this.abortControllers.set(projectId, abortController);
      }

      // Store token in cache
      await this.cache.set(projectId, scriptNameToken);

      // Clean up abort controller
      if (abortController) {
        this.abortControllers.delete(projectId);
      }

      return {
        success: true,
        rendered: 1,
        skipped: 0,
        metadata: {
          strategy: this.name,
          projectId,
          tokenType: scriptNameToken.type,
          cacheStats: this.cache.getStats(),
        },
      };
    } catch (error) {
      // Clean up abort controller on error
      this.abortControllers.delete(projectId);

      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get pre-rendered script name token for a project.
   * @param projectId - Project ID
   * @returns Cached token or null
   */
  async getPreRendered(projectId: string): Promise<Token | null> {
    const entry = await this.cache.get(projectId);
    return entry?.value ?? null;
  }

  /**
   * Cancel ongoing render for a project (when user hovers away).
   * @param projectId - Project ID
   */
  cancelRender(projectId: string): void {
    const controller = this.abortControllers.get(projectId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(projectId);
    }
  }

  /**
   * Clear all abort controllers (cleanup).
   */
  clearAllAbortControllers(): void {
    for (const [_projectId, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}
