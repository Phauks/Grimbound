import styles from '@/styles/components/layout/Footer.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <p>
        Blood on the Clocktower is created by Steven Medway and published by The Pandemonium
        Institute. Grimbound is a fan-made tool meant to support storytellers and conforms with the{' '}
        <a
          href="https://bloodontheclocktower.com/pages/community-created-content-policy"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Community Created Content Policy
        </a>
        .
      </p>
    </footer>
  );
}
