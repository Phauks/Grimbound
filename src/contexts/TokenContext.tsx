import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type {
  Character,
  CharacterMetadata,
  GenerationOptions,
  GenerationProgress,
  ScriptMeta,
  SyncStatus,
  Token,
} from '@/ts/types/index.js';
import { DEFAULT_GENERATION_OPTIONS } from '@/ts/types/tokenOptions.js';
import {
  filterEnabledCharacters,
  getCharacterSelectionSummary,
  getEnabledCharacterUuids,
  isCharacterEnabled as isCharEnabled,
} from '@/ts/utils/characterFiltering.js';
import { nameToId } from '@/ts/utils/nameGenerator';
import { useDataSync } from './DataSyncContext';

interface TokenContextType {
  // Token state
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;

  // Character state
  characters: Character[];
  setCharacters: (characters: Character[]) => void;

  officialData: Character[];
  setOfficialData: (data: Character[]) => void;

  // Character metadata (internal generator state, separate from character JSON)
  characterMetadata: Map<string, CharacterMetadata>;
  getMetadata: (uuid: string) => CharacterMetadata;
  setMetadata: (uuid: string, metadata: Partial<CharacterMetadata>) => void;
  deleteMetadata: (uuid: string) => void;
  clearAllMetadata: () => void;

  // Character enable/disable helpers
  isCharacterEnabled: (uuid: string) => boolean;
  setCharacterEnabled: (uuid: string, enabled: boolean) => void;
  setAllCharactersEnabled: (enabled: boolean) => void;
  getEnabledCharacters: () => Character[];
  enabledCharacterUuids: Set<string>;
  characterSelectionSummary: { enabled: number; disabled: number; total: number };

  // Script metadata
  scriptMeta: ScriptMeta | null;
  setScriptMeta: (meta: ScriptMeta | null) => void;

  // Generation options
  generationOptions: GenerationOptions;
  updateGenerationOptions: (options: Partial<GenerationOptions>) => void;

  // JSON input
  jsonInput: string;
  setJsonInput: (json: string) => void;

  // Filter state
  filters: {
    teams: string[];
    tokenTypes: string[];
    display: string[];
    reminders: string[];
    origin: string[];
  };
  updateFilters: (filters: Partial<TokenContextType['filters']>) => void;

  // Example token states - two independent slots
  // Character/Reminder are synced (selecting reminder sets its parent character)
  exampleCharacterToken: Token | null;
  setExampleCharacterToken: (token: Token | null) => void;
  // Meta tokens (almanac, script-name, pandemonium) are independent
  exampleMetaToken: Token | null;
  setExampleMetaToken: (token: Token | null) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  // Validation warnings
  warnings: string[];
  setWarnings: (warnings: string[]) => void;

  // Generation progress
  generationProgress: GenerationProgress | null;
  setGenerationProgress: (progress: GenerationProgress | null) => void;

  // Token generation session tracking - prevents duplicate generation on navigation
  lastGeneratedJsonHash: string | null;
  setLastGeneratedJsonHash: (hash: string | null) => void;

  // Sync status (from DataSyncContext)
  syncStatus: SyncStatus;
  isSyncInitialized: boolean;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

interface TokenProviderProps {
  children: ReactNode;
}

// Default metadata for new characters - defined outside component to avoid recreation on every render
const DEFAULT_CHARACTER_METADATA: CharacterMetadata = { idLinkedToName: true };

export function TokenProvider({ children }: TokenProviderProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [officialData, setOfficialData] = useState<Character[]>([]);
  const [scriptMeta, setScriptMeta] = useState<ScriptMeta | null>(null);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);

  // Token generation session tracking - prevents duplicate generation on navigation
  const [lastGeneratedJsonHash, setLastGeneratedJsonHash] = useState<string | null>(null);

  // Get sync status from DataSyncContext
  const { status: syncStatus, isInitialized: isSyncInitialized } = useDataSync();

  // Character metadata store (keyed by character UUID)
  const [characterMetadata, setCharacterMetadata] = useState<Map<string, CharacterMetadata>>(
    new Map()
  );

  // Get metadata for a character
  // If no metadata exists, dynamically compute idLinkedToName based on whether id === nameToId(name)
  // useCallback required: exposed in context value
  const getMetadata = useCallback(
    (uuid: string): CharacterMetadata => {
      const existing = characterMetadata.get(uuid);
      if (existing) {
        return existing;
      }

      // No metadata stored - compute default based on character's actual id and name
      const char = characters.find((c) => c.uuid === uuid);
      if (char) {
        const expectedId = nameToId(char.name);
        const isLinked = char.id === expectedId;
        return { ...DEFAULT_CHARACTER_METADATA, idLinkedToName: isLinked };
      }

      // Fallback if character not found
      return DEFAULT_CHARACTER_METADATA;
    },
    [characterMetadata, characters]
  );

  // Set or update metadata for a character
  // useCallback required: exposed in context value
  const setMetadataForChar = useCallback((uuid: string, metadata: Partial<CharacterMetadata>) => {
    setCharacterMetadata((prev) => {
      const newMap = new Map(prev);
      const existing = prev.get(uuid) || DEFAULT_CHARACTER_METADATA;
      newMap.set(uuid, { ...existing, ...metadata });
      return newMap;
    });
  }, []);

