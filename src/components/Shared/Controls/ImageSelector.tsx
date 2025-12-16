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
          <button
            type="button"
            className={`${styles.thumbnail} ${shapeClass} ${value === 'none' ? styles.selected : ''}`}
            onClick={() => onChange('none')}
            title={noneLabel}
            role="radio"
            aria-checked={value === 'none'}
          >
            <span className={styles.noneIcon}>∅</span>
          </button>
        )}

        {/* Image options */}
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.thumbnail} ${shapeClass} ${value === option.id ? styles.selected : ''}`}
            onClick={() => onChange(option.id)}
            title={option.label}
            role="radio"
            aria-checked={value === option.id}
          >
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
          </button>
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
