/**
 * useScriptPdfDrawer Hook
 *
 * Manages drawer state for script PDF settings with live updates.
 * Changes are applied immediately to the preview, with reset capability
 * to revert to settings from when the drawer was opened.
 */

import { useRef, useState } from 'react';
import { useScriptPdf } from '@/contexts/ScriptPdfContext';
import type { DeepPartial, ScriptPdfSettings } from '@/ts/scriptPdf/types.js';

// ============================================================================
// TYPES
// ============================================================================

export type ScriptPdfDrawerTab = 'playerScript' | 'nightOrder' | 'backingSheet';

export interface UseScriptPdfDrawerResult {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Currently active tab */
  activeTab: ScriptPdfDrawerTab;
  /** Current settings (live updates) */
  pendingSettings: ScriptPdfSettings;
  /** Whether settings differ from when drawer was opened */
  hasChanges: boolean;

  /** Open the drawer, optionally to a specific tab */
  open: (tab?: ScriptPdfDrawerTab) => void;
  /** Close the drawer */
  close: () => void;
  /** Set the active tab */
  setActiveTab: (tab: ScriptPdfDrawerTab) => void;
  /** Update settings with deep merge (live updates) */
  updatePending: (updates: DeepPartial<ScriptPdfSettings>) => void;
  /** Close the drawer (settings already applied) */
  apply: () => void;
  /** Reset to settings from when drawer was opened */
  reset: () => void;
  /** Reset to defaults */
  resetToDefaults: () => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Deep equality check for detecting changes
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!(key in bObj)) return false;
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }

    return true;
  }

  return false;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useScriptPdfDrawer(): UseScriptPdfDrawerResult {
  const { settings, updateSettings, resetSettings } = useScriptPdf();

  // Drawer state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ScriptPdfDrawerTab>('playerScript');

  // Store settings snapshot from when drawer was opened (for reset)
  const initialSettingsRef = useRef<ScriptPdfSettings>(settings);

  // Check if current settings differ from when drawer was opened
  const hasChanges = !deepEqual(settings, initialSettingsRef.current);

  /**
   * Open the drawer
   */
  const open = (tab?: ScriptPdfDrawerTab) => {
    // Snapshot current settings for reset capability
    initialSettingsRef.current = JSON.parse(JSON.stringify(settings));
    if (tab) {
      setActiveTab(tab);
    }
    setIsOpen(true);
  };

  /**
   * Close the drawer (keeps changes - they're already applied)
   */
  const close = () => {
    setIsOpen(false);
  };

  /**
   * Update settings with deep merge - applies immediately (live updates)
   */
  const updatePending = (updates: DeepPartial<ScriptPdfSettings>) => {
    updateSettings(updates);
  };

  /**
   * Apply = just close (settings already applied via live updates)
   */
  const apply = () => {
    setIsOpen(false);
  };

  /**
   * Reset to settings from when drawer was opened
   */
  const reset = () => {
    updateSettings(initialSettingsRef.current);
  };

  /**
   * Reset to defaults
   */
  const resetToDefaults = () => {
    resetSettings();
    initialSettingsRef.current = settings;
  };

  return {
    isOpen,
    activeTab,
    pendingSettings: settings, // Now just returns context settings directly
    hasChanges,
    open,
    close,
    setActiveTab,
    updatePending,
    apply,
    reset,
    resetToDefaults,
  };
}