  // Delete metadata for a character
  // useCallback required: exposed in context value
  const deleteMetadata = useCallback((uuid: string) => {
    setCharacterMetadata((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uuid);
      return newMap;
    });
  }, []);

  // Clear all metadata (e.g., when loading a new script)
  // useCallback required: exposed in context value
  const clearAllMetadata = useCallback(() => {
    setCharacterMetadata(new Map());
  }, []);

  // Character enable/disable helpers
  // useCallback required: exposed in context value
  const isCharacterEnabled = useCallback(
    (uuid: string): boolean => isCharEnabled(uuid, characterMetadata),
    [characterMetadata]
  );

  // useCallback required: exposed in context value
  const setCharacterEnabled = useCallback((uuid: string, enabled: boolean) => {
    setCharacterMetadata((prev) => {
      const newMap = new Map(prev);
      const existing = prev.get(uuid) || DEFAULT_CHARACTER_METADATA;
      newMap.set(uuid, { ...existing, enabled });
      return newMap;
    });
    // Reset hash to trigger regeneration check on next tokens view
    // Don't clear tokens - only newly-enabled characters without tokens will be generated
    setLastGeneratedJsonHash(null);
  }, []);

  // useCallback required: exposed in context value
  const setAllCharactersEnabled = useCallback(
    (enabled: boolean) => {
      setCharacterMetadata((prev) => {
        const newMap = new Map(prev);
        for (const char of characters) {
          const uuid = char.uuid || char.id;
          const existing = prev.get(uuid) || DEFAULT_CHARACTER_METADATA;
          newMap.set(uuid, { ...existing, enabled });
        }
        return newMap;
      });
      // Reset hash to trigger regeneration check on next tokens view
      setLastGeneratedJsonHash(null);
    },
    [characters]
  );

  // useCallback required: exposed in context value
  const getEnabledCharacters = useCallback(
    (): Character[] => filterEnabledCharacters(characters, characterMetadata),
    [characters, characterMetadata]
  );

  // Derived values
  // useMemo required: these are exposed in context and may be used as useEffect dependencies by consumers
  const enabledCharacterUuids = useMemo(
    () => getEnabledCharacterUuids(characters, characterMetadata),
    [characters, characterMetadata]
  );
  const characterSelectionSummary = useMemo(
    () => getCharacterSelectionSummary(characters, characterMetadata),
    [characters, characterMetadata]
  );

  // Use centralized defaults - ensures consistency with presets
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>(
    DEFAULT_GENERATION_OPTIONS
  );

  const [filters, setFilters] = useState({
    teams: [] as string[],
    tokenTypes: [] as string[],
    display: [] as string[],
    reminders: [] as string[],
    origin: [] as string[],
  });

  // Two independent example token states
  const [exampleCharacterToken, setExampleCharacterToken] = useState<Token | null>(null);
  const [exampleMetaToken, setExampleMetaToken] = useState<Token | null>(null);

  // useCallback required: exposed in context value
  const updateGenerationOptions = useCallback((options: Partial<GenerationOptions>) => {
    setGenerationOptions((prev) => ({ ...prev, ...options }));
  }, []);

  // useCallback required: exposed in context value
  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // useMemo required: context value object must be stable to prevent consumer re-renders
  const value: TokenContextType = useMemo(
    () => ({
      tokens,
      setTokens,
      characters,
      setCharacters,
      officialData,
      setOfficialData,
      characterMetadata,
      getMetadata,
      setMetadata: setMetadataForChar,
      deleteMetadata,
      clearAllMetadata,
      isCharacterEnabled,
      setCharacterEnabled,
      setAllCharactersEnabled,
      getEnabledCharacters,
      enabledCharacterUuids,
      characterSelectionSummary,
      scriptMeta,
      setScriptMeta,
      generationOptions,
      updateGenerationOptions,
      jsonInput,
      setJsonInput,
      filters,
      updateFilters,
      exampleCharacterToken,
      setExampleCharacterToken,
      exampleMetaToken,
      setExampleMetaToken,
      isLoading,
      setIsLoading,
      error,
      setError,
      warnings,
      setWarnings,
      generationProgress,
      setGenerationProgress,
      lastGeneratedJsonHash,
      setLastGeneratedJsonHash,
      syncStatus,
      isSyncInitialized,
    }),
    [
      tokens,
      characters,
      officialData,
      characterMetadata,
      getMetadata,
      setMetadataForChar,
      deleteMetadata,
      clearAllMetadata,
      isCharacterEnabled,
      setCharacterEnabled,
      setAllCharactersEnabled,
      getEnabledCharacters,
      enabledCharacterUuids,
      characterSelectionSummary,
      scriptMeta,
      generationOptions,
      updateGenerationOptions,
      jsonInput,
      filters,
      updateFilters,
      exampleCharacterToken,
      exampleMetaToken,
      isLoading,
      error,
      warnings,
      generationProgress,
      lastGeneratedJsonHash,
      syncStatus,
      isSyncInitialized,
    ]
  );

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
}

export function useTokenContext() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokenContext must be used within a TokenProvider');
  }
  return context;
}
