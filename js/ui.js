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

/**
 * UI Controller class
 */
export class UIController {
    constructor() {
        this.tokens = [];
        this.filteredTokens = [];
        this.characters = [];
        this.officialData = [];
        this.pdfGenerator = new PDFGenerator();
        
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Panel
            optionsPanel: document.getElementById('optionsPanel'),
            panelToggle: document.getElementById('panelToggle'),
            
            // Settings Modal
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            settingsModalOverlay: document.getElementById('settingsModalOverlay'),
            settingsModalClose: document.getElementById('settingsModalClose'),
            settingsModalCancel: document.getElementById('settingsModalCancel'),
            settingsModalApply: document.getElementById('settingsModalApply'),
            
            // Modal Style Options
            modalSetupFlowerStyle: document.getElementById('modalSetupFlowerStyle'),
            modalReminderBackground: document.getElementById('modalReminderBackground'),
            modalCharacterBackground: document.getElementById('modalCharacterBackground'),
            modalCharacterNameFont: document.getElementById('modalCharacterNameFont'),
            modalCharacterReminderFont: document.getElementById('modalCharacterReminderFont'),
            
            // Token Generation Options
            displayAbilityText: document.getElementById('displayAbilityText'),
            roleDiameter: document.getElementById('roleDiameter'),
            reminderDiameter: document.getElementById('reminderDiameter'),
            tokenCount: document.getElementById('tokenCount'),
            
            // Style Options (sidebar - keeping for backwards compatibility)
            setupFlowerStyle: document.getElementById('setupFlowerStyle'),
            reminderBackground: document.getElementById('reminderBackground'),
            characterBackground: document.getElementById('characterBackground'),
            characterNameFont: document.getElementById('characterNameFont'),
            characterReminderFont: document.getElementById('characterReminderFont'),
            
            // PDF Options
            tokenPadding: document.getElementById('tokenPadding'),
            xOffset: document.getElementById('xOffset'),
            yOffset: document.getElementById('yOffset'),
            
            // Input Section
            fileUpload: document.getElementById('fileUpload'),
            exampleScripts: document.getElementById('exampleScripts'),
            jsonEditor: document.getElementById('jsonEditor'),
            jsonValidation: document.getElementById('jsonValidation'),
            formatJson: document.getElementById('formatJson'),
            clearJson: document.getElementById('clearJson'),
            generateTokens: document.getElementById('generateTokens'),
            
            // Output Section
            outputSection: document.getElementById('outputSection'),
            teamFilter: document.getElementById('teamFilter'),
            tokenTypeFilter: document.getElementById('tokenTypeFilter'),
            reminderFilter: document.getElementById('reminderFilter'),
            tokenGrid: document.getElementById('tokenGrid'),
            loadingState: document.getElementById('loadingState'),
            emptyState: document.getElementById('emptyState'),
            exportOptions: document.getElementById('exportOptions'),
            downloadAllPng: document.getElementById('downloadAllPng'),
            generatePdf: document.getElementById('generatePdf'),
            
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
    setupEventListeners() {
        // Panel toggle
        this.elements.panelToggle?.addEventListener('click', () => this.togglePanel());

        // Settings modal
        this.elements.settingsBtn?.addEventListener('click', () => this.openSettingsModal());
        this.elements.settingsModalOverlay?.addEventListener('click', () => this.closeSettingsModal());
        this.elements.settingsModalClose?.addEventListener('click', () => this.closeSettingsModal());
        this.elements.settingsModalCancel?.addEventListener('click', () => this.closeSettingsModal());
        this.elements.settingsModalApply?.addEventListener('click', () => this.applySettingsAndClose());

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.settingsModal?.classList.contains('open')) {
                this.closeSettingsModal();
            }
        });

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
        const optionElements = [
            'displayAbilityText', 'roleDiameter', 'reminderDiameter', 'tokenCount',
            'setupFlowerStyle', 'reminderBackground', 'characterBackground',
            'characterNameFont', 'characterReminderFont'
        ];

        optionElements.forEach(id => {
            this.elements[id]?.addEventListener('change', debounce(() => {
                if (this.characters.length > 0) {
                    this.handleGenerateTokens();
                }
            }, 500));
        });

        // PDF options
        ['tokenPadding', 'xOffset', 'yOffset'].forEach(id => {
            this.elements[id]?.addEventListener('change', () => {
                this.pdfGenerator.updateOptions({
                    tokenPadding: parseInt(this.elements.tokenPadding.value) || CONFIG.PDF.TOKEN_PADDING,
                    xOffset: parseInt(this.elements.xOffset.value) || CONFIG.PDF.X_OFFSET,
                    yOffset: parseInt(this.elements.yOffset.value) || CONFIG.PDF.Y_OFFSET
                });
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to generate tokens
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleGenerateTokens();
            }
        });
    }

    /**
     * Open settings modal
     */
    openSettingsModal() {
        // Sync current values to modal
        this.syncSettingsToModal();
        this.elements.settingsModal?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close settings modal
     */
    closeSettingsModal() {
        this.elements.settingsModal?.classList.remove('open');
        document.body.style.overflow = '';
    }

    /**
     * Sync current settings to modal inputs
     */
    syncSettingsToModal() {
        if (this.elements.modalSetupFlowerStyle && this.elements.setupFlowerStyle) {
            this.elements.modalSetupFlowerStyle.value = this.elements.setupFlowerStyle.value;
        }
        if (this.elements.modalReminderBackground && this.elements.reminderBackground) {
            this.elements.modalReminderBackground.value = this.elements.reminderBackground.value;
        }
        if (this.elements.modalCharacterBackground && this.elements.characterBackground) {
            this.elements.modalCharacterBackground.value = this.elements.characterBackground.value;
        }
        if (this.elements.modalCharacterNameFont && this.elements.characterNameFont) {
            this.elements.modalCharacterNameFont.value = this.elements.characterNameFont.value;
        }
        if (this.elements.modalCharacterReminderFont && this.elements.characterReminderFont) {
            this.elements.modalCharacterReminderFont.value = this.elements.characterReminderFont.value;
        }
    }

    /**
     * Apply settings from modal to main inputs and close modal
     */
    applySettingsAndClose() {
        // Apply modal values to main inputs
        if (this.elements.setupFlowerStyle && this.elements.modalSetupFlowerStyle) {
            this.elements.setupFlowerStyle.value = this.elements.modalSetupFlowerStyle.value;
        }
        if (this.elements.reminderBackground && this.elements.modalReminderBackground) {
            this.elements.reminderBackground.value = this.elements.modalReminderBackground.value;
        }
        if (this.elements.characterBackground && this.elements.modalCharacterBackground) {
            this.elements.characterBackground.value = this.elements.modalCharacterBackground.value;
        }
        if (this.elements.characterNameFont && this.elements.modalCharacterNameFont) {
            this.elements.characterNameFont.value = this.elements.modalCharacterNameFont.value;
        }
        if (this.elements.characterReminderFont && this.elements.modalCharacterReminderFont) {
            this.elements.characterReminderFont.value = this.elements.modalCharacterReminderFont.value;
        }
        
        this.closeSettingsModal();
        
        // Regenerate tokens if there are characters loaded
        if (this.characters.length > 0) {
            this.handleGenerateTokens();
        }
    }

    /**
     * Toggle options panel
     */
    togglePanel() {
        this.elements.optionsPanel.classList.toggle('collapsed');
        this.elements.optionsPanel.classList.toggle('open');
    }

    /**
     * Handle file upload
     * @param {Event} event - Change event
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const data = await loadJsonFile(file);
            this.elements.jsonEditor.value = JSON.stringify(data, null, 2);
            this.validateJsonInput();
            this.elements.exampleScripts.value = '';
        } catch (error) {
            this.showValidationError(error.message);
        }
    }

    /**
     * Handle example script selection
     * @param {Event} event - Change event
     */
    async handleExampleSelect(event) {
        const filename = event.target.value;
        if (!filename) return;

        try {
            this.showLoading(true);
            const data = await loadExampleScript(filename);
            this.elements.jsonEditor.value = JSON.stringify(data, null, 2);
            this.validateJsonInput();
        } catch (error) {
            this.showValidationError(`Failed to load example: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validate JSON input
     */
    validateJsonInput() {
        const result = validateJson(this.elements.jsonEditor.value);
        
        if (result.valid) {
            this.elements.jsonValidation.className = 'validation-message valid';
            this.elements.jsonValidation.textContent = `✓ Valid JSON (${result.data.length} entries)`;
            this.elements.generateTokens.disabled = false;
        } else {
            this.elements.jsonValidation.className = 'validation-message invalid';
            this.elements.jsonValidation.textContent = `✗ ${result.error}`;
            this.elements.generateTokens.disabled = true;
        }
    }

    /**
     * Show validation error
     * @param {string} message - Error message
     */
    showValidationError(message) {
        this.elements.jsonValidation.className = 'validation-message invalid';
        this.elements.jsonValidation.textContent = `✗ ${message}`;
    }

    /**
     * Format JSON in editor
     */
    formatJsonEditor() {
        const formatted = formatJson(this.elements.jsonEditor.value);
        this.elements.jsonEditor.value = formatted;
        this.validateJsonInput();
    }

    /**
     * Clear JSON editor
     */
    clearJsonEditor() {
        this.elements.jsonEditor.value = '';
        this.elements.jsonValidation.className = 'validation-message';
        this.elements.jsonValidation.textContent = '';
        this.elements.generateTokens.disabled = false;
        this.elements.exampleScripts.value = '';
        this.elements.fileUpload.value = '';
    }

    /**
     * Get current generation options
     * @returns {Object} Options object
     */
    getGenerationOptions() {
        return {
            displayAbilityText: this.elements.displayAbilityText?.checked || false,
            roleDiameter: parseInt(this.elements.roleDiameter?.value) || CONFIG.TOKEN.ROLE_DIAMETER,
            reminderDiameter: parseInt(this.elements.reminderDiameter?.value) || CONFIG.TOKEN.REMINDER_DIAMETER,
            tokenCount: this.elements.tokenCount?.checked || false,
            setupFlowerStyle: this.elements.setupFlowerStyle?.value || CONFIG.STYLE.SETUP_FLOWER_STYLE,
            reminderBackground: this.elements.reminderBackground?.value || CONFIG.STYLE.REMINDER_BACKGROUND,
            characterBackground: this.elements.characterBackground?.value || CONFIG.STYLE.CHARACTER_BACKGROUND,
            characterNameFont: this.elements.characterNameFont?.value || CONFIG.STYLE.CHARACTER_NAME_FONT,
            characterReminderFont: this.elements.characterReminderFont?.value || CONFIG.STYLE.CHARACTER_REMINDER_FONT
        };
    }

    /**
     * Handle token generation
     */
    async handleGenerateTokens() {
        const validation = validateJson(this.elements.jsonEditor.value);
        if (!validation.valid) {
            this.showValidationError(validation.error);
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
            this.tokens = await generateAllTokens(this.characters, options, (current, total) => {
                this.updateLoadingProgress(current, total);
            });

            // Update counts
            this.updateTokenCounts();

            // Apply filters and render
            this.applyFilters();
            
            // Show export options
            this.elements.exportOptions.style.display = 'flex';

        } catch (error) {
            console.error('Token generation error:', error);
            this.showEmptyState(`Error generating tokens: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update token counts display
     */
    updateTokenCounts() {
        const counts = calculateTokenCounts(this.characters);

        // Map team names to element IDs for reliable lookup
        const teamElementMap = {
            townsfolk: 'countTownsfolk',
            outsider: 'countOutsider',
            minion: 'countMinion',
            demon: 'countDemon',
            traveller: 'countTraveller',
            fabled: 'countFabled'
        };

        CONFIG.TEAMS.forEach(team => {
            const elementId = teamElementMap[team];
            const element = this.elements[elementId];
            if (element) {
                element.textContent = `${counts[team].characters} / ${counts[team].reminders}`;
            }
        });

        this.elements.countTotal.textContent = `${counts.total.characters} / ${counts.total.reminders}`;
    }

    /**
     * Apply filters to tokens
     */
    applyFilters() {
        const teamFilter = this.elements.teamFilter?.value || 'all';
        const typeFilter = this.elements.tokenTypeFilter?.value || 'all';
        const reminderFilter = this.elements.reminderFilter?.value || 'all';

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
     * Render token grid
     */
    renderTokenGrid() {
        // Clear existing content (except loading/empty states)
        const existingCards = this.elements.tokenGrid.querySelectorAll('.token-card');
        existingCards.forEach(card => card.remove());

        if (this.filteredTokens.length === 0) {
            this.showEmptyState(this.tokens.length > 0 
                ? 'No tokens match current filters' 
                : 'No tokens generated yet. Upload or paste a JSON script to get started.');
            return;
        }

        this.elements.emptyState.style.display = 'none';

        // Create token cards
        for (const token of this.filteredTokens) {
            const card = this.createTokenCard(token);
            this.elements.tokenGrid.appendChild(card);
        }
    }

    /**
     * Create a token card element
     * @param {Object} token - Token object
     * @returns {HTMLElement} Token card element
     */
    createTokenCard(token) {
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
        ctx.drawImage(token.canvas, 0, 0, displaySize, displaySize);
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
        team.className = `token-team ${token.team.toLowerCase()}`;
        team.textContent = TEAM_LABELS[token.team.toLowerCase()] || token.team;

        info.appendChild(name);
        info.appendChild(type);
        info.appendChild(team);

        const actions = document.createElement('div');
        actions.className = 'token-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn-secondary';
        downloadBtn.textContent = '📥 PNG';
        downloadBtn.addEventListener('click', (e) => {
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
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        this.elements.loadingState.style.display = show ? 'flex' : 'none';
        this.elements.emptyState.style.display = show ? 'none' : this.elements.emptyState.style.display;
    }

    /**
     * Update loading progress
     * @param {number} current - Current progress
     * @param {number} total - Total items
     */
    updateLoadingProgress(current, total) {
        const loadingText = this.elements.loadingState.querySelector('p');
        if (loadingText) {
            loadingText.textContent = `Generating tokens... ${current}/${total}`;
        }
    }

    /**
     * Show empty state with message
     * @param {string} message - Message to display
     */
    showEmptyState(message) {
        this.elements.emptyState.style.display = 'block';
        this.elements.emptyState.querySelector('p').textContent = message;
        this.elements.loadingState.style.display = 'none';
    }

    /**
     * Handle ZIP download
     */
    async handleDownloadZip() {
        if (this.tokens.length === 0) return;

        try {
            this.elements.downloadAllPng.disabled = true;
            this.elements.downloadAllPng.textContent = '⏳ Creating ZIP...';

            const blob = await createTokensZip(this.tokens, (current, total) => {
                this.elements.downloadAllPng.textContent = `⏳ ${current}/${total}`;
            });

            downloadFile(blob, 'clocktower_tokens.zip');

        } catch (error) {
            console.error('ZIP creation error:', error);
            alert(`Failed to create ZIP: ${error.message}`);
        } finally {
            this.elements.downloadAllPng.disabled = false;
            this.elements.downloadAllPng.innerHTML = '<span class="btn-icon">📥</span> Download All (ZIP)';
        }
    }

    /**
     * Handle PDF generation
     */
    async handleGeneratePdf() {
        if (this.tokens.length === 0) return;

        try {
            this.elements.generatePdf.disabled = true;
            this.elements.generatePdf.textContent = '⏳ Generating PDF...';

            // Update PDF options
            this.pdfGenerator.updateOptions({
                tokenPadding: parseInt(this.elements.tokenPadding.value) || CONFIG.PDF.TOKEN_PADDING,
                xOffset: parseInt(this.elements.xOffset.value) || CONFIG.PDF.X_OFFSET,
                yOffset: parseInt(this.elements.yOffset.value) || CONFIG.PDF.Y_OFFSET
            });

            await this.pdfGenerator.downloadPDF(this.tokens, 'clocktower_tokens.pdf', (page, total) => {
                this.elements.generatePdf.textContent = `⏳ Page ${page}/${total}`;
            });

        } catch (error) {
            console.error('PDF generation error:', error);
            alert(`Failed to generate PDF: ${error.message}`);
        } finally {
            this.elements.generatePdf.disabled = false;
            this.elements.generatePdf.innerHTML = '<span class="btn-icon">📄</span> Generate PDF';
        }
    }

    /**
     * Initialize the UI
     */
    async initialize() {
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
