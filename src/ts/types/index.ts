/**
 * Blood on the Clocktower Token Generator
 * Type Definitions
 */

// Token generator options
export * from './tokenOptions.js';

import type { QRCodeOptions } from './tokenOptions.js';

// Background effects types
export * from './backgroundEffects.js';

import type { BackgroundStyle } from './backgroundEffects.js';

// Measurement system types
export * from './measurement.js';
// Project management types
export * from './project.js';

import type { MeasurementUnit } from './measurement.js';

// UI Theme types
export type { ThemeId, UITheme } from '@/ts/themes.js';
export { DEFAULT_THEME_ID, getTheme, getThemeIds, isValidThemeId, UI_THEMES } from '@/ts/themes.js';

// ============================================================================
// Asset Reference Types - Type-safe references to IndexedDB assets
// ============================================================================

/**
 * Branded type for asset references stored in IndexedDB.
 * Provides compile-time safety to distinguish asset IDs from URLs.
 *
 * Format: "asset:<uuid>"
 * Example: "asset:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */
export type AssetReference = string & { readonly __brand: 'AssetReference' };

/**
 * Create a type-safe asset reference from an asset ID.
 *
 * @param assetId - The asset UUID from IndexedDB
 * @returns Branded AssetReference string
 *
 * @example
 * ```typescript
 * const assetId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
 * const ref = createAssetReference(assetId);
 * // ref: "asset:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * ```
 */
export function createAssetReference(assetId: string): AssetReference {
  return `asset:${assetId}` as AssetReference;
}

/**
 * Type guard to check if a value is an AssetReference.
 *
 * @param value - String to check
 * @returns True if value is an AssetReference
 *
 * @example
 * ```typescript
 * if (isAssetReference(character.image)) {
 *   // TypeScript knows image is AssetReference here
 *   const assetId = extractAssetId(character.image);
 * }
 * ```
 */
export function isAssetReference(value: string): value is AssetReference {
  return value.startsWith('asset:');
}

/**
 * Extract the asset ID from an AssetReference.
 *
 * @param ref - AssetReference string
 * @returns The underlying asset UUID
 *
 * @example
 * ```typescript
 * const ref = createAssetReference("abc-123");
 * const id = extractAssetId(ref);
 * // id: "abc-123"
 * ```
 */
export function extractAssetId(ref: AssetReference): string {
  return ref.replace(/^asset:/, '');
}

/**
 * Check if a value is a URL (http/https/data/blob).
 * Used to distinguish URLs from AssetReferences.
 *
 * @param value - String to check
 * @returns True if value is a URL
 */
export function isUrl(value: string): boolean {
  return /^(https?:\/\/|data:|blob:)/.test(value);
}

// Image source types for visual selectors
export type ImageSource = 'builtin' | 'user' | 'global';

// Image option for visual selectors (backgrounds, flowers, leaves)
export interface ImageOption {
  id: string;
  label: string;
  src: string;
  source: ImageSource;
  thumbnail?: string;
}

// Team types
export type Team =
  | 'townsfolk'
  | 'outsider'
  | 'minion'
  | 'demon'
  | 'traveller'
  | 'fabled'
  | 'loric'
  | 'meta';

// Decorative overrides for per-character styling
export interface DecorativeOverrides {
  useCustomAccents?: boolean;
  accentStyle?: string;
  accentCount?: number;
  accentProbability?: number;
  hideSetupOverlay?: boolean;
  setupStyle?: string;
}

// Internal metadata stored separately from character JSON
// This keeps the exported JSON clean while preserving generator state
export interface CharacterMetadata {
  idLinkedToName: boolean; // Whether ID auto-updates with name (default: true)
  decoratives?: DecorativeOverrides;
}

// Character data from BotC API
export interface Character {
  id: string;
  name: string;
  team: Team;
  ability?: string;
  flavor?: string;
  overview?: string;
  examples?: string;
  howToRun?: string;
  tips?: string;
  /**
   * Character icon image.
   * Can be:
   * - URL string (http/https/data/blob)
   * - AssetReference (asset:<uuid> for IndexedDB assets)
   * - Array of URLs or AssetReferences (multiple images)
   */
  image: string | string[] | AssetReference | AssetReference[];
  setup?: boolean;
  reminders?: string[];
  remindersGlobal?: string[];
  edition?: string;
  firstNight?: number;
  otherNight?: number;
  firstNightReminder?: string;
  otherNightReminder?: string;
  // Internal fields for the generator (stripped on export)
  uuid?: string; // Stable internal identifier
  source?: 'official' | 'custom'; // Whether character is official or custom
}

