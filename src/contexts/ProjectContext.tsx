/**
 * Project Context
 *
 * Manages project state, including the current active project,
 * auto-save status, and project list.
 *
 * @module contexts/ProjectContext
 */

import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import type {
  Project,
  AutoSaveStatus,
} from '../ts/types/project.js';

// ============================================================================
// Context Type Definition
// ============================================================================

interface ProjectContextType {
  // Current project
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  // Project list (cached for quick access)
  projects: Project[];
  setProjects: (projects: Project[]) => void;

  // Auto-save status
  autoSaveStatus: AutoSaveStatus;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;

  // Dirty state (has unsaved changes)
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;

  // Last saved timestamp
  lastSavedAt: number | null;
  setLastSavedAt: (timestamp: number | null) => void;

  // Project operations (will be implemented in Phase 2-3)
  // These are placeholders for now
  createProject?: (name: string) => Promise<void>;
  loadProject?: (id: string) => Promise<void>;
  saveCurrentProject?: () => Promise<void>;
  deleteProject?: (id: string) => Promise<void>;
}

// ============================================================================
// Context Creation
// ============================================================================

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface ProjectProviderProps {
  children: ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

export function ProjectProvider({ children }: ProjectProviderProps) {
  // Current active project
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Cached project list
  const [projects, setProjects] = useState<Project[]>([]);

  // Auto-save status
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>({
    state: 'idle',
    isDirty: false,
  });

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);

  // Last saved timestamp
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Sync isDirty with autoSaveStatus when it changes
  const updateAutoSaveStatus = useCallback((status: AutoSaveStatus) => {
    setAutoSaveStatus(status);
    setIsDirty(status.isDirty);
  }, []);

  // Context value
  const value: ProjectContextType = {
    currentProject,
    setCurrentProject,
    projects,
    setProjects,
    autoSaveStatus,
    setAutoSaveStatus: updateAutoSaveStatus,
    isDirty,
    setIsDirty,
    lastSavedAt,
    setLastSavedAt,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access project context
 * Must be used within a ProjectProvider
 */
export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
