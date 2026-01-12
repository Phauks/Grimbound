/**
 * FontSettingsSelector Component
 *
 * A comprehensive typography control that combines font family, color,
 * letter spacing, and text shadow into a unified, drawer-based component.
 *
 * Features:
 * - Search fonts by name
 * - Filter by source (All/Built-in/Google/Custom)
 * - Filter by category (Display/Sans Serif/Serif/Script)
 * - List/Grid view toggle
 * - Color swatches and custom color picker
 * - Letter spacing and text shadow sliders
 * - Live preview with all settings applied
 * - Custom font upload support
 *
 * Uses FontDrawer for comprehensive settings interface and FontContext
 * for dynamic font access.
 *
 * @module components/Shared/FontSettingsSelector
 */

import { useRef, useState } from 'react';
import { FontDrawer, type TokenType } from '@/components/Shared/Drawer';
import { useFonts } from '@/contexts/FontContext';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import { useDrawerState, useFontFiltering, useFontOperations } from '@/hooks';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import type { FontCategory, FontSource } from '@/ts/types/fonts.js';
import type {
  FontSizeOptions,
  FontSpacingOptions,
  GenerationOptions,
  TextLocation,
  TextRenderStyle,
  TextRenderStyleOptions,
  TextShadowOptions,
  TextStrokeColorOptions,
  TextStrokeWidthOptions,
} from '@/ts/types/index.js';
import { FontOptionsColumn, FontSelectionColumn, FontStyleColumn } from './FontSettings';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// Re-export TokenType for consumers
export type { TokenType } from '@/components/Shared/Drawer';

// ============================================================================
// Types
// ============================================================================

export interface FontSettings {
  /** Font family name */
  fontFamily: string;
  /** Font color in hex format */
  color: string;
  /** Letter spacing in pixels */
  letterSpacing: number;
  /** Text shadow blur radius in pixels */
  shadowBlur: number;
  /** Font size in points (0 = auto/ratio-based) */
  fontSize?: number;
  /** Text render style (filled, outlined, or both) */
  renderStyle?: TextRenderStyle;
  /** Stroke/outline color in hex format */
  strokeColor?: string;
  /** Stroke/outline width in pixels */
  strokeWidth?: number;
  /** Text location for curved text (bottom = default, top = reversed) */
  textLocation?: TextLocation;
}

/** Font settings for all token types */
export interface AllFontSettings {
  character: FontSettings;
  meta: FontSettings;
  characterText: FontSettings;
  metaText: FontSettings;
  reminder: FontSettings;
}

export interface FontSettingsSelectorProps {
  /** Generation options (primary interface) */
  generationOptions: GenerationOptions;
  /** Called when options change */
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  /** Display title for the selector (e.g., "Character Name", "Ability Text") */
  title?: string;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Visual disabled state (grayed out but not truly disabled) */
  visuallyDisabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Default values for reset */
  defaults?: Partial<FontSettings>;
  /** Slot for header content (e.g., toggle buttons) - rendered between info and button */
  headerSlot?: React.ReactNode;
  /** Filter by font categories */
  allowedCategories?: FontCategory[];
  /** Filter by font sources */
  allowedSources?: FontSource[];
  /** Whether Character and Meta name settings are linked */
  isNameLinked?: boolean;
  /** Called when Character/Meta name link toggle is clicked */
  onNameLinkToggle?: () => void;
  /** Whether Ability Text and Meta Text settings are linked */
  isTextLinked?: boolean;
  /** Called when Ability Text/Meta Text link toggle is clicked */
  onTextLinkToggle?: () => void;
  /** Initial active token type (defaults to 'character') */
  initialTokenType?: TokenType;
}

// ============================================================================
// Constants
// ============================================================================

/** Default font settings for each token type */
const DEFAULT_FONT_SETTINGS: FontSettings = {
  fontFamily: 'Dumbledor',
  color: '#FFFFFF',
  letterSpacing: 0,
  shadowBlur: 4,
  fontSize: 0,
  renderStyle: 'filled',
  strokeColor: '#000000',
  strokeWidth: 2,
};

/** Default AllFontSettings */
const DEFAULT_ALL_FONT_SETTINGS: AllFontSettings = {
  character: { ...DEFAULT_FONT_SETTINGS },
  meta: { ...DEFAULT_FONT_SETTINGS },
  characterText: { ...DEFAULT_FONT_SETTINGS, fontFamily: 'TradeGothic', shadowBlur: 3 },
  metaText: { ...DEFAULT_FONT_SETTINGS, fontFamily: 'TradeGothic', shadowBlur: 3 },
  reminder: { ...DEFAULT_FONT_SETTINGS },
};

