/**
 * Blood on the Clocktower Token Generator
 * Data Synchronization Module - Barrel Export
 *
 * This module provides GitHub release synchronization with offline caching:
 * - StorageManager: IndexedDB + Cache API for persistent storage
 * - VersionManager: Version comparison and tracking
 * - GitHubReleaseClient: GitHub API integration (Phase 2)
 * - PackageExtractor: ZIP package extraction (Phase 2)
 * - DataSyncService: Main orchestrator (Phase 3)
 */

// Phase 1: Core Infrastructure
export * from './versionManager.js';
export * from './storageManager.js';

// Phase 2: GitHub Integration
export * from './githubReleaseClient.js';
export * from './packageExtractor.js';

// Phase 3: Service Orchestration
export * from './dataSyncService.js';
export * from './migrationHelper.js';
