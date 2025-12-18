# Contributing to Clocktower Token Generator

Thank you for your interest in contributing to the Clocktower Token Generator! 🎉

This document provides guidelines and information to help you contribute effectively.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Architecture](#project-architecture)
- [Need Help?](#need-help)

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18.x or 20.x (LTS recommended)
- **npm**: Comes with Node.js
- **Git**: For version control
- A code editor (VS Code, WebStorm, etc.)

### Initial Setup

1. **Fork the Repository**
   - Visit [Clocktower Token Generator](https://github.com/Phauks/Clocktower_Token_Generator)
   - Click the "Fork" button in the top right

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Clocktower_Token_Generator.git
   cd Clocktower_Token_Generator
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Verify Setup**
   ```bash
   npm run validate  # Runs lint + test + build
   ```

5. **Set Up Upstream Remote** (to sync with main repo)
   ```bash
   git remote add upstream https://github.com/Phauks/Clocktower_Token_Generator.git
   ```

---

## Development Workflow

### 1. Sync With Main Repository

Before starting work, ensure your fork is up to date:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create a Feature Branch

Use descriptive branch names following this pattern:

```bash
# Format: <type>/<short-description>
git checkout -b feature/curved-text-rendering
git checkout -b fix/pdf-metadata-encoding
git checkout -b docs/update-installation-steps
git checkout -b refactor/simplify-canvas-utils
```

**Branch Types:**
- `feature/` - New functionality
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code improvements without functionality changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks (dependencies, configs)

### 3. Make Your Changes

**IMPORTANT:** Before writing new code, consult [CLAUDE.md](./CLAUDE.md) to:
- Check for existing utilities
- Understand module organization
- Follow established patterns
- Avoid code duplication

```bash
# Run development server with hot reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Run TypeScript compiler in watch mode
npm run watch
```

### 4. Test Your Changes

```bash
# Run all validation checks (required before committing)
npm run validate

# Individual checks
npm run lint        # TypeScript type checking
npm test            # Unit tests
npm run build       # Build TypeScript

# Coverage report
npm run test:coverage
```

### 5. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
git add .
git commit -m "feat(canvas): add curved text rendering utility"
```

See [Commit Guidelines](#commit-guidelines) for more details.

### 6. Push and Create Pull Request

```bash
git push origin feature/curved-text-rendering
```

Then open a Pull Request on GitHub and fill out the PR template.

---

## Code Standards

### TypeScript

- **Strict Mode**: Enabled in `tsconfig.json`
- **No `any` types**: Use proper typing or `unknown` with type guards
- **Explicit return types**: For public functions and methods
- **Import extensions**: Use `.js` extensions (for ESM compatibility)

```typescript
// ✅ Good
export function calculateRadius(diameter: number): number {
  return diameter / 2;
}

// ❌ Bad
export function calculateRadius(diameter) {
  return diameter / 2;
}
```

### Path Aliases (REQUIRED)

**Always use `@/` path aliases instead of relative imports with `../`**

```typescript
// ✅ CORRECT - Use @/ alias
import { logger } from '@/ts/utils/logger.js';
import { useTokenGenerator } from '@/hooks/useTokenGenerator';
import styles from '@/styles/components/Button.module.css';

// ❌ WRONG - Avoid deep relative imports
import { logger } from '../../../ts/utils/logger.js';

// ⚠️ ACCEPTABLE - Same directory or one level up
import { ButtonProps } from './types';
import { BaseComponent } from '../BaseComponent';
```

The `@` alias maps to `src/`. See [CLAUDE.md](./CLAUDE.md#import-conventions) for full details.

### Module Organization

Follow the structure defined in [CLAUDE.md](./CLAUDE.md):

```
src/ts/
├── canvas/       # Canvas drawing utilities
├── data/         # Data loading and parsing
├── sync/         # GitHub data synchronization
├── export/       # Export functionality (PDF, PNG, ZIP)
├── generation/   # Token generation
├── types/        # Type definitions
├── ui/           # UI utilities
└── utils/        # General utilities
```

### Before Creating New Utilities

**Always check if functionality exists first:**

```bash
# Search for similar functions
npm run dev  # Then search in the codebase

# Common locations:
# - src/ts/utils/      (string, image, async, color utils)
# - src/ts/canvas/     (canvas operations)
# - src/ts/data/       (data loading, validation)
# - src/ts/constants.ts (magic numbers, layout ratios)
```

### Constants vs Magic Numbers

```typescript
// ❌ Bad - Magic numbers
const imageSize = diameter * 0.65;
const textRadius = radius * 0.85;

// ✅ Good - Use constants
import { CHARACTER_LAYOUT } from '@/ts/constants.js';

const imageSize = diameter * CHARACTER_LAYOUT.IMAGE_SIZE_RATIO;
const textRadius = radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;
```

### Logging

**ALWAYS use logger, never console:**

```typescript
import { logger } from '@/ts/utils/logger.js';

// Basic logging
logger.debug('Component', 'Debug info', data);
logger.info('Service', 'Operation completed');
logger.warn('Cache', 'Cache miss', { key });
logger.error('Generator', 'Failed to generate', error);

// Child loggers for modules
const syncLogger = logger.child('DataSync');
syncLogger.info('Checking for updates');

// Performance timing
const result = await logger.time('Generator', 'Generate tokens', async () => {
  return await generateAllTokens(characters);
});
```

### Error Handling

Use typed error classes from `src/ts/errors.ts`:

```typescript
import { TokenCreationError, ValidationError, ErrorHandler } from '@/ts/errors.js';

// For token generation errors
throw new TokenCreationError('Failed to render text', characterName, error);

// For validation errors
throw new ValidationError('Invalid script data', validationErrors);

// Handling errors
try {
  await operation();
} catch (error) {
  const message = ErrorHandler.getUserMessage(error);
  ErrorHandler.log(error, 'ComponentName');
}
```

---

## Testing

### Test Requirements

- **Minimum Coverage**: 80% overall
- **New Features**: Must include tests
- **Bug Fixes**: Add regression tests
- **Test Frameworks**: Vitest + jsdom

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With UI (visual test runner)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Writing Tests

```typescript
// src/ts/utils/__tests__/stringUtils.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../stringUtils.js';

describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    const result = sanitizeFilename('file<name>?.txt');
    expect(result).toBe('filename.txt');
  });

  it('should handle empty strings', () => {
    const result = sanitizeFilename('');
    expect(result).toBe('untitled');
  });
});
```

### Test Organization

- Place tests in `__tests__/` directories
- Name files: `*.test.ts`
- Mock external dependencies in `__mocks__/` directories

---

## Commit Guidelines

### Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples:**

```bash
# Feature
git commit -m "feat(canvas): add support for curved text rendering"