// Default fallback values for font-related generation options
const DEFAULT_FONT_SPACING = {
  characterName: 0,
  characterText: 0,
  reminderText: 0,
  metaName: 0,
  metaText: 0,
} as const;

const DEFAULT_TEXT_SHADOW = {
  characterName: 4,
  characterText: 3,
  reminderText: 4,
  metaName: 4,
  metaText: 4,
} as const;

const DEFAULT_FONT_SIZES = {
  characterName: 0,
  characterText: 0,
  reminderText: 0,
  metaName: 0,
  metaText: 0,
} as const;

const DEFAULT_RENDER_STYLES = {
  characterName: 'filled',
  characterText: 'filled',
  reminderText: 'filled',
  metaName: 'filled',
  metaText: 'filled',
} as const;

const DEFAULT_STROKE_COLORS = {
  characterName: '#000000',
  characterText: '#000000',
  reminderText: '#000000',
  metaName: '#000000',
  metaText: '#000000',
} as const;

const DEFAULT_STROKE_WIDTHS = {
  characterName: 2,
  characterText: 2,
  reminderText: 2,
  metaName: 2,
  metaText: 2,
} as const;

/** Resolved font options extracted from GenerationOptions */
interface ResolvedFontOptions {
  spacing: FontSpacingOptions;
  shadow: TextShadowOptions;
  sizes: FontSizeOptions;
  renderStyles: TextRenderStyleOptions;
  strokeColors: TextStrokeColorOptions;
  strokeWidths: TextStrokeWidthOptions;
}

/** Resolves font-related options with defaults */
function resolveFontOptions(options: GenerationOptions): ResolvedFontOptions {
  return {
    spacing: options.fontSpacing || DEFAULT_FONT_SPACING,
    shadow: options.textShadow || DEFAULT_TEXT_SHADOW,
    sizes: options.fontSizes || DEFAULT_FONT_SIZES,
    renderStyles: options.textRenderStyles || DEFAULT_RENDER_STYLES,
    strokeColors: options.textStrokeColors || DEFAULT_STROKE_COLORS,
    strokeWidths: options.textStrokeWidths || DEFAULT_STROKE_WIDTHS,
  };
}

/** Builds character name font settings */
function buildCharacterSettings(
  options: GenerationOptions,
  resolved: ResolvedFontOptions
): FontSettings {
  return {
    fontFamily: options.characterNameFont || 'Dumbledor',
    color: options.characterNameColor || '#FFFFFF',
    letterSpacing: resolved.spacing.characterName,
    shadowBlur: resolved.shadow.characterName,
    fontSize: resolved.sizes.characterName,
    renderStyle: resolved.renderStyles.characterName,
    strokeColor: resolved.strokeColors.characterName,
    strokeWidth: resolved.strokeWidths.characterName,
    textLocation: options.textLocations?.characterName ?? 'bottom',
  };
}

/** Builds meta name font settings */
function buildMetaSettings(
  options: GenerationOptions,
  resolved: ResolvedFontOptions
): FontSettings {
  return {
    fontFamily: options.metaNameFont || 'Dumbledor',
    color: options.metaNameColor || '#FFFFFF',
    letterSpacing: resolved.spacing.metaName ?? 0,
    shadowBlur: resolved.shadow.metaName ?? 4,
    fontSize: resolved.sizes.metaName ?? 0,
    renderStyle: resolved.renderStyles.metaName ?? 'filled',
    strokeColor: resolved.strokeColors.metaName ?? '#000000',
    strokeWidth: resolved.strokeWidths.metaName ?? 2,
    textLocation: options.textLocations?.metaName ?? 'bottom',
  };
}

/** Builds character ability text font settings */
function buildCharacterTextSettings(
  options: GenerationOptions,
  resolved: ResolvedFontOptions
): FontSettings {
  return {
    fontFamily: options.abilityTextFont || 'TradeGothic',
    color: options.abilityTextColor || '#FFFFFF',
    letterSpacing: resolved.spacing.characterText,
    shadowBlur: resolved.shadow.characterText,
    fontSize: resolved.sizes.characterText,
    renderStyle: resolved.renderStyles.characterText,
    strokeColor: resolved.strokeColors.characterText,
    strokeWidth: resolved.strokeWidths.characterText,
  };
}

