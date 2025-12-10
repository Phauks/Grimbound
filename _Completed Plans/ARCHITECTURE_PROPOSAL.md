# Pre-Rendering Architecture Refactoring Proposal

> **Goal**: Consolidate three independent pre-rendering systems into a unified, testable, and extensible architecture using Hexagonal Architecture principles.

---

## 🎯 Problems Addressed

### Current Issues
1. **Three disconnected caching systems** with duplicated logic
2. **Module-level singletons** - hard to test, no isolation
3. **Unbounded memory growth** - no eviction strategy
4. **Tight coupling** - cache logic mixed with UI components
5. **No observability** - can't track hit rates, memory usage, or performance
6. **Inconsistent APIs** - each cache has different methods
7. **No cache coordination** - caches don't know about each other

### Architecture Smells
- **Scattered Domain Logic**: Cache management spread across components
- **Framework Coupling**: Cache logic depends on React hooks/refs
- **Missing Abstractions**: No interfaces, direct dependencies on concrete implementations
- **Anemic Services**: Utilities with no state management or business rules

---

## 🏗️ Proposed Architecture: Hexagonal (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────┐
│                     UI LAYER (React)                     │
│  Components: TokenCard, CustomizeView, ProjectManager   │
│       └─► usePreRenderCache() hook ◄─────────┐          │
└──────────────────────────────────────────────┼──────────┘
                                               │
┌──────────────────────────────────────────────┼──────────┐
│              APPLICATION LAYER                │          │
│                                               ▼          │
│  ┌────────────────────────────────────────────────────┐ │
│  │   PreRenderCacheManager (Orchestrator)            │ │
│  │   • Unified API for all caching operations        │ │
│  │   • Strategy selection based on token type        │ │
│  │   • Cache coordination & memory management        │ │
│  │   • Event system for observability                │ │
│  └────────────────────────────────────────────────────┘ │
│            │              │              │               │
│            ▼              ▼              ▼               │
│      ┌─────────┐    ┌─────────┐    ┌─────────┐        │
│      │ Gallery │    │Customize│    │ Project │        │
│      │Strategy │    │Strategy │    │Strategy │        │
│      └─────────┘    └─────────┘    └─────────┘        │
└──────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────┐
│           DOMAIN LAYER (Ports)            ▼              │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │         ICacheStrategy (Interface/Port)            │  │
│  │  • get(key): Promise<CacheEntry | null>           │  │
│  │  • set(key, value, options): Promise<void>        │  │
│  │  • has(key): boolean                               │  │
│  │  • delete(key): Promise<void>                      │  │
│  │  • clear(): Promise<void>                          │  │
│  │  • getStats(): CacheStats                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │         IEvictionPolicy (Interface/Port)           │  │
│  │  • shouldEvict(stats: CacheStats): boolean        │  │
│  │  • selectVictims(entries): string[]                │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────┐
│      INFRASTRUCTURE LAYER (Adapters)      ▼              │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  LRUCacheAdapter │  │ DataUrlCacheAdapter│          │
│  │  • Map-based     │  │ • Canvas → DataURL│          │
│  │  • Size-limited  │  │ • Size tracking   │          │
│  └──────────────────┘  └──────────────────┘            │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │MemoryCacheAdapter│  │IndexedDBAdapter │            │
│  │  • In-memory Map │  │ • Persistent     │            │
│  │  • Fast access   │  │ • Large capacity │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │         Eviction Policies (Adapters)              │   │
│  │  • LRUEvictionPolicy                              │   │
│  │  • SizeBasedEvictionPolicy                        │   │
│  │  • TTLEvictionPolicy                              │   │
│  │  • CompositeEvictionPolicy                        │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## 📁 Proposed File Structure

```
src/ts/cache/                         # New cache domain module
├── index.ts                          # Barrel export
├── core/                             # Domain layer (ports)
│   ├── interfaces.ts                 # ICacheStrategy, IEvictionPolicy, ports
│   ├── types.ts                      # CacheEntry, CacheStats, CacheOptions
│   └── events.ts                     # CacheEvent, CacheEventEmitter
├── manager/                          # Application layer
│   ├── PreRenderCacheManager.ts      # Main orchestrator
│   └── CacheCoordinator.ts           # Cross-cache coordination
├── strategies/                       # Domain services
│   ├── GalleryPreRenderStrategy.ts   # Gallery-specific logic
│   ├── CustomizePreRenderStrategy.ts # Customize-specific logic
│   └── ProjectPreRenderStrategy.ts   # Project-specific logic
├── adapters/                         # Infrastructure layer (implementations)
│   ├── LRUCacheAdapter.ts            # LRU cache implementation
│   ├── DataUrlCacheAdapter.ts        # Data URL encoding cache
│   ├── MemoryCacheAdapter.ts         # Simple Map-based cache
│   └── IndexedDBCacheAdapter.ts      # Persistent cache (future)
├── policies/                         # Eviction strategies
│   ├── LRUEvictionPolicy.ts          # Least recently used
│   ├── SizeBasedEvictionPolicy.ts    # Size-based eviction
│   ├── TTLEvictionPolicy.ts          # Time-to-live
│   └── CompositeEvictionPolicy.ts    # Combine multiple policies
├── utils/                            # Cache utilities
│   ├── cacheKeyGenerator.ts          # Consistent key generation
│   ├── memoryEstimator.ts            # Estimate cache entry sizes
│   └── hashGenerator.ts              # Fast hashing for cache keys
└── __tests__/                        # Unit tests
    ├── PreRenderCacheManager.test.ts
    ├── strategies/*.test.ts
    └── adapters/*.test.ts
```