# Bug fix
git commit -m "fix(export): correct PDF metadata encoding for special characters"

# Documentation
git commit -m "docs(readme): update installation instructions for Windows users"

# Refactoring
git commit -m "refactor(utils): simplify image loading error handling"

# Tests
git commit -m "test(generation): add tests for batch token creation"

# Chore
git commit -m "chore(deps): update TypeScript to 5.7.0"
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(sync): add GitHub data synchronization` |
| `fix` | Bug fix | `fix(canvas): resolve text clipping issue` |
| `docs` | Documentation | `docs(claude): update architecture guide` |
| `style` | Code style (formatting, no logic change) | `style: fix indentation in tokenGenerator` |
| `refactor` | Code refactoring | `refactor(utils): extract common validation logic` |
| `perf` | Performance improvement | `perf(canvas): optimize image caching` |
| `test` | Adding/updating tests | `test(export): add ZIP export tests` |
| `build` | Build system changes | `build: update Vite configuration` |
| `ci` | CI/CD changes | `ci: add workflow for automated testing` |
| `chore` | Maintenance | `chore: update dependencies` |
| `revert` | Revert previous commit | `revert: revert "feat(canvas): add curved text"` |

### Scope Examples

- `canvas`, `export`, `sync`, `generation`, `data`, `ui`, `utils`
- `deps`, `ci`, `readme`, `types`

### Subject Guidelines

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Keep under 50 characters

### Body (Optional but Recommended)

Explain **what** and **why**, not **how**:

```
feat(sync): add GitHub data synchronization

Implement offline-first data sync from GitHub releases using IndexedDB
and Cache API. This allows users to work offline and automatically
receive character data updates in the background.

Includes:
- DataSyncService orchestrator with event system
- GitHubReleaseClient with rate limiting
- PackageExtractor for ZIP validation
- StorageManager for IndexedDB + Cache API
- VersionManager for version comparison (vYYYY.MM.DD-rN)
```

### Footer (For Breaking Changes)

```
feat(api)!: change character validation API

BREAKING CHANGE: CharacterValidator.validate() now returns a Result object
instead of throwing errors. Update all callers to use Result.isSuccess().

