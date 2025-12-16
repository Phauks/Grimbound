# Studio Feature Dependencies

## Required NPM Packages for Full Functionality

### Phase 5: ML Background Removal

The background removal feature requires MediaPipe Selfie Segmentation for client-side AI processing.

**Installation:**
```bash
npm install @mediapipe/selfie_segmentation
```

**Optional (if MediaPipe has issues):**
```bash
npm install @mediapipe/tasks-vision
```

**Alternative (TensorFlow.js fallback):**
```bash
npm install @tensorflow/tfjs @tensorflow-models/body-pix
```

### Package Details

#### @mediapipe/selfie_segmentation
- **Version**: ^0.1.1675465747
- **Size**: ~1-2 MB (model loaded from CDN)
- **Purpose**: Client-side background segmentation
- **Performance**: Real-time on modern devices
- **Offline**: Works offline after initial model download
- **License**: Apache 2.0

#### Why MediaPipe?
1. **Smaller bundle**: 1-2 MB vs 10 MB+ for TensorFlow.js alternatives
2. **Better performance**: Optimized for real-time segmentation
3. **Lower memory**: Critical for browser-based editor
4. **Active maintenance**: Google-maintained with regular updates

### Installation Instructions

1. **Install the package:**
   ```bash
   npm install @mediapipe/selfie_segmentation
   ```

2. **Verify installation:**
   ```bash
   npm list @mediapipe/selfie_segmentation
   ```

3. **Test in application:**
   - Open Studio tab
   - Import an image
   - Click "Background Removal" panel
   - Click "Auto Remove Background"
   - Model will download from CDN on first use (~1-2 MB)

### CDN Loading

The implementation uses CDN loading for model files to avoid bundling large files:
```typescript
locateFile: (file: string) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
}
```

This means:
- First use requires internet connection to download model
- Subsequent uses work offline (model is cached)
- No impact on initial bundle size
- Model files served from fast CDN

### Fallback Behavior

If the MediaPipe package is not installed:
- Background removal button will still appear
- Clicking it will show an error message with installation instructions
- Manual background removal tools will still work (when implemented)
- All other Studio features continue to function normally

### Bundle Impact

**With MediaPipe installed:**
- Bundle size increase: ~50 KB (just the wrapper code)
- Model files: ~1-2 MB (loaded from CDN, not bundled)
- Total download on first use: ~2 MB
- Memory usage: ~20-30 MB during processing

**Without MediaPipe:**
- No bundle size impact
- Feature gracefully degrades with helpful error messages

### Testing

After installation, test with these images:
1. Portrait with simple background
2. Product photo on white background
3. Complex image with detailed edges

Expected results:
- Clean removal with feathered edges
- Processing time: 1-3 seconds for 512x512 image
- Adjustable threshold for fine-tuning

### Troubleshooting

**Error: "Cannot find module '@mediapipe/selfie_segmentation'"**
- Solution: Run `npm install @mediapipe/selfie_segmentation`

**Error: "Failed to load model"**
- Check internet connection (needed for first download from CDN)
- Clear browser cache and try again
- Check browser console for detailed error messages

**Slow performance:**
- Reduce image size before processing
- Ensure hardware acceleration is enabled in browser
- Close other browser tabs to free memory

**Model not loading:**
- Check browser DevTools Network tab for CDN requests
- Verify CDN is accessible (not blocked by firewall/proxy)
- Try the TensorFlow.js fallback if MediaPipe fails

### Alternative: TensorFlow.js BodyPix

If MediaPipe doesn't work, you can use TensorFlow.js BodyPix as a fallback:

```bash
npm install @tensorflow/tfjs @tensorflow-models/body-pix
```

Update `backgroundRemoval.ts` to use BodyPix instead of MediaPipe. See TensorFlow.js documentation for implementation details.

**Trade-offs:**
- Larger bundle size (10-20 MB)
- Slower performance
- Higher memory usage
- But more robust for varied images
