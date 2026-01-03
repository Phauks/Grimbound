import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CONFIG from '@/ts/config';
import { CHARACTER_LAYOUT, QR_COLORS, QR_TOKEN_LAYOUT } from '@/ts/constants';
import { TokenTextRenderer } from '@/ts/generation/TokenTextRenderer';
import type { TokenGeneratorOptions } from '@/ts/types/tokenOptions';

// Mock canvas text drawing functions
vi.mock('@/ts/canvas/index.js', () => ({
  calculateCircularTextLayout: vi.fn().mockReturnValue({
    lines: [{ text: 'Test line', y: 100 }],
    totalHeight: 20,
  }),
  drawAbilityText: vi.fn(),
  drawCenteredWrappedText: vi.fn(),
  drawCurvedText: vi.fn(),
}));

// Mock logger
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules
import {
  calculateCircularTextLayout,
  drawAbilityText,
  drawCenteredWrappedText,
  drawCurvedText,
} from '@/ts/canvas/index.js';
import { logger } from '@/ts/utils/logger.js';

// Helper function to create mock canvas context
function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    // Font property
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

// Helper function to create default token options
function createDefaultOptions(): TokenGeneratorOptions {
  return {
    dpi: 300,
    characterNameFont: 'Arial',
    abilityTextFont: 'Helvetica',
    characterReminderFont: 'Arial',
    metaNameFont: 'Georgia',
    metaTextFont: 'Georgia',
    characterNameColor: '#FFFFFF',
    abilityTextColor: '#FFFFFF',
    reminderTextColor: '#FFFFFF',
    metaNameColor: '#FFFFFF',
    metaTextColor: '#CCCCCC',
    reminderCountStyle: 'arabic',
    fontSpacing: {
      characterName: 0,
      characterText: 0,
      reminderText: 0,
      metaText: 0,
    },
    fontSizes: {},
    textLocations: {
      characterName: 'bottom',
      reminderText: 'bottom',
      metaName: 'bottom',
    },
    textShadow: {
      characterName: 4,
      characterText: 3,
      reminderText: 4,
      metaText: 4,
    },
    textRenderStyles: {
      characterName: 'filled',
      characterText: 'filled',
      reminderText: 'filled',
      metaText: 'filled',
    },
    textStrokeColors: {
      characterName: '#000000',
      characterText: '#000000',
      reminderText: '#000000',
      metaText: '#000000',
    },
    textStrokeWidths: {
      characterName: 2,
      characterText: 2,
      reminderText: 2,
      metaText: 2,
    },
  } as TokenGeneratorOptions;
}

