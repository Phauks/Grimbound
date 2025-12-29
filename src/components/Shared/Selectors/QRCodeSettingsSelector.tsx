/**
 * QRCodeSettingsSelector Component
 *
 * A settings selector for QR code token options.
 * Opens a drawer with three columns for comprehensive QR configuration.
 *
 * @module components/Shared/Selectors/QRCodeSettingsSelector
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeDrawer } from '@/components/Shared/Drawer/QRCodeDrawer';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import styles from '@/styles/components/shared/QRCodeSettingsSelector.module.css';
import { QR_COLORS } from '@/ts/constants.js';
import type { GenerationOptions } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface QRCodeSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

// ============================================================================
// Preview Component
// ============================================================================

const QRPreview = memo(function QRPreview({
  colorStart,
  colorEnd,
  isEnabled,
}: {
  colorStart: string;
  colorEnd: string;
  isEnabled: boolean;
}) {
  return (
    <div className={`${styles.previewContainer} ${isEnabled ? '' : styles.previewDisabled}`}>
      <svg viewBox="0 0 24 24" className={styles.qrIcon} aria-hidden="true">
        <defs>
          <linearGradient id="qrGradientPreview" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="7" height="7" rx="1" fill="url(#qrGradientPreview)" />
        <rect x="14" y="3" width="7" height="7" rx="1" fill="url(#qrGradientPreview)" />
        <rect x="3" y="14" width="7" height="7" rx="1" fill="url(#qrGradientPreview)" />
        <rect x="14" y="14" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <rect x="18" y="14" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <rect x="14" y="18" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <rect x="18" y="18" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <circle cx="6.5" cy="6.5" r="1.5" fill="white" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
        <circle cx="6.5" cy="17.5" r="1.5" fill="white" />
      </svg>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const QRCodeSettingsSelector = memo(function QRCodeSettingsSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: QRCodeSettingsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract current state for preview
  const isEnabled = generationOptions.almanacToken !== false;
  const colorStart = generationOptions.qrCodeOptions?.dotsColorStart ?? QR_COLORS.GRADIENT_START;
  const colorEnd = generationOptions.qrCodeOptions?.dotsColorEnd ?? QR_COLORS.GRADIENT_END;

  // Panel coordination - closes other panels when this one opens
  const closeRef = useRef<(() => void) | undefined>(undefined);
  const onWillOpen = useCoordinatedPanel('qrcode-settings', () => closeRef.current);

  // Update close ref
  useEffect(() => {
    closeRef.current = () => setIsOpen(false);
  }, []);

  // Handlers
  const handleOpen = useCallback(() => {
    onWillOpen?.();
    setIsOpen(true);
  }, [onWillOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <QRPreview colorStart={colorStart} colorEnd={colorEnd} isEnabled={isEnabled} />
          </PreviewBox>
        }
        info={<InfoSection label="QR Tokens" />}
        actionLabel="Customize"
        onAction={handleOpen}
        isExpanded={isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? 'QR code settings'}
      />

      <QRCodeDrawer
        isOpen={isOpen}
        onClose={handleClose}
        generationOptions={generationOptions}
        onOptionChange={onOptionChange}
      />
    </>
  );
});

export default QRCodeSettingsSelector;
