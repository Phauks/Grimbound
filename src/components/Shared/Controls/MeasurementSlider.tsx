/**
 * MeasurementSlider Component
 *
 * A wrapper around SliderWithValue that automatically handles unit conversion
 * between inches and millimeters. All values are stored in canonical inches
 * internally, but displayed in the user's preferred unit.
 *
 * Usage:
 * ```tsx
 * <MeasurementSlider
 *   value={0.125}  // Value in inches
 *   onChange={(inches) => setOffset(inches)}
 *   config={ICON_OFFSET_CONFIG}
 *   displayUnit="millimeters"  // Shows "3.18mm"
 * />
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { MeasurementConfig, MeasurementUnit } from '../../../ts/types/measurement';
import {
  convertConfigToDisplayUnit,
  DECIMAL_PLACES,
  fromCanonicalInches,
  getUnitSuffix,
  toCanonicalInches,
} from '../../../ts/utils/measurementUtils';
import { SliderWithValue } from './SliderWithValue';

interface MeasurementSliderProps {
  /** Value in canonical inches */
  value: number;
  /** Called with value in canonical inches when changed */
  onChange: (inches: number) => void;
  /** Measurement configuration defining bounds and defaults (all in inches) */
  config: MeasurementConfig;
  /** User's preferred display unit */
  displayUnit: MeasurementUnit;
  /** Custom aria label override (defaults to config.ariaLabel) */
  ariaLabel?: string;
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
  ariaLabel,
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
    <SliderWithValue
      value={displayValue}
      onChange={handleChange}
      min={displayConfig.min}
      max={displayConfig.max}
      step={displayConfig.step}
      defaultValue={displayConfig.defaultValue}
      unit={unitSuffix}
      ariaLabel={ariaLabel || config.ariaLabel}
    />
  );
}
