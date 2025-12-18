/**
 * FontPreviewSelector Component
 *
 * A unified font selector that shows a live preview of the selected font,
 * matching the design pattern of ColorPreviewSelector and AssetPreviewSelector.
 *
 * Features:
 * - Live font preview with actual rendered text
 * - Dropdown with font previews for each option
 * - Category grouping for organized selection
 * - Consistent "preview + info + action" layout
 * - Portal-based dropdown to avoid overflow clipping
 *
 * @module components/Shared/FontPreviewSelector
 */

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/components/shared/FontPreviewSelector.module.css';

// ============================================================================
// Types
// ============================================================================

export interface FontOption {
  /** Font family value (as used in CSS/canvas) */
  value: string;
  /** Display label for the font */
  label: string;
  /** Category for grouping (e.g., 'Display', 'Sans Serif', 'Decorative') */
  category?: string;
  /** Optional preview text override */
  previewText?: string;
}

export interface FontPreviewSelectorProps {
  /** Currently selected font value */
  value: string;
  /** Called when font selection changes */
  onChange: (value: string) => void;
  /** Available font options */
  options: FontOption[];
  /** Display label (shown above the selector) */
  label?: string;
  /** Preview text to display in the font */
  previewText?: string;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Show category badges */
  showCategory?: boolean;
}

// ============================================================================
// Types for positioning
// ============================================================================

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const FontPreviewSelector = memo(function FontPreviewSelector({
  value,
  onChange,
  options,
  label: _label,
  previewText = 'Aa',
  size = 'medium',
  disabled = false,
  ariaLabel,
  showCategory = true,
}: FontPreviewSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Find the currently selected option
  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Calculate dropdown position when opening
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 280; // max-height from CSS
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Determine if we should open upward
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUpward,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInContainer = containerRef.current?.contains(target);
      const isInDropdown = dropdownRef.current?.contains(target);

      if (!(isInContainer || isInDropdown)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on scroll (optional - prevents misaligned dropdowns)
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            onChange(options[focusedIndex].value);
            setIsOpen(false);
            buttonRef.current?.focus();
          } else {
            setIsOpen(!isOpen);
            setFocusedIndex(options.findIndex((opt) => opt.value === value));
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(options.findIndex((opt) => opt.value === value));
          } else {
            setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(options.findIndex((opt) => opt.value === value));
          } else {
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [disabled, isOpen, focusedIndex, options, value, onChange]
  );

  // Handle option selection
  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  // Toggle dropdown
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFocusedIndex(options.findIndex((opt) => opt.value === value));
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && dropdownRef.current) {
      const focusedElement = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  // CSS class construction
  const containerClasses = [
    styles.container,
    size === 'small' && styles.compact,
    disabled && styles.disabled,
    isOpen && styles.open,
  ]
    .filter(Boolean)
    .join(' ');

  const previewClasses = [
    styles.preview,
    styles[`preview${size.charAt(0).toUpperCase()}${size.slice(1)}`],
  ]
    .filter(Boolean)
    .join(' ');

  // Render dropdown via portal
  const renderDropdown = () => {
    if (!(isOpen && dropdownPosition)) return null;

    const dropdownStyle: React.CSSProperties = {
      position: 'fixed',
      top: dropdownPosition.openUpward ? 'auto' : dropdownPosition.top,
      bottom: dropdownPosition.openUpward ? window.innerHeight - dropdownPosition.top : 'auto',
      left: dropdownPosition.left,
      width: dropdownPosition.width,
      zIndex: 10000,
    };

    const dropdown = (
      <div
        ref={dropdownRef}
        className={`${styles.dropdown} ${dropdownPosition.openUpward ? styles.dropdownUpward : ''}`}
        style={dropdownStyle}
        role="listbox"
        aria-label="Font options"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isFocused = index === focusedIndex;

          return (
            <div
              key={option.value}
              data-index={index}
              className={[
                styles.option,
                isSelected && styles.optionSelected,
                isFocused && styles.optionFocused,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleOptionClick(option.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOptionClick(option.value);
                }
              }}
              onMouseEnter={() => setFocusedIndex(index)}
              role="option"
              aria-selected={isSelected}
              tabIndex={isFocused ? 0 : -1}
            >
              {/* Font Preview in Option */}
              <span className={styles.optionPreview} style={{ fontFamily: option.value }}>
                {option.previewText || previewText}
              </span>

              {/* Option Info */}
              <div className={styles.optionInfo}>
                <span className={styles.optionLabel}>{option.label}</span>
                {showCategory && option.category && (
                  <span className={styles.optionCategory}>{option.category}</span>
                )}
              </div>

              {/* Selected Indicator */}
              {isSelected && <span className={styles.selectedIndicator}>✓</span>}
            </div>
          );
        })}
      </div>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-label={ariaLabel ?? 'Select font'}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      tabIndex={0}
    >
      {/* Font Preview Box */}
      <div className={previewClasses} style={{ fontFamily: selectedOption?.value || 'inherit' }}>
        <span className={styles.previewText}>{selectedOption?.previewText || previewText}</span>
      </div>

      {/* Info Section */}
      <div className={styles.info}>
        <span className={styles.fontName}>{selectedOption?.label || 'Select font'}</span>
        {showCategory && selectedOption?.category && size !== 'small' && (
          <span className={styles.category}>{selectedOption.category}</span>
        )}
      </div>

      {/* Change Button */}
      <button
        ref={buttonRef}
        type="button"
        className={styles.changeButton}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isOpen ? 'Close' : 'Customize'}
      </button>

      {/* Dropdown rendered via portal */}
      {renderDropdown()}
    </div>
  );
});

export default FontPreviewSelector;
