import { memo, useState } from 'react';
import styles from '../../../styles/components/options/OptionsTab.module.css';
import type { GenerationOptions } from '../../../ts/types/index';
import { SliderWithValue } from '../Controls/SliderWithValue';
import { OptionGroup } from '../UI/OptionGroup';
import { SegmentedControl } from '../UI/SegmentedControl';

interface ReminderTabProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
}

type SubTabType = 'background' | 'text';

export const ReminderTab = memo(({ generationOptions, onOptionChange }: ReminderTabProps) => {
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
    <div className={styles.tabContent} data-tab-content="reminder">
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
            className={`${styles.subtabButton} ${activeSubTab === 'text' ? styles.active : ''}`}
            onClick={() => setActiveSubTab('text')}
          >
            Font
          </button>
        </div>

        {/* Background Sub-Tab */}
        {activeSubTab === 'background' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup
                label="Background Type"
                description="Choose between a solid color or image background."
              >
                <SegmentedControl
                  options={[
                    { value: 'color', label: 'Color' },
                    { value: 'image', label: 'Image' },
                  ]}
                  value={generationOptions.reminderBackgroundType || 'color'}
                  onChange={(value) =>
                    onOptionChange({ reminderBackgroundType: value as 'color' | 'image' })
                  }
                />
              </OptionGroup>

              {generationOptions.reminderBackgroundType === 'color' ? (
                <OptionGroup
                  label="Background Color"
                  description="Choose a solid background color for reminder tokens."
                >
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={generationOptions.reminderBackground}
                    onChange={(e) => onOptionChange({ reminderBackground: e.target.value })}
                  />
                </OptionGroup>
              ) : (
                <OptionGroup
                  label="Background Image"
                  description="Choose the decorative pattern for reminder tokens."
                >
                  <select
                    className={styles.selectInput}
                    value={generationOptions.reminderBackgroundImage || 'character_background_1'}
                    onChange={(e) => onOptionChange({ reminderBackgroundImage: e.target.value })}
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i + 1} value={`character_background_${i + 1}`}>
                        Background {i + 1}
                      </option>
                    ))}
                  </select>
                </OptionGroup>
              )}
            </div>
          </div>
        )}

        {/* Text Sub-Tab */}
        {activeSubTab === 'text' && (
          <div className={styles.subtabContent}>
            <div className={styles.subsection}>
              <OptionGroup label="Font" helpText="Font for reminder text">
                <select
                  className={styles.selectInput}
                  value={generationOptions.characterReminderFont}
                  onChange={(e) => onOptionChange({ characterReminderFont: e.target.value })}
                >
                  <option value="TradeGothic">Trade Gothic</option>
                  <option value="TradeGothicBold">Trade Gothic Bold</option>
                </select>
              </OptionGroup>

              <OptionGroup label="Color" helpText="Text color for reminder text">
                <input
                  type="color"
                  className={styles.colorInput}
                  value={generationOptions.reminderTextColor}
                  onChange={(e) => onOptionChange({ reminderTextColor: e.target.value })}
                />
              </OptionGroup>

              <OptionGroup
                label="Font Spacing"
                helpText="Adjust spacing between reminder text characters"
                isSlider
              >
                <SliderWithValue
                  value={generationOptions.fontSpacing?.reminderText || 0}
                  onChange={(value) => handleFontSpacingChange('reminderText', value)}
                  min={0}
                  max={20}
                  defaultValue={0}
                  unit="px"
                  ariaLabel="Reminder Text Font Spacing value"
                />
              </OptionGroup>

              <OptionGroup label="Text Shadow" helpText="Adjust text shadow intensity" isSlider>
                <SliderWithValue
                  value={generationOptions.textShadow?.reminderText || 0}
                  onChange={(value) => handleTextShadowChange('reminderText', value)}
                  min={0}
                  max={20}
                  defaultValue={4}
                  unit="px"
                  ariaLabel="Reminder Text Shadow value"
                />
              </OptionGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ReminderTab.displayName = 'ReminderTab';
