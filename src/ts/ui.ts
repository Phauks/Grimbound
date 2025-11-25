/**
 * Blood on the Clocktower Token Generator
 * UI Module - UI interactions and event handlers
 */

import CONFIG, { TEAM_LABELS } from './config.js';
import { debounce, formatJson, validateJson, downloadFile } from './utils.js';
import {
    loadExampleScript,
    loadJsonFile,
    parseScriptData,
    fetchOfficialData,
    calculateTokenCounts
} from './dataLoader.js';
import { generateAllTokens } from './tokenGenerator.js';
import { PDFGenerator, createTokensZip, downloadTokenPNG } from './pdfGenerator.js';
import type {
    Token,
    Character,
    GenerationOptions,
    UIElements,
    Team,
    ProgressCallback,
    PresetName
} from './types/index.js';
import { getPreset } from './presets.js';

/**
 * UI Controller class
 */
export class UIController {
    private tokens: Token[];
    private filteredTokens: Token[];
    private characters: Character[];
    private officialData: Character[];
    private pdfGenerator: PDFGenerator;
    private elements: UIElements;

    constructor() {
        this.tokens = [];
        this.filteredTokens = [];
        this.characters = [];
        this.officialData = [];
        this.pdfGenerator = new PDFGenerator();

        this.elements = this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM element references
     */
    private initializeElements(): UIElements {
        return {
            // Panel
            optionsPanel: document.getElementById('optionsPanel'),
            panelToggle: document.getElementById('panelToggle') as HTMLButtonElement | null,

            // Presets
            presetDefault: document.getElementById('presetDefault') as HTMLButtonElement | null,
            presetFullBloom: document.getElementById('presetFullBloom') as HTMLButtonElement | null,
            presetMinimal: document.getElementById('presetMinimal') as HTMLButtonElement | null,
            presetDescription: document.getElementById('presetDescription'),

            // Token Generation Options
            displayAbilityText: document.getElementById('displayAbilityText') as HTMLInputElement | null,
            roleDiameter: document.getElementById('roleDiameter') as HTMLInputElement | null,
            reminderDiameter: document.getElementById('reminderDiameter') as HTMLInputElement | null,
            tokenCount: document.getElementById('tokenCount') as HTMLInputElement | null,

            // Style Options
            setupFlowerStyle: document.getElementById('setupFlowerStyle') as HTMLSelectElement | null,
            reminderBackground: document.getElementById('reminderBackground') as HTMLInputElement | null,
            characterBackground: document.getElementById('characterBackground') as HTMLSelectElement | null,
            characterNameFont: document.getElementById('characterNameFont') as HTMLSelectElement | null,
            characterReminderFont: document.getElementById('characterReminderFont') as HTMLSelectElement | null,

            // PDF Options
            tokenPadding: document.getElementById('tokenPadding') as HTMLInputElement | null,
            xOffset: document.getElementById('xOffset') as HTMLInputElement | null,
            yOffset: document.getElementById('yOffset') as HTMLInputElement | null,

            // Input Section
            fileUpload: document.getElementById('fileUpload') as HTMLInputElement | null,
            exampleScripts: document.getElementById('exampleScripts') as HTMLSelectElement | null,
            jsonEditor: document.getElementById('jsonEditor') as HTMLTextAreaElement | null,
            jsonValidation: document.getElementById('jsonValidation'),
            formatJson: document.getElementById('formatJson') as HTMLButtonElement | null,
            clearJson: document.getElementById('clearJson') as HTMLButtonElement | null,
            generateTokens: document.getElementById('generateTokens') as HTMLButtonElement | null,

            // Output Section
            outputSection: document.getElementById('outputSection'),
            teamFilter: document.getElementById('teamFilter') as HTMLSelectElement | null,
            tokenTypeFilter: document.getElementById('tokenTypeFilter') as HTMLSelectElement | null,
            reminderFilter: document.getElementById('reminderFilter') as HTMLSelectElement | null,
            tokenSections: document.getElementById('tokenSections'),
            characterTokensSection: document.getElementById('characterTokensSection'),
            reminderTokensSection: document.getElementById('reminderTokensSection'),
            characterTokenGrid: document.getElementById('characterTokenGrid'),
            reminderTokenGrid: document.getElementById('reminderTokenGrid'),
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            exportOptions: document.getElementById('exportOptions'),
            downloadAllPng: document.getElementById('downloadAllPng') as HTMLButtonElement | null,
            generatePdf: document.getElementById('generatePdf') as HTMLButtonElement | null,

            // Token Counts
            countTownsfolk: document.getElementById('countTownsfolk'),
            countOutsider: document.getElementById('countOutsider'),
            countMinion: document.getElementById('countMinion'),
            countDemon: document.getElementById('countDemon'),
            countTraveller: document.getElementById('countTraveller'),
            countFabled: document.getElementById('countFabled'),
            countTotal: document.getElementById('countTotal')
        };
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Panel toggle
        this.elements.panelToggle?.addEventListener('click', () => this.togglePanel());

        // Preset buttons
        this.elements.presetDefault?.addEventListener('click', () => this.applyPreset('default'));
        this.elements.presetFullBloom?.addEventListener('click', () => this.applyPreset('fullbloom'));
        this.elements.presetMinimal?.addEventListener('click', () => this.applyPreset('minimal'));

        // File upload
        this.elements.fileUpload?.addEventListener('change', (e) => this.handleFileUpload(e));

        // Example script selection
        this.elements.exampleScripts?.addEventListener('change', (e) => this.handleExampleSelect(e));

        // JSON editor
        this.elements.jsonEditor?.addEventListener('input', debounce(() => this.validateJsonInput(), 300));

        // Format JSON button
        this.elements.formatJson?.addEventListener('click', () => this.formatJsonEditor());

        // Clear JSON button
        this.elements.clearJson?.addEventListener('click', () => this.clearJsonEditor());

        // Generate tokens button
        this.elements.generateTokens?.addEventListener('click', () => this.handleGenerateTokens());

        // Filters
        this.elements.teamFilter?.addEventListener('change', () => this.applyFilters());
        this.elements.tokenTypeFilter?.addEventListener('change', () => this.applyFilters());
        this.elements.reminderFilter?.addEventListener('change', () => this.applyFilters());

        // Export buttons
        this.elements.downloadAllPng?.addEventListener('click', () => this.handleDownloadZip());
        this.elements.generatePdf?.addEventListener('click', () => this.handleGeneratePdf());

        // Option changes - trigger regeneration
        const optionElements: (keyof UIElements)[] = [
            'displayAbilityText', 'roleDiameter', 'reminderDiameter', 'tokenCount',
            'setupFlowerStyle', 'reminderBackground', 'characterBackground',
            'characterNameFont', 'characterReminderFont'
        ];

        optionElements.forEach(id => {
            const element = this.elements[id];
            if (element && element instanceof HTMLElement) {
                element.addEventListener('change', debounce(() => {
                    if (this.characters.length > 0) {
                        this.handleGenerateTokens();
                    }
                }, 500));
            }
        });

        // PDF options
        (['tokenPadding', 'xOffset', 'yOffset'] as const).forEach(id => {
            const element = this.elements[id];
            if (element) {
                element.addEventListener('change', () => {
                    this.pdfGenerator.updateOptions({
                        tokenPadding: parseInt(this.elements.tokenPadding?.value ?? '') || CONFIG.PDF.TOKEN_PADDING,
                        xOffset: parseInt(this.elements.xOffset?.value ?? '') || CONFIG.PDF.X_OFFSET,
                        yOffset: parseInt(this.elements.yOffset?.value ?? '') || CONFIG.PDF.Y_OFFSET
                    });
                });
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            // Ctrl/Cmd + Enter to generate tokens
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleGenerateTokens();
            }
        });
    }

    /**
     * Toggle options panel
     */
    private togglePanel(): void {
        this.elements.optionsPanel?.classList.toggle('collapsed');
        this.elements.optionsPanel?.classList.toggle('open');
    }

    /**
     * Apply a preset configuration
     * @param presetName - Name of preset to apply
     */
    private applyPreset(presetName: PresetName): void {
        const preset = getPreset(presetName);
        const settings = preset.settings;

        // Update UI elements with preset values
        if (this.elements.displayAbilityText) {
            this.elements.displayAbilityText.checked = settings.displayAbilityText ?? false;
        }
        if (this.elements.roleDiameter && settings.roleDiameter) {
            this.elements.roleDiameter.value = settings.roleDiameter.toString();
        }
        if (this.elements.reminderDiameter && settings.reminderDiameter) {
            this.elements.reminderDiameter.value = settings.reminderDiameter.toString();
        }
        if (this.elements.tokenCount) {
            this.elements.tokenCount.checked = settings.tokenCount ?? false;
        }
        if (this.elements.setupFlowerStyle && settings.setupFlowerStyle) {
            this.elements.setupFlowerStyle.value = settings.setupFlowerStyle;
        }
        if (this.elements.reminderBackground && settings.reminderBackground) {
            this.elements.reminderBackground.value = settings.reminderBackground;
        }
        if (this.elements.characterBackground && settings.characterBackground) {
            this.elements.characterBackground.value = settings.characterBackground;
        }
        if (this.elements.characterNameFont && settings.characterNameFont) {
            this.elements.characterNameFont.value = settings.characterNameFont;
        }
        if (this.elements.characterReminderFont && settings.characterReminderFont) {
            this.elements.characterReminderFont.value = settings.characterReminderFont;
        }

        // Update active button state using element references
        const presetButtons = [
            this.elements.presetDefault,
            this.elements.presetFullBloom,
            this.elements.presetMinimal
        ];
        presetButtons.forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
            }
        });
        
        // Set active state on the selected preset button
        switch (presetName) {
            case 'default':
                this.elements.presetDefault?.classList.add('active');
                break;
            case 'fullbloom':
                this.elements.presetFullBloom?.classList.add('active');
                break;
            case 'minimal':
                this.elements.presetMinimal?.classList.add('active');
                break;
        }

        // Update description
        if (this.elements.presetDescription) {
            const p = this.elements.presetDescription.querySelector('p');
            if (p) {
                p.textContent = preset.description;
            }
        }

        // Regenerate tokens if script is loaded
        if (this.characters.length > 0) {
            this.handleGenerateTokens();
        }
    }

    /**
     * Handle file upload
     * @param event - Change event
     */
    private async handleFileUpload(event: Event): Promise<void> {
        console.log('[handleFileUpload] File upload event triggered');
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
            console.log('[handleFileUpload] No file selected');
            return;
        }
        
        console.log(`[handleFileUpload] File selected: ${file.name}`);

        try {
            const data = await loadJsonFile(file);
            console.log('[handleFileUpload] File loaded successfully:', data);
            
            if (this.elements.jsonEditor) {
                this.elements.jsonEditor.value = JSON.stringify(data, null, 2);
                console.log('[handleFileUpload] JSON editor populated');
            }
            this.validateJsonInput();
            if (this.elements.exampleScripts) {
                this.elements.exampleScripts.value = '';
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[handleFileUpload] Error:', message);
            this.showValidationError(message);
        }
    }

    /**
     * Handle example script selection
     * @param event - Change event
     */
    private async handleExampleSelect(event: Event): Promise<void> {
        console.log('[handleExampleSelect] Example script selection event triggered');
        const target = event.target as HTMLSelectElement;
        const filename = target.value;
        
        if (!filename) {
            console.log('[handleExampleSelect] No filename selected (empty value)');
            return;
        }
        
        console.log(`[handleExampleSelect] Selected example: ${filename}`);

        try {
            this.showLoading(true);
            const data = await loadExampleScript(filename);
            console.log('[handleExampleSelect] Example script loaded successfully:', data);
            
            if (this.elements.jsonEditor) {
                this.elements.jsonEditor.value = JSON.stringify(data, null, 2);
                console.log('[handleExampleSelect] JSON editor populated');
            }
            this.validateJsonInput();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[handleExampleSelect] Error:', message);
            this.showValidationError(`Failed to load example: ${message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate JSON input
     */
    private validateJsonInput(): void {
        const value = this.elements.jsonEditor?.value ?? '';
        const result = validateJson(value);

        if (this.elements.jsonValidation) {
            if (result.valid && result.data) {
                this.elements.jsonValidation.className = 'validation-message valid';
                this.elements.jsonValidation.textContent = `✓ Valid JSON (${result.data.length} entries)`;
            } else {
                this.elements.jsonValidation.className = 'validation-message invalid';
                this.elements.jsonValidation.textContent = `✗ ${result.error}`;
            }
        }

        if (this.elements.generateTokens) {
            this.elements.generateTokens.disabled = !result.valid;
        }
    }

    /**
     * Show validation error
     * @param message - Error message
     */
    private showValidationError(message: string): void {
        if (this.elements.jsonValidation) {
            this.elements.jsonValidation.className = 'validation-message invalid';
            this.elements.jsonValidation.textContent = `✗ ${message}`;
        }
    }

    /**
     * Format JSON in editor
     */
    private formatJsonEditor(): void {
        if (this.elements.jsonEditor) {
            const formatted = formatJson(this.elements.jsonEditor.value);
            this.elements.jsonEditor.value = formatted;
            this.validateJsonInput();
        }
    }

    /**
     * Clear JSON editor
     */
    private clearJsonEditor(): void {
        if (this.elements.jsonEditor) {
            this.elements.jsonEditor.value = '';
        }
        if (this.elements.jsonValidation) {
            this.elements.jsonValidation.className = 'validation-message';
            this.elements.jsonValidation.textContent = '';
        }
        if (this.elements.generateTokens) {
            this.elements.generateTokens.disabled = false;
        }
        if (this.elements.exampleScripts) {
            this.elements.exampleScripts.value = '';
        }
        if (this.elements.fileUpload) {
            this.elements.fileUpload.value = '';
        }
    }

    /**
     * Get current generation options
     * @returns Options object
     */
    private getGenerationOptions(): GenerationOptions {
        return {
            displayAbilityText: this.elements.displayAbilityText?.checked ?? false,
            roleDiameter: parseInt(this.elements.roleDiameter?.value ?? '') || CONFIG.TOKEN.ROLE_DIAMETER,
            reminderDiameter: parseInt(this.elements.reminderDiameter?.value ?? '') || CONFIG.TOKEN.REMINDER_DIAMETER,
            tokenCount: this.elements.tokenCount?.checked ?? false,
            setupFlowerStyle: this.elements.setupFlowerStyle?.value ?? CONFIG.STYLE.SETUP_FLOWER_STYLE,
            reminderBackground: this.elements.reminderBackground?.value ?? CONFIG.STYLE.REMINDER_BACKGROUND,
            characterBackground: this.elements.characterBackground?.value ?? CONFIG.STYLE.CHARACTER_BACKGROUND,
            characterNameFont: this.elements.characterNameFont?.value ?? CONFIG.STYLE.CHARACTER_NAME_FONT,
            characterReminderFont: this.elements.characterReminderFont?.value ?? CONFIG.STYLE.CHARACTER_REMINDER_FONT
        };
    }

    /**
     * Handle token generation
     */
    private async handleGenerateTokens(): Promise<void> {
        const value = this.elements.jsonEditor?.value ?? '';
        const validation = validateJson(value);
        if (!validation.valid || !validation.data) {
            this.showValidationError(validation.error ?? 'Invalid JSON');
            return;
        }

        try {
            this.showLoading(true);

            // Fetch official data if not already cached
            if (this.officialData.length === 0) {
                this.officialData = await fetchOfficialData();
            }

            // Parse script data
            this.characters = parseScriptData(validation.data, this.officialData);

            if (this.characters.length === 0) {
                this.showEmptyState('No valid characters found in script');
                return;
            }

            // Generate tokens
            const options = this.getGenerationOptions();
            const progressCallback: ProgressCallback = (current, total) => {
                this.updateLoadingProgress(current, total);
            };
            this.tokens = await generateAllTokens(this.characters, options, progressCallback);

            // Update counts
            this.updateTokenCounts();

            // Apply filters and render
            this.applyFilters();

            // Show export options
            if (this.elements.exportOptions) {
                this.elements.exportOptions.style.display = 'flex';
            }

        } catch (error) {
            console.error('Token generation error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.showEmptyState(`Error generating tokens: ${message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update token counts display
     */
    private updateTokenCounts(): void {
        const counts = calculateTokenCounts(this.characters);

        // Map team names to element IDs for reliable lookup
        const teamElementMap: Record<Team, keyof UIElements> = {
            townsfolk: 'countTownsfolk',
            outsider: 'countOutsider',
            minion: 'countMinion',
            demon: 'countDemon',
            traveller: 'countTraveller',
            fabled: 'countFabled'
        };

        CONFIG.TEAMS.forEach(team => {
            const elementKey = teamElementMap[team];
            const element = this.elements[elementKey];
            if (element) {
                element.textContent = `${counts[team].characters} / ${counts[team].reminders}`;
            }
        });

        if (this.elements.countTotal) {
            this.elements.countTotal.textContent = `${counts.total.characters} / ${counts.total.reminders}`;
        }
    }

    /**
     * Apply filters to tokens
     */
    private applyFilters(): void {
        const teamFilter = this.elements.teamFilter?.value ?? 'all';
        const typeFilter = this.elements.tokenTypeFilter?.value ?? 'all';
        const reminderFilter = this.elements.reminderFilter?.value ?? 'all';

        this.filteredTokens = this.tokens.filter(token => {
            // Team filter
            if (teamFilter !== 'all' && token.team.toLowerCase() !== teamFilter) {
                return false;
            }

            // Type filter
            if (typeFilter !== 'all' && token.type !== typeFilter) {
                return false;
            }

            // Reminder filter (only applies to character tokens)
            if (reminderFilter !== 'all' && token.type === 'character') {
                const hasReminders = token.hasReminders;
                if (reminderFilter === 'has' && !hasReminders) return false;
                if (reminderFilter === 'none' && hasReminders) return false;
            }

            return true;
        });

        this.renderTokenGrid();
    }

    /**
     * Helper function to show/hide a section element
     * @param section - Section element to show/hide
     * @param show - Whether to show or hide the section
     */
    private showSection(section: HTMLElement | null, show: boolean): void {
        if (section) {
            section.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Render token grid
     */
    private renderTokenGrid(): void {
        const characterGrid = this.elements.characterTokenGrid;
        const reminderGrid = this.elements.reminderTokenGrid;
        const characterSection = this.elements.characterTokensSection;
        const reminderSection = this.elements.reminderTokensSection;
        
        if (!characterGrid || !reminderGrid) return;

        // Clear existing content
        const existingCharacterCards = characterGrid.querySelectorAll('.token-card');
        const existingReminderCards = reminderGrid.querySelectorAll('.token-card');
        existingCharacterCards.forEach(card => card.remove());
        existingReminderCards.forEach(card => card.remove());

        if (this.filteredTokens.length === 0) {
            this.showEmptyState(this.tokens.length > 0
                ? 'No tokens match current filters'
                : 'No tokens generated yet. Upload or paste a JSON script to get started.');
            return;
        }

        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }

        // Separate tokens by type
        const characterTokens = this.filteredTokens.filter(t => t.type === 'character');
        const reminderTokens = this.filteredTokens.filter(t => t.type === 'reminder');

        // Show/hide sections based on content and filters
        const typeFilter = this.elements.tokenTypeFilter?.value ?? 'all';
        
        const showCharacters = (typeFilter === 'all' || typeFilter === 'character') && characterTokens.length > 0;
        const showReminders = (typeFilter === 'all' || typeFilter === 'reminder') && reminderTokens.length > 0;
        
        this.showSection(characterSection, showCharacters);
        this.showSection(reminderSection, showReminders);

        // Render character tokens
        for (const token of characterTokens) {
            const card = this.createTokenCard(token);
            characterGrid.appendChild(card);
        }

        // Render reminder tokens
        for (const token of reminderTokens) {
            const card = this.createTokenCard(token);
            reminderGrid.appendChild(card);
        }
    }

    /**
     * Create a token card element
     * @param token - Token object
     * @returns Token card element
     */
    private createTokenCard(token: Token): HTMLElement {
        const card = document.createElement('div');
        card.className = 'token-card';
        card.dataset.tokenId = token.filename;

        const preview = document.createElement('div');
        preview.className = 'token-preview';

        // Clone canvas for display (scaled down)
        const displayCanvas = document.createElement('canvas');
        const displaySize = 180;
        displayCanvas.width = displaySize;
        displayCanvas.height = displaySize;
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(token.canvas, 0, 0, displaySize, displaySize);
        }
        preview.appendChild(displayCanvas);

        const info = document.createElement('div');
        info.className = 'token-info';

        const name = document.createElement('div');
        name.className = 'token-name';
        name.textContent = token.name;
        name.title = token.name;

        const type = document.createElement('div');
        type.className = 'token-type';
        type.textContent = token.type;

        const team = document.createElement('span');
        const teamKey = token.team.toLowerCase() as Team;
        team.className = `token-team ${teamKey}`;
        team.textContent = TEAM_LABELS[teamKey] ?? token.team;

        info.appendChild(name);
        info.appendChild(type);
        info.appendChild(team);

        const actions = document.createElement('div');
        actions.className = 'token-actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn-secondary';
        downloadBtn.textContent = '📥 PNG';
        downloadBtn.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            downloadTokenPNG(token);
        });

        actions.appendChild(downloadBtn);

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(actions);

        // Click to download
        card.addEventListener('click', () => {
            downloadTokenPNG(token);
        });

        return card;
    }

    /**
     * Show/hide loading state
     * @param show - Whether to show loading
     */
    private showLoading(show: boolean): void {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = show ? 'flex' : 'none';
        }
        if (this.elements.emptyState && show) {
            this.elements.emptyState.style.display = 'none';
        }
        // Hide token sections when loading
        if (show) {
            this.showSection(this.elements.characterTokensSection, false);
            this.showSection(this.elements.reminderTokensSection, false);
        }
    }

    /**
     * Update loading progress
     * @param current - Current progress
     * @param total - Total items
     */
    private updateLoadingProgress(current: number, total: number): void {
        const loadingText = this.elements.loadingState?.querySelector('p');
        if (loadingText) {
            loadingText.textContent = `Generating tokens... ${current}/${total}`;
        }
    }

    /**
     * Show empty state with message
     * @param message - Message to display
     */
    private showEmptyState(message: string): void {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
            const p = this.elements.emptyState.querySelector('p');
            if (p) {
                p.textContent = message;
            }
        }
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'none';
        }
        // Hide token sections when showing empty state
        this.showSection(this.elements.characterTokensSection, false);
        this.showSection(this.elements.reminderTokensSection, false);
    }

    /**
     * Handle ZIP download
     */
    private async handleDownloadZip(): Promise<void> {
        if (this.tokens.length === 0) return;

        try {
            if (this.elements.downloadAllPng) {
                this.elements.downloadAllPng.disabled = true;
                this.elements.downloadAllPng.textContent = '⏳ Creating ZIP...';
            }

            const progressCallback: ProgressCallback = (current, total) => {
                if (this.elements.downloadAllPng) {
                    this.elements.downloadAllPng.textContent = `⏳ ${current}/${total}`;
                }
            };

            const blob = await createTokensZip(this.tokens, progressCallback);

            downloadFile(blob, 'clocktower_tokens.zip');

        } catch (error) {
            console.error('ZIP creation error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to create ZIP: ${message}`);
        } finally {
            if (this.elements.downloadAllPng) {
                this.elements.downloadAllPng.disabled = false;
                this.elements.downloadAllPng.innerHTML = '<span class="btn-icon">📥</span> Download All (ZIP)';
            }
        }
    }

    /**
     * Handle PDF generation
     */
    private async handleGeneratePdf(): Promise<void> {
        if (this.tokens.length === 0) return;

        try {
            if (this.elements.generatePdf) {
                this.elements.generatePdf.disabled = true;
                this.elements.generatePdf.textContent = '⏳ Generating PDF...';
            }

            // Update PDF options
            this.pdfGenerator.updateOptions({
                tokenPadding: parseInt(this.elements.tokenPadding?.value ?? '') || CONFIG.PDF.TOKEN_PADDING,
                xOffset: parseInt(this.elements.xOffset?.value ?? '') || CONFIG.PDF.X_OFFSET,
                yOffset: parseInt(this.elements.yOffset?.value ?? '') || CONFIG.PDF.Y_OFFSET
            });

            const progressCallback: ProgressCallback = (page, total) => {
                if (this.elements.generatePdf) {
                    this.elements.generatePdf.textContent = `⏳ Page ${page}/${total}`;
                }
            };

            await this.pdfGenerator.downloadPDF(this.tokens, 'clocktower_tokens.pdf', progressCallback);

        } catch (error) {
            console.error('PDF generation error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to generate PDF: ${message}`);
        } finally {
            if (this.elements.generatePdf) {
                this.elements.generatePdf.disabled = false;
                this.elements.generatePdf.innerHTML = '<span class="btn-icon">📄</span> Generate PDF';
            }
        }
    }

    /**
     * Initialize the UI
     */
    async initialize(): Promise<void> {
        // Pre-fetch official data in background
        fetchOfficialData().then(data => {
            this.officialData = data;
        }).catch(err => {
            console.warn('Could not pre-fetch official data:', err);
        });

        console.log('UI Controller initialized');
    }
}

export default UIController;
