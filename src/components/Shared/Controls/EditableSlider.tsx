/**
 * EditableSlider Component
 *
 * A unified slider control with an inline editable value display.
 * Combines a range slider with a clickable value that can be directly edited.
 *
 * Features:
 * - Slider track with thumb for drag interaction
 * - Editable value display (click to type)
 * - Optional label with reset-on-hover behavior
 * - Compact single-row layout
 * - Supports decimal values
 * - Cross-browser slider styling
 *
 * @module components/Shared/Controls/EditableSlider
 */

import { memo, useState, useCallback, useRef } from 'react'
import styles from '../../../styles/components/shared/EditableSlider.module.css'

export interface EditableSliderProps {
  /** Current value */
  value: number
  /** Called when value changes */
  onChange: (value: number) => void
  /** Minimum allowed value */
  min: number
  /** Maximum allowed value */
  max: number
  /** Step increment */
  step?: number
  /** Value suffix (%, °, x, px, etc.) */
  suffix?: string
  /** Label text (optional) */
  label?: string
  /** Default value for reset (enables reset-on-hover for label) */
  defaultValue?: number
  /** Disabled state */
  disabled?: boolean
  /** Aria label for accessibility */
  ariaLabel?: string
  /** Additional CSS class for the container */
  className?: string
}

export const EditableSlider = memo(function EditableSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '%',
  label,
  defaultValue,
  disabled = false,
  ariaLabel,
  className,
}: EditableSliderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle text input focus
  const handleFocus = useCallback(() => {
    setIsEditing(true)
    setEditValue(String(step < 1 ? value.toFixed(1) : Math.round(value)))
  }, [value, step])

  // Handle text input blur - apply value
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const parsed = parseFloat(editValue)
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed))
      onChange(clamped)
    }
  }, [editValue, min, max, onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setEditValue(String(step < 1 ? value.toFixed(1) : Math.round(value)))
      inputRef.current?.blur()
    }
  }, [value, step])

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value))
  }, [onChange])

  // Handle reset click
  const handleReset = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue)
    }
  }, [defaultValue, onChange])

  const displayValue = step < 1 ? value.toFixed(1) : Math.round(value)
  const hasReset = defaultValue !== undefined && value !== defaultValue

  return (
    <div className={`${styles.container} ${className || ''} ${disabled ? styles.disabled : ''}`}>
      {/* Label with optional reset behavior */}
      {label && (
        <button
          type="button"
          className={`${styles.label} ${hasReset ? styles.labelResettable : ''}`}
          onClick={hasReset ? handleReset : undefined}
          disabled={disabled || !hasReset}
          title={hasReset ? `Click to reset to ${defaultValue}` : undefined}
        >
          <span className={styles.labelText}>{label}</span>
          {hasReset && <span className={styles.resetText}>Reset</span>}
        </button>
      )}

      {/* Slider track */}
      <input
        type="range"
        className={styles.slider}
        value={value}
        onChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel || label}
      />

      {/* Editable value */}
      <input
        ref={inputRef}
        type="text"
        className={styles.value}
        value={isEditing ? editValue : `${displayValue}${suffix}`}
        onChange={(e) => setEditValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        title={`Click to edit (${min}-${max})`}
      />
    </div>
  )
})

export default EditableSlider
