/**
 * Logo Templates
 *
 * Pre-configured templates for creating script logos with common layouts
 * and styling patterns.
 */

import type { CanvasSize, Layer } from '../types/index.js';
import { createStudioCanvas } from './canvasOperations.js';

// ============================================================================
// Types
// ============================================================================

export interface LogoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string; // Base64 data URL for preview
  canvasSize: CanvasSize;
  backgroundColor: string;
  /** Layer configurations (without actual canvas elements) */
  layerConfigs: LogoLayerConfig[];
}

export interface LogoLayerConfig {
  type: 'text' | 'shape' | 'image';
  name: string;
  visible: boolean;
  opacity: number;
  position: { x: number; y: number };

  // Text layer properties
  text?: string;
  font?: string;
  fontSize?: number;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  letterSpacing?: number;

  // Shape layer properties
  shapeType?: 'rectangle' | 'circle';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;

  // Image layer properties (placeholder)
  placeholder?: string;
}

// ============================================================================
// Template Definitions
// ============================================================================

/**
 * Built-in logo templates
 */
export const LOGO_TEMPLATES: LogoTemplate[] = [
  {
    id: 'text-only',
    name: 'Text Only',
    description: 'Simple text-based logo with script name',
    canvasSize: { width: 800, height: 200 },
    backgroundColor: 'transparent',
    layerConfigs: [
      {
        type: 'text',
        name: 'Script Name',
        visible: true,
        opacity: 1.0,
        position: { x: 400, y: 100 },
        text: 'Script Name',
        font: 'LHF Unlovable',
        fontSize: 72,
        color: '#FFFFFF',
        alignment: 'center',
        letterSpacing: 0,
      },
    ],
  },

  {
    id: 'text-with-background',
    name: 'Text with Background',
    description: 'Text with solid colored background rectangle',
    canvasSize: { width: 800, height: 200 },
    backgroundColor: 'transparent',
    layerConfigs: [
      {
        type: 'shape',
        name: 'Background',
        visible: true,
        opacity: 1.0,
        position: { x: 0, y: 0 },
        shapeType: 'rectangle',
        fill: '#2C3E50',
        stroke: 'transparent',
        strokeWidth: 0,
        width: 800,
        height: 200,
      },
      {
        type: 'text',
        name: 'Script Name',
        visible: true,
        opacity: 1.0,
        position: { x: 400, y: 100 },
        text: 'Script Name',
        font: 'LHF Unlovable',
        fontSize: 72,
        color: '#ECF0F1',
        alignment: 'center',
        letterSpacing: 0,
      },
    ],
  },

  {
    id: 'icon-and-text',
    name: 'Icon and Text',
    description: 'Logo with icon placeholder and text',
    canvasSize: { width: 800, height: 200 },
    backgroundColor: 'transparent',
    layerConfigs: [
      {
        type: 'image',
        name: 'Icon (Placeholder)',
        visible: true,
        opacity: 1.0,
        position: { x: 100, y: 100 },
        placeholder: 'Add icon here (150x150)',
      },
      {
        type: 'text',
        name: 'Script Name',
        visible: true,
        opacity: 1.0,
        position: { x: 450, y: 100 },
        text: 'Script Name',
        font: 'LHF Unlovable',
        fontSize: 64,
        color: '#FFFFFF',
        alignment: 'left',
        letterSpacing: 0,
      },
    ],
  },

  {
    id: 'framed-text',
    name: 'Framed Text',
    description: 'Text with decorative border frame',
    canvasSize: { width: 800, height: 200 },
    backgroundColor: 'transparent',
    layerConfigs: [
      {
        type: 'shape',
        name: 'Frame',
        visible: true,
        opacity: 1.0,
        position: { x: 20, y: 20 },
        shapeType: 'rectangle',
        fill: 'transparent',
        stroke: '#D4AF37',
        strokeWidth: 4,
        width: 760,
        height: 160,
      },
      {
        type: 'text',
        name: 'Script Name',
        visible: true,
        opacity: 1.0,
        position: { x: 400, y: 100 },
        text: 'Script Name',
        font: 'LHF Unlovable',
        fontSize: 64,
        color: '#D4AF37',
        alignment: 'center',
        letterSpacing: 2,
      },
    ],
  },

  {
    id: 'subtitle-style',
    name: 'Title with Subtitle',
    description: 'Two-line logo with main title and subtitle',
    canvasSize: { width: 800, height: 250 },
    backgroundColor: 'transparent',
    layerConfigs: [
      {
        type: 'text',
        name: 'Main Title',
        visible: true,
        opacity: 1.0,
        position: { x: 400, y: 90 },
        text: 'Script Name',
        font: 'LHF Unlovable',
        fontSize: 72,
        color: '#FFFFFF',
        alignment: 'center',
        letterSpacing: 1,
      },
      {
        type: 'text',
        name: 'Subtitle',
        visible: true,
        opacity: 0.85,
        position: { x: 400, y: 170 },
        text: 'A Custom Script',
        font: 'Georgia',
        fontSize: 32,
        color: '#CCCCCC',
        alignment: 'center',
        letterSpacing: 0,
      },
    ],
  },

  {
    id: 'centered-icon',
    name: 'Centered Icon Logo',
    description: 'Large centered icon with text below',
    canvasSize: { width: 400, height: 400 },
    backgroundColor: 'transparent',
    layerConfigs: [
      {
        type: 'image',
        name: 'Icon (Placeholder)',
        visible: true,
        opacity: 1.0,
        position: { x: 200, y: 150 },
        placeholder: 'Add icon here (200x200)',
      },
      {
        type: 'text',
        name: 'Script Name',
        visible: true,
        opacity: 1.0,
        position: { x: 200, y: 320 },
        text: 'Script Name',
        font: 'LHF Unlovable',
        fontSize: 48,
        color: '#FFFFFF',
        alignment: 'center',
        letterSpacing: 0,
      },
    ],
  },
];