Migration:
- Old: try { validator.validate(char) } catch (e) { }
- New: const result = validator.validate(char); if (!result.isSuccess()) { }
```

---

## Pull Request Process

### Before Submitting

1. **Validate Code**
   ```bash
   npm run validate  # Must pass!
   ```

2. **Update Documentation** (REQUIRED - see table below)
   - Update CHANGELOG.md with your changes
   - Add JSDoc comments to public APIs

### Documentation Update Requirements

| Change Type | Documents to Update |
|-------------|---------------------|
| New utility/hook | CLAUDE.md (utility tables) |
| Architecture change | ARCHITECTURE.md |
| Feature complete | ROADMAP.md, CHANGELOG.md |
| Bug fix | CHANGELOG.md |
| API change | CLAUDE.md, JSDoc comments |
| New pattern | CLAUDE.md (patterns section) |
| New error class | CLAUDE.md (error hierarchy) |

3. **Sync with Main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Creating the Pull Request

1. **Push Your Branch**
   ```bash
   git push origin feature/your-feature
   ```

2. **Open PR on GitHub**
   - Use the PR template (auto-populated)
   - Fill out all sections completely
   - Link related issues: `Fixes #123`, `Closes #456`

3. **PR Title Format**
   ```
   feat(canvas): add curved text rendering utility
   ```

### PR Review Process

1. **Automated Checks**
   - CI workflow must pass (lint + test + build)
   - Dependency security audit must pass
   - No merge conflicts

2. **Code Review**
   - At least one approval required
   - Address all review comments
   - Update PR based on feedback

3. **Merge Requirements**
   - All tests passing
   - No unresolved conversations
   - Branch up to date with main
   - Approved by maintainer

### After Merge

- Delete your feature branch (both local and remote)
- Celebrate! 🎉

---

## Project Architecture

### Key Principles

1. **Avoid Duplication**: Always search for existing utilities before creating new ones
2. **Follow Patterns**: Match existing code style and organization
3. **Type Safety**: Leverage TypeScript's type system fully
4. **Testability**: Write testable code with dependency injection
5. **Single Responsibility**: Each module/function should do one thing well

### Essential Reading

- **[CLAUDE.md](./CLAUDE.md)**: Complete code generation guide (READ THIS FIRST!)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System design and technical decisions
- **[ROADMAP.md](./ROADMAP.md)**: Development plans and priorities
- **[README.md](./README.md)**: Project overview and features
- **[CHANGELOG.md](./CHANGELOG.md)**: Version history and changes

### Module Structure

Each module follows this pattern:

```typescript
// src/ts/canvas/index.ts (barrel export)
export * from './canvasUtils.js';
export * from './textDrawing.js';
export * from './accentDrawing.js';
export * from './qrGeneration.js';
```

**Import from barrel exports:**

```typescript
// ✅ Preferred
import { createCanvas, drawCurvedText } from '@/ts/canvas/index.js';

// ✅ Also acceptable
import { createCanvas, drawCurvedText } from '@/ts/index.js';

// ❌ Avoid (bypasses barrel)
import { createCanvas } from '@/ts/canvas/canvasUtils.js';
```

### Adding New Features

**Checklist:**

- [ ] Is there existing code I can reuse? (Check CLAUDE.md)
- [ ] Does this belong in an existing module or need a new one?
- [ ] **Am I using `@/` path aliases for imports?** (No `../../../`)
- [ ] Have I added appropriate types to `types/index.ts`?
- [ ] Have I added constants to `constants.ts` instead of magic numbers?
- [ ] Have I written tests with >80% coverage?
- [ ] Have I updated relevant documentation?
- [ ] Have I added JSDoc comments for public APIs?

---

## Need Help?

### Resources

- **Documentation**
  - [CLAUDE.md](./CLAUDE.md) - Architecture and patterns
  - [README.md](./README.md) - Project overview
  - [TypeScript Docs](https://www.typescriptlang.org/docs/)

- **Issues**
  - [Existing Issues](https://github.com/Phauks/Clocktower_Token_Generator/issues)
  - [Feature Requests](https://github.com/Phauks/Clocktower_Token_Generator/issues/new?template=feature_request.md)
  - [Bug Reports](https://github.com/Phauks/Clocktower_Token_Generator/issues/new?template=bug_report.md)

### Getting Support

1. **Check Existing Issues**: Your question might already be answered
2. **Search Discussions**: Look through GitHub Discussions
3. **Ask in Issues**: Create a new issue with the "question" label
4. **Be Specific**: Provide context, code samples, and error messages

### Reporting Bugs

Use the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md):

- Describe the bug clearly
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment details (OS, Node version, browser)

### Suggesting Features

Use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md):

- Describe the feature and use case
- Explain why it would be valuable
- Provide examples or mockups if possible

---

## Code of Conduct

- **Be Respectful**: Treat all contributors with respect
- **Be Constructive**: Provide helpful feedback in reviews
- **Be Patient**: Everyone is learning and improving
- **Be Inclusive**: Welcome contributors of all skill levels

---

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

---

Thank you for contributing to Clocktower Token Generator! Your efforts help make this tool better for the entire Blood on the Clocktower community. 🎲🔪
