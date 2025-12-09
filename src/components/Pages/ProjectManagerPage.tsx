/**
 * Project Manager Page
 *
 * Unified project management interface with left sidebar (ProjectNavigation)
 * and right panel (ProjectEditor). Follows CustomizeView pattern.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { ProjectNavigation } from '../Projects/ProjectNavigation'
import { ProjectEditor } from '../Projects/ProjectEditor'
import { DeleteProjectModal } from '../Modals/DeleteProjectModal'
import { ExportProjectModal } from '../Modals/ExportProjectModal'
import { ImportProjectModal } from '../Modals/ImportProjectModal'
import { IconManagementModal } from '../Modals/IconManagementModal'
import { useProjects } from '../../hooks/useProjects'
import { useToast } from '../../contexts/ToastContext'
import { useTokenContext } from '../../contexts/TokenContext'
import { generateScriptNameTokenOnly } from '../../ts/generation/batchGenerator.js'
import type { Project, CustomIconMetadata } from '../../ts/types/project.js'
import type { Token } from '../../ts/types/index.js'
import styles from '../../styles/components/pages/Pages.module.css'

interface ProjectManagerPageProps {
  initialProjectId?: string
}

export function ProjectManagerPage({ initialProjectId }: ProjectManagerPageProps) {
  const { projects, currentProject, updateProject, deleteProject, duplicateProject, createProject } = useProjects()
  const { characters } = useTokenContext()
  const { addToast } = useToast()

  // Selected project for editing - initialize to current/active project if available
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Cache for pre-rendered script name tokens by project ID
  const scriptNameTokenCache = useRef<Map<string, Token>>(new Map())
  const hoverAbortControllers = useRef<Map<string, AbortController>>(new Map())

  // Initialize selectedProject to the active project on mount
  useEffect(() => {
    if (!hasInitialized && projects.length > 0) {
      if (initialProjectId) {
        const project = projects.find(p => p.id === initialProjectId)
        if (project) {
          setSelectedProject(project)
        }
      }
      setHasInitialized(true)
    }
  }, [projects, initialProjectId, hasInitialized])

  // Keep selectedProject in sync with the projects list (updates after saves)
  useEffect(() => {
    if (selectedProject) {
      const updatedProject = projects.find(p => p.id === selectedProject.id)
      if (updatedProject && updatedProject !== selectedProject) {
        setSelectedProject(updatedProject)
      } else if (!updatedProject) {
        // Project was deleted
        setSelectedProject(null)
      }
    }
  }, [projects, selectedProject])

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [projectToExport, setProjectToExport] = useState<Project | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [iconManagementModalOpen, setIconManagementModalOpen] = useState(false)

  // Handlers
  const handleSelectProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    setSelectedProject(project || null)
  }, [projects])

  // Pre-render script name token on hover
  const handleHoverProject = useCallback((projectId: string) => {
    // Skip if already in cache
    if (scriptNameTokenCache.current.has(projectId)) {
      return
    }

    // Skip if already generating for this project
    if (hoverAbortControllers.current.has(projectId)) {
      return
    }

    const project = projects.find(p => p.id === projectId)
    if (!project?.state?.scriptMeta?.name) {
      return
    }

    const abortController = new AbortController()
    hoverAbortControllers.current.set(projectId, abortController)

    // Generate script name token in background
    generateScriptNameTokenOnly(
      project.state.generationOptions,
      project.state.scriptMeta,
      abortController.signal
    ).then(token => {
      if (token) {
        scriptNameTokenCache.current.set(projectId, token)
      }
      hoverAbortControllers.current.delete(projectId)
    }).catch(err => {
      if (err?.name !== 'AbortError') {
        console.error('Failed to pre-render script name token:', err)
      }
      hoverAbortControllers.current.delete(projectId)
    })
  }, [projects])

  const handleCreateProject = useCallback(async () => {
    try {
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
      const newProject = await createProject(`New Project - ${timestamp}`)
      if (newProject) {
        setSelectedProject(newProject)
        addToast('New project created!', 'success')
      }
    } catch (err) {
      console.error('Failed to create project:', err)
      addToast('Failed to create project', 'error')
    }
  }, [createProject, addToast])

  const handleImportProject = useCallback(() => {
    setImportModalOpen(true)
  }, [])

  const handleIconManagement = useCallback(() => {
    if (!currentProject) {
      alert('Please create or activate a project first to manage custom icons')
      return
    }
    setIconManagementModalOpen(true)
  }, [currentProject])

  const handleExportProject = useCallback((project: Project) => {
    setProjectToExport(project)
    setExportModalOpen(true)
  }, [])

  const handleDeleteProject = useCallback((project: Project) => {
    setProjectToDelete(project)
    setDeleteModalOpen(true)
  }, [])

  const handleDuplicateProject = useCallback(async (project: Project) => {
    try {
      const newProject = await duplicateProject(project.id)
      if (newProject) {
        setSelectedProject(newProject)
      }
    } catch (err) {
      console.error('Failed to duplicate project:', err)
    }
  }, [duplicateProject])

  const handleUpdateIcons = useCallback(async (icons: CustomIconMetadata[]) => {
    if (!currentProject) return
    await updateProject(currentProject.id, {
      state: { ...currentProject.state, customIcons: icons },
    })
  }, [currentProject, updateProject])

  const handleImportSuccess = useCallback((projectId: string) => {
    setImportModalOpen(false)
    // Select the newly imported project
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
    }
  }, [projects])

  const handleDeleteSuccess = useCallback(() => {
    setDeleteModalOpen(false)
    // Clear selection if deleted project was selected
    if (selectedProject?.id === projectToDelete?.id) {
      setSelectedProject(null)
    }
    setProjectToDelete(null)
  }, [selectedProject, projectToDelete])

  return (
    <>
      {/* Main unified layout: Left sidebar + Right panel */}
      <div className={styles.unifiedView}>
        <ProjectNavigation
          projects={projects}
          selectedProjectId={selectedProject?.id || null}
          currentProjectId={currentProject?.id || null}
          onSelectProject={handleSelectProject}
          onHoverProject={handleHoverProject}
          onCreateProject={handleCreateProject}
          onImportProject={handleImportProject}
          onIconManagement={handleIconManagement}
          onDeleteProject={handleDeleteProject}
        />
        <ProjectEditor
          project={selectedProject}
          scriptNameTokenCache={scriptNameTokenCache.current}
          onExport={handleExportProject}
          onDelete={handleDeleteProject}
          onDuplicate={handleDuplicateProject}
        />
      </div>

      {/* Modals */}
      <DeleteProjectModal
        isOpen={deleteModalOpen}
        project={projectToDelete}
        onClose={() => {
          setDeleteModalOpen(false)
          setProjectToDelete(null)
        }}
        onSuccess={handleDeleteSuccess}
      />
      <ExportProjectModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false)
          setProjectToExport(null)
        }}
        project={projectToExport}
      />
      <ImportProjectModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportSuccess}
      />
      {currentProject && (
        <IconManagementModal
          isOpen={iconManagementModalOpen}
          onClose={() => setIconManagementModalOpen(false)}
          characters={characters}
          customIcons={currentProject.state.customIcons || []}
          onUpdateIcons={handleUpdateIcons}
        />
      )}
    </>
  )
}
