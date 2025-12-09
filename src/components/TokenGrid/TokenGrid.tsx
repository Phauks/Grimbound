import { useMemo, useCallback, useState } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { TokenCard } from './TokenCard'
import { ConfirmModal } from '../Presets/ConfirmModal'
import { groupTokensByIdentity } from '../../ts/utils/tokenGrouping'
import type { Token, Character } from '../../ts/types/index.js'
import styles from '../../styles/components/tokens/TokenGrid.module.css'

interface TokenGridProps {
  /** Optional tokens array - when provided, uses these instead of context */
  tokens?: Token[]
  /** When true, hides editing controls (context menu, delete, set as example) */
  readOnly?: boolean
  /** Click handler for tokens - required when not readOnly */
  onTokenClick?: (token: Token) => void
}

export function TokenGrid({ tokens: propTokens, readOnly = false, onTokenClick }: TokenGridProps) {
  const { 
    filteredTokens: contextFilteredTokens, 
    isLoading, 
    error, 
    tokens: contextTokens, 
    setTokens, 
    characters, 
    setCharacters, 
    setExampleToken, 
    updateGenerationOptions 
  } = useTokenContext()
  
  // Use prop tokens if provided, otherwise use context
  const displayTokens = propTokens ?? contextFilteredTokens
  const allTokens = propTokens ?? contextTokens
  
  const [tokenToDelete, setTokenToDelete] = useState<Token | null>(null)

  const handleSetAsExample = useCallback((token: Token) => {
    setExampleToken(token)
  }, [setExampleToken])

  const handleDeleteRequest = useCallback((token: Token) => {
    // Meta tokens can be deleted immediately without confirmation
    if (token.type === 'script-name' || token.type === 'almanac' || token.type === 'pandemonium') {
      // Disable the corresponding option
      if (token.type === 'script-name') {
        updateGenerationOptions({ scriptNameToken: false })
      } else if (token.type === 'almanac') {
        updateGenerationOptions({ almanacToken: false })
      } else if (token.type === 'pandemonium') {
        updateGenerationOptions({ pandemoniumToken: false })
      }
      
      // Delete the token immediately
      setTokens(allTokens.filter((t: Token) => t.filename !== token.filename))
    } else {
      // For character and reminder tokens, show confirmation modal
      setTokenToDelete(token)
    }
  }, [allTokens, setTokens, updateGenerationOptions])

  const confirmDelete = useCallback(() => {
    if (tokenToDelete) {
      // Delete tokens
      if (tokenToDelete.type === 'character') {
        // If deleting a character, also delete its reminder tokens
        setTokens(allTokens.filter((t: Token) => 
          t.filename !== tokenToDelete.filename && 
          !(t.type === 'reminder' && t.parentCharacter === tokenToDelete.name)
        ))
        
        // Remove from characters array
        setCharacters(characters.filter((c: Character) => c.name !== tokenToDelete.name))
      } else {
        // Otherwise just delete the specific token
        setTokens(allTokens.filter((t: Token) => t.filename !== tokenToDelete.filename))
      }
      
      setTokenToDelete(null)
    }
  }, [tokenToDelete, allTokens, setTokens, setCharacters, characters])

  const cancelDelete = useCallback(() => {
    setTokenToDelete(null)
  }, [])

  // Sort character tokens by their original order from JSON
  const characterTokens = useMemo(() => {
    const chars = displayTokens.filter((t) => t.type === 'character')
    return [...chars].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }, [displayTokens])

  const metaTokens = displayTokens.filter((t) => t.type !== 'character' && t.type !== 'reminder')

  // Sort reminder tokens by the order of their parent character, then by reminder text
  const reminderTokens = useMemo(() => {
    const reminders = displayTokens.filter((t) => t.type === 'reminder')
    
    return [...reminders].sort((a, b) => {
      const orderA = a.order ?? 999
      const orderB = b.order ?? 999
      if (orderA !== orderB) return orderA - orderB
      // If same character, sort by reminder text
      return (a.reminderText || '').localeCompare(b.reminderText || '')
    })
  }, [displayTokens])

  // Group tokens by identity to show count badges for duplicates
  const groupedCharacterTokens = useMemo(() => 
    groupTokensByIdentity(characterTokens), [characterTokens])
  const groupedReminderTokens = useMemo(() => 
    groupTokensByIdentity(reminderTokens), [reminderTokens])
  const groupedMetaTokens = useMemo(() => 
    groupTokensByIdentity(metaTokens), [metaTokens])

  // For readOnly mode with prop tokens, skip loading/error states
  if (!propTokens && allTokens.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No tokens generated yet. Upload or paste a JSON script to get started.</p>
      </div>
    )
  }

  if (!propTokens && isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Generating tokens...</p>
      </div>
    )
  }

  if (!propTokens && error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>Error: {error}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.tokenContainer}>
        {groupedCharacterTokens.length > 0 && (
          <div className={styles.section}>
            <details open className={styles.collapsible}>
              <summary className={styles.sectionHeader}>Character Tokens</summary>
              <div id="characterTokenGrid" className={styles.grid}>
                {groupedCharacterTokens.map((group) => (
                  <TokenCard 
                    key={group.token.filename} 
                    token={group.token} 
                    count={group.count}
                    variants={group.variants}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : handleDeleteRequest}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {groupedReminderTokens.length > 0 && (
          <div className={styles.section}>
            <details open className={styles.collapsible}>
              <summary className={styles.sectionHeader}>Reminder Tokens</summary>
              <div id="reminderTokenGrid" className={`${styles.grid} ${styles.gridReminders}`}>
                {groupedReminderTokens.map((group) => (
                  <TokenCard 
                    key={group.token.filename} 
                    token={group.token} 
                    count={group.count}
                    variants={group.variants}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : handleDeleteRequest}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {groupedMetaTokens.length > 0 && (
          <div className={styles.section}>
            <details open className={styles.collapsible}>
              <summary className={styles.sectionHeader}>Meta Tokens</summary>
              <div id="metaTokenGrid" className={styles.grid}>
                {groupedMetaTokens.map((group) => (
                  <TokenCard 
                    key={group.token.filename} 
                    token={group.token} 
                    count={group.count}
                    variants={group.variants}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : handleDeleteRequest}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {displayTokens.length === 0 && (
          <div className={styles.emptyState}>
            <p>No tokens match the current filters.</p>
          </div>
        )}
      </div>

      {!readOnly && (
        <ConfirmModal
          isOpen={tokenToDelete !== null}
          title="Delete Token"
          message={`Are you sure you want to delete the token "${tokenToDelete?.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  )
}
