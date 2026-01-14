# Automatic Release Notes Design

**Date:** 2026-01-13
**Status:** Approved

---

## Overview

Implement automatic version bumping, changelog generation, and GitHub releases using semantic-release. Every push to `main` will analyze commits and create a release if warranted.

## Goals

- Automatic version calculation based on conventional commits
- Maintained CHANGELOG.md that accumulates across versions
- Structured GitHub release notes grouped by type
- No manual version tagging required

## Version Bump Rules

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:`, `perf:` | Patch | 0.6.0 → 0.6.1 |
| `feat:` | Minor | 0.6.0 → 0.7.0 |
| `feat!:`, `fix!:`, `BREAKING CHANGE:` | Major | 0.6.0 → 1.0.0 |
| `docs:`, `style:`, `refactor:`, `test:` | No release | - |
| `chore:`, `ci:`, `build:` | No release | - |
| `chore(deps):`, `chore(deps-dev):` | No release | - |

## Changelog Format

Grouped by type with scope inline:

```markdown
## [0.7.0] - 2026-01-15

### ✨ Features
- **assets:** add tag-based constants and studio type support
- **db:** update schema to v8 with tags and folders

### 🐛 Bug Fixes
- **autosave:** fix race condition in save trigger

### ⚡ Performance
- **cache:** improve LRU eviction performance
```

Dependency updates (`chore(deps):`) are excluded from release notes.

## Workflow

```
Push to main
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Checkout with full history       │
│ 2. Install dependencies             │
│ 3. Build and validate               │
│ 4. Run semantic-release             │
│    ├─ Analyze commits since v0.6.0  │
│    ├─ Calculate next version        │
│    ├─ Update CHANGELOG.md           │
│    ├─ Update package.json           │
│    ├─ Commit [skip ci]              │
│    ├─ Create git tag                │
│    └─ Create GitHub Release         │
└─────────────────────────────────────┘
```

## Files to Create/Modify

### New: `.releaserc.json`

```json
{
  "branches": ["main"],
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits",
      "releaseRules": [
        { "type": "feat", "release": "minor" },
        { "type": "fix", "release": "patch" },
        { "type": "perf", "release": "patch" },
        { "breaking": true, "release": "major" }
      ]
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits",
      "presetConfig": {
        "types": [
          { "type": "feat", "section": "✨ Features" },
          { "type": "fix", "section": "🐛 Bug Fixes" },
          { "type": "perf", "section": "⚡ Performance" }
        ]
      }
    }],
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    ["@semantic-release/npm", {
      "npmPublish": false
    }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
```

### Replace: `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, '[skip ci]')"

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and validate
        run: npm run build
        env:
          VITE_GOOGLE_FONTS_API_KEY: ${{ secrets.VITE_GOOGLE_FONTS_API_KEY }}

      - name: Run semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

### Update: `package.json`

Add devDependencies:

```json
{
  "devDependencies": {
    "semantic-release": "^24.0.0",
    "@semantic-release/changelog": "^6.0.0",
    "@semantic-release/git": "^10.0.0",
    "conventional-changelog-conventionalcommits": "^8.0.0"
  }
}
```

## Setup Steps

1. Install dependencies:
   ```bash
   npm install -D semantic-release @semantic-release/changelog @semantic-release/git conventional-changelog-conventionalcommits
   ```

2. Create `.releaserc.json` with configuration above

3. Replace `.github/workflows/release.yml` with new workflow

4. Create baseline tag (preserves current version):
   ```bash
   git tag v0.6.0
   git push origin v0.6.0
   ```

5. Commit and push changes to main - semantic-release takes over

## Testing

Dry run locally before enabling:

```bash
npx semantic-release --dry-run
```

## Gotchas

- **Squash merges**: Squash commit message must follow conventional format
- **Dependabot**: Uses `chore(deps):` which won't trigger releases (intended)
- **Protected branches**: GITHUB_TOKEN can push; if PR reviews required, need PAT or GitHub App

## Tool Choice Rationale

| Tool | Why Not Chosen |
|------|----------------|
| `standard-version` | Deprecated |
| `release-it` | Requires manual prompts |
| `changesets` | Designed for monorepos |
| Custom script | Maintenance burden |

`semantic-release` is the industry standard used by Angular, React, Babel, and thousands of other projects.
