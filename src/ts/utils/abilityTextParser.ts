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
  const segments: TextSegment[] = [];
  const regex = /(\[[^\]]*\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match !== null) {
    // Add text before the match (non-bold)
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isBold: false,
      });
    }
    // Add the matched bracket text (bold)
    segments.push({
      text: match[1],
      isBold: true,
    });
    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isBold: false,
    });
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
  let _pos = 0;
  for (const segment of fullSegments) {
    for (let i = 0; i < segment.text.length; i++) {
      charBoldMap.push(segment.isBold);
    }
    _pos += segment.text.length;
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
