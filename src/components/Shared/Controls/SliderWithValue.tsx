import { useState, useEffect, useCallback } from 'react'
import styles from '../../../styles/components/shared/Slider.module.css'

interface SliderWithValueProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  ariaLabel?: string
  defaultValue?: number
  unit?: string
}

export function SliderWithValue({
  value,
  onChange,
  min,
  max,
  step = 1,
  ariaLabel,
  defaultValue,
  unit = '',
}: SliderWithValueProps) {
  // Local state for text input to allow typing decimals without interruption
  const [textValue, setTextValue] = useState(String(value))
  const [isEditing, setIsEditing] = useState(false)

  // Sync textValue with external value when not editing
  useEffect(() => {
    if (!isEditing) {
      setTextValue(String(value))
    }
  }, [value, isEditing])

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue)
      setTextValue(String(defaultValue))
    }
  }

  // Apply the text value, parsing and clamping it
  const applyValue = useCallback(() => {
    const cleaned = textValue.replace(/[^0-9.-]/g, '')
    const numValue = parseFloat(cleaned)

    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue))
      onChange(clampedValue)
      setTextValue(String(clampedValue))
    } else {
      // Reset to current value if invalid
      setTextValue(String(value))
    }
    setIsEditing(false)
  }, [textValue, min, max, onChange, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow typing freely - only filter completely invalid characters
    const inputValue = e.target.value.replace(/[^0-9.-]/g, '')
    setTextValue(inputValue)
    setIsEditing(true)
  }

  const handleBlur = () => {
    applyValue()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyValue()
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'Escape') {
      // Reset to original value
      setTextValue(String(value))
      setIsEditing(false)
      ;(e.target as HTMLInputElement).blur()
    }
  }

  // Calculate tick positions for visual markers
  const tickCount = Math.min(5, Math.floor((max - min) / step) + 1)
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const tickValue = min + (i * (max - min)) / (tickCount - 1)
    return Math.round(tickValue)
  })

  return (
    <div className={styles.control}>
      <div className={styles.inputRow}>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9.\-]*"
          className={styles.valueInput}
          value={textValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
          maxLength={10}
          aria-label={ariaLabel}
          title={defaultValue !== undefined ? `Double-click to reset to ${defaultValue}` : undefined}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      <div className={styles.trackContainer}>
        <input
          type="range"
          className={styles.range}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onDoubleClick={handleDoubleClick}
          min={min}
          max={max}
          step={step}
          title={defaultValue !== undefined ? `Double-click to reset to ${defaultValue}` : undefined}
        />
        <div className={styles.ticks}>
          {ticks.map((tick, index) => (
            <span key={index} className={styles.tick} />
          ))}
        </div>
      </div>
    </div>
  )
}
