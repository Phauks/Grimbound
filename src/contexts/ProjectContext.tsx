/**
 * Project Context
 *
 * Manages project state, including the current active project,
 * auto-save status, and project list.
 *
 * @module contexts/ProjectContext
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useProjectCacheWarming } from '@/hooks/useProjectCacheWarming.js';
import type { AutoSaveStatus, Project } from '@/ts/types/project.js';

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

  // Change version (increments on every state change to trigger effects)
  changeVersion: number;
  incrementChangeVersion: () => void;

  // Last saved timestamp
  lastSavedAt: number | null;
  setLastSavedAt: (timestamp: number | null) => void;

  // Auto-save function (manual save)
  saveNow: (() => Promise<void>) | undefined;
  setSaveNow: ((fn: () => Promise<void>) => void) | undefined;

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

  // Change version - increments on every state change
  const [changeVersion, setChangeVersion] = useState(0);
  const incrementChangeVersion = useCallback(() => {
    setChangeVersion((v) => v + 1);
  }, []);

  // Last saved timestamp
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Auto-save function - use a ref-based setter to avoid function-in-state issues
  const saveNowRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const setSaveNowFn = useCallback((fn: () => Promise<void>) => {
    saveNowRef.current = fn;
  }, []);

  const saveNow = saveNowRef.current;

  // Sync isDirty with autoSaveStatus when it changes
  const updateAutoSaveStatus = useCallback((status: AutoSaveStatus) => {
    setAutoSaveStatus(status);
    setIsDirty(status.isDirty);
  }, []);

  // Restore lastSavedAt from project metadata when project loads
  // This ensures "Last saved" timestamp persists across page refreshes
  useEffect(() => {
    if (currentProject?.lastModifiedAt) {
      setLastSavedAt(currentProject.lastModifiedAt);
    } else {
      setLastSavedAt(null);
    }
  }, [currentProject?.lastModifiedAt]);

  // Warm caches when project changes
  useProjectCacheWarming(currentProject);

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
    changeVersion,
    incrementChangeVersion,
    lastSavedAt,
    setLastSavedAt,
    saveNow,
    setSaveNow: setSaveNowFn,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
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
