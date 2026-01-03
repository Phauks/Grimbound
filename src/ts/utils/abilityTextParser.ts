/**
 * Ability Text Parser
 *
 * Parses ability text to extract styled segments for token rendering.
 * Text inside [] brackets (including the brackets) is marked as bold.
 */

export interface TextSegment {
  text: string;
  isBold: boolean;
}

/**
 * Result of splitting ability text into regular text and setup content.
 */
export interface AbilitySplit {
  /** Ability text with setup brackets removed */
  abilityWithoutSetup: string;
  /** Content inside the [] brackets (without brackets) */
  setupContent: string;
}

/**
 * Parses ability text and extracts segments with bold markers.
 * Text inside [] (including the brackets) is marked as bold.
 *
 * @example
 * parseAbilityText("Each night* [except the first], you learn...")
 * // Returns: [
 * //   { text: "Each night* ", isBold: false },
 * //   { text: "[except the first]", isBold: true },
 * //   { text: ", you learn...", isBold: false }
 * // ]
 */
export function parseAbilityText(text: string): TextSegment[] {
  // Use a state machine approach to avoid ReDoS vulnerability (O(n) complexity)
  const segments: TextSegment[] = [];
  let currentText = '';
  let inBracket = false;

  for (const char of text) {
    if (char === '[' && !inBracket) {
      // Starting a bracket section - save any accumulated non-bold text
      if (currentText) {
        segments.push({ text: currentText, isBold: false });
        currentText = '';
      }
      inBracket = true;
      currentText = '[';
    } else if (char === ']' && inBracket) {
      // Ending a bracket section
      currentText += ']';
      segments.push({ text: currentText, isBold: true });
      currentText = '';
      inBracket = false;
    } else {
      currentText += char;
    }
  }

  // Handle any remaining text
  if (currentText) {
    // If we're still inside an unclosed bracket, treat it as non-bold
    // (the bracket was never properly closed)
    segments.push({ text: currentText, isBold: false });
  }

  // Return at least one segment for empty or non-matching text
  return segments.length > 0 ? segments : [{ text, isBold: false }];
}

/**
 * Checks if ability text contains setup brackets.
 *
 * @param text - The ability text to check
 * @returns true if the text contains at least one [] bracket pair
 */
export function hasSetupBrackets(text: string): boolean {
  return /\[.*?\]/.test(text);
}

/**
 * Given a line of text and the original parsed segments,
 * returns the segments that appear in this line.
 *
 * This function is used during rendering to determine which parts
 * of a wrapped line should be bold vs normal.
 *
 * @param line - A single line of wrapped text
 * @param originalText - The full original ability text
 * @returns Array of segments with bold flags for this line
 */
export function getLineSegments(line: string, originalText: string): TextSegment[] {
  // Parse the full text to get all segments with their positions
  const fullSegments = parseAbilityText(originalText);

  // If there are no bold segments, return the line as-is
  const hasBold = fullSegments.some((s) => s.isBold);
  if (!hasBold) {
    return [{ text: line, isBold: false }];
  }

  // Build a map of character positions to their bold status
  // This approach handles the case where a line may contain parts of multiple segments
  const charBoldMap: boolean[] = [];
  for (const segment of fullSegments) {
    for (const _char of segment.text) {
      charBoldMap.push(segment.isBold);
    }
  }

  // Find where this line appears in the original text
  // Account for space normalization during word wrapping
  const lineStart = findLineInText(line, originalText);
  if (lineStart === -1) {
    // Fallback: couldn't find line, return as non-bold
    return [{ text: line, isBold: false }];
  }

  // Build segments for this line based on the character map
  const lineSegments: TextSegment[] = [];
  let currentSegment: TextSegment | null = null;

  for (let i = 0; i < line.length; i++) {
    const charIndex = lineStart + i;
    const isBold = charIndex < charBoldMap.length ? charBoldMap[charIndex] : false;

    if (!currentSegment || currentSegment.isBold !== isBold) {
      if (currentSegment && currentSegment.text.length > 0) {
        lineSegments.push(currentSegment);
      }
      currentSegment = { text: line[i], isBold };
    } else {
      currentSegment.text += line[i];
    }
  }

  if (currentSegment && currentSegment.text.length > 0) {
    lineSegments.push(currentSegment);
  }

  return lineSegments.length > 0 ? lineSegments : [{ text: line, isBold: false }];
}

