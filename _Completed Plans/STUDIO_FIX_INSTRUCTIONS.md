# Studio Live Update Fix - Manual Instructions

## Problem
The invert button (and all image filters) don't show live updates because React's shallow comparison doesn't detect canvas pixel changes.

## Solution
Add auto-incrementing `version` field to force React re-renders.

## Status
✅ `src/ts/types/index.ts` - version field added to Layer interface (line 870)
✅ `src/contexts/StudioContext.tsx` - version initialization added to new layers
❌ `src/contexts/StudioContext.tsx` - updateLayer function NOT YET UPDATED

## Critical Fix Needed

Open `src/contexts/StudioContext.tsx` and find line 277-284:

### REPLACE THIS:
```typescript
const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
  setLayers(prev =>
    prev.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    )
  );
  setIsDirty(true);
}, []);
```

### WITH THIS:
```typescript
const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
  setLayers(prev =>
    prev.map(layer => {
      if (layer.id !== id) return layer;

      // Auto-increment version if canvas is being updated to force React re-renders
      // This ensures that even when the canvas reference stays the same but pixels change,
      // React will detect the update and trigger composition
      const newUpdates = updates.canvas
        ? { ...updates, version: (updates.version ?? (layer.version || 0) + 1) }
        : updates;

      return { ...layer, ...newUpdates };
    })
  );
  setIsDirty(true);
}, []);
```

## After Making This Change:

1. Save the file
2. Run: `npm run build`
3. If successful, restart your dev server
4. Test the invert button - you should see IMMEDIATE visual updates!

## Why This Works

Before: `updateLayer(id, { canvas: sameCanvasObject })` → React sees same object → no re-render
After: `updateLayer(id, { canvas: sameCanvasObject })` → version auto-increments → React sees change → triggers composition → live update!

The version field changes from a number (e.g., 5) to another number (e.g., 6), which React's primitive comparison detects instantly.

## Testing

1. Load an image into the Studio
2. Click the "Invert Colors" checkbox
3. You should see the image invert IMMEDIATELY
4. Move any slider (brightness, contrast, etc.)
5. You should see LIVE updates as you drag

If this doesn't work, check the browser console for errors.
