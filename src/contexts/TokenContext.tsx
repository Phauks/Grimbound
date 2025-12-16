import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
import type {
  Character,
  CharacterMetadata,
  GenerationOptions,
  ScriptMeta,
  SyncStatus,
  Token,
} from '../ts/types/index.js';
import { nameToId } from '../ts/utils/nameGenerator';
import { useDataSync } from './DataSyncContext';

interface TokenContextType {
  // Token state
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;

  filteredTokens: Token[];
  setFilteredTokens: (tokens: Token[]) => void;

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
  // Legacy single accessor (returns character token for backwards compatibility)
  exampleToken: Token | null;
  setExampleToken: (token: Token | null) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  // Validation warnings
  warnings: string[];
  setWarnings: (warnings: string[]) => void;

  // Generation progress
  generationProgress: { current: number; total: number } | null;
  setGenerationProgress: (progress: { current: number; total: number } | null) => void;

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
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [officialData, setOfficialData] = useState<Character[]>([]);
  const [scriptMeta, setScriptMeta] = useState<ScriptMeta | null>(null);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Get sync status from DataSyncContext
  const { status: syncStatus, isInitialized: isSyncInitialized } = useDataSync();

  // Character metadata store (keyed by character UUID)
  const [characterMetadata, setCharacterMetadata] = useState<Map<string, CharacterMetadata>>(
    new Map()
  );

  // Get metadata for a character
  // If no metadata exists, dynamically compute idLinkedToName based on whether id === nameToId(name)
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
  const setMetadataForChar = useCallback((uuid: string, metadata: Partial<CharacterMetadata>) => {
    setCharacterMetadata((prev) => {
      const newMap = new Map(prev);
      const existing = prev.get(uuid) || DEFAULT_CHARACTER_METADATA;
      newMap.set(uuid, { ...existing, ...metadata });
      return newMap;
    });
  }, []);

  // Delete metadata for a character
  const deleteMetadata = useCallback((uuid: string) => {
    setCharacterMetadata((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uuid);
      return newMap;
    });
  }, []);

  // Clear all metadata (e.g., when loading a new script)
  const clearAllMetadata = useCallback(() => {
    setCharacterMetadata(new Map());
  }, []);

  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    displayAbilityText: false,
    generateBootleggerRules: false,
    tokenCount: false,
    setupFlowerStyle: 'setup_flower_1',
    reminderBackground: '#6C3BAA',
    reminderBackgroundImage: 'character_background_1',
    reminderBackgroundType: 'color',
    characterBackground: 'character_background_1',
    characterBackgroundColor: '#FFFFFF',
    characterBackgroundType: 'image',
    metaBackground: 'character_background_1',
    metaBackgroundColor: '#FFFFFF',
    metaBackgroundType: 'image',
    characterNameFont: 'Dumbledor',
    characterNameColor: '#000000',
    characterReminderFont: 'TradeGothic',
    abilityTextFont: 'TradeGothic',
    abilityTextColor: '#000000',
    reminderTextColor: '#FFFFFF',
    leafGeneration: 'classic',
    maximumLeaves: 0,
    leafPopulationProbability: 30,
    leafArcSpan: 120,
    leafSlots: 7,
    dpi: 300,
    fontSpacing: {
      characterName: 0,
      abilityText: 0,
      reminderText: 0,
      metaText: 0,
    },
    textShadow: {
      characterName: 4,
      abilityText: 3,
      reminderText: 4,
      metaText: 4,
    },
    pandemoniumToken: true,
    scriptNameToken: true,
    almanacToken: true,
    pngSettings: {
      embedMetadata: false,
      transparentBackground: false,
    },
    zipSettings: {
      saveInTeamFolders: true,
      saveRemindersSeparately: true,
      metaTokenFolder: true,
      includeScriptJson: false,
      compressionLevel: 'normal',
    },
    iconSettings: {
      character: { scale: 1.0, offsetX: 0, offsetY: 0 },
      reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
      meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
    },
    measurementUnit: 'inches',
  });

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

  // Smart setter that routes to correct state based on token type
  const setExampleToken = useCallback((token: Token | null) => {
    if (!token) {
      // Clear both if null
      setExampleCharacterToken(null);
      setExampleMetaToken(null);
      return;
    }

    if (token.type === 'character' || token.type === 'reminder') {
      // Character and reminder tokens go to character slot
      // For reminders, we store the reminder itself (preview will find parent character)
      setExampleCharacterToken(token);
    } else if (
      token.type === 'almanac' ||
      token.type === 'script-name' ||
      token.type === 'pandemonium' ||
      token.type === 'bootlegger'
    ) {
      // All meta tokens go to meta slot
      setExampleMetaToken(token);
    }
  }, []);

  // Legacy accessor returns character token for backwards compatibility
  const exampleToken = exampleCharacterToken;

  const updateGenerationOptions = useCallback((options: Partial<GenerationOptions>) => {
    setGenerationOptions((prev) => ({ ...prev, ...options }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const value: TokenContextType = {
    tokens,
    setTokens,
    filteredTokens,
    setFilteredTokens,
    characters,
    setCharacters,
    officialData,
    setOfficialData,
    characterMetadata,
    getMetadata,
    setMetadata: setMetadataForChar,
    deleteMetadata,
    clearAllMetadata,
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
    exampleToken,
    setExampleToken,
    isLoading,
    setIsLoading,
    error,
    setError,
    warnings,
    setWarnings,
    generationProgress,
    setGenerationProgress,
    syncStatus,
    isSyncInitialized,
  };

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>;
}

export function useTokenContext() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokenContext must be used within a TokenProvider');
  }
  return context;
}
