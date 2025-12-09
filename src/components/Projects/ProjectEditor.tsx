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

import { useState, useEffect, useMemo, useRef } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { useTokenContext } from '../../contexts/TokenContext'
import { useToast } from '../../contexts/ToastContext'
import { TokenGrid } from '../TokenGrid/TokenGrid'
import { generateAllTokens } from '../../ts/generation/batchGenerator.js'
import type { Project } from '../../ts/types/project.js'
import type { ScriptMeta, Token } from '../../ts/types/index.js'
import styles from '../../styles/components/projects/ProjectEditor.module.css'

interface ProjectEditorProps {
  project: Project | null
  scriptNameTokenCache?: Map<string, Token>
  onExport: (project: Project) => void
  onDelete: (project: Project) => void
  onDuplicate: (project: Project) => void
}

export function ProjectEditor({ project, scriptNameTokenCache, onExport, onDelete, onDuplicate }: ProjectEditorProps) {
  const { updateProject, activateProject, currentProject, isLoading } = useProjects()
  const { tokens } = useTokenContext()
  const { addToast } = useToast()

  // State for non-active project preview tokens
  const [previewTokens, setPreviewTokens] = useState<Token[]>([])
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [isEditingBasic, setIsEditingBasic] = useState(false)
  const [isEditingMeta, setIsEditingMeta] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privateNotes, setPrivateNotes] = useState('')
  const [gameplay, setGameplay] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [storytellerTips, setStorytellerTips] = useState('')
  const [changelog, setChangelog] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Optional fields visibility state
  const [visibleOptionalFields, setVisibleOptionalFields] = useState<Set<string>>(new Set())
  const [showAddFieldDropdown, setShowAddFieldDropdown] = useState(false)

  // Define optional fields configuration
  const optionalFieldsConfig = [
    { key: 'privateNotes', label: 'Private Notes', placeholder: 'Personal notes (not exported)...' },
    { key: 'difficulty', label: 'Difficulty', placeholder: 'e.g., Beginner, Intermediate, Expert', isInput: true },
    { key: 'gameplay', label: 'Gameplay', placeholder: 'Describe the gameplay style...' },
    { key: 'storytellerTips', label: 'Storyteller Tips', placeholder: 'Tips for running this script...' },
    { key: 'changelog', label: 'Changelogs', placeholder: 'Version history and changes...' },
  ]

  // Local state for meta editing
  const [localMeta, setLocalMeta] = useState<ScriptMeta>({ id: '_meta' as const })

  // Check if this project is currently active
  const isActiveProject = currentProject?.id === project?.id

  // Determine which tokens to use for display
  const displayTokens = isActiveProject ? tokens : previewTokens

  // Find the script-name token from cache, preview tokens, or context tokens
  const scriptNameToken = useMemo(() => {
    // First check the cache for pre-rendered token
    if (project && !isActiveProject && scriptNameTokenCache?.has(project.id)) {
      return scriptNameTokenCache.get(project.id)
    }
    // Otherwise use displayTokens
    return displayTokens.find(t => t.type === 'script-name')
  }, [displayTokens, project, isActiveProject, scriptNameTokenCache])

  // Get data URL from script name token canvas
  const scriptNameTokenUrl = useMemo(() => {
    if (scriptNameToken?.canvas) {
      try {
        return scriptNameToken.canvas.toDataURL('image/png')
      } catch {
        return null
      }
    }
    return null
  }, [scriptNameToken])

  // Update local state when project changes
  useEffect(() => {
    if (project) {
      // Scroll container to top when switching projects
      containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      
      setName(project.name)
      setDescription(project.description || '')
      setPrivateNotes(project.privateNotes || '')
      setGameplay(project.gameplay || '')
      setDifficulty(project.difficulty || '')
      setStorytellerTips(project.storytellerTips || '')
      setChangelog(project.changelog || '')
      setError(null)
      setIsEditingBasic(false)
      setIsEditingMeta(false)
      setShowAddFieldDropdown(false)

      // Auto-show optional fields that have content
      const fieldsWithContent = new Set<string>()
      if (project.privateNotes) fieldsWithContent.add('privateNotes')
      if (project.difficulty) fieldsWithContent.add('difficulty')
      if (project.gameplay) fieldsWithContent.add('gameplay')
      if (project.storytellerTips) fieldsWithContent.add('storytellerTips')
      if (project.changelog) fieldsWithContent.add('changelog')
      setVisibleOptionalFields(fieldsWithContent)

      // Initialize meta state
      setLocalMeta(project.state.scriptMeta || { id: '_meta' as const })
    }
  }, [project])

  // Generate preview tokens for non-active projects
  useEffect(() => {
    // Clear preview when no project or when viewing active project
    if (!project || isActiveProject) {
      setPreviewTokens([])
      setIsGeneratingPreview(false)
      abortControllerRef.current?.abort()
      return
    }

    const generatePreview = async () => {
      // Abort any previous generation
      abortControllerRef.current?.abort()
      abortControllerRef.current = new AbortController()

      setIsGeneratingPreview(true)
      setPreviewTokens([]) // Clear previous tokens

      try {
        // Characters have source field set, no need for metadata lookup
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null, // progress callback
          project.state.scriptMeta,
          null, // token callback
          abortControllerRef.current.signal
        )
        setPreviewTokens(generated)
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to generate preview tokens:', err)
        }
      } finally {
        setIsGeneratingPreview(false)
      }
    }

    generatePreview()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [project?.id, isActiveProject])

  const handleSaveBasic = async () => {
    if (!project) return

    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    try {
      setError(null)
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        privateNotes: privateNotes.trim() || undefined,
        gameplay: gameplay.trim() || undefined,
        difficulty: difficulty.trim() || undefined,
        storytellerTips: storytellerTips.trim() || undefined,
        changelog: changelog.trim() || undefined,
      })
      addToast('Project updated successfully!', 'success')
      setIsEditingBasic(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project'
      setError(errorMessage)
      addToast(errorMessage, 'error')
    }
  }

  const handleCancelBasic = () => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setPrivateNotes(project.privateNotes || '')
      setGameplay(project.gameplay || '')
      setDifficulty(project.difficulty || '')
      setStorytellerTips(project.storytellerTips || '')
      setChangelog(project.changelog || '')
      setError(null)
      
      // Reset visible fields to only those with content
      const fieldsWithContent = new Set<string>()
      if (project.privateNotes) fieldsWithContent.add('privateNotes')
      if (project.difficulty) fieldsWithContent.add('difficulty')
      if (project.gameplay) fieldsWithContent.add('gameplay')
      if (project.storytellerTips) fieldsWithContent.add('storytellerTips')
      if (project.changelog) fieldsWithContent.add('changelog')
      setVisibleOptionalFields(fieldsWithContent)
    }
    setIsEditingBasic(false)
    setShowAddFieldDropdown(false)
  }

  // Optional field management
  const handleAddField = (fieldKey: string) => {
    setVisibleOptionalFields(prev => new Set([...prev, fieldKey]))
    setShowAddFieldDropdown(false)
  }

  const handleRemoveField = (fieldKey: string) => {
    // Clear the field value when removing
    switch (fieldKey) {
      case 'privateNotes': setPrivateNotes(''); break
      case 'difficulty': setDifficulty(''); break
      case 'gameplay': setGameplay(''); break
      case 'storytellerTips': setStorytellerTips(''); break
      case 'changelog': setChangelog(''); break
    }
    setVisibleOptionalFields(prev => {
      const next = new Set(prev)
      next.delete(fieldKey)
      return next
    })
  }

  const getFieldValue = (fieldKey: string): string => {
    switch (fieldKey) {
      case 'privateNotes': return privateNotes
      case 'difficulty': return difficulty
      case 'gameplay': return gameplay
      case 'storytellerTips': return storytellerTips
      case 'changelog': return changelog
      default: return ''
    }
  }

  const setFieldValue = (fieldKey: string, value: string) => {
    switch (fieldKey) {
      case 'privateNotes': setPrivateNotes(value); break
      case 'difficulty': setDifficulty(value); break
      case 'gameplay': setGameplay(value); break
      case 'storytellerTips': setStorytellerTips(value); break
      case 'changelog': setChangelog(value); break
    }
  }

  // Get available fields to add (not already visible)
  const availableFieldsToAdd = optionalFieldsConfig.filter(
    field => !visibleOptionalFields.has(field.key)
  )

  const handleMetaFieldChange = (field: keyof ScriptMeta, value: string) => {
    setLocalMeta(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveMeta = async () => {
    if (!project) return

    try {
      await updateProject(project.id, {
        state: {
          ...project.state,
          scriptMeta: {
            ...localMeta,
            id: '_meta' as const,
          },
        },
      })
      addToast('Meta settings updated!', 'success')
      setIsEditingMeta(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update meta settings'
      addToast(errorMessage, 'error')
    }
  }

  const handleCancelMeta = () => {
    if (project) {
      setLocalMeta(project.state.scriptMeta || { id: '_meta' as const })
    }
    setIsEditingMeta(false)
  }

  const handleToggleActive = async () => {
    if (!project) return

    try {
      if (isActiveProject) {
        // Deactivate by clearing the current project
        await activateProject('')
        addToast(`Project "${project.name}" deactivated`, 'success')
      } else {
        // Activate this project
        await activateProject(project.id)
        addToast(`Project "${project.name}" is now active!`, 'success')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle project activation'
      addToast(errorMessage, 'error')
    }
  }

  const handleDelete = () => {
    if (!project) return
    onDelete(project)
  }

  if (!project) {
    return (
      <div className={styles.emptyState}>
        <h2>No Project Selected</h2>
        <p>Select a project from the sidebar to view its details.</p>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={containerRef}>
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
                    onClick={handleCancelBasic}
                    disabled={isLoading}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                  onClick={handleSaveBasic}
                  disabled={isLoading || !name.trim()}
                  className={styles.saveButton}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
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
            <label className={styles.label}>Project Name</label>
            <input
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
                <span className={styles.addFieldArrow}>{showAddFieldDropdown ? '▲' : '▼'}</span>
              </button>
              {showAddFieldDropdown && (
                <div className={styles.addFieldDropdown}>
                  {availableFieldsToAdd.map(field => (
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
          {optionalFieldsConfig.map(field => {
            if (!visibleOptionalFields.has(field.key)) return null
            
            const value = getFieldValue(field.key)
            
            return (
              <div key={field.key} className={styles.formGroup}>
                <div className={styles.optionalFieldHeader}>
                  <label className={styles.label}>
                    {field.label}
                  </label>
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
            )
          })}

          {error && (
            <div className={styles.error}>{error}</div>
          )}
        </div>

        {/* Script Meta Settings - Separate Box */}
        <div className={styles.metaBox}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>SCRIPT META</h3>
            {isEditingMeta ? (
              <div className={styles.editActions}>
                <button
                  onClick={handleCancelMeta}
                  disabled={isLoading}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMeta}
                  disabled={isLoading}
                  className={styles.saveButton}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button
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

        {/* Right: Logo + Action Buttons */}
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
          <div className={styles.actionButtons}>
            <button
              onClick={handleToggleActive}
              disabled={isLoading}
              className={isActiveProject ? styles.deactivateButton : styles.activateButton}
            >
              {isLoading
                ? (isActiveProject ? 'Deactivating...' : 'Activating...')
                : (isActiveProject ? '✓ Click to Deactivate' : '⭐ Set as Active')
              }
            </button>
            <div className={styles.actionDivider} />
            <button
              onClick={() => onExport(project)}
              className={styles.exportButton}
            >
              📥 Export
            </button>
            <button
              onClick={() => onDuplicate(project)}
              className={styles.duplicateButton}
            >
              📋 Duplicate
            </button>
            <button
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={isActiveProject}
              title={isActiveProject ? 'Cannot delete active project' : 'Delete project'}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tokens Section - Read-only view matching Gallery */}
      <div className={styles.charactersSection}>
        {isGeneratingPreview ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Generating token preview...</p>
          </div>
        ) : (
          <TokenGrid tokens={displayTokens} readOnly />
        )}
      </div>
    </div>
  )
}
