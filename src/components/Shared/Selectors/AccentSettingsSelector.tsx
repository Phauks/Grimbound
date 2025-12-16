/**
 * AccentSettingsSelector Component
 *
 * A three-panel settings selector for token accent/leaf decorations:
 * - Left: Leaf style image selection
 * - Middle: Numeric settings (max leaves, probability, arc span, slots)
 * - Right: Visual preview showing probability outcomes
 *
 * The visual preview helps users understand the probabilistic nature of
 * leaf placement by showing simulated outcomes and distribution stats.
 *
 * @module components/Shared/AccentSettingsSelector
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '../../../hooks/useExpandablePanel';
import optionStyles from '../../../styles/components/options/OptionsPanel.module.css';
import styles from '../../../styles/components/shared/AccentSettingsSelector.module.css';
import baseStyles from '../../../styles/components/shared/SettingsSelectorBase.module.css';
import type { GenerationOptions } from '../../../ts/types/index';
import { AssetManagerModal } from '../../Modals/AssetManagerModal';
import { EditableSlider } from '../Controls/EditableSlider';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface AccentSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface PendingLeafSettings {
  maximumLeaves: number;
  leafPopulationProbability: number;
  leafArcSpan: number;
  leafSlots: number;
  enableLeftLeaf: boolean;
  enableRightLeaf: boolean;
  sideLeafProbability: number;
}

// Built-in leaf styles (only classic available for now)
const LEAF_STYLES = [{ id: 'classic', label: 'Classic' }];

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
 * Calculate expected value and distribution for leaf placement
 * Now includes side leaves in the calculation via distribution convolution
 */
function calculateDistribution(
  slots: number,
  probability: number,
  maxLeaves: number,
  enableLeftLeaf: boolean,
  enableRightLeaf: boolean,
  sideLeafProbability: number
) {
  const arcProb = probability / 100;
  const sideProb = sideLeafProbability / 100;

  // Calculate arc leaf probabilities (0 to maxLeaves)
  const arcDistribution: number[] = [];
  let cumulativeBeforeMax = 0;

  for (let k = 0; k <= slots; k++) {
    const prob = binomialProbability(slots, k, arcProb);
    if (k < maxLeaves) {
      arcDistribution[k] = prob;
      cumulativeBeforeMax += prob;
    } else if (k === maxLeaves) {
      // Probability of exactly maxLeaves or more (capped)
      arcDistribution[k] = 1 - cumulativeBeforeMax;
    }
  }

  // Calculate side leaf probabilities (0, 1, or 2 side leaves)
  const leftProb = enableLeftLeaf ? sideProb : 0;
  const rightProb = enableRightLeaf ? sideProb : 0;

  // P(side = 0), P(side = 1), P(side = 2)
  const sideDistribution = [
    (1 - leftProb) * (1 - rightProb), // 0 side leaves
    leftProb * (1 - rightProb) + (1 - leftProb) * rightProb, // 1 side leaf
    leftProb * rightProb, // 2 side leaves
  ];

  // Convolve arc and side distributions to get total distribution
  const maxSideLeaves = (enableLeftLeaf ? 1 : 0) + (enableRightLeaf ? 1 : 0);
  const maxTotal = maxLeaves + maxSideLeaves;
  const totalDistribution: number[] = new Array(maxTotal + 1).fill(0);

  for (let arc = 0; arc <= maxLeaves; arc++) {
    const arcP = arcDistribution[arc] ?? 0;
    for (let side = 0; side <= maxSideLeaves; side++) {
      const sideP = sideDistribution[side] ?? 0;
      const total = arc + side;
      if (total <= maxTotal) {
        totalDistribution[total] += arcP * sideP;
      }
    }
  }

  // Expected arc leaves (capped)
  const expectedArcRaw = slots * arcProb;
  const expectedArc = Math.min(expectedArcRaw, maxLeaves);

  // Expected side leaves
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
    maxArc: maxLeaves,
    maxTotal,
    probZero,
    probLow,
    probMed,
    probHigh,
    totalDistribution,
  };
}

/**
 * Simulate a single leaf placement outcome
 */
function simulateOutcome(slots: number, probability: number, maxLeaves: number): boolean[] {
  const p = probability / 100;
  const result: boolean[] = [];
  let count = 0;

  for (let i = 0; i < slots; i++) {
    const filled = Math.random() < p && count < maxLeaves;
    result.push(filled);
    if (filled) count++;
  }

  return result;
}

