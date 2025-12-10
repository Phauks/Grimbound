# Pre-Rendering Refactoring: Code Examples

> **Concrete implementations** demonstrating the proposed architecture in action.

---

## 📦 Example 1: Core Interfaces

### `src/ts/cache/core/interfaces.ts`

```typescript
/**
 * Port: Main cache interface that all adapters must implement.
 * This is the hexagon's "port" - defines the contract without implementation.
 */
export interface ICacheStrategy<K = string, V = any> {
  /**
   * Retrieve cached value by key.
   * @returns Cached entry or null if not found/expired
   */
  get(key: K): Promise<CacheEntry<V> | null>

  /**
   * Store value in cache with optional metadata.
   */
  set(key: K, value: V, options?: CacheOptions): Promise<void>

  /**
   * Check if key exists in cache (without retrieving).
   * Synchronous for performance - useful for quick checks before async get().
   */
  has(key: K): boolean

  /**
   * Remove specific entry from cache.
   */
  delete(key: K): Promise<void>

  /**
   * Clear all entries from cache.
   */
  clear(): Promise<void>

  /**
   * Get cache statistics for observability.
   */
  getStats(): CacheStats

  /**
   * Manually trigger eviction if needed.
   * @returns Number of entries evicted
   */
  evict(): Promise<number>

  /**
   * Get all keys currently in cache (for debugging/inspection).
   */
  keys(): K[]
}

/**
 * Port: Eviction policy interface.
 * Separates "when to evict" logic from "what to evict" logic.
 */
export interface IEvictionPolicy {
  /**
   * Determine if cache should evict entries based on current stats.
   */
  shouldEvict(stats: CacheStats): boolean

  /**
   * Select which entries to evict.
   * @returns Array of keys to remove
   */
  selectVictims<V>(entries: Map<string, CacheEntry<V>>): string[]

  /**
   * Notify policy that an entry was accessed (for LRU tracking).
   */
  recordAccess(key: string): void

  /**
   * Notify policy that an entry was inserted (for size tracking).
   */
  recordInsertion(key: string, size: number): void

  /**
   * Notify policy that an entry was removed.
   */
  recordRemoval(key: string): void

  /**
   * Reset policy state.
   */
  reset(): void
}

/**
 * Port: Pre-render strategy interface.
 * Defines how tokens should be pre-rendered for different contexts.
 */
export interface IPreRenderStrategy {
  /**
   * Unique identifier for this strategy.
   */
  readonly name: string

  /**
   * Pre-render tokens based on strategy-specific logic.
   * @param context - Strategy-specific context (tokens, options, etc.)
   * @returns Promise resolving to pre-rendered results
   */
  preRender(context: PreRenderContext): Promise<PreRenderResult>

  /**
   * Check if strategy should trigger for given context.
   */
  shouldTrigger(context: PreRenderContext): boolean

  /**
   * Priority for strategy execution (higher = execute first).
   */
  readonly priority: number
}
```

---

## 📦 Example 2: LRU Cache Adapter

### `src/ts/cache/adapters/LRUCacheAdapter.ts`

