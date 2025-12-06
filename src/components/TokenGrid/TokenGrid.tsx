import { useMemo } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { TokenCard } from './TokenCard'
import { groupTokensByIdentity } from '../../ts/utils/tokenGrouping'
import type { Token } from '../../ts/types/index.js'
import styles from '../../styles/components/tokens/TokenGrid.module.css'

interface TokenGridProps {
  onTokenClick: (token: Token) => void
}

export function TokenGrid({ onTokenClick }: TokenGridProps) {
  const { filteredTokens, isLoading, error, tokens } = useTokenContext()

  const characterTokens = filteredTokens.filter((t) => t.type === 'character')
  const metaTokens = filteredTokens.filter((t) => t.type !== 'character' && t.type !== 'reminder')

  // Sort reminder tokens by the order of their parent character
  const reminderTokens = useMemo(() => {
    const reminders = filteredTokens.filter((t) => t.type === 'reminder')
    
    // Create a map of character name to their order (based on characterTokens order)
    const characterOrder = new Map<string, number>()
    characterTokens.forEach((char, index) => {
      characterOrder.set(char.name, index)
    })
    
    // Sort reminders by parent character order, then by reminder text
    return [...reminders].sort((a, b) => {
      const orderA = characterOrder.get(a.parentCharacter || '') ?? 999
      const orderB = characterOrder.get(b.parentCharacter || '') ?? 999
      if (orderA !== orderB) return orderA - orderB
      // If same character, sort by reminder text
      return (a.reminderText || '').localeCompare(b.reminderText || '')
    })
  }, [filteredTokens, characterTokens])

  // Group tokens by identity to show count badges for duplicates
  const groupedCharacterTokens = useMemo(() => 
    groupTokensByIdentity(characterTokens), [characterTokens])
  const groupedReminderTokens = useMemo(() => 
    groupTokensByIdentity(reminderTokens), [reminderTokens])
  const groupedMetaTokens = useMemo(() => 
    groupTokensByIdentity(metaTokens), [metaTokens])

  if (tokens.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No tokens generated yet. Upload or paste a JSON script to get started.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Generating tokens...</p>
      </div>
    )
  }

  if (error) {
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
                    onCardClick={onTokenClick} 
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
                    onCardClick={onTokenClick} 
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
                    onCardClick={onTokenClick} 
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {filteredTokens.length === 0 && (
          <div className={styles.emptyState}>
            <p>No tokens match the current filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
