/**
 * Town Square Page
 *
 * Placeholder page for future community features including
 * sharing projects, downloading assets, and collaborating
 * on custom character designs.
 */

import styles from '../../styles/components/pages/Pages.module.css'

export function TownSquarePage() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageContent}>
        <div className={styles.placeholderPage}>
          <div className={styles.placeholderIcon}>🏛️</div>
          <h1 className={styles.placeholderTitle}>Town Square</h1>
          <p className={styles.placeholderDescription}>
            The Town Square will be your hub for sharing and discovering community-created
            content for Blood on the Clocktower.
          </p>
          <div className={styles.placeholderFeatures}>
            <h2>Planned Features:</h2>
            <ul>
              <li>Share your custom character tokens with the community</li>
              <li>Browse and download community-created assets</li>
              <li>Discover unique script collections</li>
              <li>Collaborate on custom character designs</li>
              <li>Rate and review community contributions</li>
            </ul>
          </div>
          <p className={styles.placeholderNote}>
            This feature is coming soon. Stay tuned for updates!
          </p>
        </div>
      </div>
    </div>
  )
}
