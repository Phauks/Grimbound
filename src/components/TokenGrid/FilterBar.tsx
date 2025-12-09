import { useTokenContext } from '../../contexts/TokenContext'
import { useFilters } from '../../hooks/useFilters'
import styles from '../../styles/components/tokens/FilterBar.module.css'

const TEAMS = [
  { value: 'townsfolk', label: 'Townsfolk', color: '#1e90ff' },
  { value: 'outsider', label: 'Outsiders', color: '#46b3e6' },
  { value: 'minion', label: 'Minions', color: '#ff6b35' },
  { value: 'demon', label: 'Demons', color: '#dc143c' },
  { value: 'traveller', label: 'Travellers', color: '#9370db' },
  { value: 'fabled', label: 'Fabled', color: '#ffd700' },
  { value: 'loric', label: 'Loric', color: '#2e8b57' },
]

const TOKEN_TYPES = [
  { value: 'character', label: 'Characters' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'meta', label: 'Meta' },
]

const REMINDERS_OPTIONS = [
  { value: 'has', label: 'Has Reminders' },
  { value: 'none', label: 'No Reminders' },
]

const ORIGIN_OPTIONS = [
  { value: 'official', label: 'Official' },
  { value: 'custom', label: 'Custom' },
]

export function FilterBar() {
  const { filters, updateFilters } = useTokenContext()
  const { toggleTeam, toggleTokenType, toggleReminders, toggleOrigin } = useFilters()

  const clearTeams = () => updateFilters({ teams: [] })
  const clearTokenTypes = () => updateFilters({ tokenTypes: [] })
  const clearReminders = () => updateFilters({ reminders: [] })
  const clearOrigin = () => updateFilters({ origin: [] })

  return (
    <div className={styles.container}>
      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>Team:</span>
        <div className={styles.chipGroup}>
          {TEAMS.map(({ value, label, color }) => (
            <button
              key={value}
              className={`${styles.chip} ${filters.teams.includes(value) ? styles.chipActive : ''}`}
              onClick={() => toggleTeam(value)}
              style={filters.teams.includes(value) ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.teams.length > 0 && (
          <button className={styles.clearBtn} onClick={clearTeams} title="Clear team filter">✕</button>
        )}
      </div>

      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>Type:</span>
        <div className={styles.chipGroup}>
          {TOKEN_TYPES.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.chip} ${filters.tokenTypes.includes(value) ? styles.chipActive : ''}`}
              onClick={() => toggleTokenType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.tokenTypes.length > 0 && (
          <button className={styles.clearBtn} onClick={clearTokenTypes} title="Clear type filter">✕</button>
        )}
      </div>

      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>Reminders:</span>
        <div className={styles.chipGroup}>
          {REMINDERS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.chip} ${filters.reminders.includes(value) ? styles.chipActive : ''}`}
              onClick={() => toggleReminders(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.reminders.length > 0 && (
          <button className={styles.clearBtn} onClick={clearReminders} title="Clear reminders filter">✕</button>
        )}
      </div>

      <div className={styles.filterSection}>
        <span className={styles.filterLabel}>Origin:</span>
        <div className={styles.chipGroup}>
          {ORIGIN_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.chip} ${filters.origin.includes(value) ? styles.chipActive : ''}`}
              onClick={() => toggleOrigin(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.origin.length > 0 && (
          <button className={styles.clearBtn} onClick={clearOrigin} title="Clear origin filter">✕</button>
        )}
      </div>
    </div>
  )
}