/**
 * Finds the starting position of a wrapped line within the original text.
 * Handles the case where word wrapping may have changed spacing.
 *
 * @param line - The wrapped line to find
 * @param originalText - The original full text
 * @returns The starting index, or -1 if not found
 */
function findLineInText(line: string, originalText: string): number {
  // First, try exact match
  const exactIndex = originalText.indexOf(line);
  if (exactIndex !== -1) {
    return exactIndex;
  }

  // Word wrapping splits on spaces, so try matching word-by-word
  // This handles cases where extra spaces are normalized
  const lineWords = line.split(/\s+/).filter((w) => w.length > 0);
  if (lineWords.length === 0) {
    return -1;
  }

  // Find the first word and work from there
  const firstWord = lineWords[0];
  let searchStart = 0;

  while (true) {
    const wordIndex = originalText.indexOf(firstWord, searchStart);
    if (wordIndex === -1) {
      return -1;
    }

    // Verify this is the right occurrence by checking subsequent words
    let valid = true;
    let pos = wordIndex;

    for (const word of lineWords) {
      const nextWordPos = originalText.indexOf(word, pos);
      if (nextWordPos === -1 || nextWordPos > pos + word.length + 2) {
        // Word not found or too far away (allowing for 1-2 chars of space)
        valid = false;
        break;
      }
      pos = nextWordPos + word.length;
    }

    if (valid) {
      return wordIndex;
    }

    searchStart = wordIndex + 1;
  }
}

/**
 * Splits ability text into regular ability and setup content.
 * Uses a state machine approach (O(n) complexity) to avoid ReDoS.
 *
 * @param text - The ability text to split
 * @returns Object containing ability without setup and the setup content
 *
 * @example
 * splitAbilityText("Each night, learn something. [+1 Outsider]")
 * // Returns: {
 * //   abilityWithoutSetup: "Each night, learn something.",
 * //   setupContent: "+1 Outsider"
 * // }
 *
 * splitAbilityText("You start knowing [+2 Outsiders] and more")
 * // Returns: {
 * //   abilityWithoutSetup: "You start knowing  and more",
 * //   setupContent: "+2 Outsiders"
 * // }
 */
export function splitAbilityText(text: string): AbilitySplit {
  let abilityWithoutSetup = '';
  let setupContent = '';
  let inBracket = false;
  let foundBracket = false;

  for (const char of text) {
    if (char === '[' && !inBracket && !foundBracket) {
      // Starting a bracket section
      inBracket = true;
    } else if (char === ']' && inBracket) {
      // Ending a bracket section
      inBracket = false;
      foundBracket = true;
    } else if (inBracket) {
      // Inside brackets - add to setup content
      setupContent += char;
    } else {
      // Outside brackets - add to ability text
      abilityWithoutSetup += char;
    }
  }

  // If bracket was never closed, treat the content as regular ability text
  if (inBracket) {
    abilityWithoutSetup += `[${setupContent}`;
    setupContent = '';
  }

  // Clean up ability text - trim and normalize multiple spaces
  abilityWithoutSetup = abilityWithoutSetup.trim().replace(/\s{2,}/g, ' ');

  return {
    abilityWithoutSetup,
    setupContent,
  };
}

/**
 * Combines regular ability text with setup content.
 * Setup content is always appended at the end in brackets.
 *
 * @param ability - The ability text (without brackets)
 * @param setupContent - The setup content (without brackets)
 * @returns Combined ability text with setup in brackets at the end
 *
 * @example
 * combineAbilityWithSetup("Each night, learn something.", "+1 Outsider")
 * // Returns: "Each night, learn something. [+1 Outsider]"
 *
 * combineAbilityWithSetup("Each night", "+1 Outsider")
 * // Returns: "Each night [+1 Outsider]"
 */
export function combineAbilityWithSetup(ability: string, setupContent: string): string {
  const trimmedAbility = ability.trim();
  const trimmedSetup = setupContent.trim();

  if (!trimmedSetup) {
    return trimmedAbility;
  }

  // Add space before brackets if ability doesn't end with space
  const needsSpace = trimmedAbility.length > 0 && !/\s$/.test(trimmedAbility);

  return `${trimmedAbility}${needsSpace ? ' ' : ''}[${trimmedSetup}]`;
}
