/**
 * useProjectCacheWarming Hook
 *
 * Manages cache warming when projects change.
 * Extracted from ProjectContext to follow Single Responsibility Principle.
 *
 * @module hooks/cache/useProjectCacheWarming
 */

import { useEffect } from 'react';
import { warmingPolicyManager } from '@/ts/cache/index.js';
import type { Project } from '@/ts/types/project.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Schedule a task to run during idle time
 */
function scheduleIdleTask(task: () => Promise<void>): void {
  if ('requestIdleCallback' in window) {
    (
      window as Window & {
        requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void;
      }
    ).requestIdleCallback(() => void task(), { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => void task(), 100);
  }
}

/**
 * Hook for warming caches when a project changes
 *
 * Automatically warms caches in the background when a new project is loaded,
 * improving performance for subsequent operations.
 *
 * @param project - Current project (null if no project loaded)
 *
 * @example
 * ```tsx
 * function ProjectProvider({ children }) {
 *   const [currentProject, setCurrentProject] = useState<Project | null>(null);
 *
 *   // Automatically warm caches when project changes
 *   useProjectCacheWarming(currentProject);
 *
 *   return (
 *     <ProjectContext.Provider value={{currentProject, setCurrentProject}}>
 *       {children}
 *     </ProjectContext.Provider>
 *   );
 * }
 * ```
 */
export function useProjectCacheWarming(project: Project | null): void {
  useEffect(() => {
    if (!project) {
      logger.debug('useProjectCacheWarming', 'No project to warm');
      return;
    }

    logger.info('useProjectCacheWarming', 'Starting cache warming', {
      projectId: project.id,
      projectName: project.name,
    });

    // Extract characters and tokens from project state
    const characters = project.state?.characters || [];
    const tokens = project.state?.tokens || [];

    // Warm caches in the background (non-blocking)
    const warmCaches = async () => {
      try {
        logger.debug('useProjectCacheWarming', 'Warming caches for project', {
          projectId: project.id,
          characterCount: characters.length,
          tokenCount: tokens.length,
        });

        await warmingPolicyManager.warm(
          {
            projectId: project.id,
            characters,
            tokens,
          },
          (policy, loaded, total, message) => {
            logger.debug('useProjectCacheWarming', `Warming progress - ${policy}`, {
              loaded,
              total,
              progress: total > 0 ? Math.round((loaded / total) * 100) : 0,
              message,
            });
          }
        );

        logger.info('useProjectCacheWarming', 'Cache warming complete', {
          projectId: project.id,
        });
      } catch (error) {
        logger.warn('useProjectCacheWarming', 'Cache warming failed', error);
      }
    };

    // Run warming during idle time to avoid blocking UI
    scheduleIdleTask(warmCaches);

    // Cleanup function (optional - caches will be cleared when project changes)
    return () => {
      logger.debug(
        'useProjectCacheWarming',
        'Project changed, previous warming cancelled if still running'
      );
    };
  }, [project]);
}

export default useProjectCacheWarming;
