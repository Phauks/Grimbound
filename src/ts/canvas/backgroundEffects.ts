/**
 * Blood on the Clocktower Token Generator
 * Background Effects - Procedural texture and effect generation for token backgrounds
 *
 * This module provides the core rendering engine for fluid, organic background effects
 * including procedural textures (marble, clouds, watercolor, etc.) and visual effects
 * (vignette, inner glow, hue shift).
 */

import type {
  BackgroundStyle,
  TextureConfig,
  TextureType,
  EffectsConfig,
  LightConfig,
} from '../types/backgroundEffects.js'
import { DEFAULT_LIGHT_CONFIG } from '../types/backgroundEffects.js'
import { createBackgroundGradient } from './gradientUtils.js'
import { resolveAssetUrl, isAssetReference } from '../services/upload/assetResolver.js'
import { isBuiltInAsset, getBuiltInAssetPath } from '../constants/builtInAssets.js'

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render a complete background with base, texture, and effects
 *
 * @param ctx - Canvas context (should have circular clip already applied)
 * @param style - Complete background style configuration
 * @param diameter - Token diameter in pixels
 */
export async function renderBackground(
  ctx: CanvasRenderingContext2D,
  style: BackgroundStyle,
  diameter: number
): Promise<void> {
  const center = diameter / 2
  const light = style.light || DEFAULT_LIGHT_CONFIG

  ctx.save()

  // 1. Apply CSS-style filters for brightness/contrast/saturation (before drawing)
  const filters: string[] = []
  if (light.brightness !== 100) {
    filters.push(`brightness(${light.brightness / 100})`)
  }
  if (light.contrast !== 100) {
    filters.push(`contrast(${light.contrast / 100})`)
  }
  if (light.saturation !== 100) {
    filters.push(`saturate(${light.saturation / 100})`)
  }
  if (filters.length > 0) {
    ctx.filter = filters.join(' ')
  }

  // 2. Draw base depending on sourceType
  if (style.sourceType === 'image' && style.imageUrl) {
    // Image mode: load and draw the image
    try {
      const img = await loadBackgroundImage(style.imageUrl)
      // Draw image to cover the circular area (center and crop)
      const aspectRatio = img.width / img.height
      let drawWidth = diameter
      let drawHeight = diameter
      let offsetX = 0
      let offsetY = 0

      if (aspectRatio > 1) {
        // Image is wider - fit height, crop width
        drawWidth = diameter * aspectRatio
        offsetX = (diameter - drawWidth) / 2
      } else {
        // Image is taller - fit width, crop height
        drawHeight = diameter / aspectRatio
        offsetY = (diameter - drawHeight) / 2
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
    } catch (error) {
      // Fallback to solid color if image fails to load
      console.warn('Failed to load background image, using fallback color:', error)
      ctx.fillStyle = style.solidColor || '#FFFFFF'
      ctx.fill()
    }
  } else if (style.mode === 'solid') {
    // Solid color mode
    ctx.fillStyle = style.solidColor
    ctx.fill()
  } else {
    // Gradient mode
    ctx.fillStyle = createBackgroundGradient(ctx, style.gradient, diameter)
    ctx.fill()
  }

  // 3. Apply texture overlay if enabled (works for all source types)
  if (style.texture.type !== 'none') {
    await applyTexture(ctx, style.texture, diameter, style.solidColor)
  }

  // Reset filter before effects (effects should not be filtered)
  ctx.filter = 'none'

  // 4. Apply visual effects
  applyEffects(ctx, style.effects, center, diameter / 2)

  ctx.restore()

  // 5. Apply vibrance (post-processing, requires pixel manipulation)
  if (light.vibrance !== 100) {
    applyVibrance(ctx, diameter, light.vibrance)
  }
}

/**
 * Load an image from URL (handles asset references, built-in assets, blob URLs, data URLs, and http URLs)
 * - Resolves asset:uuid references to blob URLs
 * - Resolves built-in asset IDs (like 'character_background_1') to their paths
 * - Passes through regular URLs unchanged
 */
async function loadBackgroundImage(url: string): Promise<HTMLImageElement> {
  let resolvedUrl: string

  // Check if it's an asset reference (asset:uuid format)
  if (isAssetReference(url)) {
    resolvedUrl = await resolveAssetUrl(url)
  }
  // Check if it's a built-in asset ID (like 'character_background_1')
  else if (isBuiltInAsset(url, 'token-background')) {
    resolvedUrl = getBuiltInAssetPath(url, 'token-background') || ''
  }
  // Otherwise use the URL directly (http, data, blob URLs)
  else {
    resolvedUrl = url
  }

  if (!resolvedUrl) {
    throw new Error(`Failed to resolve image URL: ${url}`)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${resolvedUrl}`))

    img.src = resolvedUrl
  })
}

/**
 * Render just the texture overlay (for preview purposes)
 */
export function renderTexturePreview(
  ctx: CanvasRenderingContext2D,
  texture: TextureConfig,
  diameter: number,
  baseColor: string = '#FFFFFF'
): void {
  if (texture.type === 'none') return
  applyTextureSync(ctx, texture, diameter, baseColor)
}

// ============================================================================
// TEXTURE APPLICATION
// ============================================================================

async function applyTexture(
  ctx: CanvasRenderingContext2D,
  config: TextureConfig,
  diameter: number,
  baseColor: string
): Promise<void> {
  applyTextureSync(ctx, config, diameter, baseColor)
}

function applyTextureSync(
  ctx: CanvasRenderingContext2D,
  config: TextureConfig,
  diameter: number,
  baseColor: string
): void {
  const intensity = config.intensity / 100

  // Create offscreen canvas for texture
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = diameter
  textureCanvas.height = diameter
  const textureCtx = textureCanvas.getContext('2d')!

  // Determine seed: use random if randomizeSeedPerToken is enabled, otherwise use configured seed
  const effectiveSeed = config.randomizeSeedPerToken
    ? Math.floor(Math.random() * 100000)
    : (config.seed ?? 12345)

  // Create a modified config with the effective seed for this render
  const renderConfig: TextureConfig = { ...config, seed: effectiveSeed }

  // Generate texture based on type (using renderConfig with effective seed)
  switch (renderConfig.type) {
    case 'marble':
      generateMarbleTexture(textureCtx, diameter, renderConfig)
      break
    case 'clouds':
      generateCloudsTexture(textureCtx, diameter, renderConfig)
      break
    case 'watercolor':
      generateWatercolorTexture(textureCtx, diameter, renderConfig, baseColor)
      break
    case 'perlin':
      generatePerlinTexture(textureCtx, diameter, renderConfig)
      break
    case 'radial-fade':
      generateRadialFadeTexture(textureCtx, diameter, renderConfig)
      break
    case 'organic-cells':
      generateOrganicCellsTexture(textureCtx, diameter, renderConfig)
      break
    case 'silk-flow':
      generateSilkFlowTexture(textureCtx, diameter, renderConfig)
      break
    case 'parchment':
      generateParchmentTexture(textureCtx, diameter, renderConfig)
      break
    case 'linen':
      generateLinenTexture(textureCtx, diameter, renderConfig)
      break
    case 'wood-grain':
      generateWoodGrainTexture(textureCtx, diameter, renderConfig)
      break
    case 'brushed-metal':
      generateBrushedMetalTexture(textureCtx, diameter, renderConfig)
      break
    default:
      return
  }

  // Apply contrast adjustment if set
  if (renderConfig.contrast && renderConfig.contrast !== 0) {
    applyContrast(textureCtx, diameter, renderConfig.contrast)
  }

  // Map blend mode to canvas composite operation
  const blendMode = renderConfig.blendMode ?? 'overlay'
  const compositeOp = getCompositeOperation(blendMode)

  // Composite texture onto main canvas with intensity
  ctx.globalAlpha = intensity
  ctx.globalCompositeOperation = compositeOp
  ctx.drawImage(textureCanvas, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * Map texture blend mode to canvas composite operation
 */
function getCompositeOperation(blendMode: string): GlobalCompositeOperation {
  switch (blendMode) {
    case 'normal':
      return 'source-over'
    case 'overlay':
      return 'overlay'
    case 'multiply':
      return 'multiply'
    case 'screen':
      return 'screen'
    case 'soft-light':
      return 'soft-light'
    case 'hard-light':
      return 'hard-light'
    default:
      return 'overlay'
  }
}

/**
 * Apply contrast adjustment to texture
 */
function applyContrast(ctx: CanvasRenderingContext2D, diameter: number, contrast: number): void {
  const imageData = ctx.getImageData(0, 0, diameter, diameter)
  const data = imageData.data

  // Contrast factor: -50 to +50 maps to 0.5 to 1.5
  const factor = (100 + contrast) / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // Skip transparent

    // Apply contrast around midpoint (128)
    data[i] = Math.min(255, Math.max(0, Math.round((data[i] - 128) * factor + 128)))
    data[i + 1] = Math.min(255, Math.max(0, Math.round((data[i + 1] - 128) * factor + 128)))
    data[i + 2] = Math.min(255, Math.max(0, Math.round((data[i + 2] - 128) * factor + 128)))
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Apply tint color to texture (colorizes the grayscale texture)
 */
function applyTint(ctx: CanvasRenderingContext2D, diameter: number, tintColor: string): void {
  const imageData = ctx.getImageData(0, 0, diameter, diameter)
  const data = imageData.data

  // Parse tint color
  const tintR = parseInt(tintColor.slice(1, 3), 16)
  const tintG = parseInt(tintColor.slice(3, 5), 16)
  const tintB = parseInt(tintColor.slice(5, 7), 16)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // Skip transparent

    // Get grayscale luminance
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255

    // Apply tint: blend between black and tint color based on luminance
    data[i] = Math.round(tintR * gray)
    data[i + 1] = Math.round(tintG * gray)
    data[i + 2] = Math.round(tintB * gray)
  }

  ctx.putImageData(imageData, 0, 0)
}

// ============================================================================
// NOISE UTILITY FUNCTIONS
// ============================================================================

// Permutation table for Perlin noise
const PERM: number[] = []
const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

// Initialize permutation table
function initPerm(seed: number): void {
  const p: number[] = []
  for (let i = 0; i < 256; i++) p[i] = i

  // Fisher-Yates shuffle with seed
  let random = seed
  for (let i = 255; i > 0; i--) {
    random = (random * 16807) % 2147483647
    const j = random % (i + 1)
    ;[p[i], p[j]] = [p[j], p[i]]
  }

  // Duplicate for overflow
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255]
  }
}

function dot(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

/**
 * 2D Perlin noise implementation
 */
function perlin2D(x: number, y: number): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255

  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)

  const u = fade(xf)
  const v = fade(yf)

  const aa = PERM[PERM[X] + Y]
  const ab = PERM[PERM[X] + Y + 1]
  const ba = PERM[PERM[X + 1] + Y]
  const bb = PERM[PERM[X + 1] + Y + 1]

  const x1 = lerp(
    dot(GRAD3[aa % 12], xf, yf),
    dot(GRAD3[ba % 12], xf - 1, yf),
    u
  )
  const x2 = lerp(
    dot(GRAD3[ab % 12], xf, yf - 1),
    dot(GRAD3[bb % 12], xf - 1, yf - 1),
    u
  )

  return lerp(x1, x2, v)
}

/**
 * Fractal Brownian Motion - multi-octave noise for smooth, cloud-like patterns
 */
function fbm(x: number, y: number, octaves: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2D(x * frequency, y * frequency)
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return value / maxValue
}

/**
 * Turbulence noise - absolute value of noise for marble-like effects
 */
function turbulence(x: number, y: number, octaves: number): number {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(perlin2D(x * frequency, y * frequency))
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return value / maxValue
}

// ============================================================================
// TEXTURE GENERATORS
// ============================================================================

/**
 * Marble/Swirl texture - organic flowing patterns like marble stone
 */
function generateMarbleTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 4
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      // Check if within circle
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Turbulent noise for marble veins
      const turb = turbulence(nx, ny, 5)
      // Sine wave distortion for flowing veins
      let value = Math.sin(nx * 8 + turb * 6)
      value = (value + 1) * 0.5 // Normalize to 0-1

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Clouds/Plasma texture - soft billowy gradients
 */
function generateCloudsTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 3
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Smooth multi-octave noise
      let value = fbm(nx, ny, 6)
      value = value * 0.5 + 0.5 // Normalize to 0-1

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Watercolor texture - bleeding color edges like wet watercolor paint
 */
function generateWatercolorTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig,
  baseColor: string
): void {
  const scale = config.scale * 2
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  // Parse base color for tinting
  const r = parseInt(baseColor.slice(1, 3), 16)
  const g = parseInt(baseColor.slice(3, 5), 16)
  const b = parseInt(baseColor.slice(5, 7), 16)

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Multiple layers of soft noise with different frequencies
      const layer1 = fbm(nx, ny, 4) * 0.5 + 0.5
      const layer2 = fbm(nx * 2 + 100, ny * 2 + 100, 3) * 0.3 + 0.5
      const layer3 = fbm(nx * 0.5 + 50, ny * 0.5 + 50, 5) * 0.4 + 0.5

      // Combine layers with soft blending
      let value = (layer1 * 0.5 + layer2 * 0.3 + layer3 * 0.2)

      // Edge fade for watercolor effect
      const dist = Math.sqrt(dx * dx + dy * dy) / center
      const edgeFade = 1 - Math.pow(dist, 3)
      value *= edgeFade

      const i = (y * diameter + x) * 4
      // Slight color tinting based on value
      data[i] = Math.min(255, Math.floor(128 + (value - 0.5) * 100))
      data[i + 1] = Math.min(255, Math.floor(128 + (value - 0.5) * 100))
      data[i + 2] = Math.min(255, Math.floor(128 + (value - 0.5) * 100))
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Perlin noise texture - smooth organic undulation
 */
function generatePerlinTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 5
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Simple Perlin noise
      let value = perlin2D(nx, ny)
      value = value * 0.5 + 0.5 // Normalize to 0-1

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Radial fade texture - center-to-edge fade
 */
function generateRadialFadeTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2
  const scale = config.scale

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > center) continue

      // Radial gradient with scale affecting the curve
      const normalizedDist = dist / center
      let value = 1 - Math.pow(normalizedDist, 1 / scale)

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Organic cells texture - Voronoi-style cell patterns
 */
function generateOrganicCellsTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  const center = diameter / 2

  // Generate random cell centers
  const cellCount = Math.floor(15 * scale)
  const cells: { x: number; y: number }[] = []

  let random = seed
  for (let i = 0; i < cellCount; i++) {
    random = (random * 16807) % 2147483647
    const angle = (random / 2147483647) * Math.PI * 2
    random = (random * 16807) % 2147483647
    const dist = (random / 2147483647) * center * 0.9

    cells.push({
      x: center + Math.cos(angle) * dist,
      y: center + Math.sin(angle) * dist,
    })
  }

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      // Find two closest cells
      let minDist1 = Infinity
      let minDist2 = Infinity

      for (const cell of cells) {
        const dist = Math.sqrt((x - cell.x) ** 2 + (y - cell.y) ** 2)
        if (dist < minDist1) {
          minDist2 = minDist1
          minDist1 = dist
        } else if (dist < minDist2) {
          minDist2 = dist
        }
      }

      // F2 - F1 gives cell edges
      const value = (minDist2 - minDist1) / (diameter * 0.1)
      const clamped = Math.min(1, Math.max(0, value))

      const i = (y * diameter + x) * 4
      const gray = Math.floor(clamped * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Silk flow texture - flowing silk-like directional texture
 */
function generateSilkFlowTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 3
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Flow field using noise for direction
      const angle = perlin2D(nx * 0.5, ny * 0.5) * Math.PI * 2

      // Sample along the flow direction
      const flowX = nx + Math.cos(angle) * 0.3
      const flowY = ny + Math.sin(angle) * 0.3

      // Combine flow with base noise
      const flow = fbm(flowX, flowY, 4)
      const base = perlin2D(nx * 2, ny * 2) * 0.3

      let value = (flow + base) * 0.5 + 0.5

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Parchment texture - aged paper with grain and subtle variations
 */
function generateParchmentTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 4
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Base paper grain - multiple layers of noise
      const grain1 = fbm(nx * 2, ny * 2, 4) * 0.4
      const grain2 = perlin2D(nx * 8, ny * 8) * 0.15
      const grain3 = fbm(nx * 0.5, ny * 0.5, 3) * 0.25

      // Combine layers
      let value = 0.5 + grain1 + grain2 + grain3

      // Add edge darkening for aged look
      const dist = Math.sqrt(dx * dx + dy * dy) / center
      value *= 1 - dist * 0.15

      // Clamp
      value = Math.max(0, Math.min(1, value))

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Linen texture - woven fabric crosshatch pattern
 */
function generateLinenTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 20
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      // Create crosshatch pattern
      const horizontal = Math.sin(y * scale / diameter * Math.PI) * 0.5 + 0.5
      const vertical = Math.sin(x * scale / diameter * Math.PI) * 0.5 + 0.5

      // Combine with slight variation from noise
      const nx = (x / diameter) * 5
      const ny = (y / diameter) * 5
      const variation = perlin2D(nx + seed * 0.001, ny + seed * 0.001) * 0.15

      let value = (horizontal * 0.5 + vertical * 0.5) * 0.6 + 0.3 + variation

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Wood grain texture - directional patterns like wood
 */
function generateWoodGrainTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 3
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      const nx = (x / diameter) * scale
      const ny = (y / diameter) * scale

      // Create wood grain - stretched turbulence + sine waves
      const turb = turbulence(nx * 0.3, ny, 4)
      const grain = Math.sin((ny * 15 + turb * 8) * Math.PI)

      // Add ring pattern
      const rings = Math.sin(nx * 5 + turb * 3) * 0.3

      let value = (grain * 0.5 + 0.5) * 0.7 + rings * 0.3 + 0.3
      value = Math.max(0, Math.min(1, value))

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Brushed metal texture - linear streaks
 */
function generateBrushedMetalTexture(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  config: TextureConfig
): void {
  const scale = config.scale * 30
  const seed = config.seed ?? Math.floor(Math.random() * 10000)
  initPerm(seed)

  const imageData = ctx.createImageData(diameter, diameter)
  const data = imageData.data
  const center = diameter / 2

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - center
      const dy = y - center
      if (dx * dx + dy * dy > center * center) continue

      // Horizontal brushed lines
      const streak = Math.sin(y * scale / diameter * Math.PI * 2) * 0.5 + 0.5

      // Add variation along x for realistic streaks
      const nx = x / diameter * 20
      const variation = perlin2D(nx + seed * 0.001, y * 0.01) * 0.25

      // Subtle reflective gradient
      const reflect = Math.abs(Math.sin((y / diameter) * Math.PI)) * 0.15

      let value = streak * 0.4 + variation + 0.4 + reflect
      value = Math.max(0, Math.min(1, value))

      const i = (y * diameter + x) * 4
      const gray = Math.floor(value * 255)
      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

// ============================================================================
// EFFECTS APPLICATION
// ============================================================================

function applyEffects(
  ctx: CanvasRenderingContext2D,
  effects: EffectsConfig,
  center: number,
  radius: number
): void {
  if (effects.vignetteEnabled) {
    applyVignette(ctx, effects, center, radius)
  }

  if (effects.innerGlowEnabled) {
    applyInnerGlow(ctx, effects, center, radius)
  }
}

/**
 * Apply vignette (edge darkening)
 */
function applyVignette(
  ctx: CanvasRenderingContext2D,
  effects: EffectsConfig,
  center: number,
  radius: number
): void {
  const intensity = effects.vignetteIntensity / 100

  // Parse vignette color
  const color = effects.vignetteColor || '#000000'
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const gradient = ctx.createRadialGradient(
    center, center, radius * 0.3,
    center, center, radius
  )
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(0.6, 'transparent')
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${intensity})`)

  ctx.fillStyle = gradient
  ctx.fill()
}

/**
 * Apply inner glow/shadow
 */
function applyInnerGlow(
  ctx: CanvasRenderingContext2D,
  effects: EffectsConfig,
  center: number,
  radius: number
): void {
  const glowRadius = radius * (effects.innerGlowRadius / 50)
  const intensity = effects.innerGlowIntensity / 100

  // Parse color
  const color = effects.innerGlowColor
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const gradient = ctx.createRadialGradient(
    center, center, radius - glowRadius,
    center, center, radius
  )
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${intensity})`)

  ctx.fillStyle = gradient
  ctx.fill()
}

/**
 * Apply hue shift across background
 */
function applyHueShift(
  ctx: CanvasRenderingContext2D,
  effects: EffectsConfig,
  diameter: number
): void {
  const imageData = ctx.getImageData(0, 0, diameter, diameter)
  const data = imageData.data
  const shift = effects.hueShiftDegrees

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // Skip transparent pixels

    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    const [r, g, b] = hslToRgb((h + shift) % 360, s, l)

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Apply vibrance adjustment - smart saturation that affects muted colors more
 *
 * Vibrance increases saturation of less-saturated colors more than already-saturated ones.
 * This prevents over-saturation of vivid colors while boosting dull areas.
 *
 * @param ctx - Canvas context
 * @param diameter - Token diameter
 * @param vibranceValue - Vibrance value (0-200, 100 = no change)
 */
function applyVibrance(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  vibranceValue: number
): void {
  const imageData = ctx.getImageData(0, 0, diameter, diameter)
  const data = imageData.data

  // Convert 0-200 range to -1 to +1 range (100 = 0, no change)
  const amount = (vibranceValue - 100) / 100

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // Skip transparent pixels

    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Find the max component to determine saturation level
    const max = Math.max(r, g, b)
    const avg = (r + g + b) / 3

    // Calculate how saturated this pixel already is (0 = gray, 1 = fully saturated)
    const currentSaturation = max > 0 ? 1 - (avg / max) : 0

    // Apply more adjustment to less-saturated pixels
    const adjustmentFactor = amount * (1 - currentSaturation)

    // Apply the adjustment
    data[i] = Math.max(0, Math.min(255, r + (r - avg) * adjustmentFactor))
    data[i + 1] = Math.max(0, Math.min(255, g + (g - avg) * adjustmentFactor))
    data[i + 2] = Math.max(0, Math.min(255, b + (b - avg) * adjustmentFactor))
  }

  ctx.putImageData(imageData, 0, 0)
}

// ============================================================================
// COLOR CONVERSION UTILITIES
// ============================================================================

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}
