/**
 * Save Asset Modal
 *
 * Dialog for saving Studio creations to the asset library
 */

import { useState, useEffect } from 'react';
import { useStudio } from '../../../../contexts/StudioContext';
import { useProjectContext } from '../../../../contexts/ProjectContext';
import { saveStudioAsset, type SaveStudioAssetOptions } from '../../../../ts/studio/assetIntegration';
import { logger } from '../../../../ts/utils/logger.js';
import styles from '../../../../styles/components/studio/Studio.module.css';

interface SaveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (assetId: string) => void;
}

export function SaveAssetModal({ isOpen, onClose, onSave }: SaveAssetModalProps) {
  const { layers, canvasSize, toolSettings, backgroundColor } = useStudio();
  const { currentProject } = useProjectContext();

  // Form state
  const [assetType, setAssetType] = useState<'studio-icon' | 'studio-logo' | 'studio-project'>('studio-icon');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'project' | 'global'>('project');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate suggested name based on layers
  useEffect(() => {
    if (isOpen && !name) {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setName(`Studio ${assetType.split('-')[1]} ${timestamp}`);
    }
  }, [isOpen, assetType, name]);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (layers.length === 0) {
      setError('No layers to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const options: SaveStudioAssetOptions = {
        type: assetType,
        name: name.trim(),
        description: description.trim() || undefined,
        projectId: scope === 'project' ? (currentProject?.id ?? null) : null,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        createdFrom: 'scratch', // TODO: Track actual source
      };

      const assetId = await saveStudioAsset(
        layers,
        canvasSize,
        toolSettings,
        backgroundColor,
        options
      );

      logger.info('SaveAssetModal', 'Asset saved:', assetId);

      // Notify parent
      onSave?.(assetId);

      // Reset form
      setName('');
      setDescription('');
      setTags('');
      setError(null);

      // Close modal
      onClose();
    } catch (err) {
      logger.error('SaveAssetModal', 'Save failed', err);
      setError(err instanceof Error ? err.message : 'Failed to save asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!isSaving) {
      setName('');
      setDescription('');
      setTags('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>Save to Asset Library</h2>
          <button
            className={styles.closeButton}
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Error Display */}
          {error && (
            <div
              style={{
                padding: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-md)',
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

          {/* Asset Type */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
              Asset Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-xs)' }}>
              <button
                className={`${styles.toolbarButton} ${assetType === 'studio-icon' ? styles.active : ''}`}
                onClick={() => setAssetType('studio-icon')}
                disabled={isSaving}
                style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
              >
                🎨 Icon
              </button>
              <button
                className={`${styles.toolbarButton} ${assetType === 'studio-logo' ? styles.active : ''}`}
                onClick={() => setAssetType('studio-logo')}
                disabled={isSaving}
                style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
              >
                📝 Logo
              </button>
              <button
                className={`${styles.toolbarButton} ${assetType === 'studio-project' ? styles.active : ''}`}
                onClick={() => setAssetType('studio-project')}
                disabled={isSaving}
                style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
              >
                💾 Project
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {assetType === 'studio-icon' && 'Flattened image for character icons'}
              {assetType === 'studio-logo' && 'Flattened image for script logos'}
              {assetType === 'studio-project' && 'Full project with all layers (editable)'}
            </p>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label htmlFor="asset-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
              Name *
            </label>
            <input
              id="asset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="My Custom Icon"
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

          {/* Description */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label htmlFor="asset-description" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
              Description (optional)
            </label>
            <textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              placeholder="Describe this asset..."
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                fontSize: '0.875rem',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--border-radius-sm)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Scope */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
              Save to
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
              <button
                className={`${styles.toolbarButton} ${scope === 'project' ? styles.active : ''}`}
                onClick={() => setScope('project')}
                disabled={isSaving || !currentProject}
                style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
              >
                📁 Current Project
              </button>
              <button
                className={`${styles.toolbarButton} ${scope === 'global' ? styles.active : ''}`}
                onClick={() => setScope('global')}
                disabled={isSaving}
                style={{ padding: 'var(--spacing-sm)', fontSize: '0.75rem' }}
              >
                🌐 Global Library
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {scope === 'project' && currentProject
                ? `Save to "${currentProject.name}"`
                : scope === 'project'
                ? 'No project open'
                : 'Available to all projects'}
            </p>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <label htmlFor="asset-tags" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
              Tags (optional)
            </label>
            <input
              id="asset-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isSaving}
              placeholder="custom, character, red"
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
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Separate tags with commas
            </p>
          </div>

          {/* Preview Info */}
          <div
            style={{
              padding: 'var(--spacing-sm)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Layers:</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{layers.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Size:</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {canvasSize.width} × {canvasSize.height}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Type:</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {assetType === 'studio-project' ? 'Editable Project' : 'Flattened Image'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            className={styles.secondaryButton}
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}
