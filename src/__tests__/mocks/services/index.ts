export * from './mockAssetStorageService';
export * from './mockDataSyncService';
export * from './mockProjectService';

import { createMockAssetStorageService } from './mockAssetStorageService';
import { createMockDataSyncService } from './mockDataSyncService';
import { createMockProjectDatabase, createMockProjectService } from './mockProjectService';

/**
 * Create all mock services for testing.
 * Use with ServiceProvider overrides.
 */
export function createMockServices() {
  return {
    projectService: createMockProjectService(),
    projectDatabaseService: createMockProjectDatabase(),
    assetStorageService: createMockAssetStorageService(),
    dataSyncService: createMockDataSyncService(),
  };
}
