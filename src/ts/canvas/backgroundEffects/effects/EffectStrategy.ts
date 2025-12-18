/**
 * Effect Strategy Interface
 *
 * Defines the contract for visual effect processors.
 * Effects are applied after the base background and texture.
 *
 * @module canvas/backgroundEffects/effects/EffectStrategy
 */

import type { EffectsConfig } from '@/ts/types/backgroundEffects.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context provided to effect processors
 */
export interface EffectContext {
  /** Canvas 2D rendering context */
  ctx: CanvasRenderingContext2D;
  /** Token diameter in pixels */
  diameter: number;
  /** Center point (diameter / 2) */
  center: number;
  /** Token radius (diameter / 2) */
  radius: number;
  /** Effects configuration */
  config: EffectsConfig;
}

/**
 * Result of effect application
 */
export interface EffectResult {
  /** Whether effect was successfully applied */
  success: boolean;
  /** Optional error message */
  error?: string;
}

// ============================================================================
// STRATEGY INTERFACE
// ============================================================================

/**
 * Strategy interface for visual effects
 */
export interface EffectStrategy {
  /**
   * Apply the effect to the canvas
   *
   * @param context - Effect context with canvas and configuration
   * @returns Result indicating success or failure
   */
  apply(context: EffectContext): EffectResult;

  /**
   * Check if this effect should be applied based on configuration
   *
   * @param config - Effects configuration
   * @returns True if effect is enabled
   */
  isEnabled(config: EffectsConfig): boolean;

  /**
   * Human-readable name for debugging
   */
  readonly name: string;
}
