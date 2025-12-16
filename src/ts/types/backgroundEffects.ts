/**
 * Background Effects Type Definitions
 *
 * Types for the enhanced background styling system including gradients,
 * procedural textures, and visual effects for token generation.
 */

// ============================================================================
// BASE MODE & GRADIENT TYPES
// ============================================================================

/**
 * Background base mode - solid color or gradient
 * Note: 'image' mode uses the existing asset system, not BackgroundStyle
 */
export type BackgroundBaseMode = 'solid' | 'gradient'

/**
 * Gradient types supported by the background system
 */
export type GradientType = 'linear' | 'radial' | 'conic'

/**
 * Gradient configuration for backgrounds
 */
export interface GradientConfig {
  /** Type of gradient */
  type: GradientType
  /** Starting color (hex format) */
  colorStart: string
  /** Ending color (hex format) */
  colorEnd: string
  /** Rotation in degrees (0-360) - used by linear and conic */
  rotation: number
  /** Center X position (0-1) - used by radial, default 0.5 */
  centerX?: number
  /** Center Y position (0-1) - used by radial, default 0.5 */
  centerY?: number
}

// ============================================================================
// TEXTURE TYPES
// ============================================================================

/**
 * Procedural texture overlay types
 */
export type TextureType =
  | 'none'           // No texture overlay
  | 'marble'         // Organic flowing swirl patterns like marble stone
  | 'clouds'         // Soft billowy plasma gradients
  | 'watercolor'     // Bleeding color edges like wet watercolor
  | 'perlin'         // Smooth mathematical noise - subtle organic undulation
  | 'radial-fade'    // Edge-to-center fade
  | 'organic-cells'  // Voronoi/cell-like patterns
  | 'silk-flow'      // Flowing silk-like directional texture
  | 'parchment'      // Aged paper with grain and subtle variations
  | 'linen'          // Woven fabric crosshatch texture
  | 'wood-grain'     // Directional wood patterns
  | 'brushed-metal'  // Linear brushed metal streaks

/**
 * Blend mode for texture overlay
 */
export type TextureBlendMode = 'normal' | 'overlay' | 'multiply' | 'screen' | 'soft-light' | 'hard-light'

/**
 * Texture overlay configuration
 */
export interface TextureConfig {
  /** Type of texture to apply */
  type: TextureType
  /** Intensity of texture overlay (0-100), default 30 */
  intensity: number
  /** Scale of texture details (0.5-2.0), default 1.0 */
  scale: number
  /** Seed for reproducible patterns (optional) */
  seed?: number
  /** When true, generate a unique random seed for each token (unique textures per token) */
  randomizeSeedPerToken?: boolean
  /** Optional tint color to apply to texture */
  tintColor?: string
  /** Whether tint is enabled */
  tintEnabled?: boolean
  /** Contrast adjustment (-50 to 50), default 0 */
  contrast?: number
  /** Blend mode for combining texture with background */
  blendMode?: TextureBlendMode
}

// ============================================================================
// VISUAL EFFECTS
// ============================================================================

/**
 * Light/color adjustment configuration
 */
export interface LightConfig {
  /** Brightness adjustment (0-200), default 100 (no change) */
  brightness: number
  /** Contrast adjustment (0-200), default 100 (no change) */
  contrast: number
  /** Saturation adjustment (0-200), default 100 (no change) */
  saturation: number
  /** Vibrance adjustment - smart saturation (0-200), default 100 (no change) */
  vibrance: number
}

/**
 * Visual effects configuration
 */
export interface EffectsConfig {
  // Vignette (edge darkening)
  /** Enable vignette effect */
  vignetteEnabled: boolean
  /** Vignette intensity (0-100), default 20 */
  vignetteIntensity: number
  /** Vignette color, default '#000000' */
  vignetteColor: string

  // Inner glow/shadow
  /** Enable inner glow effect */
  innerGlowEnabled: boolean
  /** Inner glow color */
  innerGlowColor: string
  /** Inner glow radius as percentage of diameter (0-50), default 10 */
  innerGlowRadius: number
  /** Inner glow intensity (0-100), default 30 */
  innerGlowIntensity: number

  // Hue shift (legacy - kept for backwards compatibility)
  /** Enable hue shift effect */
  hueShiftEnabled: boolean
  /** Hue shift in degrees (0-360) */
  hueShiftDegrees: number
}

