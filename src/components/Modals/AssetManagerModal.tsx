/**
 * Asset Manager Modal Component
 *
 * Full-featured modal for managing uploaded assets with filtering,
 * bulk operations, and asset organization.
 * Migrated to use unified Modal, Button, and ConfirmDialog components.
 *
 * @module components/Modals/AssetManagerModal
 */

import { useCallback, useState } from 'react';
import { AssetThumbnail } from '@/components/Shared/Assets/AssetThumbnail.js';
import { FileDropzone } from '@/components/Shared/Controls/FileDropzone.js';
import { ConfirmDialog } from '@/components/Shared/ModalBase/ConfirmDialog';
import { Modal } from '@/components/Shared/ModalBase/Modal';
import { Button } from '@/components/Shared/UI/Button';
import { useTokenContext } from '@/contexts/TokenContext.js';
import {
  type PreviewTokenType,
  useAssetManager,
  useAssetOperations,
  useAssetPreviewGenerator,
  useAssetSelection,
} from '@/hooks/assets/index.js';
import styles from '@/styles/components/modals/AssetManagerModal.module.css';
import {
  ASSET_TYPE_ICONS,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_LABELS_PLURAL,
  type AssetType,
} from '@/ts/services/upload/index.js';
import type { GenerationOptions } from '@/ts/types/index.js';

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
  /** Include built-in assets in selection mode */
  includeBuiltIn?: boolean;
  /** Show a "None" option in selection mode */
  showNoneOption?: boolean;
  /** Label for the None option */
  noneLabel?: string;
  /** Generation options for live preview (enables preview panel) */
  generationOptions?: GenerationOptions;
  /** Which token type to show in preview (defaults to 'character') */
  previewTokenType?: PreviewTokenType;
}

type ScopeFilter = 'project' | 'global' | 'all';
type ViewMode = 'grid' | 'list';

