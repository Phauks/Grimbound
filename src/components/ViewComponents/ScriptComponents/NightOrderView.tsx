/**
 * Night Order View Component
 *
 * Main container for the Night Order feature.
 * Uses sidebar layout with print preview showing realistic 8.5" x 11" pages.
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useNightOrder } from '../../../contexts/NightOrderContext'
import { useTokenContext } from '../../../contexts/TokenContext'
import { useDownloadsContext, type DownloadItem } from '../../../contexts/DownloadsContext'
import { ViewLayout } from '../../Layout/ViewLayout'
import { NightSheet } from './NightSheet'
import {
    downloadNightOrderPdf,
    type ExportPhase,
} from '../../../ts/nightOrder/nightOrderPdfLib.js'
import { OptionGroup } from '../../Shared/UI/OptionGroup'
import type { ScriptSubTab } from './ScriptTabNavigation'
import styles from '../../../styles/components/script/NightOrderView.module.css'
import layoutStyles from '../../../styles/components/layout/ViewLayout.module.css'
import viewStyles from '../../../styles/components/views/Views.module.css'

/**
 * Background customization options
 */
export interface NightSheetBackground {
    /** Base parchment color (hex) */
    baseColor: string
    /** Whether to show paper texture */
    showTexture: boolean
    /** Texture opacity (0-1) */
    textureOpacity: number
}

/** Default background settings */
const DEFAULT_BACKGROUND: NightSheetBackground = {
    baseColor: '#ffffff',
    showTexture: true,
    textureOpacity: 0.06,
}

/** Preset background options */
const BACKGROUND_PRESETS = [
    { name: 'Parchment', color: '#f4edd9' },
    { name: 'Cream', color: '#fffef5' },
    { name: 'Antique', color: '#ebe4d4' },
    { name: 'White', color: '#ffffff' },
    { name: 'Sepia', color: '#f5e6c8' },
] as const

interface NightOrderViewProps {
    /** Enable drag-and-drop reordering */
    enableDragDrop?: boolean
    /** Active sub-tab */
    activeTab: ScriptSubTab
    /** Callback when tab changes */
    onTabChange: (tab: ScriptSubTab) => void
    /** Callback when "Edit Character" is selected from context menu */
    onEditCharacter?: (characterId: string) => void
}

