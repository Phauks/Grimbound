# Testing Standards

> Guidelines for test file organization, coverage requirements, and testing patterns.

---

## Test File Organization

### Directory Structure

- Place tests in `__tests__/` directories adjacent to source
- Name files: `*.test.ts` or `*.spec.ts`
- Mock external dependencies in `__mocks__/`

```
src/ts/sync/
├── dataSyncService.ts
├── storageManager.ts
├── __tests__/
│   ├── dataSyncService.test.ts
│   ├── storageManager.test.ts
│   └── integration.test.ts
└── __mocks__/
    └── githubReleaseClient.ts
```

---

## Coverage Requirements

| Requirement | Target |
|-------------|--------|
| Minimum for new code | 80% |
| Bug fixes | Regression test required |
| Critical paths | Integration tests required |

### Current Coverage Status

| Module | Coverage | Notes |
|--------|----------|-------|
| `src/ts/sync/` | 92 tests | Well covered |
| `src/hooks/` | Gaps | Needs more unit tests |
| `src/components/` | Gaps | Needs component tests |

---

## Test Patterns

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ModuleName', () => {
  // Setup
  let instance: ModuleClass;
  let mockDep: MockType;

  beforeEach(() => {
    mockDep = { method: vi.fn() };
    instance = new ModuleClass(mockDep);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Tests
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = instance.method(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Testing with Dependency Injection

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './ProjectService';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockDb: IProjectDatabase;
  let mockExporter: IProjectExporter;

  beforeEach(() => {
    // Create mock dependencies
    mockDb = {
      saveProject: vi.fn().mockResolvedValue(undefined),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      listProjects: vi.fn().mockResolvedValue([]),
    };

    mockExporter = {
      exportAsZip: vi.fn().mockResolvedValue(new Blob()),
    };

    // Inject mocks
    service = new ProjectService({
      database: mockDb,
      exporter: mockExporter,
    });
  });

  it('should save project to database', async () => {
    const project = { name: 'Test Project' };

    await service.createProject(project);

    expect(mockDb.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Project' })
    );
  });

  it('should throw ValidationError for invalid project', async () => {
    await expect(service.createProject({}))
      .rejects.toThrow(ValidationError);
  });
});
```

### Testing Async Operations

```typescript
describe('async operations', () => {
  it('should handle successful async operation', async () => {
    mockApi.fetch.mockResolvedValue({ data: 'success' });

    const result = await service.fetchData();

    expect(result).toEqual({ data: 'success' });
  });

  it('should handle async errors', async () => {
    mockApi.fetch.mockRejectedValue(new Error('Network error'));

    await expect(service.fetchData()).rejects.toThrow('Network error');
  });

  it('should handle timeouts', async () => {
    vi.useFakeTimers();

    const promise = service.fetchWithTimeout(5000);
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Timeout');

    vi.useRealTimers();
  });
});
```

### Testing React Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useTokenGenerator } from './useTokenGenerator';

describe('useTokenGenerator', () => {
  it('should initialize with empty tokens', () => {
    const { result } = renderHook(() => useTokenGenerator());

    expect(result.current.tokens).toEqual([]);
    expect(result.current.isGenerating).toBe(false);
  });

  it('should generate tokens', async () => {
    const { result } = renderHook(() => useTokenGenerator());

    await act(async () => {
      await result.current.generate(mockCharacters);
    });

    expect(result.current.tokens).toHaveLength(mockCharacters.length);
  });
});
```

### Testing React Components with ServiceProvider

```typescript
import { render, screen } from '@testing-library/react';
import { ServiceProvider } from '@/contexts/ServiceContext';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  const mockProjectService = {
    saveProject: vi.fn(),
    loadProject: vi.fn(),
  };

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <ServiceProvider overrides={{ projectService: mockProjectService }}>
        {ui}
      </ServiceProvider>
    );
  };

  it('should render correctly', () => {
    renderWithProvider(<MyComponent />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should call service on action', async () => {
    renderWithProvider(<MyComponent />);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockProjectService.saveProject).toHaveBeenCalled();
  });
});
```

---

## Mocking Patterns

### Mocking Modules

```typescript
// __mocks__/githubReleaseClient.ts
export const GitHubReleaseClient = vi.fn().mockImplementation(() => ({
  getLatestRelease: vi.fn().mockResolvedValue({
    version: 'v2024.01.01-r1',
    downloadUrl: 'https://example.com/package.zip',
  }),
}));
```

### Mocking fetch

```typescript
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: 'test' }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### Mocking IndexedDB (Dexie)

```typescript
import { Dexie } from 'dexie';
import 'fake-indexeddb/auto';

// Tests will use in-memory IndexedDB
describe('StorageManager', () => {
  let db: ProjectDatabase;

  beforeEach(async () => {
    db = new ProjectDatabase();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });
});
```

### Mocking Canvas

```typescript
beforeEach(() => {
  // Mock canvas context
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
  });
});
```

---

## Testing Best Practices

### DO

- Test behavior, not implementation
- Use descriptive test names: `should [action] when [condition]`
- Keep tests focused and independent
- Use factories for test data
- Test edge cases and error conditions

### DON'T

- Don't test private methods directly
- Don't rely on test execution order
- Don't use `any` type in tests
- Don't skip tests without explanation
- Don't test external libraries

### Test Data Factories

```typescript
// testFactories.ts
export const createMockCharacter = (overrides = {}): Character => ({
  id: 'test-character',
  name: 'Test Character',
  team: 'townsfolk',
  ability: 'Test ability text',
  image: 'test.png',
  ...overrides,
});

export const createMockProject = (overrides = {}): Project => ({
  id: crypto.randomUUID(),
  name: 'Test Project',
  script: [],
  options: defaultOptions,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

---

## Technical Debt

### Tests Needed

1. **Custom Hooks** - Most hooks lack unit tests
2. **TokenImageRenderer** - Needs canvas rendering tests
3. **TokenTextRenderer** - Needs text rendering tests
4. **Component Tests** - Need more coverage
5. **E2E Tests** - Need comprehensive suite

### Priority

| Priority | Area | Reason |
|----------|------|--------|
| High | Export module | User-facing, complex |
| High | Sync module | Already well-tested, maintain |
| Medium | Generation | Core functionality |
| Medium | Hooks | Business logic |
| Lower | Components | UI stability |

---

*Last updated: 2025-12-20*