/** Builds meta text font settings */
function buildMetaTextSettings(
  options: GenerationOptions,
  resolved: ResolvedFontOptions
): FontSettings {
  return {
    fontFamily: options.metaTextFont || 'TradeGothic',
    color: options.metaTextColor || '#FFFFFF',
    letterSpacing: resolved.spacing.metaText ?? 0,
    shadowBlur: resolved.shadow.metaText ?? 4,
    fontSize: resolved.sizes.metaText ?? 0,
    renderStyle: resolved.renderStyles.metaText ?? 'filled',
    strokeColor: resolved.strokeColors.metaText ?? '#000000',
    strokeWidth: resolved.strokeWidths.metaText ?? 2,
  };
}

/** Builds reminder font settings */
function buildReminderSettings(
  options: GenerationOptions,
  resolved: ResolvedFontOptions
): FontSettings {
  return {
    fontFamily: options.characterReminderFont || 'TradeGothic',
    color: options.reminderTextColor || '#FFFFFF',
    letterSpacing: resolved.spacing.reminderText,
    shadowBlur: resolved.shadow.reminderText,
    fontSize: resolved.sizes.reminderText,
    renderStyle: resolved.renderStyles.reminderText,
    strokeColor: resolved.strokeColors.reminderText,
    strokeWidth: resolved.strokeWidths.reminderText,
    textLocation: options.textLocations?.reminderText ?? 'bottom',
  };
}

/** Builds AllFontSettings from GenerationOptions */
function buildAllFontSettingsFromOptions(options: GenerationOptions): AllFontSettings {
  const resolved = resolveFontOptions(options);
  return {
    character: buildCharacterSettings(options, resolved),
    meta: buildMetaSettings(options, resolved),
    characterText: buildCharacterTextSettings(options, resolved),
    metaText: buildMetaTextSettings(options, resolved),
    reminder: buildReminderSettings(options, resolved),
  };
}