// ============================================================================
// Template Utilities
// ============================================================================

/**
 * Get a template by ID
 *
 * @param id - Template ID
 * @returns Template or undefined if not found
 */
export function getTemplate(id: string): LogoTemplate | undefined {
  return LOGO_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all template IDs
 *
 * @returns Array of template IDs
 */
export function getTemplateIds(): string[] {
  return LOGO_TEMPLATES.map((t) => t.id);
}

/**
 * Get all template names
 *
 * @returns Array of template names
 */
export function getTemplateNames(): string[] {
  return LOGO_TEMPLATES.map((t) => t.name);
}

/**
 * Convert a logo layer config to an actual Layer object
 *
 * @param config - Logo layer configuration
 * @param canvasSize - Canvas dimensions
 * @param zIndex - Layer z-index
 * @returns Layer object with canvas
 */
export async function logoLayerConfigToLayer(
  config: LogoLayerConfig,
  canvasSize: CanvasSize,
  zIndex: number
): Promise<Layer> {
  const { canvas, ctx } = createStudioCanvas(canvasSize.width, canvasSize.height);

  // Render layer content based on type
  if (config.type === 'text' && config.text) {
    ctx.font = `${config.fontSize || 24}px ${config.font || 'Arial'}`;
    ctx.fillStyle = config.color || '#000000';
    ctx.textAlign = config.alignment || 'left';
    ctx.textBaseline = 'middle';

    // Apply letter spacing if specified
    if (config.letterSpacing && config.letterSpacing !== 0) {
      // Manual letter spacing implementation
      const chars = config.text.split('');
      let x = config.position.x;

      for (const char of chars) {
        ctx.fillText(char, x, config.position.y);
        x += ctx.measureText(char).width + config.letterSpacing;
      }
    } else {
      ctx.fillText(config.text, config.position.x, config.position.y);
    }
  } else if (config.type === 'shape') {
    ctx.fillStyle = config.fill || 'transparent';
    ctx.strokeStyle = config.stroke || 'transparent';
    ctx.lineWidth = config.strokeWidth || 1;

    if (config.shapeType === 'rectangle') {
      const w = config.width || 100;
      const h = config.height || 100;

      if (config.fill && config.fill !== 'transparent') {
        ctx.fillRect(config.position.x, config.position.y, w, h);
      }
      if (config.stroke && config.stroke !== 'transparent') {
        ctx.strokeRect(config.position.x, config.position.y, w, h);
      }
    } else if (config.shapeType === 'circle') {
      const radius = (config.width || 100) / 2;
      ctx.beginPath();
      ctx.arc(config.position.x, config.position.y, radius, 0, Math.PI * 2);

      if (config.fill && config.fill !== 'transparent') {
        ctx.fill();
      }
      if (config.stroke && config.stroke !== 'transparent') {
        ctx.stroke();
      }
    }
  } else if (config.type === 'image') {
    // Draw placeholder text for image layers
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.placeholder || 'Image Placeholder', config.position.x, config.position.y);

    // Draw dashed border
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(config.position.x - 75, config.position.y - 75, 150, 150);
    ctx.setLineDash([]);
  }

  // Create layer object
  const layer: Layer = {
    id: crypto.randomUUID(),
    type: config.type as 'text' | 'shape' | 'image',
    name: config.name,
    visible: config.visible,
    opacity: config.opacity,
    blendMode: 'normal',
    zIndex,
    canvas,
    version: 0,
    position: { ...config.position },
    rotation: 0,
    scale: { x: 1, y: 1 },
  };

  // Add type-specific data
  if (config.type === 'text') {
    layer.data = {
      text: config.text || '',
      font: config.font || 'Arial',
      fontSize: config.fontSize || 24,
      color: config.color || '#000000',
      alignment: config.alignment || 'left',
      letterSpacing: config.letterSpacing || 0,
    };
  } else if (config.type === 'shape') {
    layer.data = {
      shapeType: config.shapeType || 'rectangle',
      fill: config.fill || 'transparent',
      stroke: config.stroke || 'transparent',
      strokeWidth: config.strokeWidth || 1,
      cornerRadius: 0,
    };
  }

  return layer;
}

/**
 * Apply a template to create a full set of layers
 *
 * @param template - Logo template
 * @returns Promise resolving to array of layers
 */
export async function applyTemplate(template: LogoTemplate): Promise<Layer[]> {
  const layers: Layer[] = [];

  for (let i = 0; i < template.layerConfigs.length; i++) {
    const config = template.layerConfigs[i];
    const layer = await logoLayerConfigToLayer(config, template.canvasSize, i);
    layers.push(layer);
  }

  return layers;
}

/**
 * Customize template with script name
 *
 * @param template - Logo template
 * @param scriptName - Script name to apply
 * @returns Modified template with script name
 */
export function customizeTemplateWithName(
  template: LogoTemplate,
  scriptName: string
): LogoTemplate {
  return {
    ...template,
    layerConfigs: template.layerConfigs.map((config) => {
      if (
        config.type === 'text' &&
        (config.name === 'Script Name' || config.name === 'Main Title')
      ) {
        return {
          ...config,
          text: scriptName,
        };
      }
      return config;
    }),
  };
}
