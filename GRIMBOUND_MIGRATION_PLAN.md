# Grimbound Migration Plan

> Migrate project from "Clocktower Token Generator" to "Grimbound" with domain grimbound.com

**Created**: 2025-12-23
**Status**: COMPLETED

---

## Overview

This plan migrates the project to:
- **New Name**: Grimbound (from "Blood on the Clocktower Token Generator")
- **New Domain**: grimbound.com (from phauks.github.io/Clocktower_Token_Generator/)
- **Hosting**: Cloudflare Pages (from GitHub Pages)

---

## Batch 1: Core Configuration Files

### Task 1.1: Update package.json
**File**: `package.json`
- [ ] Change `"name": "clocktower-token-generator"` to `"name": "grimbound"`
- [ ] Change `"description"` to `"Grimbound - Token Generator for Blood on the Clocktower"`

### Task 1.2: Update vite.config.ts
**File**: `vite.config.ts`
- [ ] Line 11: Change `base` from `/Clocktower_Token_Generator/` to `/` (root domain)
- [ ] Line 25: Change manifest `name` to `"Grimbound"`
- [ ] Line 26: Change `short_name` to `"Grimbound"`
- [ ] Line 27: Update `description` to mention Grimbound
- [ ] Line 31: Change `scope` from `/Clocktower_Token_Generator/` to `/`
- [ ] Line 32: Change `start_url` from `/Clocktower_Token_Generator/` to `/`

### Task 1.3: Update index.html
**File**: `index.html`
- [ ] Line 6: Change `<title>` to `"Grimbound - Blood on the Clocktower Token Generator"`
- [ ] Line 7: Update meta description to include "Grimbound"
- [ ] Line 13: Change `apple-mobile-web-app-title` to `"Grimbound"`
- [ ] Line 15: Change `application-name` to `"Grimbound"`

---

## Batch 2: UI Components

### Task 2.1: Update AppHeader.tsx
**File**: `src/components/Layout/AppHeader.tsx`
- [ ] Line 26: Change title from "Blood on the Clocktower Token Generator" to "Grimbound"
- [ ] Line 126: Update GitHub link (keep pointing to repo, just verify URL)

### Task 2.2: Update AppFooter.tsx (if exists)
**File**: `src/components/Layout/AppFooter.tsx`
- [ ] Update any project name references

---

## Batch 3: GitHub Workflows (Cloudflare Pages Deployment)

### Task 3.1: Create Cloudflare Pages Deployment Workflow
**File**: `.github/workflows/deploy.yml` (replace existing)
- [ ] Replace GitHub Pages deployment with Cloudflare Pages
- [ ] Add Cloudflare API token secret reference
- [ ] Add Cloudflare Account ID secret reference

**New workflow content**:
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx vite build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=grimbound
```

### Task 3.2: Update release.yml
**File**: `.github/workflows/release.yml`
- [ ] Line 72: Change ZIP name from `clocktower-token-generator` to `grimbound`
- [ ] Line 82: Update ZIP filename reference
- [ ] Line 84: Change header to "Grimbound"
- [ ] Line 90: Update live URL to `https://grimbound.com`
- [ ] Line 93: Update CHANGELOG link

---

## Batch 4: Documentation Updates

### Task 4.1: Update README.md
- [ ] Change title to "Grimbound"
- [ ] Update all GitHub Pages links to grimbound.com
- [ ] Update badge URLs if needed
- [ ] Keep "Blood on the Clocktower" references as the game name

### Task 4.2: Update CONTRIBUTING.md
- [ ] Line 1: Change title to "Contributing to Grimbound"
- [ ] Update any URL references

### Task 4.3: Update CLAUDE.md
- [ ] Update project name references
- [ ] Update version references

### Task 4.4: Update CHANGELOG.md
- [ ] Add entry for v0.5.0 rebrand to Grimbound
- [ ] Document domain change

---

## Batch 5: Cloudflare DNS Configuration

### Required DNS Records for grimbound.com

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| CNAME | @ | `grimbound.pages.dev` | Proxied | Auto |
| CNAME | www | `grimbound.com` | Proxied | Auto |

### Cloudflare Settings to Enable

#### SSL/TLS Settings
- [ ] SSL/TLS encryption mode: **Full (strict)**
- [ ] Always Use HTTPS: **ON**
- [ ] Automatic HTTPS Rewrites: **ON**
- [ ] Minimum TLS Version: **TLS 1.2**

