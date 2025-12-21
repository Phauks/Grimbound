/**
 * useTokenDeletion Hook
 *
 * Manages token deletion logic including confirmation modal state.
 * Extracted from TokenGrid component to follow Single Responsibility Principle.
 */

import { useCallback, useState } from 'react';
import type { Character, GenerationOptions, Token } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

export interface UseTokenDeletionProps {
  /** All tokens in the grid */
  tokens: Token[];
  /** Characters array */
  characters: Character[];
  /** Function to update tokens */
  setTokens: (tokens: Token[]) => void;
  /** Function to update characters */
  setCharacters: (characters: Character[]) => void;
  /** Function to update generation options */
  updateGenerationOptions: (options: Partial<GenerationOptions>) => void;
}

export interface UseTokenDeletionReturn {
  /** Token currently selected for deletion */
  tokenToDelete: Token | null;
  /** Request deletion of a token (may show confirmation) */
  handleDeleteRequest: (token: Token) => void;
  /** Confirm and execute the deletion */
  confirmDelete: () => void;
  /** Cancel the deletion */
  cancelDelete: () => void;
}

/**
 * Hook for managing token deletion with confirmation
 *
 * @example
 * ```tsx
 * const deletion = useTokenDeletion({
 *   tokens,
 *   characters,
 *   setTokens,
 *   setCharacters,
 *   updateGenerationOptions
 * });
 *
 * // In your component:
 * <TokenCard onDelete={deletion.handleDeleteRequest} />
 * <ConfirmModal
 *   isOpen={deletion.tokenToDelete !== null}
 *   onConfirm={deletion.confirmDelete}
 *   onCancel={deletion.cancelDelete}
 * />
 * ```
 */
export function useTokenDeletion({
  tokens,
  characters,
  setTokens,
  setCharacters,
  updateGenerationOptions,
}: UseTokenDeletionProps): UseTokenDeletionReturn {
  const [tokenToDelete, setTokenToDelete] = useState<Token | null>(null);

  /**
   * Handle deletion request - may delete immediately or show confirmation
   */
  const handleDeleteRequest = useCallback(
    (token: Token) => {
      logger.debug('useTokenDeletion', 'Delete requested', { type: token.type, name: token.name });

      // Meta tokens can be deleted immediately without confirmation
      if (
        token.type === 'script-name' ||
        token.type === 'almanac' ||
        token.type === 'pandemonium' ||
        token.type === 'bootlegger'
      ) {
        // Disable the corresponding option
        if (token.type === 'script-name') {
          updateGenerationOptions({ scriptNameToken: false });
        } else if (token.type === 'almanac') {
          updateGenerationOptions({ almanacToken: false });
        } else if (token.type === 'pandemonium') {
          updateGenerationOptions({ pandemoniumToken: false });
        } else if (token.type === 'bootlegger') {
          updateGenerationOptions({ generateBootleggerRules: false });
        }

        // Delete the token immediately
        setTokens(tokens.filter((t: Token) => t.filename !== token.filename));

        logger.info('useTokenDeletion', 'Meta token deleted', {
          type: token.type,
          name: token.name,
        });
      } else {
        // For character and reminder tokens, show confirmation modal
        setTokenToDelete(token);
        logger.debug('useTokenDeletion', 'Confirmation required', {
          type: token.type,
          name: token.name,
        });
      }
    },
    [tokens, setTokens, updateGenerationOptions]
  );

  /**
   * Confirm and execute the deletion
   */
  const confirmDelete = useCallback(() => {
    if (!tokenToDelete) return;

    logger.info('useTokenDeletion', 'Deletion confirmed', {
      type: tokenToDelete.type,
      name: tokenToDelete.name,
    });

    if (tokenToDelete.type === 'character') {
      // If deleting a character, also delete its reminder tokens
      const updatedTokens = tokens.filter(
        (t: Token) =>
          t.filename !== tokenToDelete.filename &&
          !(t.type === 'reminder' && t.parentCharacter === tokenToDelete.name)
      );
      setTokens(updatedTokens);

      // Remove from characters array
      const updatedCharacters = characters.filter((c: Character) => c.name !== tokenToDelete.name);
      setCharacters(updatedCharacters);

      logger.info('useTokenDeletion', 'Character and reminders deleted', {
        character: tokenToDelete.name,
        remindersRemoved: tokens.filter(
          (t) => t.type === 'reminder' && t.parentCharacter === tokenToDelete.name
        ).length,
      });
    } else {
      // Otherwise just delete the specific token
      setTokens(tokens.filter((t: Token) => t.filename !== tokenToDelete.filename));
      logger.info('useTokenDeletion', 'Token deleted', {
        type: tokenToDelete.type,
        name: tokenToDelete.name,
      });
    }

    setTokenToDelete(null);
  }, [tokenToDelete, tokens, characters, setTokens, setCharacters]);

  /**
   * Cancel the deletion
   */
  const cancelDelete = useCallback(() => {
    if (tokenToDelete) {
      logger.debug('useTokenDeletion', 'Deletion cancelled', {
        type: tokenToDelete.type,
        name: tokenToDelete.name,
      });
    }
    setTokenToDelete(null);
  }, [tokenToDelete]);

  return {
    tokenToDelete,
    handleDeleteRequest,
    confirmDelete,
    cancelDelete,
  };
}

export default useTokenDeletion;
