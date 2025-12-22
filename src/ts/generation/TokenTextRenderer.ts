/**
 * Blood on the Clocktower Token Generator
 * Token Text Renderer - Handles text rendering for tokens
 *
 * Extracted from TokenGenerator to follow Single Responsibility Principle.
 * This class focuses solely on rendering text on tokens.
 */

import {
  calculateCircularTextLayout,
  drawAbilityText,
  drawCenteredWrappedText,
  drawCurvedText,
  type Point,
  type TextLayoutResult,
} from '@/ts/canvas/index.js';
import CONFIG from '@/ts/config.js';
import {
  CHARACTER_LAYOUT,
  DEFAULT_COLORS,
  LINE_HEIGHTS,
  META_TOKEN_LAYOUT,
  QR_COLORS,
  QR_TOKEN_LAYOUT,
  REMINDER_LAYOUT,
  TOKEN_COUNT_BADGE,
} from '@/ts/constants.js';
import type { ReminderCountStyle } from '@/ts/types/index.js';
import type { TokenGeneratorOptions } from '@/ts/types/tokenOptions.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Format reminder count based on the selected style
 */
function formatReminderCount(count: number, style: ReminderCountStyle = 'arabic'): string {
  switch (style) {
    case 'roman': {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      return romanNumerals[count - 1] || count.toString();
    }
    case 'circled':
      if (count >= 1 && count <= 20) {
        return String.fromCodePoint(0x245f + count);
      }
      return count.toString();
    case 'dots':
      return '\u2022'.repeat(count);
    default:
      return count.toString();
  }
}

/**
 * Handles all text rendering operations for tokens
 */
export class TokenTextRenderer {
  private options: TokenGeneratorOptions;

  constructor(options: TokenGeneratorOptions) {
    this.options = options;
  }

