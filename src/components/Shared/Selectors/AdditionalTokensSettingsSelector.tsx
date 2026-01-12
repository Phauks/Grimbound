/**
 * AdditionalTokensSettingsSelector Component
 *
 * A settings selector for additional token generation options.
 * Opens a drawer with three columns:
 * - Left: Bootlegger settings
 * - Middle: Jinx tokens
 * - Right: Pandemonium and Script Name tokens
 *
 * Changes apply immediately (no pending state needed for simple toggles).
 *
 * @module components/Shared/Selectors/AdditionalTokensSettingsSelector
 */

import { useEffect, useRef, useState } from 'react';
import { AdditionalTokensDrawer } from '@/components/Shared/Drawer/AdditionalTokensDrawer';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import type { Character, GenerationOptions } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface AdditionalTokensSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  characters: Character[];
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

// Default settings for reset
const DEFAULT_SETTINGS: Partial<GenerationOptions> = {
  pandemoniumToken: true,
  scriptNameToken: true,
  hideScriptNameAuthor: false,
  jinxTokens: false,
  generateBootleggerRules: true,
  bootleggerIconType: 'bootlegger',
  bootleggerNormalizeIcons: false,
  bootleggerHideName: false,
};

// ============================================================================
// Preview Component
// ============================================================================

function AdditionalTokensPreview({ hasEnabledTokens }: { hasEnabledTokens: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontSize: '1.25rem',
        opacity: hasEnabledTokens ? 1 : 0.4,
      }}
    >
      <span>🎲</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdditionalTokensSettingsSelector({
  generationOptions,
  onOptionChange,
  characters,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: AdditionalTokensSettingsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if any token types are enabled
  const hasEnabledTokens =
    generationOptions.pandemoniumToken !== false ||
    generationOptions.scriptNameToken !== false ||
    generationOptions.jinxTokens === true ||
    generationOptions.generateBootleggerRules !== false;

  // Panel coordination - close other panels when this opens
  const closeRef = useRef<(() => void) | undefined>(undefined);
  const onWillOpen = useCoordinatedPanel('additional-tokens-settings', () => closeRef.current);

  // Update close ref
  useEffect(() => {
    closeRef.current = () => setIsOpen(false);
  }, []);

  // Handlers
  const handleOpen = () => {
    onWillOpen?.();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleReset = () => {
    onOptionChange(DEFAULT_SETTINGS);
  };

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <AdditionalTokensPreview hasEnabledTokens={hasEnabledTokens} />
          </PreviewBox>
        }
        info={<InfoSection label="Additional Tokens" />}
        actionLabel="Customize"
        onAction={handleOpen}
        isExpanded={isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? 'Additional token settings'}
      />

      <AdditionalTokensDrawer
        isOpen={isOpen}
        onClose={handleClose}
        onApply={handleClose}
        onReset={handleReset}
        generationOptions={generationOptions}
        onOptionChange={onOptionChange}
        characters={characters}
      />
    </>
  );
}