#### Speed Settings
- [ ] Auto Minify: **JavaScript, CSS, HTML** all enabled
- [ ] Brotli: **ON**
- [ ] Early Hints: **ON**
- [ ] Rocket Loader: **OFF** (can interfere with React apps)

#### Caching Settings
- [ ] Caching Level: **Standard**
- [ ] Browser Cache TTL: **4 hours** (for static assets)
- [ ] Always Online: **ON**

#### Security Settings
- [ ] Security Level: **Medium**
- [ ] Bot Fight Mode: **ON**
- [ ] Browser Integrity Check: **ON**

#### Pages Settings (in Cloudflare Pages dashboard)
- [ ] Production branch: `main`
- [ ] Build command: `npx vite build`
- [ ] Build output directory: `dist`
- [ ] Root directory: `/`
- [ ] Custom domain: `grimbound.com`
- [ ] Custom domain: `www.grimbound.com` (redirect to apex)

### GitHub Secrets to Add
- [ ] `CLOUDFLARE_API_TOKEN` - Create in Cloudflare dashboard with Pages permissions
- [ ] `CLOUDFLARE_ACCOUNT_ID` - Found in Cloudflare dashboard URL

---

## Batch 6: Vitest Configuration Improvements

### Task 6.1: Create Test Setup File
**File**: `src/test/setup.ts` (new file)
```typescript
import { vi, beforeAll, afterEach, afterAll } from 'vitest';

// Mock fetch globally
const originalFetch = global.fetch;

beforeAll(() => {
  // Setup global mocks
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});

// Mock IndexedDB
import 'fake-indexeddb/auto';

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
  }),
  putImageData: vi.fn(),
});

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
URL.revokeObjectURL = vi.fn();
```

### Task 6.2: Update vitest.config.ts
**File**: `vitest.config.ts`
- [ ] Add `setupFiles: ['./src/test/setup.ts']`
- [ ] Add `deps.inline` for problematic modules
- [ ] Configure test timeouts

**Updated config**:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/ts/**/*.ts'],
      exclude: ['src/ts/**/*.test.ts', 'src/ts/**/*.spec.ts', 'src/ts/types/**'],
    },
    deps: {
      optimizer: {
        web: {
          include: ['dexie'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Task 6.3: Add fake-indexeddb dependency
**Command**: `npm install -D fake-indexeddb`

---

## Batch 7: Config File Updates

### Task 7.1: Update src/ts/config.ts
- [ ] Update any hardcoded GitHub Pages URLs
- [ ] Verify CORS proxy settings work with new domain

---

## Batch 8: Architecture Documentation

### Task 8.1: Update .claude/rules/architecture.md
- [ ] Update project name references
- [ ] Update deployment documentation
- [ ] Add Cloudflare Pages architecture notes

### Task 8.2: Update .claude/rules/utility-reference.md
- [ ] Update any URL references

---

## Verification Checklist

After all changes:

- [ ] Run `npx biome check src/` - must pass
- [ ] Run `npm run build` - must succeed
- [ ] Run `npm test` - must pass
- [ ] Test local dev server: `npm run dev`
- [ ] Verify PWA manifest in browser DevTools
- [ ] Test on grimbound.com after deployment
- [ ] Verify HTTPS redirect works
- [ ] Verify www redirect works
- [ ] Test GitHub data sync still works
- [ ] Verify service worker caching

---

## Rollback Plan

If issues occur:
1. Revert vite.config.ts base path changes
2. Re-enable GitHub Pages deployment
3. Point DNS back to GitHub Pages via CNAME

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Name, description |
| `vite.config.ts` | Base path, PWA manifest |
| `index.html` | Title, meta tags |
| `src/components/Layout/AppHeader.tsx` | Header title |
| `.github/workflows/deploy.yml` | Cloudflare Pages deployment |
| `.github/workflows/release.yml` | URLs, filenames |
| `README.md` | Full rebrand |
| `CONTRIBUTING.md` | Title, URLs |
| `CLAUDE.md` | Project name |
| `CHANGELOG.md` | New version entry |
| `vitest.config.ts` | Setup file, deps |
| `src/test/setup.ts` | New file - test mocks |
| `.claude/rules/architecture.md` | Documentation |

---

## Estimated Changes

- **Files Modified**: ~15
- **New Files**: 1 (test setup)
- **Complexity**: Medium
- **Risk**: Low (mostly string replacements + deployment config)

---

**Ready for approval? Reply with "approved" to proceed with implementation.**
