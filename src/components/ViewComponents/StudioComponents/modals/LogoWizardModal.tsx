/**
 * Logo Wizard Modal
 *
 * Step-by-step wizard for creating script logos from templates
 */

import { useCallback, useState } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useStudio } from '@/contexts/StudioContext';
import styles from '@/styles/components/studio/Studio.module.css';
import {
  applyTemplate,
  customizeTemplateWithName,
  LOGO_TEMPLATES,
  type LogoTemplate,
} from '@/ts/studio/index';
import { logger } from '@/ts/utils/logger.js';

interface LogoWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WizardStep = 'template' | 'name' | 'font' | 'colors' | 'preview';

export function LogoWizardModal({ isOpen, onClose }: LogoWizardModalProps) {
  const { addLayer, setCanvasSize: _setCanvasSize, setBackgroundColor, newProject } = useStudio();
  const { currentProject } = useProjectContext();

  const [currentStep, setCurrentStep] = useState<WizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<LogoTemplate | null>(null);
  const [scriptName, setScriptName] = useState<string>(currentProject?.name || 'Script Name');
  const [selectedFont, setSelectedFont] = useState<string>('LHF Unlovable');
  const [primaryColor, setPrimaryColor] = useState<string>('#FFFFFF');
  const [secondaryColor, setSecondaryColor] = useState<string>('#CCCCCC');

  // Available fonts (from the codebase)
  const AVAILABLE_FONTS = [
    { value: 'LHF Unlovable', label: 'Unlovable (Default)' },
    { value: 'Dumbledor', label: 'Dumbledor' },
    { value: 'TradeGothic', label: 'Trade Gothic' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Arial', label: 'Arial' },
  ];

  const handleTemplateSelect = useCallback((template: LogoTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep('name');
  }, []);

  const handleNext = useCallback(() => {
    const stepOrder: WizardStep[] = ['template', 'name', 'font', 'colors', 'preview'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    const stepOrder: WizardStep[] = ['template', 'name', 'font', 'colors', 'preview'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep]);

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate) return;

    try {
      // Customize template with user inputs
      let customized = customizeTemplateWithName(selectedTemplate, scriptName);

      // Apply font to text layers
      customized = {
        ...customized,
        layerConfigs: customized.layerConfigs.map((config) => {
          if (config.type === 'text') {
            return {
              ...config,
              font: selectedFont,
              color: config.name === 'Subtitle' ? secondaryColor : primaryColor,
            };
          }
          return config;
        }),
      };

      // Create new project with template settings
      newProject(customized.canvasSize.width, customized.canvasSize.height);
      setBackgroundColor(customized.backgroundColor);

      // Apply template layers
      const layers = await applyTemplate(customized);
      for (const layer of layers) {
        addLayer(layer);
      }

      // Close wizard
      onClose();
    } catch (error) {
      logger.error('LogoWizardModal', 'Failed to create logo', error);
      alert('Failed to create logo. Please try again.');
    }
  }, [
    selectedTemplate,
    scriptName,
    selectedFont,
    primaryColor,
    secondaryColor,
    newProject,
    setBackgroundColor,
    addLayer,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className={styles.modalHeader}>
          <h2>Create Script Logo</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Progress Indicator */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {(['template', 'name', 'font', 'colors', 'preview'] as WizardStep[]).map(
                (step, index) => (
                  <div
                    key={step}
                    style={{
                      width: '40px',
                      height: '4px',
                      backgroundColor:
                        currentStep === step
                          ? 'var(--color-primary)'
                          : index <
                              (
                                ['template', 'name', 'font', 'colors', 'preview'] as WizardStep[]
                              ).indexOf(currentStep)
                            ? 'var(--color-primary-light)'
                            : 'var(--color-border)',
                      borderRadius: '2px',
                    }}
                  />
                )
              )}
            </div>
            <div
              style={{
                textAlign: 'center',
                marginTop: '8px',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              Step{' '}
              {(['template', 'name', 'font', 'colors', 'preview'] as WizardStep[]).indexOf(
                currentStep
              ) + 1}{' '}
              of 5
            </div>
          </div>

          {/* Step 1: Template Selection */}
          {currentStep === 'template' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>Choose a Template</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                }}
              >
                {LOGO_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    style={{
                      padding: '16px',
                      border:
                        selectedTemplate?.id === template.id
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                      borderRadius: 'var(--border-radius-md)',
                      cursor: 'pointer',
                      backgroundColor:
                        selectedTemplate?.id === template.id
                          ? 'var(--color-primary-light)'
                          : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ marginBottom: '8px', fontWeight: 500 }}>{template.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {template.description}
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {template.canvasSize.width} × {template.canvasSize.height}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Script Name */}
          {currentStep === 'name' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>Enter Script Name</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Script Name
                </label>
                <input
                  type="text"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="Enter your script name..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius-md)',
                  }}
                />
              </div>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-background-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  💡 Tip: Use a concise name (1-3 words) for best visual results
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Font Selection */}
          {currentStep === 'font' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>Choose Font</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Font Family
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius-md)',
                  }}
                >
                  {AVAILABLE_FONTS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--color-background-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', fontFamily: selectedFont, marginBottom: '8px' }}>
                  {scriptName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Preview
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Color Selection */}
          {currentStep === 'colors' && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>Choose Colors</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Primary Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{
                        width: '60px',
                        height: '40px',
                        border: 'none',
                        borderRadius: 'var(--border-radius-sm)',
                      }}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--border-radius-sm)',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    Secondary Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={{
                        width: '60px',
                        height: '40px',
                        border: 'none',
                        borderRadius: 'var(--border-radius-sm)',
                      }}
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--border-radius-sm)',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '24px',
                  backgroundColor: 'var(--color-background-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    fontFamily: selectedFont,
                    color: primaryColor,
                    marginBottom: '8px',
                  }}
                >
                  {scriptName}
                </div>
                <div style={{ fontSize: '1rem', fontFamily: 'Georgia', color: secondaryColor }}>
                  Subtitle Example
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Preview */}
          {currentStep === 'preview' && selectedTemplate && (
            <div>
              <h3 style={{ marginBottom: '16px' }}>Preview & Create</h3>
              <div
                style={{
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: 'var(--color-background-secondary)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Template:</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedTemplate.name}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Canvas Size:</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {selectedTemplate.canvasSize.width} × {selectedTemplate.canvasSize.height}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Script Name:</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{scriptName}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Font:</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{selectedFont}</div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '24px',
                  backgroundColor: '#2C3E50',
                  borderRadius: 'var(--border-radius-md)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontFamily: selectedFont,
                    color: primaryColor,
                    marginBottom: '8px',
                  }}
                >
                  {scriptName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                  Final Preview (actual logo will be created in Studio)
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleBack}
              disabled={currentStep === 'template'}
            >
              Back
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className={styles.secondaryButton} onClick={onClose}>
                Cancel
              </button>
              {currentStep === 'preview' ? (
                <button type="button" className={styles.primaryButton} onClick={handleCreate}>
                  Create Logo
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleNext}
                  disabled={!selectedTemplate}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
