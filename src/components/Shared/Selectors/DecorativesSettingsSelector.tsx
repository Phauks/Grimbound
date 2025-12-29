/**
 * DecorativesSettingsSelector Component
 *
 * A unified settings selector for token decorative elements (Setup and Accents).
 * Opens a drawer with three columns:
 * - Left: Asset selection (Setup and Accent image pickers)
 * - Middle: Accent settings (arc slots, probability, side accents)
 * - Right: Visual preview (token with accent placement simulation)
 *
 * Supports tabs for Character, Chain, Meta, and Reminder token types.
 *
 * @module components/Shared/Selectors/DecorativesSettingsSelector
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { DecorativesDrawer } from '@/components/Shared/Drawer/DecorativesDrawer';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import { useDrawerState } from '@/hooks';
import styles from '@/styles/components/shared/DecorativesSettingsSelector.module.css';
import drawerStyles from '@/styles/components/shared/SettingsDrawer.module.css';
import { CONFIG } from '@/ts/config';
import type { GenerationOptions } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface DecorativesSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface DecorativeSettings {
  // Setup
  setupStyle: string;
  setupEnabled: boolean;
  // Accents
  accentGeneration: string;
  accentEnabled: boolean;
  maximumAccents: number;
  accentPopulationProbability: number;
  accentArcSpan: number;
  accentSlots: number;
  enableLeftAccent: boolean;
  enableRightAccent: boolean;
  sideAccentProbability: number;
}

// ============================================================================
// Arc Slot Control - Combined slots + max accents visualization
// ============================================================================

interface ArcSlotControlProps {
  slots: number;
  maxAccents: number;
  onSlotsChange: (slots: number) => void;
  onMaxAccentsChange: (max: number) => void;
  minSlots?: number;
  maxSlots?: number;
}

const ArcSlotControl = memo(function ArcSlotControl({
  slots,
  maxAccents,
  onSlotsChange,
  onMaxAccentsChange,
  minSlots = 3,
  maxSlots = 15,
}: ArcSlotControlProps) {
  const handleSlotClick = (index: number) => {
    const clickedPosition = index + 1;
    if (clickedPosition === maxAccents) {
      onMaxAccentsChange(0);
    } else {
      onMaxAccentsChange(clickedPosition);
    }
  };

  const decreaseSlots = () => {
    if (slots > minSlots) {
      const newSlots = slots - 1;
      onSlotsChange(newSlots);
      if (maxAccents > newSlots) {
        onMaxAccentsChange(newSlots);
      }
    }
  };

  const increaseSlots = () => {
    if (slots < maxSlots) {
      onSlotsChange(slots + 1);
    }
  };

  return (
    <div className={styles.arcSlotControl}>
      <div className={styles.arcSlotHeader}>
        <span className={styles.arcSlotLabel}>Arc Slots</span>
        <span className={styles.arcSlotSummary}>
          {maxAccents === 0 ? (
            <strong>disabled</strong>
          ) : (
            <>
              max <strong>{maxAccents}</strong> of <strong>{slots}</strong>
            </>
          )}
        </span>
      </div>
      <div className={styles.arcSlotRow}>
        <button
          type="button"
          className={styles.slotAdjustButton}
          onClick={decreaseSlots}
          disabled={slots <= minSlots}
          aria-label="Remove slot"
        >
          −
        </button>
        <div className={styles.slotDotsContainer}>
          {Array.from({ length: slots }, (_, slotIndex) => {
            const isActive = slotIndex < maxAccents;
            const isThreshold = slotIndex === maxAccents - 1;
            const stableKey = `slot-${slots}-${slotIndex}`;
            return (
              <button
                key={stableKey}
                type="button"
                className={`${styles.slotDot} ${isActive ? styles.slotDotActive : styles.slotDotInactive} ${isThreshold ? styles.slotDotThreshold : ''}`}
                onClick={() => handleSlotClick(slotIndex)}
                title={`Set max to ${slotIndex + 1}`}
                aria-label={`Slot ${slotIndex + 1}${isActive ? ' (will fill)' : " (won't fill)"}`}
              />
            );
          })}
        </div>
        <button
          type="button"
          className={styles.slotAdjustButton}
          onClick={increaseSlots}
          disabled={slots >= maxSlots}
          aria-label="Add slot"
        >
          +
        </button>
      </div>
      <div className={styles.arcSlotHint}>
        Click dot to set max • Click again to disable • ± to add/remove slots
      </div>
    </div>
  );
});

// ============================================================================
// Probability Calculation Utilities
// ============================================================================

function binomialProbability(n: number, k: number, p: number): number {
  if (k > n || k < 0) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;

  let c = 1;
  for (let i = 0; i < k; i++) {
    c = (c * (n - i)) / (i + 1);
  }

  return c * p ** k * (1 - p) ** (n - k);
}

function calculateDistribution(
  slots: number,
  probability: number,
  maxAccents: number,
  enableLeftAccent: boolean,
  enableRightAccent: boolean,
  sideAccentProbability: number
) {
  const arcProb = probability / 100;
  const sideProb = sideAccentProbability / 100;

  const arcDistribution: number[] = [];
  let cumulativeBeforeMax = 0;

  for (let k = 0; k <= slots; k++) {
    const prob = binomialProbability(slots, k, arcProb);
    if (k < maxAccents) {
      arcDistribution[k] = prob;
      cumulativeBeforeMax += prob;
    } else if (k === maxAccents) {
      arcDistribution[k] = 1 - cumulativeBeforeMax;
    }
  }

  const leftProb = enableLeftAccent ? sideProb : 0;
  const rightProb = enableRightAccent ? sideProb : 0;

  const sideDistribution = [
    (1 - leftProb) * (1 - rightProb),
    leftProb * (1 - rightProb) + (1 - leftProb) * rightProb,
    leftProb * rightProb,
  ];

  const maxSideAccents = (enableLeftAccent ? 1 : 0) + (enableRightAccent ? 1 : 0);
  const maxTotal = maxAccents + maxSideAccents;
  const totalDistribution: number[] = new Array(maxTotal + 1).fill(0);

  for (let arc = 0; arc <= maxAccents; arc++) {
    const arcP = arcDistribution[arc] ?? 0;
    for (let side = 0; side <= maxSideAccents; side++) {
      const sideP = sideDistribution[side] ?? 0;
      const total = arc + side;
      if (total <= maxTotal) {
        totalDistribution[total] += arcP * sideP;
      }
    }
  }

  const expectedArcRaw = slots * arcProb;
  const expectedArc = Math.min(expectedArcRaw, maxAccents);
  const expectedSide = leftProb + rightProb;
  const expectedTotal = expectedArc + expectedSide;

  const probZero = (totalDistribution[0] ?? 0) * 100;
  const probLow = totalDistribution.slice(1, 3).reduce((sum, p) => sum + (p ?? 0), 0) * 100;
  const probMed = totalDistribution.slice(3, 5).reduce((sum, p) => sum + (p ?? 0), 0) * 100;
  const probHigh = totalDistribution.slice(5).reduce((sum, p) => sum + (p ?? 0), 0) * 100;

  return {
    expectedArc: expectedArc.toFixed(1),
    expectedSide: expectedSide.toFixed(1),
    expectedTotal: expectedTotal.toFixed(1),
    maxArc: maxAccents,
    maxTotal,
    probZero,
    probLow,
    probMed,
    probHigh,
    totalDistribution,
  };
}

function simulateOutcome(slots: number, probability: number, maxAccents: number): boolean[] {
  const p = probability / 100;
  const result: boolean[] = [];
  let count = 0;

  for (let i = 0; i < slots; i++) {
    const filled = Math.random() < p && count < maxAccents;
    result.push(filled);
    if (filled) count++;
  }

  return result;
}

// ============================================================================
// Visual Preview Component
// ============================================================================

const VisualPreview = memo(function VisualPreview({
  slots,
  probability,
  maxAccents,
  arcSpan,
  enableLeftAccent,
  enableRightAccent,
  sideAccentProbability,
}: {
  slots: number;
  probability: number;
  maxAccents: number;
  arcSpan: number;
  enableLeftAccent: boolean;
  enableRightAccent: boolean;
  sideAccentProbability: number;
}) {
  const [arcSimulation, setArcSimulation] = useState<boolean[]>([]);
  const [leftSimulation, setLeftSimulation] = useState(false);
  const [rightSimulation, setRightSimulation] = useState(false);

  const stats = useMemo(
    () =>
      calculateDistribution(
        slots,
        probability,
        maxAccents,
        enableLeftAccent,
        enableRightAccent,
        sideAccentProbability
      ),
    [slots, probability, maxAccents, enableLeftAccent, enableRightAccent, sideAccentProbability]
  );

  useEffect(() => {
    setArcSimulation(simulateOutcome(slots, probability, maxAccents));
    setLeftSimulation(enableLeftAccent && Math.random() * 100 < sideAccentProbability);
    setRightSimulation(enableRightAccent && Math.random() * 100 < sideAccentProbability);
  }, [slots, probability, maxAccents, enableLeftAccent, enableRightAccent, sideAccentProbability]);

  const resimulate = useCallback(() => {
    setArcSimulation(simulateOutcome(slots, probability, maxAccents));
    setLeftSimulation(enableLeftAccent && Math.random() * 100 < sideAccentProbability);
    setRightSimulation(enableRightAccent && Math.random() * 100 < sideAccentProbability);
  }, [slots, probability, maxAccents, enableLeftAccent, enableRightAccent, sideAccentProbability]);

  const slotPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const centerAngle = -90 * (Math.PI / 180);
    const halfSpan = (arcSpan / 2) * (Math.PI / 180);
    const startAngle = centerAngle - halfSpan;
    const endAngle = centerAngle + halfSpan;
    const tokenRadiusPercent = (0.875 / 2) * 100;
    const arcRadius = tokenRadiusPercent * 0.78;
    const centerX = 50;
    const centerY = 50;

    for (let i = 0; i < slots; i++) {
      const t = slots > 1 ? i / (slots - 1) : 0.5;
      const angle = startAngle + (endAngle - startAngle) * t;
      positions.push({
        x: centerX + arcRadius * Math.cos(angle),
        y: centerY + arcRadius * Math.sin(angle),
      });
    }

    return positions;
  }, [slots, arcSpan]);

  const sideAccentRadius = (0.875 / 2) * 100 * 0.88;
  const arcFilledCount = arcSimulation.filter(Boolean).length;
  const totalFilledCount = arcFilledCount + (leftSimulation ? 1 : 0) + (rightSimulation ? 1 : 0);

  return (
    <div className={styles.visualPreview}>
      <button
        type="button"
        className={styles.arcContainer}
        onClick={resimulate}
        title="Click to resimulate"
        aria-label="Resimulate accent placement"
      >
        <div className={styles.arcVisualization}>
          <div className={styles.tokenCircle} />

          {enableLeftAccent && (
            <div
              className={`${styles.slotMarker} ${styles.sideAccentMarker} ${leftSimulation ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${50 - sideAccentRadius}%`, top: '50%' }}
              title="Left accent"
            />
          )}

          {enableRightAccent && (
            <div
              className={`${styles.slotMarker} ${styles.sideAccentMarker} ${rightSimulation ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${50 + sideAccentRadius}%`, top: '50%' }}
              title="Right accent"
            />
          )}

          {slotPositions.map((pos, i) => (
            <div
              key={`slot-${pos.x}-${pos.y}-${i}`}
              className={`${styles.slotMarker} ${arcSimulation[i] ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
          ))}
        </div>
      </button>

      <div className={styles.distributionSection}>
        <div className={styles.distributionTitle}>Total Distribution</div>
        <div className={styles.distributionBar}>
          {stats.probZero > 1 && (
            <div
              className={styles.distributionSegment}
              style={{ width: `${stats.probZero}%`, background: 'var(--text-muted)' }}
              title={`${stats.probZero.toFixed(0)}% chance of 0 total accents`}
            >
              {stats.probZero > 10 ? '0' : ''}
            </div>
          )}
          {stats.probLow > 1 && (
            <div
              className={`${styles.distributionSegment} ${styles.distributionLow}`}
              style={{ width: `${stats.probLow}%` }}
              title={`${stats.probLow.toFixed(0)}% chance of 1-2 total accents`}
            >
              {stats.probLow > 10 ? '1-2' : ''}
            </div>
          )}
          {stats.probMed > 1 && (
            <div
              className={`${styles.distributionSegment} ${styles.distributionMed}`}
              style={{ width: `${stats.probMed}%` }}
              title={`${stats.probMed.toFixed(0)}% chance of 3-4 total accents`}
            >
              {stats.probMed > 10 ? '3-4' : ''}
            </div>
          )}
          {stats.probHigh > 1 && (
            <div
              className={`${styles.distributionSegment} ${styles.distributionHigh}`}
              style={{ width: `${stats.probHigh}%` }}
              title={`${stats.probHigh.toFixed(0)}% chance of 5+ total accents`}
            >
              {stats.probHigh > 10 ? '5+' : ''}
            </div>
          )}
        </div>

        <div className={styles.statsRow}>
          <div
            className={styles.statItem}
            title={`Arc: ${stats.expectedArc} + Side: ${stats.expectedSide}`}
          >
            <span className={styles.statValue}>{stats.expectedTotal}</span>
            <span className={styles.statLabel}>Expected</span>
          </div>
          <div
            className={styles.statItem}
            title={`Arc: ${arcFilledCount} + Side: ${totalFilledCount - arcFilledCount}`}
          >
            <span className={styles.statValue}>{totalFilledCount}</span>
            <span className={styles.statLabel}>Simulated</span>
          </div>
          <div
            className={styles.statItem}
            title={`Arc max: ${stats.maxArc} + Side: ${stats.maxTotal - stats.maxArc}`}
          >
            <span className={styles.statValue}>{stats.maxTotal}</span>
            <span className={styles.statLabel}>Max</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Preview Component (for selector box)
// ============================================================================

const DecorativesPreview = memo(function DecorativesPreview({
  setupStyle,
  accentGeneration,
  setupEnabled,
  accentEnabled,
}: {
  setupStyle: string;
  accentGeneration: string;
  setupEnabled: boolean;
  accentEnabled: boolean;
}) {
  const getSetupPreviewSrc = () => {
    if (!(setupEnabled && setupStyle) || setupStyle === 'none') return null;
    return `${CONFIG.ASSETS.SETUP_OVERLAYS}${setupStyle}.webp`;
  };

  const getAccentPreviewSrc = () => {
    if (!(accentEnabled && accentGeneration) || accentGeneration === 'none') return null;
    return `${CONFIG.ASSETS.ACCENTS}leaves/${accentGeneration}/leaf_1.webp`;
  };

  const setupSrc = getSetupPreviewSrc();
  const accentSrc = getAccentPreviewSrc();
  const bothDisabled = !(setupEnabled || accentEnabled);

  return (
    <div className={`${styles.previewStack} ${bothDisabled ? styles.previewDisabledState : ''}`}>
      {setupSrc && (
        <img
          src={setupSrc}
          alt="Setup overlay"
          className={styles.previewSetup}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {accentSrc && (
        <img
          src={accentSrc}
          alt="Accent"
          className={styles.previewAccent}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {!(setupSrc || accentSrc) && <span className={styles.previewFallback}>🎭</span>}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const DecorativesSettingsSelector = memo(function DecorativesSettingsSelector({
  generationOptions,
  onOptionChange,
  projectId,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: DecorativesSettingsSelectorProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showAccentModal, setShowAccentModal] = useState(false);

  // Current settings from generationOptions (memoized to avoid dependency issues)
  const currentSettings: DecorativeSettings = useMemo(
    () => ({
      setupStyle: generationOptions.setupStyle || 'setup_flower_1',
      setupEnabled: generationOptions.setupStyle !== 'none',
      accentGeneration: generationOptions.accentGeneration || 'classic',
      accentEnabled: generationOptions.accentEnabled !== false,
      maximumAccents: generationOptions.maximumAccents ?? 5,
      accentPopulationProbability: generationOptions.accentPopulationProbability ?? 30,
      accentArcSpan: generationOptions.accentArcSpan ?? 120,
      accentSlots: generationOptions.accentSlots ?? 7,
      enableLeftAccent: generationOptions.enableLeftAccent ?? true,
      enableRightAccent: generationOptions.enableRightAccent ?? true,
      sideAccentProbability: generationOptions.sideAccentProbability ?? 50,
    }),
    [
      generationOptions.setupStyle,
      generationOptions.accentGeneration,
      generationOptions.accentEnabled,
      generationOptions.maximumAccents,
      generationOptions.accentPopulationProbability,
      generationOptions.accentArcSpan,
      generationOptions.accentSlots,
      generationOptions.enableLeftAccent,
      generationOptions.enableRightAccent,
      generationOptions.sideAccentProbability,
    ]
  );

  const [lastSetup, setLastSetup] = useState(
    currentSettings.setupEnabled ? currentSettings.setupStyle : 'setup_flower_1'
  );

  // Default settings for reset
  const defaultSettings: DecorativeSettings = useMemo(
    () => ({
      setupStyle: 'setup_flower_1',
      setupEnabled: true,
      accentGeneration: 'classic',
      accentEnabled: true,
      maximumAccents: 5,
      accentPopulationProbability: 30,
      accentArcSpan: 120,
      accentSlots: 7,
      enableLeftAccent: true,
      enableRightAccent: true,
      sideAccentProbability: 50,
    }),
    []
  );

  // Panel coordination - get reference before drawer so we can pass it
  const drawerCloseRef = useRef<(() => void) | undefined>(undefined);
  const onWillOpen = useCoordinatedPanel('decoratives-settings', () => drawerCloseRef.current);

  // Drawer state with correct API
  const drawer = useDrawerState<DecorativeSettings>({
    value: currentSettings,
    onChange: (value: DecorativeSettings) => {
      onOptionChange({
        setupStyle: value.setupEnabled ? value.setupStyle : 'none',
        accentGeneration: value.accentGeneration,
        accentEnabled: value.accentEnabled,
        maximumAccents: value.maximumAccents,
        accentPopulationProbability: value.accentPopulationProbability,
        accentArcSpan: value.accentArcSpan,
        accentSlots: value.accentSlots,
        enableLeftAccent: value.enableLeftAccent,
        enableRightAccent: value.enableRightAccent,
        sideAccentProbability: value.sideAccentProbability,
      });
    },
    defaultValue: defaultSettings,
    onWillOpen,
  });

  useEffect(() => {
    drawerCloseRef.current = drawer.close;
  }, [drawer.close]);

  // Open drawer handler
  const handleOpenDrawer = useCallback(() => {
    drawer.open();
  }, [drawer]);

  // Handlers for pending value updates
  const handleSetupToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        // Batch both updates together to avoid stale state issues
        drawer.updatePending({
          ...drawer.pendingValue,
          setupEnabled: true,
          setupStyle: lastSetup,
        });
      } else {
        if (drawer.pendingValue.setupStyle !== 'none') {
          setLastSetup(drawer.pendingValue.setupStyle);
        }
        drawer.updatePendingField('setupEnabled', false);
      }
    },
    [drawer, lastSetup]
  );

  const handleAccentToggle = useCallback(
    (enabled: boolean) => {
      drawer.updatePendingField('accentEnabled', enabled);
    },
    [drawer]
  );

  const handleSetupAssetChange = useCallback(
    (assetId: string) => {
      drawer.updatePendingField('setupStyle', assetId);
      drawer.updatePendingField('setupEnabled', true);
      setLastSetup(assetId);
      setShowSetupModal(false);
    },
    [drawer]
  );

  const handleAccentAssetChange = useCallback(
    (assetId: string) => {
      drawer.updatePendingField('accentGeneration', assetId);
      drawer.updatePendingField('accentEnabled', true);
      setShowAccentModal(false);
    },
    [drawer]
  );

  // Display values
  const displaySettings = drawer.isOpen ? drawer.pendingValue : currentSettings;
  const currentMaxAccentsLimit = displaySettings.accentSlots;

  // Preview sources
  const setupPreviewSrc = displaySettings.setupEnabled
    ? `${CONFIG.ASSETS.SETUP_OVERLAYS}${displaySettings.setupStyle}.webp`
    : null;
  const accentPreviewSrc = displaySettings.accentEnabled
    ? `${CONFIG.ASSETS.ACCENTS}leaves/${displaySettings.accentGeneration}/leaf_1.webp`
    : null;

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <DecorativesPreview
              setupStyle={currentSettings.setupStyle}
              accentGeneration={currentSettings.accentGeneration}
              setupEnabled={currentSettings.setupEnabled}
              accentEnabled={currentSettings.accentEnabled}
            />
          </PreviewBox>
        }
        info={<InfoSection label="Decoratives" />}
        actionLabel="Customize"
        onAction={handleOpenDrawer}
        isExpanded={drawer.isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? 'Decorative settings'}
      />

      <DecorativesDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.close}
        onApply={drawer.apply}
        onReset={drawer.reset}
      >
        {/* Column 1: Setup Overlay + Accents Selection */}
        <div className={drawerStyles.column}>
          {/* Setup Overlay Section */}
          <div className={drawerStyles.sectionHeader}>Setup Overlay</div>
          <div className={styles.assetRow}>
            <button
              type="button"
              className={`${styles.enableBtn} ${displaySettings.setupEnabled ? styles.enableBtnActive : ''}`}
              onClick={() => handleSetupToggle(!displaySettings.setupEnabled)}
            >
              {displaySettings.setupEnabled ? 'Enabled' : 'Enable'}
            </button>
            <button
              type="button"
              className={styles.browseButton}
              onClick={() => setShowSetupModal(true)}
              disabled={!displaySettings.setupEnabled}
            >
              Browse
            </button>
            {displaySettings.setupEnabled && setupPreviewSrc && (
              <img
                src={setupPreviewSrc}
                alt="Setup overlay"
                className={styles.assetThumb}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>

          {/* Divider */}
          <div className={styles.columnDivider} />

          {/* Accents Section */}
          <div className={drawerStyles.sectionHeader}>Accents</div>
          <div className={styles.assetRow}>
            <button
              type="button"
              className={`${styles.enableBtn} ${displaySettings.accentEnabled ? styles.enableBtnActive : ''}`}
              onClick={() => handleAccentToggle(!displaySettings.accentEnabled)}
            >
              {displaySettings.accentEnabled ? 'Enabled' : 'Enable'}
            </button>
            <button
              type="button"
              className={styles.browseButton}
              onClick={() => setShowAccentModal(true)}
              disabled={!displaySettings.accentEnabled}
            >
              Browse
            </button>
            {displaySettings.accentEnabled && accentPreviewSrc && (
              <img
                src={accentPreviewSrc}
                alt="Accent"
                className={styles.assetThumb}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        </div>

        {/* Column 2: Accent Settings */}
        <div className={drawerStyles.column}>
          <div className={drawerStyles.sectionHeader}>Accent Settings</div>

          <div className={styles.sectionDivider}>
            <span>Arc Accents</span>
          </div>

          <ArcSlotControl
            slots={displaySettings.accentSlots}
            maxAccents={Math.min(displaySettings.maximumAccents, currentMaxAccentsLimit)}
            onSlotsChange={(v) => drawer.updatePendingField('accentSlots', v)}
            onMaxAccentsChange={(v) => drawer.updatePendingField('maximumAccents', v)}
          />

          <div className={styles.settingGroup}>
            <EditableSlider
              label="Arc Span"
              value={displaySettings.accentArcSpan}
              onChange={(v) => drawer.updatePendingField('accentArcSpan', v)}
              min={30}
              max={180}
              step={10}
              suffix="°"
              defaultValue={120}
            />
          </div>

          <div className={styles.settingGroup}>
            <EditableSlider
              label="Probability"
              value={displaySettings.accentPopulationProbability}
              onChange={(v) => drawer.updatePendingField('accentPopulationProbability', v)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              defaultValue={30}
            />
          </div>

          <div className={styles.sectionDivider}>
            <span>Side Accents</span>
          </div>

          <div className={styles.settingGroup}>
            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={displaySettings.enableLeftAccent}
                  onChange={(e) => drawer.updatePendingField('enableLeftAccent', e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Left</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={displaySettings.enableRightAccent}
                  onChange={(e) => drawer.updatePendingField('enableRightAccent', e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Right</span>
              </label>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <EditableSlider
              label="Side Prob."
              value={displaySettings.sideAccentProbability}
              onChange={(v) => drawer.updatePendingField('sideAccentProbability', v)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              defaultValue={50}
              disabled={!(displaySettings.enableLeftAccent || displaySettings.enableRightAccent)}
            />
          </div>
        </div>

        {/* Column 3: Visual Preview */}
        <div className={drawerStyles.column}>
          <div className={drawerStyles.sectionHeader}>Preview</div>
          <VisualPreview
            slots={displaySettings.accentSlots}
            probability={displaySettings.accentPopulationProbability}
            maxAccents={Math.min(displaySettings.maximumAccents, currentMaxAccentsLimit)}
            arcSpan={displaySettings.accentArcSpan}
            enableLeftAccent={displaySettings.enableLeftAccent}
            enableRightAccent={displaySettings.enableRightAccent}
            sideAccentProbability={displaySettings.sideAccentProbability}
          />
        </div>
      </DecorativesDrawer>

      {showSetupModal && (
        <AssetManagerModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onSelectAsset={handleSetupAssetChange}
          initialAssetType="setup-overlay"
          selectionMode={true}
          includeBuiltIn={true}
          projectId={projectId}
          generationOptions={generationOptions}
        />
      )}

      {showAccentModal && (
        <AssetManagerModal
          isOpen={showAccentModal}
          onClose={() => setShowAccentModal(false)}
          onSelectAsset={handleAccentAssetChange}
          initialAssetType="accent"
          selectionMode={true}
          includeBuiltIn={true}
          projectId={projectId}
          generationOptions={generationOptions}
        />
      )}
    </>
  );
});

export default DecorativesSettingsSelector;
