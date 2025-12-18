/**
 * Studio Context
 *
 * Manages state for the Studio image editor including layers, tools, history,
 * and canvas state. Provides actions for manipulating the editor state.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  canvasToDataURL,
  cloneCanvas,
  createBlankCanvas,
  HistoryManager,
  releaseStudioCanvas,
} from '@/ts/studio/index.js';
import type { StudioEditMode } from '@/ts/studio/navigationHelpers.js';
import type {
  BorderConfig,
  CanvasSize,
  GridConfig,
  Guide,
  Layer,
  Point,
  SerializedLayer,
  StudioAssetSaveOptions,
  StudioTool,
  ToolSettings,
} from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Context Type Definition
// ============================================================================

interface StudioContextType {
  // Canvas state
  canvasSize: CanvasSize;
  zoom: number;
  pan: Point;
  backgroundColor: string;

  // Layer system
  layers: Layer[];
  activeLayerId: string | null;
  activeLayer: Layer | null; // Computed from activeLayerId

  // Tool state
  activeTool: StudioTool;
  toolSettings: ToolSettings;

  // History (undo/redo)
  canUndo: boolean;
  canRedo: boolean;

  // Border configuration
  border: BorderConfig;

  // Grid and guides
  grid: GridConfig;
  guides: Guide[];

  // Editor state flags
  isDirty: boolean;
  isProcessing: boolean;
  currentAssetId?: string;
  editMode: StudioEditMode; // 'full' or 'icon-only'

  // Canvas actions
  setCanvasSize: (size: CanvasSize) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setBackgroundColor: (color: string) => void;
  resetView: () => void; // Reset zoom and pan

  // Layer actions
  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayer: (id: string | null) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  duplicateLayer: (id: string) => void;
  mergeLayerDown: (id: string) => void;
  flattenAllLayers: () => void;

  // Tool actions
  setActiveTool: (tool: StudioTool) => void;
  setToolSettings: (settings: Partial<ToolSettings>) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: (action: string) => void;
  clearHistory: () => void;

  // Border actions
  setBorder: (border: Partial<BorderConfig>) => void;

  // Grid and guide actions
  setGrid: (grid: Partial<GridConfig>) => void;
  addGuide: (guide: Guide) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  // Asset integration
  saveAsset: (options: Omit<StudioAssetSaveOptions, 'type'>) => Promise<string>;
  loadFromAsset: (assetId: string) => Promise<void>;
  loadFromImage: (file: File | Blob, editMode?: StudioEditMode) => Promise<void>;
  newProject: (width: number, height: number) => void;

  // Utility actions
  setProcessing: (processing: boolean) => void;
  setEditMode: (mode: StudioEditMode) => void;
  markDirty: () => void;
  markClean: () => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const StudioContext = createContext<StudioContextType | undefined>(undefined);

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_CANVAS_SIZE: CanvasSize = {
  width: 512,
  height: 512,
};

const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  brush: {
    size: 10,
    opacity: 1.0,
    color: '#000000',
    hardness: 0.8,
  },
  eraser: {
    size: 20,
    hardness: 0.8,
  },
  shape: {
    stroke: '#000000',
    fill: 'transparent',
    strokeWidth: 2,
    cornerRadius: 0,
  },
  text: {
    font: 'LHF Unlovable',
    size: 48,
    color: '#000000',
    letterSpacing: 0,
    alignment: 'center',
  },
};

const DEFAULT_BORDER: BorderConfig = {
  enabled: false,
  width: 4,
  color: '#000000',
  style: 'solid',
};

const DEFAULT_GRID: GridConfig = {
  enabled: false,
  spacing: 20,
  color: '#cccccc',
  snapEnabled: false,
  lineWidth: 1,
  opacity: 0.3,
};

const MAX_HISTORY_SIZE = 50;

// ============================================================================
// Provider Component
// ============================================================================

interface StudioProviderProps {
  children: ReactNode;
}

export function StudioProvider({ children }: StudioProviderProps) {
  // Canvas state
  const [canvasSize, setCanvasSizeState] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');

  // Layer system
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  // Tool state
  const [activeTool, setActiveTool] = useState<StudioTool>('select');
  const [toolSettings, setToolSettingsState] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS);

  // History - use ref to maintain HistoryManager instance across renders
  const historyManager = useRef<HistoryManager>(
    new HistoryManager({ maxSize: MAX_HISTORY_SIZE, compressionQuality: 0.8, debug: false })
  );
  // Track history state changes to trigger re-renders
  const [historyVersion, setHistoryVersion] = useState(0);

  // Border
  const [border, setBorderState] = useState<BorderConfig>(DEFAULT_BORDER);

  // Grid and guides
  const [grid, setGridState] = useState<GridConfig>(DEFAULT_GRID);
  const [guides, setGuides] = useState<Guide[]>([]);

  // Editor state
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentAssetId, setCurrentAssetId] = useState<string | undefined>(undefined);
  const [editMode, setEditModeState] = useState<StudioEditMode>('full');

  // ========================================================================
  // Computed Values
  // ========================================================================

  const activeLayer = useMemo(() => {
    return layers.find((layer) => layer.id === activeLayerId) || null;
  }, [layers, activeLayerId]);

  // Computed from HistoryManager - historyVersion triggers re-compute
  const canUndo = useMemo(() => {
    historyVersion; // Depend on this to trigger re-computation
    return historyManager.current.canUndo();
  }, [historyVersion]);

  const canRedo = useMemo(() => {
    historyVersion; // Depend on this to trigger re-computation
    return historyManager.current.canRedo();
  }, [historyVersion]);

  // ========================================================================
  // Canvas Actions
  // ========================================================================

  const setCanvasSize = useCallback((size: CanvasSize) => {
    setCanvasSizeState(size);
    setIsDirty(true);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  // ========================================================================
  // Layer Actions
  // ========================================================================

  const addLayer = useCallback((layer: Layer) => {
    setLayers((prev) => [...prev, layer]);
    setActiveLayerId(layer.id);
    setIsDirty(true);
  }, []);

  const removeLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        // Release canvas from pool before removing layer
        const layerToRemove = prev.find((layer) => layer.id === id);
        if (layerToRemove) {
          releaseStudioCanvas(layerToRemove.canvas);
        }
        return prev.filter((layer) => layer.id !== id);
      });
      if (activeLayerId === id) {
        setActiveLayerId(null);
      }
      setIsDirty(true);
    },
    [activeLayerId]
  );

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((layer) => {
        if (layer.id !== id) return layer;

        // Auto-increment version if canvas is being updated to force React re-renders
        // This ensures that even when the canvas reference stays the same but pixels change,
        // React will detect the update and trigger composition
        const newUpdates = updates.canvas
          ? { ...updates, version: updates.version ?? (layer.version || 0) + 1 }
          : updates;

        return { ...layer, ...newUpdates };
      })
    );
    setIsDirty(true);
  }, []);

  const setActiveLayer = useCallback((id: string | null) => {
    setActiveLayerId(id);
  }, []);

  const reorderLayers = useCallback((startIndex: number, endIndex: number) => {
    setLayers((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      // Update z-indices to match new order
      return result.map((layer, index) => ({
        ...layer,
        zIndex: index,
      }));
    });
    setIsDirty(true);
  }, []);

  const duplicateLayer = useCallback((id: string) => {
    setLayers((prev) => {
      const layerToDuplicate = prev.find((layer) => layer.id === id);
      if (!layerToDuplicate) return prev;

      const newLayer: Layer = {
        ...layerToDuplicate,
        id: crypto.randomUUID(),
        name: `${layerToDuplicate.name} Copy`,
        canvas: cloneCanvas(layerToDuplicate.canvas),
        version: 0, // New layer starts with version 0
        zIndex: layerToDuplicate.zIndex + 1,
      };

      // Increase z-index of layers above
      const updated = prev.map((layer) =>
        layer.zIndex >= newLayer.zIndex ? { ...layer, zIndex: layer.zIndex + 1 } : layer
      );

      return [...updated, newLayer];
    });
    setIsDirty(true);
  }, []);

  const mergeLayerDown = useCallback((id: string) => {
    setLayers((prev) => {
      const currentIndex = prev.findIndex((layer) => layer.id === id);
      if (currentIndex <= 0) return prev; // Can't merge bottom layer

      const currentLayer = prev[currentIndex];
      const layerBelow = prev[currentIndex - 1];

      // Create merged canvas
      const mergedCanvas = createBlankCanvas(
        Math.max(currentLayer.canvas.width, layerBelow.canvas.width),
        Math.max(currentLayer.canvas.height, layerBelow.canvas.height)
      );
      const ctx = mergedCanvas.getContext('2d');
      if (!ctx) return prev;

      // Draw layers in order
      ctx.drawImage(layerBelow.canvas, 0, 0);
      ctx.globalAlpha = currentLayer.opacity;
      ctx.drawImage(currentLayer.canvas, 0, 0);

      // Update layer below with merged result
      const updated = prev.map((layer, index) => {
        if (index === currentIndex - 1) {
          return {
            ...layer,
            canvas: mergedCanvas,
            name: `${layer.name} + ${currentLayer.name}`,
            version: (layer.version || 0) + 1, // Increment version for merged layer
          };
        }
        return layer;
      });

      // Remove current layer
      return updated.filter((_, index) => index !== currentIndex);
    });
    setIsDirty(true);
  }, []);

  const flattenAllLayers = useCallback(() => {
    if (layers.length === 0) return;

    // Create flattened canvas
    const flatCanvas = createBlankCanvas(canvasSize.width, canvasSize.height);
    const ctx = flatCanvas.getContext('2d');
    if (!ctx) return;

    // Composite all layers
    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of sorted) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, layer.position.x, layer.position.y);
    }

    // Replace with single flattened layer
    const flattenedLayer: Layer = {
      id: crypto.randomUUID(),
      type: 'image',
      name: 'Flattened',
      visible: true,
      opacity: 1.0,
      blendMode: 'normal',
      zIndex: 0,
      canvas: flatCanvas,
      version: 0, // New layer starts with version 0
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
    };

    setLayers([flattenedLayer]);
    setActiveLayerId(flattenedLayer.id);
    setIsDirty(true);
  }, [layers, canvasSize]);

  // ========================================================================
  // Tool Actions
  // ========================================================================

  const setToolSettings = useCallback((settings: Partial<ToolSettings>) => {
    setToolSettingsState((prev) => ({ ...prev, ...settings }));
  }, []);

  // ========================================================================
  // History Actions
  // ========================================================================

  const _serializeLayers = useCallback((layersToSerialize: Layer[]): SerializedLayer[] => {
    return layersToSerialize.map((layer) => ({
      ...layer,
      canvasData: canvasToDataURL(layer.canvas),
    }));
  }, []);

  const _deserializeLayers = useCallback(
    async (serialized: SerializedLayer[]): Promise<Layer[]> => {
      // Import createStudioCanvas dynamically
      const { createStudioCanvas } = await import('../ts/studio/index.js');

      const promises = serialized.map(async (layer) => {
        return new Promise<Layer>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            // Use pooled canvas
            const { canvas, ctx } = createStudioCanvas(img.width, img.height);
            ctx.drawImage(img, 0, 0);
            resolve({ ...layer, canvas });
          };
          img.onerror = () => reject(new Error('Failed to load layer image'));
          img.src = layer.canvasData;
        });
      });

      return Promise.all(promises);
    },
    []
  );

  const pushHistory = useCallback(
    (action: string) => {
      historyManager.current
        .pushState(action, layers, canvasSize, backgroundColor, toolSettings)
        .then(() => {
          setHistoryVersion((v) => v + 1);
        })
        .catch((err) => {
          logger.error('StudioContext', 'Failed to push history:', err);
        });
    },
    [layers, canvasSize, backgroundColor, toolSettings]
  );

  const undo = useCallback(async () => {
    const entry = historyManager.current.undo();
    if (!entry) return;

    try {
      const restoredLayers = await historyManager.current.deserializeLayers(entry.layers);

      // Release old canvases before replacing layers
      setLayers((prev) => {
        prev.forEach((layer) => {
          releaseStudioCanvas(layer.canvas);
        });
        return restoredLayers;
      });

      setCanvasSizeState(entry.canvasSize);
      setBackgroundColor(entry.backgroundColor);
      if (entry.toolSettings) {
        setToolSettingsState(entry.toolSettings);
      }
      setHistoryVersion((v) => v + 1); // Trigger re-render
    } catch (err) {
      logger.error('StudioContext', 'Failed to undo:', err);
    }
  }, []);

  const redo = useCallback(async () => {
    const entry = historyManager.current.redo();
    if (!entry) return;

    try {
      const restoredLayers = await historyManager.current.deserializeLayers(entry.layers);

      // Release old canvases before replacing layers
      setLayers((prev) => {
        prev.forEach((layer) => {
          releaseStudioCanvas(layer.canvas);
        });
        return restoredLayers;
      });

      setCanvasSizeState(entry.canvasSize);
      setBackgroundColor(entry.backgroundColor);
      if (entry.toolSettings) {
        setToolSettingsState(entry.toolSettings);
      }
      setHistoryVersion((v) => v + 1); // Trigger re-render
    } catch (err) {
      logger.error('StudioContext', 'Failed to redo:', err);
    }
  }, []);

  const clearHistory = useCallback(() => {
    historyManager.current.clear();
    setHistoryVersion((v) => v + 1);
  }, []);

  // ========================================================================
  // Border Actions
  // ========================================================================

  const setBorder = useCallback((borderUpdates: Partial<BorderConfig>) => {
    setBorderState((prev) => ({ ...prev, ...borderUpdates }));
    setIsDirty(true);
  }, []);

  // ========================================================================
  // Grid and Guide Actions
  // ========================================================================

  const setGrid = useCallback((gridUpdates: Partial<GridConfig>) => {
    setGridState((prev) => ({ ...prev, ...gridUpdates }));
  }, []);

  const addGuide = useCallback((guide: Guide) => {
    setGuides((prev) => [...prev, guide]);
  }, []);

  const removeGuide = useCallback((id: string) => {
    setGuides((prev) => prev.filter((guide) => guide.id !== id));
  }, []);

  const clearGuides = useCallback(() => {
    setGuides([]);
  }, []);

  // ========================================================================
  // Asset Integration
  // ========================================================================

  const saveAsset = useCallback(
    async (options: Omit<StudioAssetSaveOptions, 'type'>): Promise<string> => {
      // TODO: Implement actual asset saving to IndexedDB
      // This is a placeholder that will be implemented in Phase 7
      logger.debug('StudioContext', 'saveAsset called with options:', options);
      return Promise.resolve('placeholder-asset-id');
    },
    []
  );

  const loadFromAsset = useCallback(async (assetId: string): Promise<void> => {
    // TODO: Implement actual asset loading from IndexedDB
    // This is a placeholder that will be implemented in Phase 7
    logger.debug('StudioContext', 'loadFromAsset called with assetId:', assetId);
    setCurrentAssetId(assetId);
    return Promise.resolve();
  }, []);

  const loadFromImage = useCallback(
    async (file: File | Blob, mode: StudioEditMode = 'full'): Promise<void> => {
      setIsProcessing(true);

      try {
        // Import loadImageToCanvas dynamically to avoid circular dependency
        const { loadImageToCanvas } = await import('../ts/studio/index.js');
        const canvas = await loadImageToCanvas(file);

        // Create new image layer
        const newLayer: Layer = {
          id: crypto.randomUUID(),
          type: 'image',
          name: file instanceof File ? file.name : 'Icon',
          visible: true,
          opacity: 1.0,
          blendMode: 'normal',
          zIndex: layers.length,
          canvas,
          version: 0, // New layer starts with version 0
          position: { x: 0, y: 0 },
          rotation: 0,
          scale: { x: 1, y: 1 },
          locked: false, // Icon layer is always editable
          data: {
            originalBlob: file,
            filters: [],
          },
        };

        addLayer(newLayer);

        // Update canvas size to match if this is the first layer
        if (layers.length === 0) {
          setCanvasSize({ width: canvas.width, height: canvas.height });
        }

        // Set edit mode
        setEditModeState(mode);
      } catch (error) {
        logger.error('StudioContext', 'Failed to load image:', error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [layers, addLayer, setCanvasSize]
  );

  const newProject = useCallback(
    (width: number, height: number) => {
      // Release all canvases before clearing layers
      setLayers((prev) => {
        prev.forEach((layer) => {
          releaseStudioCanvas(layer.canvas);
        });
        return [];
      });
      setActiveLayerId(null);
      setCanvasSize({ width, height });
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setBackgroundColor('#ffffff');
      clearHistory();
      setIsDirty(false);
      setCurrentAssetId(undefined);
      setEditModeState('full'); // Reset to full edit mode
    },
    [clearHistory, setCanvasSize]
  );

  // ========================================================================
  // Utility Actions
  // ========================================================================

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  const setEditMode = useCallback((mode: StudioEditMode) => {
    setEditModeState(mode);
  }, []);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  // ========================================================================
  // Context Value
  // ========================================================================

  const value: StudioContextType = {
    // Canvas state
    canvasSize,
    zoom,
    pan,
    backgroundColor,

    // Layer system
    layers,
    activeLayerId,
    activeLayer,

    // Tool state
    activeTool,
    toolSettings,

    // History
    canUndo,
    canRedo,

    // Border
    border,

    // Grid and guides
    grid,
    guides,

    // Editor state
    isDirty,
    isProcessing,
    currentAssetId,
    editMode,

    // Actions
    setCanvasSize,
    setZoom,
    setPan,
    setBackgroundColor,
    resetView,

    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    reorderLayers,
    duplicateLayer,
    mergeLayerDown,
    flattenAllLayers,

    setActiveTool,
    setToolSettings,

    undo,
    redo,
    pushHistory,
    clearHistory,

    setBorder,

    setGrid,
    addGuide,
    removeGuide,
    clearGuides,

    saveAsset,
    loadFromAsset,
    loadFromImage,
    newProject,

    setProcessing,
    setEditMode,
    markDirty,
    markClean,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useStudio(): StudioContextType {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
}
