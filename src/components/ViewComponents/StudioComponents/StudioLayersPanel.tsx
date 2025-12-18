/**
 * Studio Layers Panel
 *
 * Right sidebar content for managing layers with full features.
 * Renders as content-only - wrapper handled by ViewLayout.Panel.
 *
 * Features:
 * - Visibility, lock toggles
 * - Opacity sliders
 * - Blend mode dropdowns
 * - Drag-to-reorder
 * - Right-click context menu
 */

import { useState } from 'react';
import { useStudio } from '@/contexts/StudioContext';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/studio/Studio.module.css';
import { layerManager } from '@/ts/studio/layerManager';
import type { BlendMode } from '@/ts/types/index';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  layerId: string | null;
}

export function StudioLayersPanel() {
  const {
    layers,
    activeLayerId,
    editMode,
    setActiveLayer,
    updateLayer,
    removeLayer,
    duplicateLayer: contextDuplicateLayer,
    mergeLayerDown,
    flattenAllLayers,
    reorderLayers,
    pushHistory,
  } = useStudio();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    layerId: null,
  });

  // Drag-and-drop state
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Sort layers by z-index (highest to lowest for display)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  // Blend mode options
  const blendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

  // Helper to determine if a layer is locked based on edit mode
  // In icon-only mode, only the first (top) layer is editable
  const isLayerLocked = (layer: (typeof layers)[0], index: number): boolean => {
    if (editMode === 'full') return layer.locked ?? false;
    // In icon-only mode, lock all layers except the first (top) one
    return editMode === 'icon-only' && index !== 0;
  };

  // Close context menu when clicking outside
  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, layerId: null });
  };

  // Handle right-click
  const handleContextMenu = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      layerId,
    });
  };

  // Context menu actions
  const handleDuplicate = () => {
    if (contextMenu.layerId) {
      contextDuplicateLayer(contextMenu.layerId);
      pushHistory('Duplicate Layer');
    }
    handleCloseContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu.layerId) {
      const layer = layers.find((l) => l.id === contextMenu.layerId);
      if (layer && confirm(`Delete layer "${layer.name}"?`)) {
        removeLayer(contextMenu.layerId);
        pushHistory('Delete Layer');
      }
    }
    handleCloseContextMenu();
  };

  const handleMergeDown = () => {
    if (contextMenu.layerId) {
      try {
        mergeLayerDown(contextMenu.layerId);
        pushHistory('Merge Layer Down');
      } catch (error) {
        alert((error as Error).message);
      }
    }
    handleCloseContextMenu();
  };

  const handleMoveToTop = () => {
    if (contextMenu.layerId) {
      const currentIndex = layers.findIndex((l) => l.id === contextMenu.layerId);
      if (currentIndex > 0) {
        reorderLayers(currentIndex, 0); // Move to top (index 0)
        pushHistory('Move Layer to Top');
      }
    }
    handleCloseContextMenu();
  };

  const handleMoveToBottom = () => {
    if (contextMenu.layerId) {
      const currentIndex = layers.findIndex((l) => l.id === contextMenu.layerId);
      if (currentIndex < layers.length - 1) {
        reorderLayers(currentIndex, layers.length - 1); // Move to bottom
        pushHistory('Move Layer to Bottom');
      }
    }
    handleCloseContextMenu();
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLayerId(layerId);
  };

  const handleDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();

    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    // Find indices
    const fromIndex = sortedLayers.findIndex((l) => l.id === draggedLayerId);
    const toIndex = sortedLayers.findIndex((l) => l.id === targetLayerId);

    if (fromIndex !== -1 && toIndex !== -1) {
      // Reorder using layer manager
      const reorderedLayers = layerManager.reorderLayers(sortedLayers, fromIndex, toIndex);

      // Update all layers with new z-indices
      reorderedLayers.forEach((layer) => {
        updateLayer(layer.id, { zIndex: layer.zIndex });
      });

      pushHistory('Reorder Layers');
    }

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  // Get layer index (for determining if merge down is possible)
  const getLayerIndex = (layerId: string): number => {
    return sortedLayers.findIndex((l) => l.id === layerId);
  };

  return (
    <div className={layoutStyles.panelContent} onClick={handleCloseContextMenu}>
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Layer Controls ({layers.length})</h3>

        {/* Flatten All Button */}
        {layers.length > 1 && (
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => {
              if (confirm('Flatten all layers? This cannot be undone.')) {
                flattenAllLayers();
                pushHistory('Flatten All Layers');
              }
            }}
            style={{ width: '100%', marginBottom: 'var(--spacing-sm)', fontSize: '0.75rem' }}
          >
            Flatten All Layers
          </button>
        )}

        {/* Edit Mode Indicator */}
        {editMode === 'icon-only' && (
          <div
            style={{
              padding: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-xs)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>Icon-Only Mode:</strong> Only the top layer (icon) can be edited. Other layers
            are locked.
          </div>
        )}

        {/* Layer List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          {sortedLayers.map((layer, index) => {
            const locked = isLayerLocked(layer, index);
            return (
              <div
                key={layer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, layer.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, layer.id)}
                style={{
                  padding: 'var(--spacing-sm)',
                  background: layer.id === activeLayerId ? 'var(--bg-hover)' : 'transparent',
                  border: '2px solid',
                  borderColor:
                    dragOverLayerId === layer.id
                      ? 'var(--color-accent)'
                      : layer.id === activeLayerId
                        ? 'var(--color-accent)'
                        : 'var(--color-primary)',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'move',
                  opacity: draggedLayerId === layer.id ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveLayer(layer.id)}
              >
                {/* Top Row: Visibility, Lock, Name, Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-xs)',
                  }}
                >
                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    disabled={locked}
                    style={{
                      padding: '4px',
                      fontSize: '1rem',
                      width: '24px',
                      height: '24px',
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    {layer.visible ? '👁️' : '🚫'}
                  </button>

                  {/* Lock Indicator */}
                  {locked && (
                    <div
                      title="Layer locked in icon-only mode"
                      style={{ fontSize: '0.875rem', opacity: 0.7 }}
                    >
                      🔒
                    </div>
                  )}

                  {/* Layer Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {layer.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      {layer.type}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        contextDuplicateLayer(layer.id);
                        pushHistory('Duplicate Layer');
                      }}
                      title={locked ? 'Layer is locked' : 'Duplicate Layer'}
                      disabled={locked}
                      style={{
                        padding: '4px',
                        fontSize: '0.875rem',
                        width: '24px',
                        height: '24px',
                        opacity: locked ? 0.5 : 1,
                      }}
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete layer "${layer.name}"?`)) {
                          removeLayer(layer.id);
                          pushHistory('Delete Layer');
                        }
                      }}
                      title={locked ? 'Layer is locked' : 'Delete Layer'}
                      disabled={locked}
                      style={{
                        padding: '4px',
                        fontSize: '0.875rem',
                        width: '24px',
                        height: '24px',
                        opacity: locked ? 0.5 : 1,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Opacity Slider */}
                <div style={{ marginTop: 'var(--spacing-xs)' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      marginBottom: '2px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Opacity: {Math.round(layer.opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity * 100}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { opacity: Number(e.target.value) / 100 });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={locked}
                    style={{ width: '100%', height: '4px', opacity: locked ? 0.5 : 1 }}
                  />
                </div>

                {/* Blend Mode Dropdown */}
                <div style={{ marginTop: 'var(--spacing-xs)' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      marginBottom: '2px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Blend Mode
                  </label>
                  <select
                    value={layer.blendMode}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { blendMode: e.target.value as BlendMode });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={locked}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--border-radius-sm)',
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    {blendModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Layer Order Buttons */}
                <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = getLayerIndex(layer.id);
                      if (idx > 0) {
                        reorderLayers(idx, idx - 1);
                        pushHistory('Move Layer Up');
                      }
                    }}
                    disabled={getLayerIndex(layer.id) === 0}
                    title="Move Up"
                    style={{ flex: 1, fontSize: '0.7rem', padding: '2px' }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = getLayerIndex(layer.id);
                      if (idx < layers.length - 1) {
                        reorderLayers(idx, idx + 1);
                        pushHistory('Move Layer Down');
                      }
                    }}
                    disabled={getLayerIndex(layer.id) === sortedLayers.length - 1}
                    title="Move Down"
                    style={{ flex: 1, fontSize: '0.7rem', padding: '2px' }}
                  >
                    ▼
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {layers.length === 0 && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginTop: 'var(--spacing-md)',
            }}
          >
            No layers yet. Import an image to get started.
          </p>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-primary)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--border-radius-sm)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 10000,
            minWidth: '160px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className={styles.contextMenuItem} onClick={handleDuplicate}>
            📋 Duplicate
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={handleMergeDown}
            disabled={getLayerIndex(contextMenu.layerId || '') === sortedLayers.length - 1}
          >
            ⬇️ Merge Down
          </button>
          <button type="button" className={styles.contextMenuItem} onClick={handleMoveToTop}>
            ⬆️ Move to Top
          </button>
          <button type="button" className={styles.contextMenuItem} onClick={handleMoveToBottom}>
            ⬇️ Move to Bottom
          </button>
          <hr
            style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--color-primary)' }}
          />
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={handleDelete}
            style={{ color: 'var(--color-danger, #dc3545)' }}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