// Script meta information
export interface ScriptMeta {
  id: '_meta';
  name?: string;
  version?: string;
  author?: string;
  logo?: string;
  almanac?: string;
  background?: string;
  synopsis?: string;
  overview?: string;
  changelog?: string;
  bootlegger?: string[];
  gameplay?: string;
  difficulty?: string;
  storytellerTips?: string;
}

// Script entry can be a string, meta object, or character reference
export type ScriptEntry = string | ScriptMeta | Character | { id: string };

// Token configuration
export interface TokenConfig {
  // Token Generation
  displayAbilityText: boolean;
  tokenCount: boolean;
  applyScriptName: boolean;
  scriptNameToken: boolean;
  almanacToken: boolean;
  pandemoniumToken: boolean;

  // Style Options
  accentGeneration: string;
  maximumAccents: number;
  accentPopulationProbability: number;
  setupStyle: string;
  reminderBackground: string;
  characterBackground: string;
  characterNameFont: string;
  characterReminderFont: string;

  // PDF Generation
  tokenPadding: number;
  xOffset: number;
  yOffset: number;
}

// Font spacing configuration
export interface FontSpacingOptions {
  characterName: number;
  abilityText: number;
  reminderText: number;
  metaText: number;
}

// Text shadow configuration
export interface TextShadowOptions {
  characterName: number;
  abilityText: number;
  reminderText: number;
  metaText: number;
}

// PNG export configuration
export interface PngExportOptions {
  embedMetadata: boolean;
  transparentBackground: boolean;
}

// ZIP compression level
export type CompressionLevel = 'fast' | 'normal' | 'maximum';

// Reminder count display style
export type ReminderCountStyle = 'arabic' | 'roman' | 'circled' | 'dots';

// ZIP export configuration
export interface ZipExportOptions {
  saveInTeamFolders: boolean;
  saveRemindersSeparately: boolean;
  metaTokenFolder: boolean;
  includeScriptJson: boolean;
  compressionLevel: CompressionLevel;
}

// DPI type
export type DPIOption = 300 | 600;

// Custom preset structure
export interface CustomPreset {
  id: string; // "custom_" + timestamp
  name: string;
  icon: string; // emoji
  settings: GenerationOptions;
  isCustom: true;
}

/**
 * Icon settings for image positioning
 * Note: offsetX and offsetY are stored in INCHES (canonical unit)
 * and converted to pixels during rendering using DPI
 */
export interface IconSettings {
  /** Scale multiplier (1.0 = 100%) */
  scale: number;
  /** Horizontal offset in inches */
  offsetX: number;
  /** Vertical offset in inches (positive = up) */
  offsetY: number;
}

export interface IconSettingsOptions {
  character: IconSettings;
  reminder: IconSettings;
  meta: IconSettings;
}

// Bootlegger icon type options
export type BootleggerIconType = 'bootlegger' | 'script';

