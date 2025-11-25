/**
 * Blood on the Clocktower Token Generator
 * Type Definitions
 */

// Team types
export type Team = 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveller' | 'fabled';

// Character data from BotC API
export interface Character {
    id: string;
    name: string;
    team: Team;
    ability?: string;
    image: string | string[];
    setup?: boolean;
    reminders?: string[];
    remindersGlobal?: string[];
    edition?: string;
    firstNight?: number;
    otherNight?: number;
    firstNightReminder?: string;
    otherNightReminder?: string;
}

// Script meta information
export interface ScriptMeta {
    id: '_meta';
    name?: string;
    author?: string;
    logo?: string;
}

// Script entry can be a string, meta object, or character reference
export type ScriptEntry = string | ScriptMeta | Character | { id: string };

// Token configuration
export interface TokenConfig {
    // Token Generation
    displayAbilityText: boolean;
    roleDiameter: number;
    reminderDiameter: number;
    generateOfficialCharacters: boolean;
    generateCustomCharacters: boolean;
    tokenCount: boolean;
    applyScriptName: boolean;
    scriptNameToken: boolean;
    almanacToken: boolean;

    // Style Options
    leafGeneration: string;
    maximumLeaves: number;
    leafPopulationProbability: number;
    setupFlowerStyle: string;
    reminderBackground: string;
    characterBackground: string;
    characterNameFont: string;
    characterReminderFont: string;

    // PDF Generation
    tokenPadding: number;
    xOffset: number;
    yOffset: number;
}

// Generation options (subset of TokenConfig)
export interface GenerationOptions {
    displayAbilityText: boolean;
    roleDiameter: number;
    reminderDiameter: number;
    tokenCount: boolean;
    setupFlowerStyle: string;
    reminderBackground: string;
    characterBackground: string;
    characterNameFont: string;
    characterReminderFont: string;
}

// Generated token
export interface Token {
    type: 'character' | 'reminder';
    name: string;
    filename: string;
    team: Team | string;
    canvas: HTMLCanvasElement;
    hasReminders?: boolean;
    reminderCount?: number;
    parentCharacter?: string;
    reminderText?: string;
}

// PDF options
export interface PDFOptions {
    pageWidth: number;
    pageHeight: number;
    dpi: number;
    margin: number;
    tokenPadding: number;
    xOffset: number;
    yOffset: number;
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

// Font settings
export interface FontSettings {
    SIZE_RATIO: number;
    CURVE_OFFSET?: number;
    LINE_HEIGHT?: number;
}

// Configuration structure
export interface Config {
    TOKEN: {
        ROLE_DIAMETER: number;
        REMINDER_DIAMETER: number;
        DISPLAY_ABILITY_TEXT: boolean;
        TOKEN_COUNT: boolean;
    };
    STYLE: {
        LEAF_GENERATION: string;
        MAXIMUM_LEAVES: number;
        LEAF_POPULATION_PROBABILITY: number;
        SETUP_FLOWER_STYLE: string;
        REMINDER_BACKGROUND: string;
        CHARACTER_BACKGROUND: string;
        CHARACTER_NAME_FONT: string;
        CHARACTER_REMINDER_FONT: string;
    };
    PDF: {
        TOKEN_PADDING: number;
        X_OFFSET: number;
        Y_OFFSET: number;
        PAGE_WIDTH: number;
        PAGE_HEIGHT: number;
        DPI: number;
        MARGIN: number;
    };
    API: {
        BOTC_DATA: string;
    };
    ASSETS: {
        FONTS: string;
        IMAGES: string;
        CHARACTER_BACKGROUNDS: string;
        SETUP_FLOWERS: string;
        LEAVES: string;
    };
    EXAMPLE_SCRIPTS: string[];
    TEAMS: Team[];
    FONTS: {
        CHARACTER_NAME: FontSettings;
        REMINDER_TEXT: FontSettings;
        ABILITY_TEXT: FontSettings;
        TOKEN_COUNT: FontSettings;
    };
}

// Element references for UI
export interface UIElements {
    // Panel
    optionsPanel: HTMLElement | null;
    panelToggle: HTMLButtonElement | null;

    // Token Generation Options
    displayAbilityText: HTMLInputElement | null;
    roleDiameter: HTMLInputElement | null;
    reminderDiameter: HTMLInputElement | null;
    tokenCount: HTMLInputElement | null;

    // Style Options
    setupFlowerStyle: HTMLSelectElement | null;
    reminderBackground: HTMLInputElement | null;
    characterBackground: HTMLSelectElement | null;
    characterNameFont: HTMLSelectElement | null;
    characterReminderFont: HTMLSelectElement | null;

    // PDF Options
    tokenPadding: HTMLInputElement | null;
    xOffset: HTMLInputElement | null;
    yOffset: HTMLInputElement | null;

    // Input Section
    fileUpload: HTMLInputElement | null;
    exampleScripts: HTMLSelectElement | null;
    jsonEditor: HTMLTextAreaElement | null;
    jsonValidation: HTMLElement | null;
    formatJson: HTMLButtonElement | null;
    clearJson: HTMLButtonElement | null;
    generateTokens: HTMLButtonElement | null;

    // Output Section
    outputSection: HTMLElement | null;
    teamFilter: HTMLSelectElement | null;
    tokenTypeFilter: HTMLSelectElement | null;
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
    countTotal: HTMLElement | null;
}

// Team color mapping
export type TeamColors = Record<Team, string>;

// Team labels
export type TeamLabels = Record<Team, string>;

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
    }
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
    file(name: string, data: Blob): void;
}

export interface JSZipInstance {
    folder(name: string): JSZipFolder;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
}
