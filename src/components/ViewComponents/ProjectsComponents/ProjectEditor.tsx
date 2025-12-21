/**
 * Project Editor Component
 *
 * Right panel for editing project details, metadata, and viewing characters.
 * Reorganized layout with:
 * - Actions box in top right
 * - Description beneath title
 * - Inline editing
 * - Logo settings in separate area
 * - Independently scrollable right panel
 *
 * Refactored to use extracted sub-components and hooks for maintainability.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useProjects } from '@/hooks';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/projects/ProjectEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import { generateAllTokens } from '@/ts/generation/batchGenerator.js';
import type { CharacterMetadata, ScriptMeta, Token } from '@/ts/types/index.js';
import type { Project, ProjectVersion } from '@/ts/types/project.js';
import { getCharacterSelectionSummary } from '@/ts/utils/characterFiltering.js';
import { logger } from '@/ts/utils/logger.js';
import { Button } from '@/components/Shared/UI/Button';
import { JsonEditorPanel } from '@/components/Shared/Json/JsonEditorPanel';
import { VersionsView } from '@/components/Views/VersionsView';
import { TokenGrid } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenGrid';
import { TokenPreviewRow } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenPreviewRow';
import { CharacterListView } from './CharacterListView';
import { VersionCompareView } from './VersionCompareView';
import { VersionSelector } from './VersionSelector';

// ============================================================================
// Types & Constants
// ============================================================================

type ProjectEditorTab = 'overview' | 'versions' | 'settings';
type DisplayMode = 'tokens' | 'list' | 'json';

interface ListViewSettings {
  showAbility: boolean;
  showFirstNightReminder: boolean;
  showOtherNightReminder: boolean;
  showReminders: boolean;
}

interface OptionalFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  isInput?: boolean;
}

/** Optional field configuration - defines available extensible project fields */
const OPTIONAL_FIELDS_CONFIG: OptionalFieldConfig[] = [
  {
    key: 'privateNotes',
    label: 'Private Notes',
    placeholder: 'Personal notes (not exported)...',
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    placeholder: 'e.g., Beginner, Intermediate, Expert',
    isInput: true,
  },
  { key: 'gameplay', label: 'Gameplay', placeholder: 'Describe the gameplay style...' },
  {
    key: 'storytellerTips',
    label: 'Storyteller Tips',
    placeholder: 'Tips for running this script...',
  },
  { key: 'changelog', label: 'Changelogs', placeholder: 'Version history and changes...' },
];

