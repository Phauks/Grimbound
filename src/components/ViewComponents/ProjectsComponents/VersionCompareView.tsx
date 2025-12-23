/**
 * Version Compare View Component
 *
 * Displays a data-focused comparison between the current project state
 * and a selected previous version. Shows side-by-side comparisons with
 * visual diff indicators for added (+), removed (-), and modified (≈) items.
 *
 * Modified characters are expandable to show detailed field-by-field
 * differences including inline word-level diffs for text fields.
 */

import { useCallback, useMemo, useState } from 'react';
import styles from '@/styles/components/projects/VersionCompareView.module.css';
import { getTeamHexColor, TEAM_LABELS } from '@/ts/config.js';
import type { Character, Team } from '@/ts/types/index';
import type { ProjectState, ProjectVersion } from '@/ts/types/project';
import {
  calculateProjectDiff,
  calculateProjectDiffDetailed,
  type FieldChange,
  getDiffSummary,
  type ModifiedCharacterDetailed,
} from '@/ts/utils/projectDiff';
import { formatValueForDisplay } from '@/ts/utils/textDiff.js';

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
  // Track which modified characters are expanded
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());

  // Calculate the detailed diff between current and version states
  const detailedDiff = useMemo(() => {
    return calculateProjectDiffDetailed(compareVersion.stateSnapshot, currentState);
  }, [currentState, compareVersion.stateSnapshot]);

  // Also calculate simple diff for summary (reuses existing logic)
  const diff = useMemo(() => {
    return calculateProjectDiff(compareVersion.stateSnapshot, currentState);
  }, [currentState, compareVersion.stateSnapshot]);

  const summary = useMemo(() => getDiffSummary(diff), [diff]);

  // Toggle expanded state for a character
  const toggleExpanded = useCallback((characterId: string) => {
    setExpandedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  }, []);

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
            type="button"
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
          {(detailedDiff.characters.added.length > 0 ||
            detailedDiff.characters.removed.length > 0 ||
            detailedDiff.characters.modified.length > 0) && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Characters
                <span className={styles.countBadge}>
                  {detailedDiff.characters.added.length +
                    detailedDiff.characters.removed.length +
                    detailedDiff.characters.modified.length}{' '}
                  changes
                </span>
              </h4>

              {/* Side-by-side columns for added/removed */}
              {(detailedDiff.characters.added.length > 0 ||
                detailedDiff.characters.removed.length > 0) && (
                <div className={styles.columnsContainer}>
                  <div className={styles.column}>
                    <div className={styles.columnHeader}>
                      <span>Added to Current</span>
                    </div>
                    <div className={styles.columnContent}>
                      {detailedDiff.characters.added.length > 0 ? (
                        detailedDiff.characters.added.map((char) => (
                          <CharacterRow key={`added-${char.id}`} character={char} status="added" />
                        ))
                      ) : (
                        <div className={styles.noGroupChanges}>No characters added</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.column}>
                    <div className={styles.columnHeader}>
                      <span>Removed from v{compareVersion.versionNumber}</span>
                    </div>
                    <div className={styles.columnContent}>
                      {detailedDiff.characters.removed.length > 0 ? (
                        detailedDiff.characters.removed.map((char) => (
                          <CharacterRow
                            key={`removed-${char.id}`}
                            character={char}
                            status="removed"
                          />
                        ))
                      ) : (
                        <div className={styles.noGroupChanges}>No characters removed</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Modified characters - expandable full width */}
              {detailedDiff.characters.modified.length > 0 && (
                <div className={styles.modifiedSection}>
                  <div className={styles.modifiedSectionTitle}>
                    <span>Modified Characters</span>
                    <span className={styles.countBadge}>
                      {detailedDiff.characters.modified.length}
                    </span>
                  </div>
                  <div className={styles.modifiedCharactersList}>
                    {detailedDiff.characters.modified.map((mod) => (
                      <ExpandableCharacterRow
                        key={`modified-${mod.currentCharacter.id}`}
                        modification={mod}
                        isExpanded={expandedCharacters.has(mod.currentCharacter.id)}
                        onToggle={() => toggleExpanded(mod.currentCharacter.id)}
                        versionLabel={`v${compareVersion.versionNumber}`}
                      />
                    ))}
                  </div>
                </div>
              )}
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
        style={{ backgroundColor: getTeamHexColor(team) }}
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
// Expandable Character Row Components
// ==========================================================================

interface ExpandableCharacterRowProps {
  modification: ModifiedCharacterDetailed;
  isExpanded: boolean;
  onToggle: () => void;
  versionLabel: string;
}

/**
 * Expandable row for modified characters
 * Click to expand and see detailed field-by-field changes
 */
function ExpandableCharacterRow({
  modification,
  isExpanded,
  onToggle,
  versionLabel,
}: ExpandableCharacterRowProps) {
  const { currentCharacter, changedFieldNames } = modification;
  const team = currentCharacter.team as Team;

  return (
    <div className={styles.expandableRow}>
      {/* Summary row - clickable to expand */}
      <button
        type="button"
        className={styles.characterRowClickable}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <span
          className={`${styles.expandIcon} ${isExpanded ? styles.expandIconExpanded : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className={styles.statusIndicator} style={{ color: '#ff9800' }}>
          ≈
        </span>
        <div
          className={styles.teamIndicator}
          style={{ backgroundColor: getTeamHexColor(team) }}
          title={TEAM_LABELS[team] || team}
        />
        <span className={styles.characterName}>{currentCharacter.name}</span>
        <span className={styles.changedFields}>({changedFieldNames.length} fields changed)</span>
      </button>

      {/* Expanded detail panel */}
      {isExpanded && (
        <CharacterDiffDetail modification={modification} versionLabel={versionLabel} />
      )}
    </div>
  );
}

interface CharacterDiffDetailProps {
  modification: ModifiedCharacterDetailed;
  versionLabel: string;
}

/**
 * Detailed diff view for a character showing all field changes
 */
function CharacterDiffDetail({ modification, versionLabel }: CharacterDiffDetailProps) {
  const { changes } = modification;

  return (
    <div className={styles.diffDetail}>
      {/* Text Fields Section */}
      {changes.text.length > 0 && (
        <div className={styles.fieldGroup}>
          <h5 className={styles.fieldGroupTitle}>Text Fields</h5>
          {changes.text.map((change) => (
            <TextFieldDiff key={change.fieldName} change={change} versionLabel={versionLabel} />
          ))}
        </div>
      )}

      {/* Reminders Section */}
      {changes.arrays.length > 0 && (
        <div className={styles.fieldGroup}>
          <h5 className={styles.fieldGroupTitle}>Reminders</h5>
          {changes.arrays.map((change) => (
            <ArrayFieldDiff key={change.fieldName} change={change} />
          ))}
        </div>
      )}

      {/* Night Order Section */}
      {changes.nightOrder.length > 0 && (
        <div className={styles.fieldGroup}>
          <h5 className={styles.fieldGroupTitle}>Night Order</h5>
          {changes.nightOrder.map((change) => (
            <SimpleFieldDiff key={change.fieldName} change={change} versionLabel={versionLabel} />
          ))}
        </div>
      )}

      {/* Metadata Section */}
      {changes.metadata.length > 0 && (
        <div className={styles.fieldGroup}>
          <h5 className={styles.fieldGroupTitle}>Metadata</h5>
          {changes.metadata.map((change) => (
            <SimpleFieldDiff key={change.fieldName} change={change} versionLabel={versionLabel} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TextFieldDiffProps {
  change: FieldChange<string | undefined>;
  versionLabel: string;
}

/**
 * Renders text field changes with old and new values on separate lines
 */
function TextFieldDiff({ change, versionLabel }: TextFieldDiffProps) {
  const { displayName, oldValue, newValue } = change;

  return (
    <div className={styles.fieldDiff}>
      <span className={styles.fieldLabel}>{displayName}:</span>
      <div className={styles.textCompare}>
        <div className={styles.textOld}>
          <span className={styles.textLabel}>{versionLabel}:</span>
          <span className={styles.textContent}>{oldValue || '(empty)'}</span>
        </div>
        <div className={styles.textNew}>
          <span className={styles.textLabel}>Current:</span>
          <span className={styles.textContent}>{newValue || '(empty)'}</span>
        </div>
      </div>
    </div>
  );
}

interface ArrayFieldDiffProps {
  change: FieldChange<string[] | undefined>;
}

/**
 * Renders array changes (reminders) with added/removed indicators
 */
function ArrayFieldDiff({ change }: ArrayFieldDiffProps) {
  const { displayName, arrayDiff } = change;

  if (!arrayDiff) return null;

  return (
    <div className={styles.fieldDiff}>
      <span className={styles.fieldLabel}>{displayName}:</span>
      <div className={styles.arrayDiff}>
        {arrayDiff.removed.map((item) => (
          <span key={`removed-${item}`} className={styles.arrayItemRemoved}>
            {item}
          </span>
        ))}
        {arrayDiff.added.map((item) => (
          <span key={`added-${item}`} className={styles.arrayItemAdded}>
            {item}
          </span>
        ))}
        {arrayDiff.unchanged.length > 0 && (
          <span className={styles.arrayUnchangedCount}>
            ({arrayDiff.unchanged.length} unchanged)
          </span>
        )}
      </div>
    </div>
  );
}

interface SimpleFieldDiffProps {
  change: FieldChange<unknown>;
  versionLabel: string;
}

/**
 * Renders simple field changes (numbers, booleans, etc.)
 */
function SimpleFieldDiff({ change, versionLabel }: SimpleFieldDiffProps) {
  const { displayName, oldValue, newValue } = change;

  return (
    <div className={styles.fieldDiff}>
      <span className={styles.fieldLabel}>{displayName}:</span>
      <div className={styles.simpleFieldChange}>
        <span className={styles.simpleVersionLabel}>{versionLabel}:</span>
        <span className={styles.simpleOldValue}>{formatValueForDisplay(oldValue)}</span>
        <span className={styles.simpleArrow}>→</span>
        <span className={styles.simpleVersionLabel}>Current:</span>
        <span className={styles.simpleNewValue}>{formatValueForDisplay(newValue)}</span>
      </div>
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
