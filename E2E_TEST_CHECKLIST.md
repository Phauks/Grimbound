# E2E Manual Test Checklist - GitHub Data Sync v0.3.0

## Test Environment Setup
- [ ] Clear browser cache and IndexedDB
- [ ] Open browser DevTools (Console + Application tabs)
- [ ] Load app in development mode: `npm run dev`

---

## Test 1: First-Time User Flow
**Goal:** Verify initial sync from GitHub works correctly

### Steps:
1. [ ] Clear all browser storage (IndexedDB, localStorage, Cache API)
2. [ ] Open the app
3. [ ] Observe initial sync behavior

### Expected Results:
- [ ] Sync status indicator appears in header (checking → downloading → synced)
- [ ] SyncProgressBar appears if download takes > 3s
- [ ] Console logs show: "[DataSyncService] Initializing..."
- [ ] Console logs show: "[DataSyncService] Starting download and install..."
- [ ] Console logs show: "[DataSyncService] Successfully installed version: vXXXX.XX.XX-rX"
- [ ] Version displayed in sync status indicator
- [ ] Token generation works with official characters
- [ ] Check IndexedDB (DevTools → Application → IndexedDB):
  - [ ] Database "botc-token-generator" exists
  - [ ] "characters" store populated (should have 170+ characters)
  - [ ] "metadata" store has version, lastSync, characterCount
- [ ] Check Cache API (DevTools → Application → Cache Storage):
  - [ ] Cache "botc-character-icons-v1" exists
  - [ ] Contains .webp icon files

---

## Test 2: Returning User Flow
**Goal:** Verify cached data is used immediately

### Steps:
1. [ ] After Test 1, close and reopen the app (or refresh)
2. [ ] Observe load behavior

### Expected Results:
- [ ] App loads instantly with cached data
- [ ] Console shows: "[DataSyncService] Using cached data: vXXXX.XX.XX-rX"
- [ ] Background update check occurs (non-blocking)
- [ ] Console shows: "[DataSyncService] Checking for updates..." (after app loads)
- [ ] If no update: "[DataSyncService] No updates available (304 Not Modified)"
- [ ] Token generation works immediately

---

## Test 3: Update Available Flow
**Goal:** Verify update detection and download

### Setup:
This test requires simulating a new release. Since we can't easily do this in production, verify the logic works:

### Steps:
1. [ ] Open SyncDetailsModal (click sync status indicator)
2. [ ] Click "Check for Updates" button
3. [ ] Observe behavior

### Expected Results:
- [ ] Button shows loading state
- [ ] If update available:
  - [ ] "Download Update" button appears
  - [ ] Click to download
  - [ ] Progress bar shows download progress
  - [ ] Success notification after install
  - [ ] Version number updates
- [ ] If no update:
  - [ ] Message: "You're on the latest version"

---

## Test 4: Sync Details Modal
**Goal:** Verify all sync information displays correctly

### Steps:
1. [ ] Click sync status indicator in header
2. [ ] SyncDetailsModal opens
3. [ ] Inspect all displayed information

### Expected Results:
- [ ] Current version displayed (e.g., "v2025.12.03-r6")
- [ ] Data source shown (e.g., "GitHub Releases")
- [ ] Last sync timestamp (e.g., "2 minutes ago")
- [ ] Character count (e.g., "174 characters cached")
- [ ] Cache size displayed (e.g., "1.2 MB")
- [ ] Cache images count (e.g., "174 icons")
- [ ] "Check for Updates" button functional
- [ ] "Clear Cache & Resync" button functional

---

## Test 5: Settings Integration
**Goal:** Verify sync settings work correctly

### Steps:
1. [ ] Open Settings modal
2. [ ] Find "Data Synchronization" section
3. [ ] Test auto-sync toggle
4. [ ] Test "View Sync Details" button

### Expected Results:
- [ ] Current sync status displayed
- [ ] Auto-sync toggle works (persisted to IndexedDB settings)
- [ ] Toggle state persists across page reloads
- [ ] "View Sync Details" button opens SyncDetailsModal
- [ ] Settings modal closes when opening SyncDetailsModal

---

## Test 6: Clear Cache & Resync
**Goal:** Verify cache clearing and re-downloading works

### Steps:
1. [ ] Open SyncDetailsModal
2. [ ] Click "Clear Cache & Resync"
3. [ ] Confirm action
4. [ ] Observe resync behavior

### Expected Results:
- [ ] Console shows: "[DataSyncService] Clearing cache and resyncing..."
- [ ] All cached data cleared from IndexedDB and Cache API
- [ ] New download initiated
- [ ] Progress bar appears
- [ ] Success notification after completion
- [ ] Version may stay same or update
- [ ] Check DevTools:
  - [ ] IndexedDB repopulated
  - [ ] Cache API repopulated

---

## Test 7: Offline Mode
**Goal:** Verify app works offline with cached data

### Steps:
1. [ ] Ensure data is cached (run Tests 1-2 first)
2. [ ] Open DevTools → Network tab
3. [ ] Enable "Offline" mode
4. [ ] Refresh the page

### Expected Results:
- [ ] App loads successfully
- [ ] Sync status shows "Offline" or "Using cached data"
- [ ] Console shows: "[DataSyncService] Using cached data: vXXXX.XX.XX-rX"
- [ ] Background update check fails gracefully (no error shown to user)
- [ ] Token generation works with cached data
- [ ] All features functional except update checks

---

## Test 8: GitHub Unavailable Fallback
**Goal:** Verify fallback behavior when GitHub is down

