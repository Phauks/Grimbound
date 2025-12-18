/**
 * Service Context
 *
 * Provides dependency injection for React components.
 * Services are resolved once and shared across the component tree.
 *
 * @module contexts/ServiceContext
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

// Import service interfaces
import type {
  IProjectDatabase,
  IProjectExporter,
  IProjectImporter,
  IProjectService,
} from '@/ts/services/project/IProjectService.js';
import type {
  IAssetStorageService,
  IFileUploadService,
  IFileValidationService,
} from '@/ts/services/upload/IUploadServices.js';
import type { IDataSyncService } from '@/ts/sync/ISyncServices.js';

// Import classes for factory hooks
import { ProjectExporter } from '@/ts/services/project/ProjectExporter.js';
import { ProjectImporter } from '@/ts/services/project/ProjectImporter.js';

// Import default implementations (singletons)
import { projectDatabaseService } from '@/ts/services/project/ProjectDatabaseService.js';
import { projectService } from '@/ts/services/project/ProjectService.js';
import { assetStorageService } from '@/ts/services/upload/AssetStorageService.js';
import { fileUploadService } from '@/ts/services/upload/FileUploadService.js';
import { fileValidationService } from '@/ts/services/upload/FileValidationService.js';
import { dataSyncService } from '@/ts/sync/dataSyncService.js';

// ============================================================================
// Service Registry Type
// ============================================================================

/**
 * All services available through the context
 */
export interface ServiceRegistry {
  projectService: IProjectService;
  projectDatabaseService: IProjectDatabase;
  assetStorageService: IAssetStorageService;
  fileUploadService: IFileUploadService;
  fileValidationService: IFileValidationService;
  dataSyncService: IDataSyncService;
}

// ============================================================================
// Context
// ============================================================================

const ServiceContext = createContext<ServiceRegistry | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ServiceProviderProps {
  children: ReactNode;
  /**
   * Optional overrides for testing or custom configurations
   */
  overrides?: Partial<ServiceRegistry>;
}

/**
 * Provides services to the React component tree
 *
 * @example
 * ```tsx
 * // Production usage (uses default singletons)
 * <ServiceProvider>
 *   <App />
 * </ServiceProvider>
 *
 * // Testing with mocks
 * const mockProjectService = { createProject: vi.fn(), ... };
 * <ServiceProvider overrides={{ projectService: mockProjectService }}>
 *   <ComponentUnderTest />
 * </ServiceProvider>
 * ```
 */
export function ServiceProvider({ children, overrides = {} }: ServiceProviderProps) {
  const services = useMemo<ServiceRegistry>(
    () => ({
      // Default to singleton instances, allow overrides
      projectService: overrides.projectService ?? projectService,
      projectDatabaseService: overrides.projectDatabaseService ?? projectDatabaseService,
      assetStorageService: overrides.assetStorageService ?? assetStorageService,
      fileUploadService: overrides.fileUploadService ?? fileUploadService,
      fileValidationService: overrides.fileValidationService ?? fileValidationService,
      dataSyncService: overrides.dataSyncService ?? dataSyncService,
    }),
    [overrides]
  );

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get all services from context
 *
 * @throws Error if used outside ServiceProvider
 */
export function useServices(): ServiceRegistry {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

/**
 * Get the project service
 */
export function useProjectService(): IProjectService {
  return useServices().projectService;
}

/**
 * Get the project database service
 */
export function useProjectDatabaseService(): IProjectDatabase {
  return useServices().projectDatabaseService;
}

/**
 * Get the asset storage service
 */
export function useAssetStorageService(): IAssetStorageService {
  return useServices().assetStorageService;
}

/**
 * Get the file upload service
 */
export function useFileUploadService(): IFileUploadService {
  return useServices().fileUploadService;
}

/**
 * Get the file validation service
 */
export function useFileValidationService(): IFileValidationService {
  return useServices().fileValidationService;
}

/**
 * Get the data sync service
 */
export function useDataSyncService(): IDataSyncService {
  return useServices().dataSyncService;
}

// ============================================================================
// Factory Hooks
// ============================================================================

/**
 * Factory hook for creating ProjectExporter instances
 *
 * Returns a function that creates new ProjectExporter instances with
 * properly injected dependencies from the service context.
 *
 * @example
 * ```tsx
 * const createExporter = useProjectExporter();
 * const exporter = createExporter();
 * const blob = await exporter.exportAsZip(project);
 * ```
 */
export function useProjectExporter(): () => IProjectExporter {
  const assetStorageService = useAssetStorageService();
  return useCallback(
    () => new ProjectExporter({ assetStorage: assetStorageService }),
    [assetStorageService]
  );
}

/**
 * Factory hook for creating ProjectImporter instances
 *
 * Returns a function that creates new ProjectImporter instances.
 * Although ProjectImporter has no service dependencies currently,
 * using a factory hook maintains consistency and allows future DI.
 *
 * @example
 * ```tsx
 * const createImporter = useProjectImporter();
 * const importer = createImporter();
 * const project = await importer.importFromZip(file);
 * ```
 */
export function useProjectImporter(): () => IProjectImporter {
  return useCallback(() => new ProjectImporter(), []);
}
