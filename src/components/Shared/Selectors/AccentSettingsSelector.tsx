/**
 * AccentSettingsSelector Component
 *
 * A three-panel settings selector for token accent decorations:
 * - Left: Accent style image selection
 * - Middle: Numeric settings (max accents, probability, arc span, slots)
 * - Right: Visual preview showing probability outcomes
 *
 * The visual preview helps users understand the probabilistic nature of
 * accent placement by showing simulated outcomes and distribution stats.
 *
 * @module components/Shared/AccentSettingsSelector
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '@/hooks';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import styles from '@/styles/components/shared/AccentSettingsSelector.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import type { GenerationOptions } from '@/ts/types/index';
import CONFIG from '@/ts/config.js';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface AccentSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface PendingAccentSettings {
  maximumAccents: number;
  accentPopulationProbability: number;
  accentArcSpan: number;
  accentSlots: number;
  enableLeftAccent: boolean;
  enableRightAccent: boolean;
  sideAccentProbability: number;
}

// Built-in accent styles (only classic available for now)
const ACCENT_STYLES = [{ id: 'classic', label: 'Classic' }];

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

/**
 * Visual control showing arc slots as clickable dots.
 * - Total dots = arc slots (adjustable with +/- buttons)
 * - Filled dots = max accents threshold (click a dot to set)
 * - Makes the relationship between slots and max obvious
 */
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
    // If clicking the current max position, toggle to 0 (disable arc accents)
    // Otherwise set max to the clicked position
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
      // Auto-clamp max if needed
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
            <>max <strong>{maxAccents}</strong> of <strong>{slots}</strong></>
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
          {Array.from({ length: slots }, (_, i) => {
            const isActive = i < maxAccents;
            const isThreshold = i === maxAccents - 1;
            return (
              <button
                key={i}
                type="button"
                className={`${styles.slotDot} ${isActive ? styles.slotDotActive : styles.slotDotInactive} ${isThreshold ? styles.slotDotThreshold : ''}`}
                onClick={() => handleSlotClick(i)}
                title={`Set max to ${i + 1}`}
                aria-label={`Slot ${i + 1}${isActive ? ' (will fill)' : ' (won\'t fill)'}`}
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

/**
 * Calculate binomial probability P(X = k) = C(n,k) * p^k * (1-p)^(n-k)
 */
function binomialProbability(n: number, k: number, p: number): number {
  if (k > n || k < 0) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;

  // Calculate C(n,k)
  let c = 1;
  for (let i = 0; i < k; i++) {
    c = (c * (n - i)) / (i + 1);
  }

  return c * p ** k * (1 - p) ** (n - k);
}

/**
 * Calculate expected value and distribution for accent placement
 * Now includes side accents in the calculation via distribution convolution
 */
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

  // Calculate arc accent probabilities (0 to maxAccents)
  const arcDistribution: number[] = [];
  let cumulativeBeforeMax = 0;

  for (let k = 0; k <= slots; k++) {
    const prob = binomialProbability(slots, k, arcProb);
    if (k < maxAccents) {
      arcDistribution[k] = prob;
      cumulativeBeforeMax += prob;
    } else if (k === maxAccents) {
      // Probability of exactly maxAccents or more (capped)
      arcDistribution[k] = 1 - cumulativeBeforeMax;
    }
  }

  // Calculate side accent probabilities (0, 1, or 2 side accents)
  const leftProb = enableLeftAccent ? sideProb : 0;
  const rightProb = enableRightAccent ? sideProb : 0;

  // P(side = 0), P(side = 1), P(side = 2)
  const sideDistribution = [
    (1 - leftProb) * (1 - rightProb), // 0 side accents
    leftProb * (1 - rightProb) + (1 - leftProb) * rightProb, // 1 side accent
    leftProb * rightProb, // 2 side accents
  ];

  // Convolve arc and side distributions to get total distribution
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

  // Expected arc accents (capped)
  const expectedArcRaw = slots * arcProb;
  const expectedArc = Math.min(expectedArcRaw, maxAccents);

  // Expected side accents
  const expectedSide = leftProb + rightProb;

  // Total expected
  const expectedTotal = expectedArc + expectedSide;

  // Probability ranges from combined distribution (as percentages)
  const probZero = (totalDistribution[0] ?? 0) * 100;
  const probLow = totalDistribution.slice(1, 3).reduce((sum, p) => sum + (p ?? 0), 0) * 100; // 1-2
  const probMed = totalDistribution.slice(3, 5).reduce((sum, p) => sum + (p ?? 0), 0) * 100; // 3-4
  const probHigh = totalDistribution.slice(5).reduce((sum, p) => sum + (p ?? 0), 0) * 100; // 5+

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

/**
 * Simulate a single accent placement outcome
 */
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
// Preview Components
// ============================================================================

const AccentPreview = memo(function AccentPreview({
  accentGeneration,
  isEnabled,
}: {
  accentGeneration: string;
  isEnabled: boolean;
}) {
  const getAccentPreviewSrc = () => {
    if (!accentGeneration || accentGeneration === 'none') return null;
    // Use CONFIG.ASSETS.ACCENTS for correct base URL on GitHub Pages
    return `${CONFIG.ASSETS.ACCENTS}leaves/${accentGeneration}/leaf_1.webp`;
  };

  const previewSrc = getAccentPreviewSrc();

  return (
    <div className={`${styles.previewImage} ${!isEnabled ? styles.previewDisabledState : ''}`}>
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={`${accentGeneration} accent style`}
          className={styles.accentImage}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.classList.remove(styles.hidden);
          }}
        />
      ) : null}
      <span className={`${styles.accentFallback} ${previewSrc ? styles.hidden : ''}`}>🍂</span>
    </div>
  );
});