### Setup:
This test requires blocking GitHub API requests. Use DevTools Network tab:
1. [ ] DevTools → Network tab
2. [ ] Click "Block request URL" and add pattern: `*github.com*`

### Steps:
1. [ ] Clear all browser storage
2. [ ] With GitHub blocked, load the app

### Expected Results (Current Implementation):
- [ ] Console shows GitHub fetch errors
- [ ] Sync status indicator shows error state
- [ ] App should gracefully degrade
- [ ] Character data not available (since legacy API deprecated)

**Note:** The implementation plan mentions a legacy API fallback, but based on code review this was deprecated. The app relies on either GitHub or cached data.

---

## Test 9: Character Lookup Service
**Goal:** Verify character lookup and validation works

### Steps:
1. [ ] Ensure data is synced (Test 1-2)
2. [ ] Open browser console
3. [ ] Test character lookup:
```javascript
// Access via window (if exposed) or via React DevTools
// This is a backend service test - frontend autocomplete UI was deferred
```

### Expected Results:
- [ ] characterLookupService populated with official data
- [ ] Character ID validation works in scriptParser
- [ ] Script validation shows warnings for invalid character IDs

**Note:** Visual autocomplete UI was deferred (requires CodeMirror 6). Core validation logic is complete.

---

## Test 10: Script Input with Official Data
**Goal:** Verify scripts load and validate with official character data

### Steps:
1. [ ] Load an example script (Gallery view → Select existing script)
2. [ ] Observe script parsing and character display
3. [ ] Try loading an all-roles script

### Expected Results:
- [ ] Script parses successfully
- [ ] All character tokens generate
- [ ] Character images load from cache
- [ ] No console errors for character lookup
- [ ] Invalid character IDs show validation warnings

---

## Test 11: Performance Verification
**Goal:** Verify performance meets benchmarks

### Steps:
1. [ ] Open DevTools → Performance tab
2. [ ] Test various operations

### Expected Results:
- [ ] **IndexedDB read latency:** < 50ms (check in Network/Performance tab)
- [ ] **Full sync time:** < 5s for typical release (check console timestamps)
- [ ] **App load with cache:** < 1s to interactive
- [ ] **Memory usage during sync:** < 50 MB (DevTools → Memory)

---

## Test 12: Error Handling
**Goal:** Verify errors are handled gracefully

### Steps to Test:
1. [ ] **Corrupt cache test:**
   - Manually corrupt IndexedDB data (DevTools → Application → IndexedDB → Delete some entries)
   - Refresh app
   - Should detect corruption and offer to resync

2. [ ] **Network interruption during sync:**
   - Start cache clear & resync
   - Enable offline mode mid-download
   - Should show error and allow retry

3. [ ] **Invalid package structure:**
   - This is tested in unit tests, verify error messages in console

### Expected Results:
- [ ] All errors logged to console
- [ ] User-friendly error messages displayed
- [ ] No app crashes
- [ ] Retry options available

---

## Test 13: Cross-Browser Compatibility
**Goal:** Verify feature works across browsers

### Browsers to Test:
- [ ] **Chrome/Edge** (Chromium-based)
  - IndexedDB support: ✓
  - Cache API support: ✓
  - Expected: Full functionality

- [ ] **Firefox**
  - IndexedDB support: ✓
  - Cache API support: ✓
  - Expected: Full functionality

- [ ] **Safari** (if available)
  - IndexedDB support: ✓ (with quota limits)
  - Cache API support: ✓
  - Expected: Full functionality (may prompt for storage permission)

### Expected Results:
- [ ] Feature works in all modern browsers
- [ ] Safari may show storage permission dialog
- [ ] No browser-specific errors

---

## Test 14: Storage Quota Management
**Goal:** Verify quota checking and handling

### Steps:
1. [ ] Open SyncDetailsModal
2. [ ] Check displayed storage info
3. [ ] Verify quota warnings if near limit

### Expected Results:
- [ ] Storage used displayed accurately
- [ ] Storage quota displayed (if available from browser)
- [ ] Warning shown if near quota (> 80%)
- [ ] Total storage reasonable (< 25 MB for full dataset)

---

## Test 15: Accessibility Audit
**Goal:** Verify sync UI is accessible

### Steps:
1. [ ] Open browser DevTools → Lighthouse
2. [ ] Run accessibility audit
3. [ ] Test keyboard navigation

### Expected Results:
- [ ] Lighthouse accessibility score: > 90
- [ ] All interactive elements keyboard accessible:
  - [ ] Sync status indicator (Tab to focus, Enter to open modal)
  - [ ] Modal close button (Esc to close)
  - [ ] All buttons in SyncDetailsModal
- [ ] Proper ARIA labels on all components
- [ ] Screen reader friendly (test with built-in screen reader if possible)

---

## Test Summary

**Total Tests:** 15
**Tests Passed:** ___ / 15
**Tests Failed:** ___ / 15
**Tests Skipped:** ___ / 15 (with reason)

---

## Notes

- **Deferred Features:** Visual autocomplete UI in JSON editor (requires CodeMirror 6 integration)
- **Current Workaround:** Manual JSON editing with validation warnings
- **Known Limitations:**
  - Legacy API fallback deprecated (GitHub or cache only)
  - First-time users require internet connection
  - Safari may have stricter storage quota limits

---

## Sign-Off

**Tester:** ___________________
**Date:** ___________________
**Version Tested:** v0.3.0
**Build:** ___________________

**Overall Assessment:**
- [ ] Ready for production
- [ ] Needs fixes (specify below)
- [ ] Blocked (specify below)

**Issues Found:**
```
[List any issues discovered during testing]
```

**Recommendations:**
```
[Any recommendations for improvements or follow-up work]
```