const DEFAULT_LIST_VIEW_SETTINGS: ListViewSettings = {
  showAbility: true,
  showFirstNightReminder: false,
  showOtherNightReminder: false,
  showReminders: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

/** Extract fields with content from project for auto-showing */
function getFieldsWithContent(project: Project): Set<string> {
  const fields = new Set<string>();
  if (project.privateNotes) fields.add('privateNotes');
  if (project.difficulty) fields.add('difficulty');
  if (project.gameplay) fields.add('gameplay');
  if (project.storytellerTips) fields.add('storytellerTips');
  if (project.changelog) fields.add('changelog');
  return fields;
}

/** Build JSON string from project state */
function buildProjectJsonString(
  project: Project | null,
  isActiveProject: boolean,
  jsonInput: string
): string {
  if (!project) return '';
  // For active project, use the actual JSON from the editor
  if (isActiveProject && jsonInput) {
    return jsonInput;
  }
  // For non-active projects, reconstruct from project state
  const scriptArray: unknown[] = [];
  if (project.state.scriptMeta) {
    scriptArray.push(project.state.scriptMeta);
  }
  for (const char of project.state.characters) {
    if (char.source === 'official') {
      scriptArray.push(char.id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { uuid, source, ...charData } = char;
      scriptArray.push(charData);
    }
  }
  return JSON.stringify(scriptArray, null, 2);
}

// ============================================================================
// Custom Hooks
// ============================================================================

/** Hook for managing optional field state with lookup-based getters/setters */
function useOptionalFields(project: Project | null) {
  const [privateNotes, setPrivateNotes] = useState('');
  const [gameplay, setGameplay] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [storytellerTips, setStorytellerTips] = useState('');
  const [changelog, setChangelog] = useState('');
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Field value map for lookup-based access
  const fieldValues: Record<string, string> = {
    privateNotes,
    difficulty,
    gameplay,
    storytellerTips,
    changelog,
  };

  const fieldSetters: Record<string, (value: string) => void> = {
    privateNotes: setPrivateNotes,
    difficulty: setDifficulty,
    gameplay: setGameplay,
    storytellerTips: setStorytellerTips,
    changelog: setChangelog,
  };

  const getValue = useCallback((key: string) => fieldValues[key] || '', [fieldValues]);
  const setValue = useCallback(
    (key: string, value: string) => {
      fieldSetters[key]?.(value);
    },
    [fieldSetters]
  );

  const resetFromProject = useCallback((proj: Project) => {
    setPrivateNotes(proj.privateNotes || '');
    setGameplay(proj.gameplay || '');
    setDifficulty(proj.difficulty || '');
    setStorytellerTips(proj.storytellerTips || '');
    setChangelog(proj.changelog || '');
    setVisibleFields(getFieldsWithContent(proj));
    setShowAddDropdown(false);
  }, []);

  const addField = useCallback((key: string) => {
    setVisibleFields((prev) => new Set([...prev, key]));
    setShowAddDropdown(false);
  }, []);

  const removeField = useCallback((key: string) => {
    fieldSetters[key]?.('');
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, [fieldSetters]);

  const availableFields = useMemo(
    () => OPTIONAL_FIELDS_CONFIG.filter((f) => !visibleFields.has(f.key)),
    [visibleFields]
  );

  // Get trimmed values for saving
  const getValuesForSave = useCallback(
    () => ({
      privateNotes: privateNotes.trim() || undefined,
      gameplay: gameplay.trim() || undefined,
      difficulty: difficulty.trim() || undefined,
      storytellerTips: storytellerTips.trim() || undefined,
      changelog: changelog.trim() || undefined,
    }),
    [privateNotes, gameplay, difficulty, storytellerTips, changelog]
  );

  return {
    getValue,
    setValue,
    resetFromProject,
    visibleFields,
    addField,
    removeField,
    availableFields,
    showAddDropdown,
    setShowAddDropdown,
    getValuesForSave,
  };
}

/** Hook for token generation logic for non-active projects */
function useProjectTokens(
  project: Project | null,
  isActiveProject: boolean,
  displayMode: DisplayMode,
  contextTokens: Token[],
  setContextTokens: (tokens: Token[]) => void
) {
  const [previewTokens, setPreviewTokens] = useState<Token[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPreviewTokensRef = useRef<Token[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Generate preview tokens for non-active projects
  useEffect(() => {
    if (!project || isActiveProject) {
      if (isActiveProject && lastPreviewTokensRef.current.length > 0) {
        setContextTokens(lastPreviewTokensRef.current);
        lastPreviewTokensRef.current = [];
      }
      setPreviewTokens([]);
      setIsGenerating(false);
      abortControllerRef.current?.abort();
      return;
    }

    if (displayMode !== 'tokens' || previewTokens.length > 0) {
      setIsGenerating(false);
      return;
    }

    const generate = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setIsGenerating(true);

      try {
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null,
          project.state.scriptMeta,
          null,
          abortControllerRef.current.signal
        );
        setPreviewTokens(generated);
        lastPreviewTokensRef.current = generated;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('ProjectEditor', 'Failed to generate preview tokens', err);
        }
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [project?.id, isActiveProject, displayMode, previewTokens.length, project, setContextTokens]);

  // Generate tokens for active project after page refresh
  useEffect(() => {
    if (
      !(project && isActiveProject) ||
      contextTokens.length > 0 ||
      isGenerating ||
      displayMode !== 'tokens'
    ) {
      return;
    }

    const generate = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setIsGenerating(true);

      try {
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null,
          project.state.scriptMeta,
          null,
          abortControllerRef.current.signal
        );
        setContextTokens(generated);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('ProjectEditor', 'Failed to generate tokens for active project', err);
        }
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [
    project?.id,
    isActiveProject,
    contextTokens.length,
    isGenerating,
    displayMode,
    project,
    setContextTokens,
  ]);

  const displayTokens = isActiveProject ? contextTokens : previewTokens;

  return { displayTokens, isGenerating };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TabNavigationProps {
  activeTab: ProjectEditorTab;
  onTabChange: (tab: ProjectEditorTab) => void;
}

/** Tab navigation for Overview, Versions, Settings */
const TabNavigation = memo(function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className={styles.tabNavigation}>
      <button
        type="button"
        className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('overview')}
      >
        ⚙️ Overview
      </button>
      <button
        type="button"
        className={`${styles.tabButton} ${activeTab === 'versions' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('versions')}
      >
        🏷️ Versions
      </button>
      <button
        type="button"
        className={`${styles.tabButton} ${activeTab === 'settings' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('settings')}
      >
        🔧 Settings
      </button>
    </div>
  );
});

interface DisplayModeToggleProps {
  displayMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
}

/** Toggle between tokens, list, and JSON display modes */
const DisplayModeToggle = memo(function DisplayModeToggle({
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
        🎨 Tokens
      </button>
      <button
        type="button"
        className={`${styles.viewToggleButton} ${displayMode === 'list' ? styles.viewToggleActive : ''}`}
        onClick={() => onModeChange('list')}
        title="View as list"
      >
        📋 List
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

interface ListSettingsPopoverProps {
  settings: ListViewSettings;
  onSettingsChange: (settings: ListViewSettings) => void;
  onClose: () => void;
}

/** Popover for configuring list view columns */
const ListSettingsPopover = memo(function ListSettingsPopover({
  settings,
  onSettingsChange,
  onClose,
}: ListSettingsPopoverProps) {
  const handleChange = (key: keyof ListViewSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, [key]: e.target.checked });
  };

  return (
    <div className={viewStyles.listSettingsPopover}>
      <div className={viewStyles.listSettingsHeader}>
        <span>Columns</span>
        <button type="button" className={viewStyles.listSettingsClose} onClick={onClose}>
          ✕
        </button>
      </div>
      <label className={viewStyles.listSettingsOption}>
        <input type="checkbox" checked={settings.showAbility} onChange={handleChange('showAbility')} />
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

interface EmptyStateProps {
  onCreateProject?: () => void;
  onImportProject?: () => void;
  onLoadLastProject?: () => void;
  lastProject?: Project | null;
}

/** Empty state when no project is selected */
const EmptyState = memo(function EmptyState({
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
            ✨ Create New Project
          </Button>
          <Button variant="secondary" onClick={onImportProject}>
            📁 Import Project
          </Button>
          {lastProject && (
            <Button variant="secondary" onClick={onLoadLastProject}>
              🕒 Load Last: {lastProject.name}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

interface SettingsTabProps {
  project: Project;
  isActiveProject: boolean;
  onExport: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onDelete: () => void;
}

/** Settings tab content with project actions and danger zone */
const SettingsTab = memo(function SettingsTab({
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
          <button
            type="button"
            onClick={() => onExport(project)}
            className={styles.settingsButton}
          >
            📥 Export Project
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(project)}
            className={styles.settingsButton}
          >
            📋 Duplicate Project
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
          🗑️ Delete Project
        </button>
        {isActiveProject && (
          <p className={styles.settingsWarning}>
            ⚠️ Cannot delete the active project. Deactivate it first.
          </p>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

interface ProjectEditorProps {
  project: Project | null;
  onExport: (project: Project) => void;
  onDelete: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  onCreateProject?: () => void;
  onImportProject?: () => void;
  onLoadLastProject?: () => void;
  lastProject?: Project | null;
}

export function ProjectEditor({
  project,
  onExport,
  onDelete,
  onDuplicate,
  onCreateProject,
  onImportProject,
  onLoadLastProject,
  lastProject,
}: ProjectEditorProps) {
  const { updateProject, activateProject, currentProject, isLoading } = useProjects();
  const {
    tokens,
    setTokens,
    characters: contextCharacters,
    characterMetadata: contextCharacterMetadata,
    setCharacterEnabled,
    setAllCharactersEnabled,
    characterSelectionSummary: contextSelectionSummary,
    jsonInput,
  } = useTokenContext();
  const { addToast } = useToast();

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Is this the currently active project?
  const isActiveProject = currentProject?.id === project?.id;

  // Tab and display mode state
  const [activeTab, setActiveTab] = useState<ProjectEditorTab>('overview');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');

  // Editing state
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Optional fields hook
  const optionalFields = useOptionalFields(project);

  // Local state for meta editing
  const [localMeta, setLocalMeta] = useState<ScriptMeta>({ id: '_meta' as const });

  // List view settings
  const [listViewSettings, setListViewSettings] = useState<ListViewSettings>(DEFAULT_LIST_VIEW_SETTINGS);
  const [showListSettings, setShowListSettings] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(true);

  // Version comparison state
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const isCompareMode = selectedVersion !== null;

  // Token generation hook
  const { displayTokens, isGenerating: isGeneratingPreview } = useProjectTokens(
    project,
    isActiveProject,
    displayMode,
    tokens,
    setTokens
  );

  // Derived data for display
  const displayCharacters = useMemo(() => {
    if (isActiveProject) return contextCharacters;
    return project?.state.characters ?? [];
  }, [isActiveProject, contextCharacters, project?.state.characters]);

  const projectCharacterMetadata = useMemo(() => {
    if (isActiveProject) return contextCharacterMetadata;
    if (!project) return new Map<string, CharacterMetadata>();
    const record = project.state.characterMetadata || {};
    return new Map(Object.entries(record));
  }, [isActiveProject, contextCharacterMetadata, project]);

  const selectionSummary = useMemo(() => {
    if (isActiveProject) return contextSelectionSummary;
    if (!project) return { enabled: 0, disabled: 0, total: 0 };
    return getCharacterSelectionSummary(displayCharacters, projectCharacterMetadata);
  }, [isActiveProject, contextSelectionSummary, project, displayCharacters, projectCharacterMetadata]);

  const projectJsonString = useMemo(
    () => buildProjectJsonString(project, isActiveProject, jsonInput),
    [project, isActiveProject, jsonInput]
  );

  // Update local state when project changes
  useEffect(() => {
    if (project) {
      containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setName(project.name);
      setDescription(project.description || '');
      setError(null);
      setIsEditingBasic(false);
      setIsEditingMeta(false);
      setSelectedVersion(null);
      setLocalMeta(project.state.scriptMeta || { id: '_meta' as const });
      optionalFields.resetFromProject(project);
    }
  }, [project, optionalFields]);

  // Handlers
  const handleSaveBasic = async () => {
    if (!project) return;

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setError(null);
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        ...optionalFields.getValuesForSave(),
      });
      addToast('Project updated successfully!', 'success');
      setIsEditingBasic(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    }
  };

  const handleCancelBasic = () => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setError(null);
      optionalFields.resetFromProject(project);
    }
    setIsEditingBasic(false);
  };

  const handleMetaFieldChange = (field: keyof ScriptMeta, value: string) => {
    setLocalMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveMeta = async () => {
    if (!project) return;

    try {
      await updateProject(project.id, {
        state: {
          ...project.state,
          scriptMeta: { ...localMeta, id: '_meta' as const },
        },
      });
      addToast('Meta settings updated!', 'success');
      setIsEditingMeta(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update meta settings';
      addToast(errorMessage, 'error');
    }
  };

  const handleCancelMeta = () => {
    if (project) {
      setLocalMeta(project.state.scriptMeta || { id: '_meta' as const });
    }
    setIsEditingMeta(false);
  };

  const handleToggleActive = async () => {
    if (!project) return;

    try {
      if (isActiveProject) {
        await activateProject('');
        addToast(`Project "${project.name}" deactivated`, 'success');
      } else {
        await activateProject(project.id);
        addToast(`Project "${project.name}" is now active!`, 'success');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle project activation';
      addToast(errorMessage, 'error');
    }
  };

  const handleDelete = () => {
    if (!project) return;
    onDelete(project);
  };

  const handleVersionSelect = useCallback((version: ProjectVersion | null) => {
    setSelectedVersion(version);
  }, []);

  const handleExitCompare = useCallback(() => {
    setSelectedVersion(null);
  }, []);

  const handleRestoreVersion = useCallback(
    async (version: ProjectVersion) => {
      if (!project) return;

      if (!confirm(`Restore project to version ${version.versionNumber}? Your current state will be replaced.`)) {
        return;
      }

      try {
        setIsRestoringVersion(true);
        await updateProject(project.id, { state: version.stateSnapshot });
        addToast(`Restored to version ${version.versionNumber}`, 'success');
        setSelectedVersion(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to restore version';
        addToast(errorMessage, 'error');
      } finally {
        setIsRestoringVersion(false);
      }
    },
    [project, updateProject, addToast]
  );

  const handleCharacterToggle = useCallback(
    (uuid: string, enabled: boolean) => {
      if (isActiveProject) {
        setCharacterEnabled(uuid, enabled);
      } else if (project) {
        const currentMetadata = project.state.characterMetadata || {};
        const existingMeta = currentMetadata[uuid] || { idLinkedToName: true };
        updateProject(project.id, {
          state: {
            ...project.state,
            characterMetadata: { ...currentMetadata, [uuid]: { ...existingMeta, enabled } },
          },
        }).catch((err) => logger.warn('ProjectEditor', 'Failed to save:', err));
      }
    },
    [isActiveProject, setCharacterEnabled, project, updateProject]
  );

  const handleToggleAllCharacters = useCallback(
    (enabled: boolean) => {
      if (isActiveProject) {
        setAllCharactersEnabled(enabled);
        addToast(enabled ? 'All characters enabled' : 'All characters disabled', 'success');
      } else if (project) {
        const currentMetadata = project.state.characterMetadata || {};
        const updatedMetadata: Record<string, CharacterMetadata> = { ...currentMetadata };
        for (const char of project.state.characters) {
          const uuid = char.uuid || char.id;
          const existingMeta = updatedMetadata[uuid] || { idLinkedToName: true };
          updatedMetadata[uuid] = { ...existingMeta, enabled };
        }
        updateProject(project.id, {
          state: { ...project.state, characterMetadata: updatedMetadata },
        }).catch((err) => logger.warn('ProjectEditor', 'Failed to save:', err));
        addToast(enabled ? 'All characters enabled' : 'All characters disabled', 'success');
      }
    },
    [isActiveProject, setAllCharactersEnabled, project, updateProject, addToast]
  );

  // Empty state
  if (!project) {
    return (
      <EmptyState
        onCreateProject={onCreateProject}
        onImportProject={onImportProject}
        onLoadLastProject={onLoadLastProject}
        lastProject={lastProject}
      />
    );
  }

  return (
    <div
      className={`${layoutStyles.contentPanel} ${layoutStyles.hiddenScrollbar}`}
      ref={containerRef}
    >
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
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
              <div className={styles.projectInfo}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>PROJECT SETTINGS</h3>
                  {isEditingBasic ? (
                    <div className={styles.editActions}>
                      <button type="button" onClick={handleCancelBasic} disabled={isLoading} className={styles.cancelButton}>
                        Cancel
                      </button>
                      <button type="button" onClick={handleSaveBasic} disabled={isLoading || !name.trim()} className={styles.saveButton}>
                        {isLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsEditingBasic(true)} className={styles.editIcon} title="Edit project settings">
                      Edit
                    </button>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="project-name" className={styles.label}>Project Name</label>
                  <input
                    id="project-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditingBasic || isLoading}
                    className={`${styles.input} ${!isEditingBasic ? styles.inputDisabled : ''}`}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isEditingBasic || isLoading}
                    rows={2}
                    placeholder="Project description..."
                    className={`${styles.textarea} ${!isEditingBasic ? styles.inputDisabled : ''}`}
                  />
                </div>

                {/* Add Field Button */}
                {isEditingBasic && optionalFields.availableFields.length > 0 && (
                  <div className={styles.addFieldContainer}>
                    <button
                      type="button"
                      onClick={() => optionalFields.setShowAddDropdown(!optionalFields.showAddDropdown)}
                      className={styles.addFieldButton}
                    >
                      <span className={styles.addFieldIcon}>+</span>
                      Add Field
                      <span className={styles.addFieldArrow}>{optionalFields.showAddDropdown ? '▲' : '▼'}</span>
                    </button>
                    {optionalFields.showAddDropdown && (
                      <div className={styles.addFieldDropdown}>
                        {optionalFields.availableFields.map((field) => (
                          <button key={field.key} type="button" onClick={() => optionalFields.addField(field.key)} className={styles.addFieldOption}>
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

                  return (
                    <div key={field.key} className={styles.formGroup}>
                      <div className={styles.optionalFieldHeader}>
                        <label className={styles.label}>{field.label}</label>
                        {isEditingBasic && (
                          <button type="button" onClick={() => optionalFields.removeField(field.key)} className={styles.removeFieldButton} title={`Remove ${field.label}`}>
                            ✕
                          </button>
                        )}
                      </div>
                      {field.isInput ? (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => optionalFields.setValue(field.key, e.target.value)}
                          disabled={!isEditingBasic || isLoading}
                          placeholder={field.placeholder}
                          className={`${styles.input} ${!isEditingBasic ? styles.inputDisabled : ''}`}
                        />
                      ) : (
                        <textarea
                          value={value}
                          onChange={(e) => optionalFields.setValue(field.key, e.target.value)}
                          disabled={!isEditingBasic || isLoading}
                          rows={2}
                          placeholder={field.placeholder}
                          className={`${styles.textarea} ${!isEditingBasic ? styles.inputDisabled : ''}`}
                        />
                      )}
                    </div>
                  );
                })}

                {error && <div className={styles.error}>{error}</div>}
              </div>

              {/* Script Meta Settings */}
              <div className={styles.metaBox}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>SCRIPT META</h3>
                  {isEditingMeta ? (
                    <div className={styles.editActions}>
                      <button type="button" onClick={handleCancelMeta} disabled={isLoading} className={styles.cancelButton}>Cancel</button>
                      <button type="button" onClick={handleSaveMeta} disabled={isLoading} className={styles.saveButton}>{isLoading ? 'Saving...' : 'Save'}</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsEditingMeta(true)} className={styles.editIcon} title="Edit meta settings">Edit</button>
                  )}
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Script Name</label>
                    <input type="text" value={localMeta.name || ''} onChange={(e) => handleMetaFieldChange('name', e.target.value)} disabled={!isEditingMeta || isLoading} placeholder="Script name" className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Author</label>
                    <input type="text" value={localMeta.author || ''} onChange={(e) => handleMetaFieldChange('author', e.target.value)} disabled={!isEditingMeta || isLoading} placeholder="Author" className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Version</label>
                    <input type="text" value={localMeta.version || ''} onChange={(e) => handleMetaFieldChange('version', e.target.value)} disabled={!isEditingMeta || isLoading} placeholder="1.0.0" className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Logo URL</label>
                    <input type="text" value={localMeta.logo || ''} onChange={(e) => handleMetaFieldChange('logo', e.target.value)} disabled={!isEditingMeta || isLoading} placeholder="https://..." className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`} />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.labelSmall}>Almanac URL</label>
                    <input type="text" value={localMeta.almanac || ''} onChange={(e) => handleMetaFieldChange('almanac', e.target.value)} disabled={!isEditingMeta || isLoading} placeholder="https://..." className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Version Selector + Action Buttons */}
            <div className={styles.logoActionsBox}>
              <VersionSelector project={project} selectedVersion={selectedVersion} onVersionSelect={handleVersionSelect} disabled={isLoading} />
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={isLoading || isCompareMode}
                  className={isActiveProject ? styles.deactivateButton : styles.activateButton}
                  title={isCompareMode ? 'Exit compare mode first' : undefined}
                >
                  {isLoading ? (isActiveProject ? 'Deactivating...' : 'Activating...') : isActiveProject ? '✓ Click to Deactivate' : '⭐ Set as Active'}
                </button>
              </div>
            </div>
          </div>

          {/* Version Compare View */}
          {isCompareMode && selectedVersion && (
            <div className={styles.compareSection}>
              <VersionCompareView currentState={project.state} compareVersion={selectedVersion} onExitCompare={handleExitCompare} onRestore={handleRestoreVersion} isRestoring={isRestoringVersion} />
            </div>
          )}

          {/* Characters Section */}
          {!isCompareMode && (
            <div className={styles.charactersSection}>
              <DisplayModeToggle displayMode={displayMode} onModeChange={setDisplayMode} />

              {displayMode === 'tokens' && (
                isGeneratingPreview ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Generating token preview...</p>
                  </div>
                ) : (
                  <TokenGrid tokens={displayTokens} readOnly />
                )
              )}

              {displayMode === 'list' && (
                <div className={viewStyles.characterSelectionSection}>
                  <div className={viewStyles.characterSelectionHeaderRow}>
                    <button type="button" className={viewStyles.characterSelectionHeader} onClick={() => setShowCharacterList(!showCharacterList)}>
                      <span className={viewStyles.characterSelectionIcon}>{showCharacterList ? '▼' : '▶'}</span>
                      <span className={viewStyles.characterSelectionTitle}>Character Selection</span>
                      <span className={viewStyles.characterSelectionSummary}>
                        {selectionSummary.enabled} of {selectionSummary.total} included
                        {selectionSummary.disabled > 0 && <span className={viewStyles.characterSelectionBadge}>{selectionSummary.disabled} excluded</span>}
                      </span>
                    </button>
                    {showCharacterList && (
                      <div className={viewStyles.listSettingsContainer}>
                        <button type="button" className={viewStyles.listSettingsButton} onClick={() => setShowListSettings(!showListSettings)} title="Configure list columns" aria-expanded={showListSettings}>⚙️</button>
                        {showListSettings && (
                          <ListSettingsPopover settings={listViewSettings} onSettingsChange={setListViewSettings} onClose={() => setShowListSettings(false)} />
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
                        onToggleCharacter={handleCharacterToggle}
                        onToggleAll={handleToggleAllCharacters}
                      />
                    </div>
                  )}
                </div>
              )}

              {displayMode === 'json' && (
                <div className={styles.jsonViewContainer}>
                  <JsonEditorPanel value={projectJsonString} onChange={() => {}} disabled={true} minHeight="400px" placeholder="No project data" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'versions' && (
        <div className={styles.versionsContainer}>
          <VersionsView project={project} />
        </div>
      )}

      {activeTab === 'settings' && (
        <SettingsTab project={project} isActiveProject={isActiveProject} onExport={onExport} onDuplicate={onDuplicate} onDelete={handleDelete} />
      )}
    </div>
  );
}
