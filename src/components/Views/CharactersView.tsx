import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import previewStyles from '@/styles/components/characterEditor/TokenPreview.module.css';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import { getPreRenderedTokens, hashOptions } from '@/ts/cache/index.js';
import type { Character, Team, Token } from '@/ts/types/index.js';
import {
  downloadCharacterTokenOnly,
  downloadCharacterTokensAsZip,
  downloadReminderTokensOnly,
  regenerateCharacterAndReminders,
  updateCharacterInJson,
  updateMetaInJson,
} from '@/ts/ui/detailViewUtils';
import { logger } from '@/ts/utils/logger.js';
import { generateRandomName, generateStableUuid, nameToId } from '@/ts/utils/nameGenerator';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { Button } from '@/components/Shared/UI/Button';
import { CharacterNavigation } from '@/components/ViewComponents/CharactersComponents/CharacterNavigation';
import { MetaEditor } from '@/components/ViewComponents/CharactersComponents/MetaEditor';
import { TokenEditor } from '@/components/ViewComponents/CharactersComponents/TokenEditor';
import { TokenPreview } from '@/components/ViewComponents/CharactersComponents/TokenPreview';

interface CharactersViewProps {
  initialToken?: Token;
  selectedCharacterUuid?: string;
  onCharacterSelect?: (characterUuid: string) => void;
  onGoToTokens?: () => void;
  createNewCharacter?: boolean;
}