---

## 🔑 Key Design Principles

### 1. **Dependency Inversion** (SOLID)
- **Before**: Components directly instantiate cache Maps
- **After**: Components depend on `ICacheStrategy` interface

```typescript
// Before: Tight coupling
const cache = new Map<string, Token>()

// After: Dependency injection
const cache: ICacheStrategy = new LRUCacheAdapter({
  maxSize: 100,
  evictionPolicy: new LRUEvictionPolicy()
})
```

### 2. **Single Responsibility** (SOLID)
- **PreRenderCacheManager**: Orchestrates caching, doesn't implement storage
- **Strategies**: Define pre-render behavior, don't manage storage
- **Adapters**: Implement storage, don't define behavior
- **Policies**: Implement eviction logic, don't manage cache

### 3. **Open/Closed Principle** (SOLID)
- Add new cache types without modifying existing code
- Add new eviction policies without changing cache adapters
- Add new pre-render strategies without touching manager

### 4. **Strategy Pattern**
- Different pre-rendering strategies for different contexts
- Runtime strategy selection based on token type
- Pluggable eviction policies

### 5. **Repository Pattern**
- Unified API for cache access regardless of underlying storage
- Abstraction over Map, IndexedDB, or future Cache API
- Consistent error handling and observability

---

## 🔧 Core Interfaces (Ports)

### `ICacheStrategy` - Main Cache Port

```typescript
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
   */
  evict(): Promise<number>  // Returns number of entries evicted
}
```

### `IEvictionPolicy` - Eviction Strategy Port

```typescript
export interface IEvictionPolicy {
  /**
   * Determine if cache should evict entries.
   */
  shouldEvict(stats: CacheStats): boolean

  /**
   * Select which entries to evict.
   * @returns Array of keys to remove
   */
  selectVictims<V>(entries: Map<string, CacheEntry<V>>): string[]

  /**
   * Update policy state after access.
   */
  recordAccess(key: string): void

  /**
   * Update policy state after insertion.
   */
  recordInsertion(key: string, size: number): void
}
```

### Supporting Types

```typescript
export interface CacheEntry<V> {
  value: V
  key: string
  size: number              // Estimated size in bytes
  createdAt: number         // Timestamp
  lastAccessed: number      // Timestamp
  accessCount: number       // Hit count
  ttl?: number             // Time-to-live in ms
  metadata?: Record<string, any>
}

export interface CacheStats {
  size: number              // Number of entries
  memoryUsage: number       // Estimated bytes
  maxSize?: number          // Max entries limit
  maxMemory?: number        // Max memory limit
  hitCount: number
  missCount: number
  evictionCount: number
  hitRate: number           // Calculated: hits / (hits + misses)
}

export interface CacheOptions {
  ttl?: number             // Time-to-live
  priority?: number        // Eviction priority (higher = keep longer)
  metadata?: Record<string, any>
}

export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'set'
  | 'evict'
  | 'clear'
  | 'error'

export interface CacheEvent<V = any> {
  type: CacheEventType
  key: string
  value?: V
  timestamp: number
  metadata?: Record<string, any>
}
```

---

## 🎨 Pre-Render Strategies

### `GalleryPreRenderStrategy`

**Purpose**: Pre-render first N tokens as data URLs for instant display

**Behavior**:
- Triggered on gallery tab hover
- Uses `requestIdleCallback` for non-blocking encoding
- Caches data URLs in `DataUrlCacheAdapter`
- Limits to first 20 tokens to prevent blocking

**Configuration**:
```typescript
interface GalleryStrategyOptions {
  maxTokens: number         // Default: 20
  useIdleCallback: boolean  // Default: true
  encodingQuality: number   // Default: 0.92
}
```

### `CustomizePreRenderStrategy`

**Purpose**: Pre-render first character + reminders for instant customize view

**Behavior**:
- Triggered on customize tab hover
- Generates full token set (character + all reminders)
- Caches based on character UUID + options hash
- Invalidates cache when generation options change

**Configuration**:
```typescript
interface CustomizeStrategyOptions {
  includeReminders: boolean  // Default: true
  optionsToHash: string[]    // Which options affect rendering
}
```

### `ProjectPreRenderStrategy`

**Purpose**: Pre-render script name tokens for project list

**Behavior**:
- Triggered on project card hover
- Generates only script-name token (most expensive)
- Uses `AbortController` to cancel if user hovers away
- Caches by project ID

