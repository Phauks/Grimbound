/**
 * Asset Manager Modal Component
 *
 * Full-featured modal for managing uploaded assets with filtering,
 * bulk operations, and asset organization.
 *
 * @module components/Modals/AssetManagerModal
 */

import { useState, useCallback, useMemo } from 'react';
import { useAssetManager } from '../../hooks/useAssetManager.js';
import { useFileUpload } from '../../hooks/useFileUpload.js';
import { FileDropzone } from '../Shared/FileDropzone.js';
import { AssetThumbnail } from '../Shared/AssetThumbnail.js';
import { ConfirmModal } from '../Presets/ConfirmModal';
import {
  AssetType,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_LABELS_PLURAL,
  ASSET_TYPE_ICONS,
  assetStorageService,
  fileUploadService,
} from '../../services/upload/index.js';
import styles from '../../styles/components/modals/AssetManagerModal.module.css';

// ============================================================================
// Types
// ============================================================================

interface AssetManagerModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Current project ID */
  projectId?: string;
  /** Initial filter by asset type */
  initialAssetType?: AssetType;
  /** Callback when an asset is selected for use */
  onSelectAsset?: (assetId: string) => void;
  /** Selection mode (for picking an asset) */
  selectionMode?: boolean;
}

type ScopeFilter = 'project' | 'global' | 'all';
type ViewMode = 'grid' | 'list';

const ASSET_TYPES: AssetType[] = [
  'character-icon',
  'token-background',
  'script-background',
  'setup-flower',
  'leaf',
  'logo',
];

// ============================================================================
// Component
// ============================================================================

