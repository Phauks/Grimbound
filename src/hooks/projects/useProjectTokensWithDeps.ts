/**
 * useProjectTokensWithDeps - Production wrapper with lazy-loaded dependencies
 *
 * This is separated from useProjectTokens.ts to avoid vitest memory issues.
 * The dynamic imports here won't affect tests that only import the core hook.
 *
 * @module hooks/projects/useProjectTokensWithDeps
 */

import { useEffect, useState } from 'react';
import {
  type UseProjectTokensDeps,
  type UseProjectTokensResult,
  useProjectTokens,
} from './useProjectTokens.js';

/**
 * Options for the production wrapper hook (deps not needed).
 */
export type { UseProjectTokensWithDepsOptions } from './useProjectTokens.js';

import type { UseProjectTokensWithDepsOptions } from './useProjectTokens.js';

// Cached deps to avoid reloading on every render
let cachedDeps: UseProjectTokensDeps | null = null;
let loadPromise: Promise<UseProjectTokensDeps> | null = null;

async function loadDeps(): Promise<UseProjectTokensDeps> {
  if (cachedDeps) return cachedDeps;
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all([
    import('@/ts/generation/batchGenerator.js'),
    import('@/ts/utils/logger.js'),
  ]).then(([{ generateAllTokens }, { logger }]): UseProjectTokensDeps => {
    const deps: UseProjectTokensDeps = { generateAllTokens, logger };
    cachedDeps = deps;
    return deps;
  });

  return loadPromise;
}

// No-op deps that do nothing (used while loading)
const noOpDeps: UseProjectTokensDeps = {
  generateAllTokens: async () => [],
  logger: { error: () => {} },
};

/**
 * Production wrapper for useProjectTokens that handles lazy loading of dependencies.
 * Use this in components - it handles the DI automatically.
 *
 * @example
 * ```tsx
 * const { displayTokens, isGenerating } = useProjectTokensWithDeps({
 *   project,
 *   isActiveProject,
 *   displayMode,
 *   contextTokens: tokens,
 *   setContextTokens: setTokens,
 * });
 * ```
 */
export function useProjectTokensWithDeps(
  options: UseProjectTokensWithDepsOptions
): UseProjectTokensResult {
  const [deps, setDeps] = useState<UseProjectTokensDeps>(cachedDeps ?? noOpDeps);

  // Load deps on mount (only once due to caching)
  useEffect(() => {
    if (!cachedDeps) {
      loadDeps().then(setDeps);
    }
  }, []);

  // Always call the hook (satisfies React hook rules)
  return useProjectTokens({ ...options, deps });
}
