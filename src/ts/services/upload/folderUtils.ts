/**
 * Folder Utilities for Asset Management
 *
 * Provides helpers for working with folder-based asset organization.
 * Folders are stored as path strings (e.g., "Characters/Townsfolk").
 *
 * @module services/upload/folderUtils
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A node in the folder tree structure
 */
export interface FolderNode {
  /** Folder name (last segment of path) */
  name: string;
  /** Full path to this folder */
  path: string;
  /** Child folders */
  children: FolderNode[];
  /** Number of assets directly in this folder (not subfolders) */
  assetCount: number;
}

export interface FolderValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Base type for assets with a folder property
 */
interface AssetWithFolder {
  id: string;
  folder: string | null;
}

// ============================================================================
// Validation
// ============================================================================

/** Valid characters for folder names: alphanumeric, spaces, hyphens, underscores */
const VALID_FOLDER_CHARS = /^[a-zA-Z0-9\s\-_]+$/;

/**
 * Validate a folder path
 */
export function validateFolderPath(path: string): FolderValidationResult {
  if (!path || path.trim() === '') {
    return { valid: false, error: 'Folder path cannot be empty' };
  }

  if (path.startsWith('/')) {
    return { valid: false, error: 'Path cannot have leading slash' };
  }

  if (path.endsWith('/')) {
    return { valid: false, error: 'Path cannot have trailing slash' };
  }

  if (path.includes('//')) {
    return { valid: false, error: 'Path cannot have empty segments' };
  }

  const segments = path.split('/');
  for (const segment of segments) {
    if (segment.trim() === '') {
      return { valid: false, error: 'Path cannot have empty segments' };
    }
    if (!VALID_FOLDER_CHARS.test(segment)) {
      return {
        valid: false,
        error: `Invalid characters in folder name: "${segment}"`,
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get the parent folder path
 * @returns Parent path or null if at root level
 */
export function getParentFolder(path: string | null): string | null {
  if (!path) return null;
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return null;
  return path.substring(0, lastSlash);
}

/**
 * Get the folder name from a path (last segment)
 */
export function getFolderName(path: string | null): string {
  if (!path) return '';
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return path;
  return path.substring(lastSlash + 1);
}

/**
 * Get all unique folder paths from assets, sorted alphabetically
 */
export function getAllFolderPaths<T extends AssetWithFolder>(assets: T[]): string[] {
  const paths = new Set<string>();
  for (const asset of assets) {
    if (asset.folder) {
      paths.add(asset.folder);
    }
  }
  return [...paths].sort();
}

/**
 * Check if a path is a subfolder of another path
 */
export function isSubfolderOf(path: string, parentPath: string): boolean {
  return path.startsWith(parentPath + '/');
}

// ============================================================================
// Tree Building
// ============================================================================

/**
 * Build a folder tree from a list of assets
 */
export function deriveFolderTree<T extends AssetWithFolder>(assets: T[]): FolderNode[] {
  // Count assets per folder
  const folderCounts = new Map<string, number>();
  for (const asset of assets) {
    if (asset.folder) {
      folderCounts.set(asset.folder, (folderCounts.get(asset.folder) ?? 0) + 1);
    }
  }

  // Get all unique paths and ensure parent paths exist
  const allPaths = new Set<string>();
  for (const path of folderCounts.keys()) {
    // Add this path and all parent paths
    let current: string | null = path;
    while (current) {
      allPaths.add(current);
      const parent = getParentFolder(current);
      if (!parent) break;
      current = parent;
    }
  }

  // Build nodes map
  const nodes = new Map<string, FolderNode>();
  for (const path of allPaths) {
    nodes.set(path, {
      name: getFolderName(path),
      path,
      children: [],
      assetCount: folderCounts.get(path) ?? 0,
    });
  }

  // Build tree structure
  const roots: FolderNode[] = [];
  for (const [path, node] of nodes) {
    const parentPath = getParentFolder(path);
    if (parentPath && nodes.has(parentPath)) {
      nodes.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children alphabetically
  const sortChildren = (nodeList: FolderNode[]) => {
    nodeList.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodeList) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

// ============================================================================
// Asset Filtering
// ============================================================================

/**
 * Get assets in a specific folder
 * @param includeSubfolders - If true, include assets in subfolders
 */
export function getAssetsInFolder<T extends AssetWithFolder>(
  assets: T[],
  folder: string | null,
  includeSubfolders = false
): T[] {
  if (folder === null) {
    // Root folder - assets with no folder
    return assets.filter((a) => a.folder === null);
  }

  if (includeSubfolders) {
    return assets.filter(
      (a) => a.folder === folder || (a.folder && isSubfolderOf(a.folder, folder))
    );
  }

  return assets.filter((a) => a.folder === folder);
}

/**
 * Move assets to a new folder
 * @returns Updated assets (does not persist - caller must save)
 */
export function moveAssetsToFolder<T extends AssetWithFolder>(
  assets: T[],
  targetFolder: string | null
): T[] {
  return assets.map((asset) => ({
    ...asset,
    folder: targetFolder,
  }));
}

/**
 * Rename a folder and update all assets within it
 * @returns Updated assets (does not persist - caller must save)
 */
export function renameFolderInAssets<T extends AssetWithFolder>(
  assets: T[],
  oldPath: string,
  newPath: string
): T[] {
  return assets.map((asset) => {
    if (!asset.folder) return asset;

    if (asset.folder === oldPath) {
      return { ...asset, folder: newPath };
    }

    if (isSubfolderOf(asset.folder, oldPath)) {
      const newFolder = newPath + asset.folder.substring(oldPath.length);
      return { ...asset, folder: newFolder };
    }

    return asset;
  });
}