// ============================================================================
// COMPLETE BACKGROUND STYLE
// ============================================================================

/**
 * Background source type - styled (procedural) or image
 */
export type BackgroundSourceType = 'styled' | 'image'

/**
 * Complete background style configuration
 *
 * Unified configuration for both styled (procedural) and image-based backgrounds.
 * Light/color adjustments apply to both source types.
 */
export interface BackgroundStyle {
  /** Source type: styled (procedural) or image */
  sourceType: BackgroundSourceType
  /** Image URL or asset identifier when sourceType is 'image' */
  imageUrl?: string
  /** Base mode: solid color or gradient (used when sourceType is 'styled') */
  mode: BackgroundBaseMode
  /** Solid color (hex format), used when mode is 'solid' */
  solidColor: string
  /** Gradient configuration, used when mode is 'gradient' */
  gradient: GradientConfig
  /** Texture overlay configuration */
  texture: TextureConfig
  /** Visual effects configuration */
  effects: EffectsConfig
  /** Light and color adjustment configuration */
  light: LightConfig
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default gradient configuration
 */
export const DEFAULT_GRADIENT_CONFIG: GradientConfig = {
  type: 'linear',
  colorStart: '#FFFFFF',
  colorEnd: '#E0E0E0',
  rotation: 45,
  centerX: 0.5,
  centerY: 0.5,
}

/**
 * Default texture configuration
 */
export const DEFAULT_TEXTURE_CONFIG: TextureConfig = {
  type: 'none',
  intensity: 30,
  scale: 1.0,
  seed: 12345,
  randomizeSeedPerToken: false,
  tintColor: '#FFFFFF',
  tintEnabled: false,
  contrast: 0,
  blendMode: 'normal',
}

/**
 * Default effects configuration
 */
export const DEFAULT_EFFECTS_CONFIG: EffectsConfig = {
  vignetteEnabled: false,
  vignetteIntensity: 20,
  vignetteColor: '#000000',
  innerGlowEnabled: false,
  innerGlowColor: '#C9A227', // Gold accent
  innerGlowRadius: 10,
  innerGlowIntensity: 30,
  hueShiftEnabled: false,
  hueShiftDegrees: 0,
}

/**
 * Default light/color adjustment configuration
 */
export const DEFAULT_LIGHT_CONFIG: LightConfig = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  vibrance: 100,
}

/**
 * Default background style configuration
 */
export const DEFAULT_BACKGROUND_STYLE: BackgroundStyle = {
  sourceType: 'styled',
  imageUrl: undefined,
  mode: 'solid',
  solidColor: '#FFFFFF',
  gradient: DEFAULT_GRADIENT_CONFIG,
  texture: DEFAULT_TEXTURE_CONFIG,
  effects: DEFAULT_EFFECTS_CONFIG,
  light: DEFAULT_LIGHT_CONFIG,
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Texture option for UI display
 */
export interface TextureOption {
  value: TextureType
  label: string
  description: string
  /** ASCII preview characters for visual hint */
  preview?: string
}

/**
 * Available texture options for the UI
 */
export const TEXTURE_OPTIONS: TextureOption[] = [
  { value: 'none', label: 'None', description: 'No texture overlay' },
  { value: 'marble', label: 'Marble', description: 'Organic flowing patterns', preview: '░▒▓░▒░' },
  { value: 'clouds', label: 'Clouds', description: 'Billowy plasma gradients', preview: '▒░░░░▒' },
  { value: 'watercolor', label: 'Watercolor', description: 'Bleeding color edges', preview: '▓▒░░▒▓' },
  { value: 'perlin', label: 'Perlin', description: 'Smooth organic undulation', preview: '░░▒░░▒' },
  { value: 'radial-fade', label: 'Radial', description: 'Center-to-edge fade', preview: '●○○○●' },
  { value: 'organic-cells', label: 'Cells', description: 'Cell-like patterns', preview: '⬡⬢⬡⬢⬡' },
  { value: 'silk-flow', label: 'Silk', description: 'Flowing silk texture', preview: '≈≈≈≈≈' },
  { value: 'parchment', label: 'Parchment', description: 'Aged paper grain', preview: '░▒░▒░' },
  { value: 'linen', label: 'Linen', description: 'Woven fabric texture', preview: '╬╬╬╬╬' },
  { value: 'wood-grain', label: 'Wood', description: 'Directional wood patterns', preview: '║║║║║' },
  { value: 'brushed-metal', label: 'Metal', description: 'Linear brushed metal', preview: '─────' },
]

/**
 * Gradient type option for UI display
 */
export interface GradientTypeOption {
  value: GradientType
  label: string
}

/**
 * Available gradient types for the UI
 */
export const GRADIENT_TYPE_OPTIONS: GradientTypeOption[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'conic', label: 'Conic' },
]