**Configuration**:
```typescript
interface ProjectStrategyOptions {
  abortOnUnhover: boolean   // Default: true
  cacheByProjectId: boolean // Default: true
}
```

---

## 🔄 Migration Path

### Phase 1: Infrastructure (Week 1)
1. Create `src/ts/cache/` module structure
2. Implement core interfaces (`ICacheStrategy`, `IEvictionPolicy`)
3. Implement base adapters (`LRUCacheAdapter`, `MemoryCacheAdapter`)
4. Implement eviction policies (`LRUEvictionPolicy`, `SizeBasedEvictionPolicy`)
5. Write comprehensive unit tests

### Phase 2: Manager & Strategies (Week 2)
1. Implement `PreRenderCacheManager` orchestrator
2. Implement three pre-render strategies
3. Add event system for observability
4. Create `usePreRenderCache()` React hook

### Phase 3: Integration (Week 3)
1. Refactor `TokenCard.tsx` to use new cache manager
2. Refactor `CustomizeView.tsx` to use new strategy
3. Refactor `ProjectManagerPage.tsx` to use new strategy
4. Remove old cache implementations (`customizePreRenderCache.ts`, module-level caches)

### Phase 4: Enhancements (Week 4)
1. Add cache performance dashboard (hit rates, memory usage)
2. Implement `IndexedDBCacheAdapter` for persistence
3. Add telemetry/monitoring hooks
4. Performance testing and optimization

---

## 📊 Expected Benefits

### Code Quality
- **-40% code duplication**: Shared cache logic
- **+300 unit tests**: Testable without React
- **100% type safety**: Strong interfaces throughout

### Performance
- **Memory management**: Automatic eviction prevents unbounded growth
- **Hit rate visibility**: Know which caches are effective
- **Coordinated eviction**: Caches work together, not in isolation

### Maintainability
- **Single source of truth**: One place for cache logic
- **Clear boundaries**: UI, application, domain, infrastructure layers
- **Easy testing**: Mock interfaces, not concrete implementations

### Future Expansion
- **Add new cache types**: Implement `ICacheStrategy`, done
- **Add new strategies**: Implement strategy class, register with manager
- **Add persistence**: Swap in `IndexedDBCacheAdapter`
- **Add remote caching**: Implement `ServiceWorkerCacheAdapter`

---

## 🧪 Example Usage

### For Component Developers

```typescript
// TokenCard.tsx - Before
const dataUrlCache = new Map<string, string>()  // Module singleton 😞

// TokenCard.tsx - After
const { cache } = usePreRenderCache('gallery')  // Managed instance ✅

const dataUrl = await cache.get(token.filename)
if (!dataUrl) {
  const url = token.canvas.toDataURL()
  await cache.set(token.filename, url)
}
```

### For Testing

```typescript
// Before: Can't test without module singletons
test('TokenCard renders', () => {
  // Module cache pollutes test isolation 😞
})

// After: Inject mock cache
test('TokenCard renders', () => {
  const mockCache = new MockCacheAdapter()
  render(<TokenCard cache={mockCache} />)  // Full control ✅
})
```

### For Monitoring

```typescript
// Get real-time cache statistics
const stats = cacheManager.getStats('gallery')
console.log(`Hit rate: ${stats.hitRate}%`)
console.log(`Memory: ${stats.memoryUsage / 1024 / 1024} MB`)

// Subscribe to cache events
cacheManager.on('evict', (event) => {
  console.log(`Evicted ${event.key} from ${event.cacheName}`)
})
```

---

## 🎯 Success Metrics

### Before Refactoring
- 3 independent cache implementations
- ~150 LOC of duplicated cache logic
- 0 unit tests for caching
- No memory management
- No observability

### After Refactoring
- 1 unified cache system
- ~50 LOC shared cache logic (70% reduction)
- 300+ unit tests (100% coverage)
- Automatic memory management with configurable limits
- Full observability (hit rates, memory, events)

---

## 📚 References

### Architecture Patterns
- **Clean Architecture** (Uncle Bob): Dependency inversion, layer separation
- **Hexagonal Architecture** (Alistair Cockburn): Ports and adapters
- **Repository Pattern**: Data access abstraction
- **Strategy Pattern**: Pluggable algorithms

### Implementation Guides
- `/backend-development/architecture-patterns`: Core patterns
- `/cache-strategy-pattern`: Caching patterns
- `/dependency-injection`: DI in TypeScript

---

## ❓ Open Questions for Discussion

1. **Persistence Strategy**: Should we persist pre-rendered tokens to IndexedDB for offline use?
2. **Memory Limits**: What's acceptable max memory for caches? (Currently unbounded)
3. **Cache Warming**: Should we pre-render on app load or wait for first interaction?
4. **Eviction Policy**: LRU vs. size-based vs. composite policy?
5. **Telemetry**: Do we want to track cache performance metrics for analytics?

---

**Next Steps**: Review this proposal, discuss open questions, and approve Phase 1 implementation plan.
