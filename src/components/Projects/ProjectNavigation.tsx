/**
 * Project Navigation Component
 *
 * Left sidebar for project browsing and selection.
 * Follows CharacterNavigation pattern with search, sort, and action buttons.
 */

import { useState, useEffect, useRef } from 'react'
import type { Project } from '../../ts/types/project.js'
import { useContextMenu } from '../../hooks/useContextMenu'
import styles from '../../styles/components/projects/ProjectNavigation.module.css'
import contextMenuStyles from '../../styles/components/shared/ContextMenu.module.css'

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
  const [showArchived, setShowArchived] = useState(false)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Context menu for project actions
  const contextMenu = useContextMenu<Project>()

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
    const { stats } = project

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
        {isActive && <div className={styles.activeIndicator} />}
        <div className={styles.info}>
          <div className={styles.name}>{project.name}</div>
          <div className={styles.meta}>
            {stats.characterCount} chars • {formatRelativeTime(project.lastModifiedAt)}
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
    <aside className={styles.nav}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h3>MY PROJECTS</h3>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onCreateProject}
            title="Create New Project"
          >
            + Create
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onImportProject}
            title="Import Project"
          >
            Import
          </button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className={styles.controls}>
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

      {/* Projects List */}
      <div className={styles.list}>
        {filteredProjects.length === 0 && !searchQuery && (
          <div className={styles.emptyState}>
            <p>No projects yet</p>
            <button onClick={onCreateProject} className={styles.emptyStateBtn}>
              Create First Project
            </button>
          </div>
        )}

        {filteredProjects.length === 0 && searchQuery && (
          <div className={styles.emptyState}>
            <p>No projects found matching "{searchQuery}"</p>
          </div>
        )}

        {filteredProjects.map((project) => renderProjectItem(project))}
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
    </aside>
  )
}