const ASSET_TYPES: AssetType[] = [
  'character-icon',
  'token-background',
  'script-background',
  'setup-overlay',
  'accent',
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
  includeBuiltIn = false,
  showNoneOption = false,
  noneLabel = 'None',
  generationOptions,
  previewTokenType = 'character',
}: AssetManagerModalProps) {
  // Local UI state
  const [activeTab, setActiveTab] = useState<AssetType | 'all'>(initialAssetType ?? 'all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(projectId ? 'project' : 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState<AssetType>('character-icon');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Get script metadata from context for preview labels
  const { scriptMeta } = useTokenContext();

  // Use asset manager hook for asset listing and bulk operations
  const {
    assets,
    isLoading,
    error,
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

  // Use asset selection hook for selection mode
  const {
    selectedAssetId,
    setSelectedAssetId,
    toggleAssetSelection,
    builtInAssets,
    handleApply,
    isApplyDisabled,
    noneLabel: resolvedNoneLabel,
  } = useAssetSelection({
    selectionMode,
    includeBuiltIn,
    showNoneOption,
    noneLabel,
    activeTab,
    initialAssetType,
    onSelectAsset,
    onClose,
  });

  // Use asset operations hook for CRUD
  const { handleRename, handleDownload, handleDuplicate, handleReclassify } = useAssetOperations({
    assets,
    refresh,
  });

  // Use asset preview generator hook
  const {
    previewUrl,
    isGenerating: isGeneratingPreview,
    showPreviewPanel,
    sampleCharacter,
    sampleReminderText,
  } = useAssetPreviewGenerator({
    generationOptions,
    previewTokenType,
    assetType: activeTab,
    initialAssetType,
    selectedAssetId,
  });

  // ============================================================================
  // Filter Handlers
  // ============================================================================

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

  // ============================================================================
  // Asset Click Handler
  // ============================================================================

  const handleAssetClick = useCallback(
    (id: string) => {
      if (selectionMode) {
        toggleAssetSelection(id);
      } else {
        toggleSelect(id);
      }
    },
    [selectionMode, toggleAssetSelection, toggleSelect]
  );

  // ============================================================================
  // Delete Handlers
  // ============================================================================

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

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size > 0) {
      await deleteSelected();
    }
  }, [selectedIds, deleteSelected]);

  // ============================================================================
  // Upload Handler
  // ============================================================================

  const handleUploadComplete = useCallback(
    (_assetIds: string[]) => {
      setShowUpload(false);
      refresh();
    },
    [refresh]
  );

  // ============================================================================
  // Render: Asset Content (Grid or List)
  // ============================================================================

  const renderAssetContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading assets...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorState}>
          <p>Error: {error}</p>
          <button type="button" onClick={refresh} className={styles.retryButton}>
            Retry
          </button>
        </div>
      );
    }

    if (assets.length === 0 && builtInAssets.length === 0 && !showNoneOption) {
      return (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>📁</p>
          <p className={styles.emptyText}>
            {searchQuery
              ? `No assets found matching "${searchQuery}"`
              : 'No assets yet. Upload some files to get started!'}
          </p>
          {!showUpload && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className={styles.uploadPrompt}
            >
              Upload Assets
            </button>
          )}
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className={styles.assetGrid}>
          {/* None Option (in selection mode) */}
          {selectionMode && showNoneOption && (
            <button
              type="button"
              className={`${styles.builtInThumbnail} ${selectedAssetId === 'none' ? styles.selectedBuiltIn : ''}`}
              onClick={() => setSelectedAssetId(selectedAssetId === 'none' ? null : 'none')}
            >
              <span className={styles.noneIcon}>∅</span>
              <span className={styles.builtInLabel}>{resolvedNoneLabel}</span>
            </button>
          )}

          {/* Built-in Assets (in selection mode) */}
          {selectionMode &&
            builtInAssets.map((asset) => (
              <button
                type="button"
                key={`builtin:${asset.id}`}
                className={`${styles.builtInThumbnail} ${selectedAssetId === `builtin:${asset.id}` ? styles.selectedBuiltIn : ''}`}
                onClick={() =>
                  setSelectedAssetId(
                    selectedAssetId === `builtin:${asset.id}` ? null : `builtin:${asset.id}`
                  )
                }
              >
                <img src={asset.src} alt={asset.label} className={styles.builtInImage} />
                <span className={styles.builtInLabel}>{asset.label}</span>
                <span className={styles.builtInBadge}>●</span>
              </button>
            ))}

          {/* Separator between built-in and user assets */}
          {selectionMode && (builtInAssets.length > 0 || showNoneOption) && assets.length > 0 && (
            <div className={styles.assetSeparator}>
              <span>My Uploads</span>
            </div>
          )}

          {/* User Assets */}
          {assets.map((asset) => (
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
      );
    }

    // List view
    return (
      <div className={styles.assetList}>
        {assets.map((asset) => (
          <button
            type="button"
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(asset.id);
                }}
                className={styles.listDeleteButton}
              >
                🗑️
              </button>
            )}
          </button>
        ))}
      </div>
    );
  };

  // ============================================================================
  // Render: Controls (Tabs, Search, etc.)
  // ============================================================================

  const renderControls = () => (
    <>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All
        </button>
        {ASSET_TYPES.map((type) => (
          <button
            type="button"
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
              type="button"
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.activeView : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              ▦
            </button>
            <button
              type="button"
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.activeView : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              ☰
            </button>
          </div>

          <Button
            variant={showUpload ? 'secondary' : 'accent'}
            size="small"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'Cancel' : '+ Upload'}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <span className={styles.statText}>
          📊 {stats?.count ?? 0} assets | {stats?.totalSizeMB.toFixed(1) ?? 0} MB
        </span>
        {selectedIds.size > 0 && (
          <span className={styles.selectionInfo}>{selectedIds.size} selected</span>
        )}
        {orphanedCount > 0 && (
          <span className={styles.orphanWarning}>⚠️ {orphanedCount} orphaned</span>
        )}
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className={styles.uploadSection}>
          <div className={styles.uploadTypeSelect}>
            <label htmlFor="asset-upload-type">Upload as:</label>
            <select
              id="asset-upload-type"
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
    </>
  );

  // ============================================================================
  // Render: Footer
  // ============================================================================

  const renderFooter = () => {
    if (showPreviewPanel) {
      // In selection mode with preview, only show bulk operation buttons if applicable
      return selectedIds.size > 0 ? (
        <>
          <div className={styles.footerLeft}>
            <Button variant="ghost" size="small" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="small" onClick={clearSelection}>
              Clear Selection
            </Button>
            <Button variant="danger" size="small" onClick={handleBulkDelete}>
              Delete Selected ({selectedIds.size})
            </Button>
          </div>
          <div className={styles.footerRight} />
        </>
      ) : null;
    }

    // Non-selection mode footer
    return (
      <>
        <div className={styles.footerLeft}>
          {selectedIds.size > 0 && (
            <>
              <Button variant="ghost" size="small" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="small" onClick={clearSelection}>
                Clear Selection
              </Button>
              <Button variant="danger" size="small" onClick={handleBulkDelete}>
                Delete Selected ({selectedIds.size})
              </Button>
            </>
          )}
          {orphanedCount > 0 && (
            <Button variant="ghost" size="small" onClick={cleanupOrphans}>
              Clean Up Orphans ({orphanedCount})
            </Button>
          )}
        </div>
        <div className={styles.footerRight}>
          <Button variant="secondary" onClick={onClose}>
            {selectionMode ? 'Cancel' : 'Done'}
          </Button>
          {selectionMode && (
            <Button variant="accent" onClick={handleApply} disabled={isApplyDisabled}>
              Apply
            </Button>
          )}
        </div>
      </>
    );
  };

  // ============================================================================
  // Render: Preview Panel
  // ============================================================================

  const renderPreviewPanel = () => (
    <div className={styles.previewPanel}>
      <div className={styles.previewHeader}>Live Preview</div>
      <div className={styles.previewContainer}>
        {isGeneratingPreview && (
          <div className={styles.previewSpinner}>
            <div className={styles.spinner} />
          </div>
        )}
        {previewUrl ? (
          <img src={previewUrl} alt="Token preview" className={styles.previewImage} />
        ) : (
          <div className={styles.previewPlaceholder}>
            <span className={styles.previewPlaceholderIcon}>🎴</span>
            <span className={styles.previewPlaceholderText}>Generating preview...</span>
          </div>
        )}
      </div>
      <div className={styles.previewLabel}>
        {previewTokenType === 'meta' ? (
          <>
            <span className={styles.previewCharacterName}>
              {scriptMeta?.name || 'Custom Script'}
            </span>
            <span className={styles.previewTeam}>Meta Token</span>
          </>
        ) : previewTokenType === 'reminder' ? (
          <>
            <span className={styles.previewCharacterName}>{sampleReminderText}</span>
            <span className={styles.previewTeam}>Reminder Token</span>
          </>
        ) : (
          <>
            <span className={styles.previewCharacterName}>
              {sampleCharacter?.name || 'Sample Character'}
            </span>
            <span className={styles.previewTeam}>{sampleCharacter?.team || 'townsfolk'}</span>
          </>
        )}
      </div>

      {/* Action Buttons at bottom of preview panel */}
      <div className={styles.previewActions}>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleApply} disabled={isApplyDisabled}>
          Apply
        </Button>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectionMode ? 'Select Asset' : 'Asset Manager'}
      size="full"
      footer={!showPreviewPanel ? renderFooter() : undefined}
    >
      {showPreviewPanel ? (
        /* Side-by-side layout with preview panel */
        <div className={styles.modalBodyWithPreview}>
          {/* Left Panel: Controls and scrollable content */}
          <div className={styles.leftPanel}>
            {renderControls()}
            <div className={styles.scrollableContent}>{renderAssetContent()}</div>
          </div>

          {/* Right Panel: Fixed preview with buttons */}
          <div className={styles.rightPanel}>{renderPreviewPanel()}</div>
        </div>
      ) : (
        /* Standard layout without preview */
        <>
          {renderControls()}
          <div className={styles.content}>{renderAssetContent()}</div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Asset?"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

export default AssetManagerModal;
