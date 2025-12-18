/**
 * Logo Selector Component
 *
 * Allows selection between three logo modes:
 * 1. Text-based logo (generated from script name)
 * 2. Uploaded image file
 * 3. URL from _meta.logo
 */

import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/projects/LogoSelector.module.css';

export type LogoMode = 'text' | 'upload' | 'url';

interface LogoSelectorProps {
  scriptName: string;
  logoUrl?: string;
  uploadedLogo?: string; // Data URL
  mode: LogoMode;
  onModeChange: (mode: LogoMode) => void;
  onLogoUpload: (dataUrl: string) => void;
  showSettingsBelowLogo?: boolean; // Show settings beneath logo instead of overlay
}

export function LogoSelector({
  scriptName,
  logoUrl,
  uploadedLogo,
  mode,
  onModeChange,
  onLogoUpload,
  showSettingsBelowLogo = false,
}: LogoSelectorProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [textLogo, setTextLogo] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate text-based logo from script name using full name and Unlovable font
  useEffect(() => {
    if (mode === 'text' && scriptName) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const size = 200;
      canvas.width = size;
      canvas.height = size;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Background - dark parchment color
      ctx.fillStyle = '#2a2520';
      ctx.fillRect(0, 0, size, size);

      // Border
      ctx.strokeStyle = '#4a4035';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, size - 4, size - 4);

      // Use full script name with word wrapping
      const text = scriptName.trim();
      ctx.fillStyle = '#d4c4a8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Try to fit text - start with larger font and reduce if needed
      let fontSize = 32;
      const minFontSize = 14;
      const maxWidth = size - 20;
      const lineHeight = 1.2;

      // Use Unlovable font
      const fontFamily = "'LHF Unlovable', serif";

      // Word wrap function
      const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };

      // Find best font size that fits
      let lines: string[] = [];
      while (fontSize >= minFontSize) {
        lines = wrapText(text, maxWidth, fontSize);
        const totalHeight = lines.length * fontSize * lineHeight;
        if (totalHeight <= size - 30) break;
        fontSize -= 2;
      }

      // Draw text lines
      ctx.font = `${fontSize}px ${fontFamily}`;
      const totalHeight = lines.length * fontSize * lineHeight;
      const startY = (size - totalHeight) / 2 + fontSize / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, startY + i * fontSize * lineHeight);
      });

      // Convert to data URL
      setTextLogo(canvas.toDataURL());
    }
  }, [mode, scriptName]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onLogoUpload(dataUrl);
        onModeChange('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const getCurrentLogo = () => {
    switch (mode) {
      case 'text':
        return textLogo;
      case 'upload':
        return uploadedLogo;
      case 'url':
        return logoUrl;
      default:
        return null;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'text':
        return 'Text Logo';
      case 'upload':
        return 'Uploaded';
      case 'url':
        return 'URL Logo';
      default:
        return 'No Logo';
    }
  };

  const currentLogo = getCurrentLogo();

  return (
    <div className={styles.container}>
      {/* Hidden canvas for text logo generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Logo Display */}
      <div className={styles.logoBox}>
        {currentLogo ? (
          <img src={currentLogo} alt="Project Logo" className={styles.logoImage} />
        ) : (
          <div className={styles.logoPlaceholder}>
            <span>📜</span>
            <span className={styles.placeholderText}>No Logo</span>
          </div>
        )}

        {/* Options Button - only show on logo if not showing below */}
        {!showSettingsBelowLogo && (
          <>
            <button
              type="button"
              className={styles.optionsBtn}
              onClick={() => setShowOptions(!showOptions)}
              title="Logo Options"
            >
              Options ▾
            </button>
            <div className={styles.modeLabel}>{getModeLabel()}</div>
          </>
        )}
      </div>

      {/* Settings Below Logo */}
      {showSettingsBelowLogo && (
        <div className={styles.settingsBelow}>
          <div className={styles.currentMode}>
            <span className={styles.modeText}>{getModeLabel()}</span>
            <button
              type="button"
              className={styles.changeBtn}
              onClick={() => setShowOptions(!showOptions)}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Options Dropdown */}
      {showOptions && (
        <div className={styles.optionsMenu}>
          <button
            type="button"
            className={`${styles.optionItem} ${mode === 'text' ? styles.active : ''}`}
            onClick={() => {
              onModeChange('text');
              setShowOptions(false);
            }}
          >
            <span>📝</span>
            <div className={styles.optionInfo}>
              <div className={styles.optionTitle}>Text Logo</div>
              <div className={styles.optionDesc}>Generated from script name</div>
            </div>
          </button>

          <label className={`${styles.optionItem} ${mode === 'upload' ? styles.active : ''}`}>
            <span>📤</span>
            <div className={styles.optionInfo}>
              <div className={styles.optionTitle}>Upload Image</div>
              <div className={styles.optionDesc}>Choose a file from your computer</div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            type="button"
            className={`${styles.optionItem} ${mode === 'url' ? styles.active : ''}`}
            onClick={() => {
              onModeChange('url');
              setShowOptions(false);
            }}
            disabled={!logoUrl}
            title={!logoUrl ? 'No logo URL in _meta' : 'Use logo URL from _meta'}
          >
            <span>🔗</span>
            <div className={styles.optionInfo}>
              <div className={styles.optionTitle}>URL Logo</div>
              <div className={styles.optionDesc}>
                {logoUrl ? 'Use logo from _meta.logo' : 'No URL in _meta'}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
