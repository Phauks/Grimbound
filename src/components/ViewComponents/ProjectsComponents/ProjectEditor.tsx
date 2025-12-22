/**
 * Project Editor Component
 *
 * Right panel for editing project details, metadata, and viewing characters.
 * Features:
 * - Actions box in top right
 * - Description beneath title
 * - Inline editing
 * - Logo settings in separate area
 * - Independently scrollable right panel
 *
 * Refactored to use extracted sub-components and hooks for maintainability.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VersionsView } from '@/components/Views/VersionsView';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import {
  type DisplayMode,
  useOptionalFields,
  useProjects,
  useProjectTokens,
} from '@/hooks/projects/index.js';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/projects/ProjectEditor.module.css';
import type { CharacterMetadata, ScriptMeta } from '@/ts/types/index.js';
import type { Project, ProjectVersion } from '@/ts/types/project.js';
import { getCharacterSelectionSummary } from '@/ts/utils/characterFiltering.js';
import { logger } from '@/ts/utils/logger.js';
import {
  DEFAULT_LIST_VIEW_SETTINGS,
  EmptyState,
  type ListViewSettings,
  OverviewTab,
  type ProjectEditorTab,
  SettingsTab,
  TabNavigation,
} from './ProjectEditorSubComponents';

// ============================================================================
// Helper Functions
// ============================================================================

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
      const { uuid: _uuid, source: _source, ...charData } = char;
      scriptArray.push(charData);
    }
  }
  return JSON.stringify(scriptArray, null, 2);
}

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
  const optionalFields = useOptionalFields();

  // Local state for meta editing
  const [localMeta, setLocalMeta] = useState<ScriptMeta>({ id: '_meta' as const });

  // List view settings
  const [listViewSettings, setListViewSettings] = useState<ListViewSettings>(
    DEFAULT_LIST_VIEW_SETTINGS
  );
  const [showListSettings, setShowListSettings] = useState(false);
  const [showCharacterList, setShowCharacterList] = useState(true);

  // Version comparison state
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const isCompareMode = selectedVersion !== null;

  // Token generation hook
  const { displayTokens, isGenerating: isGeneratingPreview } = useProjectTokens({
    project,
    isActiveProject,
    displayMode,
    contextTokens: tokens,
    setContextTokens: setTokens,
  });

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
  }, [
    isActiveProject,
    contextSelectionSummary,
    project,
    displayCharacters,
    projectCharacterMetadata,
  ]);

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

  // ============================================================================
  // Event Handlers
  // ============================================================================

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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle project activation';
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

      if (
        !confirm(
          `Restore project to version ${version.versionNumber}? Your current state will be replaced.`
        )
      ) {
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

  // ============================================================================
  // Render
  // ============================================================================

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
        <OverviewTab
          project={project}
          isActiveProject={isActiveProject}
          isLoading={isLoading}
          isCompareMode={isCompareMode}
          // Editing state
          isEditingBasic={isEditingBasic}
          setIsEditingBasic={setIsEditingBasic}
          isEditingMeta={isEditingMeta}
          setIsEditingMeta={setIsEditingMeta}
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          error={error}
          localMeta={localMeta}
          optionalFields={optionalFields}
          // Display state
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          displayTokens={displayTokens}
          displayCharacters={displayCharacters}
          projectCharacterMetadata={projectCharacterMetadata}
          selectionSummary={selectionSummary}
          projectJsonString={projectJsonString}
          isGeneratingPreview={isGeneratingPreview}
          // List view settings
          listViewSettings={listViewSettings}
          setListViewSettings={setListViewSettings}
          showListSettings={showListSettings}
          setShowListSettings={setShowListSettings}
          showCharacterList={showCharacterList}
          setShowCharacterList={setShowCharacterList}
          // Version state
          selectedVersion={selectedVersion}
          isRestoringVersion={isRestoringVersion}
          // Handlers
          onSaveBasic={handleSaveBasic}
          onCancelBasic={handleCancelBasic}
          onMetaFieldChange={handleMetaFieldChange}
          onSaveMeta={handleSaveMeta}
          onCancelMeta={handleCancelMeta}
          onToggleActive={handleToggleActive}
          onVersionSelect={handleVersionSelect}
          onExitCompare={handleExitCompare}
          onRestoreVersion={handleRestoreVersion}
          onCharacterToggle={handleCharacterToggle}
          onToggleAllCharacters={handleToggleAllCharacters}
        />
      )}

      {activeTab === 'versions' && (
        <div className={styles.versionsContainer}>
          <VersionsView project={project} />
        </div>
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          project={project}
          isActiveProject={isActiveProject}
          onExport={onExport}
          onDuplicate={onDuplicate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
