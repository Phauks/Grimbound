/**
 * FolderSidebar Component
 *
 * Left sidebar for folder navigation and filtering in the Asset Manager.
 * Includes collapsible sections for folders, TYPE, TEAM, and TAGS filters.
 *
 * @module components/Shared/Assets/FolderSidebar
 */

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/components/shared/FolderSidebar.module.css';
import { USER_TYPE_TABS } from '@/ts/services/upload/constants.js';
import { getTypeLabel, type TypeTagValue } from '@/ts/services/upload/tagUtils.js';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Context Menu State
// ============================================================================

interface ContextMenuState {
  folder: string;
  x: number;
  y: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Team options for filtering */
const TEAM_OPTIONS = [
  { value: 'townsfolk', label: 'Townsfolk' },
  { value: 'outsider', label: 'Outsider' },
  { value: 'minion', label: 'Minion' },
  { value: 'demon', label: 'Demon' },
  { value: 'traveller', label: 'Traveller' },
  { value: 'fabled', label: 'Fabled' },
  { value: 'loric', label: 'Loric' },
] as const;

// ============================================================================
// Types
// ============================================================================

export interface FolderSidebarProps {
  /** Simple folder list (array of folder paths) */
  folders?: string[];
  /** Currently selected folder path (null = all) */
  selectedFolder: string | null;
  /** Called when folder selection changes */
  onSelectFolder: (folder: string | null) => void;
  /** Called when a new folder is created */
  onCreateFolder?: (folderName: string) => void;
  /** Called when a folder is renamed */
  onRenameFolder?: (oldName: string, newName: string) => void;
  /** Called when a folder is deleted */
  onDeleteFolder?: (folderName: string) => void;

  // Type filter
  /** Currently selected type filters */
  selectedTypes: Set<TypeTagValue>;
  /** Called when type filter changes */
  onTypeChange: (types: Set<TypeTagValue>) => void;

  // Team filter
  /** Currently selected team filters */
  selectedTeams: Set<string>;
  /** Called when team filter changes */
  onTeamChange: (teams: Set<string>) => void;

  // Tags filter
  /** Available user tags (non-system tags found in assets) */
  availableTags?: string[];
  /** Currently selected tag filters */
  selectedTags: Set<string>;
  /** Called when tag filter changes */
  onTagChange: (tags: Set<string>) => void;

  /** Whether operations are in progress */
  isProcessing?: boolean;
  /** Additional CSS class */
  className?: string;
}

type SectionId = 'folders' | 'type' | 'team' | 'tags';

// ============================================================================
// Component
// ============================================================================

export function FolderSidebar({
  folders = [],
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  selectedTypes,
  onTypeChange,
  selectedTeams,
  onTeamChange,
  availableTags = [],
  selectedTags,
  onTagChange,
  isProcessing = false,
  className,
}: FolderSidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionId>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when renaming
  useEffect(() => {
    if (renamingFolder && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFolder]);

  // Focus new folder input when creating
  useEffect(() => {
    if (isCreatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  // Close context menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  // Build hierarchical folder structure with depth info
  const hierarchicalFolders = (() => {
    // Get all unique folder paths (including parent paths)
    const allPaths = new Set<string>();
    for (const folder of folders) {
      // Add this folder and all parent paths
      const parts = folder.split('/');
      for (let i = 1; i <= parts.length; i++) {
        allPaths.add(parts.slice(0, i).join('/'));
      }
    }

    // Also include the currently selected folder and its parents
    // (handles case where navigating via grid to intermediate folder)
    if (selectedFolder) {
      const parts = selectedFolder.split('/');
      for (let i = 1; i <= parts.length; i++) {
        allPaths.add(parts.slice(0, i).join('/'));
      }
    }

    // Convert to sorted array with depth info
    return Array.from(allPaths)
      .sort()
      .map((path) => ({
        path,
        name: path.split('/').pop() || path,
        depth: path.split('/').length - 1,
      }));
  })();

  // Sort user tags alphabetically
  const sortedTags = [...availableTags].sort();

  // Toggle section collapse
  const toggleSection = (section: SectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Right-click context menu handler
  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>, folder: string) => {
    if (!(onRenameFolder || onDeleteFolder)) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ folder, x: e.clientX, y: e.clientY });
  };

  const handleStartRename = (folder: string) => {
    setContextMenu(null);
    setRenamingFolder(folder);
    // Only show the last segment for editing
    const parts = folder.split('/');
    setRenameValue(parts[parts.length - 1]);
  };

  const handleRenameSubmit = () => {
    const trimmedName = renameValue.trim();
    if (!(trimmedName && renamingFolder)) {
      setRenamingFolder(null);
      setRenameValue('');
      return;
    }

    // Construct new full path (keep parent path, replace last segment)
    const parts = renamingFolder.split('/');
    const oldName = parts[parts.length - 1];

    if (trimmedName !== oldName) {
      // Replace last segment with new name
      parts[parts.length - 1] = trimmedName;
      const newPath = parts.join('/');
      onRenameFolder?.(renamingFolder, newPath);
    }
    setRenamingFolder(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setRenamingFolder(null);
      setRenameValue('');
    }
  };

  const handleDeleteFolder = (folder: string) => {
    setContextMenu(null);
    onDeleteFolder?.(folder);
  };

  // New folder handlers
  const handleCreateFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingFolder(true);
  };

  const handleNewFolderSubmit = () => {
    const trimmedName = newFolderName.trim();
    if (trimmedName && onCreateFolder) {
      onCreateFolder(trimmedName);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleNewFolderKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNewFolderSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  // Handle type filter toggle (now multi-select)
  const handleTypeToggle = (type: TypeTagValue) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    onTypeChange(newTypes);
  };

  // Clear handlers for each section
  const handleClearTypes = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTypeChange(new Set());
  };

  const handleClearTeams = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTeamChange(new Set());
  };

  const handleClearTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTagChange(new Set());
  };

