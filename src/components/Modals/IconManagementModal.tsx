/**
 * Icon Management Modal Component
 *
 * Allows users to upload, manage, and remove custom character icons
 * for their projects.
 * Migrated to use unified Modal and Button components.
 */

import { useState, useCallback, useMemo } from 'react';
import { Modal } from '../Shared/ModalBase/Modal';
import { Button } from '../Shared/UI/Button';
import { IconUploader } from '../Shared/Controls/IconUploader';
import type { Character } from '../../ts/types/index.js';
import type { CustomIconMetadata } from '../../ts/types/project.js';
import styles from '../../styles/components/modals/IconManagementModal.module.css';

interface IconManagementModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Characters available in the project */
  characters: Character[];
  /** Current custom icons */
  customIcons: CustomIconMetadata[];
  /** Callback when icons are updated */
  onUpdateIcons: (icons: CustomIconMetadata[]) => void;
}

export function IconManagementModal({
  isOpen,
  onClose,
  characters,
  customIcons,
  onUpdateIcons,
}: IconManagementModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);

  // Create map of character IDs to custom icons
  const iconMap = useMemo(() => {
    const map = new Map<string, CustomIconMetadata>();
    customIcons.forEach((icon) => {
      map.set(icon.characterId, icon);
    });
    return map;
  }, [customIcons]);

  // Filter characters
  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((char) => char.name.toLowerCase().includes(query));
    }

    // Filter by custom icons
    if (showOnlyCustom) {
      filtered = filtered.filter((char) => iconMap.has(char.id));
    }

    return filtered;
  }, [characters, searchQuery, showOnlyCustom, iconMap]);

  // Handle icon upload/update
  const handleIconUpdate = useCallback(
    (character: Character, dataUrl: string | null) => {
      const updatedIcons = [...customIcons];
      const existingIndex = updatedIcons.findIndex((icon) => icon.characterId === character.id);

      if (dataUrl) {
        const iconData: CustomIconMetadata = {
          characterId: character.id,
          characterName: character.name,
          filename: `${character.id}.webp`,
          source: 'uploaded',
          dataUrl,
          storedInIndexedDB: false,
          lastModified: Date.now(),
          fileSize: Math.round(dataUrl.length * 0.75), // Rough estimate
          mimeType: 'image/webp',
        };

        if (existingIndex >= 0) {
          updatedIcons[existingIndex] = iconData;
        } else {
          updatedIcons.push(iconData);
        }
      } else {
        // Remove icon
        if (existingIndex >= 0) {
          updatedIcons.splice(existingIndex, 1);
        }
      }

      onUpdateIcons(updatedIcons);
    },
    [customIcons, onUpdateIcons]
  );

  // Stats
  const stats = useMemo(() => {
    const totalSize = customIcons.reduce((sum, icon) => sum + (icon.fileSize || 0), 0);
    return {
      count: customIcons.length,
      totalCharacters: characters.length,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }, [customIcons, characters]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Custom Icons"
      size="large"
      footer={
        <>
          <p className={styles.footerNote}>
            ℹ️ Custom icons will be included when you export this project as a ZIP file
          </p>
          <Button variant="accent" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.count}</span>
          <span className={styles.statLabel}>Custom Icons</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.totalCharacters}</span>
          <span className={styles.statLabel}>Total Characters</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.totalSizeMB} MB</span>
          <span className={styles.statLabel}>Total Size</span>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search characters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <label className={styles.filterCheckbox}>
          <input
            type="checkbox"
            checked={showOnlyCustom}
            onChange={(e) => setShowOnlyCustom(e.target.checked)}
          />
          <span>Show only custom icons</span>
        </label>
      </div>

      {/* Character Grid */}
      <div className={styles.content}>
        {filteredCharacters.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              {showOnlyCustom
                ? 'No custom icons yet. Upload icons below to get started.'
                : searchQuery
                  ? `No characters found matching "${searchQuery}"`
                  : 'No characters available'}
            </p>
          </div>
        ) : (
          <div className={styles.characterGrid}>
            {filteredCharacters.map((character) => {
              const customIcon = iconMap.get(character.id);
              return (
                <div key={character.id} className={styles.characterCard}>
                  <div className={styles.characterHeader}>
                    <h3 className={styles.characterName}>{character.name}</h3>
                    <span className={styles.characterTeam}>{character.team}</span>
                  </div>

                  <IconUploader
                    value={customIcon?.dataUrl}
                    onChange={(dataUrl) => handleIconUpdate(character, dataUrl)}
                    characterName={character.name}
                    maxSizeMB={5}
                    showRemove={true}
                  />

                  {customIcon && (
                    <div className={styles.iconMeta}>
                      <span className={styles.iconSize}>
                        {((customIcon.fileSize || 0) / 1024).toFixed(1)} KB
                      </span>
                      <span className={styles.iconDate}>
                        {customIcon.lastModified
                          ? new Date(customIcon.lastModified).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
