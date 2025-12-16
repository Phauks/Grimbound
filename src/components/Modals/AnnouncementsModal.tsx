/**
 * Announcements Modal
 *
 * Displays application announcements and updates.
 * Migrated to use unified Modal component.
 */

import { Modal } from '../Shared/ModalBase/Modal';

interface AnnouncementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnnouncementsModal({ isOpen, onClose }: AnnouncementsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Announcements" size="medium">
      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        No announcements at this time. Check back later for updates!
      </p>
    </Modal>
  );
}
