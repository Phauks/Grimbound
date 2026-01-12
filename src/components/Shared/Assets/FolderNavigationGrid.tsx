/**
 * FolderNavigationGrid Component
 *
 * Combined grid showing folders and assets with drag-and-drop support.
 * Assets can be dragged onto folders to move them.
 *
 * @module components/Shared/Assets/FolderNavigationGrid
 */

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import styles from '@/styles/components/shared/FolderNavigationGrid.module.css';
import { TAG_TYPE_ICONS } from '@/ts/services/upload/constants.js';
import { getTypeFromTags } from '@/ts/services/upload/tagUtils.js';
import type { AssetWithUrl } from '@/ts/services/upload/types.js';
import { cn } from '@/ts/utils/classNames.js';
import { AssetContextMenu } from './AssetContextMenu.js';
import { DraggableAsset } from './DraggableAsset.js';
import { DroppableFolder } from './DroppableFolder.js';

// ============================================================================
// Types
// ============================================================================

export interface FolderNavigationGridProps {
  /** Available folders to display */
  folders: string[];
  /** Assets to display */
  assets: AssetWithUrl[];
  /** Currently selected folder (null = root) */
  selectedFolder: string | null;
  /** Called when folder is selected (navigated into) */
  onSelectFolder: (folder: string | null) => void;
  /** Called when an asset is moved to a folder (undefined = read-only mode) */
  onMoveToFolder?: (assetId: string, folder: string | null) => void;
  /** Called when a folder is moved into another folder (creating subfolders) */
  onMoveFolderToFolder?: (sourceFolder: string, targetFolder: string) => void;
  /** Currently selected asset IDs */
  selectedIds: Set<string>;
  /** Called when an asset is clicked */
  onAssetClick: (asset: AssetWithUrl) => void;
  /** Called when an asset is double-clicked */
  onAssetDoubleClick?: (asset: AssetWithUrl) => void;
  /** Whether navigation/folders should be shown */
  showNavigation?: boolean;
  /** Tile scale (0.5 to 2) */
  tileScale?: number;
  /** Additional CSS class */
  className?: string;
  /** Prefix for built-in virtual folders (for special handling) */
  builtInFolderPrefix?: string;
  /** Called when rename is requested from context menu */
  onRenameAsset?: (asset: AssetWithUrl) => void;
  /** Called when delete is requested from context menu */
  onDeleteAsset?: (asset: AssetWithUrl) => void;
  /** Called when duplicate is requested from context menu */
  onDuplicateAsset?: (asset: AssetWithUrl) => void;
  /** Called when download is requested from context menu */
  onDownloadAsset?: (asset: AssetWithUrl) => void;
}

// ============================================================================
// Component
// ============================================================================

// Context menu state type
interface ContextMenuState {
  asset: AssetWithUrl;
  position: { x: number; y: number };
}

