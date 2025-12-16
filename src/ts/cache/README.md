# Cache Module

Pre-rendering cache system with **Hexagonal Architecture** (Ports & Adapters) for the Token Generator.

## Architecture

```
cache/
├── core/               # Domain Layer (Ports)
│   ├── interfaces.ts   # ICacheStrategy, IEvictionPolicy, IPreRenderStrategy
│   └── types.ts        # CacheEntry, CacheStats, PreRenderContext, etc.
│
├── adapters/           # Infrastructure Layer (Adapters)
│   └── LRUCacheAdapter.ts  # LRU cache implementation with eviction
│
├── policies/           # Infrastructure Layer (Eviction Policies)
│   └── LRUEvictionPolicy.ts  # Least Recently Used eviction logic
│
├── strategies/         # Domain Layer (Business Logic)
│   ├── GalleryPreRenderStrategy.ts   # Gallery view pre-rendering
│   ├── CustomizePreRenderStrategy.ts # Customize view pre-rendering
│   └── ProjectPreRenderStrategy.ts   # Project hover pre-rendering
│
├── manager/            # Application Layer (Orchestration)
│   └── PreRenderCacheManager.ts  # Central coordinator
│
├── utils/              # Utilities
│   ├── EventEmitter.ts       # Event system for cache operations
│   ├── CacheLogger.ts        # Structured logging with metrics
│   ├── memoryEstimator.ts    # Size estimation for cache entries
│   └── WorkerPool.ts         # Web worker coordination
│
└── instances/          # Singleton Instances
    └── fontCache.ts    # Global font string cache
```

## Quick Start

### Use Pre-Render Cache in Components

```typescript
import { usePreRenderCache } from '../hooks/usePreRenderCache'

function TokensView() {
  const cacheManager = usePreRenderCache()

  const handleScroll = async () => {
    const result = await cacheManager?.preRender({
      type: 'tokens-hover',
      tokens: visibleTokens,
      characters: charactersInViewport
    })

    console.log(`✅ Rendered: ${result?.rendered}`)
    console.log(`⏭️  Skipped: ${result?.skipped} (already cached)`)
  }

  return <div onScroll={handleScroll}>...</div>
}
```

### Create Custom Strategy

```typescript
import type { IPreRenderStrategy, PreRenderContext } from './core/index.js'

class MyCustomStrategy implements IPreRenderStrategy {
  name = 'my-custom-strategy'
  priority = 5  // Higher = selected first

  shouldTrigger(context: PreRenderContext): boolean {
    return context.type === 'my-custom-view'
  }

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    // Your pre-rendering logic
    return { success: true, rendered: 10, skipped: 0 }
  }
}

// Register with manager
preRenderCacheManager.registerStrategy(new MyCustomStrategy())
```

### Use LRU Cache Directly

```typescript
import { LRUCacheAdapter, LRUEvictionPolicy } from './index.js'

const cache = new LRUCacheAdapter<string, MyData>({
  maxSize: 100,              // Max 100 entries
  maxMemory: 10_000_000,     // Max 10MB
  evictionPolicy: new LRUEvictionPolicy({
    maxSize: 100,
    maxMemory: 10_000_000,
    evictionRatio: 0.2       // Evict 20% when full
  }),
  onEvict: (event) => {
    console.log(`Evicted: ${event.key} (${event.reason})`)
  }
})

// Store data
await cache.set('key1', myData, {
  ttl: 300000,                    // 5 min expiration
  tags: ['project:123'],          // For bulk invalidation
  metadata: { source: 'api' }     // Custom metadata
})

// Retrieve data
const entry = await cache.get('key1')
if (entry) {
  console.log(entry.value)
  console.log(`Accessed ${entry.accessCount} times`)
}

// Tag-based invalidation
await cache.invalidateByTag('project:123')
```

## Key Concepts

### Ports & Adapters

**Ports (Interfaces):**
- `ICacheStrategy` - Contract for cache implementations
- `IEvictionPolicy` - Contract for eviction logic
- `IPreRenderStrategy` - Contract for pre-rendering strategies

**Adapters (Implementations):**
- `LRUCacheAdapter` - Adapts Map to ICacheStrategy with LRU
- `LRUEvictionPolicy` - Implements eviction using LRU algorithm

**Benefits:**
- ✅ Easy to swap implementations (Redis, memory, IndexedDB)
- ✅ Domain logic isolated from infrastructure
- ✅ Testable without real caches