// ============================================================================
// Preview Components
// ============================================================================

const LeafPreview = memo(function LeafPreview({
  leafGeneration,
  isEnabled,
}: {
  leafGeneration: string;
  isEnabled: boolean;
}) {
  const getLeafPreviewSrc = () => {
    if (!leafGeneration || leafGeneration === 'none') return null;
    return `/assets/images/leaves/${leafGeneration}/leaf_1.webp`;
  };

  const previewSrc = getLeafPreviewSrc();

  return (
    <div className={`${styles.previewImage} ${!isEnabled ? styles.previewDisabledState : ''}`}>
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={`${leafGeneration} leaf style`}
          className={styles.leafImage}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.classList.remove(styles.hidden);
          }}
        />
      ) : null}
      <span className={`${styles.leafFallback} ${previewSrc ? styles.hidden : ''}`}>🍂</span>
    </div>
  );
});

// ============================================================================
// Visual Preview Component - Shows arc and probability
// ============================================================================

const VisualPreview = memo(function VisualPreview({
  slots,
  probability,
  maxLeaves,
  arcSpan,
  enableLeftLeaf,
  enableRightLeaf,
  sideLeafProbability,
}: {
  slots: number;
  probability: number;
  maxLeaves: number;
  arcSpan: number;
  enableLeftLeaf: boolean;
  enableRightLeaf: boolean;
  sideLeafProbability: number;
}) {
  const [arcSimulation, setArcSimulation] = useState<boolean[]>([]);
  const [leftSimulation, setLeftSimulation] = useState(false);
  const [rightSimulation, setRightSimulation] = useState(false);

  // Recalculate distribution when settings change (now includes side leaves)
  const stats = useMemo(
    () =>
      calculateDistribution(
        slots,
        probability,
        maxLeaves,
        enableLeftLeaf,
        enableRightLeaf,
        sideLeafProbability
      ),
    [slots, probability, maxLeaves, enableLeftLeaf, enableRightLeaf, sideLeafProbability]
  );

  // Run simulation on settings change
  useEffect(() => {
    setArcSimulation(simulateOutcome(slots, probability, maxLeaves));
    setLeftSimulation(enableLeftLeaf && Math.random() * 100 < sideLeafProbability);
    setRightSimulation(enableRightLeaf && Math.random() * 100 < sideLeafProbability);
  }, [slots, probability, maxLeaves, enableLeftLeaf, enableRightLeaf, sideLeafProbability]);

  // Regenerate simulation
  const resimulate = useCallback(() => {
    setArcSimulation(simulateOutcome(slots, probability, maxLeaves));
    setLeftSimulation(enableLeftLeaf && Math.random() * 100 < sideLeafProbability);
    setRightSimulation(enableRightLeaf && Math.random() * 100 < sideLeafProbability);
  }, [slots, probability, maxLeaves, enableLeftLeaf, enableRightLeaf, sideLeafProbability]);

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
    // Leaves at 78% of token radius (LEAF_LAYOUT.ARC_LEAVES.RADIAL_OFFSET)
    // Arc radius: 43.75% * 0.78 = 34.125%
    const tokenRadiusPercent = (0.875 / 2) * 100; // 43.75%
    const arcRadius = tokenRadiusPercent * 0.78; // ~34.1% - matches actual leaf placement
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

  // Side leaf positions (at 88% of token radius - SIDE_LEAVES.RADIAL_OFFSET)
  const sideLeafRadius = (0.875 / 2) * 100 * 0.88; // ~38.5%

  const arcFilledCount = arcSimulation.filter(Boolean).length;
  const totalFilledCount = arcFilledCount + (leftSimulation ? 1 : 0) + (rightSimulation ? 1 : 0);

  return (
    <div className={styles.visualPreview}>
      {/* Arc visualization */}
      <div className={styles.arcContainer} onClick={resimulate} title="Click to resimulate">
        <div className={styles.arcVisualization}>
          {/* Token circle */}
          <div className={styles.tokenCircle} />

          {/* Left side leaf marker */}
          {enableLeftLeaf && (
            <div
              className={`${styles.slotMarker} ${styles.sideLeafMarker} ${leftSimulation ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${50 - sideLeafRadius}%`, top: '50%' }}
              title="Left leaf"
            />
          )}

          {/* Right side leaf marker */}
          {enableRightLeaf && (
            <div
              className={`${styles.slotMarker} ${styles.sideLeafMarker} ${rightSimulation ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${50 + sideLeafRadius}%`, top: '50%' }}
              title="Right leaf"
            />
          )}

          {/* Arc slot markers */}
          {slotPositions.map((pos, i) => (
            <div
              key={i}
              className={`${styles.slotMarker} ${arcSimulation[i] ? styles.slotMarkerFilled : styles.slotMarkerPossible}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
          ))}
        </div>
      </div>

      {/* Distribution bar - shows combined arc + side leaf probabilities */}
      <div className={styles.distributionSection}>
        <div className={styles.distributionTitle}>Total Distribution</div>
        <div className={styles.distributionBar}>
          {stats.probZero > 1 && (
            <div
              className={`${styles.distributionSegment}`}
              style={{ width: `${stats.probZero}%`, background: 'var(--text-muted)' }}
              title={`${stats.probZero.toFixed(0)}% chance of 0 total leaves`}
            >
              {stats.probZero > 10 ? '0' : ''}
            </div>
          )}
          {stats.probLow > 1 && (
            <div
              className={`${styles.distributionSegment} ${styles.distributionLow}`}
              style={{ width: `${stats.probLow}%` }}
              title={`${stats.probLow.toFixed(0)}% chance of 1-2 total leaves`}
            >
              {stats.probLow > 10 ? '1-2' : ''}
            </div>
          )}
          {stats.probMed > 1 && (
            <div
              className={`${styles.distributionSegment} ${styles.distributionMed}`}
              style={{ width: `${stats.probMed}%` }}
              title={`${stats.probMed.toFixed(0)}% chance of 3-4 total leaves`}
            >
              {stats.probMed > 10 ? '3-4' : ''}
            </div>
          )}
          {stats.probHigh > 1 && (
            <div
              className={`${styles.distributionSegment} ${styles.distributionHigh}`}
              style={{ width: `${stats.probHigh}%` }}
              title={`${stats.probHigh.toFixed(0)}% chance of 5+ total leaves`}
            >
              {stats.probHigh > 10 ? '5+' : ''}
            </div>
          )}
        </div>

        {/* Stats - now includes side leaves */}
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

  const isEnabled = generationOptions.leafEnabled !== false;
  const currentLeafStyle = generationOptions.leafGeneration || 'classic';

  const currentSettings: PendingLeafSettings = {
    maximumLeaves: generationOptions.maximumLeaves ?? 5,
    leafPopulationProbability: generationOptions.leafPopulationProbability ?? 30,
    leafArcSpan: generationOptions.leafArcSpan ?? 120,
    leafSlots: generationOptions.leafSlots ?? 7,
    enableLeftLeaf: generationOptions.enableLeftLeaf ?? true,
    enableRightLeaf: generationOptions.enableRightLeaf ?? true,
    sideLeafProbability: generationOptions.sideLeafProbability ?? 50,
  };

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({ leafEnabled: enabled });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingLeafSettings) => {
      onOptionChange({
        maximumLeaves: settings.maximumLeaves,
        leafPopulationProbability: settings.leafPopulationProbability,
        leafArcSpan: settings.leafArcSpan,
        leafSlots: settings.leafSlots,
        enableLeftLeaf: settings.enableLeftLeaf,
        enableRightLeaf: settings.enableRightLeaf,
        sideLeafProbability: settings.sideLeafProbability,
      });
    },
    [onOptionChange]
  );

  const handleLeafStyleChange = useCallback(
    (styleId: string) => {
      onOptionChange({ leafGeneration: styleId });
    },
    [onOptionChange]
  );

  const handleAssetChange = useCallback(
    (assetId: string) => {
      onOptionChange({ leafGeneration: assetId });
      setShowAssetModal(false);
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingLeafSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 340,
    minPanelWidth: 580,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;
  const currentMaxLeavesLimit = displaySettings.leafSlots + 2;

  const getSummary = () => {
    if (!isEnabled) return 'Disabled';
    return `${displaySettings.maximumLeaves} max · ${displaySettings.leafPopulationProbability}%`;
  };

  const defaultSettings: PendingLeafSettings = {
    maximumLeaves: 5,
    leafPopulationProbability: 30,
    leafArcSpan: 120,
    leafSlots: 7,
    enableLeftLeaf: true,
    enableRightLeaf: true,
    sideLeafProbability: 50,
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
          {/* LEFT PANEL - Leaf Style Selection */}
          <div className={styles.leftPanel}>
            <div className={styles.panelTitle}>Leaf Style</div>
            <div className={styles.imageGrid}>
              {LEAF_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`${styles.imageOption} ${currentLeafStyle === style.id ? styles.imageOptionSelected : ''}`}
                  onClick={() => handleLeafStyleChange(style.id)}
                  title={style.label}
                >
                  <img
                    src={`/assets/images/leaves/${style.id}/leaf_1.webp`}
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

            {/* Max Leaves */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Max Leaves"
                value={Math.min(panel.pendingValue.maximumLeaves, currentMaxLeavesLimit)}
                onChange={(v) => panel.updatePendingField('maximumLeaves', v)}
                min={1}
                max={currentMaxLeavesLimit}
                suffix=""
                defaultValue={5}
              />
            </div>

            {/* Probability */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Probability"
                value={panel.pendingValue.leafPopulationProbability}
                onChange={(v) => panel.updatePendingField('leafPopulationProbability', v)}
                min={0}
                max={100}
                step={5}
                suffix="%"
                defaultValue={30}
              />
            </div>

            {/* Arc Span */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Arc Span"
                value={panel.pendingValue.leafArcSpan}
                onChange={(v) => panel.updatePendingField('leafArcSpan', v)}
                min={30}
                max={180}
                step={10}
                suffix="°"
                defaultValue={120}
              />
            </div>

            {/* Arc Slots */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Arc Slots"
                value={panel.pendingValue.leafSlots}
                onChange={(v) => {
                  panel.updatePendingField('leafSlots', v);
                  const newLimit = v + 2;
                  if (panel.pendingValue.maximumLeaves > newLimit) {
                    panel.updatePendingField('maximumLeaves', newLimit);
                  }
                }}
                min={3}
                max={15}
                suffix=""
                defaultValue={7}
              />
            </div>

            {/* Side Leaves Section Divider */}
            <div className={styles.sectionDivider}>
              <span>Side Leaves</span>
            </div>

            {/* Left/Right Leaf Toggles */}
            <div className={styles.settingGroup}>
              <div className={styles.checkboxRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={panel.pendingValue.enableLeftLeaf}
                    onChange={(e) => panel.updatePendingField('enableLeftLeaf', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Left Leaf</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={panel.pendingValue.enableRightLeaf}
                    onChange={(e) => panel.updatePendingField('enableRightLeaf', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Right Leaf</span>
                </label>
              </div>
            </div>

            {/* Side Leaf Probability */}
            <div className={styles.settingGroup}>
              <EditableSlider
                label="Side Prob."
                value={panel.pendingValue.sideLeafProbability}
                onChange={(v) => panel.updatePendingField('sideLeafProbability', v)}
                min={0}
                max={100}
                step={5}
                suffix="%"
                defaultValue={50}
                disabled={
                  !(panel.pendingValue.enableLeftLeaf || panel.pendingValue.enableRightLeaf)
                }
              />
            </div>
          </div>

          {/* RIGHT PANEL - Visual Preview */}
          <div className={styles.rightPanel}>
            <div className={styles.panelTitle}>Preview</div>
            <VisualPreview
              slots={panel.pendingValue.leafSlots}
              probability={panel.pendingValue.leafPopulationProbability}
              maxLeaves={Math.min(panel.pendingValue.maximumLeaves, currentMaxLeavesLimit)}
              arcSpan={panel.pendingValue.leafArcSpan}
              enableLeftLeaf={panel.pendingValue.enableLeftLeaf}
              enableRightLeaf={panel.pendingValue.enableRightLeaf}
              sideLeafProbability={panel.pendingValue.sideLeafProbability}
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
            <LeafPreview leafGeneration={currentLeafStyle} isEnabled={isEnabled} />
          </PreviewBox>
        }
        info={<InfoSection label="Accents" summary={getSummary()} />}
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
          initialAssetType="leaf"
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