// Generation options (subset of TokenConfig)
export interface GenerationOptions {
  displayAbilityText: boolean;
  generateBootleggerRules: boolean;
  bootleggerIconType?: BootleggerIconType;
  bootleggerNormalizeIcons?: boolean;
  bootleggerHideName?: boolean;
  tokenCount: boolean;
  reminderCountStyle?: ReminderCountStyle;
  generateImageVariants?: boolean;
  generateReminderVariants?: boolean;
  setupStyle: string;
  reminderBackground: string;
  reminderBackgroundImage?: string;
  reminderBackgroundType?: 'color' | 'image';
  characterBackground: string;
  characterBackgroundColor?: string;
  characterBackgroundType?: 'color' | 'image';
  metaBackground?: string;
  metaBackgroundColor?: string;
  metaBackgroundType?: 'color' | 'image';
  // Advanced background styling (overrides simple color when set)
  characterBackgroundStyle?: BackgroundStyle;
  reminderBackgroundStyle?: BackgroundStyle;
  metaBackgroundStyle?: BackgroundStyle;
  characterNameFont: string;
  characterNameColor?: string;
  metaNameFont?: string;
  metaNameColor?: string;
  characterReminderFont: string;
  abilityTextFont?: string;
  abilityTextColor?: string;
  reminderTextColor?: string;
  scriptNameToken: boolean;
  hideScriptNameAuthor?: boolean;
  almanacToken: boolean;
  pandemoniumToken: boolean;
  accentGeneration?: string;
  accentEnabled?: boolean; // Whether accents are enabled
  maximumAccents?: number;
  accentPopulationProbability?: number;
  accentArcSpan?: number;
  accentSlots?: number;
  enableLeftAccent?: boolean;
  enableRightAccent?: boolean;
  sideAccentProbability?: number;
  dpi?: DPIOption;
  fontSpacing?: FontSpacingOptions;
  textShadow?: TextShadowOptions;
  pngSettings?: PngExportOptions;
  zipSettings?: ZipExportOptions;
  pdfPadding?: number;
  pdfXOffset?: number;
  pdfYOffset?: number;
  pdfImageQuality?: number; // JPEG quality for PDF images (0.0-1.0)
  pdfBleed?: number; // Bleed in inches for cutting margin (default 1/8" = 0.125)
  iconSettings?: IconSettingsOptions; // Icon positioning per token type
  logoUrl?: string; // Custom logo URL for meta tokens
  measurementUnit?: MeasurementUnit; // User's preferred display unit (inches/millimeters)
  qrCodeOptions?: QRCodeOptions; // QR code styling options for almanac tokens
}

// Generated token
export interface Token {
  type: 'character' | 'reminder' | 'script-name' | 'almanac' | 'pandemonium' | 'bootlegger';
  name: string;
  filename: string;
  team: Team | string;
  canvas: HTMLCanvasElement;
  diameter: number; // Original diameter before DPI scaling
  hasReminders?: boolean;
  reminderCount?: number;
  parentCharacter?: string; // Display name (kept for compatibility)
  parentUuid?: string; // Stable UUID reference
  reminderText?: string;
  isOfficial?: boolean; // Whether the character is from the official list
  // Variant tracking for characters with multiple images
  variantIndex?: number; // 0-based index of this variant (undefined = not a variant)
  totalVariants?: number; // Total number of variants for this character
  order?: number; // Original order index from JSON for preserving script order
  // Character data tracking (for accessing original icon)
  characterData?: Character; // Original character data (for icon editing)
  imageUrl?: string; // URL of the icon used for this specific token variant
}

// Avery label template type
export type AveryTemplateId = 'avery-94500' | 'avery-94509' | 'custom';

// Avery template specification
export interface AveryTemplate {
  id: AveryTemplateId;
  name: string;
  labelDiameter: number; // inches
  columns: number;
  rows: number;
  leftMargin: number; // inches
  topMargin: number; // inches
  gap: number; // inches between labels
  labelsPerSheet: number;
}

// PDF options
export interface PDFOptions {
  pageWidth: number; // Page width in inches
  pageHeight: number; // Page height in inches
  dpi: number; // Dots per inch (resolution)
  margin: number; // Page margin in inches (deprecated, use template)
  tokenPadding: number; // Padding between tokens in inches (deprecated, use template gap)
  xOffset: number; // Horizontal offset in inches (fine-tuning)
  yOffset: number; // Vertical offset in inches (fine-tuning)
  imageQuality: number; // JPEG quality: 0.0-1.0 (0.90 = 90% quality)
  template?: AveryTemplateId; // Avery template to use for layout
  bleed?: number; // Bleed in inches for cutting margin (extends edge colors)
}

// Token layout item for PDF
export interface TokenLayoutItem {
  token: Token;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Filter options
export interface FilterOptions {
  team: Team | 'all';
  type: 'all' | 'character' | 'reminder';
  hasReminders: 'all' | 'has' | 'none';
}

// Token counts by team
export interface TeamCounts {
  characters: number;
  reminders: number;
}

export interface TokenCounts {
  townsfolk: TeamCounts;
  outsider: TeamCounts;
  minion: TeamCounts;
  demon: TeamCounts;
  traveller: TeamCounts;
  fabled: TeamCounts;
  loric: TeamCounts;
  meta: TeamCounts;
  total: TeamCounts;
}

// RGB color
export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: ScriptEntry[];
}

