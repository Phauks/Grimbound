/**
 * ProjectEditor Sub-Components
 *
 * Extracted sub-components from ProjectEditor for maintainability.
 * These components are tightly coupled to ProjectEditor but separated
 * for better file organization and single responsibility.
 *
 * @module components/ViewComponents/ProjectsComponents/ProjectEditorSubComponents
 */

import { memo } from 'react';
import { JsonEditorPanel } from '@/components/Shared/Json/JsonEditorPanel';
import { Button } from '@/components/Shared/UI/Button';
import { TokenGrid } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenGrid';
import { TokenPreviewRow } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenPreviewRow';
import {
  type DisplayMode,
  OPTIONAL_FIELDS_CONFIG,
  type UseOptionalFieldsResult,
} from '@/hooks/projects/index.js';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/projects/ProjectEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import type { Character, CharacterMetadata, ScriptMeta, Token } from '@/ts/types/index.js';
import type { Project, ProjectVersion } from '@/ts/types/project.js';
import { CharacterListView } from './CharacterListView';
import { VersionCompareView } from './VersionCompareView';
import { VersionSelector } from './VersionSelector';

// ============================================================================
// Types
// ============================================================================

export type ProjectEditorTab = 'overview' | 'versions' | 'settings';

export interface ListViewSettings {
  showAbility: boolean;
  showFirstNightReminder: boolean;
  showOtherNightReminder: boolean;
  showReminders: boolean;
}

export const DEFAULT_LIST_VIEW_SETTINGS: ListViewSettings = {
  showAbility: true,
  showFirstNightReminder: false,
  showOtherNightReminder: false,
  showReminders: false,
};

// ============================================================================
// TabNavigation Component
// ============================================================================

interface TabNavigationProps {
  activeTab: ProjectEditorTab;
  onTabChange: (tab: ProjectEditorTab) => void;
}

/** Tab navigation for Overview, Versions, Settings */
export const TabNavigation = memo(function TabNavigation({
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  return (
    <div className={styles.tabNavigation}>
      <button
        type="button"
        className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('overview')}
      >
        Overview
      </button>
      <button
        type="button"
        className={`${styles.tabButton} ${activeTab === 'versions' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('versions')}
      >
        Versions
      </button>
      <button
        type="button"
        className={`${styles.tabButton} ${activeTab === 'settings' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('settings')}
      >
        Settings
      </button>
    </div>
  );
});

// ============================================================================
// DisplayModeToggle Component
// ============================================================================

interface DisplayModeToggleProps {
  displayMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

/** Toggle between tokens, list, and JSON display modes */
export const DisplayModeToggle = memo(function DisplayModeToggle({
  displayMode,
  onModeChange,
}: DisplayModeToggleProps) {
  return (
    <div className={styles.viewToggle}>
      <span className={styles.viewToggleLabel}>View:</span>
      <button
        type="button"
        className={`${styles.viewToggleButton} ${displayMode === 'tokens' ? styles.viewToggleActive : ''}`}
        onClick={() => onModeChange('tokens')}
        title="View as tokens"
      >
        Tokens
      </button>
      <button
        type="button"
        className={`${styles.viewToggleButton} ${displayMode === 'list' ? styles.viewToggleActive : ''}`}
        onClick={() => onModeChange('list')}
        title="View as list"
      >
        List
      </button>
      <button
        type="button"
        className={`${styles.viewToggleButton} ${displayMode === 'json' ? styles.viewToggleActive : ''}`}
        onClick={() => onModeChange('json')}
        title="View as JSON"
      >
        {'{ }'} JSON
      </button>
    </div>
  );
});

// ============================================================================
// ListSettingsPopover Component
// ============================================================================

interface ListSettingsPopoverProps {
  settings: ListViewSettings;
  onSettingsChange: (settings: ListViewSettings) => void;
  onClose: () => void;
}

/** Popover for configuring list view columns */
export const ListSettingsPopover = memo(function ListSettingsPopover({
  settings,
  onSettingsChange,
  onClose,
}: ListSettingsPopoverProps) {
  const handleChange =
    (key: keyof ListViewSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ ...settings, [key]: e.target.checked });
    };

  return (
    <div className={viewStyles.listSettingsPopover}>
      <div className={viewStyles.listSettingsHeader}>
        <span>Columns</span>
        <button type="button" className={viewStyles.listSettingsClose} onClick={onClose}>
          x
        </button>
      </div>
      <label className={viewStyles.listSettingsOption}>
        <input
          type="checkbox"
          checked={settings.showAbility}
          onChange={handleChange('showAbility')}
        />
        <span>Ability Text</span>
      </label>
      <label className={viewStyles.listSettingsOption}>
        <input
          type="checkbox"
          checked={settings.showFirstNightReminder}
          onChange={handleChange('showFirstNightReminder')}
        />
        <span>First Night Reminder</span>
      </label>
      <label className={viewStyles.listSettingsOption}>
        <input
          type="checkbox"
          checked={settings.showOtherNightReminder}
          onChange={handleChange('showOtherNightReminder')}
        />
        <span>Other Night Reminder</span>
      </label>
      <label className={viewStyles.listSettingsOption}>
        <input
          type="checkbox"
          checked={settings.showReminders}
          onChange={handleChange('showReminders')}
        />
        <span>Reminders</span>
      </label>
    </div>
  );
});