export function AssetManagerModal({
  isOpen,
  onClose,
  projectId,
  initialAssetType,
  onSelectAsset,
  selectionMode = false,
}: AssetManagerModalProps) {
  // Local state
  const [activeTab, setActiveTab] = useState<AssetType | 'all'>(initialAssetType ?? 'all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(projectId ? 'project' : 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<AssetType>('character-icon');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null); // For selection mode

  // Use asset manager hook
  const {
    assets,
    isLoading,
    error,
    filter,
    setFilter,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    stats,
    orphanedCount,
    deleteAsset,
    deleteSelected,
    promoteToGlobal,
    cleanupOrphans,
    refresh,
  } = useAssetManager({
    currentProjectId: projectId ?? undefined,
    initialFilter: {
      type: initialAssetType,
      projectId: scopeFilter === 'all' ? 'all' : scopeFilter === 'global' ? null : projectId,
      search: searchQuery,
    },
  });

  // Update filter when local state changes
  const handleTabChange = useCallback(
    (tab: AssetType | 'all') => {
      setActiveTab(tab);
      setFilter({
        type: tab === 'all' ? undefined : tab,
      });
    },
    [setFilter]
  );

  const handleScopeChange = useCallback(
    (scope: ScopeFilter) => {
      setScopeFilter(scope);
      setFilter({
        projectId: scope === 'all' ? 'all' : scope === 'global' ? null : projectId,
      });
    },
    [setFilter, projectId]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setFilter({ search: query || undefined });
    },
    [setFilter]
  );

  // Handle asset selection (for selection mode - just select, don't apply)
  const handleAssetClick = useCallback(
    (id: string) => {
      if (selectionMode) {
        // Toggle selection in selection mode
        setSelectedAssetId(prev => prev === id ? null : id);
      } else {
        toggleSelect(id);
      }
    },
    [selectionMode, toggleSelect]
  );

  // Handle apply button click (selection mode)
  const handleApply = useCallback(() => {
    if (selectedAssetId && onSelectAsset) {
      onSelectAsset(selectedAssetId);
      onClose();
    }
  }, [selectedAssetId, onSelectAsset, onClose]);

  // Handle delete confirmation
  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDelete(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDelete) {
      await deleteAsset(confirmDelete);
      setConfirmDelete(null);
    }
  }, [confirmDelete, deleteAsset]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size > 0) {
      await deleteSelected();
    }
  }, [selectedIds, deleteSelected]);

  // Handle upload complete
  const handleUploadComplete = useCallback(
    (assetIds: string[]) => {
      setShowUpload(false);
      refresh();
    },
    [refresh]
  );

  // Handle cleanup orphans
  const handleCleanupOrphans = useCallback(async () => {
    const count = await cleanupOrphans();
    // Could show a toast here
  }, [cleanupOrphans]);

  // Handle rename
  const handleRename = useCallback(async (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    
    const newName = window.prompt('Enter new name:', asset.metadata.filename);
    if (newName && newName.trim() && newName !== asset.metadata.filename) {
      await assetStorageService.update(id, {
        metadata: { ...asset.metadata, filename: newName.trim() }
      });
      refresh();
    }
  }, [assets, refresh]);

  // Handle download
  const handleDownload = useCallback(async (id: string) => {
    const asset = await assetStorageService.getById(id);
    if (!asset) return;
    
    const url = URL.createObjectURL(asset.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.metadata.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Handle duplicate
  const handleDuplicate = useCallback(async (id: string) => {
    const asset = await assetStorageService.getById(id);
    if (!asset) return;
    
    // Create a copy with a new name
    const nameParts = asset.metadata.filename.split('.');
    const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
    const baseName = nameParts.join('.');
    const newName = `${baseName} (copy)${ext}`;
    
    await assetStorageService.save({
      type: asset.type,
      projectId: asset.projectId,
      blob: asset.blob,
      thumbnail: asset.thumbnail,
      metadata: { ...asset.metadata, filename: newName, uploadedAt: Date.now() },
      linkedTo: [],
    });
    refresh();
  }, [refresh]);

  // Handle reclassify (change asset type) - directly from submenu
  const handleReclassify = useCallback(async (id: string, newType: AssetType) => {
    const asset = await assetStorageService.getById(id);
    if (!asset || asset.type === newType) return;
    
    await assetStorageService.update(id, { type: newType });
    refresh();
  }, [refresh]);

  // Memoized filtered assets (for display)
  const displayAssets = useMemo(() => {
    return assets;
  }, [assets]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {selectionMode ? 'Select Asset' : 'Asset Manager'}
          </h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('all')}
          >
            All
          </button>
          {ASSET_TYPES.map((type) => (
            <button
              key={type}
              className={`${styles.tab} ${activeTab === type ? styles.activeTab : ''}`}
              onClick={() => handleTabChange(type)}
            >
              <span className={styles.tabIcon}>{ASSET_TYPE_ICONS[type]}</span>
              <span className={styles.tabLabel}>{ASSET_TYPE_LABELS_PLURAL[type]}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.controlsLeft}>
            <select
              value={scopeFilter}
              onChange={(e) => handleScopeChange(e.target.value as ScopeFilter)}
              className={styles.scopeSelect}
            >
              {projectId && <option value="project">This Project</option>}
              <option value="global">Global Library</option>
              <option value="all">All Assets</option>
            </select>

            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.controlsRight}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.activeView : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                ▦
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.activeView : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                ☰
              </button>
            </div>

            <button
              onClick={() => setShowUpload(!showUpload)}
              className={styles.uploadButton}
            >
              {showUpload ? 'Cancel' : '+ Upload'}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={styles.statsBar}>
          <span className={styles.statText}>
            📊 {stats?.count ?? 0} assets | {stats?.totalSizeMB.toFixed(1) ?? 0} MB
          </span>
          {selectedIds.size > 0 && (
            <span className={styles.selectionInfo}>
              {selectedIds.size} selected
            </span>
          )}
          {orphanedCount > 0 && (
            <span className={styles.orphanWarning}>
              ⚠️ {orphanedCount} orphaned
            </span>
          )}
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className={styles.uploadSection}>
            <div className={styles.uploadTypeSelect}>
              <label>Upload as:</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as AssetType)}
                className={styles.typeSelect}
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ASSET_TYPE_ICONS[type]} {ASSET_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <FileDropzone
              assetType={uploadType}
              projectId={scopeFilter === 'global' ? null : projectId}
              multiple={true}
              onUploadComplete={handleUploadComplete}
              compact={true}
            />
          </div>
        )}

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading assets...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>Error: {error}</p>
              <button onClick={refresh} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : displayAssets.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>📁</p>
              <p className={styles.emptyText}>
                {searchQuery
                  ? `No assets found matching "${searchQuery}"`
                  : 'No assets yet. Upload some files to get started!'}
              </p>
              {!showUpload && (
                <button
                  onClick={() => setShowUpload(true)}
                  className={styles.uploadPrompt}
                >
                  Upload Assets
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className={styles.assetGrid}>
              {displayAssets.map((asset) => (
                <AssetThumbnail
                  key={asset.id}
                  asset={asset}
                  isSelected={selectionMode ? selectedAssetId === asset.id : isSelected(asset.id)}
                  onSelect={handleAssetClick}
                  onDelete={handleDeleteClick}
                  onRename={handleRename}
                  onDownload={handleDownload}
                  onDuplicate={handleDuplicate}
                  onReclassify={handleReclassify}
                  onPromoteToGlobal={asset.projectId ? promoteToGlobal : undefined}
                  showSelect={!selectionMode}
                  size="medium"
                />
              ))}
            </div>
          ) : (
            <div className={styles.assetList}>
              {displayAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={`${styles.listItem} ${(selectionMode ? selectedAssetId === asset.id : isSelected(asset.id)) ? styles.selectedItem : ''}`}
                  onClick={() => handleAssetClick(asset.id)}
                >
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.metadata.filename}
                    className={styles.listThumbnail}
                  />
                  <div className={styles.listInfo}>
                    <span className={styles.listFilename}>{asset.metadata.filename}</span>
                    <span className={styles.listMeta}>
                      {ASSET_TYPE_ICONS[asset.type]} {ASSET_TYPE_LABELS[asset.type]} •{' '}
                      {(asset.metadata.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <span className={asset.projectId ? styles.projectBadge : styles.globalBadge}>
                    {asset.projectId ? '📁' : '🌐'}
                  </span>
                  {!selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(asset.id);
                      }}
                      className={styles.listDeleteButton}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {selectedIds.size > 0 && !selectionMode && (
              <>
                <button onClick={selectAll} className={styles.footerButton}>
                  Select All
                </button>
                <button onClick={clearSelection} className={styles.footerButton}>
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDelete}
                  className={`${styles.footerButton} ${styles.deleteButton}`}
                >
                  Delete Selected ({selectedIds.size})
                </button>
              </>
            )}
            {orphanedCount > 0 && !selectionMode && (
              <button onClick={handleCleanupOrphans} className={styles.footerButton}>
                Clean Up Orphans ({orphanedCount})
              </button>
            )}
          </div>
          <div className={styles.footerRight}>
            <button onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            {selectionMode && (
              <button
                onClick={handleApply}
                className={styles.applyButton}
                disabled={!selectedAssetId}
              >
                Apply
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Delete Asset?"
          message="This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </div>
    </div>
  );
}

export default AssetManagerModal;
