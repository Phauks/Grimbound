/**
 * MeasurementSlider Component
 *
 * A wrapper around EditableSlider that automatically handles unit conversion
 * between inches and millimeters. All values are stored in canonical inches
 * internally, but displayed in the user's preferred unit.
 *
 * Features:
 * - Automatic unit conversion (inches ↔ millimeters)
 * - Optional label with reset-on-hover behavior
 * - Editable value display
 * - Consistent styling with EditableSlider
 *
 * Usage:
 * ```tsx
 * <MeasurementSlider
 *   label="Offset X"
 *   value={0.125}  // Value in inches
 *   onChange={(inches) => setOffset(inches)}
 *   config={ICON_OFFSET_CONFIG}
 *   displayUnit="millimeters"  // Shows "3.18mm"
 * />
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { MeasurementConfig, MeasurementUnit } from '@/ts/types/measurement';
import {
  convertConfigToDisplayUnit,
  DECIMAL_PLACES,
  fromCanonicalInches,
  getUnitSuffix,
  toCanonicalInches,
} from '@/ts/utils/measurementUtils';
import { EditableSlider } from './EditableSlider';

interface MeasurementSliderProps {
  /** Value in canonical inches */
  value: number;
  /** Called with value in canonical inches when changed */
  onChange: (inches: number) => void;
  /** Measurement configuration defining bounds and defaults (all in inches) */
  config: MeasurementConfig;
  /** User's preferred display unit */
  displayUnit: MeasurementUnit;
  /** Label text (optional, enables reset-on-hover when combined with default) */
  label?: string;
  /** Custom aria label override (defaults to config.ariaLabel) */
  ariaLabel?: string;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * MeasurementSlider - Unit-aware slider component
 *
 * Displays values in the user's preferred unit while storing/returning
 * values in canonical inches. Automatically converts bounds and step sizes.
 */
export function MeasurementSlider({
  value,
  onChange,
  config,
  displayUnit,
  label,
  ariaLabel,
  className,
}: MeasurementSliderProps) {
  // Convert config bounds and step to display unit
  const displayConfig = useMemo(
    () => convertConfigToDisplayUnit(config, displayUnit),
    [config, displayUnit]
  );

  // Convert canonical inches value to display unit value
  const displayValue = useMemo(() => {
    const converted = fromCanonicalInches(value, displayUnit);
    const decimals = DECIMAL_PLACES[displayUnit];
    return Number(converted.toFixed(decimals));
  }, [value, displayUnit]);

  // Handle slider change: convert from display unit back to inches
  const handleChange = useCallback(
    (newDisplayValue: number) => {
      const canonicalInches = toCanonicalInches(newDisplayValue, displayUnit);
      onChange(canonicalInches);
    },
    [displayUnit, onChange]
  );

  // Get the unit suffix for display
  const unitSuffix = getUnitSuffix(displayUnit);

  return (
    <EditableSlider
      label={label}
      value={displayValue}
      onChange={handleChange}
      min={displayConfig.min}
      max={displayConfig.max}
      step={displayConfig.step}
      suffix={unitSuffix}
      defaultValue={displayConfig.defaultValue}
      ariaLabel={ariaLabel || config.ariaLabel}
      className={className}
    />
  );
}
