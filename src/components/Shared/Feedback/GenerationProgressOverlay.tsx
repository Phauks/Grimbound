/**
 * GenerationProgressOverlay - Unified progress indicator for token generation
 *
 * Shows a centered overlay with:
 * - Overall progress bar
 * - Breakdown by token type (character, reminder, meta)
 * - Current generation phase
 */

import styles from '@/styles/components/shared/GenerationProgressOverlay.module.css';
import type { GenerationProgress } from '@/ts/types/index.js';

interface GenerationProgressOverlayProps {
  progress: GenerationProgress;
}

/**
 * Get the display label for the current generation phase
 */
function getPhaseLabel(phase: GenerationProgress['phase']): string {
  switch (phase) {
    case 'meta':
      return 'Generating meta tokens...';
    case 'character':
      return 'Generating character tokens...';
    case 'reminder':
      return 'Generating reminder tokens...';
    case 'complete':
      return 'Generation complete!';
    default:
      return 'Generating tokens...';
  }
}

/**
 * Calculate percentage, handling divide by zero
 */
function getPercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

export function GenerationProgressOverlay({ progress }: GenerationProgressOverlayProps) {
  const { phase, character, reminder, meta, overall } = progress;
  const percentage = getPercentage(overall.current, overall.total);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {/* Spinner */}
        <div className={styles.spinner} />

        {/* Phase label */}
        <div className={styles.phaseLabel}>{getPhaseLabel(phase)}</div>

        {/* Progress bar */}
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBarFill} style={{ width: `${percentage}%` }} />
        </div>

        {/* Overall count */}
        <div className={styles.overallCount}>
          {overall.current} / {overall.total} tokens
        </div>

        {/* Token type breakdown */}
        <div className={styles.breakdown}>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Character</span>
            <span className={styles.breakdownCount}>
              {character.current}/{character.total}
            </span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Reminder</span>
            <span className={styles.breakdownCount}>
              {reminder.current}/{reminder.total}
            </span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Meta</span>
            <span className={styles.breakdownCount}>
              {meta.current}/{meta.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
