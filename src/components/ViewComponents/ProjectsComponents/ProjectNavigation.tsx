/**
 * Project Navigation Component
 *
 * Left sidebar content for project browsing and selection.
 * Renders as content inside ViewLayout.Panel (no wrapper element).
 */

import { useState, useEffect, useRef } from 'react'
import type { Project, ProjectVersion } from '../../../ts/types/project.js'
import { projectDb } from '../../../ts/db/projectDb'
import { useContextMenu } from '../../../hooks/useContextMenu'
import { Button } from '../../Shared/UI/Button'
import styles from '../../../styles/components/projects/ProjectNavigation.module.css'
import layoutStyles from '../../../styles/components/layout/ViewLayout.module.css'
import contextMenuStyles from '../../../styles/components/shared/ContextMenu.module.css'

interface ProjectNavigationProps {
  projects: Project[]
  selectedProjectId: string | null
  currentProjectId: string | null
  onSelectProject: (projectId: string) => void
  onHoverProject?: (projectId: string) => void
  onCreateProject: () => void
  onImportProject: () => void
  onIconManagement: () => void
  onDeleteProject?: (project: Project) => void
}

export function ProjectNavigation({
  projects,
  selectedProjectId,
  currentProjectId,
  onSelectProject,
  onHoverProject,
  onCreateProject,
  onImportProject,
  onIconManagement,
  onDeleteProject
}: ProjectNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent')
  const selectedRef = useRef<HTMLDivElement>(null)

  // Latest version for each project
  const [latestVersions, setLatestVersions] = useState<Map<string, ProjectVersion>>(new Map())

  // Context menu for project actions
  const contextMenu = useContextMenu<Project>()

  // Load latest versions for all projects
  useEffect(() => {
    const loadLatestVersions = async () => {
      const versionMap = new Map<string, ProjectVersion>()

      for (const project of projects) {
        try {
          const latestVersion = await projectDb.getLatestProjectVersion(project.id)
          if (latestVersion) {
            versionMap.set(project.id, latestVersion)
          }
        } catch (error) {
          // Silently skip errors - version badges are optional
          console.debug(`Failed to load version for project ${project.id}:`, error)
        }
      }

      setLatestVersions(versionMap)
    }

    if (projects.length > 0) {
      loadLatestVersions()
    }
  }, [projects])

  // Scroll to selected project
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedProjectId])

  // Filter and sort projects
  const filteredProjects = projects
    .filter((project) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name)
      } else {
        // Sort by most recent (lastModifiedAt descending)
        return b.lastModifiedAt - a.lastModifiedAt
      }
    })

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)

    if (months > 0) return `${months}mo ago`
    if (weeks > 0) return `${weeks}w ago`
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  const renderProjectItem = (project: Project) => {
    const isSelected = project.id === selectedProjectId
    const isActive = project.id === currentProjectId
    const latestVersion = latestVersions.get(project.id)

    return (
      <div
        key={project.id}
        ref={isSelected ? selectedRef : null}
        className={`${styles.item} ${isSelected ? styles.selected : ''} ${isActive ? styles.active : ''}`}
        onClick={() => onSelectProject(project.id)}
        onMouseEnter={() => onHoverProject?.(project.id)}
        onContextMenu={(e) => contextMenu.onContextMenu(e, project)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onSelectProject(project.id)
          }
        }}
      >
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <div className={styles.name}>{project.name}</div>
            {latestVersion && (
              <span className={styles.versionBadge} title={`Latest version: ${latestVersion.versionNumber}`}>
                v{latestVersion.versionNumber}
              </span>
            )}
          </div>
          <div className={styles.meta}>
            {project.stats.characterCount} chars • {formatRelativeTime(project.lastModifiedAt)}
          </div>
        </div>
      </div>
    )
  }

  const handleDeleteFromContextMenu = () => {
    if (contextMenu.data && onDeleteProject) {
      onDeleteProject(contextMenu.data)
    }
    contextMenu.close()
  }

  return (
    <div className={layoutStyles.panelContent}>
      {/* Header with Actions */}
      <details className={layoutStyles.sidebarCard} open>
        <summary className={layoutStyles.sectionHeader}>My Projects</summary>
        <div className={layoutStyles.optionSection}>
          <div className={styles.actionButtons}>
            <Button
              variant="secondary"
              size="small"
              onClick={onCreateProject}
              title="Create New Project"
            >
              + Create
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={onImportProject}
              title="Import Project"
            >
              Import
            </Button>
          </div>
        </div>
      </details>

      {/* Search and Sort */}
      <details className={layoutStyles.sidebarCard} open>
        <summary className={layoutStyles.sectionHeader}>Filter</summary>
        <div className={layoutStyles.optionSection}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className={styles.searchInput}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
            className={styles.sortSelect}
          >
            <option value="recent">Most Recent</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </details>

      {/* Projects List */}
      <div className={styles.listContainer}>
        <div className={`${styles.list} ${layoutStyles.hiddenScrollbar}`}>
          {filteredProjects.length === 0 && !searchQuery && (
            <div className={styles.emptyState}>
              <p>No projects yet</p>
              <Button variant="primary" size="small" onClick={onCreateProject}>
                Create First Project
              </Button>
            </div>
          )}

          {filteredProjects.length === 0 && searchQuery && (
            <div className={styles.emptyState}>
              <p>No projects found matching "{searchQuery}"</p>
            </div>
          )}

          {filteredProjects.map((project) => renderProjectItem(project))}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.position && (
        <div
          ref={contextMenu.menuRef}
          className={contextMenuStyles.contextMenu}
          style={{
            left: contextMenu.position.x,
            top: contextMenu.position.y,
          }}
        >
          <button
            type="button"
            className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.danger}`}
            onClick={handleDeleteFromContextMenu}
            disabled={contextMenu.data?.id === currentProjectId}
            title={contextMenu.data?.id === currentProjectId ? 'Cannot delete active project' : undefined}
          >
            Delete Project
          </button>
        </div>
      )}
    </div>
  )
}
