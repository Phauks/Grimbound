/**
 * UI Theme Definitions
 * 
 * Defines color themes for the application UI chrome.
 * Team colors remain consistent across all themes for game clarity.
 */

export interface UITheme {
  id: string
  name: string
  description: string
  icon: string
  variables: Record<string, string>
}

export type ThemeId = 
  | 'crimson-sun'
  | 'pucks-purple'
  | 'saints-salvation'
  | 'quiet-night'
  | 'sinners-delight'
  | 'star-blast'

export const DEFAULT_THEME_ID: ThemeId = 'crimson-sun'

export const UI_THEMES: Record<ThemeId, UITheme> = {
  'crimson-sun': {
    id: 'crimson-sun',
    name: 'Crimson Sun',
    description: 'The classic dark theme with warm crimson and gold accents',
    icon: '☀️',
    variables: {
      // Background Colors
      '--bg-main': '#1a1a1a',
      '--bg-primary': '#1a1a1a',
      '--bg-panel': '#252525',
      '--bg-card': '#2d2d2d',
      '--bg-input': '#3a3a3a',
      '--bg-hover': '#404040',
      '--bg-tertiary': '#333333',
      '--bg-secondary': '#2a2a2a',
      '--color-background': '#1a1a1a',
      
      // Brand/Accent Colors
      '--color-primary': '#8b0000',
      '--color-primary-dark': '#5c0000',
      '--color-primary-light': '#b30000',
      '--color-primary-subtle': 'rgba(139, 0, 0, 0.1)',
      '--color-accent': '#c9a227',
      '--color-accent-light': '#e6c34a',
      '--color-accent-dark': '#a88620',
      '--accent-rgb': '201, 162, 39',
      
      // Text Colors
      '--text-primary': '#f5f5f5',
      '--text-secondary': '#b0b0b0',
      '--text-muted': '#808080',
      '--text-disabled': '#666666',
      
      // Border Colors
      '--border-color': '#404040',
      '--border-color-light': '#555555',
    }
  },

  'pucks-purple': {
    id: 'pucks-purple',
    name: "Puck's Purple",
    description: 'A mystical purple theme inspired by mischievous fae',
    icon: '🔮',
    variables: {
      // Background Colors
      '--bg-main': '#1a1a2e',
      '--bg-primary': '#1a1a2e',
      '--bg-panel': '#252547',
      '--bg-card': '#2d2d5a',
      '--bg-input': '#3a3a6a',
      '--bg-hover': '#4a4a7a',
      '--bg-tertiary': '#33335a',
      '--bg-secondary': '#2a2a4a',
      '--color-background': '#1a1a2e',
      
      // Brand/Accent Colors
      '--color-primary': '#6b2d8b',
      '--color-primary-dark': '#4a1f5c',
      '--color-primary-light': '#8b3db0',
      '--color-primary-subtle': 'rgba(107, 45, 139, 0.1)',
      '--color-accent': '#a855f7',
      '--color-accent-light': '#c084fc',
      '--color-accent-dark': '#7c3aed',
      '--accent-rgb': '168, 85, 247',
      
      // Text Colors
      '--text-primary': '#f0e6ff',
      '--text-secondary': '#b8a8d0',
      '--text-muted': '#8878a0',
      '--text-disabled': '#605878',
      
      // Border Colors
      '--border-color': '#4a4a7a',
      '--border-color-light': '#5a5a8a',
    }
  },

  'saints-salvation': {
    id: 'saints-salvation',
    name: "Saint's Salvation",
    description: 'A serene blue theme of divine protection',
    icon: '🕊️',
    variables: {
      // Background Colors
      '--bg-main': '#0f1729',
      '--bg-primary': '#0f1729',
      '--bg-panel': '#1a2744',
      '--bg-card': '#243555',
      '--bg-input': '#2e4466',
      '--bg-hover': '#385577',
      '--bg-tertiary': '#203050',
      '--bg-secondary': '#182540',
      '--color-background': '#0f1729',
      
      // Brand/Accent Colors
      '--color-primary': '#1e40af',
      '--color-primary-dark': '#1e3a8a',
      '--color-primary-light': '#3b82f6',
      '--color-primary-subtle': 'rgba(30, 64, 175, 0.1)',
      '--color-accent': '#38bdf8',
      '--color-accent-light': '#7dd3fc',
      '--color-accent-dark': '#0ea5e9',
      '--accent-rgb': '56, 189, 248',
      
      // Text Colors
      '--text-primary': '#e0f2fe',
      '--text-secondary': '#94c4e8',
      '--text-muted': '#6898c0',
      '--text-disabled': '#4a7098',
      
      // Border Colors
      '--border-color': '#385577',
      '--border-color-light': '#486688',
    }
  },

  'quiet-night': {
    id: 'quiet-night',
    name: 'Quiet Night',
    description: 'A deep black theme for the darkest hours',
    icon: '🌙',
    variables: {
      // Background Colors
      '--bg-main': '#0a0a0a',
      '--bg-primary': '#0a0a0a',
      '--bg-panel': '#141414',
      '--bg-card': '#1a1a1a',
      '--bg-input': '#242424',
      '--bg-hover': '#2e2e2e',
      '--bg-tertiary': '#1e1e1e',
      '--bg-secondary': '#121212',
      '--color-background': '#0a0a0a',
      
      // Brand/Accent Colors
      '--color-primary': '#4a4a4a',
      '--color-primary-dark': '#3a3a3a',
      '--color-primary-light': '#5a5a5a',
      '--color-primary-subtle': 'rgba(74, 74, 74, 0.1)',
      '--color-accent': '#888888',
      '--color-accent-light': '#aaaaaa',
      '--color-accent-dark': '#666666',
      '--accent-rgb': '136, 136, 136',
      
      // Text Colors
      '--text-primary': '#e0e0e0',
      '--text-secondary': '#a0a0a0',
      '--text-muted': '#707070',
      '--text-disabled': '#505050',
      
      // Border Colors
      '--border-color': '#2e2e2e',
      '--border-color-light': '#3e3e3e',
    }
  },

  'sinners-delight': {
    id: 'sinners-delight',
    name: "Sinner's Delight",
    description: 'A fiery red theme of temptation and danger',
    icon: '😈',
    variables: {
      // Background Colors
      '--bg-main': '#1a0a0a',
      '--bg-primary': '#1a0a0a',
      '--bg-panel': '#2a1515',
      '--bg-card': '#351c1c',
      '--bg-input': '#452525',
      '--bg-hover': '#553030',
      '--bg-tertiary': '#301818',
      '--bg-secondary': '#251010',
      '--color-background': '#1a0a0a',
      
      // Brand/Accent Colors
      '--color-primary': '#b91c1c',
      '--color-primary-dark': '#991b1b',
      '--color-primary-light': '#dc2626',
      '--color-primary-subtle': 'rgba(185, 28, 28, 0.1)',
      '--color-accent': '#f87171',
      '--color-accent-light': '#fca5a5',
      '--color-accent-dark': '#ef4444',
      '--accent-rgb': '248, 113, 113',
      
      // Text Colors
      '--text-primary': '#fee2e2',
      '--text-secondary': '#d8a8a8',
      '--text-muted': '#a87878',
      '--text-disabled': '#785858',
      
      // Border Colors
      '--border-color': '#553030',
      '--border-color-light': '#654040',
    }
  },

  'star-blast': {
    id: 'star-blast',
    name: 'Star Blast',
    description: 'A radiant yellow theme of celestial power',
    icon: '⭐',
    variables: {
      // Background Colors
      '--bg-main': '#1a1708',
      '--bg-primary': '#1a1708',
      '--bg-panel': '#2a2510',
      '--bg-card': '#3a3318',
      '--bg-input': '#4a4220',
      '--bg-hover': '#5a5228',
      '--bg-tertiary': '#302a14',
      '--bg-secondary': '#25200c',
      '--color-background': '#1a1708',
      
      // Brand/Accent Colors
      '--color-primary': '#a16207',
      '--color-primary-dark': '#854d0e',
      '--color-primary-light': '#ca8a04',
      '--color-primary-subtle': 'rgba(161, 98, 7, 0.1)',
      '--color-accent': '#facc15',
      '--color-accent-light': '#fde047',
      '--color-accent-dark': '#eab308',
      '--accent-rgb': '250, 204, 21',
      
      // Text Colors
      '--text-primary': '#fef9c3',
      '--text-secondary': '#d8c888',
      '--text-muted': '#a89858',
      '--text-disabled': '#786838',
      
      // Border Colors
      '--border-color': '#5a5228',
      '--border-color-light': '#6a6238',
    }
  }
}

/**
 * Get all available theme IDs
 */
export function getThemeIds(): ThemeId[] {
  return Object.keys(UI_THEMES) as ThemeId[]
}

/**
 * Get a theme by ID, falling back to default if not found
 */
export function getTheme(id: string): UITheme {
  return UI_THEMES[id as ThemeId] || UI_THEMES[DEFAULT_THEME_ID]
}

/**
 * Check if a theme ID is valid
 */
export function isValidThemeId(id: string): id is ThemeId {
  return id in UI_THEMES
}