/**
 * Blend mode option for UI display
 */
export interface BlendModeOption {
  value: TextureBlendMode
  label: string
  description: string
}

/**
 * Available blend modes for texture overlay
 */
export const BLEND_MODE_OPTIONS: BlendModeOption[] = [
  { value: 'normal', label: 'Normal', description: 'Standard overlay' },
  { value: 'overlay', label: 'Overlay', description: 'Enhances contrast' },
  { value: 'multiply', label: 'Multiply', description: 'Darkens colors' },
  { value: 'screen', label: 'Screen', description: 'Lightens colors' },
  { value: 'soft-light', label: 'Soft Light', description: 'Subtle blending' },
  { value: 'hard-light', label: 'Hard Light', description: 'Intense contrast' },
]

// ============================================================================
// BACKGROUND STYLE PRESETS
// ============================================================================

/**
 * Preset option for UI display
 */
export interface BackgroundPresetOption {
  id: string
  label: string
  description: string
  style: BackgroundStyle
}

/**
 * Pre-configured background style presets for quick selection
 */
export const BACKGROUND_PRESETS: BackgroundPresetOption[] = [
  {
    id: 'classic-white',
    label: 'Classic White',
    description: 'Clean white background',
    style: {
      sourceType: 'styled',
      mode: 'solid',
      solidColor: '#FFFFFF',
      gradient: DEFAULT_GRADIENT_CONFIG,
      texture: { ...DEFAULT_TEXTURE_CONFIG, type: 'none' },
      effects: { ...DEFAULT_EFFECTS_CONFIG },
      light: DEFAULT_LIGHT_CONFIG,
    },
  },
  {
    id: 'elegant-cream',
    label: 'Elegant Cream',
    description: 'Warm parchment with subtle texture',
    style: {
      sourceType: 'styled',
      mode: 'solid',
      solidColor: '#F5F0E6',
      gradient: DEFAULT_GRADIENT_CONFIG,
      texture: {
        type: 'parchment',
        intensity: 25,
        scale: 1.0,
        seed: 42,
        randomizeSeedPerToken: false,
        blendMode: 'soft-light',
        contrast: 5,
      },
      effects: {
        vignetteEnabled: true,
        vignetteIntensity: 15,
        vignetteColor: '#8B7355',
        innerGlowEnabled: false,
        innerGlowColor: '#C9A227',
        innerGlowRadius: 10,
        innerGlowIntensity: 30,
        hueShiftEnabled: false,
        hueShiftDegrees: 0,
      },
      light: DEFAULT_LIGHT_CONFIG,
    },
  },
  {
    id: 'aged-parchment',
    label: 'Aged Parchment',
    description: 'Weathered antique paper look',
    style: {
      sourceType: 'styled',
      mode: 'gradient',
      solidColor: '#E8DCC4',
      gradient: {
        type: 'radial',
        colorStart: '#F2E8D8',
        colorEnd: '#D4C4A8',
        rotation: 0,
        centerX: 0.5,
        centerY: 0.5,
      },
      texture: {
        type: 'parchment',
        intensity: 40,
        scale: 1.2,
        seed: 7890,
        randomizeSeedPerToken: false,
        blendMode: 'multiply',
        contrast: 15,
      },
      effects: {
        vignetteEnabled: true,
        vignetteIntensity: 30,
        vignetteColor: '#5C4A32',
        innerGlowEnabled: false,
        innerGlowColor: '#C9A227',
        innerGlowRadius: 10,
        innerGlowIntensity: 30,
        hueShiftEnabled: false,
        hueShiftDegrees: 0,
      },
      light: { brightness: 95, contrast: 110, saturation: 90, vibrance: 100 },
    },
  },
  {
    id: 'blood-moon',
    label: 'Blood Moon',
    description: 'Deep crimson with dark vignette',
    style: {
      sourceType: 'styled',
      mode: 'gradient',
      solidColor: '#8B0000',
      gradient: {
        type: 'radial',
        colorStart: '#B22222',
        colorEnd: '#4A0000',
        rotation: 0,
        centerX: 0.5,
        centerY: 0.5,
      },
      texture: {
        type: 'marble',
        intensity: 30,
        scale: 1.0,
        seed: 666,
        randomizeSeedPerToken: false,
        blendMode: 'soft-light',
        contrast: 10,
      },
      effects: {
        vignetteEnabled: true,
        vignetteIntensity: 45,
        vignetteColor: '#1A0000',
        innerGlowEnabled: true,
        innerGlowColor: '#FF4500',
        innerGlowRadius: 8,
        innerGlowIntensity: 20,
        hueShiftEnabled: false,
        hueShiftDegrees: 0,
      },
      light: { brightness: 90, contrast: 115, saturation: 120, vibrance: 110 },
    },
  },
  {
    id: 'night-sky',
    label: 'Night Sky',
    description: 'Deep blue with celestial feel',
    style: {
      sourceType: 'styled',
      mode: 'gradient',
      solidColor: '#0D1B2A',
      gradient: {
        type: 'radial',
        colorStart: '#1B3A5F',
        colorEnd: '#0D1B2A',
        rotation: 0,
        centerX: 0.5,
        centerY: 0.4,
      },
      texture: {
        type: 'clouds',
        intensity: 20,
        scale: 0.8,
        seed: 9999,
        randomizeSeedPerToken: false,
        blendMode: 'screen',
        contrast: 0,
      },
      effects: {
        vignetteEnabled: true,
        vignetteIntensity: 35,
        vignetteColor: '#000011',
        innerGlowEnabled: true,
        innerGlowColor: '#4169E1',
        innerGlowRadius: 12,
        innerGlowIntensity: 15,
        hueShiftEnabled: false,
        hueShiftDegrees: 0,
      },
      light: { brightness: 95, contrast: 105, saturation: 110, vibrance: 105 },
    },
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    description: 'Warm sunset gradient',
    style: {
      sourceType: 'styled',
      mode: 'gradient',
      solidColor: '#FFD700',
      gradient: {
        type: 'linear',
        colorStart: '#FFE4B5',
        colorEnd: '#DAA520',
        rotation: 135,
        centerX: 0.5,
        centerY: 0.5,
      },
      texture: {
        type: 'silk-flow',
        intensity: 25,
        scale: 1.1,
        seed: 1234,
        randomizeSeedPerToken: false,
        blendMode: 'overlay',
        contrast: 5,
      },
      effects: {
        vignetteEnabled: true,
        vignetteIntensity: 20,
        vignetteColor: '#8B4513',
        innerGlowEnabled: true,
        innerGlowColor: '#FFD700',
        innerGlowRadius: 15,
        innerGlowIntensity: 25,
        hueShiftEnabled: false,
        hueShiftDegrees: 0,
      },
      light: { brightness: 105, contrast: 100, saturation: 115, vibrance: 110 },
    },
  },
  {
    id: 'forest-depths',
    label: 'Forest Depths',
    description: 'Dark green woodland atmosphere',
    style: {
      sourceType: 'styled',
      mode: 'gradient',
      solidColor: '#1A3C2C',
      gradient: {
        type: 'radial',
        colorStart: '#2E5B3E',
        colorEnd: '#0D1F15',
        rotation: 0,
        centerX: 0.5,
        centerY: 0.45,
      },
      texture: {
        type: 'organic-cells',
        intensity: 20,
        scale: 1.0,
        seed: 5555,
        randomizeSeedPerToken: false,
        blendMode: 'soft-light',
        contrast: 8,
      },
      effects: {
        vignetteEnabled: true,
        vignetteIntensity: 40,
        vignetteColor: '#0A1A10',
        innerGlowEnabled: true,
        innerGlowColor: '#228B22',
        innerGlowRadius: 10,
        innerGlowIntensity: 18,
        hueShiftEnabled: false,
        hueShiftDegrees: 0,
      },
      light: { brightness: 90, contrast: 110, saturation: 100, vibrance: 105 },
    },
  },
]
