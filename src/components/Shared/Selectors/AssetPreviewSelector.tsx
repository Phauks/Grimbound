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

import { useState, useEffect, memo, useRef } from 'react'
import type { AssetType } from '../../../ts/services/upload/types.js'
import { isAssetReference, extractAssetId } from '../../../ts/services/upload/assetResolver.js'
import { assetStorageService } from '../../../ts/services/upload/index.js'
import {
  getBuiltInAsset,
  isBuiltInAsset,
} from '../../../ts/constants/builtInAssets.js'
import { AssetManagerModal } from '../../Modals/AssetManagerModal'
import {
  SettingsSelectorBase,
  InfoSection,
} from './SettingsSelectorBase'
import styles from '../../../styles/components/shared/AssetPreviewSelector.module.css'

// ============================================================================
// Types
// ============================================================================

/** Token type for preview generation */
type PreviewTokenType = 'character' | 'reminder' | 'meta'

export interface AssetPreviewSelectorProps {
  /** Current value: built-in ID, "asset:uuid", or "none" */
  value: string
  /** Called when selection changes */
  onChange: (value: string) => void
  /** Asset type for filtering in modal */
  assetType: AssetType
  /** Display label (shown next to preview) */
  label?: string
  /** Preview shape */
  shape?: 'circle' | 'square'
  /** Component size */
  size?: 'small' | 'medium' | 'large'
  /** Show "None" option */
  showNone?: boolean
  /** Label for none option */
  noneLabel?: string
  /** Project ID for scoping assets */
  projectId?: string
  /** Disabled state */
  disabled?: boolean
  /** Aria label for accessibility */
  ariaLabel?: string
  /** Generation options for live preview in modal */
  generationOptions?: import('../../../ts/types/index.js').GenerationOptions
  /** Which token type to show in preview (defaults to 'character') */
  previewTokenType?: PreviewTokenType
  /** Optional slot for content above the action button (e.g., toggle) */
  headerSlot?: React.ReactNode
}

// ============================================================================
// Asset Preview Component
// ============================================================================

const AssetPreview = memo(function AssetPreview({
  previewUrl,
  assetLabel,
  shape,
  size,
  isLoading,
  isNone,
}: {
  previewUrl: string | null
  assetLabel: string
  shape: 'circle' | 'square'
  size: 'small' | 'medium' | 'large'
  isLoading: boolean
  isNone: boolean
}) {
  const previewClasses = [
    styles.preview,
    styles[`preview${size.charAt(0).toUpperCase()}${size.slice(1)}`],
    shape === 'circle' ? styles.previewCircle : styles.previewSquare,
    isLoading && styles.previewLoading,
    isNone && styles.previewNone,
  ].filter(Boolean).join(' ')

  return (
    <div className={previewClasses}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={assetLabel}
          className={styles.previewImage}
          loading="lazy"
        />
      ) : (
        <span className={styles.noneIcon}>∅</span>
      )}
    </div>
  )
})

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [assetLabel, setAssetLabel] = useState<string>('')
  const [source, setSource] = useState<'builtin' | 'user' | 'global' | 'none'>('none')
  const containerRef = useRef<HTMLDivElement>(null)

  // Resolve the current value to a preview URL
  useEffect(() => {
    let cancelled = false

    async function resolvePreview() {
      if (!value || value === 'none') {
        setPreviewUrl(null)
        setAssetLabel(noneLabel)
        setSource('none')
        return
      }

      setIsLoading(true)

      // Check if it's a built-in asset
      if (isBuiltInAsset(value, assetType)) {
        const builtIn = getBuiltInAsset(value, assetType)
        if (builtIn) {
          setPreviewUrl(builtIn.thumbnail ?? builtIn.src)
          setAssetLabel(builtIn.label)
          setSource('builtin')
          setIsLoading(false)
          return
        }
      }

      // Check if it's an asset reference
      if (isAssetReference(value)) {
        const assetId = extractAssetId(value)
        if (assetId) {
          try {
            const asset = await assetStorageService.getByIdWithUrl(assetId)
            if (!cancelled && asset) {
              setPreviewUrl(asset.thumbnailUrl ?? asset.url ?? null)
              setAssetLabel(asset.metadata?.filename ?? 'Custom Asset')
              setSource(asset.projectId ? 'user' : 'global')
            }
          } catch {
            if (!cancelled) {
              setPreviewUrl(null)
              setAssetLabel('Asset not found')
              setSource('none')
            }
          }
        }
      } else {
        // Try as a direct path (fallback)
        setPreviewUrl(value)
        setAssetLabel(label ?? 'Custom')
        setSource('builtin')
      }

      if (!cancelled) {
        setIsLoading(false)
      }
    }

    resolvePreview()

    return () => {
      cancelled = true
    }
  }, [value, assetType, noneLabel, label])

  // Handle asset selection from modal
  const handleSelectAsset = (selectedId: string) => {
    onChange(selectedId)
    setIsModalOpen(false)
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  // Format source display
  const getSourceLabel = () => {
    switch (source) {
      case 'none': return 'No selection'
      case 'builtin': return 'Built-in'
      case 'user': return 'My Upload'
      case 'global': return 'Global'
      default: return ''
    }
  }

  return (
    <>
      <SettingsSelectorBase
        ref={containerRef}
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
        info={
          <InfoSection
            label={assetLabel}
            summary={getSourceLabel()}
          />
        }
        headerSlot={headerSlot}
        actionLabel="Customize"
        onAction={() => setIsModalOpen(true)}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? `Select ${assetType}`}
      />

      {/* Asset Manager Modal */}
      <AssetManagerModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
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
    </>
  )
})

export default AssetPreviewSelector