export function FolderNavigationGrid({
  folders,
  assets,
  selectedFolder,
  onSelectFolder,
  onMoveToFolder,
  onMoveFolderToFolder,
  selectedIds,
  onAssetClick,
  onAssetDoubleClick,
  showNavigation = true,
  tileScale = 1,
  className,
  builtInFolderPrefix,
  onRenameAsset,
  onDeleteAsset,
  onDuplicateAsset,
  onDownloadAsset,
}: FolderNavigationGridProps) {
  // Helper to check if a folder is a built-in virtual folder
  const isBuiltInFolder = (folder: string) => {
    if (!builtInFolderPrefix) return false;
    return folder.startsWith(builtInFolderPrefix);
  };

  // Check if currently in a built-in folder
  const isInBuiltInFolder = (() => {
    if (selectedFolder === null) return false;
    if (!builtInFolderPrefix) return false;
    return selectedFolder.startsWith(builtInFolderPrefix);
  })();

  const [draggedAsset, setDraggedAsset] = useState<AssetWithUrl | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Handle context menu open
  const handleAssetContextMenu = (asset: AssetWithUrl, position: { x: number; y: number }) => {
    setContextMenu({ asset, position });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Filter assets to match current folder view
  // This ensures optimistic updates work correctly (moved assets disappear immediately)
  const displayedAssets = (() => {
    if (!showNavigation) {
      // When navigation is hidden (search/filter mode), show all assets
      return assets;
    }
    return assets.filter((asset) => {
      if (selectedFolder === null) {
        // At root: show assets with no folder
        return !asset.folder;
      }
      // In a folder: show assets in that exact folder (not subfolders)
      return asset.folder === selectedFolder;
    });
  })();

  // Get folders to display at current level (immediate children only)
  const displayedFolders = (() => {
    if (!showNavigation) return [];

    // Get unique immediate children at current level
    const childFolders = new Set<string>();

    for (const folder of folders) {
      if (selectedFolder === null) {
        // At root: show top-level folders
        if (folder.includes('/')) {
          // Get the first part of nested paths as a folder
          const topLevel = folder.split('/')[0];
          childFolders.add(topLevel);
        } else {
          childFolders.add(folder);
        }
      } else {
        // In a folder: show immediate subfolders
        const prefix = `${selectedFolder}/`;
        if (folder.startsWith(prefix)) {
          const remainder = folder.slice(prefix.length);
          // Get immediate child (first segment after prefix)
          const childName = remainder.split('/')[0];
          if (childName) {
            childFolders.add(`${selectedFolder}/${childName}`);
          }
        }
      }
    }

    return Array.from(childFolders).sort();
  })();

  // Get folder icon based on whether it's a built-in folder
  const getFolderIcon = (folder: string) => {
    if (isBuiltInFolder(folder)) {
      return '📦'; // Built-in folder icon
    }
    return '📁'; // Regular folder icon
  };

  // Get display name for a folder (just the last segment)
  const getFolderDisplayName = (folderPath: string) => {
    const parts = folderPath.split('/');
    return parts[parts.length - 1];
  };

  // Get parent folder path (or null if at root)
  const parentFolder = (() => {
    if (!selectedFolder) return null;
    const parts = selectedFolder.split('/');
    if (parts.length === 1) return null; // Top-level folder, parent is root
    return parts.slice(0, -1).join('/');
  })();

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag
      },
    })
  );

  // Navigate to parent folder (or root if at top level)
  const handleBackClick = () => {
    onSelectFolder(parentFolder);
  };

  // Navigate into a folder
  const handleFolderClick = (folder: string) => {
    onSelectFolder(folder);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;

    // Check if dragging a folder
    if (activeId.startsWith('drag-folder:')) {
      const folderName = activeId.replace('drag-folder:', '');
      setDraggedFolder(folderName);
      setDraggedAsset(null);
      return;
    }

    // Otherwise dragging an asset
    const asset = assets.find((a) => a.id === activeId);
    if (asset) {
      setDraggedAsset(asset);
      setDraggedFolder(null);
    }
  };

  // Handle drag over folder
  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      const overId = String(event.over.id);
      if (overId === 'folder:__parent__') {
        setDragOverFolder('__parent__');
      } else if (overId.startsWith('folder:')) {
        setDragOverFolder(overId.replace('folder:', ''));
      } else {
        setDragOverFolder(null);
      }
    } else {
      setDragOverFolder(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const wasDraggingFolder = draggedFolder !== null;

    setDraggedAsset(null);
    setDraggedFolder(null);
    setDragOverFolder(null);

    if (!over) return;

    const overId = over.id as string;
    const activeId = active.id as string;

    // Handle folder-to-folder drag
    if (wasDraggingFolder && activeId.startsWith('drag-folder:')) {
      const sourceFolder = activeId.replace('drag-folder:', '');

      if (overId === 'folder:__parent__') {
        // Moving folder to parent - not supported (would need to rename all assets)
        return;
      }

      if (overId.startsWith('folder:')) {
        const targetFolder = overId.replace('folder:', '');
        // Don't allow dropping folder onto itself
        if (sourceFolder !== targetFolder && onMoveFolderToFolder) {
          onMoveFolderToFolder(sourceFolder, targetFolder);
        }
      }
      return;
    }

    // Handle asset-to-folder drag
    if (overId === 'folder:__parent__') {
      // Move to parent folder
      onMoveToFolder?.(activeId, parentFolder);
    } else if (overId.startsWith('folder:')) {
      const folderName = overId.replace('folder:', '');
      onMoveToFolder?.(activeId, folderName);
    }
  };

  // Get asset type icon
  const getAssetTypeIcon = (asset: AssetWithUrl) => {
    const assetType = getTypeFromTags(asset.tags);
    return assetType ? TAG_TYPE_ICONS[assetType] : '📄';
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn(styles.container, className)}>
        {/* Location bar - always visible */}
        <div className={styles.locationBar}>
          {/* Navigation buttons */}
          <button
            type="button"
            className={cn(styles.navButton, !selectedFolder && styles.disabled)}
            onClick={handleBackClick}
            disabled={!selectedFolder}
            title="Go up one level"
            aria-label="Go up one level"
          >
            ↑
          </button>
          <button
            type="button"
            className={cn(styles.navButton, !selectedFolder && styles.disabled)}
            onClick={() => onSelectFolder(null)}
            disabled={!selectedFolder}
            title="Go to root"
            aria-label="Go to root"
          >
            🏠
          </button>

          {/* Breadcrumb path */}
          <div className={styles.breadcrumb}>
            {selectedFolder ? (
              <>
                <button
                  type="button"
                  className={styles.breadcrumbLink}
                  onClick={() => onSelectFolder(null)}
                >
                  Root
                </button>
                {selectedFolder.split('/').map((segment, index, parts) => {
                  const path = parts.slice(0, index + 1).join('/');
                  const isLast = index === parts.length - 1;
                  return (
                    <span key={path} className={styles.breadcrumbSegment}>
                      <span className={styles.breadcrumbSeparator}>/</span>
                      {isLast ? (
                        <span className={styles.breadcrumbCurrent}>{segment}</span>
                      ) : (
                        <button
                          type="button"
                          className={styles.breadcrumbLink}
                          onClick={() => onSelectFolder(path)}
                        >
                          {segment}
                        </button>
                      )}
                    </span>
                  );
                })}
              </>
            ) : (
              <span className={styles.breadcrumbCurrent}>Root</span>
            )}
          </div>
        </div>

        {/* Combined grid of folders and assets */}
        <div
          className={styles.combinedGrid}
          style={{ '--tile-scale': tileScale } as React.CSSProperties}
        >
          {/* Folder tiles at current level */}
          {showNavigation &&
            displayedFolders.map((folder) => {
              const isFolderBuiltIn = isBuiltInFolder(folder);
              return (
                <DroppableFolder
                  key={folder}
                  id={folder}
                  name={getFolderDisplayName(folder)}
                  icon={getFolderIcon(folder)}
                  isOver={dragOverFolder === folder && !isFolderBuiltIn}
                  onClick={() => handleFolderClick(folder)}
                  isDraggable={!isFolderBuiltIn && !!onMoveFolderToFolder}
                  isDroppable={!isFolderBuiltIn}
                />
              );
            })}

          {/* Asset tiles */}
          {displayedAssets.map((asset) => (
            <DraggableAsset
              key={asset.id}
              asset={asset}
              isSelected={selectedIds.has(asset.id)}
              onClick={() => onAssetClick(asset)}
              onDoubleClick={() => onAssetDoubleClick?.(asset)}
              isDraggable={!isInBuiltInFolder && !!onMoveToFolder}
              onContextMenu={handleAssetContextMenu}
            />
          ))}
        </div>

        {/* Empty state */}
        {displayedAssets.length === 0 && displayedFolders.length === 0 && !selectedFolder && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📁</span>
            <span className={styles.emptyText}>No assets yet</span>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedAsset && (
          <div className={styles.dragOverlay}>
            <img
              src={draggedAsset.url || draggedAsset.thumbnailUrl}
              alt={draggedAsset.metadata.filename}
              className={styles.dragOverlayImage}
            />
            <span className={styles.dragOverlayIcon}>{getAssetTypeIcon(draggedAsset)}</span>
          </div>
        )}
        {draggedFolder && (
          <div className={styles.dragOverlay}>
            <span className={styles.dragOverlayFolder}>📁</span>
          </div>
        )}
      </DragOverlay>

      {/* Context menu */}
      {contextMenu && (
        <AssetContextMenu
          asset={contextMenu.asset}
          position={contextMenu.position}
          isReadOnly={isInBuiltInFolder || contextMenu.asset.id.startsWith('builtin:')}
          onClose={handleCloseContextMenu}
          onRename={onRenameAsset}
          onDelete={onDeleteAsset}
          onDuplicate={onDuplicateAsset}
          onDownload={onDownloadAsset}
        />
      )}
    </DndContext>
  );
}
