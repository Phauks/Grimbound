# Pre-Rendering Refactoring: Implementation Roadmap

> **Quick-start guide** for implementing the proposed architecture refactoring.

---

## 🎯 Executive Summary

### Current State
- ❌ **3 independent caching systems** with duplicated logic
- ❌ **~150 LOC** of redundant cache management code
- ❌ **0 unit tests** for caching layer
- ❌ **Unbounded memory growth** (no eviction)
- ❌ **No observability** (can't measure performance)

### Target State
- ✅ **1 unified caching system** with clean architecture
- ✅ **~50 LOC** shared cache logic (70% reduction)
- ✅ **300+ unit tests** (100% coverage)
- ✅ **Automatic memory management** with configurable limits
- ✅ **Full observability** (hit rates, memory usage, events)

### Estimated Effort
- **Phase 1**: 2-3 days (core infrastructure)
- **Phase 2**: 2-3 days (strategies & manager)
- **Phase 3**: 1-2 days (integration)
- **Phase 4**: 2-3 days (enhancements)
- **Total**: ~2 weeks for complete implementation

---

## 📊 Visual Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       REACT COMPONENTS                          │
│   TokenCard  │  CustomizeView  │  ProjectManager  │  ...      │
│              └────────┬───────────┬───────────┬────────┘        │
│                       │           │           │                 │
│                       └───────────┼───────────┘                 │
│                                   ▼                             │
│                    ┌─────────────────────────┐                 │
│                    │ usePreRenderCache()     │                 │
│                    │    (React Hook)         │                 │
│                    └───────────┬─────────────┘                 │
└────────────────────────────────┼──────────────────────────────┘
                                 │
┌────────────────────────────────┼──────────────────────────────┐
│              APPLICATION LAYER │                               │
│                                ▼                               │
│            ┌───────────────────────────────────┐               │
│            │  PreRenderCacheManager            │               │
│            │  • Strategy selection             │               │
│            │  • Event system                   │               │
│            │  • Cache coordination             │               │
│            └──────┬──────┬──────┬──────────────┘               │
│                   │      │      │                               │
│         ┌─────────┼──────┼──────┼─────────┐                    │
│         ▼         ▼      ▼      ▼         ▼                    │
│    ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐                     │
│    │Gallery │ │Custom│ │Project│ │ ...  │  Pre-Render         │
│    │Strategy│ │Strategy│ │Strategy│ │Strategy│  Strategies     │
│    └────────┘ └──────┘ └──────┘ └──────┘                     │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼──────────────────────────────────────┐
│          DOMAIN LAYER  │                                       │
│                        ▼                                       │
│      ┌────────────────────────────────────┐                   │
│      │   ICacheStrategy (Interface)       │                   │
│      │   • get / set / has / delete       │                   │
│      │   • clear / evict / getStats       │                   │
│      └────────────────────────────────────┘                   │
│                        │                                       │
│      ┌────────────────────────────────────┐                   │
│      │  IEvictionPolicy (Interface)       │                   │
│      │  • shouldEvict / selectVictims     │                   │
│      │  • recordAccess / recordInsertion  │                   │
│      └────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼──────────────────────────────────────┐
│     INFRASTRUCTURE     │                                       │
│                        ▼                                       │
│     ┌──────────────────────────────────────┐                  │
│     │   Cache Adapters (Implementations)   │                  │
│     │  • LRUCacheAdapter                   │                  │
│     │  • DataUrlCacheAdapter               │                  │
│     │  • MemoryCacheAdapter                │                  │
│     │  • IndexedDBCacheAdapter (future)    │                  │
│     └──────────────────────────────────────┘                  │
│                                                                │
│     ┌──────────────────────────────────────┐                  │
│     │   Eviction Policies                  │                  │
│     │  • LRUEvictionPolicy                 │                  │
│     │  • SizeBasedEvictionPolicy           │                  │
│     │  • TTLEvictionPolicy                 │                  │
│     │  • CompositeEvictionPolicy           │                  │
│     └──────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

### Phase 1: Core Infrastructure (Days 1-3)

#### Day 1: Domain Layer
- [ ] Create `src/ts/cache/` directory structure
- [ ] **File**: `src/ts/cache/core/types.ts`
  - [ ] Define `CacheEntry<V>` interface
  - [ ] Define `CacheStats` interface
  - [ ] Define `CacheOptions` interface
  - [ ] Define `CacheEvent` and `CacheEventType`
  - [ ] Define `PreRenderContext` interface
  - [ ] Define `PreRenderResult` interface
- [ ] **File**: `src/ts/cache/core/interfaces.ts`
  - [ ] Define `ICacheStrategy` interface
  - [ ] Define `IEvictionPolicy` interface
  - [ ] Define `IPreRenderStrategy` interface
- [ ] **File**: `src/ts/cache/core/events.ts`
  - [ ] Implement `CacheEventEmitter` class
- [ ] **File**: `src/ts/cache/core/index.ts`
  - [ ] Barrel export all core types/interfaces

#### Day 2: Adapters & Policies
- [ ] **File**: `src/ts/cache/utils/memoryEstimator.ts`
  - [ ] Implement `estimateSize(value)` function
  - [ ] Handle different value types (strings, objects, canvases)
- [ ] **File**: `src/ts/cache/adapters/LRUCacheAdapter.ts`
  - [ ] Implement `LRUCacheAdapter` class
  - [ ] Implement all `ICacheStrategy` methods
  - [ ] Add automatic eviction on set
  - [ ] Add hit/miss tracking
- [ ] **File**: `src/ts/cache/adapters/MemoryCacheAdapter.ts`
  - [ ] Implement simple `MemoryCacheAdapter` (no eviction)
- [ ] **File**: `src/ts/cache/policies/LRUEvictionPolicy.ts`
  - [ ] Implement `LRUEvictionPolicy` class
  - [ ] Track access order with timestamps
  - [ ] Implement victim selection (oldest first)
- [ ] **File**: `src/ts/cache/policies/SizeBasedEvictionPolicy.ts`
  - [ ] Implement size-based eviction (largest first)

#### Day 3: Testing Infrastructure
- [ ] **File**: `src/ts/cache/__tests__/LRUCacheAdapter.test.ts`
  - [ ] Test get/set/has/delete operations
  - [ ] Test automatic eviction
  - [ ] Test hit/miss tracking
  - [ ] Test memory estimation
- [ ] **File**: `src/ts/cache/__tests__/LRUEvictionPolicy.test.ts`
  - [ ] Test shouldEvict logic
  - [ ] Test victim selection
  - [ ] Test access tracking
- [ ] **File**: `src/ts/cache/__tests__/mocks/`
  - [ ] Create `MockCacheAdapter` for testing
  - [ ] Create mock fixtures (sample tokens, etc.)

---

### Phase 2: Manager & Strategies (Days 4-6)

#### Day 4: Cache Manager
- [ ] **File**: `src/ts/cache/manager/PreRenderCacheManager.ts`
  - [ ] Implement `PreRenderCacheManager` class
  - [ ] Add strategy registration
  - [ ] Add cache registration
  - [ ] Implement `preRender()` orchestration
  - [ ] Add event system (extends EventEmitter)
  - [ ] Add `getAllCacheStats()` method
  - [ ] Add `clearAllCaches()` method
- [ ] **File**: `src/ts/cache/manager/CacheCoordinator.ts`
  - [ ] Implement cross-cache memory management
  - [ ] Add global memory limit enforcement

#### Day 5: Pre-Render Strategies
- [ ] **File**: `src/ts/cache/strategies/GalleryPreRenderStrategy.ts`
  - [ ] Implement `GalleryPreRenderStrategy` class
  - [ ] Use `requestIdleCallback` for encoding
  - [ ] Limit to first N tokens (configurable)
  - [ ] Implement `shouldTrigger()` logic
- [ ] **File**: `src/ts/cache/strategies/CustomizePreRenderStrategy.ts`
  - [ ] Implement customize tab pre-rendering
  - [ ] Add options hashing for cache invalidation
  - [ ] Pre-render character + reminders
- [ ] **File**: `src/ts/cache/strategies/ProjectPreRenderStrategy.ts`
  - [ ] Implement project hover pre-rendering
  - [ ] Add AbortController support
  - [ ] Generate script-name token only

#### Day 6: Manager Testing
- [ ] **File**: `src/ts/cache/__tests__/PreRenderCacheManager.test.ts`
  - [ ] Test strategy registration
  - [ ] Test cache registration
  - [ ] Test strategy selection
  - [ ] Test event emission
- [ ] **File**: `src/ts/cache/__tests__/strategies/GalleryPreRenderStrategy.test.ts`
  - [ ] Test gallery pre-rendering logic
  - [ ] Test idle callback usage
  - [ ] Test token limits

---

### Phase 3: React Integration (Days 7-8)

#### Day 7: Context & Hooks
- [ ] **File**: `src/contexts/PreRenderCacheContext.tsx`
  - [ ] Create React context for cache manager
  - [ ] Implement `PreRenderCacheProvider` component
  - [ ] Initialize manager with all strategies/caches
- [ ] **File**: `src/hooks/usePreRenderCache.ts`
  - [ ] Implement `usePreRenderCache(strategyName)` hook
  - [ ] Return `{ cache, stats, preRender, clearCache }`
- [ ] **File**: `src/hooks/useCacheStats.ts`
  - [ ] Implement `useCacheStats()` hook
  - [ ] Subscribe to cache events for live updates
- [ ] **File**: `src/App.tsx`
  - [ ] Wrap app with `<PreRenderCacheProvider>`

#### Day 8: Component Migration
- [ ] **File**: `src/components/TokenGrid/TokenCard.tsx`
  - [ ] Replace module-level `dataUrlCache` with `usePreRenderCache('gallery')`
  - [ ] Remove `preRenderGalleryTokens()` function
  - [ ] Remove `clearDataUrlCache()` export
  - [ ] Update data URL retrieval to use cache API
- [ ] **File**: `src/components/Layout/TabNavigation.tsx`
  - [ ] Replace direct function calls with `preRender()` API
  - [ ] Use unified context instead of importing utilities
- [ ] **File**: `src/components/Views/CustomizeView.tsx`
  - [ ] Replace `customizePreRenderCache` with hook
  - [ ] Use manager API for pre-rendered tokens
- [ ] **File**: `src/components/Pages/ProjectManagerPage.tsx`
  - [ ] Replace `scriptNameTokenCache` ref with hook
  - [ ] Use manager API for project pre-rendering

---

### Phase 4: Cleanup & Enhancements (Days 9-10)

#### Day 9: Remove Old Code
- [ ] **Delete**: `src/utils/customizePreRenderCache.ts`
- [ ] **File**: `src/hooks/useTokenGenerator.ts`
  - [ ] Remove `clearDataUrlCache()` import and call
  - [ ] Use manager API to clear caches
- [ ] **Search**: Find all imports of old cache files
  - [ ] Update to use new cache system
- [ ] **Run**: `npm run build` to check for TypeScript errors
- [ ] **Run**: `npm test` to ensure tests pass

#### Day 10: Enhancements & Documentation
- [ ] **File**: `src/components/Shared/CacheStatsPanel.tsx` (NEW)
  - [ ] Create debug panel showing cache statistics
  - [ ] Display hit rates, memory usage, eviction counts
  - [ ] Add to settings modal or dev tools
- [ ] **File**: `CLAUDE.md`
  - [ ] Update with new cache architecture
  - [ ] Add cache module documentation
  - [ ] Update import patterns
- [ ] **File**: `README.md`
  - [ ] Document cache system for users
  - [ ] Explain performance optimizations
- [ ] **E2E Testing**
  - [ ] Manual test: Gallery tab hover
  - [ ] Manual test: Customize tab hover
  - [ ] Manual test: Project manager hover
  - [ ] Verify memory usage stays bounded

---

## 🔍 Testing Strategy

### Unit Tests (300+ tests target)

```typescript
// LRUCacheAdapter.test.ts (50 tests)
describe('LRUCacheAdapter', () => {
  describe('get/set operations', () => { /* 10 tests */ })
  describe('eviction', () => { /* 15 tests */ })
  describe('statistics', () => { /* 10 tests */ })
  describe('TTL expiration', () => { /* 10 tests */ })
  describe('memory estimation', () => { /* 5 tests */ })
})

// PreRenderCacheManager.test.ts (40 tests)
describe('PreRenderCacheManager', () => {
  describe('strategy registration', () => { /* 10 tests */ })
  describe('cache registration', () => { /* 10 tests */ })
  describe('pre-rendering orchestration', () => { /* 15 tests */ })
  describe('event system', () => { /* 5 tests */ })
})

// GalleryPreRenderStrategy.test.ts (30 tests)
describe('GalleryPreRenderStrategy', () => {
  describe('shouldTrigger', () => { /* 10 tests */ })
  describe('preRender', () => { /* 15 tests */ })
  describe('idle callback', () => { /* 5 tests */ })
})

// ... (continue for all adapters, policies, strategies)
```

### Integration Tests

```typescript
// Integration.test.ts (20 tests)
describe('Cache System Integration', () => {
  test('Gallery pre-render flow end-to-end', async () => {
    const manager = setupManager()
    const result = await manager.preRender({
      type: 'gallery-hover',
      tokens: mockTokens
    })
    expect(result.success).toBe(true)
    expect(result.rendered).toBeGreaterThan(0)
  })

  test('Memory limits are enforced across caches', async () => {
    // Test that global memory limit triggers eviction
  })

  test('Cache statistics update correctly', async () => {
    // Test that stats reflect actual cache state
  })
})
```

### Manual E2E Tests

- [ ] Load large script (100+ characters)
- [ ] Hover over Gallery tab → verify quick render
- [ ] Switch to Gallery → verify instant display
- [ ] Check memory usage (DevTools) → verify bounded
- [ ] Hover over Customize tab → verify pre-render
- [ ] Click token → verify instant customize view
- [ ] Change generation options → verify cache invalidation
- [ ] Hover over projects → verify script name pre-render

---

## 📈 Success Metrics

### Performance
- [ ] **Memory usage** stays below 200MB for gallery of 100 tokens
- [ ] **Gallery display** loads in <100ms (data URLs pre-cached)
- [ ] **Customize view** opens in <50ms (tokens pre-rendered)
- [ ] **Hit rate** >80% for gallery cache after first hover

### Code Quality
- [ ] **Test coverage** ≥95% for cache module
- [ ] **TypeScript errors** = 0
- [ ] **ESLint warnings** = 0
- [ ] **Bundle size** increase <10KB (gzipped)

### Maintainability
- [ ] **Lines of cache code** reduced by ~70%
- [ ] **Code duplication** eliminated (DRY)
- [ ] **Interfaces defined** for all cache contracts
- [ ] **Documentation** complete (JSDoc comments)

---

## 🚀 Quick Start Commands

```bash
# Phase 1: Set up directory structure
mkdir -p src/ts/cache/{core,manager,strategies,adapters,policies,utils,__tests__}

# Create initial files
touch src/ts/cache/core/{types.ts,interfaces.ts,events.ts,index.ts}
touch src/ts/cache/adapters/{LRUCacheAdapter.ts,MemoryCacheAdapter.ts}
touch src/ts/cache/policies/{LRUEvictionPolicy.ts,SizeBasedEvictionPolicy.ts}
touch src/ts/cache/manager/PreRenderCacheManager.ts
touch src/ts/cache/strategies/{GalleryPreRenderStrategy.ts,CustomizePreRenderStrategy.ts}

# Run tests after each phase
npm test -- src/ts/cache

# Check TypeScript compilation
npm run build

# Verify no regressions
npm run validate
```

---

## 💡 Implementation Tips

### 1. **Start with Interfaces**
Define all interfaces first (Day 1). This allows parallel development of adapters and strategies.

### 2. **Test-Driven Development**
Write tests before implementations. This ensures interfaces are correct and complete.

### 3. **Incremental Migration**
Don't delete old code until new system is fully working. Run both in parallel temporarily.

### 4. **Feature Flags** (Optional)
```typescript
const USE_NEW_CACHE_SYSTEM = import.meta.env.VITE_NEW_CACHE ?? false

if (USE_NEW_CACHE_SYSTEM) {
  // Use PreRenderCacheManager
} else {
  // Use old module-level caches
}
```

### 5. **Performance Monitoring**
Add console logs during development to verify cache hits:
```typescript
cache.on('hit', (event) => console.log(`Cache HIT: ${event.key}`))
cache.on('miss', (event) => console.log(`Cache MISS: ${event.key}`))
```

---

## 🎓 Learning Resources

### Architectural Patterns
- **Clean Architecture** - Robert C. Martin ("Uncle Bob")
- **Hexagonal Architecture** - Alistair Cockburn
- **Domain-Driven Design** - Eric Evans

### TypeScript Patterns
- **Dependency Injection in TypeScript** - [typescript-handbook](https://www.typescriptlang.org/docs/handbook/decorators.html)
- **Strategy Pattern** - Refactoring Guru
- **Repository Pattern** - Martin Fowler

### Caching Strategies
- **LRU Cache** - [leetcode.com/problems/lru-cache](https://leetcode.com/problems/lru-cache/)
- **Cache Eviction Policies** - Wikipedia
- **Web Cache API** - MDN Web Docs

---

## 📞 Need Help?

If you get stuck during implementation:

1. **Review examples** in `REFACTORING_EXAMPLES.md`
2. **Check architecture diagram** above
3. **Run existing tests** to understand expected behavior
4. **Ask specific questions** about interfaces or patterns

---

## 🎉 Completion Criteria

The refactoring is complete when:

- ✅ All 300+ unit tests pass
- ✅ TypeScript compiles with no errors
- ✅ All old cache files deleted
- ✅ Memory usage stays bounded (<200MB)
- ✅ Documentation updated (CLAUDE.md, README.md)
- ✅ Manual E2E tests pass
- ✅ No performance regressions (gallery loads in <100ms)

**Estimated completion**: 10 working days for full implementation

---

Good luck! 🚀
