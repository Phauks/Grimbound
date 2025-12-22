/**
 * Texture Strategies Module
 *
 * Factory and exports for all procedural texture generators.
 * Use TextureFactory.create() to get the appropriate strategy.
 *
 * @module canvas/backgroundEffects/textures
 */

import type { TextureType } from '@/ts/types/backgroundEffects.js';
import { BrushedMetalTextureStrategy } from './BrushedMetalTexture.js';
import { CloudsTextureStrategy } from './CloudsTexture.js';
import { LinenTextureStrategy } from './LinenTexture.js';
import { MarbleTextureStrategy } from './MarbleTexture.js';
import { OrganicCellsTextureStrategy } from './OrganicCellsTexture.js';
import { ParchmentTextureStrategy } from './ParchmentTexture.js';
import { PerlinTextureStrategy } from './PerlinTexture.js';
import { RadialFadeTextureStrategy } from './RadialFadeTexture.js';
import { SilkFlowTextureStrategy } from './SilkFlowTexture.js';
import type { TextureStrategy } from './TextureStrategy.js';
import { WatercolorTextureStrategy } from './WatercolorTexture.js';
import { WoodGrainTextureStrategy } from './WoodGrainTexture.js';

// ============================================================================
// STRATEGY REGISTRY
// ============================================================================

/**
 * Registry of all available texture strategies
 * Maps texture type to strategy instance
 */
const textureStrategies = new Map<TextureType, TextureStrategy>();

// Initialize texture strategies
textureStrategies.set('marble', new MarbleTextureStrategy());
textureStrategies.set('clouds', new CloudsTextureStrategy());
textureStrategies.set('watercolor', new WatercolorTextureStrategy());
textureStrategies.set('perlin', new PerlinTextureStrategy());
textureStrategies.set('radial-fade', new RadialFadeTextureStrategy());
textureStrategies.set('organic-cells', new OrganicCellsTextureStrategy());
textureStrategies.set('silk-flow', new SilkFlowTextureStrategy());
textureStrategies.set('parchment', new ParchmentTextureStrategy());
textureStrategies.set('linen', new LinenTextureStrategy());
textureStrategies.set('wood-grain', new WoodGrainTextureStrategy());
textureStrategies.set('brushed-metal', new BrushedMetalTextureStrategy());

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Factory for creating texture strategy instances
 *
 * @example
 * ```typescript
 * const strategy = TextureFactory.create('marble');
 * if (strategy) {
 *   strategy.generate(context);
 * }
 * ```
 */
export const TextureFactory = {
  /**
   * Get a texture strategy for the given type
   *
   * @param type - Texture type to create
   * @returns Strategy instance or undefined for 'none' type
   */
  create(type: TextureType): TextureStrategy | undefined {
    if (type === 'none') {
      return undefined;
    }
    return textureStrategies.get(type);
  },

  /**
   * Check if a texture type is supported
   *
   * @param type - Texture type to check
   * @returns True if the texture type has a strategy
   */
  isSupported(type: TextureType): boolean {
    return type === 'none' || textureStrategies.has(type);
  },

  /**
   * Get all supported texture types
   *
   * @returns Array of supported texture type names
   */
  getSupportedTypes(): TextureType[] {
    return ['none', ...Array.from(textureStrategies.keys())] as TextureType[];
  },

  /**
   * Register a custom texture strategy
   *
   * @param type - Texture type identifier
   * @param strategy - Strategy instance
   */
  register(type: TextureType, strategy: TextureStrategy): void {
    textureStrategies.set(type, strategy);
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

// Individual strategies (for direct use or testing)
export { BrushedMetalTextureStrategy } from './BrushedMetalTexture.js';
export { CloudsTextureStrategy } from './CloudsTexture.js';
export { LinenTextureStrategy } from './LinenTexture.js';
export { MarbleTextureStrategy } from './MarbleTexture.js';
export { OrganicCellsTextureStrategy } from './OrganicCellsTexture.js';
export { ParchmentTextureStrategy } from './ParchmentTexture.js';
export { PerlinTextureStrategy } from './PerlinTexture.js';
export { RadialFadeTextureStrategy } from './RadialFadeTexture.js';
export { SilkFlowTextureStrategy } from './SilkFlowTexture.js';
// Strategy interface and base class
export {
  BaseTextureStrategy,
  type TextureContext,
  type TextureResult,
  type TextureStrategy,
} from './TextureStrategy.js';
export { WatercolorTextureStrategy } from './WatercolorTexture.js';
export { WoodGrainTextureStrategy } from './WoodGrainTexture.js';
