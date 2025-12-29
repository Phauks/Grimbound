/**
 * AdditionalTokensDrawer Component
 *
 * A slide-out drawer for additional token settings with simple controls:
 * - Left column: Bootlegger Options (checkbox + dropdown)
 * - Middle column: Jinx Options (checkbox)
 * - Right column: Pandemonium and Script Name (checkboxes)
 *
 * @module components/Shared/Drawer/AdditionalTokensDrawer
 */

import { memo, useCallback, useMemo } from 'react';
import drawerStyles from '@/styles/components/shared/SettingsDrawer.module.css';
import type { BootleggerIconType, Character, GenerationOptions } from '@/ts/types/index';
import { SettingsDrawer } from './SettingsDrawer';

export interface AdditionalTokensDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  characters: Character[];
}

// Count active jinxes where both characters are on script
function countActiveJinxes(characters: Character[]): number {
  const scriptCharIds = new Set(characters.map((c) => c.id));
  const seenJinxes = new Set<string>();
  let count = 0;

  for (const char of characters) {
    if (!char.jinxes) continue;
    for (const jinx of char.jinxes) {
      if (scriptCharIds.has(jinx.id)) {
        const key = [char.id, jinx.id].sort().join(':');
        if (!seenJinxes.has(key)) {
          seenJinxes.add(key);
          count++;
        }
      }
    }
  }
  return count;
}

export const AdditionalTokensDrawer = memo(function AdditionalTokensDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  generationOptions,
  onOptionChange,
  characters,
}: AdditionalTokensDrawerProps) {
  // Bootlegger state
  const bootleggerEnabled = generationOptions.generateBootleggerRules !== false;
  const bootleggerIconType = generationOptions.bootleggerIconType ?? 'bootlegger';
  const bootleggerNormalize = generationOptions.bootleggerNormalizeIcons ?? false;
  const bootleggerHideName = generationOptions.bootleggerHideName ?? false;

  // Jinx state
  const jinxEnabled = generationOptions.jinxTokens ?? false;
  const activeJinxCount = useMemo(() => countActiveJinxes(characters), [characters]);

  // Script tokens state
  const pandemoniumEnabled = generationOptions.pandemoniumToken !== false;
  const scriptNameEnabled = generationOptions.scriptNameToken !== false;
  const hideAuthor = generationOptions.hideScriptNameAuthor ?? false;

  // Handlers
  const handleBootleggerToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ generateBootleggerRules: e.target.checked });
    },
    [onOptionChange]
  );

  const handleBootleggerIconType = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onOptionChange({ bootleggerIconType: e.target.value as BootleggerIconType });
    },
    [onOptionChange]
  );

  const handleBootleggerNormalize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ bootleggerNormalizeIcons: e.target.checked });
    },
    [onOptionChange]
  );

  const handleBootleggerHideName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ bootleggerHideName: e.target.checked });
    },
    [onOptionChange]
  );

  const handleJinxToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ jinxTokens: e.target.checked });
    },
    [onOptionChange]
  );

  const handlePandemoniumToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ pandemoniumToken: e.target.checked });
    },
    [onOptionChange]
  );

  const handleScriptNameToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ scriptNameToken: e.target.checked });
    },
    [onOptionChange]
  );

  const handleHideAuthorToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onOptionChange({ hideScriptNameAuthor: e.target.checked });
    },
    [onOptionChange]
  );

  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      onReset={onReset}
      title="Additional Tokens"
      titleIcon="🎲"
    >
      {/* Left Column: Bootlegger */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Bootlegger</div>

        <label className={drawerStyles.checkboxRow}>
          <input type="checkbox" checked={bootleggerEnabled} onChange={handleBootleggerToggle} />
          <span>Enable Bootlegger Tokens</span>
        </label>

        <label className={drawerStyles.selectWrapper}>
          <span className={drawerStyles.selectLabel}>Icon Style</span>
          <select
            value={bootleggerIconType}
            onChange={handleBootleggerIconType}
            className={drawerStyles.select}
          >
            <option value="bootlegger">Bootlegger Icon</option>
            <option value="script">Script Icon</option>
          </select>
        </label>

        <label className={`${drawerStyles.checkboxRow} ${drawerStyles.subOption}`}>
          <input
            type="checkbox"
            checked={bootleggerNormalize}
            onChange={handleBootleggerNormalize}
          />
          <span>Normalize Icon Sizes</span>
        </label>

        <label className={`${drawerStyles.checkboxRow} ${drawerStyles.subOption}`}>
          <input type="checkbox" checked={bootleggerHideName} onChange={handleBootleggerHideName} />
          <span>Hide "Bootlegger" Name</span>
        </label>
      </div>

      {/* Middle Column: Jinx */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Jinx</div>

        <label className={drawerStyles.checkboxRow}>
          <input type="checkbox" checked={jinxEnabled} onChange={handleJinxToggle} />
          <span>Enable Jinx Tokens</span>
        </label>

        {activeJinxCount > 0 && (
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {activeJinxCount} active jinx{activeJinxCount !== 1 ? 'es' : ''} on script
          </div>
        )}
      </div>

      {/* Right Column: Script Tokens */}
      <div className={drawerStyles.column}>
        <div className={drawerStyles.sectionHeader}>Script Tokens</div>

        <label className={drawerStyles.checkboxRow}>
          <input type="checkbox" checked={pandemoniumEnabled} onChange={handlePandemoniumToggle} />
          <span>Pandemonium Token</span>
        </label>

        <label className={drawerStyles.checkboxRow}>
          <input type="checkbox" checked={scriptNameEnabled} onChange={handleScriptNameToggle} />
          <span>Script Name Token</span>
        </label>

        <label className={`${drawerStyles.checkboxRow} ${drawerStyles.subOption}`}>
          <input type="checkbox" checked={hideAuthor} onChange={handleHideAuthorToggle} />
          <span>Hide Author</span>
        </label>
      </div>
    </SettingsDrawer>
  );
});

export default AdditionalTokensDrawer;
