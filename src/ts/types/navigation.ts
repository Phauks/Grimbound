/**
 * Navigation Types
 *
 * Type definitions for page-based navigation system.
 * Supports three main application pages (Projects, Editor, Town Square)
 * and editor-specific sub-tabs.
 */

/**
 * Top-level application pages
 */
export type AppPage = 'projects' | 'editor' | 'townSquare';

/**
 * Editor sub-tabs (only visible when on Editor page)
 */
export type EditorTab = 'json' | 'tokens' | 'characters' | 'script' | 'studio' | 'export';

/**
 * Page metadata for navigation display
 */
export interface PageInfo {
  /** Unique page identifier */
  id: AppPage;
  /** Display label for the page */
  label: string;
  /** Emoji icon for visual identification */
  icon: string;
  /** Short description of the page purpose */
  description: string;
}

/**
 * Editor tab metadata
 */
export interface EditorTabInfo {
  /** Unique tab identifier */
  id: EditorTab;
  /** Display label for the tab */
  label: string;
}

/**
 * Navigation state for persistence
 */
export interface NavigationState {
  /** Currently active page */
  activePage: AppPage;
  /** Currently active editor tab (when on Editor page) */
  activeEditorTab: EditorTab;
}
