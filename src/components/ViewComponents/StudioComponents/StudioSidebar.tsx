/**
 * Studio Sidebar
 *
 * Left sidebar content with file operations, tools, and settings panels.
 * Renders as content-only - wrapper handled by ViewLayout.Panel.
 */

import { useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import layoutStyles from '../../../styles/components/layout/ViewLayout.module.css';
import styles from '../../../styles/components/studio/Studio.module.css';
import { logger } from '../../../ts/utils/logger.js';
import { LogoWizardModal } from './modals/LogoWizardModal';
import { SaveAssetModal } from './modals/SaveAssetModal';
import { BorderPanel } from './panels/BorderPanel';
import { ImageProcessingPanel } from './panels/ImageProcessingPanel';
import { PresetPanel } from './panels/PresetPanel';
import { ToolSettingsPanel } from './panels/ToolSettingsPanel';

interface StudioSidebarProps {
  onImportClick: () => void;
}

export function StudioSidebar({ onImportClick }: StudioSidebarProps) {
  const { activeTool, setActiveTool, canUndo, canRedo, undo, redo, isDirty, newProject, layers } =
    useStudio();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLogoWizard, setShowLogoWizard] = useState(false);

  const tools = [
    { id: 'select' as const, label: 'Select', icon: '➤' },
    { id: 'brush' as const, label: 'Brush', icon: '🖌️' },
    { id: 'eraser' as const, label: 'Eraser', icon: '🧹' },
    { id: 'shape' as const, label: 'Shape', icon: '⬜' },
    { id: 'text' as const, label: 'Text', icon: 'T' },
    { id: 'move' as const, label: 'Move', icon: '✋' },
  ];

  const handleNew = () => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Create new project?');
      if (!confirmed) return;
    }
    newProject(512, 512);
  };

  return (
    <div className={layoutStyles.panelContent}>
      {/* File Operations Section */}
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Project</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          {/* Row 1: New and Import */}
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={handleNew}
              title="New Project (Ctrl+N)"
              style={{ flex: 1 }}
            >
              ✨ New
            </button>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={onImportClick}
              title="Import Image (Ctrl+O)"
              style={{ flex: 1 }}
            >
              📁 Import
            </button>
          </div>

          {/* Row 2: Logo Wizard and Save */}
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setShowLogoWizard(true)}
              title="Create Script Logo"
              style={{ flex: 1 }}
            >
              📝 Logo Wizard
            </button>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setShowSaveModal(true)}
              disabled={layers.length === 0}
              title="Save Asset (Ctrl+S)"
              style={{ flex: 1 }}
            >
              💾 Save
              {isDirty && <span className={styles.unsavedIndicator} />}
            </button>
          </div>

          {/* Row 3: Undo/Redo and Layer Count */}
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.iconButton}`}
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.iconButton}`}
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Tools</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)' }}>
          {tools.map((tool) => (
            <button
              type="button"
              key={tool.id}
              className={`${styles.toolbarButton} ${activeTool === tool.id ? styles.active : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.label}
            >
              <span style={{ fontSize: '1.25rem' }}>{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool Settings */}
      <ToolSettingsPanel />

      {/* Image Processing */}
      <ImageProcessingPanel />

      {/* Border Controls */}
      <BorderPanel />

      {/* Character Presets */}
      <PresetPanel />

      {/* Save Asset Modal */}
      <SaveAssetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={(assetId) => {
          logger.info('StudioSidebar', 'Asset saved:', assetId);
        }}
      />

      {/* Logo Wizard */}
      <LogoWizardModal isOpen={showLogoWizard} onClose={() => setShowLogoWizard(false)} />
    </div>
  );
}