  // Handle team filter toggle
  const handleTeamToggle = (team: string) => {
    const newTeams = new Set(selectedTeams);
    if (newTeams.has(team)) {
      newTeams.delete(team);
    } else {
      newTeams.add(team);
    }
    onTeamChange(newTeams);
  };

  // Handle tag filter toggle
  const handleTagToggle = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    onTagChange(newTags);
  };

  const isCollapsed = (section: SectionId) => collapsedSections.has(section);

  return (
    <aside
      className={cn(styles.sidebar, isProcessing && styles.processing, className)}
      aria-label="Folder and filter navigation"
    >
      {/* Scrollable content area */}
      <div className={styles.scrollArea}>
        {/* Folders Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('folders')}
              aria-expanded={!isCollapsed('folders')}
            >
              <span className={styles.sectionToggle}>{isCollapsed('folders') ? '▸' : '▾'}</span>
              <span className={styles.sectionTitle}>Folders</span>
            </button>
            {onCreateFolder && !isCollapsed('folders') && (
              <button
                type="button"
                className={styles.addFolderBtn}
                onClick={handleCreateFolderClick}
                title="Create folder"
                aria-label="Create new folder"
              >
                +
              </button>
            )}
          </div>
          {!isCollapsed('folders') && (
            <div className={styles.folderList} role="tree" aria-label="Folders">
              {/* Root */}
              <button
                type="button"
                className={cn(
                  styles.folderItem,
                  styles.rootFolder,
                  selectedFolder === null && styles.selected
                )}
                onClick={() => onSelectFolder(null)}
                aria-pressed={selectedFolder === null}
              >
                <span className={styles.folderIcon}>🏠</span>
                <span className={styles.folderName}>Root</span>
              </button>

              {/* New Folder Input */}
              {isCreatingFolder && (
                <div className={styles.newFolderRow}>
                  <span className={styles.folderIcon}>📁</span>
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    className={styles.newFolderInput}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={handleNewFolderKeyDown}
                    onBlur={handleNewFolderSubmit}
                    placeholder="Folder name..."
                    maxLength={50}
                  />
                </div>
              )}

              {/* Custom Folders with hierarchy */}
              {hierarchicalFolders.map(({ path, name, depth }) => (
                <div key={path} className={styles.folderRow}>
                  {renamingFolder === path ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      className={styles.renameInput}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleRenameSubmit}
                      maxLength={50}
                      style={{ marginLeft: `${depth * 12}px` }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={cn(styles.folderItem, selectedFolder === path && styles.selected)}
                      onClick={() => onSelectFolder(path)}
                      onContextMenu={(e) => handleContextMenu(e, path)}
                      aria-pressed={selectedFolder === path}
                      style={{ paddingLeft: `${8 + depth * 12}px` }}
                    >
                      <span className={styles.folderIcon}>{depth > 0 ? '📂' : '📁'}</span>
                      <span className={styles.folderName}>{name}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Type Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('type')}
              aria-expanded={!isCollapsed('type')}
            >
              <span className={styles.sectionToggle}>{isCollapsed('type') ? '▸' : '▾'}</span>
              <span className={styles.sectionTitle}>Type</span>
              {selectedTypes.size > 0 && (
                <span className={styles.activeCount}>{selectedTypes.size}</span>
              )}
            </button>
            {selectedTypes.size > 0 && !isCollapsed('type') && (
              <button
                type="button"
                className={styles.clearSectionBtn}
                onClick={handleClearTypes}
                title="Clear type filters"
              >
                Clear
              </button>
            )}
          </div>
          {!isCollapsed('type') && (
            <div className={styles.filterList}>
              {USER_TYPE_TABS.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn(styles.filterItem, selectedTypes.has(type) && styles.selected)}
                  onClick={() => handleTypeToggle(type)}
                  aria-pressed={selectedTypes.has(type)}
                >
                  <span className={styles.filterLabel}>{getTypeLabel(type)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('team')}
              aria-expanded={!isCollapsed('team')}
            >
              <span className={styles.sectionToggle}>{isCollapsed('team') ? '▸' : '▾'}</span>
              <span className={styles.sectionTitle}>Team</span>
              {selectedTeams.size > 0 && (
                <span className={styles.activeCount}>{selectedTeams.size}</span>
              )}
            </button>
            {selectedTeams.size > 0 && !isCollapsed('team') && (
              <button
                type="button"
                className={styles.clearSectionBtn}
                onClick={handleClearTeams}
                title="Clear team filters"
              >
                Clear
              </button>
            )}
          </div>
          {!isCollapsed('team') && (
            <div className={styles.filterList}>
              {TEAM_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(styles.filterItem, selectedTeams.has(value) && styles.selected)}
                  onClick={() => handleTeamToggle(value)}
                  aria-pressed={selectedTeams.has(value)}
                >
                  <span className={styles.filterLabel}>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <button
              type="button"
              className={styles.sectionHeader}
              onClick={() => toggleSection('tags')}
              aria-expanded={!isCollapsed('tags')}
            >
              <span className={styles.sectionToggle}>{isCollapsed('tags') ? '▸' : '▾'}</span>
              <span className={styles.sectionTitle}>Tags</span>
              {selectedTags.size > 0 && (
                <span className={styles.activeCount}>{selectedTags.size}</span>
              )}
            </button>
            {selectedTags.size > 0 && !isCollapsed('tags') && (
              <button
                type="button"
                className={styles.clearSectionBtn}
                onClick={handleClearTags}
                title="Clear tag filters"
              >
                Clear
              </button>
            )}
          </div>
          {!isCollapsed('tags') && (
            <div className={styles.filterList}>
              {/* User tags */}
              {sortedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={cn(styles.filterItem, selectedTags.has(tag) && styles.selected)}
                  onClick={() => handleTagToggle(tag)}
                  aria-pressed={selectedTags.has(tag)}
                >
                  <span className={styles.filterLabel}>{tag}</span>
                </button>
              ))}

              {/* Empty state for user tags */}
              {sortedTags.length === 0 && (
                <div className={styles.emptyState}>
                  <span className={styles.emptyText}>No tags yet</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu Portal */}
      {contextMenu &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.contextMenu}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {onRenameFolder && (
              <button
                type="button"
                className={styles.contextMenuItem}
                onClick={() => handleStartRename(contextMenu.folder)}
              >
                Rename
              </button>
            )}
            {onDeleteFolder && (
              <button
                type="button"
                className={cn(styles.contextMenuItem, styles.danger)}
                onClick={() => handleDeleteFolder(contextMenu.folder)}
              >
                Delete
              </button>
            )}
          </div>,
          document.body
        )}
    </aside>
  );
}
