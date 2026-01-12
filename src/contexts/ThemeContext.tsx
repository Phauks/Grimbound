import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_ID,
  getDarkThemeIds,
  getLightThemeIds,
  getTheme,
  isValidThemeId,
  type ThemeId,
  type ThemeMode,
  UI_THEMES,
  type UITheme,
} from '@/ts/themes';
import {
  deriveAccentColors,
  deriveBackgroundShades,
  deriveBorderColors,
  derivePrimaryColors,
  deriveSyntaxColors,
  deriveTextColors,
} from '@/ts/utils/colorUtils.js';
import { getStorageItem, logger, STORAGE_KEYS, setStorageItem } from '@/ts/utils/index.js';

// ============================================================================
// Types
// ============================================================================

export interface CustomTheme extends UITheme {
  isCustom: true;
}

/** User customizations applied on top of a theme preset */
export interface ThemeOverrides {
  /** Override primary color */
  primary?: string;
  /** Override accent color */
  accent?: string;
  /** Override background base color */
  backgroundBase?: string;
}

interface ThemeContextValue {
  /** Current active theme ID */
  currentThemeId: string;
  /** Current active theme object (with overrides applied) */
  currentTheme: UITheme;
  /** Current theme mode (dark/light) */
  currentMode: ThemeMode;
  /** Set the active theme by ID */
  setTheme: (themeId: string) => void;
  /** All available built-in themes */
  builtInThemes: Record<ThemeId, UITheme>;
  /** User-created custom themes */
  customThemes: CustomTheme[];
  /** Current theme overrides */
  overrides: ThemeOverrides;
  /** Set a specific override value */
  setOverride: (key: keyof ThemeOverrides, value: string | undefined) => void;
  /** Clear all overrides */
  clearOverrides: () => void;
  /** Check if any overrides are active */
  hasOverrides: boolean;
  /** Get dark theme IDs */
  darkThemeIds: ThemeId[];
  /** Get light theme IDs */
  lightThemeIds: ThemeId[];
  /** Add a new custom theme (for future use) */
  addCustomTheme: (theme: Omit<CustomTheme, 'isCustom'>) => void;
  /** Update an existing custom theme (for future use) */
  updateCustomTheme: (
    themeId: string,
    updates: Partial<Omit<CustomTheme, 'id' | 'isCustom'>>
  ) => void;
  /** Remove a custom theme (for future use) */
  removeCustomTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Apply theme CSS variables to the document root
 * Merges base theme variables with any user overrides
 */
function applyThemeVariables(theme: UITheme, overrides: ThemeOverrides): void {
  const root = document.documentElement;
  const isDark = theme.mode === 'dark';

  // Start with base theme variables
  const variables = { ...theme.variables };

  // Apply overrides if present
  if (overrides.primary) {
    const primaryColors = derivePrimaryColors(overrides.primary);
    Object.assign(variables, primaryColors);
  }

  if (overrides.accent) {
    const accentColors = deriveAccentColors(overrides.accent);
    const syntaxColors = deriveSyntaxColors(overrides.accent, isDark);
    Object.assign(variables, accentColors, syntaxColors);
  }

  if (overrides.backgroundBase) {
    const bgShades = deriveBackgroundShades(overrides.backgroundBase, isDark);
    const textColors = deriveTextColors(overrides.backgroundBase, isDark);
    const borderColors = deriveBorderColors(overrides.backgroundBase, isDark);
    Object.assign(variables, bgShades, textColors, borderColors);
  }

  // Apply all variables to document root
  for (const [property, value] of Object.entries(variables)) {
    root.style.setProperty(property, value);
  }

  // Set data attribute for potential CSS-based styling
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-mode', theme.mode);
}

/**
 * Load saved theme ID from localStorage
 */
function loadSavedThemeId(): string {
  const saved = getStorageItem(STORAGE_KEYS.THEME);
  if (saved && (isValidThemeId(saved) || saved.startsWith('custom_'))) {
    return saved;
  }
  return DEFAULT_THEME_ID;
}

/**
 * Load theme overrides from localStorage
 */
function loadSavedOverrides(): ThemeOverrides {
  try {
    const saved = getStorageItem(STORAGE_KEYS.THEME_OVERRIDES);
    if (saved) {
      return JSON.parse(saved) as ThemeOverrides;
    }
  } catch {
    // Invalid JSON
  }
  return {};
}

/**
 * Save theme overrides to localStorage
 */
function saveOverrides(overrides: ThemeOverrides): void {
  if (Object.keys(overrides).length === 0) {
    localStorage.removeItem(STORAGE_KEYS.THEME_OVERRIDES);
  } else {
    setStorageItem(STORAGE_KEYS.THEME_OVERRIDES, JSON.stringify(overrides));
  }
}

/**
 * Load custom themes from localStorage
 */
function loadCustomThemes(): CustomTheme[] {
  try {
    const saved = getStorageItem(STORAGE_KEYS.CUSTOM_THEMES);
    if (saved) {
      return JSON.parse(saved) as CustomTheme[];
    }
  } catch {
    // Invalid JSON
  }
  return [];
}

/**
 * Save custom themes to localStorage
 */
function saveCustomThemes(themes: CustomTheme[]): void {
  setStorageItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(themes));
}