// Character validation result
export interface CharacterValidationResult {
  valid: boolean;
  errors: string[];
}

// Progress callback type
export type ProgressCallback = (current: number, total: number) => void;

// Incremental token callback - called as each token is generated
export type TokenCallback = (token: Token) => void;

// ============================================================================
// Data Synchronization Types
// ============================================================================

// Sync state for UI feedback
export type SyncState = 'idle' | 'checking' | 'downloading' | 'extracting' | 'success' | 'error';

// Data source indicator
export type DataSource = 'cache' | 'github' | 'api' | 'offline';

// Sync status information
export interface SyncStatus {
  state: SyncState;
  dataSource: DataSource;
  currentVersion: string | null;
  availableVersion: string | null;
  lastSync: Date | null;
  error: string | null;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
}

// Version information parsed from date-based version strings (vYYYY.MM.DD-rN)
export interface VersionInfo {
  year: number;
  month: number;
  day: number;
  revision: number;
  raw: string;
}

// Character record stored in IndexedDB
export interface CachedCharacter extends Character {
  _storedAt: number; // Timestamp when cached
  _version: string; // Version of the data package
}

// Metadata record for IndexedDB
export interface SyncMetadata {
  key: string;
  value: string | number | boolean;
}

// Settings record for IndexedDB
export interface SyncSettings {
  key: string;
  value: unknown;
}

// GitHub release metadata from API
export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: GitHubAsset[];
  body?: string;
}

// GitHub release asset
export interface GitHubAsset {
  name: string;
  url: string; // API URL for downloading with CORS support
  browser_download_url: string;
  size: number;
  content_type: string;
}

// Package manifest from ZIP
export interface PackageManifest {
  version: string;
  releaseDate?: string;
  contentHash: string;
  schemaVersion: number;
  characterCount?: number;
  reminderTokenCount?: number;
  jinxCount?: number;
  metadata?: {
    author?: string;
    repository?: string;
  };
}

// Extracted package contents
export interface ExtractedPackage {
  characters: Character[];
  manifest: PackageManifest;
  icons: Map<string, Blob>; // character-id -> WebP blob
}

// Storage quota information
export interface StorageQuota {
  usage: number; // Bytes used
  quota: number; // Total bytes available
  usageMB: number; // MB used (derived)
  quotaMB: number; // Total MB available (derived)
  percentUsed: number; // Percentage (derived)
}

// Font settings
export interface FontSettings {
  SIZE_RATIO: number;
  CURVE_OFFSET?: number;
  LINE_HEIGHT?: number;
}

