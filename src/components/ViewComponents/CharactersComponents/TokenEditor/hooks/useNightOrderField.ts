/**
 * useNightOrderField - Hook for managing night order reminder and order value
 *
 * Handles first night and other night reminder text with order numbers.
 *
 * @module components/CharactersComponents/TokenEditor/hooks/useNightOrderField
 */

import { useRef, useState } from 'react';
import { useControlledField } from '@/hooks/ui/useControlledField';
import { TIMING } from '@/ts/constants.js';
import type { Character } from '@/ts/types/index.js';

export interface NightOrderHandlers {
  reminderValue: string;
  orderValue: number;
  onReminderChange: (value: string) => void;
  /** Blur handler - flushes debounced value (parent manages local state) */
  onReminderBlur: () => void;
  onOrderChange: (value: number) => void;
  onOrderBlur: (value: number) => void;
}

export function useNightOrderField(
  initialReminder: string,
  initialOrder: number,
  reminderField: 'firstNightReminder' | 'otherNightReminder',
  orderField: 'firstNight' | 'otherNight',
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void,
  disabled: boolean
): NightOrderHandlers {
  // Use centralized controlled field hook for reminder text
  const reminder = useControlledField({
    value: initialReminder,
    onChange: (value) => onEditChange(reminderField, value),
    debounceMs: TIMING.METADATA_DEBOUNCE,
    disabled,
  });

  // Order value is a number, use simple state (no cursor issues with number inputs)
  const [orderValue, setOrderValue] = useState(initialOrder);
  const lastSentOrderRef = useRef<number>(initialOrder);

  // Track previous prop for render-time comparison (React's recommended pattern)
  const [prevInitialOrder, setPrevInitialOrder] = useState(initialOrder);

  // Sync order during render when prop changes (faster than useEffect)
  if (initialOrder !== prevInitialOrder) {
    setPrevInitialOrder(initialOrder);
    if (initialOrder !== lastSentOrderRef.current) {
      setOrderValue(initialOrder);
      lastSentOrderRef.current = initialOrder;
    }
  }

  const onOrderChange = (value: number) => {
    setOrderValue(value);
  };

  const onOrderBlur = (value: number) => {
    lastSentOrderRef.current = value;
    onEditChange(orderField, value);
  };

  return {
    reminderValue: reminder.localValue,
    orderValue,
    onReminderChange: reminder.handleChange,
    onReminderBlur: reminder.handleBlur,
    onOrderChange,
    onOrderBlur,
  };
}