describe('TokenTextRenderer', () => {
  let renderer: TokenTextRenderer;
  let options: TokenGeneratorOptions;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    options = createDefaultOptions();
    renderer = new TokenTextRenderer(options);
    mockCtx = createMockCanvasContext();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with provided options', () => {
      expect(renderer).toBeInstanceOf(TokenTextRenderer);
    });
  });

  describe('updateOptions', () => {
    it('should update renderer options', () => {
      const newOptions = { characterNameFont: 'Times New Roman' };
      renderer.updateOptions(newOptions);

      // Draw character name to verify updated font is used
      renderer.drawCharacterName(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          fontFamily: 'Times New Roman',
        })
      );
    });

    it('should merge with existing options', () => {
      renderer.updateOptions({ displayAbilityText: false });

      // Original characterNameFont should still be present
      renderer.drawCharacterName(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          fontFamily: 'Arial', // Original value
        })
      );
    });
  });

  describe('calculateAbilityTextLayout', () => {
    it('should calculate layout for ability text', () => {
      const result = renderer.calculateAbilityTextLayout(mockCtx, 'Test ability', 300);

      expect(calculateCircularTextLayout).toHaveBeenCalled();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(result).toHaveProperty('lines');
      expect(result).toHaveProperty('totalHeight');
    });

    it('should use correct font size based on diameter', () => {
      renderer.calculateAbilityTextLayout(mockCtx, 'Test ability', 300);

      const expectedFontSize = 300 * CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO;
      expect(mockCtx.font).toContain(`${expectedFontSize}px`);
    });

    it('should use default Y position when no override provided', () => {
      renderer.calculateAbilityTextLayout(mockCtx, 'Test ability', 300);

      const expectedY = 300 * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION;
      expect(calculateCircularTextLayout).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expectedY,
        expect.any(Number)
      );
    });

    it('should use Y position override when provided', () => {
      const yOverride = 0.25;
      renderer.calculateAbilityTextLayout(mockCtx, 'Test ability', 300, yOverride);

      const expectedY = 300 * yOverride;
      expect(calculateCircularTextLayout).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expectedY,
        expect.any(Number)
      );
    });

    it('should log debug information', () => {
      renderer.calculateAbilityTextLayout(mockCtx, 'Test ability', 300);

      expect(logger.debug).toHaveBeenCalledWith(
        'TokenTextRenderer',
        'Calculated ability text layout',
        expect.any(Object)
      );
    });
  });

  describe('calculateBootleggerTextLayout', () => {
    it('should calculate layout for bootlegger text', () => {
      const result = renderer.calculateBootleggerTextLayout('Test ability');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('lines');
      expect(result).toHaveProperty('totalHeight');
    });

    it('should return undefined for empty text', () => {
      expect(renderer.calculateBootleggerTextLayout('')).toBeUndefined();
      expect(renderer.calculateBootleggerTextLayout('   ')).toBeUndefined();
    });

    it('should return undefined for null/undefined text', () => {
      expect(renderer.calculateBootleggerTextLayout(null as unknown as string)).toBeUndefined();
      expect(
        renderer.calculateBootleggerTextLayout(undefined as unknown as string)
      ).toBeUndefined();
    });

    it('should create temporary canvas for measurement', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      renderer.calculateBootleggerTextLayout('Test ability');

      expect(createElementSpy).toHaveBeenCalledWith('canvas');
      createElementSpy.mockRestore();
    });
  });

  describe('drawCharacterName', () => {
    it('should draw character name with curved text', () => {
      renderer.drawCharacterName(mockCtx, 'The Imp', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'THE IMP',
          centerX: 150,
          centerY: 150,
          position: 'bottom',
        })
      );
    });

    it('should convert text to uppercase', () => {
      renderer.drawCharacterName(mockCtx, 'the imp', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'THE IMP',
        })
      );
    });

    it('should skip rendering when text location is none', () => {
      renderer.updateOptions({ textLocations: { characterName: 'none' } });
      renderer.drawCharacterName(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'TokenTextRenderer',
        'Skipped character name (location: none)',
        'Test'
      );
    });

    it('should use absolute font size when provided', () => {
      renderer.updateOptions({ fontSizes: { characterName: 24 } });
      renderer.drawCharacterName(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      // 24 points = 24/72 * 300 DPI = 100 pixels
      const expectedFontSize = (24 / 72) * 300;
      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          fontSize: expectedFontSize,
        })
      );
    });

    it('should use ratio-based font size when no override', () => {
      renderer.drawCharacterName(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      const expectedFontSize = 300 * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO;
      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          fontSize: expectedFontSize,
        })
      );
    });

    it('should apply custom text location', () => {
      renderer.updateOptions({ textLocations: { characterName: 'top' } });
      renderer.drawCharacterName(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          position: 'top',
        })
      );
    });
  });

  describe('drawAbilityText', () => {
    it('should draw ability text', () => {
      renderer.drawAbilityText(mockCtx, 'Test ability text', 300);

      expect(drawAbilityText).toHaveBeenCalledWith(
        mockCtx,
        'Test ability text',
        300,
        expect.any(String), // font
        expect.any(Number), // size ratio
        expect.any(Number), // line height
        expect.any(Number), // max width
        expect.any(Number), // y position
        expect.any(String), // color
        expect.any(Number), // letter spacing
        expect.any(Number), // shadow blur
        expect.any(Object) // additional options
      );
    });

    it('should use default Y position when no override provided', () => {
      renderer.drawAbilityText(mockCtx, 'Test ability', 300);

      expect(drawAbilityText).toHaveBeenCalledWith(
        mockCtx,
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION,
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should use Y position override when provided', () => {
      const yOverride = 0.25;
      renderer.drawAbilityText(mockCtx, 'Test ability', 300, yOverride);

      expect(drawAbilityText).toHaveBeenCalledWith(
        mockCtx,
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        yOverride,
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should use absolute font size when provided', () => {
      renderer.updateOptions({ fontSizes: { characterText: 18 } });
      renderer.drawAbilityText(mockCtx, 'Test', 300);

      const expectedFontSize = (18 / 72) * 300;
      expect(drawAbilityText).toHaveBeenCalledWith(
        mockCtx,
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({
          fontSizeOverride: expectedFontSize,
        })
      );
    });
  });

  describe('drawReminderText', () => {
    it('should draw reminder text with curved text', () => {
      renderer.drawReminderText(mockCtx, 'is drunk', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'IS DRUNK',
          centerX: 150,
          centerY: 150,
          position: 'bottom',
        })
      );
    });

    it('should convert text to uppercase', () => {
      renderer.drawReminderText(mockCtx, 'is drunk', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'IS DRUNK',
        })
      );
    });

    it('should skip rendering when text location is none', () => {
      renderer.updateOptions({ textLocations: { reminderText: 'none' } });
      renderer.drawReminderText(mockCtx, 'is drunk', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).not.toHaveBeenCalled();
    });

    it('should use reminder font settings', () => {
      renderer.drawReminderText(mockCtx, 'test', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          fontFamily: options.characterReminderFont,
          color: options.reminderTextColor,
        })
      );
    });
  });

  describe('calculateAbilityTextYWithBadge', () => {
    it('should return default Y position when reminder count is 0', () => {
      const result = renderer.calculateAbilityTextYWithBadge(0, 300);

      expect(result).toBe(CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION);
    });

    it('should return default Y position when reminder count is negative', () => {
      const result = renderer.calculateAbilityTextYWithBadge(-1, 300);

      expect(result).toBe(CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION);
    });

    it('should calculate adjusted Y position when badge is present', () => {
      const result = renderer.calculateAbilityTextYWithBadge(3, 300);

      expect(result).toBeGreaterThanOrEqual(CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION);
    });

    it('should return larger Y position for larger reminder counts with dots style', () => {
      renderer.updateOptions({ reminderCountStyle: 'dots' });

      const result1 = renderer.calculateAbilityTextYWithBadge(1, 300);
      const result2 = renderer.calculateAbilityTextYWithBadge(5, 300);

      expect(result2).toBeGreaterThan(result1);
    });

    it('should not increase Y position for arabic/roman/circled styles', () => {
      const styles: Array<'arabic' | 'roman' | 'circled'> = ['arabic', 'roman', 'circled'];

      for (const style of styles) {
        renderer.updateOptions({ reminderCountStyle: style });
        const result1 = renderer.calculateAbilityTextYWithBadge(1, 300);
        const result2 = renderer.calculateAbilityTextYWithBadge(5, 300);

        // Should be same since badge size doesn't grow for these styles
        expect(result2).toBeCloseTo(result1, 5);
      }
    });
  });

  describe('drawTokenCount', () => {
    it('should draw token count badge with circle and text', () => {
      renderer.drawTokenCount(mockCtx, 3, 300);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should format count as arabic numerals by default', () => {
      renderer.drawTokenCount(mockCtx, 5, 300);

      expect(mockCtx.fillText).toHaveBeenCalledWith('5', expect.any(Number), expect.any(Number));
    });

    it('should format count as roman numerals when specified', () => {
      renderer.updateOptions({ reminderCountStyle: 'roman' });
      renderer.drawTokenCount(mockCtx, 3, 300);

      expect(mockCtx.fillText).toHaveBeenCalledWith('III', expect.any(Number), expect.any(Number));
    });

    it('should format count as circled numbers when specified', () => {
      renderer.updateOptions({ reminderCountStyle: 'circled' });
      renderer.drawTokenCount(mockCtx, 5, 300);

      // Circled 5 is unicode character
      const circled5 = String.fromCodePoint(0x245f + 5);
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        circled5,
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should format count as dots when specified', () => {
      renderer.updateOptions({ reminderCountStyle: 'dots' });
      renderer.drawTokenCount(mockCtx, 3, 300);

      expect(mockCtx.fillText).toHaveBeenCalledWith(
        '\u2022\u2022\u2022',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should fallback to arabic for roman numerals above 10', () => {
      renderer.updateOptions({ reminderCountStyle: 'roman' });
      renderer.drawTokenCount(mockCtx, 15, 300);

      expect(mockCtx.fillText).toHaveBeenCalledWith('15', expect.any(Number), expect.any(Number));
    });

    it('should fallback to arabic for circled numbers above 20', () => {
      renderer.updateOptions({ reminderCountStyle: 'circled' });
      renderer.drawTokenCount(mockCtx, 25, 300);

      expect(mockCtx.fillText).toHaveBeenCalledWith('25', expect.any(Number), expect.any(Number));
    });
  });

  describe('drawCenteredText', () => {
    it('should draw centered wrapped text for meta tokens', () => {
      renderer.drawCenteredText(mockCtx, 'Test Script', 300);

      expect(drawCenteredWrappedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'TEST SCRIPT',
          diameter: 300,
        })
      );
    });

    it('should convert text to uppercase', () => {
      renderer.drawCenteredText(mockCtx, 'test script', 300);

      expect(drawCenteredWrappedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'TEST SCRIPT',
        })
      );
    });

    it('should apply vertical offset when provided', () => {
      renderer.drawCenteredText(mockCtx, 'Test Script', 300, 50);

      expect(drawCenteredWrappedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          verticalOffset: 50,
        })
      );
    });

    it('should use meta name font and color', () => {
      renderer.drawCenteredText(mockCtx, 'Test', 300);

      expect(drawCenteredWrappedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          fontFamily: options.metaNameFont,
          color: options.metaNameColor,
        })
      );
    });
  });

  describe('drawAuthorText', () => {
    it('should draw author text with curved text', () => {
      renderer.drawAuthorText(mockCtx, 'John Doe', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'John Doe',
          centerX: 150,
          centerY: 150,
          position: 'bottom',
        })
      );
    });

    it('should NOT convert author text to uppercase', () => {
      renderer.drawAuthorText(mockCtx, 'John Doe', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'John Doe', // Should preserve case
        })
      );
    });

    it('should skip rendering when text location is none', () => {
      renderer.updateOptions({ textLocations: { metaName: 'none' } });
      renderer.drawAuthorText(mockCtx, 'John Doe', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).not.toHaveBeenCalled();
    });

    it('should use meta text font and color', () => {
      renderer.drawAuthorText(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          fontFamily: options.metaTextFont,
          color: options.metaTextColor,
        })
      );
    });

    it('should use absolute font size when provided', () => {
      renderer.updateOptions({ fontSizes: { metaText: 20 } });
      renderer.drawAuthorText(mockCtx, 'Test', { x: 150, y: 150 }, 150, 300);

      const expectedFontSize = (20 / 72) * 300;
      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          fontSize: expectedFontSize,
        })
      );
    });
  });

  describe('drawAlmanacLabel', () => {
    it('should draw ALMANAC label on QR token', () => {
      renderer.drawAlmanacLabel(mockCtx, { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'ALMANAC',
          position: 'bottom',
        })
      );
    });

    it('should use QR token layout constants', () => {
      renderer.drawAlmanacLabel(mockCtx, { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          radius: 150 * QR_TOKEN_LAYOUT.SCRIPT_NAME_RADIUS,
          fontSize: 300 * QR_TOKEN_LAYOUT.SCRIPT_NAME_SIZE,
        })
      );
    });

    it('should use dark color for contrast', () => {
      renderer.drawAlmanacLabel(mockCtx, { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          color: QR_COLORS.GRADIENT_END,
        })
      );
    });

    it('should have no shadow blur', () => {
      renderer.drawAlmanacLabel(mockCtx, { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          shadowBlur: 0,
        })
      );
    });
  });

  describe('edge cases and special characters', () => {
    it('should handle empty character name', () => {
      renderer.drawCharacterName(mockCtx, '', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: '',
        })
      );
    });

    it('should handle special characters in text', () => {
      renderer.drawCharacterName(mockCtx, 'The Imp™', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'THE IMP™',
        })
      );
    });

    it('should handle very long ability text', () => {
      const longText = 'A'.repeat(500);
      renderer.drawAbilityText(mockCtx, longText, 300);

      expect(drawAbilityText).toHaveBeenCalled();
    });

    it('should handle unicode characters', () => {
      renderer.drawReminderText(mockCtx, 'is drunk 🍺', { x: 150, y: 150 }, 150, 300);

      expect(drawCurvedText).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          text: 'IS DRUNK 🍺',
        })
      );
    });

    it('should handle zero diameter gracefully', () => {
      renderer.drawTokenCount(mockCtx, 3, 0);

      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });
});
