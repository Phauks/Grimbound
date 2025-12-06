import { useState, useEffect, useRef, useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useTokenGenerator } from '../../hooks/useTokenGenerator'
import { TokenGenerator } from '../../ts/generation/tokenGenerator.js'
import { calculateTokenCounts } from '../../ts/data/characterUtils'
import type { Character } from '../../ts/types/index.js'
import type { TokenGeneratorOptions } from '../../ts/types/tokenOptions.js'
import styles from '../../styles/components/tokens/TokenPreviewRow.module.css'

// Sample character for preview when no script is loaded
const SAMPLE_CHARACTER: Character = {
  id: '_preview_sample',
  name: 'Washerwoman',
  team: 'townsfolk',
  ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  image: '',
  reminders: ['Townsfolk', 'Wrong'],
  setup: false
}

// Cache preview canvases outside component to persist across tab switches
interface PreviewCache {
  charCanvas: HTMLCanvasElement | null
  reminderCanvas: HTMLCanvasElement | null
  metaCanvas: HTMLCanvasElement | null
  optionsHash: string
  sampleCharId: string
}

let previewCache: PreviewCache | null = null

// Simple hash of options to detect changes
function hashOptions(options: object, charId: string): string {
  return JSON.stringify({ ...options, charId })
}

export function TokenPreviewRow() {
  const { characters, tokens, generationOptions, isLoading } = useTokenContext()
  const { generateTokens } = useTokenGenerator()
  
  const [previewCharCanvas, setPreviewCharCanvas] = useState<HTMLCanvasElement | null>(previewCache?.charCanvas ?? null)
  const [previewReminderCanvas, setPreviewReminderCanvas] = useState<HTMLCanvasElement | null>(previewCache?.reminderCanvas ?? null)
  const [previewMetaCanvas, setPreviewMetaCanvas] = useState<HTMLCanvasElement | null>(previewCache?.metaCanvas ?? null)
  const [autoRegenerate, setAutoRegenerate] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  
  const optionsRef = useRef(generationOptions)

  // Get sample character (prioritize one with reminders)
  const sampleCharacter = (() => {
    if (characters.length === 0) return SAMPLE_CHARACTER

    // Try to find a character with reminders
    const charWithReminders = characters.find(char =>
      char.reminders && char.reminders.length > 0
    )

    // Use character with reminders if found, otherwise use first character
    return charWithReminders || characters[0]
  })()

  // Generate preview tokens
  const generatePreview = useCallback(async () => {
    // Check if we have valid cached previews for current options
    const currentHash = hashOptions(generationOptions, sampleCharacter.id)
    if (previewCache && previewCache.optionsHash === currentHash) {
      // Use cached canvases
      setPreviewCharCanvas(previewCache.charCanvas)
      setPreviewReminderCanvas(previewCache.reminderCanvas)
      setPreviewMetaCanvas(previewCache.metaCanvas)
      return
    }

    setIsGeneratingPreview(true)
    try {
      const generator = new TokenGenerator(generationOptions)
      
      const charCanvas = await generator.generateCharacterToken(sampleCharacter)
      setPreviewCharCanvas(charCanvas)
      
      let reminderCanvas: HTMLCanvasElement | null = null
      if (sampleCharacter.reminders && sampleCharacter.reminders.length > 0) {
        reminderCanvas = await generator.generateReminderToken(
          sampleCharacter,
          sampleCharacter.reminders[0]
        )
        setPreviewReminderCanvas(reminderCanvas)
      } else {
        setPreviewReminderCanvas(null)
      }

      // Generate meta token (Script Name preview)
      const metaCanvas = await generator.generateScriptNameToken('Script Name', 'Author')
      setPreviewMetaCanvas(metaCanvas)

      // Update cache
      previewCache = {
        charCanvas,
        reminderCanvas,
        metaCanvas,
        optionsHash: currentHash,
        sampleCharId: sampleCharacter.id
      }
    } catch (error) {
      console.error('Failed to generate preview:', error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }, [generationOptions, sampleCharacter])

  // Generate preview on mount and when options change
  useEffect(() => {
    generatePreview()
  }, [generatePreview])

  // Auto-regenerate all tokens when options change (if enabled)
  useEffect(() => {
    // Skip initial render
    if (optionsRef.current === generationOptions) return
    optionsRef.current = generationOptions
    
    if (autoRegenerate && characters.length > 0 && !isLoading) {
      generateTokens()
    }
  }, [generationOptions, autoRegenerate, characters.length, isLoading, generateTokens])

  // Handle apply to all tokens
  const handleApplyToAll = () => {
    if (characters.length > 0) {
      generateTokens()
    }
  }

  // Calculate token counts
  const counts = calculateTokenCounts(characters)
  const metaTokenCount = tokens.filter(
    (t) => t.type === 'script-name' || t.type === 'almanac' || t.type === 'pandemonium'
  ).length
  // Don't include meta tokens in total character count
  const totalCharacters = counts.total.characters
  const totalReminders = counts.total.reminders

  // Team breakdown data (excluding meta from the list - shown separately)
  const teamBreakdown = [
    { label: 'Townsfolk', chars: counts.townsfolk.characters, reminders: counts.townsfolk.reminders },
    { label: 'Outsider', chars: counts.outsider.characters, reminders: counts.outsider.reminders },
    { label: 'Minion', chars: counts.minion.characters, reminders: counts.minion.reminders },
    { label: 'Demon', chars: counts.demon.characters, reminders: counts.demon.reminders },
    { label: 'Traveller', chars: counts.traveller.characters, reminders: counts.traveller.reminders },
    { label: 'Fabled', chars: counts.fabled.characters, reminders: counts.fabled.reminders },
    { label: 'Loric', chars: counts.loric?.characters ?? 0, reminders: counts.loric?.reminders ?? 0 },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.previewSection}>
        <div className={styles.tokenColumn}>
          <div className={styles.tokenPreview}>
            <div className={styles.tokenWrapper}>
              {previewCharCanvas ? (
                <img 
                  src={previewCharCanvas.toDataURL('image/png')} 
                  alt="Character token preview"
                  className={styles.tokenImage}
                />
              ) : (
                <div className={styles.tokenPlaceholder}>
                  {isGeneratingPreview ? '...' : 'No preview'}
                </div>
              )}
              <span className={styles.tokenLabel}>Character</span>
            </div>
            
            <div className={styles.tokenWrapper}>
              {previewReminderCanvas ? (
                <img 
                  src={previewReminderCanvas.toDataURL('image/png')} 
                  alt="Reminder token preview"
                  className={`${styles.tokenImage} ${styles.reminderImage}`}
                />
              ) : (
                <div className={`${styles.tokenPlaceholder} ${styles.reminderPlaceholder}`}>
                  {isGeneratingPreview ? '...' : 'No reminder'}
                </div>
              )}
              <span className={styles.tokenLabel}>Reminder</span>
            </div>

            <div className={styles.tokenWrapper}>
              {previewMetaCanvas ? (
                <img 
                  src={previewMetaCanvas.toDataURL('image/png')} 
                  alt="Meta token preview"
                  className={styles.tokenImage}
                />
              ) : (
                <div className={styles.tokenPlaceholder}>
                  {isGeneratingPreview ? '...' : 'No meta'}
                </div>
              )}
              <span className={styles.tokenLabel}>Meta</span>
            </div>
          </div>

          <div className={styles.actionsRow}>
            <div className={styles.generateGroup}>
              <button
                className={styles.generateBtn}
                onClick={handleApplyToAll}
                disabled={isLoading || characters.length === 0}
                title="Generate all tokens with current options"
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
              <button
                className={`${styles.autoBtn} ${autoRegenerate ? styles.autoBtnActive : ''}`}
                onClick={() => setAutoRegenerate(!autoRegenerate)}
                title={autoRegenerate ? 'Auto-regenerate enabled' : 'Enable auto-regenerate'}
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.totalsRow}>
            <div className={styles.totalItem}>
              <span className={styles.totalValue}>{totalCharacters}</span>
              <span className={styles.totalLabel}>Characters</span>
            </div>
            <span className={styles.totalDivider}>/</span>
            <div className={styles.totalItem}>
              <span className={styles.totalValue}>{totalReminders}</span>
              <span className={styles.totalLabel}>Reminders</span>
            </div>
            <span className={styles.totalDivider}>/</span>
            <div className={styles.totalItem}>
              <span className={`${styles.totalValue} ${styles.metaValue}`}>{metaTokenCount}</span>
              <span className={styles.totalLabel}>Meta</span>
            </div>
          </div>

          <div className={styles.teamBreakdown}>
            {teamBreakdown.map(({ label, chars, reminders }) => (
              <div key={label} className={styles.teamRow}>
                <span className={styles.teamLabel}>{label}:</span>
                <span className={styles.teamValue}>{chars} / {reminders}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
