/**
 * AssetPreviewSelector Component
 *
 * A compact asset selector that shows a preview of the current selection
 * with a "Change" button that opens the AssetManagerModal.
 *
 * Uses SettingsSelectorBase for consistent styling. Unlike other selectors
 * that use dropdown panels, this component uses a modal for asset selection.
 *
 * @module components/Shared/AssetPreviewSelector
 *
 * @example
 * ```tsx
 * <AssetPreviewSelector
 *   value={generationOptions.characterBackground}
 *   onChange={(value) => onOptionChange({ characterBackground: value })}
 *   assetType="token-background"
 *   label="Background"
 *   shape="circle"
 * />
 * ```
 */

import { memo, useCallback, useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { useAssetPreview } from '@/hooks/useAssetPreview';
import styles from '@/styles/components/shared/AssetPreviewSelector.module.css';
import type { AssetType } from '@/ts/services/upload/types.js';
import { InfoSection, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

/** Token type for preview generation */
type PreviewTokenType = 'character' | 'reminder' | 'meta';

export interface AssetPreviewSelectorProps {
  /** Current value: built-in ID, "asset:uuid", or "none" */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Asset type for filtering in modal */
  assetType: AssetType;
  /** Display label (shown next to preview) */
  label?: string;
  /** Preview shape */
  shape?: 'circle' | 'square';
  /** Component size */
  size?: 'small' | 'medium' | 'large';
  /** Show "None" option */
  showNone?: boolean;
  /** Label for none option */
  noneLabel?: string;
  /** Project ID for scoping assets */
  projectId?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Generation options for live preview in modal */
  generationOptions?: import('../../../ts/types/index.js').GenerationOptions;
  /** Which token type to show in preview (defaults to 'character') */
  previewTokenType?: PreviewTokenType;
  /** Optional slot for content above the action button (e.g., toggle) */
  headerSlot?: React.ReactNode;
}

// ============================================================================
// Asset Preview Component
// ============================================================================

interface AssetPreviewProps {
  previewUrl: string | null;
  assetLabel: string;
  shape: 'circle' | 'square';
  size: 'small' | 'medium' | 'large';
  isLoading: boolean;
  isNone: boolean;
}

const AssetPreview = memo(function AssetPreview({
  previewUrl,
  assetLabel,
  shape,
  size,
  isLoading,
  isNone,
}: AssetPreviewProps) {
  const sizeClass = `preview${size.charAt(0).toUpperCase()}${size.slice(1)}`;
  const shapeClass = shape === 'circle' ? styles.previewCircle : styles.previewSquare;

  const previewClasses = [
    styles.preview,
    styles[sizeClass],
    shapeClass,
    isLoading && styles.previewLoading,
    isNone && styles.previewNone,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={previewClasses}>
      {previewUrl ? (
        <img src={previewUrl} alt={assetLabel} className={styles.previewImage} loading="lazy" />
      ) : (
        <span className={styles.noneIcon}>&#8709;</span>
      )}
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const AssetPreviewSelector = memo(function AssetPreviewSelector({
  value,
  onChange,
  assetType,
  label,
  shape = 'square',
  size = 'medium',
  showNone = false,
  noneLabel = 'None',
  projectId,
  disabled = false,
  ariaLabel,
  generationOptions,
  previewTokenType = 'character',
  headerSlot,
}: AssetPreviewSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use extracted hook for asset resolution
  const {
    previewUrl,
    label: assetLabel,
    source,
    sourceLabel,
    isLoading,
  } = useAssetPreview({
    value,
    assetType,
    noneLabel,
    fallbackLabel: label,
  });

  // Stable callbacks
  const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleSelectAsset = useCallback(
    (selectedId: string) => {
      onChange(selectedId);
      setIsModalOpen(false);
    },
    [onChange]
  );

  return (
    <>
      <SettingsSelectorBase
        preview={
          <AssetPreview
            previewUrl={previewUrl}
            assetLabel={assetLabel}
            shape={shape}
            size={size}
            isLoading={isLoading}
            isNone={source === 'none'}
          />
        }
        info={<InfoSection label={assetLabel} summary={sourceLabel} />}
        headerSlot={headerSlot}
        actionLabel="Customize"
        onAction={handleOpenModal}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? `Select ${assetType}`}
      />

      {isModalOpen && (
        <AssetManagerModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          projectId={projectId}
          initialAssetType={assetType}
          selectionMode={true}
          onSelectAsset={handleSelectAsset}
          includeBuiltIn={true}
          showNoneOption={showNone}
          noneLabel={noneLabel}
          generationOptions={generationOptions}
          previewTokenType={previewTokenType}
        />
      )}
    </>
  );
});

export default AssetPreviewSelector;