  /**
   * Update renderer options
   */
  updateOptions(options: Partial<TokenGeneratorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Calculate ability text layout
   */
  calculateAbilityTextLayout(
    ctx: CanvasRenderingContext2D,
    ability: string,
    diameter: number
  ): TextLayoutResult {
    ctx.save();
    const fontSize = diameter * CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO;
    ctx.font = `${fontSize}px "${this.options.abilityTextFont}", sans-serif`;
    const lineHeightMultiplier = CONFIG.FONTS.ABILITY_TEXT.LINE_HEIGHT ?? LINE_HEIGHTS.STANDARD;
    const startY = diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION;

    // Use optimized circular text layout calculation
    const layout = calculateCircularTextLayout(
      ctx,
      ability,
      diameter,
      fontSize,
      lineHeightMultiplier,
      startY,
      CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING
    );

    ctx.restore();

    logger.debug('TokenTextRenderer', 'Calculated ability text layout', {
      lines: layout.lines.length,
      totalHeight: layout.totalHeight,
    });

    return layout;
  }

  /**
   * Draw character name text
   */
  drawCharacterName(
    ctx: CanvasRenderingContext2D,
    name: string,
    center: Point,
    radius: number,
    diameter: number
  ): void {
    drawCurvedText(ctx, {
      text: name.toUpperCase(),
      centerX: center.x,
      centerY: center.y,
      radius: radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS,
      fontFamily: this.options.characterNameFont,
      fontSize: diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO,
      position: 'bottom',
      color: this.options.characterNameColor,
      letterSpacing: this.options.fontSpacing.characterName,
      shadowBlur: this.options.textShadow?.characterName ?? 4,
    });

    logger.debug('TokenTextRenderer', 'Drew character name', name);
  }

  /**
   * Draw ability text
   */
  drawAbilityText(ctx: CanvasRenderingContext2D, ability: string, diameter: number): void {
    drawAbilityText(
      ctx,
      ability,
      diameter,
      this.options.abilityTextFont,
      CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO,
      CONFIG.FONTS.ABILITY_TEXT.LINE_HEIGHT ?? LINE_HEIGHTS.STANDARD,
      CHARACTER_LAYOUT.ABILITY_TEXT_MAX_WIDTH,
      CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION,
      this.options.abilityTextColor,
      this.options.fontSpacing.abilityText,
      this.options.textShadow?.abilityText ?? 3
    );

    logger.debug('TokenTextRenderer', 'Drew ability text', {
      length: ability.length,
      font: this.options.abilityTextFont,
    });
  }

  /**
   * Draw reminder text
   */
  drawReminderText(
    ctx: CanvasRenderingContext2D,
    reminderText: string,
    center: Point,
    radius: number,
    diameter: number
  ): void {
    const reminderLayout = REMINDER_LAYOUT;

    drawCurvedText(ctx, {
      text: reminderText.toUpperCase(),
      centerX: center.x,
      centerY: center.y,
      radius: radius * reminderLayout.CURVED_TEXT_RADIUS,
      fontFamily: this.options.characterReminderFont,
      fontSize: diameter * CONFIG.FONTS.REMINDER_TEXT.SIZE_RATIO,
      position: 'bottom',
      color: this.options.reminderTextColor,
      letterSpacing: this.options.fontSpacing.reminderText,
      shadowBlur: this.options.textShadow?.reminderText ?? 4,
    });

    logger.debug('TokenTextRenderer', 'Drew reminder text', reminderText);
  }

  /**
   * Draw token count badge
   */
  drawTokenCount(ctx: CanvasRenderingContext2D, count: number, diameter: number): void {
    ctx.save();
    const fontSize = diameter * CONFIG.FONTS.TOKEN_COUNT.SIZE_RATIO;
    ctx.font = `bold ${fontSize}px "${this.options.characterNameFont}", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const y = diameter * CHARACTER_LAYOUT.TOKEN_COUNT_Y_POSITION;

    // Format the count based on the selected style
    const style = this.options.reminderCountStyle || 'arabic';
    const displayText = formatReminderCount(count, style);

    // Adjust badge size for dots style (wider)
    const badgeRadius =
      style === 'dots'
        ? fontSize *
          TOKEN_COUNT_BADGE.BACKGROUND_RADIUS *
          (1 + count * TOKEN_COUNT_BADGE.SIZE_GROWTH_PER_ITEM)
        : fontSize * TOKEN_COUNT_BADGE.BACKGROUND_RADIUS;

    // Draw background circle
    ctx.beginPath();
    ctx.arc(diameter / 2, y, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = DEFAULT_COLORS.BADGE_BACKGROUND;
    ctx.fill();
    ctx.strokeStyle = DEFAULT_COLORS.TEXT_PRIMARY;
    ctx.lineWidth = TOKEN_COUNT_BADGE.STROKE_WIDTH;
    ctx.stroke();

    // Draw count text
    ctx.fillStyle = DEFAULT_COLORS.TEXT_PRIMARY;
    ctx.fillText(displayText, diameter / 2, y);
    ctx.restore();

    logger.debug('TokenTextRenderer', 'Drew token count badge', displayText);
  }

  /**
   * Draw centered wrapped text (for meta tokens)
   */
  drawCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    diameter: number,
    verticalOffset?: number
  ): void {
    const metaFont = this.options.metaNameFont || this.options.characterNameFont;
    const metaColor = this.options.metaNameColor || DEFAULT_COLORS.TEXT_PRIMARY;

    drawCenteredWrappedText(ctx, {
      text: text.toUpperCase(),
      diameter,
      fontFamily: metaFont,
      fontSizeRatio: META_TOKEN_LAYOUT.CENTERED_TEXT_SIZE,
      maxWidthRatio: META_TOKEN_LAYOUT.CENTERED_TEXT_MAX_WIDTH,
      color: metaColor,
      shadowBlur: this.options.textShadow?.metaText ?? 4,
      verticalOffset,
    });

    logger.debug('TokenTextRenderer', 'Drew centered text', text);
  }

  /**
   * Draw author text on meta token
   */
  drawAuthorText(
    ctx: CanvasRenderingContext2D,
    author: string,
    center: Point,
    radius: number,
    diameter: number
  ): void {
    const metaFont = this.options.metaNameFont || this.options.characterNameFont;
    const metaColor = this.options.metaNameColor || DEFAULT_COLORS.TEXT_PRIMARY;

    drawCurvedText(ctx, {
      text: author,
      centerX: center.x,
      centerY: center.y,
      radius: radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS,
      fontFamily: metaFont,
      fontSize:
        diameter *
        CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO *
        META_TOKEN_LAYOUT.AUTHOR_TEXT_SIZE_FACTOR,
      position: 'bottom',
      color: metaColor,
      letterSpacing: this.options.fontSpacing.metaText ?? 0,
      shadowBlur: this.options.textShadow?.metaText ?? 4,
    });

    logger.debug('TokenTextRenderer', 'Drew author text', author);
  }

  /**
   * Draw "ALMANAC" curved at the bottom of QR token
   */
  drawAlmanacLabel(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    diameter: number
  ): void {
    const metaFont = this.options.metaNameFont || this.options.characterNameFont;

    // Draw "ALMANAC" curved at bottom
    drawCurvedText(ctx, {
      text: 'ALMANAC',
      centerX: center.x,
      centerY: center.y,
      radius: radius * QR_TOKEN_LAYOUT.SCRIPT_NAME_RADIUS,
      fontFamily: metaFont,
      fontSize: diameter * QR_TOKEN_LAYOUT.SCRIPT_NAME_SIZE,
      position: 'bottom',
      color: QR_COLORS.GRADIENT_END, // Use dark color for contrast
      letterSpacing: this.options.fontSpacing.metaText ?? 0,
      shadowBlur: 0,
    });

    logger.debug('TokenTextRenderer', 'Drew ALMANAC label');
  }
}

export default TokenTextRenderer;
