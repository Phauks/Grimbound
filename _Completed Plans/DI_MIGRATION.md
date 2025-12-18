# Dependency Injection Migration Guide

> **Purpose**: This document tracks the DI migration progress and provides instructions for Claude to continue the migration work.

**Last Updated**: 2025-12-18 (Migration completed)

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Status](#migration-status)
3. [How to Migrate a Component](#how-to-migrate-a-component)
4. [How to Migrate a Hook](#how-to-migrate-a-hook)
5. [Available Services](#available-services)
6. [Files to Migrate](#files-to-migrate)
7. [Testing Migrated Code](#testing-migrated-code)

---

## Overview

This codebase uses **constructor injection with default parameters** for services, and a **React Context** (`ServiceContext`) to provide services to components and hooks.

### Key Files

| File | Purpose |
|------|---------|
| `src/contexts/ServiceContext.tsx` | React context provider with service hooks |
| `src/ts/services/upload/IUploadServices.ts` | Upload service interfaces |
| `src/ts/sync/ISyncServices.ts` | Sync service interfaces |
| `src/ts/services/project/IProjectService.ts` | Project service interfaces |
| `src/main.tsx` | ServiceProvider is wrapped around the app |

### Pattern Summary

**Before (direct import):**
```typescript
import { assetStorageService } from '@/ts/services/upload/index.js';

// Used directly - hard to test
const asset = await assetStorageService.getById(id);
```

**After (DI via hook):**
```typescript
import { useAssetStorageService } from '@/contexts/ServiceContext';

// Get from context - easy to mock in tests
const assetStorageService = useAssetStorageService();
const asset = await assetStorageService.getById(id);
```

---

## Migration Status

### Completed

- [x] `src/main.tsx` - ServiceProvider added
- [x] `src/contexts/ServiceContext.tsx` - Created with all service hooks
- [x] `src/components/Shared/Selectors/AssetPreviewSelector.tsx` - Migrated to `useAssetStorageService`

### High Priority - Core Hooks

| File | Service(s) | Status |
|------|-----------|--------|
| `src/hooks/useProjects.ts` | `projectService` | ✅ Completed |
| `src/hooks/useFileUpload.ts` | `fileUploadService` | ✅ Completed |
| `src/hooks/useAssetManager.ts` | `assetStorageService` | ✅ Completed |
| `src/hooks/useAutoSaveTrigger.ts` | `projectDatabaseService` | ✅ Completed |
| `src/hooks/useCacheStats.ts` | `assetStorageService` | ✅ Completed |
| `src/hooks/useStorageQuota.ts` | `assetStorageService` | ✅ Completed |
| `src/hooks/useBuiltInAssets.ts` | `assetStorageService` | ✅ Completed |

### Medium Priority - Shared Components

| File | Service(s) | Status |
|------|-----------|--------|
| `src/components/Shared/Selectors/BackgroundStyleSelector.tsx` | `assetStorageService` | ✅ Completed |
| `src/components/Shared/Controls/FileDropzone.tsx` | `fileValidationService` | ✅ Completed |
| `src/components/Shared/Assets/AssetThumbnail.tsx` | N/A (no service imports) | ✅ Skipped |

### Lower Priority - Views & Modals

| File | Service(s) | Status |
|------|-----------|--------|
| `src/components/Views/StudioView.tsx` | `assetStorageService` | ✅ Completed |
| `src/components/Views/VersionsView.tsx` | `projectService` | ✅ Completed |
| `src/components/ViewComponents/StudioComponents/AssetBrowser.tsx` | `assetStorageService` | ✅ Completed |
| `src/components/Modals/AssetManagerModal.tsx` | `assetStorageService` | ✅ Completed |
| `src/components/Modals/ExportProjectModal.tsx` | `useProjectExporter()` | ✅ Completed (factory hook) |
| `src/components/Modals/ImportProjectModal.tsx` | `useProjectImporter()` | ✅ Completed (factory hook) |
| `src/components/Modals/SnapshotRecoveryModal.tsx` | `projectDatabaseService` | ✅ Completed |

---

## How to Migrate a Component

### Step 1: Identify Service Imports

Find lines like:
```typescript
import { assetStorageService } from '@/ts/services/upload/index.js';
import { fileUploadService } from '@/ts/services/upload/FileUploadService.js';
```

### Step 2: Replace with Hook Import

```typescript
import { useAssetStorageService, useFileUploadService } from '@/contexts/ServiceContext';
```

### Step 3: Call Hook Inside Component

```typescript
export const MyComponent = memo(function MyComponent(props) {
  // Get services from DI context
  const assetStorageService = useAssetStorageService();
  const fileUploadService = useFileUploadService();

  // Rest of component...
});
```

### Step 4: Update useEffect Dependencies

If the service is used in a `useEffect`, add it to the dependency array:

```typescript
useEffect(() => {
  async function loadData() {
    const asset = await assetStorageService.getById(id);
    // ...
  }
  loadData();
}, [id, assetStorageService]); // Add service to deps
```

### Step 5: Remove Old Import

Delete the direct service import line.

---

## How to Migrate a Hook

### Step 1: Add Service Parameter with Default

```typescript
// Before
export function useMyHook(someParam: string) {
  // Uses imported singleton
}

// After
import type { IAssetStorageService } from '@/ts/services/upload/IUploadServices.js';
import { assetStorageService as defaultAssetStorage } from '@/ts/services/upload/index.js';

interface UseMyHookOptions {
  someParam: string;
  // Optional DI override for testing
  assetStorageService?: IAssetStorageService;
}

export function useMyHook({
  someParam,
  assetStorageService = defaultAssetStorage,
}: UseMyHookOptions) {
  // Uses injected service (defaults to singleton)
}
```

### Alternative: Use Context Hook Inside Custom Hook

```typescript
import { useAssetStorageService } from '@/contexts/ServiceContext';

export function useMyHook(someParam: string) {
  const assetStorageService = useAssetStorageService();

  // Uses service from context
}
```

**Note**: The context approach is simpler but requires the hook to be used within the ServiceProvider. The parameter approach allows the hook to work outside React context (e.g., in tests).

---

## Available Services

### From ServiceContext

| Hook | Returns | Interface |
|------|---------|-----------|
| `useProjectService()` | `IProjectService` | Project CRUD, switching, export/import |
| `useProjectDatabaseService()` | `IProjectDatabase` | Low-level project DB operations |
| `useAssetStorageService()` | `IAssetStorageService` | Asset CRUD, URLs, queries |
| `useFileUploadService()` | `IFileUploadService` | File upload orchestration |
| `useFileValidationService()` | `IFileValidationService` | File validation |
| `useDataSyncService()` | `IDataSyncService` | GitHub sync, characters |
| `useProjectExporter()` | `() => IProjectExporter` | Factory for creating exporter instances |
| `useProjectImporter()` | `() => IProjectImporter` | Factory for creating importer instances |

### Services Not Yet in Context (Add as Needed)

| Service | Import Path | Notes |
|---------|-------------|-------|
| `imageProcessingService` | `@/ts/services/upload/index.js` | Image processing |

### Adding a New Service to Context

Edit `src/contexts/ServiceContext.tsx`:

1. Import the interface and default implementation
2. Add to `ServiceRegistry` interface
3. Add to `ServiceProvider` useMemo
4. Create a hook function

```typescript
// 1. Import
import type { INewService } from '@/ts/services/path/INewService.js';
import { newService } from '@/ts/services/path/NewService.js';

// 2. Add to ServiceRegistry
export interface ServiceRegistry {
  // ... existing
  newService: INewService;
}

// 3. Add to ServiceProvider
const services = useMemo<ServiceRegistry>(() => ({
  // ... existing
  newService: overrides.newService ?? newService,
}), [overrides]);

// 4. Create hook
export function useNewService(): INewService {
  return useServices().newService;
}
```

---

## Files to Migrate

### High Priority Hooks

#### `src/hooks/useProjects.ts`

**Current imports:**
```typescript
import { projectService } from '@/ts/services/project';
```

**Migration:**
```typescript
import { useProjectService } from '@/contexts/ServiceContext';

export function useProjects() {
  const projectService = useProjectService();
  // ...
}
```

---

#### `src/hooks/useFileUpload.ts`

**Current imports:**
```typescript
import {
  fileUploadService,
  fileValidationService,
  // ...
} from '@/ts/services/upload/index.js';
```

**Migration:**
```typescript
import { useFileUploadService } from '@/contexts/ServiceContext';
// Note: May need to add fileValidationService to context first

export function useFileUpload(options) {
  const fileUploadService = useFileUploadService();
  // ...
}
```

---

#### `src/hooks/useAssetManager.ts`

**Current imports:**
```typescript
import {
  assetStorageService,
  fileUploadService,
  // ...
} from '@/ts/services/upload/index.js';
```

**Migration:**
```typescript
import { useAssetStorageService, useFileUploadService } from '@/contexts/ServiceContext';

export function useAssetManager(options) {
  const assetStorageService = useAssetStorageService();
  const fileUploadService = useFileUploadService();
  // ...
}
```

---

#### `src/hooks/useAutoSaveTrigger.ts`

**Current imports:**
```typescript
import { projectDatabaseService } from '@/ts/services/project/index.js';
```

**Migration:** First add `projectDatabaseService` to ServiceContext, then:
```typescript
import { useProjectDatabaseService } from '@/contexts/ServiceContext';

export function useAutoSaveTrigger(options) {
  const projectDatabaseService = useProjectDatabaseService();
  // ...
}
```

---

### Medium Priority Components

#### `src/components/Shared/Selectors/BackgroundStyleSelector.tsx`

**Current imports:**
```typescript
import { assetStorageService } from '@/ts/services/upload/index';
```

**Migration:**
```typescript
import { useAssetStorageService } from '@/contexts/ServiceContext';

export const BackgroundStyleSelector = memo(function BackgroundStyleSelector(props) {
  const assetStorageService = useAssetStorageService();
  // ...
});
```

---

#### `src/components/Shared/Controls/FileDropzone.tsx`

**Current imports:**
```typescript
import {
  fileUploadService,
  fileValidationService,
  // ...
} from '@/ts/services/upload/index.js';
```

**Migration:**
```typescript
import { useFileUploadService } from '@/contexts/ServiceContext';

export const FileDropzone = memo(function FileDropzone(props) {
  const fileUploadService = useFileUploadService();
  // Note: fileValidationService may need to be added to context
  // ...
});
```

---

## Testing Migrated Code

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { ServiceProvider } from '@/contexts/ServiceContext';
import { MyComponent } from './MyComponent';

// Create mock
const mockAssetStorage = {
  getById: vi.fn().mockResolvedValue({ id: '123', metadata: {} }),
  getByIdWithUrl: vi.fn().mockResolvedValue({ url: 'test.png' }),
  list: vi.fn().mockResolvedValue([]),
  // ... other methods as needed
};

test('renders correctly', async () => {
  render(
    <ServiceProvider overrides={{ assetStorageService: mockAssetStorage }}>
      <MyComponent />
    </ServiceProvider>
  );

  // Assertions...
  expect(mockAssetStorage.getById).toHaveBeenCalled();
});
```

### Hook Tests

```typescript
import { renderHook } from '@testing-library/react';
import { ServiceProvider } from '@/contexts/ServiceContext';
import { useMyHook } from './useMyHook';

const mockProjectService = {
  createProject: vi.fn().mockResolvedValue({ id: '123' }),
  listProjects: vi.fn().mockResolvedValue([]),
  // ...
};

test('creates project', async () => {
  const wrapper = ({ children }) => (
    <ServiceProvider overrides={{ projectService: mockProjectService }}>
      {children}
    </ServiceProvider>
  );

  const { result } = renderHook(() => useMyHook(), { wrapper });

  await result.current.createProject({ name: 'Test' });

  expect(mockProjectService.createProject).toHaveBeenCalledWith({ name: 'Test' });
});
```

---

## Checklist for Each Migration

- [ ] Identify service imports to replace
- [ ] Check if service is in ServiceContext (add if not)
- [ ] Import the hook from `@/contexts/ServiceContext`
- [ ] Call hook at component/hook top level
- [ ] Update all usages to use the hook result
- [ ] Add service to `useEffect` dependency arrays if needed
- [ ] Remove old direct service import
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`
- [ ] Update this document's status table

---

## Notes

- **Don't migrate utility functions** like `extractAssetId`, `isAssetReference` from `assetResolver.js` - these are pure functions, not services
- **Classes vs singletons**: `ProjectExporter` and `ProjectImporter` are classes. For these, consider instantiating in the component or creating factory hooks
- **Incremental migration**: It's fine to migrate files one at a time. The pattern is backward compatible

---

*When continuing this migration, update the status tables above and mark items as completed.*
