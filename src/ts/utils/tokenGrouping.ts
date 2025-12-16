/**
 * Token Grouping Utilities
 * Groups duplicate tokens for display while preserving all tokens for export
 * Handles variants (different images) separately from duplicates (same token multiple times)
 */

import type { Token } from '../types/index.js';

export interface GroupedToken {
  token: Token; // The first (representative) token of the group
  count: number; // Total number of duplicate tokens (same variant)
  allTokens: Token[]; // All tokens in the group (for export purposes)
  variants: Token[]; // All variant tokens (different images of same character)
}

/**
 * Generate a unique identity key for a token to identify duplicates
 * - Character tokens: name + type + variantIndex (so variants are NOT grouped as duplicates)
 * - Reminder tokens: parentCharacter + reminderText + type + variantIndex (so variants are NOT grouped as duplicates)
 * - Meta tokens: name + type
 */
function getTokenIdentityKey(token: Token): string {
  if (token.type === 'reminder') {
    // Reminder tokens include variantIndex so each variant is separate
    if (token.variantIndex !== undefined) {
      return `reminder_${token.parentCharacter || ''}_${token.reminderText || ''}_v${token.variantIndex}`;
    }
    return `reminder_${token.parentCharacter || ''}_${token.reminderText || ''}`;
  }
  // Character tokens include variantIndex so each variant is separate
  if (token.type === 'character' && token.variantIndex !== undefined) {
    return `${token.type}_${token.name}_v${token.variantIndex}`;
  }
  // Character and meta tokens use name + type
  return `${token.type}_${token.name}`;
}

/**
 * Generate a base identity key for grouping variants together
 * Used to collect all variants of the same character or reminder
 */
function getVariantGroupKey(token: Token): string {
  if (token.type === 'character') {
    return `character_${token.name}`;
  }
  if (token.type === 'reminder') {
    return `reminder_${token.parentCharacter || ''}_${token.reminderText || ''}`;
  }
  return getTokenIdentityKey(token);
}

/**
 * Group tokens by their identity, returning the first token of each group with a count
 * Also collects variants (different images of the same character) into a variants array
 * @param tokens - Array of tokens to group
 * @returns Array of grouped tokens with count badges and variant arrays
 */
export function groupTokensByIdentity(tokens: Token[]): GroupedToken[] {
  // First pass: group by exact identity (including variant index)
  const duplicateGroups = new Map<string, GroupedToken>();

  for (const token of tokens) {
    const key = getTokenIdentityKey(token);

    if (duplicateGroups.has(key)) {
      const group = duplicateGroups.get(key)!;
      group.count++;
      group.allTokens.push(token);
    } else {
      duplicateGroups.set(key, {
        token,
        count: 1,
        allTokens: [token],
        variants: [], // Will be populated in second pass
      });
    }
  }

  // Second pass: collect variants for each character
  // Group by base name (without variant index) to find all variants
  const variantGroups = new Map<string, GroupedToken[]>();

  for (const group of duplicateGroups.values()) {
    const variantKey = getVariantGroupKey(group.token);

    if (!variantGroups.has(variantKey)) {
      variantGroups.set(variantKey, []);
    }
    variantGroups.get(variantKey)!.push(group);
  }

  // Build final result: for each variant group, set the variants array
  // Only keep the first variant as the main entry, others are in variants array
  const result: GroupedToken[] = [];

  for (const groups of variantGroups.values()) {
    // Sort by variantIndex to ensure consistent order
    groups.sort((a, b) => {
      const indexA = a.token.variantIndex ?? 0;
      const indexB = b.token.variantIndex ?? 0;
      return indexA - indexB;
    });

    // The first group becomes the main entry
    const mainGroup = groups[0];

    // Collect all variant tokens (from all groups in this variant set)
    mainGroup.variants = groups.map((g) => g.token);

    result.push(mainGroup);
  }

  return result;
}