// Configuration structure
export interface Config {
  VERSION: string;
  TOKEN: {
    ROLE_DIAMETER_INCHES: number;
    REMINDER_DIAMETER_INCHES: number;
    DISPLAY_ABILITY_TEXT: boolean;
    TOKEN_COUNT: boolean;
  };
  STYLE: {
    ACCENT_GENERATION: string;
    MAXIMUM_ACCENTS: number;
    ACCENT_POPULATION_PROBABILITY: number;
    ACCENT_ARC_SPAN: number;
    ACCENT_SLOTS: number;
    SETUP_STYLE: string;
    REMINDER_BACKGROUND: string;
    CHARACTER_BACKGROUND: string;
    CHARACTER_NAME_FONT: string;
    CHARACTER_NAME_COLOR: string;
    CHARACTER_REMINDER_FONT: string;
    ABILITY_TEXT_FONT: string;
    ABILITY_TEXT_COLOR: string;
    REMINDER_TEXT_COLOR: string;
  };
  PDF: {
    TOKEN_PADDING: number;
    X_OFFSET: number;
    Y_OFFSET: number;
    PAGE_WIDTH: number;
    PAGE_HEIGHT: number;
    DPI: number;
    MARGIN: number;
    IMAGE_QUALITY: number;
    DEFAULT_TEMPLATE: AveryTemplateId;
  };
  FONT_SPACING: {
    CHARACTER_NAME: number;
    ABILITY_TEXT: number;
    REMINDER_TEXT: number;
    META_TEXT: number;
  };
  TEXT_SHADOW: {
    CHARACTER_NAME: number;
    ABILITY_TEXT: number;
    REMINDER_TEXT: number;
    META_TEXT: number;
  };
  ZIP: {
    SAVE_IN_TEAM_FOLDERS: boolean;
    SAVE_REMINDERS_SEPARATELY: boolean;
  };
  GENERATION: {
    BATCH_SIZE: number;
    MIN_BATCH_SIZE: number;
    MAX_BATCH_SIZE: number;
  };
  SYNC: {
    GITHUB_REPO: string;
    GITHUB_API_BASE: string;
    CHECK_INTERVAL_MS: number;
    CACHE_TTL_MS: number;
    STORAGE_QUOTA_WARNING_MB: number;
    MAX_STORAGE_MB: number;
    ENABLE_AUTO_SYNC: boolean;
    MAX_RETRIES: number;
    RETRY_DELAY_MS: number;
    DB_NAME: string;
    DB_VERSION: number;
    CACHE_NAME: string;
  };
  AUTO_GENERATE_DEFAULT: boolean;
  API: {
    CORS_PROXY: string;
  };
  ASSETS: {
    FONTS: string;
    IMAGES: string;
    CHARACTER_BACKGROUNDS: string;
    SETUP_OVERLAYS: string;
    ACCENTS: string;
  };
  EXAMPLE_SCRIPTS: string[];
  TEAMS: Team[];
  FONTS: {
    CHARACTER_NAME: FontSettings;
    REMINDER_TEXT: FontSettings;
    ABILITY_TEXT: FontSettings;
    TOKEN_COUNT: FontSettings;
  };
  TRADEMARK: {
    TEXT: string;
  };
}

// Element references for UI
export interface UIElements {
  // Presets
  presetClassic: HTMLButtonElement | null;
  presetFullBloom: HTMLButtonElement | null;
  presetMinimal: HTMLButtonElement | null;
  presetDescription: HTMLElement | null;
  presetGrid: HTMLElement | null;
  addPresetButton: HTMLButtonElement | null;

  // Token Generation Options
  displayAbilityText: HTMLInputElement | null;
  tokenCount: HTMLInputElement | null;
  scriptNameToken: HTMLInputElement | null;
  almanacToken: HTMLInputElement | null;
  pandemoniumToken: HTMLInputElement | null;

  // Font Spacing
  characterNameSpacing: HTMLInputElement | null;
  abilityTextSpacing: HTMLInputElement | null;
  reminderTextSpacing: HTMLInputElement | null;

  // Text Shadow
  characterNameShadow: HTMLInputElement | null;
  abilityTextShadow: HTMLInputElement | null;
  reminderTextShadow: HTMLInputElement | null;

  // ZIP Settings
  saveInTeamFolders: HTMLInputElement | null;
  saveRemindersSeparately: HTMLInputElement | null;

  // DPI Selection
  dpiSelection: HTMLSelectElement | null;

  // Style Options
  setupStyle: HTMLSelectElement | null;
  reminderBackground: HTMLInputElement | null;
  characterBackground: HTMLSelectElement | null;
  characterNameFont: HTMLSelectElement | null;
  characterNameColor: HTMLInputElement | null;
  characterReminderFont: HTMLSelectElement | null;
  abilityTextFont: HTMLSelectElement | null;
  abilityTextColor: HTMLInputElement | null;
  reminderTextColor: HTMLInputElement | null;
  accentGeneration: HTMLSelectElement | null;
  maximumAccents: HTMLInputElement | null;
  accentPopulationProbability: HTMLInputElement | null;

  // PDF Options
  tokenPadding: HTMLInputElement | null;
  xOffset: HTMLInputElement | null;
  yOffset: HTMLInputElement | null;

  // Input Section
  fileUpload: HTMLInputElement | null;
  exampleScripts: HTMLSelectElement | null;
  jsonEditor: HTMLTextAreaElement | null;
  jsonHighlight: HTMLElement | null;
  jsonValidation: HTMLElement | null;
  formatJson: HTMLButtonElement | null;
  clearJson: HTMLButtonElement | null;
  generateTokens: HTMLButtonElement | null;
  autoGenerate: HTMLButtonElement | null;
  downloadJson: HTMLButtonElement | null;

