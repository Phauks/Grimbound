/**
 * Info Modal
 *
 * Displays information about the application.
 * Migrated to use unified Modal component.
 */

import { Modal } from '../Shared/ModalBase/Modal';
import styles from './InfoModal.module.css';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About this Tool" size="small">
      <p className={styles.description}>
        Blood on the Clocktower Token Generator is a tool for creating custom tokens for the Blood
        on the Clocktower game.
      </p>
      <p className={styles.supportText}>Support the creator and keep this project alive:</p>
      <div className={styles.kofiContainer}>
        <a href="https://ko-fi.com/I2I61EZLCT" target="_blank" rel="noopener noreferrer">
          <img
            height="36"
            className={styles.kofiImage}
            src="https://storage.ko-fi.com/cdn/kofi3.png?v=6"
            alt="Buy Me a Coffee at ko-fi.com"
          />
        </a>
      </div>
    </Modal>
  );
}
