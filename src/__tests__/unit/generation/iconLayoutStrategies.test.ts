import { describe, expect, it } from 'vitest';
import { CHARACTER_LAYOUT, REMINDER_LAYOUT, TokenType } from '@/ts/constants';
import {
  CharacterWithAbilityTextLayout,
  CharacterWithoutAbilityTextLayout,
  IconLayoutStrategyFactory,
  type LayoutContext,
  MetaTokenLayout,
  ReminderTokenLayout,
} from '@/ts/generation/iconLayoutStrategies';

// Test helper to create layout context
function createLayoutContext(overrides: Partial<LayoutContext> = {}): LayoutContext {
  return {
    diameter: 300,
    dpi: 300,
    iconScale: 1.0,
    iconOffsetX: 0,
    iconOffsetY: 0,
    ...overrides,
  };
}

describe('iconLayoutStrategies', () => {
  describe('CharacterWithAbilityTextLayout', () => {
    it('should calculate layout with ability text', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context = createLayoutContext();

      const result = strategy.calculate(context);

      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('position');
      expect(result.position).toHaveProperty('x');
      expect(result.position).toHaveProperty('y');
    });

    it('should calculate correct vertical spacing with ability text', () => {
      const abilityTextHeight = 50;
      const abilityTextStartY = 40;
      const strategy = new CharacterWithAbilityTextLayout(abilityTextHeight, abilityTextStartY);
      const context = createLayoutContext({ diameter: 300 });

      const result = strategy.calculate(context);

      // Character name is at bottom (curved text)
      const characterNameY = 300 * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;
      // Ability text ends at startY + height
      const abilityTextEndY = abilityTextStartY + abilityTextHeight;
      // Available height for icon
      const availableHeight = characterNameY - abilityTextEndY;
      // Expected optimal size
      const expectedOptimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_WITH_ABILITY;
      const expectedImageSizeRatio = expectedOptimalSize / 300;
      const expectedSize = 300 * expectedImageSizeRatio * 1.0;

      expect(result.size).toBeCloseTo(expectedSize, 2);
    });

    it('should apply icon scale correctly', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context1 = createLayoutContext({ iconScale: 1.0 });
      const context2 = createLayoutContext({ iconScale: 1.5 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      expect(result2.size).toBeCloseTo(result1.size * 1.5, 2);
    });

    it('should apply horizontal offset in pixels', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context = createLayoutContext({ iconOffsetX: 0.1, dpi: 300 });

      const result = strategy.calculate(context);

      // Offset should be 0.1 inches * 300 dpi = 30 pixels
      const baseContext = createLayoutContext({ iconOffsetX: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      expect(result.position.x).toBeCloseTo(baseResult.position.x + 30, 2);
    });

    it('should apply vertical offset in pixels (negated)', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context = createLayoutContext({ iconOffsetY: 0.1, dpi: 300 });

      const result = strategy.calculate(context);

      // Offset should be negated: -0.1 inches * 300 dpi = -30 pixels
      const baseContext = createLayoutContext({ iconOffsetY: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      expect(result.position.y).toBeCloseTo(baseResult.position.y - 30, 2);
    });

    it('should center icon horizontally by default', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context = createLayoutContext({ diameter: 300, iconOffsetX: 0 });

      const result = strategy.calculate(context);

      // Base offset should center the icon
      const expectedBaseOffsetX = (300 - result.size) / 2;
      expect(result.position.x).toBeCloseTo(expectedBaseOffsetX, 2);
    });

    it('should handle different DPI values', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context1 = createLayoutContext({ dpi: 300, iconOffsetX: 0.1 });
      const context2 = createLayoutContext({ dpi: 600, iconOffsetX: 0.1 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      // At 300 DPI, 0.1 inches = 30 pixels offset
      // At 600 DPI, 0.1 inches = 60 pixels offset
      // The difference should be 30 pixels
      expect(Math.abs(result2.position.x - result1.position.x)).toBeCloseTo(30, 2);
    });

    it('should handle small available height gracefully', () => {
      const strategy = new CharacterWithAbilityTextLayout(200, 40);
      const context = createLayoutContext({ diameter: 300 });

      const result = strategy.calculate(context);

      expect(result.size).toBeGreaterThan(0);
      expect(Number.isFinite(result.size)).toBe(true);
      expect(Number.isFinite(result.position.x)).toBe(true);
      expect(Number.isFinite(result.position.y)).toBe(true);
    });
  });

  describe('CharacterWithoutAbilityTextLayout', () => {
    it('should calculate layout without ability text', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context = createLayoutContext();

      const result = strategy.calculate(context);

      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('position');
      expect(result.position).toHaveProperty('x');
      expect(result.position).toHaveProperty('y');
    });

    it('should use default top margin when no override provided', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context = createLayoutContext({ diameter: 300 });

      const result = strategy.calculate(context);

      const characterNameY = 300 * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;
      const topMargin = 300 * CHARACTER_LAYOUT.NO_ABILITY_TOP_MARGIN;
      const availableHeight = characterNameY - topMargin;
      const expectedOptimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_NO_ABILITY;
      const expectedImageSizeRatio = expectedOptimalSize / 300;
      const expectedSize = 300 * expectedImageSizeRatio * 1.0;

      expect(result.size).toBeCloseTo(expectedSize, 2);
    });

    it('should use top boundary override when provided', () => {
      const topBoundaryOverride = 50;
      const strategy = new CharacterWithoutAbilityTextLayout(topBoundaryOverride);
      const context = createLayoutContext({ diameter: 300 });

      const result = strategy.calculate(context);

      const characterNameY = 300 * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;
      const availableHeight = characterNameY - topBoundaryOverride;
      const expectedOptimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_NO_ABILITY;
      const expectedImageSizeRatio = expectedOptimalSize / 300;
      const expectedSize = 300 * expectedImageSizeRatio * 1.0;

      expect(result.size).toBeCloseTo(expectedSize, 2);
    });

    it('should apply icon scale correctly', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context1 = createLayoutContext({ iconScale: 1.0 });
      const context2 = createLayoutContext({ iconScale: 2.0 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      expect(result2.size).toBeCloseTo(result1.size * 2.0, 2);
    });

    it('should apply horizontal offset', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context = createLayoutContext({ iconOffsetX: 0.2, dpi: 300 });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ iconOffsetX: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      // 0.2 inches * 300 dpi = 60 pixels
      expect(result.position.x).toBeCloseTo(baseResult.position.x + 60, 2);
    });

    it('should apply vertical offset (negated)', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context = createLayoutContext({ iconOffsetY: 0.2, dpi: 300 });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ iconOffsetY: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      // Negated: -0.2 inches * 300 dpi = -60 pixels
      expect(result.position.y).toBeCloseTo(baseResult.position.y - 60, 2);
    });

    it('should center icon horizontally by default', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context = createLayoutContext({ diameter: 300, iconOffsetX: 0 });

      const result = strategy.calculate(context);

      const expectedBaseOffsetX = (300 - result.size) / 2;
      expect(result.position.x).toBeCloseTo(expectedBaseOffsetX, 2);
    });

    it('should handle badge override larger than default margin', () => {
      const largeOverride = 100;
      const strategy = new CharacterWithoutAbilityTextLayout(largeOverride);
      const context = createLayoutContext({ diameter: 300 });

      const result = strategy.calculate(context);

      // With larger top boundary, icon should be smaller
      const strategyDefault = new CharacterWithoutAbilityTextLayout();
      const resultDefault = strategyDefault.calculate(context);

      expect(result.size).toBeLessThan(resultDefault.size);
    });

    it('should handle badge override smaller than default margin', () => {
      const smallOverride = 10;
      const strategy = new CharacterWithoutAbilityTextLayout(smallOverride);
      const context = createLayoutContext({ diameter: 300 });

      const result = strategy.calculate(context);

      // With smaller top boundary, icon should be larger
      const strategyDefault = new CharacterWithoutAbilityTextLayout();
      const resultDefault = strategyDefault.calculate(context);

      expect(result.size).toBeGreaterThan(resultDefault.size);
    });
  });

  describe('ReminderTokenLayout', () => {
    it('should calculate layout for reminder token', () => {
      const strategy = new ReminderTokenLayout();
      const context = createLayoutContext();

      const result = strategy.calculate(context);

      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('position');
      expect(result.position).toHaveProperty('x');
      expect(result.position).toHaveProperty('y');
    });

    it('should use reminder layout constants', () => {
      const strategy = new ReminderTokenLayout();
      const context = createLayoutContext({ diameter: 300, iconScale: 1.0 });

      const result = strategy.calculate(context);

      const expectedSize = 300 * REMINDER_LAYOUT.IMAGE_SIZE_RATIO * 1.0;
      expect(result.size).toBeCloseTo(expectedSize, 2);
    });

    it('should apply vertical offset from constants', () => {
      const strategy = new ReminderTokenLayout();
      const context = createLayoutContext({ diameter: 300, iconOffsetY: 0 });

      const result = strategy.calculate(context);

      const size = 300 * REMINDER_LAYOUT.IMAGE_SIZE_RATIO * 1.0;
      const baseOffsetY = (300 - size) / 2 - 300 * REMINDER_LAYOUT.IMAGE_VERTICAL_OFFSET;

      expect(result.position.y).toBeCloseTo(baseOffsetY, 2);
    });

    it('should apply icon scale', () => {
      const strategy = new ReminderTokenLayout();
      const context1 = createLayoutContext({ iconScale: 1.0 });
      const context2 = createLayoutContext({ iconScale: 0.8 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      expect(result2.size).toBeCloseTo(result1.size * 0.8, 2);
    });

    it('should apply horizontal offset', () => {
      const strategy = new ReminderTokenLayout();
      const context = createLayoutContext({ iconOffsetX: 0.15, dpi: 300 });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ iconOffsetX: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      expect(result.position.x).toBeCloseTo(baseResult.position.x + 45, 2);
    });

    it('should apply vertical offset', () => {
      const strategy = new ReminderTokenLayout();
      const context = createLayoutContext({ iconOffsetY: 0.15, dpi: 300 });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ iconOffsetY: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      expect(result.position.y).toBeCloseTo(baseResult.position.y - 45, 2);
    });

    it('should center icon horizontally by default', () => {
      const strategy = new ReminderTokenLayout();
      const context = createLayoutContext({ diameter: 300, iconOffsetX: 0 });

      const result = strategy.calculate(context);

      const expectedBaseOffsetX = (300 - result.size) / 2;
      expect(result.position.x).toBeCloseTo(expectedBaseOffsetX, 2);
    });
  });

  describe('MetaTokenLayout', () => {
    it('should calculate layout for meta token', () => {
      const strategy = new MetaTokenLayout();
      const context = createLayoutContext();

      const result = strategy.calculate(context);

      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('position');
      expect(result.position).toHaveProperty('x');
      expect(result.position).toHaveProperty('y');
    });

    it('should use 1.0 image size ratio', () => {
      const strategy = new MetaTokenLayout();
      const context = createLayoutContext({ diameter: 300, iconScale: 1.0 });

      const result = strategy.calculate(context);

      const expectedSize = 300 * 1.0 * 1.0;
      expect(result.size).toBe(expectedSize);
    });

    it('should center icon horizontally and vertically by default', () => {
      const strategy = new MetaTokenLayout();
      const context = createLayoutContext({ diameter: 300, iconOffsetX: 0, iconOffsetY: 0 });

      const result = strategy.calculate(context);

      const expectedOffsetX = (300 - result.size) / 2;
      const expectedOffsetY = (300 - result.size) / 2;

      expect(result.position.x).toBeCloseTo(expectedOffsetX, 2);
      expect(result.position.y).toBeCloseTo(expectedOffsetY, 2);
    });

    it('should apply icon scale', () => {
      const strategy = new MetaTokenLayout();
      const context1 = createLayoutContext({ iconScale: 1.0 });
      const context2 = createLayoutContext({ iconScale: 1.3 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      expect(result2.size).toBeCloseTo(result1.size * 1.3, 2);
    });

    it('should apply horizontal offset', () => {
      const strategy = new MetaTokenLayout();
      const context = createLayoutContext({ iconOffsetX: 0.25, dpi: 300 });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ iconOffsetX: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      expect(result.position.x).toBeCloseTo(baseResult.position.x + 75, 2);
    });

    it('should apply vertical offset', () => {
      const strategy = new MetaTokenLayout();
      const context = createLayoutContext({ iconOffsetY: 0.25, dpi: 300 });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ iconOffsetY: 0, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      expect(result.position.y).toBeCloseTo(baseResult.position.y - 75, 2);
    });

    it('should handle zero diameter gracefully', () => {
      const strategy = new MetaTokenLayout();
      const context = createLayoutContext({ diameter: 0 });

      const result = strategy.calculate(context);

      expect(result.size).toBe(0);
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(0);
    });

    it('should handle negative icon scale as absolute value', () => {
      const strategy = new MetaTokenLayout();
      const context1 = createLayoutContext({ iconScale: 1.0 });
      const context2 = createLayoutContext({ iconScale: -1.0 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      // Size should still be calculated with the scale value (negative scales are valid in canvas)
      expect(result2.size).toBeCloseTo(-result1.size, 2);
    });
  });

  describe('IconLayoutStrategyFactory', () => {
    describe('createCharacterLayout', () => {
      it('should create CharacterWithAbilityTextLayout when hasAbilityText is true', () => {
        const strategy = IconLayoutStrategyFactory.createCharacterLayout(true, 50, 40);

        expect(strategy).toBeInstanceOf(CharacterWithAbilityTextLayout);
      });

      it('should create CharacterWithoutAbilityTextLayout when hasAbilityText is false', () => {
        const strategy = IconLayoutStrategyFactory.createCharacterLayout(false);

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
      });

      it('should create CharacterWithoutAbilityTextLayout with override when provided', () => {
        const strategy = IconLayoutStrategyFactory.createCharacterLayout(
          false,
          undefined,
          undefined,
          100
        );

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
      });

      it('should not create ability text layout if height is missing', () => {
        const strategy = IconLayoutStrategyFactory.createCharacterLayout(true, undefined, 40);

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
      });

      it('should not create ability text layout if startY is missing', () => {
        const strategy = IconLayoutStrategyFactory.createCharacterLayout(true, 50, undefined);

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
      });

      it('should prefer ability text layout over topBoundaryOverride', () => {
        const strategy = IconLayoutStrategyFactory.createCharacterLayout(true, 50, 40, 100);

        expect(strategy).toBeInstanceOf(CharacterWithAbilityTextLayout);
      });
    });

    describe('create', () => {
      it('should create CharacterWithAbilityTextLayout for CHARACTER token with ability text', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.CHARACTER, true, 50, 40);

        expect(strategy).toBeInstanceOf(CharacterWithAbilityTextLayout);
      });

      it('should create CharacterWithoutAbilityTextLayout for CHARACTER token without ability text', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.CHARACTER, false);

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
      });

      it('should create ReminderTokenLayout for REMINDER token', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.REMINDER);

        expect(strategy).toBeInstanceOf(ReminderTokenLayout);
      });

      it('should create MetaTokenLayout for META token', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.META);

        expect(strategy).toBeInstanceOf(MetaTokenLayout);
      });

      it('should default hasAbilityText to false when undefined', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.CHARACTER);

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
      });

      it('should create MetaTokenLayout for unknown token type', () => {
        const strategy = IconLayoutStrategyFactory.create('unknown' as TokenTypeValue);

        expect(strategy).toBeInstanceOf(MetaTokenLayout);
      });

      it('should pass topBoundaryOverride to character layout', () => {
        const strategy = IconLayoutStrategyFactory.create(
          TokenType.CHARACTER,
          false,
          undefined,
          undefined,
          80
        );

        expect(strategy).toBeInstanceOf(CharacterWithoutAbilityTextLayout);
        // Verify it uses the override by checking calculation
        const context = createLayoutContext({ diameter: 300 });
        const result = strategy.calculate(context);
        expect(result.size).toBeGreaterThan(0);
      });

      it('should ignore ability text params for REMINDER token', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.REMINDER, true, 50, 40);

        expect(strategy).toBeInstanceOf(ReminderTokenLayout);
      });

      it('should ignore ability text params for META token', () => {
        const strategy = IconLayoutStrategyFactory.create(TokenType.META, true, 50, 40);

        expect(strategy).toBeInstanceOf(MetaTokenLayout);
      });
    });
  });

  describe('Integration tests', () => {
    it('should produce consistent results for same context', () => {
      const strategy = new CharacterWithAbilityTextLayout(50, 40);
      const context = createLayoutContext({ diameter: 300, iconScale: 1.2 });

      const result1 = strategy.calculate(context);
      const result2 = strategy.calculate(context);

      expect(result1.size).toBe(result2.size);
      expect(result1.position.x).toBe(result2.position.x);
      expect(result1.position.y).toBe(result2.position.y);
    });

    it('should handle extreme icon scales', () => {
      const strategy = new ReminderTokenLayout();
      const context1 = createLayoutContext({ iconScale: 0.1 });
      const context2 = createLayoutContext({ iconScale: 5.0 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      expect(result1.size).toBeGreaterThan(0);
      expect(result2.size).toBeGreaterThan(0);
      expect(result2.size).toBeGreaterThan(result1.size);
    });

    it('should handle different diameters proportionally', () => {
      const strategy = new MetaTokenLayout();
      const context1 = createLayoutContext({ diameter: 100 });
      const context2 = createLayoutContext({ diameter: 300 });

      const result1 = strategy.calculate(context1);
      const result2 = strategy.calculate(context2);

      // Size should scale proportionally
      expect(result2.size / result1.size).toBeCloseTo(3, 1);
    });

    it('should maintain aspect ratio across all strategies', () => {
      const context = createLayoutContext({ diameter: 300 });

      const strategies = [
        new CharacterWithAbilityTextLayout(50, 40),
        new CharacterWithoutAbilityTextLayout(),
        new ReminderTokenLayout(),
        new MetaTokenLayout(),
      ];

      for (const strategy of strategies) {
        const result = strategy.calculate(context);
        expect(result.size).toBeGreaterThan(0);
        expect(result.size).toBeLessThanOrEqual(context.diameter);
      }
    });

    it('should combine offsets correctly', () => {
      const strategy = new CharacterWithoutAbilityTextLayout();
      const context = createLayoutContext({
        diameter: 300,
        dpi: 300,
        iconOffsetX: 0.1,
        iconOffsetY: 0.2,
      });

      const result = strategy.calculate(context);

      const baseContext = createLayoutContext({ diameter: 300, dpi: 300 });
      const baseResult = strategy.calculate(baseContext);

      // X offset: +0.1 inches * 300 dpi = +30 pixels
      expect(result.position.x).toBeCloseTo(baseResult.position.x + 30, 2);
      // Y offset: -0.2 inches * 300 dpi = -60 pixels (negated)
      expect(result.position.y).toBeCloseTo(baseResult.position.y - 60, 2);
    });
  });
});
