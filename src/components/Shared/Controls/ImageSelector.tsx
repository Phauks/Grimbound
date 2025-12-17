import { memo } from 'react';
import styles from '../../../styles/components/shared/ImageSelector.module.css';
import type { ImageOption } from '../../../ts/types/index';

export type ImageSelectorShape = 'square' | 'circle';

interface ImageSelectorProps {
  options: ImageOption[];
  value: string;
  onChange: (value: string) => void;
  shape?: ImageSelectorShape;
  showNone?: boolean;
  showAddCustom?: boolean;
  noneLabel?: string;
  ariaLabel?: string;
}

export const ImageSelector = memo(
  ({
    options,
    value,
    onChange,
    shape = 'square',
    showNone = false,
    showAddCustom = true,
    noneLabel = 'None',
    ariaLabel = 'Image selector',
  }: ImageSelectorProps) => {
    const shapeClass = shape === 'circle' ? styles.circle : styles.square;

    return (
      <div className={styles.container} role="radiogroup" aria-label={ariaLabel}>
        {/* None option */}
        {showNone && (
          <label
            className={`${styles.thumbnail} ${shapeClass} ${value === 'none' ? styles.selected : ''}`}
            title={noneLabel}
          >
            <input
              type="radio"
              name="image-selector"
              value="none"
              checked={value === 'none'}
              onChange={() => onChange('none')}
              style={{ display: 'none' }}
              aria-label={noneLabel}
            />
            <span className={styles.noneIcon}>∅</span>
          </label>
        )}

        {/* Image options */}
        {options.map((option) => (
          <label
            key={option.id}
            className={`${styles.thumbnail} ${shapeClass} ${value === option.id ? styles.selected : ''}`}
            title={option.label}
          >
            <input
              type="radio"
              name="image-selector"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              style={{ display: 'none' }}
              aria-label={option.label}
            />
            <img
              src={option.thumbnail || option.src}
              alt={option.label}
              className={styles.image}
              loading="lazy"
            />
            {option.source !== 'builtin' && (
              <span className={`${styles.sourceBadge} ${styles[option.source]}`}>
                {option.source === 'user' ? '★' : '◆'}
              </span>
            )}
          </label>
        ))}

        {/* Add Custom placeholder */}
        {showAddCustom && (
          <button
            type="button"
            className={`${styles.thumbnail} ${shapeClass} ${styles.addCustom}`}
            disabled
            title="Add Custom (coming soon)"
            aria-label="Add custom image (coming soon)"
          >
            <span className={styles.addIcon}>+</span>
          </button>
        )}
      </div>
    );
  }
);

ImageSelector.displayName = 'ImageSelector';
