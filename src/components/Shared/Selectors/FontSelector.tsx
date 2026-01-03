/**
 * FontSelector Component
 *
 * A unified font selector that integrates with the FontContext to provide
 * dynamic access to built-in, Google, and custom fonts.
 *
 * Features:
 * - Dynamic font loading from FontRegistry
 * - Source tabs (All, Built-in, Google, My Fonts)
 * - Search functionality
 * - Category grouping
 * - Upload support for custom fonts
 * - Live font preview
 * - Portal-based dropdown
 *
 * @module components/Shared/FontSelector
 */

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useFonts } from '@/contexts/FontContext';
import styles from '@/styles/components/shared/FontSelector.module.css';
import type { FontCategory, FontDefinition, FontSource } from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

type SourceTab = FontSource | 'all';

interface FontSelectorProps {
  /** Currently selected font family */
  value: string;
  /** Callback when font changes */
  onChange: (family: string) => void;
  /** Filter by sources (if not provided, tabs are shown) */
  sources?: FontSource[];
  /** Filter by categories */
  categories?: FontCategory[];
  /** Show upload button for custom fonts */
  allowUpload?: boolean;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Preview text to display */
  previewText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Show source tabs */
  showTabs?: boolean;
  /** Show search input */
  showSearch?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

// ============================================================================
// Source Tab Labels
// ============================================================================

const SOURCE_TAB_LABELS: Record<SourceTab, string> = {
  all: 'All',
  builtin: 'Built-in',
  google: 'Google',
  custom: 'My Fonts',
};

// ============================================================================
// Component
// ============================================================================

export const FontSelector = memo(function FontSelector({
  value,
  onChange,
  sources,
  categories,
  allowUpload = true,
  size = 'medium',
  previewText = 'Aa',
  disabled = false,
  ariaLabel,
  showTabs = true,
  showSearch = true,
}: FontSelectorProps) {
  const { fonts, isLoading, loadFont, uploadFont, searchFonts } = useFonts();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SourceTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchResults, setSearchResults] = useState<FontDefinition[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search the full Google Fonts catalog when user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchFonts(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFonts]);

  // Filter fonts based on sources, categories, active tab, and search
  const filteredFonts = useMemo(() => {
    // Use search results if searching, otherwise use loaded fonts
    let result = searchQuery.trim() ? searchResults : fonts;

    // Filter by source (props take precedence, then active tab)
    if (sources && sources.length > 0) {
      result = result.filter((f) => sources.includes(f.source));
    } else if (activeTab !== 'all') {
      result = result.filter((f) => f.source === activeTab);
    }

    // Filter by category
    if (categories && categories.length > 0) {
      result = result.filter((f) => categories.includes(f.category));
    }

    return result;
  }, [fonts, searchResults, searchQuery, sources, categories, activeTab]);

  // Group fonts by category
  const groupedFonts = useMemo(() => {
    const groups = new Map<FontCategory, FontDefinition[]>();
    for (const font of filteredFonts) {
      const list = groups.get(font.category) ?? [];
      list.push(font);
      groups.set(font.category, list);
    }
    return groups;
  }, [filteredFonts]);

  // Flattened list for keyboard navigation (all fonts)
  const flatFontList = useMemo(() => {
    const result: FontDefinition[] = [];
    for (const [, fonts] of groupedFonts) {
      result.push(...fonts);
    }
    return result;
  }, [groupedFonts]);

  // Pre-compute index map for O(1) lookup (avoids O(n²) findIndex in render)
  const fontIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatFontList.forEach((font, index) => {
      map.set(font.id, index);
    });
    return map;
  }, [flatFontList]);

  // Find selected font
  const selectedFont = useMemo(() => fonts.find((f) => f.family === value), [fonts, value]);

  // Calculate dropdown position when opening
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 340; // estimated max-height
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
        openUpward,
      });

      // Focus search input when opening
      if (showSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, showSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInContainer = containerRef.current?.contains(target);
      const isInDropdown = dropdownRef.current?.contains(target);

      if (!(isInContainer || isInDropdown)) {
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on scroll
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

  // Handle font selection
  const handleSelect = useCallback(
    async (font: FontDefinition) => {
      try {
        // Load font if not yet loaded
        if (font.status !== 'loaded') {
          await loadFont(font.family);
        }

        // Ensure the font is truly ready for canvas rendering
        // The loadFont call may resolve before the browser has the font ready
        await document.fonts.ready;

        // Double-check with document.fonts.load to ensure this specific font is loaded
        await document.fonts.load(`400 16px "${font.family}"`);

        onChange(font.family);
        setIsOpen(false);
        setFocusedIndex(-1);
        setSearchQuery('');
        buttonRef.current?.focus();
      } catch (error) {
        logger.error('FontSelector', 'Failed to load font', error);
      }
    },
    [loadFont, onChange]
  );

  // Handle file upload
  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const font = await uploadFont(file);
        onChange(font.family);
        setActiveTab('custom');
      } catch (error) {
        logger.error('FontSelector', 'Failed to upload font', error);
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [uploadFont, onChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isOpen && focusedIndex >= 0 && flatFontList[focusedIndex]) {
            handleSelect(flatFontList[focusedIndex]);
          } else if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(flatFontList.findIndex((f) => f.family === value));
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) => (prev < flatFontList.length - 1 ? prev + 1 : 0));
          } else {
            setIsOpen(true);
            setFocusedIndex(flatFontList.findIndex((f) => f.family === value));
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : flatFontList.length - 1));
          } else {
            setIsOpen(true);
            setFocusedIndex(flatFontList.findIndex((f) => f.family === value));
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          setSearchQuery('');
          buttonRef.current?.focus();
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        default:
          break;
      }
    },
    [disabled, isOpen, focusedIndex, flatFontList, value, handleSelect]
  );

  // Toggle dropdown - use startTransition to prevent blocking
  const handleToggle = () => {
    if (disabled) return;
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      startTransition(() => {
        setFocusedIndex(flatFontList.findIndex((f) => f.family === value));
      });
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

  // CSS classes
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
        {/* Search Input */}
        {showSearch && (
          <div className={styles.searchContainer}>
            <input
              ref={searchInputRef}
              type="search"
              className={styles.searchInput}
              placeholder="Search fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search fonts"
            />
          </div>
        )}

        {/* Source Tabs */}
        {showTabs && !sources && (
          <div className={styles.tabs}>
            {(['all', 'builtin', 'google', 'custom'] as SourceTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {SOURCE_TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}

        {/* Font List */}
        <div className={styles.fontList}>
          {isLoading || isSearching ? (
            <div className={styles.loadingState}>Loading fonts...</div>
          ) : groupedFonts.size === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'No fonts match your search' : 'No fonts available'}
            </div>
          ) : (
            Array.from(groupedFonts.entries()).map(([category, categoryFonts]) => (
              <div key={category} className={styles.category}>
                <div className={styles.categoryHeader}>{category}</div>
                {categoryFonts.map((font) => {
                  const currentIndex = fontIndexMap.get(font.id) ?? -1;
                  const isSelected = font.family === value;
                  const isFocused = currentIndex === focusedIndex;

                  return (
                    <div
                      key={font.id}
                      data-index={currentIndex}
                      className={[
                        styles.option,
                        isSelected && styles.optionSelected,
                        isFocused && styles.optionFocused,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelect(font)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(font);
                        }
                      }}
                      onMouseEnter={() => setFocusedIndex(currentIndex)}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={isFocused ? 0 : -1}
                    >
                      {/* Font Preview */}
                      <span
                        className={styles.optionPreview}
                        style={{
                          fontFamily: font.status === 'loaded' ? font.family : 'inherit',
                        }}
                      >
                        {previewText}
                      </span>

                      {/* Font Info */}
                      <div className={styles.optionInfo}>
                        <span className={styles.optionName}>{font.name}</span>
                        <span className={styles.optionMeta}>
                          {font.source === 'google' && <span className={styles.badge}>G</span>}
                          {font.source === 'custom' && (
                            <span className={styles.badgeCustom}>Custom</span>
                          )}
                          {font.isVariable && <span className={styles.badgeVariable}>Var</span>}
                          {font.status === 'loading' && (
                            <span className={styles.loading}>Loading...</span>
                          )}
                        </span>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && <span className={styles.selectedIndicator}>✓</span>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Upload Button */}
        {allowUpload && activeTab === 'custom' && (
          <div className={styles.uploadSection}>
            <label className={styles.uploadButton}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleUpload}
                disabled={isUploading}
                hidden
              />
              {isUploading ? 'Uploading...' : '+ Upload Custom Font'}
            </label>
          </div>
        )}
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
      <div className={previewClasses} style={{ fontFamily: selectedFont?.family || 'inherit' }}>
        <span className={styles.previewText}>{previewText}</span>
      </div>

      {/* Info Section */}
      <div className={styles.info}>
        <span className={styles.fontName}>{selectedFont?.name || 'Select font'}</span>
        {selectedFont?.category && size !== 'small' && (
          <span className={styles.fontCategory}>{selectedFont.category}</span>
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
        {isOpen ? 'Close' : 'Change'}
      </button>

      {/* Dropdown rendered via portal */}
      {renderDropdown()}
    </div>
  );
});

export default FontSelector;
