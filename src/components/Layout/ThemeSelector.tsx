/**
 * ThemeSelector Component
 *
 * A header popover component for theme selection and customization.
 * Features:
 * - Visual theme swatch grid (all themes in one view)
 * - Color customization for primary, accent, and background
 *
 * @module components/Layout/ThemeSelector
 */

import { memo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import { type ThemeOverrides, useTheme } from '@/contexts/ThemeContext';
import { useExpandablePanel } from '@/hooks/ui/useExpandablePanel';
import headerStyles from '@/styles/components/layout/Header.module.css';
import styles from '@/styles/components/layout/ThemeSelector.module.css';
import { getThemeIds, type ThemeId, type UITheme } from '@/ts/themes';

// ============================================================================
// Theme Swatch Component
// ============================================================================

interface ThemeSwatchProps {
  theme: UITheme;
  isSelected: boolean;
  onClick: () => void;
}

const ThemeSwatch = memo(function ThemeSwatch({ theme, isSelected, onClick }: ThemeSwatchProps) {
  // Use core colors for the swatch preview
  const { primary, accent, backgroundBase } = theme.coreColors;

  return (
    <button
      type="button"
      className={`${styles.themeSwatch} ${isSelected ? styles.themeSwatchSelected : ''}`}
      onClick={onClick}
      title={theme.name}
      aria-label={`Select ${theme.name} theme`}
      aria-pressed={isSelected}
    >
      <div className={styles.swatchColors}>
        <div className={styles.swatchBg} style={{ backgroundColor: backgroundBase }} />
        <div className={styles.swatchPrimary} style={{ backgroundColor: primary }} />
        <div className={styles.swatchAccent} style={{ backgroundColor: accent }} />
      </div>
      <span className={styles.swatchIcon}>{theme.icon}</span>
    </button>
  );
});

// ============================================================================
// Customization Section Component
// ============================================================================

interface CustomizationSectionProps {
  overrides: ThemeOverrides;
  defaultColors: { primary: string; accent: string; backgroundBase: string };
  onOverrideChange: (key: keyof ThemeOverrides, value: string | undefined) => void;
  onReset: () => void;
  hasOverrides: boolean;
}

const CustomizationSection = memo(function CustomizationSection({
  overrides,
  defaultColors,
  onOverrideChange,
  onReset,
  hasOverrides,
}: CustomizationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.customization}>
      <button
        type="button"
        className={styles.customizeToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span>Customize</span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
          className={isExpanded ? styles.chevronUp : styles.chevronDown}
          aria-hidden="true"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
        {hasOverrides && <span className={styles.customizeBadge}>Modified</span>}
      </button>

      {isExpanded && (
        <div className={styles.customizeContent}>
          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>Primary</span>
            <ColorPreviewSelector
              value={overrides.primary || defaultColors.primary}
              defaultValue={defaultColors.primary}
              onChange={(color) => onOverrideChange('primary', color)}
              onPreviewChange={(color) => onOverrideChange('primary', color)}
              size="small"
            />
          </div>

          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>Accent</span>
            <ColorPreviewSelector
              value={overrides.accent || defaultColors.accent}
              defaultValue={defaultColors.accent}
              onChange={(color) => onOverrideChange('accent', color)}
              onPreviewChange={(color) => onOverrideChange('accent', color)}
              size="small"
            />
          </div>

          <div className={styles.colorRow}>
            <span className={styles.colorLabel}>Background</span>
            <ColorPreviewSelector
              value={overrides.backgroundBase || defaultColors.backgroundBase}
              defaultValue={defaultColors.backgroundBase}
              onChange={(color) => onOverrideChange('backgroundBase', color)}
              onPreviewChange={(color) => onOverrideChange('backgroundBase', color)}
              size="small"
            />
          </div>

          {hasOverrides && (
            <button type="button" className={styles.resetButton} onClick={onReset}>
              Reset to Preset
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main ThemeSelector Component
// ============================================================================

export const ThemeSelector = memo(function ThemeSelector() {
  const {
    currentThemeId,
    currentTheme,
    setTheme,
    overrides,
    setOverride,
    clearOverrides,
    hasOverrides,
    builtInThemes,
  } = useTheme();

  // Get all theme IDs (dark + light combined)
  const allThemeIds = getThemeIds();

  // Use expandable panel for the popover
  const panel = useExpandablePanel<string>({
    value: currentThemeId,
    onChange: () => {
      // Theme changes are applied immediately, no need for Apply flow
    },
    autoApplyOnClose: false,
    panelHeight: 340,
    minPanelWidth: 320,
  });

  // Handle theme selection
  const handleThemeSelect = useCallback(
    (themeId: ThemeId) => {
      setTheme(themeId);
    },
    [setTheme]
  );

  // Render the panel content
  const renderPanel = () => {
    if (!(panel.isExpanded && panel.panelPosition)) return null;

    // Calculate position - ensure panel stays on screen
    let left = panel.panelPosition.left;
    const panelWidth = panel.panelPosition.width;
    const viewportWidth = window.innerWidth;

    // If panel would go off right edge, shift it left
    if (left + panelWidth > viewportWidth - 16) {
      left = viewportWidth - panelWidth - 16;
    }

    // Ensure it doesn't go off left edge either
    if (left < 16) {
      left = 16;
    }

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panel.panelPosition.openUpward ? 'auto' : panel.panelPosition.top,
      bottom: panel.panelPosition.openUpward
        ? window.innerHeight - panel.panelPosition.top
        : 'auto',
      left,
      width: panelWidth,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={panel.panelRef}
        className={`${styles.panel} ${panel.panelPosition.openUpward ? styles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Theme</span>
        </div>

        {/* Theme Swatch Grid - All themes */}
        <div className={styles.themeGrid}>
          {allThemeIds.map((themeId) => {
            const theme = builtInThemes[themeId];
            return (
              <ThemeSwatch
                key={themeId}
                theme={theme}
                isSelected={themeId === currentThemeId}
                onClick={() => handleThemeSelect(themeId)}
              />
            );
          })}
        </div>

        {/* Customization Section */}
        <CustomizationSection
          overrides={overrides}
          defaultColors={currentTheme.coreColors}
          onOverrideChange={setOverride}
          onReset={clearOverrides}
          hasOverrides={hasOverrides}
        />
      </div>,
      document.body
    );
  };

  return (
    <div ref={panel.containerRef} className={styles.container}>
      <button
        type="button"
        className={headerStyles.iconButton}
        onClick={panel.toggle}
        aria-label="Open theme selector"
        aria-expanded={panel.isExpanded}
        title="Theme"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </button>
      {renderPanel()}
    </div>
  );
});

export default ThemeSelector;