### Request Deduplication

Prevents duplicate renders for same request:

```typescript
// Multiple components request same pre-render
await cacheManager.preRender(context)  // Starts rendering
await cacheManager.preRender(context)  // Returns same promise
await cacheManager.preRender(context)  // Returns same promise

// Only one actual render happens ✅
```

### Tag-Based Invalidation

Clear related cache entries efficiently:

```typescript
// Store with tags
cache.set('token_washerwoman', blob, {
  tags: ['character:washerwoman', 'team:townsfolk', 'project:123']
})

// Clear all townsfolk tokens
await cache.invalidateByTag('team:townsfolk')

// Clear all tokens for a project
await cache.invalidateByTag('project:123')
```

### Eviction Policies

**LRU (Least Recently Used):**
- Tracks last access time for each entry
- Evicts oldest unused entries first
- Best for: General-purpose caching

**Configuration:**
```typescript
new LRUEvictionPolicy({
  maxSize: 100,           // Max entries
  maxMemory: 10_000_000,  // Max memory (bytes)
  evictionRatio: 0.2      // Evict 20% when threshold reached
})
```

**Eviction Triggers:**
- Entry count exceeds `maxSize`
- Memory usage exceeds `maxMemory`
- TTL expires (automatic on get())

### Worker-Based Rendering

Uses Web Workers for non-blocking token generation:

```typescript
// WorkerPool automatically detects OffscreenCanvas support
const pool = new WorkerPool({
  maxWorkers: navigator.hardwareConcurrency || 4,
  workerScript: './tokenWorker.js'
})

// Assign work to workers
const result = await pool.executeTask({
  type: 'generate-token',
  character: characterData
})

// Workers render in parallel without blocking main thread ✅
```

## Events

### Cache Manager Events

```typescript
// Listen to events
cacheManager.on('prerender:start', ({ strategy, context }) => {
  console.log(`Pre-rendering started: ${strategy}`)
})

cacheManager.on('prerender:complete', ({ strategy, result }) => {
  console.log(`Pre-rendering done: ${result.rendered} tokens`)
})

cacheManager.on('prerender:error', ({ strategy, error }) => {
  console.error(`Pre-rendering failed: ${error}`)
})

cacheManager.on('cache:cleared', ({ name }) => {
  console.log(`Cache cleared: ${name}`)
})
```

### Eviction Events (New!)

```typescript
const cache = new LRUCacheAdapter({
  ...options,
  onEvict: (event) => {
    console.log(`Evicted: ${event.key}`)
    console.log(`Reason: ${event.reason}`)      // 'lru' | 'ttl' | 'manual'
    console.log(`Size: ${event.size} bytes`)
    console.log(`Age: ${Date.now() - event.lastAccessed}ms`)
    console.log(`Access count: ${event.accessCount}`)
  }
})
```

## Logging & Debugging

### Enable Debug Logging

```typescript
import { CacheLogger, CacheLogLevel } from './utils/CacheLogger.js'

// In code
CacheLogger.setLevel(CacheLogLevel.DEBUG)

// Or via browser console
__CacheLogger__.setLevel(4)  // DEBUG
```

### Log Levels

- `NONE (0)` - No logging
- `ERROR (1)` - Only errors
- `WARN (2)` - Warnings + errors
- `INFO (3)` - Info + warnings + errors
- `DEBUG (4)` - Debug + info + warnings + errors
- `TRACE (5)` - Everything (very verbose)

### Performance Metrics

```typescript
// Automatically tracked for all operations
const metrics = CacheLogger.getMetrics()

// Filter by operation
const prerenderMetrics = CacheLogger.getMetricsForOperation('prerender:gallery')

// Average duration
const avgDuration = CacheLogger.getAverageDuration('prerender:gallery')
console.log(`Average: ${avgDuration}ms`)

// Export all metrics
const json = CacheLogger.exportMetrics()
```

## Testing

### Mock Cache for Tests

```typescript
import { ICacheStrategy, CacheEntry } from './core/index.js'

class MockCache<K, V> implements ICacheStrategy<K, V> {
  private data = new Map<K, CacheEntry<V>>()

  async get(key: K) {
    return this.data.get(key) ?? null
  }

  async set(key: K, value: V) {
    this.data.set(key, {
      value,
      key: String(key),
      size: 1000,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    })
  }

  // ... implement other methods
}

// Use in tests
const mockCache = new MockCache()
const strategy = new MyStrategy(mockCache)
```

