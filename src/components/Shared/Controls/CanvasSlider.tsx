/**
 * CanvasSlider Component
 *
 * A canvas-based slider control for color picking with support for
 * custom gradient rendering and toggle-style handles.
 *
 * Features:
 * - Custom gradient rendering via callback
 * - Drag-to-adjust interaction
 * - Keyboard accessibility
 * - Visual toggle handle
 *
 * @module components/Shared/Controls/CanvasSlider
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/shared/CanvasSlider.module.css';

// ============================================================================
// Types
// ============================================================================

export interface CanvasSliderProps {
  /** Current value (0-1 normalized, or use min/max for custom range) */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 1) */
  max?: number;
  /** Canvas width in pixels (default: 120) */
  width?: number;
  /** Canvas height in pixels (default: 16) */
  height?: number;
  /** Render the gradient on the canvas */
  renderGradient: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Label for the slider (optional, for aria) */
  label?: string;
  /** Additional class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// Toggle Drawing Utility
// ============================================================================

/**
 * Draw a rounded rectangle toggle (frame with hole) on a slider canvas
 */
function drawSliderToggle(ctx: CanvasRenderingContext2D, x: number, height: number): void {
  const toggleWidth = 10;
  const toggleHeight = height - 2;
  const borderRadius = 3;
  const borderWidth = 2;

  // Clamp x position so toggle stays fully visible
  const clampedX = Math.max(
    toggleWidth / 2 + 1,
    Math.min(x, ctx.canvas.width - toggleWidth / 2 - 1)
  );

  const left = clampedX - toggleWidth / 2;
  const top = 1;

  // Draw outer rounded rectangle (white border)
  ctx.beginPath();
  ctx.roundRect(left, top, toggleWidth, toggleHeight, borderRadius);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  // Draw inner dark outline for contrast
  ctx.beginPath();
  ctx.roundRect(left - 0.5, top - 0.5, toggleWidth + 1, toggleHeight + 1, borderRadius + 0.5);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ============================================================================
// Component
// ============================================================================

export function CanvasSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  width = 120,
  height = 16,
  renderGradient,
  label,
  className,
  disabled = false,
}: CanvasSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Normalize value to 0-1 range for positioning
  const normalizedValue = (value - min) / (max - min);

  // Render gradient and toggle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use requestAnimationFrame for smooth rendering
    const rafId = requestAnimationFrame(() => {
      // Clear and render gradient
      ctx.clearRect(0, 0, width, height);
      renderGradient(ctx, width, height);

      // Draw toggle at current position
      const toggleX = normalizedValue * width;
      drawSliderToggle(ctx, toggleX, height);
    });

    return () => cancelAnimationFrame(rafId);
  }, [normalizedValue, width, height, renderGradient]);

  // Convert mouse position to value
  const positionToValue = useCallback(
    (clientX: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return value;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const ratio = x / rect.width;
      return min + ratio * (max - min);
    },
    [min, max, value]
  );

  // Handle mouse down - start drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    const newValue = positionToValue(e.clientX);
    onChange(newValue);
    setIsDragging(true);
  };

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newValue = positionToValue(e.clientX);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, positionToValue, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    const step = (max - min) / 20; // 5% steps
    let newValue = value;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, value - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, value + step);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }

    e.preventDefault();
    onChange(newValue);
  };

  const containerClasses = [styles.container, disabled && styles.disabled, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'pointer' }}
      />
    </div>
  );
}

// Export the toggle drawing function for custom implementations
export { drawSliderToggle };
