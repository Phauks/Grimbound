/**
 * Studio Canvas
 *
 * Main canvas area with zoom/pan controls and layer rendering
 */

import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { useStudio } from '../../../contexts/StudioContext';
import styles from '../../../styles/components/studio/Studio.module.css';

interface StudioCanvasProps {
  compositeCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
}

export function StudioCanvas({ compositeCanvasRef }: StudioCanvasProps) {
  const { canvasSize, zoom, pan, setZoom, setPan, resetView } = useStudio();

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  // Lazy rendering with requestAnimationFrame
  const rafIdRef = useRef<number | null>(null);
  const needsRenderRef = useRef(true);

  // Mark as needing render when canvas size changes
  useEffect(() => {
    needsRenderRef.current = true;
  }, []);

  // Optimized canvas rendering with RAF
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    const compositeCanvas = compositeCanvasRef.current;

    if (!(displayCanvas && compositeCanvas)) return;

    const render = () => {
      if (!needsRenderRef.current) {
        rafIdRef.current = null;
        return;
      }

      // Update canvas size if needed
      if (displayCanvas.width !== canvasSize.width || displayCanvas.height !== canvasSize.height) {
        displayCanvas.width = canvasSize.width;
        displayCanvas.height = canvasSize.height;
      }

      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;

      // Clear and draw composite
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.drawImage(compositeCanvas, 0, 0);

      needsRenderRef.current = false;
      rafIdRef.current = null;
    };

    // Schedule render if not already scheduled
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [compositeCanvasRef, canvasSize]);

  // External API to trigger re-renders (exposed via ref if needed)
  const _requestRender = () => {
    needsRenderRef.current = true;
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (!(displayCanvasRef.current && compositeCanvasRef.current)) return;

        const ctx = displayCanvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.drawImage(compositeCanvasRef.current, 0, 0);

        needsRenderRef.current = false;
        rafIdRef.current = null;
      });
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 4.0));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Calculate zoom to fit canvas in container (with padding)
    const padding = 40;
    const scaleX = (containerRect.width - padding) / canvasSize.width;
    const scaleY = (containerRect.height - padding) / canvasSize.height;
    const newZoom = Math.min(scaleX, scaleY, 1.0); // Don't zoom in past 100%

    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    // Zoom in/out based on wheel delta
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(4.0, zoom * delta));

    setZoom(newZoom);
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan with middle mouse button OR left mouse + space
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Keyboard handlers for space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.canvasContainer}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : 'default',
      }}
    >
      <div
        className={styles.canvasWrapper}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={displayCanvasRef}
          className={styles.canvas}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
          }}
        />
      </div>

      {/* Zoom Controls */}
      <div className={styles.zoomControls}>
        <button
          className={styles.zoomButton}
          onClick={handleZoomOut}
          title="Zoom Out (Scroll Down)"
        >
          −
        </button>
        <div className={styles.zoomLevel} onClick={handleResetZoom} title="Click to reset to 100%">
          {Math.round(zoom * 100)}%
        </div>
        <button type="button" className={styles.zoomButton} onClick={handleZoomIn} title="Zoom In (Scroll Up)">
          +
        </button>
        <div className={styles.toolbarDivider} style={{ margin: '0 4px' }} />
        <button type="button" className={styles.zoomButton} onClick={handleFitToScreen} title="Fit to Screen (F)">
          ⊡
        </button>
        <button type="button" className={styles.zoomButton} onClick={handleResetZoom} title="100% Zoom (Ctrl+0)">
          1:1
        </button>
      </div>

      {/* Pan Instructions */}
      {spacePressed && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          Click and drag to pan
        </div>
      )}
    </div>
  );
}