### Test Utilities (Planned - Phase 4)

```typescript
import {
  createMockCache,
  createMockAssets,
  populateCacheWithAssets
} from './cache/__tests__/testUtils.js'

// Mock cache with pre-populated data
const cache = createMockCache([
  ['key1', 'value1'],
  ['key2', 'value2']
])

// Generate test assets
const assets = createMockAssets(10)

// Populate cache for testing
await populateCacheWithAssets(cache, assets)
```

## Performance Tips

### 1. Choose Right Cache Size

```typescript
// Too small → High eviction rate → Low hit rate ❌
maxSize: 10

// Too large → Memory pressure → Browser throttling ❌
maxSize: 10000

// Just right → Good hit rate, manageable memory ✅
maxSize: 50  // For pre-render cache
```

### 2. Use Appropriate Eviction Ratio

```typescript
// Small ratio → Frequent evictions → More overhead ❌
evictionRatio: 0.05  // Evict 5%

// Large ratio → Large memory swings → Inconsistent performance ❌
evictionRatio: 0.8   // Evict 80%

// Balanced → Smooth performance ✅
evictionRatio: 0.2   // Evict 20%
```

### 3. Tag Strategically

```typescript
// Good: Hierarchical tags for flexible invalidation ✅
tags: ['project:123', 'character:washerwoman', 'team:townsfolk']

// Bad: No tags → Can't invalidate selectively ❌
tags: []

// Bad: Too specific → Can't invalidate groups ❌
tags: ['token:washerwoman:variant:1:reminder:0']
```

### 4. Monitor Hit Rates

```typescript
const stats = cache.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`)

if (stats.hitRate < 0.7) {
  console.warn('Low hit rate! Consider:')
  console.warn('- Increasing cache size')
  console.warn('- Adjusting pre-render strategy')
  console.warn('- Reducing eviction ratio')
}
```

## Common Patterns

### Pattern 1: Preload Before Batch Operation

```typescript
// Load assets with priority BEFORE generating tokens
const tasks = createPreloadTasks(imageFields, 10)
await preResolveAssetsWithPriority(tasks, { concurrency: 5 })

// Now generate tokens (assets already cached) ✅
const tokens = await generateAllTokens(characters)
```

### Pattern 2: Invalidate on Change

```typescript
// When asset is updated
await assetStorageService.update(assetId, newData)

// Invalidate all caches using this asset
await cache.invalidateByTag(`asset:${assetId}`)

// Pre-render cache automatically re-renders on next request ✅
```

### Pattern 3: Progressive Enhancement

```typescript
// Try cache first
let blob = await cache.get(key)

if (!blob) {
  // Generate if not cached
  blob = await generateToken(character)

  // Cache for future use
  await cache.set(key, blob, {
    ttl: 600000,  // 10 min
    tags: [`character:${character.id}`]
  })
}

return blob
```

## Troubleshooting

### Low Hit Rate

**Symptoms:** Cache stats show <70% hit rate

**Causes:**
- Cache size too small
- TTL too short
- Eviction ratio too aggressive

**Solutions:**
1. Increase `maxSize` or `maxMemory`
2. Increase TTL or remove it
3. Decrease `evictionRatio`

### High Memory Usage

**Symptoms:** Browser becomes slow, high memory in DevTools

**Causes:**
- Cache size too large
- Memory leak (blob URLs not released)
- No eviction policy

**Solutions:**
1. Decrease `maxSize` or `maxMemory`
2. Check `AssetStorageService.revokeUrl()` is called
3. Verify eviction policy is active

### Stale Cache

**Symptoms:** Old data displayed after updates

**Causes:**
- No invalidation after updates
- TTL too long

**Solutions:**
1. Call `invalidateByTag()` after updates
2. Implement proper cache invalidation on asset changes
3. Reduce TTL for frequently changing data

---

## See Also

- [Cache Architecture Documentation](../../../docs/CACHE_ARCHITECTURE.md)
- [Asset Storage Service README](../../services/upload/README.md)
- [Performance Optimization Guide](../../../docs/PERFORMANCE.md) _(coming soon)_

---

**Version:** 1.0
**Last Updated:** 2025-12-10
