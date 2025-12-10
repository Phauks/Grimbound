/**
 * Pre-Render Cache Context - React integration for cache system.
 * Provides cache manager instance to all components via context.
 */

import { createContext, useContext, useMemo, ReactNode, useEffect } from 'react'
import {
  PreRenderCacheManager,
  LRUCacheAdapter,
  LRUEvictionPolicy,
  GalleryPreRenderStrategy,
  CustomizePreRenderStrategy,
  ProjectPreRenderStrategy
} from '../ts/cache/index.js'

/**
 * Context value type.
 */
export type PreRenderCacheContextValue = PreRenderCacheManager | null

/**
 * React context for pre-render cache manager.
 */
const PreRenderCacheContext = createContext<PreRenderCacheContextValue>(null)

/**
 * Props for PreRenderCacheProvider.
 */
export interface PreRenderCacheProviderProps {
  children: ReactNode
}

/**
 * Provider component that initializes and provides cache manager.
 * Wrap your app with this to enable pre-rendering caching.
 */
export function PreRenderCacheProvider({ children }: PreRenderCacheProviderProps) {
  const manager = useMemo(() => {
    const mgr = new PreRenderCacheManager()

    // ===== Gallery Cache =====
    const galleryCache = new LRUCacheAdapter<string, string>({
      maxSize: 50,  // First 50 tokens
      maxMemory: 25_000_000,  // 25MB (~52 data URLs)
      evictionPolicy: new LRUEvictionPolicy({
        maxSize: 50,
        maxMemory: 25_000_000,
        evictionRatio: 0.2  // Evict 20% (10 tokens) at a time
      })
    })
    mgr.registerCache('gallery', galleryCache)
    mgr.registerStrategy(new GalleryPreRenderStrategy(galleryCache, {
      maxTokens: 20,
      maxConcurrent: 5,
      useWorkers: true,  // Enable Web Workers (auto-detects OffscreenCanvas support)
      useIdleCallback: true,
      encodingQuality: 0.92
    }))

    // ===== Customize Cache =====
    const customizeCache = new LRUCacheAdapter({
      maxSize: 5,  // 5 character sets
      maxMemory: 10_000_000,  // 10MB
      evictionPolicy: new LRUEvictionPolicy({
        maxSize: 5,
        maxMemory: 10_000_000,
        evictionRatio: 0.4  // Evict 40% (2 entries) at a time
      })
    })
    mgr.registerCache('customize', customizeCache)
    mgr.registerStrategy(new CustomizePreRenderStrategy(customizeCache, {
      includeReminders: true
    }))

    // ===== Project Cache =====
    const projectCache = new LRUCacheAdapter({
      maxSize: 20,  // 20 projects
      maxMemory: 5_000_000,  // 5MB
      evictionPolicy: new LRUEvictionPolicy({
        maxSize: 20,
        maxMemory: 5_000_000,
        evictionRatio: 0.3  // Evict 30% (6 entries) at a time
      })
    })
    mgr.registerCache('project', projectCache)
    mgr.registerStrategy(new ProjectPreRenderStrategy(projectCache, {
      abortOnUnhover: true
    }))

    return mgr
  }, [])

  // Set up event listeners for debugging (optional, remove in production)
  useEffect(() => {
    if (import.meta.env.DEV) {
      const handlePreRenderStart = (event: any) => {
        console.log(`[Cache] Pre-render started:`, event.strategy)
      }

      const handlePreRenderComplete = (event: any) => {
        console.log(`[Cache] Pre-render complete:`, event.strategy, event.result)
      }

      const handlePreRenderError = (event: any) => {
        console.error(`[Cache] Pre-render error:`, event.strategy, event.error)
      }

      manager.on('prerender:start', handlePreRenderStart)
      manager.on('prerender:complete', handlePreRenderComplete)
      manager.on('prerender:error', handlePreRenderError)

      return () => {
        manager.off('prerender:start', handlePreRenderStart)
        manager.off('prerender:complete', handlePreRenderComplete)
        manager.off('prerender:error', handlePreRenderError)
      }
    }
  }, [manager])

  return (
    <PreRenderCacheContext.Provider value={manager}>
      {children}
    </PreRenderCacheContext.Provider>
  )
}

/**
 * Hook to access the cache manager.
 * @throws Error if used outside PreRenderCacheProvider
 * @returns Cache manager instance
 */
export function usePreRenderCacheManager(): PreRenderCacheManager {
  const manager = useContext(PreRenderCacheContext)

  if (!manager) {
    throw new Error(
      'usePreRenderCacheManager must be used within PreRenderCacheProvider'
    )
  }

  return manager
}