export function CharactersView({
  initialToken,
  selectedCharacterUuid: externalSelectedUuid,
  onCharacterSelect,
  createNewCharacter,
}: CharactersViewProps) {
  const {
    characters,
    tokens,
    jsonInput,
    setJsonInput,
    setCharacters,
    setTokens,
    generationOptions,
    setMetadata,
    deleteMetadata,
    getMetadata,
    scriptMeta,
    setScriptMeta,
  } = useTokenContext();
  const { addToast } = useToast();
  const { setDownloads, clearDownloads } = useDownloadsContext();

  // Check if initialToken is a meta token
  const isMetaToken = (token?: Token) => {
    return token && token.type !== 'character' && token.type !== 'reminder';
  };

  // Determine the initial character UUID from the clicked token or external prop
  const getInitialCharacterUuid = () => {
    // If initial token is a meta token, don't select any character
    if (isMetaToken(initialToken)) return '';

    // Use external UUID if provided (stable UUIDs mean this always works)
    if (externalSelectedUuid) {
      const byUuid = characters.find((c) => c.uuid === externalSelectedUuid);
      if (byUuid) return externalSelectedUuid;
    }

    if (!initialToken) return characters[0]?.uuid || '';

    if (initialToken.parentCharacter) {
      const char = characters.find((c) => c.name === initialToken.parentCharacter);
      if (char) return char.uuid || '';
    }

    if (initialToken.type === 'character') {
      const char = characters.find((c) => c.name === initialToken.name);
      if (char) return char.uuid || '';
    }

    return characters[0]?.uuid || '';
  };

  const [selectedCharacterUuid, setSelectedCharacterUuid] = useState<string>(() => {
    return getInitialCharacterUuid();
  });
  const [editedCharacter, setEditedCharacter] = useState<Character | null>(null);
  const [selectedMetaToken, setSelectedMetaToken] = useState<Token | null>(
    initialToken && isMetaToken(initialToken) ? initialToken : null
  );
  const [isMetaSelected, setIsMetaSelected] = useState(!!selectedMetaToken);
  const [isDirty, setIsDirty] = useState(false);
  const [_isLoading, setIsLoading] = useState(false);

  // Check shared pre-render cache for tokens pre-rendered on tab hover
  const getInitialPreviewToken = (): Token | null => {
    // First check if we have an initial token from gallery click
    if (initialToken?.type === 'character') return initialToken;

    // Then check shared pre-render cache (from hovering over Customize tab)
    const initialCharUuid = getInitialCharacterUuid();
    if (initialCharUuid && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(initialCharUuid, generationOptions);
      if (cached) return cached.characterToken;
    }
    return null;
  };

  const getInitialReminderTokens = (): Token[] => {
    // First check if we have an initial token from gallery click
    if (initialToken && !isMetaToken(initialToken)) {
      if (initialToken.type === 'reminder' && initialToken.parentUuid) {
        return tokens.filter(
          (t) => t.type === 'reminder' && t.parentUuid === initialToken.parentUuid
        );
      }
      if (initialToken.type === 'character' && initialToken.parentUuid) {
        return tokens.filter(
          (t) => t.type === 'reminder' && t.parentUuid === initialToken.parentUuid
        );
      }
    }

    // Then check shared pre-render cache
    const initialCharUuid = getInitialCharacterUuid();
    if (initialCharUuid && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(initialCharUuid, generationOptions);
      if (cached) return cached.reminderTokens;
    }
    return [];
  };

  // Initialize preview with the clicked token from gallery, or pre-rendered from tab hover
  const [previewCharacterToken, setPreviewCharacterToken] = useState<Token | null>(
    getInitialPreviewToken
  );
  // Initialize reminder tokens from gallery tokens or pre-render cache
  const [previewReminderTokens, setPreviewReminderTokens] =
    useState<Token[]>(getInitialReminderTokens);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousCharacterUuidRef = useRef<string>(selectedCharacterUuid);
  const hasCreatedNewCharacterRef = useRef(false);
  // Pre-render cache for hover optimization - keyed by UUID+optionsHash for proper invalidation
  const preRenderCacheRef = useRef<Map<string, { characterToken: Token; reminderTokens: Token[] }>>(
    new Map()
  );
  const preRenderingRef = useRef<Set<string>>(new Set());
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Current options hash for cache key generation
  const currentOptionsHashRef = useRef<string>(hashOptions(generationOptions));
  // Skip regeneration for a specific character UUID when we just applied cached tokens
  // Initialize with the initial character UUID if coming from gallery with a token OR from shared pre-render cache
  const skipRegenerateForUuidRef = useRef<string | null>(
    (() => {
      if (initialToken?.type === 'character') return getInitialCharacterUuid();
      // Also skip if we got tokens from shared pre-render cache
      const initialCharUuid = getInitialCharacterUuid();
      if (initialCharUuid && getPreRenderedTokens(initialCharUuid, generationOptions)) {
        return initialCharUuid;
      }
      return null;
    })()
  );
  // Track the original UUID when we started editing (for finding character in list when ID changes)
  const originalCharacterUuidRef = useRef<string>(selectedCharacterUuid);
  // Track character UUID for preview clearing (only clear when switching to a different character)
  const prevCharacterUuidRef = useRef<string | undefined>(undefined);
  // Track if we just saved to prevent sync effect from overwriting editedCharacter
  const justSavedRef = useRef(false);
  // Ref for jsonInput to avoid dependency cycles in save effect
  const jsonInputRef = useRef(jsonInput);
  jsonInputRef.current = jsonInput;
  // Ref for characters to avoid dependency cycles in save effect
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  // Create new character on mount if requested
  useEffect(() => {
    if (createNewCharacter && !hasCreatedNewCharacterRef.current) {
      hasCreatedNewCharacterRef.current = true;
      // Create a new character immediately with all properties
      (async () => {
        const randomName = generateRandomName();
        const newId = nameToId(randomName);
        const newUuid = await generateStableUuid(newId, randomName);
        const newCharacter: Character = {
          id: newId,
          name: randomName,
          team: 'townsfolk',
          ability: '',
          flavor: '',
          image: '',
          setup: false,
          reminders: [],
          remindersGlobal: [],
          edition: '',
          firstNight: 0,
          otherNight: 0,
          firstNightReminder: '',
          otherNightReminder: '',
          uuid: newUuid,
          source: 'custom',
        };

        // Initialize metadata - check if ID matches name-derived ID
        const expectedId = nameToId(newCharacter.name);
        const isLinked = newCharacter.id === expectedId;
        setMetadata(newUuid, { idLinkedToName: isLinked });

        const updatedCharacters = [...characters, newCharacter];
        setCharacters(updatedCharacters);

        try {
          if (jsonInput.trim()) {
            const parsed = JSON.parse(jsonInput);
            if (Array.isArray(parsed)) {
              parsed.push(newCharacter);
              setJsonInput(JSON.stringify(parsed, null, 2));
            }
          } else {
            // Create new script with just this character
            setJsonInput(JSON.stringify([newCharacter], null, 2));
          }
        } catch (_e) {
          // Create new script if parsing fails
          setJsonInput(JSON.stringify([newCharacter], null, 2));
        }

        setSelectedCharacterUuid(newUuid);
        setEditedCharacter(newCharacter);

        // Generate token for the new character
        regenerateCharacterAndReminders(newCharacter, generationOptions)
          .then(({ characterToken, reminderTokens: newReminderTokens }) => {
            const updatedTokens = [...tokens, characterToken, ...newReminderTokens];
            setTokens(updatedTokens);
          })
          .catch((error) => {
            logger.error('CharactersView', 'Failed to generate token for new character', error);
          });

        addToast('New character created', 'success');
      })();
    }
  }, [
    createNewCharacter,
    characters,
    jsonInput,
    setCharacters,
    setJsonInput,
    addToast,
    generationOptions,
    tokens,
    setTokens,
    setMetadata,
  ]);

  // Sync with external selected UUID - only when external changes, not internal
  const prevExternalUuidRef = useRef(externalSelectedUuid);
  useEffect(() => {
    // Only react to external UUID changes, not internal selection changes
    if (externalSelectedUuid && externalSelectedUuid !== prevExternalUuidRef.current) {
      prevExternalUuidRef.current = externalSelectedUuid;
      setSelectedCharacterUuid(externalSelectedUuid);
    }
  }, [externalSelectedUuid]);

  // Notify parent of character selection changes
  useEffect(() => {
    if (onCharacterSelect && selectedCharacterUuid) {
      onCharacterSelect(selectedCharacterUuid);
    }
  }, [selectedCharacterUuid, onCharacterSelect]);

  // Sync editedCharacter when selected character changes
  useEffect(() => {
    // Skip if we just saved - the editedCharacter is already up to date
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }

    if (selectedCharacterUuid && characters.length > 0) {
      const char = characters.find((c) => c.uuid === selectedCharacterUuid);
      if (char && editedCharacter?.uuid !== char.uuid) {
        setEditedCharacter(JSON.parse(JSON.stringify(char)));
        setIsDirty(false);
      }
    }
  }, [selectedCharacterUuid, characters, editedCharacter?.uuid]);

  const selectedCharacter = useMemo(
    () => editedCharacter || characters.find((c) => c.uuid === selectedCharacterUuid),
    [editedCharacter, selectedCharacterUuid, characters]
  );

  // Check if selected character is official based on source field
  const isSelectedCharacterOfficial = useMemo(() => {
    if (!selectedCharacter) return false;
    return selectedCharacter.source === 'official';
  }, [selectedCharacter]);

  // Match by UUID only (UUID is required on all characters)
  const characterTokens = useMemo(() => {
    const char = characters.find((c) => c.uuid === selectedCharacterUuid);
    if (!char?.uuid) return [];
    return tokens.filter((t) => t.type === 'character' && t.parentUuid === char.uuid);
  }, [tokens, selectedCharacterUuid, characters]);

  // Match by UUID only (UUID is required on all characters)
  const reminderTokens = useMemo(() => {
    const char = characters.find((c) => c.uuid === selectedCharacterUuid);
    if (!char?.uuid) return [];
    return tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid);
  }, [tokens, selectedCharacterUuid, characters]);

  // Track previous character and update options hash when generationOptions change
  // Clear pre-render cache when options change since cached tokens would be stale
  useEffect(() => {
    const newHash = hashOptions(generationOptions);
    if (currentOptionsHashRef.current !== newHash) {
      currentOptionsHashRef.current = newHash;
      // Clear cache since options changed - cached tokens are now invalid
      preRenderCacheRef.current.clear();
    }
  }, [generationOptions]);

  // Track previous character for reference updates (but don't clear preview tokens)
  // Preview tokens are now directly replaced by new generation, no need to clear
  useEffect(() => {
    const currentChar = characters.find((c) => c.uuid === selectedCharacterUuid);
    const currentUuid = currentChar?.uuid;

    // Update refs for tracking
    previousCharacterUuidRef.current = selectedCharacterUuid;
    if (currentUuid) {
      prevCharacterUuidRef.current = currentUuid;
    }
  }, [selectedCharacterUuid, characters]);

  const regeneratePreview = useCallback(async () => {
    if (!editedCharacter) return;

    try {
      const { characterToken, reminderTokens: newReminderTokens } =
        await regenerateCharacterAndReminders(editedCharacter, generationOptions);
      setPreviewCharacterToken(characterToken);
      setPreviewReminderTokens(newReminderTokens);
    } catch (error) {
      logger.error('CharactersView', 'Failed to regenerate preview', error);
    }
  }, [editedCharacter, generationOptions]);

  // Preview a specific variant image (for temporary preview without affecting character list)
  const handlePreviewVariant = useCallback(
    async (imageUrl: string | undefined) => {
      if (!editedCharacter) return;

      try {
        const { characterToken, reminderTokens: newReminderTokens } =
          await regenerateCharacterAndReminders(
            editedCharacter,
            generationOptions,
            imageUrl // Pass the specific image URL for variant preview
          );
        setPreviewCharacterToken(characterToken);
        setPreviewReminderTokens(newReminderTokens);
      } catch (error) {
        logger.error('CharactersView', 'Failed to preview variant', error);
      }
    },
    [editedCharacter, generationOptions]
  );

  // Regenerate preview when editedCharacter or options change
  useEffect(() => {
    if (!editedCharacter) {
      setPreviewCharacterToken(null);
      setPreviewReminderTokens([]);
      return;
    }

    // Skip if we just applied cached tokens for this character
    if (skipRegenerateForUuidRef.current === editedCharacter.uuid) {
      skipRegenerateForUuidRef.current = null;
      return;
    }

    let cancelled = false;

    regenerateCharacterAndReminders(editedCharacter, generationOptions)
      .then(({ characterToken, reminderTokens }) => {
        if (!cancelled) {
          setPreviewCharacterToken(characterToken);
          setPreviewReminderTokens(reminderTokens);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          logger.error('CharactersView', 'Failed to regenerate preview', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editedCharacter, generationOptions]);

  // Ref to track pending save data for flush on unmount
  const pendingSaveRef = useRef<Character | null>(null);

  // Save function that can be called from timer or cleanup
  const performSave = useCallback(
    (charToSave: Character) => {
      try {
        // Mark that we're saving to prevent the sync effect from resetting editedCharacter
        justSavedRef.current = true;

        // Use originalCharacterUuidRef to find the character (in case ID was changed)
        const origUuid = originalCharacterUuidRef.current;
        const origChar = charactersRef.current.find((c) => c.uuid === origUuid);
        const origId = origChar?.id || charToSave.id;

        // Use ref to get current jsonInput without causing dependency cycle
        const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, charToSave);
        setJsonInput(updatedJson);
        // Use ref to get current characters without causing dependency cycle - match by UUID
        const updatedChars = charactersRef.current.map((c) =>
          c.uuid === origUuid ? charToSave : c
        );
        setCharacters(updatedChars);

        // Update metadata - check if ID still matches name-derived ID
        if (charToSave.uuid) {
          const expectedId = nameToId(charToSave.name);
          const isLinked = charToSave.id === expectedId;
          setMetadata(charToSave.uuid, { idLinkedToName: isLinked });
        }

        setIsDirty(false);
        pendingSaveRef.current = null;
      } catch (error) {
        logger.error('CharactersView', 'Save failed', error);
        justSavedRef.current = false;
      }
    },
    [setJsonInput, setCharacters, setMetadata]
  );

  // Debounced save to JSON when editedCharacter changes
  useEffect(() => {
    if (!(isDirty && editedCharacter)) return;

    // Track pending save for flush on unmount
    pendingSaveRef.current = editedCharacter;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      performSave(editedCharacter);
    }, 100);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, editedCharacter, performSave]);

  // Flush pending save on unmount to prevent data loss when switching tabs
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        // Cancel the debounced timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        // Flush the save immediately
        const charToSave = pendingSaveRef.current;
        try {
          justSavedRef.current = true;
          const origUuid = originalCharacterUuidRef.current;
          const origChar = charactersRef.current.find((c) => c.uuid === origUuid);
          const origId = origChar?.id || charToSave.id;
          const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, charToSave);
          setJsonInput(updatedJson);
          const updatedChars = charactersRef.current.map((c) =>
            c.uuid === origUuid ? charToSave : c
          );
          setCharacters(updatedChars);
        } catch (error) {
          logger.error('CharactersView', 'Flush save failed on unmount', error);
        }
      }
    };
  }, [setJsonInput, setCharacters]);

  // Hover handler - pre-render character token on hover
  // Uses UUID + optionsHash as cache key for proper invalidation across projects
  const handleHoverCharacter = useCallback(
    (characterUuid: string) => {
      // Clear any pending hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      const cacheKey = `${characterUuid}:${currentOptionsHashRef.current}`;

      // Skip if already selected, cached, or currently rendering
      if (characterUuid === selectedCharacterUuid) return;
      if (preRenderCacheRef.current.has(cacheKey)) return;
      if (preRenderingRef.current.has(cacheKey)) return;

      // Small delay to avoid pre-rendering on quick mouse-overs
      hoverTimeoutRef.current = setTimeout(() => {
        const char = characters.find((c) => c.uuid === characterUuid);
        if (!char) return;

        // Double-check still not cached/rendering after delay
        if (preRenderCacheRef.current.has(cacheKey)) return;
        if (preRenderingRef.current.has(cacheKey)) return;

        preRenderingRef.current.add(cacheKey);

        regenerateCharacterAndReminders(char, generationOptions)
          .then(({ characterToken, reminderTokens }) => {
            preRenderCacheRef.current.set(cacheKey, { characterToken, reminderTokens });
          })
          .catch((err) => logger.error('CharactersView', 'Pre-render failed', err))
          .finally(() => {
            preRenderingRef.current.delete(cacheKey);
          });
      }, 100); // 100ms delay
    },
    [characters, generationOptions, selectedCharacterUuid]
  );

  const handleSelectCharacter = useCallback((newCharacterUuid: string) => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const cacheKey = `${newCharacterUuid}:${currentOptionsHashRef.current}`;

    previousCharacterUuidRef.current = newCharacterUuid;
    originalCharacterUuidRef.current = newCharacterUuid;
    setSelectedCharacterUuid(newCharacterUuid);
    setSelectedMetaToken(null);
    setIsMetaSelected(false);

    // Check pre-render cache for instant display
    const cached = preRenderCacheRef.current.get(cacheKey);
    if (cached) {
      setPreviewCharacterToken(cached.characterToken);
      setPreviewReminderTokens(cached.reminderTokens);
      preRenderCacheRef.current.delete(cacheKey);
      skipRegenerateForUuidRef.current = newCharacterUuid;
    }
  }, []);

  const handleEditChange = <K extends keyof Character>(field: K, value: Character[K]) => {
    if (editedCharacter) {
      setEditedCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [field]: value,
        };
      });
      setIsDirty(true);
      // Invalidate pre-render cache for this character since it changed
      const cacheKey = `${selectedCharacterUuid}:${currentOptionsHashRef.current}`;
      preRenderCacheRef.current.delete(cacheKey);
    }
  };

  const handleReplaceCharacter = (newCharacter: Character) => {
    setEditedCharacter(newCharacter);
    setIsDirty(true);
  };

  // handleChangeTeam receives character ID from CharacterNavigation (via char.id)
  // We need to look up the character by ID to get its UUID
  const handleChangeTeam = (characterId: string, newTeam: Team) => {
    const char = characters.find((c) => c.id === characterId);
    if (!char) return;

    const updatedChar = { ...char, team: newTeam };
    const updatedCharacters = characters.map((c) => (c.id === characterId ? updatedChar : c));
    setCharacters(updatedCharacters);

    // Update JSON
    try {
      const updatedJson = updateCharacterInJson(jsonInput, characterId, updatedChar);
      setJsonInput(updatedJson);
    } catch (e) {
      logger.error('CharactersView', 'Failed to update JSON', e);
    }

    // Regenerate tokens for this character
    regenerateCharacterAndReminders(updatedChar, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        const updatedTokens = tokens.filter((t) => {
          if (t.type === 'character' && t.name === char.name) return false;
          if (t.type === 'reminder' && t.parentCharacter === char.name) return false;
          return true;
        });
        updatedTokens.push(characterToken, ...newReminderTokens);
        setTokens(updatedTokens);
      })
      .catch((error) => {
        logger.error('CharactersView', 'Failed to regenerate tokens', error);
      });

    // If this was the selected character (by UUID), update its edited state
    if (char.uuid === selectedCharacterUuid && editedCharacter) {
      setEditedCharacter({ ...editedCharacter, team: newTeam });
    }

    addToast(`Moved ${char.name} to ${newTeam}`, 'success');
  };

  const handleAddCharacter = async () => {
    const randomName = generateRandomName();
    const newId = nameToId(randomName);
    const newUuid = await generateStableUuid(newId, randomName);
    const newCharacter: Character = {
      id: newId,
      name: randomName,
      team: 'townsfolk',
      ability: '',
      flavor: '',
      image: '',
      setup: false,
      reminders: [],
      remindersGlobal: [],
      edition: '',
      firstNight: 0,
      otherNight: 0,
      firstNightReminder: '',
      otherNightReminder: '',
      uuid: newUuid,
      source: 'custom',
    };

    // Initialize metadata - check if ID matches name-derived ID
    const expectedId = nameToId(newCharacter.name);
    const isLinked = newCharacter.id === expectedId;
    setMetadata(newUuid, { idLinkedToName: isLinked });

    const updatedCharacters = [...characters, newCharacter];
    setCharacters(updatedCharacters);

    try {
      if (jsonInput.trim()) {
        const parsed = JSON.parse(jsonInput);
        if (Array.isArray(parsed)) {
          parsed.push(newCharacter);
          setJsonInput(JSON.stringify(parsed, null, 2));
        }
      } else {
        // Create new script with just this character
        setJsonInput(JSON.stringify([newCharacter], null, 2));
      }
    } catch (_e) {
      // Create new script if parsing fails
      setJsonInput(JSON.stringify([newCharacter], null, 2));
    }

    setSelectedCharacterUuid(newUuid);
    setEditedCharacter(newCharacter);
    originalCharacterUuidRef.current = newUuid;

    // Generate token for the new character
    regenerateCharacterAndReminders(newCharacter, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        const updatedTokens = [...tokens, characterToken, ...newReminderTokens];
        setTokens(updatedTokens);
      })
      .catch((error) => {
        logger.error('CharactersView', 'Failed to generate token for new character', error);
      });

    addToast('New character created', 'success');
  };

  // handleDeleteCharacter receives character ID from CharacterNavigation
  // We look up by ID to find the character, but track selection by UUID
  const handleDeleteCharacter = (characterId?: string) => {
    // If no characterId provided, delete the currently selected character
    const charToDelete = characterId
      ? characters.find((c) => c.id === characterId)
      : characters.find((c) => c.uuid === selectedCharacterUuid);

    if (!charToDelete) return;

    // Delete metadata for this character
    if (charToDelete.uuid) {
      deleteMetadata(charToDelete.uuid);
    }

    const updatedCharacters = characters.filter((c) => c.uuid !== charToDelete.uuid);
    setCharacters(updatedCharacters);

    // Filter tokens by UUID
    const updatedTokens = tokens.filter((t) => t.parentUuid !== charToDelete.uuid);
    setTokens(updatedTokens);

    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        const updatedParsed = parsed.filter((item: Character | string) => {
          if (typeof item === 'string') return item !== charToDelete.id;
          if (typeof item === 'object') return item.id !== charToDelete.id;
          return true;
        });
        setJsonInput(JSON.stringify(updatedParsed, null, 2));
      }
    } catch (e) {
      logger.error('CharactersView', 'Failed to update JSON', e);
    }

    // If we deleted the selected character, select another one
    if (charToDelete.uuid === selectedCharacterUuid) {
      if (updatedCharacters.length > 0) {
        setSelectedCharacterUuid(updatedCharacters[0].uuid || '');
      } else {
        setSelectedCharacterUuid('');
        setEditedCharacter(null);
      }
    }

    addToast(`Deleted ${charToDelete.name}`, 'success');
  };

  // handleDuplicateCharacter receives character ID from CharacterNavigation
  const handleDuplicateCharacter = async (characterId: string) => {
    const charToDuplicate = characters.find((c) => c.id === characterId);
    if (!charToDuplicate) return;

    const newId = `${charToDuplicate.id}_copy_${Date.now()}`;
    const newName = `${charToDuplicate.name} (Copy)`;
    const newUuid = await generateStableUuid(newId, newName);
    const newCharacter: Character = {
      ...JSON.parse(JSON.stringify(charToDuplicate)),
      id: newId,
      name: newName,
      uuid: newUuid, // New UUID for duplicate
      source: 'custom', // Duplicates are always custom
    };

    // Copy metadata from original character, but verify idLinkedToName
    if (charToDuplicate.uuid) {
      const originalMetadata = getMetadata(charToDuplicate.uuid);
      // Check if the duplicate's ID matches its name-derived ID
      const expectedId = nameToId(newCharacter.name);
      const isLinked = newCharacter.id === expectedId;
      setMetadata(newUuid, { ...originalMetadata, idLinkedToName: isLinked });
    } else {
      // Check if ID matches name-derived ID
      const expectedId = nameToId(newCharacter.name);
      const isLinked = newCharacter.id === expectedId;
      setMetadata(newUuid, { idLinkedToName: isLinked });
    }

    const charIndex = characters.findIndex((c) => c.id === characterId);
    const updatedCharacters = [...characters];
    updatedCharacters.splice(charIndex + 1, 0, newCharacter);
    setCharacters(updatedCharacters);

    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        const jsonIndex = parsed.findIndex((item: Character | string) => {
          if (typeof item === 'string') return item === characterId;
          if (typeof item === 'object') return item.id === characterId;
          return false;
        });
        if (jsonIndex !== -1) {
          parsed.splice(jsonIndex + 1, 0, newCharacter);
          setJsonInput(JSON.stringify(parsed, null, 2));
        }
      }
    } catch (e) {
      logger.error('CharactersView', 'Failed to update JSON', e);
    }

    setSelectedCharacterUuid(newUuid);
    addToast(`Duplicated ${charToDuplicate.name}`, 'success');

    regenerateCharacterAndReminders(newCharacter, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        const updatedTokens = [...tokens, characterToken, ...newReminderTokens];
        setTokens(updatedTokens);
      })
      .catch((error) => {
        logger.error('CharactersView', 'Failed to generate tokens for duplicated character', error);
      });
  };

  const handleSelectMetaToken = (token: Token) => {
    setSelectedMetaToken(token);
    setSelectedCharacterUuid(''); // Deselect character when viewing meta token
    setIsMetaSelected(true);
  };

  const handleSelectMeta = useCallback(() => {
    setSelectedMetaToken(null); // No specific token
    setSelectedCharacterUuid(''); // Deselect character
    setIsMetaSelected(true);
  }, []);

  // Simple: just use preview state directly
  // The regeneration effect cleanup prevents stale results
  const displayCharacterToken = previewCharacterToken;
  const displayReminderTokens = previewReminderTokens;

  const handleDownloadAll = useCallback(async () => {
    if (!displayCharacterToken) return;

    setIsLoading(true);
    try {
      const charData = editedCharacter || selectedCharacter;
      await downloadCharacterTokensAsZip(
        displayCharacterToken,
        displayReminderTokens,
        selectedCharacter?.name || charData?.name || 'character',
        generationOptions.pngSettings,
        charData
      );
      addToast(`Downloaded ${selectedCharacter?.name} tokens`, 'success');
    } catch (error) {
      logger.error('CharactersView', 'Failed to download tokens', error);
      addToast('Failed to download tokens', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    displayCharacterToken,
    displayReminderTokens,
    editedCharacter,
    selectedCharacter,
    generationOptions.pngSettings,
    addToast,
  ]);

  const handleDownloadCharacter = useCallback(async () => {
    if (!displayCharacterToken) return;

    setIsLoading(true);
    try {
      await downloadCharacterTokenOnly(
        displayCharacterToken,
        selectedCharacter?.name || 'character',
        generationOptions.pngSettings
      );
      addToast(`Downloaded ${selectedCharacter?.name} character token`, 'success');
    } catch (error) {
      logger.error('CharactersView', 'Failed to download character token', error);
      addToast('Failed to download character token', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [displayCharacterToken, selectedCharacter, generationOptions.pngSettings, addToast]);

  const handleDownloadReminders = useCallback(async () => {
    if (!displayReminderTokens.length) {
      addToast('No reminder tokens to download', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await downloadReminderTokensOnly(
        displayReminderTokens,
        selectedCharacter?.name || 'character',
        generationOptions.pngSettings
      );
      addToast(`Downloaded ${selectedCharacter?.name} reminder tokens`, 'success');
    } catch (error) {
      logger.error('CharactersView', 'Failed to download reminder tokens', error);
      addToast('Failed to download reminder tokens', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [displayReminderTokens, selectedCharacter, generationOptions.pngSettings, addToast]);

  const handleDownloadJson = useCallback(() => {
    if (!(editedCharacter || selectedCharacter)) return;

    const charData = editedCharacter || selectedCharacter;
    if (!charData) return;

    // Strip internal fields (uuid, source) from exported JSON
    const { uuid, source, ...exportableChar } = charData;
    const jsonText = JSON.stringify(exportableChar, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${charData.id || charData.name || 'character'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${charData.name}.json`, 'success');
  }, [editedCharacter, selectedCharacter, addToast]);

  // Register downloads for this view
  useEffect(() => {
    const charData = editedCharacter || selectedCharacter;
    const hasCharacter = !!charData && !isMetaSelected;
    const hasCharacterToken = !!displayCharacterToken;
    const hasReminderTokens = displayReminderTokens.length > 0;

    const downloads: DownloadItem[] = [];

    // Only show character downloads when a character is selected (not meta)
    if (hasCharacter) {
      downloads.push(
        {
          id: 'character-token',
          icon: '🎴',
          label: 'Character Token',
          description: charData?.name ? `${charData.name} PNG` : 'High-res PNG',
          action: handleDownloadCharacter,
          disabled: !hasCharacterToken,
          disabledReason: 'Generate token first',
        },
        {
          id: 'reminder-tokens',
          icon: '🔔',
          label: 'Reminder Tokens',
          description: hasReminderTokens
            ? `${displayReminderTokens.length} reminders (ZIP)`
            : 'No reminders',
          action: handleDownloadReminders,
          disabled: !hasReminderTokens,
          disabledReason: 'No reminder tokens',
        },
        {
          id: 'all-tokens',
          icon: '📦',
          label: 'All Tokens',
          description: 'Character + reminders (ZIP)',
          action: handleDownloadAll,
          disabled: !hasCharacterToken,
          disabledReason: 'Generate tokens first',
        },
        {
          id: 'character-json',
          icon: '📄',
          label: 'Character JSON',
          description: charData?.name ? `${charData.name}.json` : 'Export definition',
          action: handleDownloadJson,
          disabled: !hasCharacter,
          disabledReason: 'No character selected',
        }
      );
    }

    setDownloads(downloads);
    return () => clearDownloads();
  }, [
    editedCharacter,
    selectedCharacter,
    displayCharacterToken,
    displayReminderTokens,
    isMetaSelected,
    handleDownloadCharacter,
    handleDownloadReminders,
    handleDownloadAll,
    handleDownloadJson,
    setDownloads,
    clearDownloads,
  ]);

  return (
    <ViewLayout variant="3-panel">
      {/* Left Panel - Character Navigation */}
      <ViewLayout.Panel position="left" width="left" scrollable>
        <CharacterNavigation
          characters={characters}
          tokens={tokens}
          selectedCharacterUuid={selectedCharacterUuid}
          isMetaSelected={isMetaSelected}
          onSelectCharacter={handleSelectCharacter}
          onAddCharacter={() => {
            setSelectedCharacterUuid('');
            setEditedCharacter(null);
            setIsMetaSelected(false);
            setSelectedMetaToken(null);
          }}
          onDeleteCharacter={handleDeleteCharacter}
          onDuplicateCharacter={handleDuplicateCharacter}
          onSelectMetaToken={handleSelectMetaToken}
          onSelectMeta={handleSelectMeta}
          onChangeTeam={handleChangeTeam}
          onHoverCharacter={handleHoverCharacter}
        />
      </ViewLayout.Panel>

      {/* Center Panel - Preview */}
      <ViewLayout.Panel position="center" width="flex" scrollable>
        {isMetaSelected ? (
          // Meta preview
          <div className={`${layoutStyles.contentPanel} ${styles.customizePreview}`}>
            {selectedMetaToken ? (
              <div className={styles.metaTokenPreview}>
                <img
                  src={selectedMetaToken.canvas.toDataURL('image/png')}
                  alt={selectedMetaToken.name}
                  className={styles.metaTokenImage}
                />
              </div>
            ) : (
              <div className={styles.tokenPreviewPlaceholder}>
                <span className={styles.metaPlaceholderIcon}>📜</span>
                <p>Script Metadata</p>
                <p className={styles.placeholderHint}>
                  Edit your script's meta information on the right.
                </p>
              </div>
            )}
          </div>
        ) : selectedCharacter ? (
          // Character preview
          <div className={`${layoutStyles.contentPanel} ${styles.customizePreview}`}>
            {displayCharacterToken ? (
              <TokenPreview
                characterToken={displayCharacterToken}
                reminderTokens={displayReminderTokens}
                onReminderClick={(reminder) => {
                  const parentCharName = reminder.parentCharacter;
                  if (parentCharName) {
                    const char = characters.find((c) => c.name === parentCharName);
                    if (char?.uuid) setSelectedCharacterUuid(char.uuid);
                  }
                }}
              />
            ) : (
              <div className={previewStyles.previewArea}>
                <div className={previewStyles.preview}>
                  <div className={styles.tokenPreviewPlaceholder}>
                    <p>Token preview will appear here after generating.</p>
                    <p className={styles.placeholderHint}>
                      Fill in character details on the right, then generate tokens.
                    </p>
                  </div>
                </div>
                <div className={previewStyles.reminders}>
                  <h4>Reminder Tokens</h4>
                  <div className={previewStyles.galleryContainer}>
                    <button
                      type="button"
                      className={previewStyles.galleryArrow}
                      disabled
                      aria-label="Show previous reminder"
                    >
                      ‹
                    </button>
                    <div className={previewStyles.gallery}>
                      <div className={previewStyles.empty}>
                        <span className={previewStyles.emptyText}>No reminder tokens</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={previewStyles.galleryArrow}
                      disabled
                      aria-label="Show next reminder"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Empty state
          <div className={`${layoutStyles.contentPanel} ${styles.customizeEmptyState}`}>
            <div className={styles.emptyStateContent}>
              <h3>No Character Selected</h3>
              <p>Create a new character or load a script to get started.</p>
              <div className={styles.emptyStateButtons}>
                <Button variant="primary" onClick={handleAddCharacter}>
                  ✨ Create New Character
                </Button>
                <Button variant="secondary" disabled>
                  📚 Add Official Character
                </Button>
              </div>
            </div>
          </div>
        )}
      </ViewLayout.Panel>

      {/* Right Panel - Editor */}
      <ViewLayout.Panel position="right" width="right" scrollable>
        {isMetaSelected ? (
          <MetaEditor
            scriptMeta={scriptMeta}
            onMetaChange={(updatedMeta) => {
              setScriptMeta(updatedMeta);
              try {
                if (jsonInput.trim()) {
                  const updatedJson = updateMetaInJson(jsonInput, updatedMeta);
                  setJsonInput(updatedJson);
                }
              } catch (e) {
                logger.error('CharactersView', 'Failed to update meta in JSON', e);
              }
            }}
          />
        ) : selectedCharacter ? (
          <TokenEditor
            character={selectedCharacter}
            onEditChange={handleEditChange}
            onReplaceCharacter={handleReplaceCharacter}
            onRefreshPreview={regeneratePreview}
            onPreviewVariant={handlePreviewVariant}
            isOfficial={isSelectedCharacterOfficial}
          />
        ) : null}
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