export function NightOrderView({ enableDragDrop = true, activeTab, onTabChange, onEditCharacter }: NightOrderViewProps) {
    const { characters, scriptMeta, generationOptions } = useTokenContext()
    const { setDownloads, clearDownloads } = useDownloadsContext()
    const {
        firstNight,
        otherNight,
        scriptMeta: nightOrderMeta,
        isLoading,
        error,
        initializeFromScript,
        moveEntry,
    } = useNightOrder()

    // Generation state
    const [generateNightOrder, setGenerateNightOrder] = useState(true)

    // Background customization state
    const [background, setBackground] = useState<NightSheetBackground>(DEFAULT_BACKGROUND)

    // Refs for PDF export (capture DOM elements)
    const firstNightRef = useRef<HTMLDivElement>(null)
    const otherNightRef = useRef<HTMLDivElement>(null)

    // Initialize night order when characters change and generation is enabled
    useEffect(() => {
        if (generateNightOrder && characters.length > 0) {
            const scriptData = scriptMeta
                ? [scriptMeta, ...characters]
                : characters
            initializeFromScript(scriptData)
        }
    }, [generateNightOrder, characters, scriptMeta, initializeFromScript])

    // Use night order's script meta if available
    const displayMeta = nightOrderMeta || scriptMeta

    // Move handlers
    const handleMoveFirstNight = useCallback((entryId: string, newIndex: number) => {
        moveEntry('first', entryId, newIndex)
    }, [moveEntry])

    const handleMoveOtherNight = useCallback((entryId: string, newIndex: number) => {
        moveEntry('other', entryId, newIndex)
    }, [moveEntry])

    // PDF export state
    const [isExporting, setIsExporting] = useState(false)
    const [exportPhase, setExportPhase] = useState<ExportPhase | null>(null)
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
    const abortControllerRef = useRef<AbortController | null>(null)

    // Get export phase display text
    const getExportPhaseText = (phase: ExportPhase | null): string => {
        switch (phase) {
            case 'initializing': return 'Initializing...'
            case 'loading-fonts': return 'Loading fonts...'
            case 'loading-images': return `Loading images (${exportProgress.current}/${exportProgress.total})...`
            case 'rendering-first': return 'Rendering First Night...'
            case 'rendering-other': return 'Rendering Other Nights...'
            case 'saving': return 'Saving PDF...'
            default: return 'Exporting...'
        }
    }

    const handleCancelExport = useCallback(() => {
        abortControllerRef.current?.abort()
    }, [])

    const handleExportPDF = useCallback(async () => {
        if (isExporting) return

        setIsExporting(true)
        setExportPhase('initializing')
        setExportProgress({ current: 0, total: 0 })

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController()

        try {
            const filename = displayMeta?.name
                ? `${displayMeta.name.replace(/[^a-zA-Z0-9]/g, '_')}_night_order.pdf`
                : 'night_order.pdf'

            // Use new pdf-lib exporter (fast, native OTF support)
            await downloadNightOrderPdf(
                firstNight,
                otherNight,
                displayMeta || null,
                filename,
                {
                    includeFirstNight: true,
                    includeOtherNight: true,
                    showScriptName: true,
                    onProgress: (phase, current, total) => {
                        setExportPhase(phase)
                        setExportProgress({ current, total })
                    },
                    signal: abortControllerRef.current.signal,
                }
            )
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.log('PDF export cancelled')
            } else {
                console.error('PDF export failed:', err)
                alert('Failed to export PDF. Please try again.')
            }
        } finally {
            setIsExporting(false)
            setExportPhase(null)
            abortControllerRef.current = null
        }
    }, [displayMeta, isExporting, firstNight, otherNight])

    // Register downloads for this view
    useEffect(() => {
        const hasNoData = firstNight.entries.length === 0 && otherNight.entries.length === 0

        const downloads: DownloadItem[] = [
            {
                id: 'night-order-pdf',
                icon: '📄',
                label: 'Night Order PDF',
                description: displayMeta?.name
                    ? `${displayMeta.name} night sheets`
                    : 'First & Other nights',
                action: handleExportPDF,
                disabled: hasNoData || !generateNightOrder || isExporting,
                disabledReason: isExporting
                    ? 'Export in progress...'
                    : hasNoData
                        ? 'Load a script first'
                        : 'Enable night order generation',
            },
        ]

        setDownloads(downloads)
        return () => clearDownloads()
    }, [
        firstNight.entries.length,
        otherNight.entries.length,
        displayMeta,
        generateNightOrder,
        isExporting,
        handleExportPDF,
        setDownloads,
        clearDownloads,
    ])

    // Background handlers
    const handleColorPreset = (color: string) => {
        setBackground(prev => ({ ...prev, baseColor: color }))
    }

    const handleCustomColor = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBackground(prev => ({ ...prev, baseColor: e.target.value }))
    }

    const handleTextureToggle = () => {
        setBackground(prev => ({ ...prev, showTexture: !prev.showTexture }))
    }

    const handleTextureOpacity = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBackground(prev => ({ ...prev, textureOpacity: parseFloat(e.target.value) }))
    }

    // Loading state
    if (isLoading) {
        return (
            <ViewLayout variant="2-panel">
                <ViewLayout.Panel position="left" width="left" scrollable>
                    <div className={styles.sidebarContent}>
                        <div className={styles.loadingState}>
                            <div className={styles.spinner} />
                            <p>Building night order...</p>
                        </div>
                    </div>
                </ViewLayout.Panel>
                <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea} />
            </ViewLayout>
        )
    }

    // Error state
    if (error) {
        return (
            <ViewLayout variant="2-panel">
                <ViewLayout.Panel position="left" width="left" scrollable>
                    <div className={styles.sidebarContent}>
                        <div className={styles.errorState}>
                            <div className={styles.errorIcon}>⚠️</div>
                            <p className={styles.errorMessage}>{error}</p>
                        </div>
                    </div>
                </ViewLayout.Panel>
                <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea} />
            </ViewLayout>
        )
    }

    const hasNoData = firstNight.entries.length === 0 && otherNight.entries.length === 0

    return (
        <ViewLayout variant="2-panel">
            {/* Sidebar */}
            <ViewLayout.Panel position="left" width="left" scrollable>
                <div className={layoutStyles.panelContent}>
                    {/* Generation Options */}
                    <details className={layoutStyles.sidebarCard} open>
                        <summary className={layoutStyles.sectionHeader}>Options</summary>
                        <div className={layoutStyles.optionSection}>
                            <OptionGroup label="Generate Night Order" description="Create night order sheets from script">
                                <input
                                    type="checkbox"
                                    className={viewStyles.toggleSwitch}
                                    checked={generateNightOrder}
                                    onChange={(e) => setGenerateNightOrder(e.target.checked)}
                                />
                            </OptionGroup>
                        </div>
                    </details>

                    {/* Background Settings */}
                    <details className={layoutStyles.sidebarCard} open>
                        <summary className={layoutStyles.sectionHeader}>Background</summary>
                        <div className={layoutStyles.optionSection}>
                            {/* Color Presets */}
                            <div className={styles.settingGroup}>
                                <label className={styles.settingLabel}>Color Preset</label>
                                <div className={styles.colorPresets}>
                                    {BACKGROUND_PRESETS.map(preset => (
                                        <button
                                            key={preset.name}
                                            className={`${styles.colorPreset} ${background.baseColor === preset.color ? styles.active : ''}`}
                                            style={{ backgroundColor: preset.color }}
                                            onClick={() => handleColorPreset(preset.color)}
                                            title={preset.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Custom Color */}
                            <div className={styles.settingGroup}>
                                <label className={styles.settingLabel}>Custom Color</label>
                                <div className={styles.colorPickerRow}>
                                    <input
                                        type="color"
                                        value={background.baseColor}
                                        onChange={handleCustomColor}
                                        className={styles.colorPicker}
                                    />
                                    <input
                                        type="text"
                                        value={background.baseColor}
                                        onChange={handleCustomColor}
                                        className={styles.colorInput}
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            {/* Texture Toggle */}
                            <div className={styles.settingGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={background.showTexture}
                                        onChange={handleTextureToggle}
                                        className={styles.checkbox}
                                    />
                                    Show paper texture
                                </label>
                            </div>

                            {/* Texture Opacity */}
                            {background.showTexture && (
                                <div className={styles.settingGroup}>
                                    <label className={styles.settingLabel}>
                                        Texture Intensity
                                    </label>
                                    <input
                                        type="range"
                                        min="0.01"
                                        max="0.15"
                                        step="0.01"
                                        value={background.textureOpacity}
                                        onChange={handleTextureOpacity}
                                        className={styles.rangeSlider}
                                    />
                                </div>
                            )}
                        </div>
                    </details>

                    {/* Info Section */}
                    {generateNightOrder && (
                        <details className={layoutStyles.sidebarCard}>
                            <summary className={layoutStyles.sectionHeader}>Info</summary>
                            <div className={layoutStyles.optionSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Order Source</span>
                                    <span className={styles.infoValue}>
                                        {firstNight.source === 'meta' ? 'Script defined' : 'Character data'}
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>First Night</span>
                                    <span className={styles.infoValue}>
                                        {firstNight.entries.length} entries
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Other Nights</span>
                                    <span className={styles.infoValue}>
                                        {otherNight.entries.length} entries
                                    </span>
                                </div>
                            </div>
                        </details>
                    )}
                </div>
            </ViewLayout.Panel>

            {/* Print Preview Area */}
            <ViewLayout.Panel position="right" width="flex" scrollable className={styles.previewArea}>
                {!generateNightOrder ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🌙</div>
                        <h3>Night Order Generation Disabled</h3>
                        <p>Enable "Generate Night Order" in the Options section to view night order sheets.</p>
                    </div>
                ) : hasNoData ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>🌙</div>
                        <h3>No Night Order Available</h3>
                        <p>Load a script in the Editor tab to view the night order.</p>
                        <p className={styles.hint}>
                            The night order shows when each character wakes during the night phase.
                        </p>
                    </div>
                ) : (
                    <div className={styles.sheetsContainer}>
                        {/* First Night Page */}
                        <div className={styles.pageWrapper}>
                            <div className={styles.page}>
                                <NightSheet
                                    ref={firstNightRef}
                                    type="first"
                                    entries={firstNight.entries}
                                    scriptMeta={displayMeta}
                                    enableDragDrop={enableDragDrop}
                                    onMoveEntry={handleMoveFirstNight}
                                    background={background}
                                    onEditCharacter={onEditCharacter}
                                />
                            </div>
                        </div>

                        {/* Other Nights Page */}
                        <div className={styles.pageWrapper}>
                            <div className={styles.page}>
                                <NightSheet
                                    ref={otherNightRef}
                                    type="other"
                                    entries={otherNight.entries}
                                    scriptMeta={displayMeta}
                                    enableDragDrop={enableDragDrop}
                                    onMoveEntry={handleMoveOtherNight}
                                    background={background}
                                    onEditCharacter={onEditCharacter}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </ViewLayout.Panel>
        </ViewLayout>
    )
}