  // Output Section
  outputSection: HTMLElement | null;
  teamFilter: HTMLSelectElement | null;
  tokenTypeFilter: HTMLSelectElement | null;
  displayFilter: HTMLSelectElement | null;
  reminderFilter: HTMLSelectElement | null;
  tokenSections: HTMLElement | null;
  characterTokensSection: HTMLElement | null;
  reminderTokensSection: HTMLElement | null;
  characterTokenGrid: HTMLElement | null;
  reminderTokenGrid: HTMLElement | null;
  loadingState: HTMLElement | null;
  emptyState: HTMLElement | null;
  exportOptions: HTMLElement | null;
  downloadAllPng: HTMLButtonElement | null;
  generatePdf: HTMLButtonElement | null;

  // Token Counts
  countTownsfolk: HTMLElement | null;
  countOutsider: HTMLElement | null;
  countMinion: HTMLElement | null;
  countDemon: HTMLElement | null;
  countTraveller: HTMLElement | null;
  countFabled: HTMLElement | null;
  countLoric: HTMLElement | null;
  countMeta: HTMLElement | null;
  countTotal: HTMLElement | null;

  // Settings Modal
  settingsButton: HTMLButtonElement | null;
  settingsModal: HTMLElement | null;
  modalBackdrop: HTMLElement | null;
  modalClose: HTMLButtonElement | null;
  uiSizeSlider: HTMLInputElement | null;
  uiSizeValue: HTMLElement | null;
  colorSchema: HTMLSelectElement | null;
  wipeDataButton: HTMLButtonElement | null;

  // Info Modal
  infoButton: HTMLButtonElement | null;
  infoModal: HTMLElement | null;
  infoModalBackdrop: HTMLElement | null;
  infoModalClose: HTMLButtonElement | null;
}

// Team color mapping
export type TeamColors = Record<Team, string>;

// Team labels
export type TeamLabels = Record<Team, string>;

// Preset configurations
export type PresetName = 'classic' | 'fullbloom' | 'minimal';

export interface PresetConfig {
  name: string;
  description: string;
  icon: string;
  settings: Partial<GenerationOptions> & {
    // Additional preset-specific settings
    characterBackground?: string;
    setupStyle?: string;
    reminderBackground?: string;
    characterNameFont?: string;
    characterReminderFont?: string;
    displayAbilityText?: boolean;
    tokenCount?: boolean;
    scriptNameToken?: boolean;
    almanacToken?: boolean;
    pandemoniumToken?: boolean;
  };
}

// Declare global jsPDF and JSZip
declare global {
  interface Window {
    jspdf: {
      jsPDF: new (options?: {
        orientation?: 'portrait' | 'landscape';
        unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc';
        format?: string | number[];
      }) => jsPDFDocument;
    };
    JSZip: new () => JSZipInstance;
    TokenGeneratorApp: unknown;
    QRCode: new (
      element: HTMLElement,
      options?: {
        text?: string;
        width?: number;
        height?: number;
        colorDark?: string;
        colorLight?: string;
        correctLevel?: number;
      }
    ) => QRCodeInstance;
  }
}

// QRCode instance type
export interface QRCodeInstance {
  clear(): void;
  makeCode(text: string): void;
}

// jsPDF document type
export interface jsPDFDocument {
  addPage(): void;
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
  save(filename: string): void;
  output(type: 'blob'): Blob;
}

// JSZip types
export interface JSZipFolder {
  file(name: string, data: Blob | string): void;
}

export interface JSZipInstance {
  folder(name: string): JSZipFolder;
  file(name: string, data: Blob | string): void;
  generateAsync(options: {
    type: 'blob';
    compression?: string;
    compressionOptions?: { level: number };
  }): Promise<Blob>;
}

// ============================================================================
// Studio Image Editor Types
// ============================================================================

// Layer types for Studio editor
export type LayerType = 'image' | 'text' | 'shape' | 'drawing';

// Blend modes for layer composition
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

// Tool types for Studio
export type StudioTool = 'select' | 'brush' | 'eraser' | 'shape' | 'text' | 'move';

// Shape types for drawing
export type ShapeType = 'circle' | 'rectangle' | 'line';

// Text alignment options
export type TextAlignment = 'left' | 'center' | 'right';

