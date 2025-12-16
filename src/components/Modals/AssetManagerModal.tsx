/**
 * Asset Manager Modal Component
 *
 * Full-featured modal for managing uploaded assets with filtering,
 * bulk operations, and asset organization.
 * Migrated to use unified Modal, Button, and ConfirmDialog components.
 *
 * @module components/Modals/AssetManagerModal
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Modal } from '../Shared/ModalBase/Modal';
import { Button } from '../Shared/UI/Button';
import { ConfirmDialog } from '../Shared/ModalBase/ConfirmDialog';
import { useAssetManager } from '../../hooks/useAssetManager.js';
import { useFileUpload } from '../../hooks/useFileUpload.js';
import { useTokenContext } from '../../contexts/TokenContext.js';
import { FileDropzone } from '../Shared/Controls/FileDropzone.js';
import { AssetThumbnail } from '../Shared/Assets/AssetThumbnail.js';
import { TokenGenerator } from '../../ts/generation/tokenGenerator.js';
import { getBestPreviewCharacter } from '../../ts/data/characterUtils.js';
import { logger } from '../../ts/utils/logger.js';
import type { GenerationOptions, Character, BackgroundStyle } from '../../ts/types/index.js';
import { DEFAULT_BACKGROUND_STYLE } from '../../ts/types/backgroundEffects.js';
import {
  AssetType,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_LABELS_PLURAL,
  ASSET_TYPE_ICONS,
  assetStorageService,
  fileUploadService,
} from '../../ts/services/upload/index.js';
import { getBuiltInAssets, type BuiltInAsset } from '../../ts/constants/builtInAssets.js';
import { createAssetReference } from '../../ts/services/upload/assetResolver.js';
import styles from '../../styles/components/modals/AssetManagerModal.module.css';

// ============================================================================
// Types
// ============================================================================

/** Token type for preview generation */
type PreviewTokenType = 'character' | 'reminder' | 'meta';

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
  includeBuiltIn = false,
  showNoneOption = false,
  noneLabel = 'None',
  generationOptions,
  previewTokenType = 'character',
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

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const generationIdRef = useRef(0);

  // Get character data from context for preview
  const { characters, scriptMeta, exampleToken } = useTokenContext();

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
    if (onSelectAsset) {
      if (selectedAssetId === 'none') {
        // "None" was selected
        onSelectAsset('none');
      } else if (selectedAssetId?.startsWith('builtin:')) {
        // Built-in asset - return just the ID without prefix
        onSelectAsset(selectedAssetId.replace('builtin:', ''));
      } else if (selectedAssetId) {
        // User asset - return as asset reference
        onSelectAsset(createAssetReference(selectedAssetId));
      }
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

  // Get built-in assets for the current filter type
  const builtInAssets = useMemo(() => {
    if (!selectionMode || !includeBuiltIn) return [];
    const filterType = activeTab === 'all' ? initialAssetType : activeTab;
    if (!filterType) return [];
    return getBuiltInAssets(filterType);
  }, [selectionMode, includeBuiltIn, activeTab, initialAssetType]);

  // Memoized filtered assets (for display) - including built-in when applicable
  const displayAssets = useMemo(() => {
    return assets;
  }, [assets]);

  // Fallback sample character when no characters are loaded
  const fallbackCharacter: Character = {
    id: 'washerwoman',
    uuid: 'fallback-washerwoman-preview',
    name: 'Washerwoman',
    team: 'townsfolk',
    ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
    image: 'https://wiki.bloodontheclocktower.com/images/1/1a/Icon_washerwoman.png',
    reminders: ['Townsfolk', 'Wrong'],
    setup: true,
    firstNight: 1,
    firstNightReminder: 'Point to 2 players, one of which is the Townsfolk.',
    otherNight: 0,
    otherNightReminder: '',
    source: 'official',
  };

  // Get the character for preview - prioritize example token, then best preview candidate
  const sampleCharacter = useMemo((): Character => {
    // If there's an example token set, use its character data
    if (exampleToken?.characterData) {
      return exampleToken.characterData;
    }
    // Use centralized selection logic (matches TokenPreviewRow)
    return getBestPreviewCharacter(characters) || fallbackCharacter;
  }, [characters, exampleToken]);

  // Sample reminder text for reminder token preview
  const sampleReminderText = useMemo(() => {
    if (sampleCharacter.reminders && sampleCharacter.reminders.length > 0) {
      return sampleCharacter.reminders[0];
    }
    return 'Reminder';
  }, [sampleCharacter]);

  // Map asset type to generation option property based on preview token type
  const getPreviewOptions = useCallback((assetValue: string | null): Partial<GenerationOptions> => {
    if (!assetValue || assetValue === 'none') return {};

    const assetType = initialAssetType || activeTab;

    // Handle token backgrounds based on which token type we're previewing
    // Uses the new BackgroundStyle structure with sourceType and imageUrl
    if (assetType === 'token-background') {
      const imageStyle: BackgroundStyle = {
        ...DEFAULT_BACKGROUND_STYLE,
        sourceType: 'image',
        imageUrl: assetValue,
      };

      switch (previewTokenType) {
        case 'reminder':
          return { reminderBackgroundStyle: imageStyle };
        case 'meta':
          return { metaBackgroundStyle: imageStyle };
        case 'character':
        default:
          return { characterBackgroundStyle: imageStyle };
      }
    }

    // Handle other asset types
    switch (assetType) {
      case 'setup-flower':
        return { setupFlowerStyle: assetValue };
      case 'leaf':
        return { leafGeneration: assetValue };
      case 'script-background':
        return {
          metaBackgroundType: 'image' as const,
          metaBackground: assetValue
        };
      default:
        return {};
    }
  }, [initialAssetType, activeTab, previewTokenType]);

  // Generate preview when modal opens or selection changes
  useEffect(() => {
    // Generate preview when we have generation options (show current state or selected asset)
    if (!generationOptions) {
      setPreviewUrl(null);
      return;
    }

    const genId = ++generationIdRef.current;

    const generatePreview = async () => {
      setIsGeneratingPreview(true);

      try {
        // Get the asset value for preview options (if an asset is selected)
        let assetValue: string | null = null;
        if (selectedAssetId) {
          if (selectedAssetId === 'none') {
            assetValue = 'none';
          } else if (selectedAssetId.startsWith('builtin:')) {
            assetValue = selectedAssetId.replace('builtin:', '');
          } else {
            assetValue = createAssetReference(selectedAssetId);
          }
        }

        // Merge preview options with generation options
        // If no asset selected, just use current generation options to show current state
        const previewOptions = {
          ...generationOptions,
          ...(assetValue ? getPreviewOptions(assetValue) : {}),
          logoUrl: scriptMeta?.logo
        };

        const generator = new TokenGenerator(previewOptions);
        let canvas: HTMLCanvasElement | null = null;

        // Generate the appropriate token type based on previewTokenType
        switch (previewTokenType) {
          case 'reminder':
            canvas = await generator.generateReminderToken(sampleCharacter, sampleReminderText);
            break;
          case 'meta':
            canvas = await generator.generateScriptNameToken(
              scriptMeta?.name || 'Custom Script',
              scriptMeta?.author
            );
            break;
          case 'character':
          default:
            canvas = await generator.generateCharacterToken(sampleCharacter);
            break;
        }

        // Only update if this is still the current generation
        if (genId === generationIdRef.current && canvas) {
          setPreviewUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        if (genId === generationIdRef.current) {
          logger.error('AssetManagerModal', 'Preview generation error', err);
          setPreviewUrl(null);
        }
      } finally {
        if (genId === generationIdRef.current) {
          setIsGeneratingPreview(false);
        }
      }
    };

    // Debounce preview generation
    const timeout = setTimeout(generatePreview, 150);
    return () => clearTimeout(timeout);
  }, [selectedAssetId, generationOptions, sampleCharacter, sampleReminderText, scriptMeta, getPreviewOptions, previewTokenType]);

  // Determine if we should show the preview panel
  // Always show preview when we have generationOptions (even without characters - we have fallback)
  const showPreviewPanel = !!generationOptions;

  // Render the asset content (grid or list view)
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
          <button onClick={refresh} className={styles.retryButton}>
            Retry
          </button>
        </div>
      );
    }

    if (displayAssets.length === 0 && builtInAssets.length === 0 && !showNoneOption) {
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
              className={`${styles.builtInThumbnail} ${selectedAssetId === 'none' ? styles.selectedBuiltIn : ''}`}
              onClick={() => setSelectedAssetId(prev => prev === 'none' ? null : 'none')}
            >
              <span className={styles.noneIcon}>∅</span>
              <span className={styles.builtInLabel}>{noneLabel}</span>
            </button>
          )}

          {/* Built-in Assets (in selection mode) */}
          {selectionMode && builtInAssets.map((asset) => (
            <button
              key={`builtin:${asset.id}`}
              className={`${styles.builtInThumbnail} ${selectedAssetId === `builtin:${asset.id}` ? styles.selectedBuiltIn : ''}`}
              onClick={() => setSelectedAssetId(prev => prev === `builtin:${asset.id}` ? null : `builtin:${asset.id}`)}
            >
              <img src={asset.src} alt={asset.label} className={styles.builtInImage} />
              <span className={styles.builtInLabel}>{asset.label}</span>
              <span className={styles.builtInBadge}>●</span>
            </button>
          ))}

          {/* Separator between built-in and user assets */}
          {selectionMode && (builtInAssets.length > 0 || showNoneOption) && displayAssets.length > 0 && (
            <div className={styles.assetSeparator}>
              <span>My Uploads</span>
            </div>
          )}

          {/* User Assets */}
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
      );
    }

    return (
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
    );
  };

  // Render the controls (tabs, search, etc.)
  const renderControls = () => (
    <>
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
    </>
  );

  // Footer for non-selection mode (bulk operations)
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
            <Button variant="ghost" size="small" onClick={handleCleanupOrphans}>
              Clean Up Orphans ({orphanedCount})
            </Button>
          )}
        </div>
        <div className={styles.footerRight}>
          <Button variant="secondary" onClick={onClose}>
            {selectionMode ? 'Cancel' : 'Done'}
          </Button>
          {selectionMode && (
            <Button
              variant="accent"
              onClick={handleApply}
              disabled={!selectedAssetId}
            >
              Apply
            </Button>
          )}
        </div>
      </>
    );
  };

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
            <div className={styles.scrollableContent}>
              {renderAssetContent()}
            </div>
          </div>

          {/* Right Panel: Fixed preview with buttons */}
          <div className={styles.rightPanel}>
            <div className={styles.previewPanel}>
              <div className={styles.previewHeader}>Live Preview</div>
              <div className={styles.previewContainer}>
                {isGeneratingPreview && (
                  <div className={styles.previewSpinner}>
                    <div className={styles.spinner} />
                  </div>
                )}
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Token preview"
                    className={styles.previewImage}
                  />
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <span className={styles.previewPlaceholderIcon}>🎴</span>
                    <span className={styles.previewPlaceholderText}>
                      Generating preview...
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.previewLabel}>
                {previewTokenType === 'meta' ? (
                  <>
                    <span className={styles.previewCharacterName}>{scriptMeta?.name || 'Custom Script'}</span>
                    <span className={styles.previewTeam}>Meta Token</span>
                  </>
                ) : previewTokenType === 'reminder' ? (
                  <>
                    <span className={styles.previewCharacterName}>{sampleReminderText}</span>
                    <span className={styles.previewTeam}>Reminder Token</span>
                  </>
                ) : (
                  <>
                    <span className={styles.previewCharacterName}>{sampleCharacter.name}</span>
                    <span className={styles.previewTeam}>{sampleCharacter.team}</span>
                  </>
                )}
              </div>

              {/* Action Buttons at bottom of preview panel */}
              <div className={styles.previewActions}>
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  onClick={handleApply}
                  disabled={!selectedAssetId}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard layout without preview */
        <>
          {renderControls()}
          <div className={styles.content}>
            {renderAssetContent()}
          </div>
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
