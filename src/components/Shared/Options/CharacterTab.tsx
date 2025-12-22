import { memo, useState } from 'react';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { AssetPreviewSelector } from '@/components/Shared/Selectors/AssetPreviewSelector';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import { OptionGroup } from '@/components/Shared/UI/OptionGroup';
import { SegmentedControl } from '@/components/Shared/UI/SegmentedControl';
import styles from '@/styles/components/options/OptionsTab.module.css';
import type { GenerationOptions } from '@/ts/types/index';

interface CharacterTabProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
}

type SubTabType = 'background' | 'name' | 'ability' | 'decoratives' | 'qol';

export const CharacterTab = memo(
  ({ generationOptions, onOptionChange, projectId }: CharacterTabProps) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTabType>('background');

    const handleFontSpacingChange = (type: string, value: number) => {
      const currentSpacing = generationOptions.fontSpacing || {
        characterName: 0,
        abilityText: 0,
        reminderText: 0,
        metaText: 0,
      };
      onOptionChange({
        fontSpacing: {
          ...currentSpacing,
          [type]: value,
        },
      });
    };

    const handleTextShadowChange = (type: string, value: number) => {
      const currentShadow = generationOptions.textShadow || {
        characterName: 4,
        abilityText: 3,
        reminderText: 4,
        metaText: 4,
      };
      onOptionChange({
        textShadow: {
          ...currentShadow,
          [type]: value,
        },
      });
    };

    return (
      <div className={styles.tabContent} data-tab-content="character">
        <div className={styles.subtabsContainer}>
          <div className={styles.subtabsNav}>
            <button
              type="button"
              className={`${styles.subtabButton} ${activeSubTab === 'background' ? styles.active : ''}`}
              onClick={() => setActiveSubTab('background')}
            >
              Background
            </button>
            <button
              type="button"
              className={`${styles.subtabButton} ${activeSubTab === 'name' ? styles.active : ''}`}
              onClick={() => setActiveSubTab('name')}
            >
              Font
            </button>
            <button
              type="button"
              className={`${styles.subtabButton} ${activeSubTab === 'ability' ? styles.active : ''}`}
              onClick={() => setActiveSubTab('ability')}
            >
              Ability
            </button>
            <button
              type="button"
              className={`${styles.subtabButton} ${activeSubTab === 'decoratives' ? styles.active : ''}`}
              onClick={() => setActiveSubTab('decoratives')}
            >
              Decoratives
            </button>
            <button
              type="button"
              className={`${styles.subtabButton} ${activeSubTab === 'qol' ? styles.active : ''}`}
              onClick={() => setActiveSubTab('qol')}
            >
              QoL
            </button>
          </div>

          {/* Background Sub-Tab */}
          {activeSubTab === 'background' && (
            <div className={styles.subtabContent}>
              <div className={styles.subsection}>
                <OptionGroup label="Type">
                  <SegmentedControl
                    options={[
                      { value: 'image', label: 'Image' },
                      { value: 'color', label: 'Color' },
                    ]}
                    value={generationOptions.characterBackgroundType || 'image'}
                    onChange={(value) =>
                      onOptionChange({ characterBackgroundType: value as 'color' | 'image' })
                    }
                  />
                </OptionGroup>

                {/* Direct selector without wrapper - matches AppearancePanel */}
                {generationOptions.characterBackgroundType === 'color' ? (
                  <ColorPreviewSelector
                    value={generationOptions.characterBackgroundColor || '#FFFFFF'}
                    onChange={(value) => onOptionChange({ characterBackgroundColor: value })}
                    shape="circle"
                  />
                ) : (
                  <AssetPreviewSelector
                    value={generationOptions.characterBackground || 'character_background_1'}
                    onChange={(value) => onOptionChange({ characterBackground: value })}
                    assetType="token-background"
                    shape="circle"
                    showNone={false}
                    projectId={projectId}
                    generationOptions={generationOptions}
                  />
                )}
              </div>
            </div>
          )}

          {/* Name Sub-Tab */}
          {activeSubTab === 'name' && (
            <div className={styles.subtabContent}>
              <div className={styles.subsection}>
                <OptionGroup
                  label="Font"
                  description="Select the typeface used to display character names on tokens."
                >
                  <select
                    className={styles.selectInput}
                    value={generationOptions.characterNameFont}
                    onChange={(e) => onOptionChange({ characterNameFont: e.target.value })}
                  >
                    <option value="Dumbledor">Dumbledor</option>
                    <option value="DumbledorThin">Dumbledor Thin</option>
                    <option value="DumbledorWide">Dumbledor Wide</option>
                  </select>
                </OptionGroup>

                <OptionGroup label="Color" description="Choose the text color for character names.">
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={generationOptions.characterNameColor}
                    onChange={(e) => onOptionChange({ characterNameColor: e.target.value })}
                  />
                </OptionGroup>

                <OptionGroup
                  label="Font Spacing"
                  description="Adjust the horizontal spacing between letters in the character name. Higher values spread letters apart."
                  isSlider
                >
                  <EditableSlider
                    value={generationOptions.fontSpacing?.characterName || 0}
                    onChange={(value) => handleFontSpacingChange('characterName', value)}
                    min={0}
                    max={20}
                    defaultValue={0}
                    suffix="px"
                    ariaLabel="Character Name Font Spacing value"
                  />
                </OptionGroup>

                <OptionGroup label="Text Shadow" helpText="Adjust text shadow intensity" isSlider>
                  <EditableSlider
                    value={generationOptions.textShadow?.characterName || 0}
                    onChange={(value) => handleTextShadowChange('characterName', value)}
                    min={0}
                    max={20}
                    defaultValue={4}
                    suffix="px"
                    ariaLabel="Character Name Text Shadow value"
                  />
                </OptionGroup>
              </div>
            </div>
          )}

          {/* Ability Sub-Tab */}
          {activeSubTab === 'ability' && (
            <div className={styles.subtabContent}>
              <div className={styles.subsection}>
                <OptionGroup
                  label="Display Ability Text"
                  helpText="Display ability text on character tokens"
                >
                  <input
                    type="checkbox"
                    className={styles.toggleSwitch}
                    checked={generationOptions.displayAbilityText}
                    onChange={(e) => onOptionChange({ displayAbilityText: e.target.checked })}
                  />
                </OptionGroup>

                <OptionGroup label="Font" helpText="Font for ability text display">
                  <select
                    className={styles.selectInput}
                    value={generationOptions.abilityTextFont}
                    onChange={(e) => onOptionChange({ abilityTextFont: e.target.value })}
                  >
                    <option value="TradeGothic">Trade Gothic</option>
                    <option value="TradeGothicBold">Trade Gothic Bold</option>
                  </select>
                </OptionGroup>

                <OptionGroup label="Color" helpText="Color for ability text">
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={generationOptions.abilityTextColor}
                    onChange={(e) => onOptionChange({ abilityTextColor: e.target.value })}
                  />
                </OptionGroup>

                <OptionGroup
                  label="Font Spacing"
                  helpText="Adjust spacing between ability text characters"
                  isSlider
                >
                  <EditableSlider
                    value={generationOptions.fontSpacing?.abilityText || 0}
                    onChange={(value) => handleFontSpacingChange('abilityText', value)}
                    min={0}
                    max={20}
                    defaultValue={0}
                    suffix="px"
                    ariaLabel="Ability Text Font Spacing value"
                  />
                </OptionGroup>

                <OptionGroup label="Text Shadow" helpText="Adjust text shadow intensity" isSlider>
                  <EditableSlider
                    value={generationOptions.textShadow?.abilityText || 0}
                    onChange={(value) => handleTextShadowChange('abilityText', value)}
                    min={0}
                    max={20}
                    defaultValue={3}
                    suffix="px"
                    ariaLabel="Ability Text Shadow value"
                  />
                </OptionGroup>
              </div>
            </div>
          )}

          {/* Decoratives Sub-Tab */}
          {activeSubTab === 'decoratives' && (
            <div className={styles.subtabContent}>
              <div className={styles.subsection}>
                {/* Setup Overlay - clean selector matching AppearancePanel style */}
                <AssetPreviewSelector
                  value={generationOptions.setupStyle || 'setup_flower_1'}
                  onChange={(value) => onOptionChange({ setupStyle: value })}
                  assetType="setup-overlay"
                  shape="square"
                  showNone={false}
                  projectId={projectId}
                  generationOptions={generationOptions}
                />

                <OptionGroup
                  label="Maximum Accents"
                  helpText="Maximum number of accents to generate (0 = disabled)"
                  isSlider
                >
                  <EditableSlider
                    value={Math.min(
                      generationOptions.maximumAccents ?? 0,
                      (generationOptions.accentSlots || 7) + 2
                    )}
                    onChange={(value) => onOptionChange({ maximumAccents: value })}
                    min={0}
                    max={(generationOptions.accentSlots || 7) + 2}
                    defaultValue={0}
                    suffix=""
                    ariaLabel="Maximum Accents value"
                  />
                </OptionGroup>

                {(generationOptions.maximumAccents ?? 0) > 0 && (
                  <>
                    {/* Accent Style - clean selector */}
                    <AssetPreviewSelector
                      value={generationOptions.accentGeneration || 'classic'}
                      onChange={(value) => onOptionChange({ accentGeneration: value })}
                      assetType="accent"
                      shape="square"
                      showNone={false}
                      projectId={projectId}
                      generationOptions={generationOptions}
                    />

                    <OptionGroup
                      label="Accent Probability"
                      helpText="Chance of each position spawning an accent (0-100%)"
                      isSlider
                    >
                      <EditableSlider
                        value={generationOptions.accentPopulationProbability || 30}
                        onChange={(value) => onOptionChange({ accentPopulationProbability: value })}
                        min={0}
                        max={100}
                        defaultValue={30}
                        suffix="%"
                        ariaLabel="Accent Population Probability value"
                      />
                    </OptionGroup>

                    <OptionGroup
                      label="Arc Span"
                      helpText="Width of the arc for top accents in degrees (30-180)"
                      isSlider
                    >
                      <EditableSlider
                        value={generationOptions.accentArcSpan || 120}
                        onChange={(value) => onOptionChange({ accentArcSpan: value })}
                        min={30}
                        max={180}
                        defaultValue={120}
                        suffix="°"
                        ariaLabel="Accent Arc Span value"
                      />
                    </OptionGroup>

                    <OptionGroup
                      label="Arc Slots"
                      helpText="Number of accent positions along the top arc (3-15)"
                      isSlider
                    >
                      <EditableSlider
                        value={generationOptions.accentSlots || 7}
                        onChange={(value) => onOptionChange({ accentSlots: value })}
                        min={3}
                        max={15}
                        defaultValue={7}
                        suffix=""
                        ariaLabel="Accent Arc Slots value"
                      />
                    </OptionGroup>
                  </>
                )}
              </div>
            </div>
          )}

          {/* QoL Sub-Tab */}
          {activeSubTab === 'qol' && (
            <div className={styles.subtabContent}>
              <div className={styles.subsection}>
                <OptionGroup
                  label="Show Reminder Count"
                  helpText="Show reminder count on character tokens"
                >
                  <input
                    type="checkbox"
                    className={styles.toggleSwitch}
                    checked={generationOptions.tokenCount}
                    onChange={(e) => onOptionChange({ tokenCount: e.target.checked })}
                  />
                </OptionGroup>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

CharacterTab.displayName = 'CharacterTab';
