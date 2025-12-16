/**
 * ColorPreviewSelector Component
 *
 * A polished color selector with preset swatches, live preview,
 * and intuitive editing controls.
 *
 * Features:
 * - Quick preset color swatches organized by group
 * - Live color preview with visual feedback
 * - Custom color picker integration
 * - Apply/Cancel workflow for controlled changes
 * - Portal-based panel to avoid overflow clipping
 *
 * Uses SettingsSelectorBase for consistent styling and useExpandablePanel
 * for panel management.
 *
 * @module components/Shared/ColorPreviewSelector
 */

import { memo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useExpandablePanel } from '../../../hooks/useExpandablePanel'
import {
  SettingsSelectorBase,
  InfoSection,
} from './SettingsSelectorBase'
import baseStyles from '../../../styles/components/shared/SettingsSelectorBase.module.css'
import styles from '../../../styles/components/shared/ColorPreviewSelector.module.css'

// ============================================================================
// Types
// ============================================================================

export interface ColorPreset {
  /** Color value in hex format */
  value: string
  /** Display name for the color */
  name: string
  /** Optional group/category */
  group?: string
}

export interface ColorPreviewSelectorProps {
  /** Current color value (hex format) */
  value: string
  /** Called when color is applied */
  onChange: (value: string) => void
  /** Called on every change for live preview (optional) */
  onPreviewChange?: (value: string) => void
  /** Display label */
  label?: string
  /** Preview shape */
  shape?: 'circle' | 'square'
  /** Component size */
  size?: 'small' | 'medium' | 'large'
  /** Disabled state */
  disabled?: boolean
  /** Aria label for accessibility */
  ariaLabel?: string
  /** Custom preset colors (optional - uses defaults if not provided) */
  presets?: ColorPreset[]
  /** Show preset swatches */
  showPresets?: boolean
  /** Optional slot for content above the action button (e.g., toggle) */
  headerSlot?: React.ReactNode
}

// ============================================================================
// Default Color Presets
// ============================================================================

const DEFAULT_PRESETS: ColorPreset[] = [
  // Neutrals
  { value: '#FFFFFF', name: 'White', group: 'Neutral' },
  { value: '#F5F5F5', name: 'Off White', group: 'Neutral' },
  { value: '#E0E0E0', name: 'Light Gray', group: 'Neutral' },
  { value: '#808080', name: 'Gray', group: 'Neutral' },
  { value: '#404040', name: 'Dark Gray', group: 'Neutral' },
  { value: '#1A1A1A', name: 'Charcoal', group: 'Neutral' },
  { value: '#000000', name: 'Black', group: 'Neutral' },

  // Blood on the Clocktower Theme
  { value: '#8B0000', name: 'Blood Red', group: 'Theme' },
  { value: '#C9A227', name: 'Accent Gold', group: 'Theme' },
  { value: '#2C3E50', name: 'Midnight', group: 'Theme' },

  // Team Colors
  { value: '#1A5F2A', name: 'Townsfolk', group: 'Teams' },
  { value: '#1A3F5F', name: 'Outsider', group: 'Teams' },
  { value: '#5F1A3F', name: 'Minion', group: 'Teams' },
  { value: '#8B0000', name: 'Demon', group: 'Teams' },
  { value: '#5F4F1A', name: 'Traveller', group: 'Teams' },
  { value: '#4F1A5F', name: 'Fabled', group: 'Teams' },

  // Vivid Colors
  { value: '#E74C3C', name: 'Red', group: 'Vivid' },
  { value: '#E67E22', name: 'Orange', group: 'Vivid' },
  { value: '#F1C40F', name: 'Yellow', group: 'Vivid' },
  { value: '#27AE60', name: 'Green', group: 'Vivid' },
  { value: '#3498DB', name: 'Blue', group: 'Vivid' },
  { value: '#9B59B6', name: 'Purple', group: 'Vivid' },
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert hex color to a human-readable name or formatted hex
 */
function getColorDisplayName(hex: string, presets: ColorPreset[]): string {
  const normalized = hex.toUpperCase()
  const preset = presets.find((p) => p.value.toUpperCase() === normalized)
  if (preset) return preset.name

  // Common color names
  const commonNames: Record<string, string> = {
    '#FFFFFF': 'White',
    '#000000': 'Black',
    '#FF0000': 'Red',
    '#00FF00': 'Lime',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
  }

  return commonNames[normalized] || 'Custom'
}

/**
 * Determine if a color is light or dark (for contrast)
 */
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '')
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// ============================================================================
// Color Preview Component
// ============================================================================

