import { useTokenContext } from '../../../../contexts/TokenContext'
import { calculateTokenCounts } from '../../../../ts/data/characterUtils'
import { TEAM_LABELS } from '../../../../ts/config'
import type { Team } from '../../../../ts/types/index'
import styles from '../../../../styles/components/tokens/TokenStats.module.css'

export function TokenStats() {
  const { characters, tokens } = useTokenContext()

  // Don't show stats if no characters
  if (characters.length === 0) {
    return null
  }

  const counts = calculateTokenCounts(characters)

  // Count meta tokens from the actual generated tokens
  const metaTokenCount = tokens.filter(
    (t) => t.type === 'script-name' || t.type === 'almanac' || t.type === 'pandemonium' || t.type === 'bootlegger'
  ).length

  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.townsfolk}:</span>
        <span className={styles.value}>{counts.townsfolk.characters} / {counts.townsfolk.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.outsider}:</span>
        <span className={styles.value}>{counts.outsider.characters} / {counts.outsider.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.minion}:</span>
        <span className={styles.value}>{counts.minion.characters} / {counts.minion.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.demon}:</span>
        <span className={styles.value}>{counts.demon.characters} / {counts.demon.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.traveller}:</span>
        <span className={styles.value}>{counts.traveller.characters} / {counts.traveller.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.fabled}:</span>
        <span className={styles.value}>{counts.fabled.characters} / {counts.fabled.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.loric}:</span>
        <span className={styles.value}>{counts.loric.characters} / {counts.loric.reminders}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>{TEAM_LABELS.meta}:</span>
        <span className={styles.value}>{metaTokenCount} / 0</span>
      </div>
      <div className={`${styles.item} ${styles.total}`}>
        <span className={styles.label}>Total:</span>
        <span className={styles.value}>{counts.total.characters + metaTokenCount} / {counts.total.reminders}</span>
      </div>
    </div>
  )
}
