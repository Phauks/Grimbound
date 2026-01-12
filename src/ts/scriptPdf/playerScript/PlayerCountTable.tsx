/**
 * PlayerCountTable Component
 *
 * Displays the standard Blood on the Clocktower player count breakdown table.
 * Shows team composition for 5-15+ players.
 */

import styles from '@/styles/components/script/PlayerScriptBacking.module.css';
import { PLAYER_COUNT_TABLE, TEAM_COLORS } from '../constants.js';

export interface PlayerCountTableProps {
  /** Optional custom class name */
  className?: string;
}

/**
 * Player count breakdown table showing team composition by player count
 */
export function PlayerCountTable({ className }: PlayerCountTableProps): React.ReactElement {
  return (
    <div className={`${styles.playerCountTable} ${className || ''}`}>
      <table className={styles.countTable}>
        <thead>
          <tr>
            <th className={styles.countHeader}>Players</th>
            {PLAYER_COUNT_TABLE.map((entry) => (
              <th key={String(entry.players)} className={styles.countCell}>
                {entry.players}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Townsfolk Row */}
          <tr>
            <td className={styles.countLabel} style={{ color: TEAM_COLORS.townsfolk }}>
              Townsfolk
            </td>
            {PLAYER_COUNT_TABLE.map((entry) => (
              <td key={`townsfolk-${entry.players}`} className={styles.countCell}>
                {entry.townsfolk}
              </td>
            ))}
          </tr>

          {/* Outsiders Row */}
          <tr>
            <td className={styles.countLabel} style={{ color: TEAM_COLORS.outsider }}>
              Outsiders
            </td>
            {PLAYER_COUNT_TABLE.map((entry) => (
              <td key={`outsiders-${entry.players}`} className={styles.countCell}>
                {entry.outsiders}
              </td>
            ))}
          </tr>

          {/* Minions Row */}
          <tr>
            <td className={styles.countLabel} style={{ color: TEAM_COLORS.minion }}>
              Minions
            </td>
            {PLAYER_COUNT_TABLE.map((entry) => (
              <td key={`minions-${entry.players}`} className={styles.countCell}>
                {entry.minions}
              </td>
            ))}
          </tr>

          {/* Demons Row */}
          <tr>
            <td className={styles.countLabel} style={{ color: TEAM_COLORS.demon }}>
              Demons
            </td>
            {PLAYER_COUNT_TABLE.map((entry) => (
              <td key={`demons-${entry.players}`} className={styles.countCell}>
                {entry.demons}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
