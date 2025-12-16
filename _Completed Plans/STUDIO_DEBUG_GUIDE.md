# Studio Layer Loss Debugging Guide

## Quick Diagnosis

To find out why layers are disappearing, follow these steps:

### 1. Check Console Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Load an image in Studio
4. Navigate to a different tab (Editor/Gallery/etc.)
5. Navigate back to Studio
6. Look for these log messages:

Expected logs:
```
[StudioView] Loading pending operation: ...
[StudioContext] ...
```

### 2. Check Layer State

Add this temporary code to `src/components/Studio/StudioView.tsx` after line 31:

```typescript
// DEBUG: Log layer state changes
useEffect(() => {
  console.log('[DEBUG] Layers changed:', {
    count: layers.length,
    layerIds: layers.map(l => l.id),
    layerNames: layers.map(l => l.name),
    stackTrace: new Error().stack
  });
}, [layers]);
```

This will show you EVERY time the layers array changes and what triggered it.

### 3. Check Navigation Behavior

Add this to `src/components/Pages/EditorPage.tsx` after the imports:

```typescript
useEffect(() => {
  console.log('[DEBUG] EditorPage activeTab changed to:', activeTab);
}, [activeTab]);
```

### 4. Check for Accidental newProject Calls

Add this to `src/contexts/StudioContext.tsx` in the `newProject` function (line ~605):

```typescript
const newProject = useCallback((width: number, height: number) => {
  console.error('[DEBUG] newProject() called!', new Error().stack);
  // ... rest of function
```

Use `console.error` so it stands out in red.

## Common Causes

### Scenario A: Layers Array is Empty
If console shows `count: 0`, the layers state was reset. Check:
- Was `newProject()` called? (look for the red error log)
- Was `setLayers([])` called from somewhere?
- Did the context re-mount? (check for multiple "StudioProvider mounted" logs)

### Scenario B: Layers Exist But Show White
If console shows `count: 1+`, layers exist but aren't rendering. Check:
- Are canvas elements valid? (`layers[0].canvas instanceof HTMLCanvasElement`)
- Do canvases have content? (`layers[0].canvas.width`, `layers[0].canvas.height`)
- Is composition happening? (look for RAF logs in StudioView)

### Scenario C: Canvas Pool Released Canvases
If canvases exist but are blank:
- Canvas may have been reused by pool and cleared
- Check if `releaseStudioCanvas()` was called accidentally

## Quick Fix Test

Try disabling canvas pool temporarily to see if that's the issue.

In `src/contexts/StudioContext.tsx`, comment out these lines in `removeLayer`:

```typescript
// Release canvas from pool before removing layer
// const layerToRemove = prev.find(layer => layer.id === id);
// if (layerToRemove) {
//   releaseStudioCanvas(layerToRemove.canvas);
// }
```

If layers persist after this change, the canvas pool is the culprit.

## Report Back

After adding the debug logs, report:
1. How many layers show in console after navigation?
2. Are there any red error logs?
3. What triggered the layer change? (check stack trace)
4. Are the canvas elements still valid HTMLCanvasElements?