/** Converts AllFontSettings to GenerationOptions updates */
function convertFontSettingsToOptions(settings: AllFontSettings): Partial<GenerationOptions> {
  return {
    characterNameFont: settings.character.fontFamily,
    characterNameColor: settings.character.color,
    metaNameFont: settings.meta.fontFamily,
    metaNameColor: settings.meta.color,
    abilityTextFont: settings.characterText.fontFamily,
    abilityTextColor: settings.characterText.color,
    metaTextFont: settings.metaText.fontFamily,
    metaTextColor: settings.metaText.color,
    characterReminderFont: settings.reminder.fontFamily,
    reminderTextColor: settings.reminder.color,
    fontSpacing: {
      characterName: settings.character.letterSpacing,
      characterText: settings.characterText.letterSpacing,
      reminderText: settings.reminder.letterSpacing,
      metaName: settings.meta.letterSpacing,
      metaText: settings.metaText.letterSpacing,
    },
    textShadow: {
      characterName: settings.character.shadowBlur,
      characterText: settings.characterText.shadowBlur,
      reminderText: settings.reminder.shadowBlur,
      metaName: settings.meta.shadowBlur,
      metaText: settings.metaText.shadowBlur,
    },
    fontSizes: {
      characterName: settings.character.fontSize ?? 0,
      characterText: settings.characterText.fontSize ?? 0,
      reminderText: settings.reminder.fontSize ?? 0,
      metaName: settings.meta.fontSize ?? 0,
      metaText: settings.metaText.fontSize ?? 0,
    },
    textRenderStyles: {
      characterName: settings.character.renderStyle ?? 'filled',
      characterText: settings.characterText.renderStyle ?? 'filled',
      reminderText: settings.reminder.renderStyle ?? 'filled',
      metaName: settings.meta.renderStyle ?? 'filled',
      metaText: settings.metaText.renderStyle ?? 'filled',
    },
    textStrokeColors: {
      characterName: settings.character.strokeColor ?? '#000000',
      characterText: settings.characterText.strokeColor ?? '#000000',
      reminderText: settings.reminder.strokeColor ?? '#000000',
      metaName: settings.meta.strokeColor ?? '#000000',
      metaText: settings.metaText.strokeColor ?? '#000000',
    },
    textStrokeWidths: {
      characterName: settings.character.strokeWidth ?? 2,
      characterText: settings.characterText.strokeWidth ?? 2,
      reminderText: settings.reminder.strokeWidth ?? 2,
      metaName: settings.meta.strokeWidth ?? 2,
      metaText: settings.metaText.strokeWidth ?? 2,
    },
    textLocations: {
      characterName: settings.character.textLocation ?? 'bottom',
      reminderText: settings.reminder.textLocation ?? 'bottom',
      metaName: settings.meta.textLocation ?? 'bottom',
    },
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = Number.parseInt(color.slice(0, 2), 16);
  const g = Number.parseInt(color.slice(2, 4), 16);
  const b = Number.parseInt(color.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ============================================================================
// Preview Component
// ============================================================================

function FontPreview({ settings, isLightText }: { settings: FontSettings; isLightText: boolean }) {
  const previewStyle: React.CSSProperties = {
    fontFamily: settings.fontFamily,
    color: settings.color,
    letterSpacing: `${settings.letterSpacing}px`,
    textShadow:
      settings.shadowBlur > 0
        ? `0 0 ${settings.shadowBlur}px rgba(0,0,0,0.8), 0 1px ${Math.ceil(settings.shadowBlur / 2)}px rgba(0,0,0,0.6)`
        : 'none',
  };

  return (
    <div className={baseStyles.previewContainer}>
      <div className={baseStyles.previewText} style={previewStyle}>
        Aa
      </div>
      {/* Color indicator dot */}
      <div
        className={`${baseStyles.colorDot} ${isLightText ? baseStyles.colorDotLight : ''}`}
        style={{ backgroundColor: settings.color }}
      />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function FontSettingsSelector({
  generationOptions,
  onOptionChange,
  title,
  size = 'medium',
  disabled = false,
  visuallyDisabled = false,
  ariaLabel,
  defaults = { letterSpacing: 0, shadowBlur: 4 },
  headerSlot,
  allowedCategories,
  allowedSources,
  isNameLinked = false,
  onNameLinkToggle,
  isTextLinked = false,
  onTextLinkToggle,
  initialTokenType = 'character',
}: FontSettingsSelectorProps) {
  // FontContext for dynamic fonts
  const { fonts, isLoading, loadFont, uploadFont } = useFonts();

  // Token type for drawer tabs (manages which font settings are being edited)
  const [activeTokenType, setActiveTokenType] = useState<TokenType>(initialTokenType);

  // Build AllFontSettings from generationOptions (self-contained extraction)
  const allFontSettings: AllFontSettings = buildAllFontSettingsFromOptions(generationOptions);

  // Convert AllFontSettings changes to GenerationOptions updates
  const handleSettingsChange = (settings: AllFontSettings) => {
    onOptionChange(convertFontSettingsToOptions(settings));
  };

  // Extract display settings from generationOptions
  const displayAbilityText = generationOptions.displayAbilityText !== false;

  // Handlers for display settings
  const handleDisplayAbilityTextChange = (enabled: boolean) =>
    onOptionChange({ displayAbilityText: enabled });

  // Use extracted font filtering hook
  const filtering = useFontFiltering({
    fonts,
    allowedSources,
    allowedCategories,
  });

  // Default settings for reset - use default all font settings
  const defaultAllSettings: AllFontSettings = {
    character: {
      ...DEFAULT_ALL_FONT_SETTINGS.character,
      fontFamily: fonts[0]?.family || DEFAULT_ALL_FONT_SETTINGS.character.fontFamily,
    },
    meta: {
      ...DEFAULT_ALL_FONT_SETTINGS.meta,
      fontFamily: fonts[0]?.family || DEFAULT_ALL_FONT_SETTINGS.meta.fontFamily,
    },
    characterText: { ...DEFAULT_ALL_FONT_SETTINGS.characterText },
    metaText: { ...DEFAULT_ALL_FONT_SETTINGS.metaText },
    reminder: {
      ...DEFAULT_ALL_FONT_SETTINGS.reminder,
      fontFamily: fonts[0]?.family || DEFAULT_ALL_FONT_SETTINGS.reminder.fontFamily,
    },
  };

  // Panel coordination - closes other panels when this one opens
  const panelId = `font-settings-${title?.replace(/\s+/g, '-').toLowerCase() ?? 'default'}`;
  const drawerCloseRef = useRef<(() => void) | undefined>(undefined);
  const onWillOpen = useCoordinatedPanel(panelId, () => drawerCloseRef.current);

  // Use drawer state hook
  const drawer = useDrawerState<AllFontSettings>({
    value: allFontSettings,
    onChange: handleSettingsChange,
    onPreviewChange: handleSettingsChange,
    disabled,
    defaultValue: defaultAllSettings,
    onWillOpen,
  });

  // Keep ref updated for coordination
  drawerCloseRef.current = drawer.close;

  // Get active settings from pending value
  const displayAllSettings = drawer.isOpen ? drawer.pendingValue : allFontSettings;
  const displaySettings = displayAllSettings[activeTokenType];
  const isLightText = isLightColor(displaySettings.color);

  // Get current font for display label
  const currentFont = fonts.find((f) => f.family === displaySettings.fontFamily) || fonts[0];

  // Helper to update active token type settings with optional linking
  const updateActiveSettings = (updates: Partial<FontSettings>) => {
    const newActiveSettings = { ...drawer.pendingValue[activeTokenType], ...updates };
    const newAllSettings = { ...drawer.pendingValue, [activeTokenType]: newActiveSettings };

    // Handle linking: Character ↔ Meta (for name fonts)
    if (isNameLinked) {
      if (activeTokenType === 'character') {
        newAllSettings.meta = { ...drawer.pendingValue.meta, ...updates };
      } else if (activeTokenType === 'meta') {
        newAllSettings.character = { ...drawer.pendingValue.character, ...updates };
      }
    }

    // Handle linking: Character Text ↔ Meta Text
    if (isTextLinked) {
      if (activeTokenType === 'characterText') {
        newAllSettings.metaText = { ...drawer.pendingValue.metaText, ...updates };
      } else if (activeTokenType === 'metaText') {
        newAllSettings.characterText = { ...drawer.pendingValue.characterText, ...updates };
      }
    }

    drawer.updatePending(newAllSettings);
  };

  // Use extracted font operations hook
  const fontOps = useFontOperations({
    loadFont,
    uploadFont,
    onFontSelect: (family) => updateActiveSettings({ fontFamily: family }),
    onSourceChange: filtering.setActiveSource,
  });

  // Display label: use title if provided, otherwise fall back to font name
  const displayLabel = title || currentFont?.name || 'Select font';

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size} className={baseStyles.previewBox}>
            <FontPreview settings={displaySettings} isLightText={isLightText} />
          </PreviewBox>
        }
        info={<InfoSection label={displayLabel} />}
        headerSlot={headerSlot}
        actionLabel={drawer.isOpen ? 'Close' : 'Customize'}
        onAction={drawer.toggle}
        isExpanded={drawer.isOpen}
        disabled={disabled}
        visuallyDisabled={visuallyDisabled}
        size={size}
        ariaLabel={ariaLabel ?? title ?? 'Text settings'}
      />

      {/* Font Drawer */}
      <FontDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.cancel}
        onApply={drawer.apply}
        onReset={drawer.reset}
        activeTokenType={activeTokenType}
        onTokenTypeChange={setActiveTokenType}
        title="Text Settings"
        isNameLinked={isNameLinked}
        onNameLinkToggle={onNameLinkToggle}
        isTextLinked={isTextLinked}
        onTextLinkToggle={onTextLinkToggle}
      >
        {/* Column 1: Font Selection */}
        <FontSelectionColumn
          searchQuery={filtering.searchQuery}
          onSearchChange={filtering.setSearchQuery}
          activeSource={filtering.activeSource}
          onSourceChange={filtering.setActiveSource}
          activeCategories={filtering.activeCategories}
          onCategoryToggle={filtering.toggleCategory}
          availableCategories={filtering.availableCategories}
          viewMode={filtering.viewMode}
          onViewModeChange={filtering.setViewMode}
          filteredFonts={filtering.filteredFonts}
          groupedFonts={filtering.groupedFonts}
          selectedFontFamily={drawer.pendingValue[activeTokenType].fontFamily}
          loadingFonts={fontOps.loadingFonts}
          isLoading={isLoading}
          isUploading={fontOps.isUploading}
          onFontSelect={fontOps.handleFontSelect}
          onFontHover={fontOps.handleFontHover}
          onUpload={fontOps.handleUpload}
          fileInputRef={fontOps.fileInputRef}
        />

        {/* Column 2: Style Settings */}
        <FontStyleColumn
          settings={drawer.pendingValue[activeTokenType]}
          onUpdate={updateActiveSettings}
          defaults={{
            letterSpacing: defaults.letterSpacing ?? 0,
            shadowBlur: defaults.shadowBlur ?? 4,
          }}
        />

        {/* Column 3: Options (per token type) */}
        <FontOptionsColumn
          activeTokenType={activeTokenType}
          displayAbilityText={displayAbilityText}
          onDisplayAbilityTextChange={handleDisplayAbilityTextChange}
          textLocation={drawer.pendingValue[activeTokenType].textLocation}
          onTextLocationChange={(location) => updateActiveSettings({ textLocation: location })}
        />
      </FontDrawer>
    </>
  );
}