const ColorPreview = memo(function ColorPreview({
  color,
  shape,
  size,
}: {
  color: string
  shape: 'circle' | 'square'
  size: 'small' | 'medium' | 'large'
}) {
  const isLight = isLightColor(color)

  const previewClasses = [
    styles.preview,
    styles[`preview${size.charAt(0).toUpperCase()}${size.slice(1)}`],
    shape === 'circle' ? styles.previewCircle : styles.previewSquare,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={previewClasses}>
      <div
        className={styles.colorSwatch}
        style={{ backgroundColor: color }}
      >
        {/* Border overlay for light colors */}
        {isLight && <div className={styles.swatchBorder} />}
      </div>
    </div>
  )
})

// ============================================================================
// Component
// ============================================================================

export const ColorPreviewSelector = memo(function ColorPreviewSelector({
  value,
  onChange,
  onPreviewChange,
  label,
  shape = 'circle',
  size = 'medium',
  disabled = false,
  ariaLabel,
  presets = DEFAULT_PRESETS,
  showPresets = true,
  headerSlot,
}: ColorPreviewSelectorProps) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Default color for reset
  const defaultColor = '#FFFFFF'

  // Use the shared expandable panel hook
  const panel = useExpandablePanel<string>({
    value,
    onChange,
    onPreviewChange,
    disabled,
    panelHeight: 350,
    minPanelWidth: 280,
  })

  const displayColor = panel.isExpanded ? panel.pendingValue : value
  const colorName = getColorDisplayName(displayColor, presets)

  // Handle preset selection
  const handlePresetClick = useCallback((presetValue: string) => {
    panel.updatePending(presetValue)
  }, [panel])

  // Handle custom color picker
  const handleColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    panel.updatePending(e.target.value)
  }, [panel])

  // Open native color picker
  const handlePickerClick = useCallback(() => {
    colorInputRef.current?.click()
  }, [])

  // Group presets for display
  const presetsByGroup = presets.reduce(
    (acc, preset) => {
      const group = preset.group || 'Other'
      if (!acc[group]) acc[group] = []
      acc[group].push(preset)
      return acc
    },
    {} as Record<string, ColorPreset[]>
  )

  // Render expanded panel via portal
  const renderPanel = () => {
    if (!panel.isExpanded || !showPresets || !panel.panelPosition) return null

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panel.panelPosition.openUpward ? 'auto' : panel.panelPosition.top,
      bottom: panel.panelPosition.openUpward
        ? window.innerHeight - panel.panelPosition.top
        : 'auto',
      left: panel.panelPosition.left,
      width: panel.panelPosition.width,
      zIndex: 10000,
    }

    return createPortal(
      <div
        ref={panel.panelRef}
        className={`${baseStyles.panel} ${panel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={baseStyles.panelContent}>
          {/* Custom Color Picker Row */}
          <div className={styles.customPickerRow}>
            <button
              type="button"
              className={styles.pickerButton}
              onClick={handlePickerClick}
            >
              <span className={styles.pickerIcon}>🎨</span>
              <span>Custom Color</span>
            </button>

            <div className={styles.currentColorDisplay}>
              <div
                className={styles.currentColorSwatch}
                style={{ backgroundColor: panel.pendingValue }}
              />
              <span className={styles.currentColorHex}>
                {panel.pendingValue.toUpperCase()}
              </span>
            </div>

            {/* Hidden native color input */}
            <input
              ref={colorInputRef}
              type="color"
              value={panel.pendingValue}
              onChange={handleColorInputChange}
              disabled={disabled}
              className={styles.colorInput}
              aria-label="Custom color picker"
            />
          </div>

          {/* Preset Swatches */}
          {Object.entries(presetsByGroup).map(([groupName, groupPresets]) => (
            <div key={groupName} className={styles.presetGroup}>
              <span className={styles.presetGroupLabel}>{groupName}</span>
              <div className={styles.presetSwatches}>
                {groupPresets.map((preset) => {
                  const isSelected =
                    preset.value.toUpperCase() === panel.pendingValue.toUpperCase()
                  const presetIsLight = isLightColor(preset.value)

                  return (
                    <button
                      key={preset.value}
                      type="button"
                      className={[
                        styles.presetSwatch,
                        isSelected && styles.presetSwatchSelected,
                        presetIsLight && styles.presetSwatchLight,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ backgroundColor: preset.value }}
                      onClick={() => handlePresetClick(preset.value)}
                      title={preset.name}
                      aria-label={`Select ${preset.name}`}
                    >
                      {isSelected && (
                        <span className={styles.presetCheck}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => panel.reset(defaultColor)}
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button
              type="button"
              className={baseStyles.cancelButton}
              onClick={panel.cancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className={baseStyles.confirmButton}
              onClick={panel.apply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <SettingsSelectorBase
      ref={panel.containerRef}
      preview={
        <ColorPreview
          color={displayColor}
          shape={shape}
          size={size}
        />
      }
      info={
        <InfoSection
          label={label || colorName}
          summary={displayColor.toUpperCase()}
        />
      }
      headerSlot={headerSlot}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      size={size}
      ariaLabel={ariaLabel ?? 'Select color'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  )
})

export default ColorPreviewSelector
