/**
 * Version Compare View Component
 *
 * Displays a data-focused comparison between the current project state
 * and a selected previous version. Shows side-by-side comparisons with
 * visual diff indicators for added (+), removed (-), and modified (≈) items.
 */

import { useMemo } from 'react';
import styles from '../../../styles/components/projects/VersionCompareView.module.css';
import { TEAM_COLORS, TEAM_LABELS } from '../../../ts/config.js';
import type { Character, Team } from '../../../ts/types/index';
import type { ProjectState, ProjectVersion } from '../../../ts/types/project';
import { calculateProjectDiff, getDiffSummary } from '../../../ts/utils/projectDiff';

interface VersionCompareViewProps {
  /** Current project state */
  currentState: ProjectState;
  /** Selected version to compare against */
  compareVersion: ProjectVersion;
  /** Handler to exit compare mode */
  onExitCompare: () => void;
  /** Handler to restore the selected version */
  onRestore: (version: ProjectVersion) => void;
  /** Whether restore is in progress */
  isRestoring?: boolean;
}

/**
 * Format relative time from a timestamp
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function VersionCompareView({
  currentState,
  compareVersion,
  onExitCompare,
  onRestore,
  isRestoring = false,
}: VersionCompareViewProps) {
  // Calculate the diff between current and version states
  const diff = useMemo(() => {
    return calculateProjectDiff(compareVersion.stateSnapshot, currentState);
  }, [currentState, compareVersion.stateSnapshot]);

  const summary = useMemo(() => getDiffSummary(diff), [diff]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3 className={styles.title}>
            Comparing: <span className={styles.current}>Current</span>
            <span className={styles.arrow}>↔</span>
            <span className={styles.version}>v{compareVersion.versionNumber}</span>
            <span className={styles.versionTime}>
              {formatRelativeTime(compareVersion.createdAt)}
            </span>
          </h3>
          <p className={styles.summary}>{summary}</p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.exitButton} onClick={onExitCompare}>
            ✕ Exit Compare
          </button>
          <button
            className={styles.restoreButton}
            onClick={() => onRestore(compareVersion)}
            disabled={isRestoring}
          >
            {isRestoring ? '↻ Restoring...' : '↩️ Restore This Version'}
          </button>
        </div>
      </div>

      {/* No Changes State */}
      {!diff.hasChanges && (
        <div className={styles.noChanges}>
          <div className={styles.noChangesIcon}>✓</div>
          <p>No differences found. The current state matches this version.</p>
        </div>
      )}

      {/* Diff Content */}
      {diff.hasChanges && (
        <div className={styles.diffContent}>
          {/* Script Meta Section */}
          {diff.scriptMeta.changed && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Script Metadata</h4>
              <div className={styles.metaGrid}>
                {diff.scriptMeta.fields.name && (
                  <MetaChange
                    label="Script Name"
                    oldValue={diff.scriptMeta.fields.name.old}
                    newValue={diff.scriptMeta.fields.name.new}
                  />
                )}
                {diff.scriptMeta.fields.author && (
                  <MetaChange
                    label="Author"
                    oldValue={diff.scriptMeta.fields.author.old}
                    newValue={diff.scriptMeta.fields.author.new}
                  />
                )}
                {diff.scriptMeta.fields.logo && (
                  <MetaChange
                    label="Logo URL"
                    oldValue={diff.scriptMeta.fields.logo.old ? '(set)' : '(none)'}
                    newValue={diff.scriptMeta.fields.logo.new ? '(set)' : '(none)'}
                  />
                )}
              </div>
            </div>
          )}

          {/* Characters Section */}
          {(diff.characters.added.length > 0 ||
            diff.characters.removed.length > 0 ||
            diff.characters.modified.length > 0) && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Characters
                <span className={styles.countBadge}>
                  {diff.characters.added.length +
                    diff.characters.removed.length +
                    diff.characters.modified.length}{' '}
                  changes
                </span>
              </h4>

              {/* Side-by-side columns */}
              <div className={styles.columnsContainer}>
                <div className={styles.column}>
                  <div className={styles.columnHeader}>
                    <span>Current ({currentState.characters.length})</span>
                  </div>
                  <div className={styles.columnContent}>
                    {/* Added characters (in current, not in version) */}
                    {diff.characters.added.map((char) => (
                      <CharacterRow key={`added-${char.id}`} character={char} status="added" />
                    ))}

                    {/* Modified characters (show current version) */}
                    {diff.characters.modified.map(({ character, changes }) => (
                      <CharacterRow
                        key={`modified-${character.id}`}
                        character={character}
                        status="modified"
                        changedFields={changes}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.column}>
                  <div className={styles.columnHeader}>
                    <span>
                      v{compareVersion.versionNumber} (
                      {compareVersion.stateSnapshot.characters.length})
                    </span>
                  </div>
                  <div className={styles.columnContent}>
                    {/* Removed characters (in version, not in current) */}
                    {diff.characters.removed.map((char) => (
                      <CharacterRow key={`removed-${char.id}`} character={char} status="removed" />
                    ))}

                    {/* Modified characters (show version's version) */}
                    {diff.characters.modified.map(({ character }) => {
                      const versionChar = compareVersion.stateSnapshot.characters.find(
                        (c) => c.id === character.id
                      );
                      return versionChar ? (
                        <CharacterRow
                          key={`modified-old-${versionChar.id}`}
                          character={versionChar}
                          status="modified"
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generation Options Section */}
          {diff.generationOptions.changed && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Generation Options</h4>
              <div className={styles.optionsList}>
                {diff.generationOptions.fields.map((field) => (
                  <div key={field} className={styles.optionChange}>
                    <span className={styles.modifiedIndicator}>≈</span>
                    <span className={styles.optionName}>{formatOptionName(field)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Icons Section */}
          {diff.customIcons.changed && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Custom Icons</h4>
              <div className={styles.iconsSummary}>
                {diff.customIcons.added > 0 && (
                  <span className={styles.addedText}>+{diff.customIcons.added} added</span>
                )}
                {diff.customIcons.removed > 0 && (
                  <span className={styles.removedText}>-{diff.customIcons.removed} removed</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

interface MetaChangeProps {
  label: string;
  oldValue: string | undefined;
  newValue: string | undefined;
}

function MetaChange({ label, oldValue, newValue }: MetaChangeProps) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}:</span>
      <div className={styles.metaValues}>
        <span className={styles.oldValue}>{oldValue || '(empty)'}</span>
        <span className={styles.changeArrow}>→</span>
        <span className={styles.newValue}>{newValue || '(empty)'}</span>
      </div>
    </div>
  );
}

interface CharacterRowProps {
  character: Character;
  status: 'added' | 'removed' | 'modified';
  changedFields?: string[];
}

function CharacterRow({ character, status, changedFields }: CharacterRowProps) {
  const statusClass = {
    added: styles.statusAdded,
    removed: styles.statusRemoved,
    modified: styles.statusModified,
  }[status];

  const statusIcon = {
    added: '+',
    removed: '-',
    modified: '≈',
  }[status];

  const team = character.team as Team;

  return (
    <div className={`${styles.characterRow} ${statusClass}`}>
      <span className={styles.statusIndicator}>{statusIcon}</span>
      <div
        className={styles.teamIndicator}
        style={{ backgroundColor: TEAM_COLORS[team] || '#808080' }}
        title={TEAM_LABELS[team] || team}
      />
      <span className={styles.characterName}>{character.name}</span>
      {changedFields && changedFields.length > 0 && (
        <span className={styles.changedFields}>({changedFields.join(', ')})</span>
      )}
    </div>
  );
}

// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Format a camelCase option name to readable text
 */
function formatOptionName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