// ============================================================================
// EmptyState Component
// ============================================================================

interface EmptyStateProps {
  onCreateProject?: () => void;
  onImportProject?: () => void;
  onLoadLastProject?: () => void;
  lastProject?: Project | null;
}

/** Empty state when no project is selected */
export const EmptyState = memo(function EmptyState({
  onCreateProject,
  onImportProject,
  onLoadLastProject,
  lastProject,
}: EmptyStateProps) {
  return (
    <div className={`${layoutStyles.contentPanel} ${styles.emptyState}`}>
      <div className={styles.emptyStateContent}>
        <h2>No Project Selected</h2>
        <p>Create a new project or load an existing one to get started.</p>
        <div className={styles.emptyStateButtons}>
          <Button variant="primary" onClick={onCreateProject}>
            Create New Project
          </Button>
          <Button variant="secondary" onClick={onImportProject}>
            Import Project
          </Button>
          {lastProject && (
            <Button variant="secondary" onClick={onLoadLastProject}>
              Load Last: {lastProject.name}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// SettingsTab Component
// ============================================================================

interface SettingsTabProps {
  project: Project;
  isActiveProject: boolean;
  onExport: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onDelete: () => void;
}

/** Settings tab content with project actions and danger zone */
export const SettingsTab = memo(function SettingsTab({
  project,
  isActiveProject,
  onExport,
  onDuplicate,
  onDelete,
}: SettingsTabProps) {
  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSectionTitle}>Project Actions</h3>
        <div className={styles.settingsActions}>
          <button type="button" onClick={() => onExport(project)} className={styles.settingsButton}>
            Export Project
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(project)}
            className={styles.settingsButton}
          >
            Duplicate Project
          </button>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSectionTitle}>Danger Zone</h3>
        <p className={styles.settingsDescription}>
          Deleting a project is permanent and cannot be undone.
        </p>
        <button
          type="button"
          onClick={onDelete}
          className={styles.deleteButtonLarge}
          disabled={isActiveProject}
          title={
            isActiveProject
              ? 'Cannot delete active project. Deactivate it first.'
              : 'Delete project permanently'
          }
        >
          Delete Project
        </button>
        {isActiveProject && (
          <p className={styles.settingsWarning}>
            Cannot delete the active project. Deactivate it first.
          </p>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// LoadingState Component
// ============================================================================

interface LoadingStateProps {
  message?: string;
}

/** Loading state with spinner */
export const LoadingState = memo(function LoadingState({
  message = 'Generating token preview...',
}: LoadingStateProps) {
  return (
    <div className={styles.loadingState}>
      <div className={styles.spinner} />
      <p>{message}</p>
    </div>
  );
});

// ============================================================================
// ProjectSettingsBox Component
// ============================================================================

interface ProjectSettingsBoxProps {
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  isLoading: boolean;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  error: string | null;
  optionalFields: UseOptionalFieldsResult;
  onSave: () => void;
  onCancel: () => void;
}

/** Project settings form box */
export const ProjectSettingsBox = memo(function ProjectSettingsBox({
  isEditing,
  setIsEditing,
  isLoading,
  name,
  setName,
  description,
  setDescription,
  error,
  optionalFields,
  onSave,
  onCancel,
}: ProjectSettingsBoxProps) {
  return (
    <div className={styles.projectInfo}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>PROJECT SETTINGS</h3>
        {isEditing ? (
          <div className={styles.editActions}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isLoading || !name.trim()}
              className={styles.saveButton}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={styles.editIcon}
            title="Edit project settings"
          >
            Edit
          </button>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="project-name" className={styles.label}>
          Project Name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isEditing || isLoading}
          className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="project-description" className={styles.label}>
          Description
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isEditing || isLoading}
          rows={2}
          placeholder="Project description..."
          className={`${styles.textarea} ${!isEditing ? styles.inputDisabled : ''}`}
        />
      </div>

      {/* Add Field Button */}
      {isEditing && optionalFields.availableFields.length > 0 && (
        <div className={styles.addFieldContainer}>
          <button
            type="button"
            onClick={() => optionalFields.setShowAddDropdown(!optionalFields.showAddDropdown)}
            className={styles.addFieldButton}
          >
            <span className={styles.addFieldIcon}>+</span>
            Add Field
            <span className={styles.addFieldArrow}>
              {optionalFields.showAddDropdown ? '▲' : '▼'}
            </span>
          </button>
          {optionalFields.showAddDropdown && (
            <div className={styles.addFieldDropdown}>
              {optionalFields.availableFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => optionalFields.addField(field.key)}
                  className={styles.addFieldOption}
                >
                  {field.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional Fields */}
      {OPTIONAL_FIELDS_CONFIG.map((field) => {
        if (!optionalFields.visibleFields.has(field.key)) return null;
        const value = optionalFields.getValue(field.key);
        const fieldId = `optional-field-${field.key}`;

        return (
          <div key={field.key} className={styles.formGroup}>
            <div className={styles.optionalFieldHeader}>
              <label htmlFor={fieldId} className={styles.label}>
                {field.label}
              </label>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => optionalFields.removeField(field.key)}
                  className={styles.removeFieldButton}
                  title={`Remove ${field.label}`}
                >
                  x
                </button>
              )}
            </div>
            {field.isInput ? (
              <input
                id={fieldId}
                type="text"
                value={value}
                onChange={(e) => optionalFields.setValue(field.key, e.target.value)}
                disabled={!isEditing || isLoading}
                placeholder={field.placeholder}
                className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
              />
            ) : (
              <textarea
                id={fieldId}
                value={value}
                onChange={(e) => optionalFields.setValue(field.key, e.target.value)}
                disabled={!isEditing || isLoading}
                rows={2}
                placeholder={field.placeholder}
                className={`${styles.textarea} ${!isEditing ? styles.inputDisabled : ''}`}
              />
            )}
          </div>
        );
      })}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
});

// ============================================================================
// ScriptMetaBox Component
// ============================================================================

interface ScriptMetaBoxProps {
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  isLoading: boolean;
  localMeta: ScriptMeta;
  onMetaFieldChange: (field: keyof ScriptMeta, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** Script meta settings form box */
export const ScriptMetaBox = memo(function ScriptMetaBox({
  isEditing,
  setIsEditing,
  isLoading,
  localMeta,
  onMetaFieldChange,
  onSave,
  onCancel,
}: ScriptMetaBoxProps) {
  return (
    <div className={styles.metaBox}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>SCRIPT META</h3>
        {isEditing ? (
          <div className={styles.editActions}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isLoading}
              className={styles.saveButton}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={styles.editIcon}
            title="Edit meta settings"
          >
            Edit
          </button>
        )}
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="meta-script-name" className={styles.labelSmall}>
            Script Name
          </label>
          <input
            id="meta-script-name"
            type="text"
            value={localMeta.name || ''}
            onChange={(e) => onMetaFieldChange('name', e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder="Script name"
            className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="meta-author" className={styles.labelSmall}>
            Author
          </label>
          <input
            id="meta-author"
            type="text"
            value={localMeta.author || ''}
            onChange={(e) => onMetaFieldChange('author', e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder="Author"
            className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="meta-version" className={styles.labelSmall}>
            Version
          </label>
          <input
            id="meta-version"
            type="text"
            value={localMeta.version || ''}
            onChange={(e) => onMetaFieldChange('version', e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder="1.0.0"
            className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="meta-logo" className={styles.labelSmall}>
            Logo URL
          </label>
          <input
            id="meta-logo"
            type="text"
            value={localMeta.logo || ''}
            onChange={(e) => onMetaFieldChange('logo', e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder="https://..."
            className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
          />
        </div>
        <div className={styles.formGroupFull}>
          <label htmlFor="meta-almanac" className={styles.labelSmall}>
            Almanac URL
          </label>
          <input
            id="meta-almanac"
            type="text"
            value={localMeta.almanac || ''}
            onChange={(e) => onMetaFieldChange('almanac', e.target.value)}
            disabled={!isEditing || isLoading}
            placeholder="https://..."
            className={`${styles.input} ${!isEditing ? styles.inputDisabled : ''}`}
          />
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// CharactersSection Component
// ============================================================================

interface CharactersSectionProps {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  displayTokens: Token[];
  displayCharacters: Character[];
  projectCharacterMetadata: Map<string, CharacterMetadata>;
  selectionSummary: { enabled: number; disabled: number; total: number };
  projectJsonString: string;
  isGeneratingPreview: boolean;
  listViewSettings: ListViewSettings;
  setListViewSettings: (settings: ListViewSettings) => void;
  showListSettings: boolean;
  setShowListSettings: (show: boolean) => void;
  showCharacterList: boolean;
  setShowCharacterList: (show: boolean) => void;
  onCharacterToggle: (uuid: string, enabled: boolean) => void;
  onToggleAllCharacters: (enabled: boolean) => void;
}

/** Characters section with display mode toggle and content */
export const CharactersSection = memo(function CharactersSection({
  displayMode,
  setDisplayMode,
  displayTokens,
  displayCharacters,
  projectCharacterMetadata,
  selectionSummary,
  projectJsonString,
  isGeneratingPreview,
  listViewSettings,
  setListViewSettings,
  showListSettings,
  setShowListSettings,
  showCharacterList,
  setShowCharacterList,
  onCharacterToggle,
  onToggleAllCharacters,
}: CharactersSectionProps) {
  return (
    <div className={styles.charactersSection}>
      <DisplayModeToggle displayMode={displayMode} onModeChange={setDisplayMode} />

      {displayMode === 'tokens' &&
        (isGeneratingPreview ? <LoadingState /> : <TokenGrid tokens={displayTokens} readOnly />)}

      {displayMode === 'list' && (
        <div className={viewStyles.characterSelectionSection}>
          <div className={viewStyles.characterSelectionHeaderRow}>
            <button
              type="button"
              className={viewStyles.characterSelectionHeader}
              onClick={() => setShowCharacterList(!showCharacterList)}
            >
              <span className={viewStyles.characterSelectionIcon}>
                {showCharacterList ? '▼' : '▶'}
              </span>
              <span className={viewStyles.characterSelectionTitle}>Character Selection</span>
              <span className={viewStyles.characterSelectionSummary}>
                {selectionSummary.enabled} of {selectionSummary.total} included
                {selectionSummary.disabled > 0 && (
                  <span className={viewStyles.characterSelectionBadge}>
                    {selectionSummary.disabled} excluded
                  </span>
                )}
              </span>
            </button>
            {showCharacterList && (
              <div className={viewStyles.listSettingsContainer}>
                <button
                  type="button"
                  className={viewStyles.listSettingsButton}
                  onClick={() => setShowListSettings(!showListSettings)}
                  title="Configure list columns"
                  aria-expanded={showListSettings}
                >
                  Settings
                </button>
                {showListSettings && (
                  <ListSettingsPopover
                    settings={listViewSettings}
                    onSettingsChange={setListViewSettings}
                    onClose={() => setShowListSettings(false)}
                  />
                )}
              </div>
            )}
          </div>
          {showCharacterList && (
            <div className={viewStyles.characterSelectionContent}>
              <CharacterListView
                characters={displayCharacters}
                showAbility={listViewSettings.showAbility}
                showFirstNightReminder={listViewSettings.showFirstNightReminder}
                showOtherNightReminder={listViewSettings.showOtherNightReminder}
                showReminders={listViewSettings.showReminders}
                showSelection
                characterMetadata={projectCharacterMetadata}
                onToggleCharacter={onCharacterToggle}
                onToggleAll={onToggleAllCharacters}
              />
            </div>
          )}
        </div>
      )}

      {displayMode === 'json' && (
        <div className={styles.jsonViewContainer}>
          <JsonEditorPanel
            value={projectJsonString}
            onChange={() => {}}
            disabled={true}
            minHeight="400px"
            placeholder="No project data"
          />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// OverviewTab Component
// ============================================================================

interface OverviewTabProps {
  project: Project;
  isActiveProject: boolean;
  isLoading: boolean;
  isCompareMode: boolean;
  // Editing state
  isEditingBasic: boolean;
  setIsEditingBasic: (value: boolean) => void;
  isEditingMeta: boolean;
  setIsEditingMeta: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  error: string | null;
  localMeta: ScriptMeta;
  optionalFields: UseOptionalFieldsResult;
  // Display state
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  displayTokens: Token[];
  displayCharacters: Character[];
  projectCharacterMetadata: Map<string, CharacterMetadata>;
  selectionSummary: { enabled: number; disabled: number; total: number };
  projectJsonString: string;
  isGeneratingPreview: boolean;
  // List view settings
  listViewSettings: ListViewSettings;
  setListViewSettings: (settings: ListViewSettings) => void;
  showListSettings: boolean;
  setShowListSettings: (show: boolean) => void;
  showCharacterList: boolean;
  setShowCharacterList: (show: boolean) => void;
  // Version state
  selectedVersion: ProjectVersion | null;
  isRestoringVersion: boolean;
  // Handlers
  onSaveBasic: () => void;
  onCancelBasic: () => void;
  onMetaFieldChange: (field: keyof ScriptMeta, value: string) => void;
  onSaveMeta: () => void;
  onCancelMeta: () => void;
  onToggleActive: () => void;
  onVersionSelect: (version: ProjectVersion | null) => void;
  onExitCompare: () => void;
  onRestoreVersion: (version: ProjectVersion) => void;
  onCharacterToggle: (uuid: string, enabled: boolean) => void;
  onToggleAllCharacters: (enabled: boolean) => void;
}

/** Overview tab content */
export const OverviewTab = memo(function OverviewTab({
  project,
  isActiveProject,
  isLoading,
  isCompareMode,
  isEditingBasic,
  setIsEditingBasic,
  isEditingMeta,
  setIsEditingMeta,
  name,
  setName,
  description,
  setDescription,
  error,
  localMeta,
  optionalFields,
  displayMode,
  setDisplayMode,
  displayTokens,
  displayCharacters,
  projectCharacterMetadata,
  selectionSummary,
  projectJsonString,
  isGeneratingPreview,
  listViewSettings,
  setListViewSettings,
  showListSettings,
  setShowListSettings,
  showCharacterList,
  setShowCharacterList,
  selectedVersion,
  isRestoringVersion,
  onSaveBasic,
  onCancelBasic,
  onMetaFieldChange,
  onSaveMeta,
  onCancelMeta,
  onToggleActive,
  onVersionSelect,
  onExitCompare,
  onRestoreVersion,
  onCharacterToggle,
  onToggleAllCharacters,
}: OverviewTabProps) {
  return (
    <>
      {/* Token Preview Header */}
      <div className={styles.previewHeaderSection}>
        <TokenPreviewRow
          characters={project.state.characters}
          tokens={displayTokens}
          generationOptions={project.state.generationOptions}
          scriptMeta={project.state.scriptMeta}
          showGenerateButton={false}
          showAutoRegenerate={false}
          isLoading={isGeneratingPreview}
        />
      </div>

      {/* Top Section: Project Settings + Actions */}
      <div className={styles.topSection}>
        <div className={styles.leftColumn}>
          {/* Project Settings Box */}
          <ProjectSettingsBox
            isEditing={isEditingBasic}
            setIsEditing={setIsEditingBasic}
            isLoading={isLoading}
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            error={error}
            optionalFields={optionalFields}
            onSave={onSaveBasic}
            onCancel={onCancelBasic}
          />

          {/* Script Meta Settings */}
          <ScriptMetaBox
            isEditing={isEditingMeta}
            setIsEditing={setIsEditingMeta}
            isLoading={isLoading}
            localMeta={localMeta}
            onMetaFieldChange={onMetaFieldChange}
            onSave={onSaveMeta}
            onCancel={onCancelMeta}
          />
        </div>

        {/* Right: Version Selector + Action Buttons */}
        <div className={styles.logoActionsBox}>
          <VersionSelector
            project={project}
            selectedVersion={selectedVersion}
            onVersionSelect={onVersionSelect}
            disabled={isLoading}
          />
          <div className={styles.actionButtons}>
            <button
              type="button"
              onClick={onToggleActive}
              disabled={isLoading || isCompareMode}
              className={isActiveProject ? styles.deactivateButton : styles.activateButton}
              title={isCompareMode ? 'Exit compare mode first' : undefined}
            >
              {isLoading
                ? isActiveProject
                  ? 'Deactivating...'
                  : 'Activating...'
                : isActiveProject
                  ? 'Click to Deactivate'
                  : 'Set as Active'}
            </button>
          </div>
        </div>
      </div>

      {/* Version Compare View */}
      {isCompareMode && selectedVersion && (
        <div className={styles.compareSection}>
          <VersionCompareView
            currentState={project.state}
            compareVersion={selectedVersion}
            onExitCompare={onExitCompare}
            onRestore={onRestoreVersion}
            isRestoring={isRestoringVersion}
          />
        </div>
      )}

      {/* Characters Section */}
      {!isCompareMode && (
        <CharactersSection
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          displayTokens={displayTokens}
          displayCharacters={displayCharacters}
          projectCharacterMetadata={projectCharacterMetadata}
          selectionSummary={selectionSummary}
          projectJsonString={projectJsonString}
          isGeneratingPreview={isGeneratingPreview}
          listViewSettings={listViewSettings}
          setListViewSettings={setListViewSettings}
          showListSettings={showListSettings}
          setShowListSettings={setShowListSettings}
          showCharacterList={showCharacterList}
          setShowCharacterList={setShowCharacterList}
          onCharacterToggle={onCharacterToggle}
          onToggleAllCharacters={onToggleAllCharacters}
        />
      )}
    </>
  );
});
