/**
 * Studio Asset Browser
 *
 * Browse and load Studio assets (icons, logos, projects) from project or global storage.
 * Integrates with AssetStorageService and asset cache system.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { useStudio } from '@/contexts/StudioContext';
import styles from '@/styles/components/studio/Studio.module.css';
import type { AssetType, AssetWithUrl } from '@/ts/services/upload/types';
import { loadStudioAsset } from '@/ts/studio/assetIntegration';
import { logger } from '@/ts/utils/logger.js';

interface AssetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

type StudioAssetType = 'studio-icon' | 'studio-logo' | 'studio-project';
type AssetScope = 'project' | 'global';

export function AssetBrowser({ isOpen, onClose }: AssetBrowserProps) {
  // Get service from DI context
  const assetStorageService = useAssetStorageService();

  const { currentProject } = useProjectContext();
  const studioContext = useStudio();

  // Filter state
  const [scope, setScope] = useState<AssetScope>('project');
  const [assetType, setAssetType] = useState<StudioAssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load assets based on current filters
  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine project filter
      const projectId =
        scope === 'global' ? null : scope === 'project' ? (currentProject?.id ?? null) : null;

      // Determine type filter
      const types: AssetType[] =
        assetType === 'all' ? ['studio-icon', 'studio-logo', 'studio-project'] : [assetType];

      // Query assets from storage (uses cache internally)
      const results = await assetStorageService.listWithUrls({
        type: types,
        projectId: projectId === null ? null : projectId,
        search: searchQuery || undefined,
        sortBy: 'uploadedAt',
        sortDirection: 'desc',
      });

      setAssets(results);
    } catch (err) {
      logger.error('AssetBrowser', 'Failed to load assets', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [scope, assetType, searchQuery, currentProject?.id, assetStorageService]);

  // Reload assets when filters change
  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen, loadAssets]);

  // Handle asset selection
  const handleAssetClick = useCallback(
    async (asset: AssetWithUrl) => {
      try {
        // Load the asset into Studio
        const loadedData = await loadStudioAsset(asset.id);

        if (loadedData) {
          // Apply loaded state to Studio context
          // Note: We would need methods in StudioContext to set the entire state
          // For now, we can use loadFromImage if it's just an image
          logger.info('AssetBrowser', 'Loaded asset:', loadedData);

          // If it's a studio-project with full layers, we'd restore the entire state
          // If it's just an image (studio-icon/studio-logo), load it as an image
          if (asset.type === 'studio-icon' || asset.type === 'studio-logo') {
            // Load as image (composited from layers)
            const blob = asset.blob;
            await studioContext.loadFromImage(blob);
          }
        }

        // Close the browser
        onClose();
      } catch (err) {
        logger.error('AssetBrowser', 'Failed to load asset', err);
        setError(err instanceof Error ? err.message : 'Failed to load asset');
      }
    },
    [studioContext, onClose]
  );

  // Handle asset deletion
  const handleDeleteAsset = useCallback(
    async (assetId: string, assetName: string) => {
      const confirmed = confirm(`Delete "${assetName}"? This cannot be undone.`);
      if (!confirmed) return;

      try {
        await assetStorageService.delete(assetId);
        // Reload assets
        await loadAssets();
      } catch (err) {
        logger.error('AssetBrowser', 'Failed to delete asset', err);
        setError(err instanceof Error ? err.message : 'Failed to delete asset');
      }
    },
    [loadAssets, assetStorageService]
  );

  // Filter assets locally if needed (for additional client-side filtering)
  const filteredAssets = useMemo(() => {
    return assets;
  }, [assets]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>Studio Asset Library</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          className={styles.modalBody}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}
        >
          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {/* Scope selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                Library
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--spacing-xs)',
                }}
              >
                <button
                  type="button"
                  className={`${styles.toolbarButton} ${scope === 'project' ? styles.active : ''}`}
                  onClick={() => setScope('project')}
                  disabled={!currentProject}
                  style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
                >
                  📁 Current Project
                </button>
                <button
                  type="button"
                  className={`${styles.toolbarButton} ${scope === 'global' ? styles.active : ''}`}
                  onClick={() => setScope('global')}
                  style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
                >
                  🌐 Global
                </button>
              </div>
              {!currentProject && scope === 'project' && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  No project open
                </p>
              )}
            </div>

            {/* Type filter */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                Asset Type
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'var(--spacing-xs)',
                }}
              >
                <button
                  type="button"
                  className={`${styles.toolbarButton} ${assetType === 'all' ? styles.active : ''}`}
                  onClick={() => setAssetType('all')}
                  style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`${styles.toolbarButton} ${assetType === 'studio-icon' ? styles.active : ''}`}
                  onClick={() => setAssetType('studio-icon')}
                  style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
                >
                  🎨 Icons
                </button>
                <button
                  type="button"
                  className={`${styles.toolbarButton} ${assetType === 'studio-logo' ? styles.active : ''}`}
                  onClick={() => setAssetType('studio-logo')}
                  style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
                >
                  📝 Logos
                </button>
                <button
                  type="button"
                  className={`${styles.toolbarButton} ${assetType === 'studio-project' ? styles.active : ''}`}
                  onClick={() => setAssetType('studio-project')}
                  style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
                >
                  💾 Projects
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <label
                htmlFor="asset-search"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                Search
              </label>
              <input
                id="asset-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--border-radius-sm)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div
              style={{
                padding: 'var(--spacing-sm)',
                background: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid rgba(220, 53, 69, 0.3)',
                borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.875rem',
                color: '#dc3545',
              }}
            >
              {error}
            </div>
          )}

          {/* Asset Grid */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: '300px',
              maxHeight: '400px',
            }}
          >
            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <div>Loading assets...</div>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>🎨</div>
                <div>No assets found</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  {searchQuery
                    ? 'Try a different search query'
                    : 'Create assets in Studio and save them here'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 'var(--spacing-md)',
                }}
              >
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--border-radius-sm)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onClick={() => handleAssetClick(asset)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '100%',
                        paddingTop: '100%',
                        position: 'relative',
                        background: 'var(--bg-tertiary)',
                      }}
                    >
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.metadata.filename}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ padding: 'var(--spacing-xs)' }}>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={asset.metadata.filename}
                      >
                        {asset.metadata.filename}
                      </div>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--text-secondary)',
                          marginTop: '2px',
                        }}
                      >
                        {asset.metadata.width}×{asset.metadata.height}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '0 var(--spacing-xs) var(--spacing-xs)',
                      }}
                    >
                      <button
                        type="button"
                        className={styles.toolbarButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset.id, asset.metadata.filename);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px',
                          fontSize: '0.65rem',
                          background: 'rgba(220, 53, 69, 0.1)',
                        }}
                        title="Delete asset"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} found
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
