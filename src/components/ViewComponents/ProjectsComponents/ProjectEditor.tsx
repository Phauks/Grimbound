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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useTokenContext } from '../../../contexts/TokenContext';
import { useProjects } from '../../../hooks/useProjects';
import layoutStyles from '../../../styles/components/layout/ViewLayout.module.css';
import styles from '../../../styles/components/projects/ProjectEditor.module.css';
import { generateAllTokens } from '../../../ts/generation/batchGenerator.js';
import type { ScriptMeta, Token } from '../../../ts/types/index.js';
import type { Project, ProjectVersion } from '../../../ts/types/project.js';
import { Button } from '../../Shared/UI/Button';
import { VersionsView } from '../../Views/VersionsView';
import { TokenGrid } from '../TokensComponents/TokenGrid/TokenGrid';
import { CharacterListView } from './CharacterListView';
import { VersionCompareView } from './VersionCompareView';
import { VersionSelector } from './VersionSelector';

interface ProjectEditorProps {
  project: Project | null;
  scriptNameTokenCache?: Map<string, Token>;
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
  scriptNameTokenCache,
  onExport,
  onDelete,
  onDuplicate,
  onCreateProject,
  onImportProject,
  onLoadLastProject,
  lastProject,
}: ProjectEditorProps) {
  const { updateProject, activateProject, currentProject, isLoading } = useProjects();
  const { tokens, setTokens } = useTokenContext();
  const { addToast } = useToast();

  // State for non-active project preview tokens
  const [previewTokens, setPreviewTokens] = useState<Token[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ref to preserve preview tokens when project becomes active
  const lastPreviewTokensRef = useRef<Token[]>([]);

  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [gameplay, setGameplay] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [storytellerTips, setStorytellerTips] = useState('');
  const [changelog, setChangelog] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Tab navigation state
  type ProjectEditorTab = 'overview' | 'versions' | 'settings';
  const [activeTab, setActiveTab] = useState<ProjectEditorTab>('overview');

  // Display mode for character view (tokens grid vs compact list)
  type DisplayMode = 'tokens' | 'list';
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');

  // List view column visibility settings
  interface ListViewSettings {
    showAbility: boolean;
    showFirstNightReminder: boolean;
    showOtherNightReminder: boolean;
    showReminders: boolean;
  }
  const [listViewSettings, setListViewSettings] = useState<ListViewSettings>({
    showAbility: true,
    showFirstNightReminder: false,
    showOtherNightReminder: false,
    showReminders: false,
  });
  const [showListSettings, setShowListSettings] = useState(false);

  // Version comparison state
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Computed: are we in compare mode?
  const isCompareMode = selectedVersion !== null;

  // Optional fields visibility state
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<Set<string>>(new Set());
  const [showAddFieldDropdown, setShowAddFieldDropdown] = useState(false);

  // Define optional fields configuration
  const optionalFieldsConfig = [
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

  // Local state for meta editing
  const [localMeta, setLocalMeta] = useState<ScriptMeta>({ id: '_meta' as const });

  // Check if this project is currently active
  const isActiveProject = currentProject?.id === project?.id;

  // Determine which tokens to use for display
  const displayTokens = isActiveProject ? tokens : previewTokens;

  // Find the script-name token from cache, preview tokens, or context tokens
  const scriptNameToken = useMemo(() => {
    // First check the cache for pre-rendered token
    if (project && !isActiveProject && scriptNameTokenCache?.has(project.id)) {
      return scriptNameTokenCache.get(project.id);
    }
    // Otherwise use displayTokens
    return displayTokens.find((t) => t.type === 'script-name');
  }, [displayTokens, project, isActiveProject, scriptNameTokenCache]);

  // Get data URL from script name token canvas
  const scriptNameTokenUrl = useMemo(() => {
    if (scriptNameToken?.canvas) {
      try {
        return scriptNameToken.canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    }
    return null;
  }, [scriptNameToken]);

  // Update local state when project changes
  useEffect(() => {
    if (project) {
      // Scroll container to top when switching projects
      containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });

      setName(project.name);
      setDescription(project.description || '');
      setPrivateNotes(project.privateNotes || '');
      setGameplay(project.gameplay || '');
      setDifficulty(project.difficulty || '');
      setStorytellerTips(project.storytellerTips || '');
      setChangelog(project.changelog || '');
      setError(null);
      setIsEditingBasic(false);
      setIsEditingMeta(false);
      setShowAddFieldDropdown(false);
      setSelectedVersion(null); // Reset version comparison when switching projects

      // Auto-show optional fields that have content
      const fieldsWithContent = new Set<string>();
      if (project.privateNotes) fieldsWithContent.add('privateNotes');
      if (project.difficulty) fieldsWithContent.add('difficulty');
      if (project.gameplay) fieldsWithContent.add('gameplay');
      if (project.storytellerTips) fieldsWithContent.add('storytellerTips');
      if (project.changelog) fieldsWithContent.add('changelog');
      setVisibleOptionalFields(fieldsWithContent);

      // Initialize meta state
      setLocalMeta(project.state.scriptMeta || { id: '_meta' as const });
    }
  }, [project]);

  // Generate preview tokens for non-active projects - ONLY when tokens view is active
  useEffect(() => {
    // When project becomes active, copy preview tokens to context and clear local state
    if (!project || isActiveProject) {
      // If we have preview tokens and the project just became active, copy them to context
      if (isActiveProject && lastPreviewTokensRef.current.length > 0) {
        setTokens(lastPreviewTokensRef.current);
        lastPreviewTokensRef.current = [];
      }
      setPreviewTokens([]);
      setIsGeneratingPreview(false);
      abortControllerRef.current?.abort();
      return;
    }

    // Only generate tokens when viewing token grid (list view uses characters directly)
    if (displayMode !== 'tokens') {
      setIsGeneratingPreview(false);
      return;
    }

    // Skip if we already have tokens
    if (previewTokens.length > 0) {
      return;
    }

    const generatePreview = async () => {
      // Abort any previous generation
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsGeneratingPreview(true);

      try {
        // Characters have source field set, no need for metadata lookup
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null, // progress callback
          project.state.scriptMeta,
          null, // token callback
          abortControllerRef.current.signal
        );
        setPreviewTokens(generated);
        // Store in ref so we can copy to context if project becomes active
        lastPreviewTokensRef.current = generated;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to generate preview tokens:', err);
        }
      } finally {
        setIsGeneratingPreview(false);
      }
    };

    generatePreview();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [project?.id, isActiveProject, setTokens, displayMode, previewTokens.length, project]);

  // Handle page refresh case: generate tokens if project is active but tokens are empty
  // Only generate when tokens view is active
  useEffect(() => {
    if (!(project && isActiveProject) || tokens.length > 0 || isGeneratingPreview) {
      return;
    }

    // Only generate tokens when viewing token grid
    if (displayMode !== 'tokens') {
      return;
    }

    // Project is active but has no tokens (e.g., after page refresh)
    const generateTokensForActiveProject = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsGeneratingPreview(true);

      try {
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null,
          project.state.scriptMeta,
          null,
          abortControllerRef.current.signal
        );
        setTokens(generated);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to generate tokens for active project:', err);
        }
      } finally {
        setIsGeneratingPreview(false);
      }
    };

    generateTokensForActiveProject();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [
    project?.id,
    isActiveProject,
    tokens.length,
    isGeneratingPreview,
    setTokens,
    displayMode,
    project,
  ]);

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
        privateNotes: privateNotes.trim() || undefined,
        gameplay: gameplay.trim() || undefined,
        difficulty: difficulty.trim() || undefined,
        storytellerTips: storytellerTips.trim() || undefined,
        changelog: changelog.trim() || undefined,
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
      setPrivateNotes(project.privateNotes || '');
      setGameplay(project.gameplay || '');
      setDifficulty(project.difficulty || '');
      setStorytellerTips(project.storytellerTips || '');
      setChangelog(project.changelog || '');
      setError(null);

      // Reset visible fields to only those with content
      const fieldsWithContent = new Set<string>();
      if (project.privateNotes) fieldsWithContent.add('privateNotes');
      if (project.difficulty) fieldsWithContent.add('difficulty');
      if (project.gameplay) fieldsWithContent.add('gameplay');
      if (project.storytellerTips) fieldsWithContent.add('storytellerTips');
      if (project.changelog) fieldsWithContent.add('changelog');
      setVisibleOptionalFields(fieldsWithContent);
    }
    setIsEditingBasic(false);
    setShowAddFieldDropdown(false);
  };

  // Optional field management
  const handleAddField = (fieldKey: string) => {
    setVisibleOptionalFields((prev) => new Set([...prev, fieldKey]));
    setShowAddFieldDropdown(false);
  };

  const handleRemoveField = (fieldKey: string) => {
    // Clear the field value when removing
    switch (fieldKey) {
      case 'privateNotes':
        setPrivateNotes('');
        break;
      case 'difficulty':
        setDifficulty('');
        break;
      case 'gameplay':
        setGameplay('');
        break;
      case 'storytellerTips':
        setStorytellerTips('');
        break;
      case 'changelog':
        setChangelog('');
        break;
    }
    setVisibleOptionalFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });
  };

  const getFieldValue = (fieldKey: string): string => {
    switch (fieldKey) {
      case 'privateNotes':
        return privateNotes;
      case 'difficulty':
        return difficulty;
      case 'gameplay':
        return gameplay;
      case 'storytellerTips':
        return storytellerTips;
      case 'changelog':
        return changelog;
      default:
        return '';
    }
  };

  const setFieldValue = (fieldKey: string, value: string) => {
    switch (fieldKey) {
      case 'privateNotes':
        setPrivateNotes(value);
        break;
      case 'difficulty':
        setDifficulty(value);
        break;
      case 'gameplay':
        setGameplay(value);
        break;
      case 'storytellerTips':
        setStorytellerTips(value);
        break;
      case 'changelog':
        setChangelog(value);
        break;
    }
  };

  // Get available fields to add (not already visible)
  const availableFieldsToAdd = optionalFieldsConfig.filter(
    (field) => !visibleOptionalFields.has(field.key)
  );

  const handleMetaFieldChange = (field: keyof ScriptMeta, value: string) => {
    setLocalMeta((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveMeta = async () => {
    if (!project) return;

    try {
      await updateProject(project.id, {
        state: {
          ...project.state,
          scriptMeta: {
            ...localMeta,
            id: '_meta' as const,
          },
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
        // Deactivate by clearing the current project
        await activateProject('');
        addToast(`Project "${project.name}" deactivated`, 'success');
      } else {
        // Activate this project
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

  // Version comparison handlers
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
        await updateProject(project.id, {
          state: version.stateSnapshot,
        });
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

  if (!project) {
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
  }

  return (
    <div
      className={`${layoutStyles.contentPanel} ${layoutStyles.hiddenScrollbar}`}
      ref={containerRef}
    >
      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          ⚙️ Overview
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'versions' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          🏷️ Versions
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'settings' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          🔧 Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Top Section: Project Settings on left, Logo + Actions on right */}
          <div className={styles.topSection}>
            {/* Left Column: Project Info + Meta Settings */}
            <div className={styles.leftColumn}>
              {/* Project Settings Box */}
              <div className={styles.projectInfo}>
                {/* Project Settings Header */}
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>PROJECT SETTINGS</h3>
                  {isEditingBasic ? (
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        onClick={handleCancelBasic}
                        disabled={isLoading}
                        className={styles.cancelButton}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBasic}
                        disabled={isLoading || !name.trim()}
                        className={styles.saveButton}
                      >
                        {isLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingBasic(true)}
                      className={styles.editIcon}
                      title="Edit project settings"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Project Name */}
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

                {/* Description */}
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

                {/* Add Field Button - Only show when editing and there are fields to add */}
                {isEditingBasic && availableFieldsToAdd.length > 0 && (
                  <div className={styles.addFieldContainer}>
                    <button
                      type="button"
                      onClick={() => setShowAddFieldDropdown(!showAddFieldDropdown)}
                      className={styles.addFieldButton}
                    >
                      <span className={styles.addFieldIcon}>+</span>
                      Add Field
                      <span className={styles.addFieldArrow}>
                        {showAddFieldDropdown ? '▲' : '▼'}
                      </span>
                    </button>
                    {showAddFieldDropdown && (
                      <div className={styles.addFieldDropdown}>
                        {availableFieldsToAdd.map((field) => (
                          <button
                            key={field.key}
                            type="button"
                            onClick={() => handleAddField(field.key)}
                            className={styles.addFieldOption}
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Fields - Only render if visible */}
                {optionalFieldsConfig.map((field) => {
                  if (!visibleOptionalFields.has(field.key)) return null;

                  const value = getFieldValue(field.key);

                  return (
                    <div key={field.key} className={styles.formGroup}>
                      <div className={styles.optionalFieldHeader}>
                        <label className={styles.label}>{field.label}</label>
                        {isEditingBasic && (
                          <button
                            type="button"
                            onClick={() => handleRemoveField(field.key)}
                            className={styles.removeFieldButton}
                            title={`Remove ${field.label}`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {field.isInput ? (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
                          disabled={!isEditingBasic || isLoading}
                          placeholder={field.placeholder}
                          className={`${styles.input} ${!isEditingBasic ? styles.inputDisabled : ''}`}
                        />
                      ) : (
                        <textarea
                          value={value}
                          onChange={(e) => setFieldValue(field.key, e.target.value)}
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

              {/* Script Meta Settings - Separate Box */}
              <div className={styles.metaBox}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>SCRIPT META</h3>
                  {isEditingMeta ? (
                    <div className={styles.editActions}>
                      <button
                        type="button"
                        onClick={handleCancelMeta}
                        disabled={isLoading}
                        className={styles.cancelButton}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMeta}
                        disabled={isLoading}
                        className={styles.saveButton}
                      >
                        {isLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingMeta(true)}
                      className={styles.editIcon}
                      title="Edit meta settings"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Script Name</label>
                    <input
                      type="text"
                      value={localMeta.name || ''}
                      onChange={(e) => handleMetaFieldChange('name', e.target.value)}
                      disabled={!isEditingMeta || isLoading}
                      placeholder="Script name"
                      className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Author</label>
                    <input
                      type="text"
                      value={localMeta.author || ''}
                      onChange={(e) => handleMetaFieldChange('author', e.target.value)}
                      disabled={!isEditingMeta || isLoading}
                      placeholder="Author"
                      className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Version</label>
                    <input
                      type="text"
                      value={localMeta.version || ''}
                      onChange={(e) => handleMetaFieldChange('version', e.target.value)}
                      disabled={!isEditingMeta || isLoading}
                      placeholder="1.0.0"
                      className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelSmall}>Logo URL</label>
                    <input
                      type="text"
                      value={localMeta.logo || ''}
                      onChange={(e) => handleMetaFieldChange('logo', e.target.value)}
                      disabled={!isEditingMeta || isLoading}
                      placeholder="https://..."
                      className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`}
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.labelSmall}>Almanac URL</label>
                    <input
                      type="text"
                      value={localMeta.almanac || ''}
                      onChange={(e) => handleMetaFieldChange('almanac', e.target.value)}
                      disabled={!isEditingMeta || isLoading}
                      placeholder="https://..."
                      className={`${styles.input} ${!isEditingMeta ? styles.inputDisabled : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* End Left Column */}

            {/* Right: Logo + Version Selector + Action Buttons */}
            <div className={styles.logoActionsBox}>
              <div className={styles.logoDisplayContainer}>
                {scriptNameTokenUrl ? (
                  <img
                    src={scriptNameTokenUrl}
                    alt="Script Name Token"
                    className={styles.logoPreview}
                  />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <span>No Script Name Token</span>
                    <small>Generate tokens to see the Script Name token here</small>
                  </div>
                )}
              </div>

              {/* Version Selector - for quick access to compare mode */}
              <VersionSelector
                project={project}
                selectedVersion={selectedVersion}
                onVersionSelect={handleVersionSelect}
                disabled={isLoading}
              />

              <div className={styles.actionButtons}>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={isLoading || isCompareMode}
                  className={isActiveProject ? styles.deactivateButton : styles.activateButton}
                  title={isCompareMode ? 'Exit compare mode first' : undefined}
                >
                  {isLoading
                    ? isActiveProject
                      ? 'Deactivating...'
                      : 'Activating...'
                    : isActiveProject
                      ? '✓ Click to Deactivate'
                      : '⭐ Set as Active'}
                </button>
              </div>
            </div>
          </div>

          {/* Version Compare View - Shown prominently when in compare mode */}
          {isCompareMode && selectedVersion && (
            <div className={styles.compareSection}>
              <VersionCompareView
                currentState={project.state}
                compareVersion={selectedVersion}
                onExitCompare={handleExitCompare}
                onRestore={handleRestoreVersion}
                isRestoring={isRestoringVersion}
              />
            </div>
          )}

          {/* Characters Section - Hidden when in compare mode */}
          {!isCompareMode && (
            <div className={styles.charactersSection}>
              {/* View Mode Toggle */}
              <div className={styles.viewToggle}>
                <span className={styles.viewToggleLabel}>View:</span>
                <button
                  type="button"
                  className={`${styles.viewToggleButton} ${displayMode === 'tokens' ? styles.viewToggleActive : ''}`}
                  onClick={() => setDisplayMode('tokens')}
                  title="View as tokens"
                >
                  🎨 Tokens
                </button>
                <button
                  type="button"
                  className={`${styles.viewToggleButton} ${displayMode === 'list' ? styles.viewToggleActive : ''}`}
                  onClick={() => setDisplayMode('list')}
                  title="View as list"
                >
                  📋 List
                </button>

                {/* List View Settings - Only show when list mode is active */}
                {displayMode === 'list' && (
                  <div className={styles.listSettingsContainer}>
                    <button
                      type="button"
                      className={styles.listSettingsButton}
                      onClick={() => setShowListSettings(!showListSettings)}
                      title="Configure list columns"
                      aria-expanded={showListSettings}
                    >
                      ⚙️
                    </button>
                    {showListSettings && (
                      <div className={styles.listSettingsPopover}>
                        <div className={styles.listSettingsHeader}>
                          <span>Columns</span>
                          <button
                            type="button"
                            className={styles.listSettingsClose}
                            onClick={() => setShowListSettings(false)}
                          >
                            ✕
                          </button>
                        </div>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showAbility}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showAbility: e.target.checked,
                              }))
                            }
                          />
                          <span>Ability Text</span>
                        </label>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showFirstNightReminder}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showFirstNightReminder: e.target.checked,
                              }))
                            }
                          />
                          <span>First Night Reminder</span>
                        </label>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showOtherNightReminder}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showOtherNightReminder: e.target.checked,
                              }))
                            }
                          />
                          <span>Other Night Reminder</span>
                        </label>
                        <label className={styles.listSettingsOption}>
                          <input
                            type="checkbox"
                            checked={listViewSettings.showReminders}
                            onChange={(e) =>
                              setListViewSettings((prev) => ({
                                ...prev,
                                showReminders: e.target.checked,
                              }))
                            }
                          />
                          <span>Reminders</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {displayMode === 'tokens' ? (
                isGeneratingPreview ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Generating token preview...</p>
                  </div>
                ) : (
                  <TokenGrid tokens={displayTokens} readOnly />
                )
              ) : (
                // List view uses characters directly - no token generation needed!
                <CharacterListView
                  characters={project.state.characters}
                  showAbility={listViewSettings.showAbility}
                  showFirstNightReminder={listViewSettings.showFirstNightReminder}
                  showOtherNightReminder={listViewSettings.showOtherNightReminder}
                  showReminders={listViewSettings.showReminders}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Versions Tab Content */}
      {activeTab === 'versions' && (
        <div className={styles.versionsContainer}>
          <VersionsView project={project} />
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
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
              onClick={handleDelete}
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
      )}
    </div>
  );
}