// ============================================================================
// Provider
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentThemeId, setCurrentThemeId] = useState<string>(loadSavedThemeId);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(loadCustomThemes);
  const [overrides, setOverrides] = useState<ThemeOverrides>(loadSavedOverrides);

  // Get the current theme object (before overrides)
  const baseTheme = customThemes.find((t) => t.id === currentThemeId) || getTheme(currentThemeId);

  // Current mode comes from base theme
  const currentMode = baseTheme.mode;

  // Check if any overrides are active
  const hasOverrides = Object.values(overrides).some((v) => v !== undefined);

  // Compute theme IDs by mode
  const darkThemeIds = getDarkThemeIds();
  const lightThemeIds = getLightThemeIds();

  // Apply theme CSS variables on mount and when theme or overrides change
  // This is a DOM side effect and must remain as useEffect
  useEffect(() => {
    applyThemeVariables(baseTheme, overrides);
  }, [baseTheme, overrides]);

  const setTheme = (themeId: string) => {
    // Validate the theme exists (either built-in or custom)
    const isBuiltIn = isValidThemeId(themeId);
    const isCustom = customThemes.some((t) => t.id === themeId);

    if (isBuiltIn || isCustom) {
      setCurrentThemeId(themeId);
      setStorageItem(STORAGE_KEYS.THEME, themeId);
      // Clear overrides when switching themes
      setOverrides({});
      saveOverrides({});
    } else {
      logger.warn('ThemeContext', `Theme "${themeId}" not found, falling back to default`);
      setCurrentThemeId(DEFAULT_THEME_ID);
      setStorageItem(STORAGE_KEYS.THEME, DEFAULT_THEME_ID);
    }
  };

  const setOverride = (key: keyof ThemeOverrides, value: string | undefined) => {
    setOverrides((prev) => {
      const updated = { ...prev };
      if (value === undefined) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      // Persist to localStorage in the setter (no separate effect needed)
      saveOverrides(updated);
      return updated;
    });
  };

  const clearOverrides = () => {
    setOverrides({});
    saveOverrides({});
  };

  const addCustomTheme = (theme: Omit<CustomTheme, 'isCustom'>) => {
    const newTheme: CustomTheme = {
      ...theme,
      isCustom: true,
    };
    setCustomThemes((prev) => {
      const updated = [...prev, newTheme];
      saveCustomThemes(updated);
      return updated;
    });
  };

  const updateCustomTheme = (
    themeId: string,
    updates: Partial<Omit<CustomTheme, 'id' | 'isCustom'>>
  ) => {
    setCustomThemes((prev) => {
      const updated = prev.map((theme) =>
        theme.id === themeId ? { ...theme, ...updates } : theme
      );
      saveCustomThemes(updated);
      return updated;
    });
  };

  const removeCustomTheme = (themeId: string) => {
    setCustomThemes((prev) => {
      const updated = prev.filter((theme) => theme.id !== themeId);
      saveCustomThemes(updated);
      return updated;
    });

    // If removing the active theme, switch to default
    if (currentThemeId === themeId) {
      setCurrentThemeId(DEFAULT_THEME_ID);
    }
  };

  const value: ThemeContextValue = {
    currentThemeId,
    currentTheme: baseTheme,
    currentMode,
    setTheme,
    builtInThemes: UI_THEMES,
    customThemes,
    overrides,
    setOverride,
    clearOverrides,
    hasOverrides,
    darkThemeIds,
    lightThemeIds,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