```typescript
import type {
  ICacheStrategy,
  IEvictionPolicy,
  CacheEntry,
  CacheStats,
  CacheOptions
} from '../core/interfaces.js'
import { estimateSize } from '../utils/memoryEstimator.js'

/**
 * Adapter: LRU cache implementation using Map.
 * Implements ICacheStrategy port with automatic eviction.
 */
export class LRUCacheAdapter<K = string, V = any> implements ICacheStrategy<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private stats: CacheStats = {
    size: 0,
    memoryUsage: 0,
    maxSize: undefined,
    maxMemory: undefined,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0
  }

  constructor(
    private options: {
      maxSize?: number          // Max entries (default: unlimited)
      maxMemory?: number        // Max bytes (default: unlimited)
      evictionPolicy: IEvictionPolicy
    }
  ) {
    this.stats.maxSize = options.maxSize
    this.stats.maxMemory = options.maxMemory
  }

  async get(key: K): Promise<CacheEntry<V> | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.missCount++
      this.updateHitRate()
      return null
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      await this.delete(key)
      this.stats.missCount++
      this.updateHitRate()
      return null
    }

    // Update access tracking
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.options.evictionPolicy.recordAccess(String(key))

    this.stats.hitCount++
    this.updateHitRate()

    return entry
  }

  async set(key: K, value: V, options?: CacheOptions): Promise<void> {
    const size = estimateSize(value)
    const entry: CacheEntry<V> = {
      value,
      key: String(key),
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl: options?.ttl,
      metadata: options?.metadata
    }

    // If key exists, subtract old size from stats
    const existingEntry = this.cache.get(key)
    if (existingEntry) {
      this.stats.memoryUsage -= existingEntry.size
      this.stats.size--
    }

    this.cache.set(key, entry)
    this.stats.size++
    this.stats.memoryUsage += size

    this.options.evictionPolicy.recordInsertion(String(key), size)

    // Auto-evict if needed
    if (this.options.evictionPolicy.shouldEvict(this.stats)) {
      await this.evict()
    }
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check expiration
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      // Don't await - let next get() handle it
      this.delete(key).catch(console.error)
      return false
    }

    return true
  }

  async delete(key: K): Promise<void> {
    const entry = this.cache.get(key)
    if (!entry) return

    this.cache.delete(key)
    this.stats.size--
    this.stats.memoryUsage -= entry.size
    this.options.evictionPolicy.recordRemoval(String(key))
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.stats.size = 0
    this.stats.memoryUsage = 0
    this.stats.evictionCount = 0
    this.options.evictionPolicy.reset()
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  async evict(): Promise<number> {
    const victims = this.options.evictionPolicy.selectVictims(this.cache)

    for (const key of victims) {
      await this.delete(key as K)
    }

    this.stats.evictionCount += victims.length
    return victims.length
  }

  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0
  }
}
```

---

## 📦 Example 3: LRU Eviction Policy

### `src/ts/cache/policies/LRUEvictionPolicy.ts`

```typescript
import type { IEvictionPolicy, CacheStats, CacheEntry } from '../core/interfaces.js'

/**
 * Adapter: LRU (Least Recently Used) eviction policy.
 * Evicts entries that haven't been accessed recently.
 */
export class LRUEvictionPolicy implements IEvictionPolicy {
  private accessOrder = new Map<string, number>()  // key -> last access timestamp
  private accessCounter = 0

  constructor(
    private options: {
      maxSize?: number        // Evict when entries exceed this
      maxMemory?: number      // Evict when bytes exceed this
      evictionRatio?: number  // Percent of cache to evict (default: 0.1 = 10%)
    }
  ) {
    this.options.evictionRatio ??= 0.1
  }

  shouldEvict(stats: CacheStats): boolean {
    if (this.options.maxSize && stats.size >= this.options.maxSize) {
      return true
    }

    if (this.options.maxMemory && stats.memoryUsage >= this.options.maxMemory) {
      return true
    }

    return false
  }

  selectVictims<V>(entries: Map<string, CacheEntry<V>>): string[] {
    // Calculate how many to evict (default 10% of cache)
    const targetEvictions = Math.ceil(entries.size * this.options.evictionRatio!)

    // Sort entries by last accessed time (oldest first)
    const sorted = Array.from(entries.entries())
      .sort((a, b) => {
        const aTime = this.accessOrder.get(a[0]) ?? 0
        const bTime = this.accessOrder.get(b[0]) ?? 0
        return aTime - bTime
      })

    // Return oldest N entries
    return sorted.slice(0, targetEvictions).map(([key]) => key)
  }

  recordAccess(key: string): void {
    this.accessOrder.set(key, ++this.accessCounter)
  }

  recordInsertion(key: string, size: number): void {
    this.accessOrder.set(key, ++this.accessCounter)
  }

  recordRemoval(key: string): void {
    this.accessOrder.delete(key)
  }

  reset(): void {
    this.accessOrder.clear()
    this.accessCounter = 0
  }
}
```

---

## 📦 Example 4: Gallery Pre-Render Strategy

