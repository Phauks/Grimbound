/**
 * Meta Settings Panel Component
 *
 * Displays and edits script metadata (_meta fields).
 * Collapsed by default, expandable with pencil icon.
 */

import { useEffect, useState } from 'react';
import styles from '@/styles/components/projects/MetaSettingsPanel.module.css';
import type { ScriptMeta } from '@/ts/types/index.js';

interface MetaSettingsPanelProps {
  meta: ScriptMeta;
  onMetaChange: (meta: Partial<ScriptMeta>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function MetaSettingsPanel({
  meta,
  onMetaChange,
  isEditing,
  onEditToggle,
}: MetaSettingsPanelProps) {
  const [localMeta, setLocalMeta] = useState<ScriptMeta>(meta);

  useEffect(() => {
    setLocalMeta(meta);
  }, [meta]);

  const handleChange = (field: keyof ScriptMeta, value: string | number) => {
    setLocalMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onMetaChange(localMeta);
    onEditToggle();
  };

  const handleCancel = () => {
    setLocalMeta(meta);
    onEditToggle();
  };

  if (!isEditing) {
    // Collapsed view - horizontal grid
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>META SETTINGS</h3>
          <button
            type="button"
            className={styles.editBtn}
            onClick={onEditToggle}
            title="Edit Meta Settings"
          >
            Edit
          </button>
        </div>
        <div className={styles.collapsedGrid}>
          <div className={styles.gridItem}>
            <span className={styles.gridLabel}>Script:</span>
            <span className={styles.gridValue}>{meta.name || meta.id || 'Untitled'}</span>
          </div>
          <div className={styles.gridItem}>
            <span className={styles.gridLabel}>Version:</span>
            <span className={styles.gridValue}>{meta.version || 'N/A'}</span>
          </div>
          <div className={styles.gridItem}>
            <span className={styles.gridLabel}>Author:</span>
            <span className={styles.gridValue}>{meta.author || 'Unknown'}</span>
          </div>
          <div className={styles.gridItem}>
            <span className={styles.gridLabel}>Logo:</span>
            <span className={styles.gridValue}>{meta.logo ? '✓' : '✗'}</span>
          </div>
          {meta.almanac && (
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Almanac:</span>
              <span className={styles.gridValue} title={meta.almanac}>
                {meta.almanac.length > 30 ? `${meta.almanac.substring(0, 30)}...` : meta.almanac}
              </span>
            </div>
          )}
          {meta.background && (
            <div className={styles.gridItem}>
              <span className={styles.gridLabel}>Background:</span>
              <span className={styles.gridValue}>{meta.background}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded editing view
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>META SETTINGS</h3>
      </div>
      <div className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="meta-script-id" className={styles.label}>Script ID</label>
            <input
              id="meta-script-id"
              type="text"
              value={localMeta.id}
              onChange={(e) => handleChange('id', e.target.value)}
              className={styles.input}
              placeholder="script-id"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="meta-script-name" className={styles.label}>Script Name</label>
            <input
              id="meta-script-name"
              type="text"
              value={localMeta.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={styles.input}
              placeholder="My Custom Script"
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="meta-version" className={styles.label}>Version</label>
            <input
              id="meta-version"
              type="text"
              value={localMeta.version || ''}
              onChange={(e) => handleChange('version', e.target.value)}
              className={styles.input}
              placeholder="1.0.0"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="meta-author" className={styles.label}>Author</label>
            <input
              id="meta-author"
              type="text"
              value={localMeta.author || ''}
              onChange={(e) => handleChange('author', e.target.value)}
              className={styles.input}
              placeholder="Author Name"
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-logo" className={styles.label}>Logo URL</label>
          <input
            id="meta-logo"
            type="text"
            value={localMeta.logo || ''}
            onChange={(e) => handleChange('logo', e.target.value)}
            className={styles.input}
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-almanac" className={styles.label}>Almanac URL (for QR code)</label>
          <input
            id="meta-almanac"
            type="text"
            value={localMeta.almanac || ''}
            onChange={(e) => handleChange('almanac', e.target.value)}
            className={styles.input}
            placeholder="https://example.com/almanac"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-background" className={styles.label}>Background</label>
          <input
            id="meta-background"
            type="text"
            value={localMeta.background || ''}
            onChange={(e) => handleChange('background', e.target.value)}
            className={styles.input}
            placeholder="Image URL or color"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-synopsis" className={styles.label}>Synopsis</label>
          <textarea
            id="meta-synopsis"
            value={localMeta.synopsis || ''}
            onChange={(e) => handleChange('synopsis', e.target.value)}
            className={styles.textarea}
            rows={2}
            placeholder="Brief description of the script"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-overview" className={styles.label}>Overview</label>
          <textarea
            id="meta-overview"
            value={localMeta.overview || ''}
            onChange={(e) => handleChange('overview', e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Detailed overview of the script"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-changelog" className={styles.label}>Changelog</label>
          <textarea
            id="meta-changelog"
            value={localMeta.changelog || ''}
            onChange={(e) => handleChange('changelog', e.target.value)}
            className={styles.textarea}
            rows={2}
            placeholder="Version history"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="meta-bootlegger" className={styles.label}>Bootlegger</label>
          <input
            id="meta-bootlegger"
            type="text"
            value={localMeta.bootlegger || ''}
            onChange={(e) => handleChange('bootlegger', e.target.value)}
            className={styles.input}
            placeholder="Bootlegger credit"
          />
        </div>

        <div className={styles.formActions}>
          <button type="button" onClick={handleCancel} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className={styles.saveBtn}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
