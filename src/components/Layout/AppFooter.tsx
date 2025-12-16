import styles from '../../styles/components/layout/Footer.module.css';

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p>Blood on the Clocktower Token Generator © {currentYear}</p>
    </footer>
  );
}
