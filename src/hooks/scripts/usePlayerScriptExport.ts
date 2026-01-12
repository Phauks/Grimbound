/**
 * usePlayerScriptExport Hook
 *
 * Orchestrates player script PDF export with progress tracking and abort handling.
 * Integrates with ScriptPdfContext for settings and DownloadsContext for registration.
 */

import { useCallback, useRef, useState } from 'react';
import { useScriptPdf } from '@/contexts/ScriptPdfContext';
import {
  downloadPlayerScriptPdf,
  type ExportPhase,
  type PlayerScriptExportData,
} from '@/ts/scriptPdf/playerScript/playerScriptPdfExporter.js';
import type {
  NightOrderIcon,
  PlayerScriptCharacter,
  PlayerScriptJinx,
} from '@/ts/scriptPdf/types.js';
import type { ScriptMeta } from '@/ts/types/index.js';
import { sanitizeFilename } from '@/ts/utils/stringUtils.js';

// ============================================================================
// Types
// ============================================================================

export interface UsePlayerScriptExportOptions {
  /** Script metadata */
  scriptMeta: ScriptMeta | null;
  /** Main characters (townsfolk, outsiders, minions, demons) */
  characters: PlayerScriptCharacter[];
  /** Fabled characters */
  fabled: PlayerScriptCharacter[];
  /** Active jinxes */
  jinxes: PlayerScriptJinx[];
  /** First night order icons */
  firstNight: NightOrderIcon[];
  /** Other nights order icons */
  otherNight: NightOrderIcon[];
}

export interface ExportProgress {
  /** Current phase */
  phase: ExportPhase | 'idle' | 'complete' | 'error';
  /** Progress percentage (0-100) */
  percent: number;
  /** Phase label for display */
  label: string;
}

export interface UsePlayerScriptExportResult {
  /** Whether export is in progress */
  isExporting: boolean;
  /** Current export progress */
  progress: ExportProgress;
  /** Error if export failed */
  error: Error | null;
  /** Start export */
  exportPdf: () => Promise<void>;
  /** Cancel ongoing export */
  cancel: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const PHASE_LABELS: Record<ExportPhase | 'idle' | 'complete' | 'error', string> = {
  idle: 'Ready',
  initializing: 'Initializing...',
  'loading-fonts': 'Loading fonts...',
  'rendering-front': 'Rendering front page...',
  'rendering-back': 'Rendering backing sheet...',
  saving: 'Saving PDF...',
  complete: 'Complete',
  error: 'Failed',
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePlayerScriptExport(
  options: UsePlayerScriptExportOptions
): UsePlayerScriptExportResult {
  const { scriptMeta, characters, fabled, jinxes, firstNight, otherNight } = options;

  const { settings } = useScriptPdf();
  const ps = settings.playerScript;
  const bs = settings.backingSheet;

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    phase: 'idle',
    percent: 0,
    label: PHASE_LABELS.idle,
  });
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref to store current options data - avoids array/object deps in exportPdf callback
  // This makes exportPdf stable and prevents infinite loops when used in useEffect deps
  const optionsRef = useRef({
    scriptMeta,
    characters,
    fabled,
    jinxes,
    firstNight,
    otherNight,
    ps,
    bs,
  });
  // Update ref on every render with current values
  optionsRef.current = {
    scriptMeta,
    characters,
    fabled,
    jinxes,
    firstNight,
    otherNight,
    ps,
    bs,
  };

  /**
   * Handle progress updates
   * useCallback required: used as dependency in exportPdf
   */
  const handleProgress = useCallback((phase: ExportPhase, current: number, total: number) => {
    const percent = Math.round((current / total) * 100);
    setProgress({
      phase,
      percent,
      label: PHASE_LABELS[phase],
    });
  }, []);

  /**
   * Export the player script PDF
   * useCallback required: used as useEffect dependency in NightOrderView
   * Uses optionsRef to read current values, avoiding array/object deps that would
   * cause the callback to change on every render
   */
  const exportPdf = useCallback(async () => {
    if (isExporting) return;

    // Read current values from ref (avoids stale closure issues while keeping callback stable)
    const opts = optionsRef.current;

    // Reset state
    setIsExporting(true);
    setError(null);
    setProgress({
      phase: 'initializing',
      percent: 0,
      label: PHASE_LABELS.initializing,
    });

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Build export data from ref values
      const data: PlayerScriptExportData = {
        scriptMeta: opts.scriptMeta,
        characters: opts.characters,
        fabled: opts.fabled,
        jinxes: opts.jinxes,
        firstNight: opts.firstNight,
        otherNight: opts.otherNight,
        settings: opts.ps,
        backingSettings: opts.bs,
      };

      // Generate filename
      const scriptName = opts.scriptMeta?.name || 'Untitled Script';
      const filename = `${sanitizeFilename(scriptName)} - Player Script.pdf`;

      // Export
      await downloadPlayerScriptPdf(data, filename, {
        includeBackingSheet: opts.bs.enabled,
        onProgress: handleProgress,
        signal: abortControllerRef.current.signal,
      });

      setProgress({
        phase: 'complete',
        percent: 100,
        label: PHASE_LABELS.complete,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Export was cancelled
        setProgress({
          phase: 'idle',
          percent: 0,
          label: PHASE_LABELS.idle,
        });
      } else {
        const exportError = err instanceof Error ? err : new Error(String(err));
        setError(exportError);
        setProgress({
          phase: 'error',
          percent: 0,
          label: PHASE_LABELS.error,
        });
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  }, [isExporting, handleProgress]); // Only primitive + stable callback deps

  /**
   * Cancel ongoing export
   * useCallback required: exposed in hook return value
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isExporting,
    progress,
    error,
    exportPdf,
    cancel,
  };
}