// Image filter types
export type ImageFilterType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'invert';

// Point interface for coordinates
export interface Point {
  x: number;
  y: number;
}

// Layer interface - represents a single layer in the Studio
export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  zIndex: number;

  // Canvas data for this layer
  canvas: HTMLCanvasElement;

  // Version tracking for canvas content changes
  // Incremented whenever canvas pixels are modified to force React re-renders
  version: number;

  // Transform properties
  position: Point;
  rotation: number; // degrees
  scale: Point; // x and y scale factors

  // Lock state
  locked?: boolean;

  // Type-specific data
  data?: ImageLayerData | TextLayerData | ShapeLayerData;
}

// Image layer specific data
export interface ImageLayerData {
  originalUrl?: string;
  originalBlob?: Blob;
  filters: ImageFilter[];
}

// Text layer specific data
export interface TextLayerData {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  alignment: TextAlignment;
  letterSpacing?: number;
  lineHeight?: number;
}

// Shape layer specific data
export interface ShapeLayerData {
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number; // For rectangles
}

// Image filter configuration
export interface ImageFilter {
  type: ImageFilterType;
  value: number;
}

// Tool settings for Studio tools
export interface ToolSettings {
  brush: {
    size: number;
    opacity: number;
    color: string;
    hardness: number;
  };
  eraser: {
    size: number;
    hardness: number;
  };
  shape: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius?: number;
  };
  text: {
    font: string;
    size: number;
    color: string;
    letterSpacing: number;
    alignment: 'left' | 'center' | 'right';
  };
}

// History entry for undo/redo
export interface HistoryEntry {
  timestamp: number;
  action: string;
  layersSnapshot: SerializedLayer[];
}

// Serialized layer for history/storage
export interface SerializedLayer extends Omit<Layer, 'canvas'> {
  canvasData: string; // Base64 data URL
}

// Character preset for recoloring
export interface CharacterPreset {
  id: string;
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary?: string;
  };
}

// Studio preset for saving/loading editor states
export interface StudioPreset {
  id: string;
  name: string;
  thumbnail: string; // Data URL
  layers: SerializedLayer[];
  settings: {
    canvasSize: { width: number; height: number };
    toolSettings: ToolSettings;
  };
  createdAt?: number;
  tags?: string[];
}

// Canvas size configuration
export interface CanvasSize {
  width: number;
  height: number;
}

// Background removal options
export interface BackgroundRemovalOptions {
  threshold?: number; // 0-1, segmentation threshold (default: 0.5)
  featherEdges?: boolean; // Enable edge feathering (default: true)
  edgeRadius?: number; // Edge feathering radius in pixels (default: 2)
  invertMask?: boolean; // Invert the segmentation mask (default: false)
}

// Border configuration
export interface BorderConfig {
  enabled: boolean;
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

// Logo template for script logo generation
export interface LogoTemplate {
  id: string;
  name: string;
  description?: string;
  layers: Partial<Layer>[];
  canvasSize: CanvasSize;
  thumbnail?: string;
}

// Guide line for canvas overlay
export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // pixels from top/left
  color?: string;
}

// Grid configuration
export interface GridConfig {
  enabled: boolean;
  spacing: number; // pixels
  color: string;
  snapEnabled: boolean;
  lineWidth: number; // pixels
  opacity: number; // 0-1
}

// Studio editor state (for StudioContext)
export interface StudioState {
  // Canvas state
  canvasSize: CanvasSize;
  zoom: number;
  pan: Point;
  backgroundColor: string;

  // Layer system
  layers: Layer[];
  activeLayerId: string | null;

  // Tool state
  activeTool: StudioTool;
  toolSettings: ToolSettings;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Border configuration
  border: BorderConfig;

  // Grid and guides
  grid: GridConfig;
  guides: Guide[];

  // Editor state flags
  isDirty: boolean;
  isProcessing: boolean;
  currentAssetId?: string; // If editing an existing asset
}

// Asset scope for saving
export type AssetScope = 'project' | 'global';

// Studio asset save options
export interface StudioAssetSaveOptions {
  name: string;
  type: 'studio-icon' | 'studio-logo' | 'studio-template';
  scope: AssetScope;
  projectId?: string; // Required if scope is 'project'
  tags?: string[];
  description?: string;
}