### `src/ts/cache/strategies/GalleryPreRenderStrategy.ts`

```typescript
import type {
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
  ICacheStrategy
} from '../core/interfaces.js'
import type { Token } from '../../types/index.js'

/**
 * Domain Service: Gallery pre-rendering strategy.
 * Pre-renders first N tokens as data URLs for instant display.
 */
export class GalleryPreRenderStrategy implements IPreRenderStrategy {
  readonly name = 'gallery'
  readonly priority = 1

  constructor(
    private cache: ICacheStrategy<string, string>,  // Key: filename, Value: dataURL
    private options: {
      maxTokens: number
      useIdleCallback: boolean
      encodingQuality: number
    } = {
      maxTokens: 20,
      useIdleCallback: true,
      encodingQuality: 0.92
    }
  ) {}

  shouldTrigger(context: PreRenderContext): boolean {
    return (
      context.type === 'gallery-hover' &&
      context.tokens.length > 0
    )
  }

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    const { tokens } = context
    const tokensToRender = tokens.slice(0, this.options.maxTokens)
    const results: Record<string, string> = {}
    let rendered = 0
    let skipped = 0

    for (const token of tokensToRender) {
      // Skip if already cached
      if (this.cache.has(token.filename)) {
        skipped++
        continue
      }

      // Skip if no canvas
      if (!token.canvas) {
        skipped++
        continue
      }

      // Encode in idle time if possible
      const dataUrl = await this.encodeCanvas(token.canvas)
      await this.cache.set(token.filename, dataUrl)
      results[token.filename] = dataUrl
      rendered++
    }

    return {
      success: true,
      rendered,
      skipped,
      metadata: {
        strategy: this.name,
        tokensProcessed: tokensToRender.length,
        cacheStats: this.cache.getStats()
      }
    }
  }

  private encodeCanvas(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve) => {
      const encode = () => {
        const dataUrl = canvas.toDataURL('image/png', this.options.encodingQuality)
        resolve(dataUrl)
      }

      if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(encode, { timeout: 100 })
      } else {
        setTimeout(encode, 0)
      }
    })
  }
}
```

---

## 📦 Example 5: Pre-Render Cache Manager

### `src/ts/cache/manager/PreRenderCacheManager.ts`

```typescript
import type {
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
  ICacheStrategy,
  CacheStats
} from '../core/interfaces.js'
import { EventEmitter } from 'events'

/**
 * Application Service: Orchestrates pre-rendering across strategies.
 * Central manager that coordinates multiple caches and strategies.
 */
export class PreRenderCacheManager extends EventEmitter {
  private strategies = new Map<string, IPreRenderStrategy>()
  private caches = new Map<string, ICacheStrategy>()
  private isRendering = new Set<string>()  // Prevent concurrent renders

  /**
   * Register a pre-render strategy.
   */
  registerStrategy(strategy: IPreRenderStrategy): void {
    this.strategies.set(strategy.name, strategy)
  }

  /**
   * Register a cache instance.
   */
  registerCache(name: string, cache: ICacheStrategy): void {
    this.caches.set(name, cache)
  }

  /**
   * Trigger pre-rendering based on context.
   * Selects appropriate strategy and executes it.
   */
  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    // Find matching strategy
    const strategy = this.findStrategy(context)
    if (!strategy) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'No matching strategy found'
      }
    }

    // Prevent concurrent renders for same strategy
    if (this.isRendering.has(strategy.name)) {
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'Strategy already rendering'
      }
    }

    try {
      this.isRendering.add(strategy.name)
      this.emit('prerender:start', { strategy: strategy.name, context })

      const result = await strategy.preRender(context)

      this.emit('prerender:complete', { strategy: strategy.name, result })
      return result
    } catch (error) {
      this.emit('prerender:error', { strategy: strategy.name, error })
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: String(error)
      }
    } finally {
      this.isRendering.delete(strategy.name)
    }
  }

  /**
   * Get cache instance by name.
   */
  getCache(name: string): ICacheStrategy | undefined {
    return this.caches.get(name)
  }

  /**
   * Get statistics for specific cache.
   */
  getCacheStats(name: string): CacheStats | null {
    const cache = this.caches.get(name)
    return cache ? cache.getStats() : null
  }

  /**
   * Get statistics for all caches.
   */
  getAllCacheStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {}
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats()
    }
    return stats
  }

  /**
   * Clear specific cache.
   */
  async clearCache(name: string): Promise<void> {
    const cache = this.caches.get(name)
    if (cache) {
      await cache.clear()
      this.emit('cache:cleared', { name })
    }
  }

  /**
   * Clear all caches.
   */
  async clearAllCaches(): Promise<void> {
    for (const [name, cache] of this.caches) {
      await cache.clear()
      this.emit('cache:cleared', { name })
    }
  }

  /**
   * Find best strategy for given context.
   */
  private findStrategy(context: PreRenderContext): IPreRenderStrategy | null {
    const candidates = Array.from(this.strategies.values())
      .filter(s => s.shouldTrigger(context))
      .sort((a, b) => b.priority - a.priority)

    return candidates[0] ?? null
  }
}
```

