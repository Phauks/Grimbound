/**
 * Studio Toolbar
 *
 * Top toolbar with file operations, undo/redo, and tool actions
 */

import { useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import styles from '../../../styles/components/studio/Studio.module.css';
import { logger } from '../../../ts/utils/logger.js';
import { LogoWizardModal } from './modals/LogoWizardModal';
import { SaveAssetModal } from './modals/SaveAssetModal';

interface StudioToolbarProps {
  onImportClick: () => void;
}

export function StudioToolbar({ onImportClick }: StudioToolbarProps) {
  const { canUndo, canRedo, undo, redo, isDirty, newProject, layers } = useStudio();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLogoWizard, setShowLogoWizard] = useState(false);

  const handleNew = () => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Create new project?');
      if (!confirmed) return;
    }
    newProject(512, 512);
  };

  return (
    <div className={styles.toolbar}>
      {/* File Operations */}
      <div className={styles.toolbarSection}>
        <button type="button" className={styles.toolbarButton} onClick={handleNew} title="New Project (Ctrl+N)">
          ✨ New
        </button>
        <button
          className={styles.toolbarButton}
          onClick={onImportClick}
          title="Import Image (Ctrl+O)"
        >
          📁 Import
        </button>
        <div className={styles.toolbarDivider} style={{ margin: '0 4px' }} />
        <button
          className={styles.toolbarButton}
          onClick={() => setShowLogoWizard(true)}
          title="Create Script Logo"
        >
          📝 Logo Wizard
        </button>
        <button
          className={styles.toolbarButton}
          onClick={() => setShowSaveModal(true)}
          disabled={layers.length === 0}
          title="Save Asset (Ctrl+S)"
        >
          💾 Save
          {isDirty && <span className={styles.unsavedIndicator} />}
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      {/* History Operations */}
      <div className={styles.toolbarSection}>
        <button
          className={`${styles.toolbarButton} ${styles.iconButton}`}
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className={`${styles.toolbarButton} ${styles.iconButton}`}
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      {/* Tool Actions */}
      <div className={styles.toolbarSection}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {layers.length} layer{layers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Save Asset Modal */}
      <SaveAssetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={(assetId) => {
          logger.info('StudioToolbar', 'Asset saved:', assetId);
          // TODO: Clear dirty flag, show success message
        }}
      />

      {/* Logo Wizard */}
      <LogoWizardModal isOpen={showLogoWizard} onClose={() => setShowLogoWizard(false)} />
    </div>
  );
}