// ============================================================================
// Visual Preview Component - Shows arc and probability
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

  // Recalculate distribution when settings change (now includes side accents)
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

  // Run simulation on settings change
  useEffect(() => {
    setArcSimulation(simulateOutcome(slots, probability, maxAccents));
    setLeftSimulation(enableLeftAccent && Math.random() * 100 < sideAccentProbability);
    setRightSimulation(enableRightAccent && Math.random() * 100 < sideAccentProbability);
  }, [slots, probability, maxAccents, enableLeftAccent, enableRightAccent, sideAccentProbability]);

  // Regenerate simulation
  const resimulate = useCallback(() => {
    setArcSimulation(simulateOutcome(slots, probability, maxAccents));
    setLeftSimulation(enableLeftAccent && Math.random() * 100 < sideAccentProbability);
    setRightSimulation(enableRightAccent && Math.random() * 100 < sideAccentProbability);
  }, [slots, probability, maxAccents, enableLeftAccent, enableRightAccent, sideAccentProbability]);

  // Calculate slot positions on arc at TOP of token
  // In screen coordinates: Y increases downward, so -90° points UP
  const slotPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];

    // Center the arc at the top (-90° in screen coordinates = up)
    const centerAngle = -90 * (Math.PI / 180);
    const halfSpan = (arcSpan / 2) * (Math.PI / 180);
    const startAngle = centerAngle - halfSpan;
    const endAngle = centerAngle + halfSpan;

    // Container is 2in, token is 1.75in (radius 0.875in)
    // Token radius as % of container: 0.875 / 2 = 43.75%
    // Accents at 78% of token radius (ACCENT_LAYOUT.ARC_ACCENTS.RADIAL_OFFSET)
    // Arc radius: 43.75% * 0.78 = 34.125%
    const tokenRadiusPercent = (0.875 / 2) * 100; // 43.75%
    const arcRadius = tokenRadiusPercent * 0.78; // ~34.1% - matches actual accent placement
    const centerX = 50; // center of 2in container
    const centerY = 50; // center of 2in container

    for (let i = 0; i < slots; i++) {
      const t = slots > 1 ? i / (slots - 1) : 0.5;
      const angle = startAngle + (endAngle - startAngle) * t;
      positions.push({
        x: centerX + arcRadius * Math.cos(angle),
        y: centerY + arcRadius * Math.sin(angle), // + because Y is inverted in screen coords
      });
    }

    return positions;
  }, [slots, arcSpan]);

  // Side accent positions (at 88% of token radius - SIDE_ACCENTS.RADIAL_OFFSET)
  const sideAccentRadius = (0.875 / 2) * 100 * 0.88; // ~38.5%

  const arcFilledCount = arcSimulation.filter(Boolean).length;
  const totalFilledCount = arcFilledCount + (leftSimulation ? 1 : 0) + (rightSimulation ? 1 : 0);

  return (
    <div className={styles.visualPreview}>
      {/* Arc visualization */}
      <div
        className={styles.arcContainer}
        onClick={resimulate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            resimulate();
          }
        }}
        role="button"
        tabIndex={0}
        title="Click to resimulate"
      >
        <div className={styles.arcVisualization}>
          {/* Token circle */}
          <div className={styles.tokenCircle} />

          {/* Left side accent marker */}
          {enableLeftAccent && (
            <div
              className={`${styles.slotMarker} ${styles.sideAccentMarker} ${leftSimulation ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${50 - sideAccentRadius}%`, top: '50%' }}
              title="Left accent"
            />
          )}

          {/* Right side accent marker */}
          {enableRightAccent && (
            <div
              className={`${styles.slotMarker} ${styles.sideAccentMarker} ${rightSimulation ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${50 + sideAccentRadius}%`, top: '50%' }}
              title="Right accent"
            />
          )}

          {/* Arc slot markers */}
          {/* Static positions array, using compound key with position */}
          {slotPositions.map((pos, i) => (
            <div
              key={`slot-${pos.x}-${pos.y}-${i}`}
              className={`${styles.slotMarker} ${arcSimulation[i] ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
          ))}
        </div>
      </div>

      {/* Distribution bar - shows combined arc + side accent probabilities */}
      <div className={styles.distributionSection}>
        <div className={styles.distributionTitle}>Total Distribution</div>
        <div className={styles.distributionBar}>
          {stats.probZero > 1 && (
            <div
              className={`${styles.distributionSegment}`}
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

        {/* Stats - now includes side accents */}
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
// Main Component
// ============================================================================

export const AccentSettingsSelector = memo(function AccentSettingsSelector({
  generationOptions,
  onOptionChange,
  projectId,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: AccentSettingsSelectorProps) {
  const [showAssetModal, setShowAssetModal] = useState(false);

  const isEnabled = generationOptions.accentEnabled !== false;
  const currentAccentStyle = generationOptions.accentGeneration || 'classic';

  const currentSettings: PendingAccentSettings = {
    maximumAccents: generationOptions.maximumAccents ?? 5,
    accentPopulationProbability: generationOptions.accentPopulationProbability ?? 30,
    accentArcSpan: generationOptions.accentArcSpan ?? 120,
    accentSlots: generationOptions.accentSlots ?? 7,
    enableLeftAccent: generationOptions.enableLeftAccent ?? true,
    enableRightAccent: generationOptions.enableRightAccent ?? true,
    sideAccentProbability: generationOptions.sideAccentProbability ?? 50,
  };

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({ accentEnabled: enabled });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingAccentSettings) => {
      onOptionChange({
        maximumAccents: settings.maximumAccents,
        accentPopulationProbability: settings.accentPopulationProbability,
        accentArcSpan: settings.accentArcSpan,
        accentSlots: settings.accentSlots,
        enableLeftAccent: settings.enableLeftAccent,
        enableRightAccent: settings.enableRightAccent,
        sideAccentProbability: settings.sideAccentProbability,
      });
    },
    [onOptionChange]
  );

  const handleAccentStyleChange = useCallback(
    (styleId: string) => {
      onOptionChange({ accentGeneration: styleId });
    },
    [onOptionChange]
  );

  const handleAssetChange = useCallback(
    (assetId: string) => {
      onOptionChange({ accentGeneration: assetId });
      setShowAssetModal(false);
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingAccentSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 380,
    minPanelWidth: 580,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;
  // Max arc accents is limited by the number of arc slots (side accents are separate)
  const currentMaxAccentsLimit = displaySettings.accentSlots;

  const defaultSettings: PendingAccentSettings = {
    maximumAccents: 5,
    accentPopulationProbability: 30,
    accentArcSpan: 120,
    accentSlots: 7,
    enableLeftAccent: true,
    enableRightAccent: true,
    sideAccentProbability: 50,
  };

  const EnableToggle = (
    <div className={optionStyles.inboxToggle}>
      <button
        type="button"
        className={`${optionStyles.inboxToggleButton} ${!isEnabled ? optionStyles.inboxToggleButtonActive : ''}`}
        onClick={() => handleToggle(false)}
      >
        Off
      </button>
      <button
        type="button"
        className={`${optionStyles.inboxToggleButton} ${isEnabled ? optionStyles.inboxToggleButtonActive : ''}`}
        onClick={() => handleToggle(true)}
      >
        On
      </button>
    </div>
  );

  const renderPanel = () => {
    if (!(panel.isExpanded && panel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panel.panelPosition.openUpward ? 'auto' : panel.panelPosition.top,
      bottom: panel.panelPosition.openUpward
        ? window.innerHeight - panel.panelPosition.top
        : 'auto',
      left: panel.panelPosition.left,
      width: panel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={panel.panelRef}
        className={`${baseStyles.panel} ${panel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={styles.threePanelLayout}>
          {/* LEFT PANEL - Accent Style Selection */}
          <div className={styles.leftPanel}>
            <div className={styles.panelTitle}>Accent Style</div>
            <div className={styles.imageGrid}>
              {ACCENT_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`${styles.imageOption} ${currentAccentStyle === style.id ? styles.imageOptionSelected : ''}`}
                  onClick={() => handleAccentStyleChange(style.id)}
                  title={style.label}
                >
                  <img
                    src={`${CONFIG.ASSETS.ACCENTS}leaves/${style.id}/leaf_1.webp`}
                    alt={style.label}
                    className={styles.imageOptionImg}
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = '🍂';
                    }}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.changeButton}
              onClick={() => setShowAssetModal(true)}
            >
              Browse All...
            </button>
          </div>

          {/* MIDDLE PANEL - Settings */}
          <div className={styles.middlePanel}>
            <div className={styles.panelTitle}>Settings</div>

            {/* Arc Accents Section */}
            <div className={styles.sectionDivider}>
              <span>Arc Accents</span>
            </div>

            {/* Combined Arc Slots + Max Accents Control */}
            <ArcSlotControl
              slots={panel.pendingValue.accentSlots}
              maxAccents={Math.min(panel.pendingValue.maximumAccents, currentMaxAccentsLimit)}
              onSlotsChange={(v) => panel.updatePendingField('accentSlots', v)}
              onMaxAccentsChange={(v) => panel.updatePendingField('maximumAccents', v)}
            />

            {/* Arc Span */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Arc Span"
                value={panel.pendingValue.accentArcSpan}
                onChange={(v) => panel.updatePendingField('accentArcSpan', v)}
                min={30}
                max={180}
                step={10}
                suffix="°"
                defaultValue={120}
              />
            </div>

            {/* Probability */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Accent Probability"
                value={panel.pendingValue.accentPopulationProbability}
                onChange={(v) => panel.updatePendingField('accentPopulationProbability', v)}
                min={0}
                max={100}
                step={5}
                suffix="%"
                defaultValue={30}
              />
            </div>

            {/* Side Accents Section Divider */}
            <div className={styles.sectionDivider}>
              <span>Side Accents</span>
            </div>

            {/* Left/Right Accent Toggles */}
            <div className={styles.settingGroup}>
              <div className={styles.checkboxRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={panel.pendingValue.enableLeftAccent}
                    onChange={(e) => panel.updatePendingField('enableLeftAccent', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Left Accent</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={panel.pendingValue.enableRightAccent}
                    onChange={(e) => panel.updatePendingField('enableRightAccent', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Right Accent</span>
                </label>
              </div>
            </div>

            {/* Side Accent Probability */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Side Prob."
                value={panel.pendingValue.sideAccentProbability}
                onChange={(v) => panel.updatePendingField('sideAccentProbability', v)}
                min={0}
                max={100}
                step={5}
                suffix="%"
                defaultValue={50}
                disabled={
                  !(panel.pendingValue.enableLeftAccent || panel.pendingValue.enableRightAccent)
                }
              />
            </div>
          </div>

          {/* RIGHT PANEL - Visual Preview */}
          <div className={styles.rightPanel}>
            <div className={styles.panelTitle}>Preview</div>
            <VisualPreview
              slots={panel.pendingValue.accentSlots}
              probability={panel.pendingValue.accentPopulationProbability}
              maxAccents={Math.min(panel.pendingValue.maximumAccents, currentMaxAccentsLimit)}
              arcSpan={panel.pendingValue.accentArcSpan}
              enableLeftAccent={panel.pendingValue.enableLeftAccent}
              enableRightAccent={panel.pendingValue.enableRightAccent}
              sideAccentProbability={panel.pendingValue.sideAccentProbability}
            />
          </div>
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => panel.reset(defaultSettings)}
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button type="button" className={baseStyles.cancelButton} onClick={panel.cancel}>
              Cancel
            </button>
            <button type="button" className={baseStyles.confirmButton} onClick={panel.apply}>
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <SettingsSelectorBase
        ref={panel.containerRef}
        preview={
          <PreviewBox shape="square" size={size}>
            <AccentPreview accentGeneration={currentAccentStyle} isEnabled={isEnabled} />
          </PreviewBox>
        }
        info={<InfoSection label="Accents" />}
        headerSlot={EnableToggle}
        actionLabel="Customize"
        onAction={panel.toggle}
        isExpanded={panel.isExpanded}
        disabled={disabled}
        visuallyDisabled={!isEnabled}
        size={size}
        ariaLabel={ariaLabel ?? 'Accent settings'}
        onKeyDown={panel.handleKeyDown}
      >
        {renderPanel()}
      </SettingsSelectorBase>

      {showAssetModal && (
        <AssetManagerModal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          onSelectAsset={handleAssetChange}
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

export default AccentSettingsSelector;