---

## 📦 Example 6: React Hook Integration

### `src/hooks/usePreRenderCache.ts`

```typescript
import { useContext, useEffect } from 'react'
import { PreRenderCacheContext } from '../contexts/PreRenderCacheContext.js'
import type { PreRenderContext } from '../ts/cache/core/interfaces.js'

/**
 * React hook for accessing pre-render cache manager.
 * Provides convenient API for components to trigger pre-rendering.
 */
export function usePreRenderCache(strategyName: string) {
  const manager = useContext(PreRenderCacheContext)

  if (!manager) {
    throw new Error('usePreRenderCache must be used within PreRenderCacheProvider')
  }

  const cache = manager.getCache(strategyName)
  const stats = manager.getCacheStats(strategyName)

  /**
   * Trigger pre-rendering with given context.
   */
  const preRender = async (context: Partial<PreRenderContext>) => {
    return manager.preRender({
      type: context.type ?? 'manual',
      tokens: context.tokens ?? [],
      ...context
    })
  }

  /**
   * Clear cache for this strategy.
   */
  const clearCache = async () => {
    await manager.clearCache(strategyName)
  }

  return {
    cache,
    stats,
    preRender,
    clearCache,
    manager
  }
}

/**
 * Hook for global cache statistics.
 */
export function useCacheStats() {
  const manager = useContext(PreRenderCacheContext)
  const [stats, setStats] = useState(manager?.getAllCacheStats() ?? {})

  useEffect(() => {
    if (!manager) return

    const updateStats = () => {
      setStats(manager.getAllCacheStats())
    }

    // Update stats when cache events occur
    manager.on('prerender:complete', updateStats)
    manager.on('cache:cleared', updateStats)

    return () => {
      manager.off('prerender:complete', updateStats)
      manager.off('cache:cleared', updateStats)
    }
  }, [manager])

  return stats
}
```

---

## 📦 Example 7: Before/After Comparison

### **Before**: `TokenCard.tsx` (Lines 10-47)

```typescript
// ❌ Module-level singleton - shared across all instances
const dataUrlCache = new Map<string, string>()

export function clearDataUrlCache(): void {
  dataUrlCache.clear()
}

function preRenderGalleryTokens(tokens: Token[], maxTokens: number = 20): void {
  // ❌ Ad-hoc logic mixed with caching
  const tokensToRender = tokens.slice(0, maxTokens)

  let renderedCount = 0
  for (const token of tokensToRender) {
    if (dataUrlCache.has(token.filename)) continue
    if (!token.canvas) continue
    if (renderedCount >= 1) break  // Only render one at a time

    renderedCount++

    const encode = () => {
      const dataUrl = token.canvas.toDataURL('image/png')
      dataUrlCache.set(token.filename, dataUrl)
    }

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(encode, { timeout: 100 })
    } else {
      setTimeout(encode, 0)
    }
  }
}

// ❌ In component - tightly coupled to cache implementation
const cachedDataUrl = dataUrlCache.get(displayToken.filename)
```

### **After**: `TokenCard.tsx` (Refactored)

