/**
 * Tool Settings Panel
 *
 * Dynamic settings panel that shows different controls based on the active tool
 */

import { useStudio } from '../../../../contexts/StudioContext';
import styles from '../../../../styles/components/studio/Studio.module.css';

export function ToolSettingsPanel() {
  const { activeTool, toolSettings, setToolSettings } = useStudio();

  // Render settings based on active tool
  const renderSettings = () => {
    switch (activeTool) {
      case 'brush':
        return (
          <>
            {/* Brush Size */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Brush Size: {toolSettings.brush.size}px
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={toolSettings.brush.size}
                onChange={(e) =>
                  setToolSettings({
                    brush: { ...toolSettings.brush, size: Number(e.target.value) }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Brush Opacity */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Opacity: {Math.round(toolSettings.brush.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={toolSettings.brush.opacity * 100}
                onChange={(e) =>
                  setToolSettings({
                    brush: { ...toolSettings.brush, opacity: Number(e.target.value) / 100 }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Brush Color */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <input
                  type="color"
                  value={toolSettings.brush.color}
                  onChange={(e) =>
                    setToolSettings({
                      brush: { ...toolSettings.brush, color: e.target.value }
                    })
                  }
                  style={{ width: '40px', height: '32px' }}
                />
                <input
                  type="text"
                  value={toolSettings.brush.color}
                  onChange={(e) =>
                    setToolSettings({
                      brush: { ...toolSettings.brush, color: e.target.value }
                    })
                  }
                  placeholder="#000000"
                  style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: '0.75rem' }}
                />
              </div>
            </div>

            {/* Brush Hardness */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Hardness: {Math.round(toolSettings.brush.hardness * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={toolSettings.brush.hardness * 100}
                onChange={(e) =>
                  setToolSettings({
                    brush: { ...toolSettings.brush, hardness: Number(e.target.value) / 100 }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>
          </>
        );

      case 'eraser':
        return (
          <>
            {/* Eraser Size */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Eraser Size: {toolSettings.eraser.size}px
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={toolSettings.eraser.size}
                onChange={(e) =>
                  setToolSettings({
                    eraser: { ...toolSettings.eraser, size: Number(e.target.value) }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Eraser Hardness */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Hardness: {Math.round(toolSettings.eraser.hardness * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={toolSettings.eraser.hardness * 100}
                onChange={(e) =>
                  setToolSettings({
                    eraser: { ...toolSettings.eraser, hardness: Number(e.target.value) / 100 }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>
          </>
        );

      case 'shape':
        return (
          <>
            {/* Fill Color */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Fill Color
              </label>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <input
                  type="color"
                  value={toolSettings.shape.fill}
                  onChange={(e) =>
                    setToolSettings({
                      shape: { ...toolSettings.shape, fill: e.target.value }
                    })
                  }
                  style={{ width: '40px', height: '32px' }}
                />
                <input
                  type="text"
                  value={toolSettings.shape.fill}
                  onChange={(e) =>
                    setToolSettings({
                      shape: { ...toolSettings.shape, fill: e.target.value }
                    })
                  }
                  placeholder="#000000"
                  style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: '0.75rem' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: 'var(--spacing-xs)', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={toolSettings.shape.fill === 'transparent'}
                  onChange={(e) =>
                    setToolSettings({
                      shape: {
                        ...toolSettings.shape,
                        fill: e.target.checked ? 'transparent' : '#000000'
                      }
                    })
                  }
                />
                No Fill
              </label>
            </div>

            {/* Stroke Color */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Stroke Color
              </label>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <input
                  type="color"
                  value={toolSettings.shape.stroke}
                  onChange={(e) =>
                    setToolSettings({
                      shape: { ...toolSettings.shape, stroke: e.target.value }
                    })
                  }
                  style={{ width: '40px', height: '32px' }}
                />
                <input
                  type="text"
                  value={toolSettings.shape.stroke}
                  onChange={(e) =>
                    setToolSettings({
                      shape: { ...toolSettings.shape, stroke: e.target.value }
                    })
                  }
                  placeholder="#000000"
                  style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: '0.75rem' }}
                />
              </div>
            </div>

            {/* Stroke Width */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Stroke Width: {toolSettings.shape.strokeWidth}px
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={toolSettings.shape.strokeWidth}
                onChange={(e) =>
                  setToolSettings({
                    shape: { ...toolSettings.shape, strokeWidth: Number(e.target.value) }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>
          </>
        );

      case 'text':
        return (
          <>
            {/* Font Family */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Font
              </label>
              <select
                value={toolSettings.text.font}
                onChange={(e) =>
                  setToolSettings({
                    text: { ...toolSettings.text, font: e.target.value }
                  })
                }
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--border-radius-sm)',
                }}
              >
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
                <option value="LHF Unlovable">LHF Unlovable</option>
                <option value="Dumbledor">Dumbledor</option>
                <option value="TradeGothic">Trade Gothic</option>
              </select>
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Size: {toolSettings.text.size}px
              </label>
              <input
                type="range"
                min="8"
                max="200"
                value={toolSettings.text.size}
                onChange={(e) =>
                  setToolSettings({
                    text: { ...toolSettings.text, size: Number(e.target.value) }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Text Color */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                <input
                  type="color"
                  value={toolSettings.text.color}
                  onChange={(e) =>
                    setToolSettings({
                      text: { ...toolSettings.text, color: e.target.value }
                    })
                  }
                  style={{ width: '40px', height: '32px' }}
                />
                <input
                  type="text"
                  value={toolSettings.text.color}
                  onChange={(e) =>
                    setToolSettings({
                      text: { ...toolSettings.text, color: e.target.value }
                    })
                  }
                  placeholder="#000000"
                  style={{ flex: 1, padding: 'var(--spacing-xs)', fontSize: '0.75rem' }}
                />
              </div>
            </div>

            {/* Letter Spacing */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Letter Spacing: {toolSettings.text.letterSpacing}px
              </label>
              <input
                type="range"
                min="-5"
                max="20"
                value={toolSettings.text.letterSpacing}
                onChange={(e) =>
                  setToolSettings({
                    text: { ...toolSettings.text, letterSpacing: Number(e.target.value) }
                  })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Alignment */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                Alignment
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                <button
                  className={`${styles.toolbarButton} ${toolSettings.text.alignment === 'left' ? styles.active : ''}`}
                  onClick={() =>
                    setToolSettings({
                      text: { ...toolSettings.text, alignment: 'left' }
                    })
                  }
                  style={{ fontSize: '0.7rem', padding: '4px' }}
                >
                  ⬅️ Left
                </button>
                <button
                  className={`${styles.toolbarButton} ${toolSettings.text.alignment === 'center' ? styles.active : ''}`}
                  onClick={() =>
                    setToolSettings({
                      text: { ...toolSettings.text, alignment: 'center' }
                    })
                  }
                  style={{ fontSize: '0.7rem', padding: '4px' }}
                >
                  ↔️ Center
                </button>
                <button
                  className={`${styles.toolbarButton} ${toolSettings.text.alignment === 'right' ? styles.active : ''}`}
                  onClick={() =>
                    setToolSettings({
                      text: { ...toolSettings.text, alignment: 'right' }
                    })
                  }
                  style={{ fontSize: '0.7rem', padding: '4px' }}
                >
                  ➡️ Right
                </button>
              </div>
            </div>
          </>
        );

      case 'select':
      case 'move':
        return (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Click and drag to {activeTool === 'select' ? 'select' : 'move'} layers
          </p>
        );

      default:
        return (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Select a tool to see settings
          </p>
        );
    }
  };

  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sectionTitle}>Tool Settings</h3>
      {renderSettings()}
    </div>
  );
}