```typescript
// ✅ Use managed cache through hook
const { cache } = usePreRenderCache('gallery')

// ✅ Simple, declarative API
const imageDataUrl = useMemo(async () => {
  const cached = await cache.get(displayToken.filename)
  if (cached) return cached.value

  if (!displayToken.canvas || !isVisible) return null

  const dataUrl = displayToken.canvas.toDataURL('image/png')
  await cache.set(displayToken.filename, dataUrl)
  return dataUrl
}, [displayToken.canvas, displayToken.filename, isVisible, cache])
```

### **Before**: `TabNavigation.tsx` (Lines 21-30)

```typescript
// ❌ Component directly knows about pre-rendering implementation
const handleTabHover = useCallback((tabId: EditorTab) => {
  if (tabId === 'customize' && characters.length > 0) {
    preRenderFirstCharacter(characters[0], generationOptions)  // Import from utils
  } else if (tabId === 'gallery' && tokens.length > 0) {
    preRenderGalleryTokens(tokens, 20)  // Import from TokenCard
  }
}, [characters, generationOptions, tokens])
```

### **After**: `TabNavigation.tsx` (Refactored)

```typescript
// ✅ Component uses unified API, doesn't know implementation
const { preRender } = usePreRenderCache('gallery')

const handleTabHover = useCallback((tabId: EditorTab) => {
  if (tabId === 'customize' && characters.length > 0) {
    preRender({
      type: 'customize-hover',
      tokens: [], // Will be handled by strategy
      characters,
      generationOptions
    })
  } else if (tabId === 'gallery' && tokens.length > 0) {
    preRender({
      type: 'gallery-hover',
      tokens
    })
  }
}, [characters, generationOptions, tokens, preRender])
```

---

## 📊 Benefits Demonstrated

### 1. **Testability**
```typescript
// Before: Can't test without module singletons
test('preRenderGalleryTokens', () => {
  // Uses global dataUrlCache - test pollution!
})

// After: Inject mock dependencies
test('GalleryPreRenderStrategy', async () => {
  const mockCache = new MockCacheAdapter()
  const strategy = new GalleryPreRenderStrategy(mockCache)
  const result = await strategy.preRender({ type: 'gallery-hover', tokens: mockTokens })
  expect(result.rendered).toBe(5)
})
```

### 2. **Flexibility**
```typescript
// Before: Hard-coded Map storage
const cache = new Map<string, string>()

// After: Swap implementations easily
const cache: ICacheStrategy = new LRUCacheAdapter({
  maxSize: 100,
  evictionPolicy: new LRUEvictionPolicy({ maxSize: 100 })
})

// Or use IndexedDB for persistence
const cache: ICacheStrategy = new IndexedDBCacheAdapter({
  dbName: 'pre-render-cache',
  storeName: 'gallery'
})
```

### 3. **Observability**
```typescript
// Before: No visibility into cache performance
console.log(dataUrlCache.size)  // Only metric available

// After: Rich statistics
const stats = cache.getStats()
console.log(`Hit rate: ${stats.hitRate * 100}%`)
console.log(`Memory: ${stats.memoryUsage / 1024 / 1024} MB`)
console.log(`Evictions: ${stats.evictionCount}`)
```

### 4. **Extensibility**
```typescript
// Add new strategy without modifying existing code
class ProjectPreRenderStrategy implements IPreRenderStrategy {
  readonly name = 'project'
  readonly priority = 2

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    // Custom logic for project pre-rendering
  }
}

// Register and it just works
manager.registerStrategy(new ProjectPreRenderStrategy(cache))
```

---

## 🎓 Key Takeaways

1. **Interfaces define contracts** - All adapters implement same interface
2. **Strategies are pluggable** - Add new pre-render logic without changing manager
3. **Policies are composable** - Combine multiple eviction policies
4. **React integration is clean** - Hooks abstract manager complexity
5. **Testing is straightforward** - Mock interfaces, not implementations

---

This refactoring transforms scattered, tightly-coupled caching logic into a **clean, testable, extensible architecture** following proven software engineering principles.
