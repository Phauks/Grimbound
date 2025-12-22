# Claude Code Guide for Clocktower Token Generator

> **Purpose**: Essential rules Claude MUST follow every session. Detailed reference material is in `.claude/rules/`.

---

## Documentation Maintenance (CRITICAL)

**Claude MUST update documentation when making code changes:**

| Change Type | Update Required |
|-------------|-----------------|
| New utilities/functions | `.claude/rules/utility-reference.md` |
| Architecture changes | `.claude/rules/architecture.md` |
| New features | `ROADMAP.md` |
| Bug fixes | `CHANGELOG.md` under [Unreleased] |
| API changes | JSDoc comments + relevant rule file |
| New patterns | `.claude/rules/coding-patterns.md` |

**Documentation is NOT optional.** Undocumented code is incomplete code.

---

## Biome Validation (MANDATORY)

**All code changes MUST pass biome check before being considered complete.**

```bash
npx biome check src/
```

- Run `biome check` after ANY code modifications (runs lint + format + organize imports)
- Fix ALL errors and warnings before finishing
- No exceptions - failing biome check = incomplete work
- Use `--write` flag for auto-fixable issues: `npx biome check src/ --write`

**Work is NOT complete until `biome check` passes with zero errors.**

---

## Pre-Implementation Checklist

**Before writing ANY new code:**

### 1. Search for Existing Code (In Order)

| Priority | Location | Contains |
|----------|----------|----------|
| 1 | `src/ts/utils/` | General utilities (strings, images, JSON, colors, **logger**, **errorUtils**) |
| 2 | `src/ts/canvas/` | Canvas rendering (text, shapes, images, QR, gradients, pooling) |
| 3 | `src/ts/data/` | Data loading and script parsing |
| 4 | `src/ts/sync/` | GitHub data synchronization |
| 5 | `src/ts/export/` | Export utilities (PDF, PNG, ZIP) |
| 6 | `src/ts/generation/` | Token generation (Strategy Pattern, DI) |
| 7 | `src/ts/cache/` | Multi-tier caching |
| 8 | `src/ts/services/` | Service layer (projects, uploads) |
| 9 | `src/hooks/` | Custom React hooks (35+) |
| 10 | `src/contexts/` | React contexts |
| 11 | `src/ts/constants.ts` | Layout ratios, colors, timing |
| 12 | `src/ts/types/` | Type definitions |
| 13 | `src/ts/errors.ts` | Custom error hierarchy |

### 2. Check Before Creating

- [ ] Does a utility already exist? (Search by intent, not just name)
- [ ] Is there a similar pattern elsewhere?
- [ ] Should this be a constant instead of inline value?
- [ ] Should this be a type in `types/`?
- [ ] Should this be an error class in `errors.ts`?

### 3. Prefer Composition

```typescript
// Combine existing utilities rather than writing new ones
import { loadImage } from '@/ts/utils/imageUtils.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';

const { url } = await resolveCharacterImageUrl(imageUrl, characterId);
const image = await loadImage(url);
```

---

## Absolute Rules

### Use Logger (NEVER console)

```typescript
import { logger } from '@/ts/utils/logger.js';

logger.info('Module', 'Message');
logger.error('Module', 'Error', error);
```

### Use Error Classes

```typescript
import { TokenCreationError, ValidationError } from '@/ts/errors.js';

throw new TokenCreationError('Failed to render', characterName, originalError);
```

### Use SSOT for Character Images

```typescript
// ALWAYS use this for character image URLs
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';

const result = await resolveCharacterImageUrl(imageUrl, characterId);
// result.url, result.source, result.blobUrl
```

### Use Path Aliases (REQUIRED)

```typescript
// CORRECT
import { createCanvas } from '@/ts/canvas/index.js';
import { logger } from '@/ts/utils/index.js';
import styles from '@/styles/components/Button.module.css';

// WRONG - no deep relative imports
// import { logger } from '../../../ts/utils/logger.js';
```

---

## UI Decision Communication

**When proposing UI changes, generate ASCII art to visualize the layout for user approval before implementing.**

---

## Code Review Checklist

Before committing, verify:

- [ ] **Biome check passes** - `npx biome check src/` shows zero errors
- [ ] **Use `@/` path aliases** - no `../../../` imports
- [ ] NO `console.log/error/warn` - use `logger`
- [ ] NO magic numbers - use constants
- [ ] NO duplicated code - extract to utilities
- [ ] Complex hooks extracted to separate files
- [ ] Dependencies injected, not hard-coded
- [ ] Functions < 50 lines preferred
- [ ] No `any` types (use generics or `unknown`)
- [ ] Error handling uses error classes
- [ ] **Documentation updated**

---

## When to Create New Code

### Create New Utilities When:
- Functionality is used in 2+ places
- Logic is complex enough to warrant abstraction

### Create New Constants When:
- A magic number appears in code
- A value might need to change

### Create New Types When:
- An object shape is used in multiple places
- Type safety would catch bugs

### Create New Error Classes When:
- Error needs specific context
- User-facing message differs significantly

---

## Reference Documentation

Detailed documentation is in `.claude/rules/`:

| File | Contents |
|------|----------|
| `architecture.md` | System overview, data flow, module structure, ADRs |
| `coding-patterns.md` | DI, Strategy pattern, Hook extraction, detailed examples |
| `utility-reference.md` | All utility tables (utils, canvas, cache, hooks) |
| `testing-standards.md` | Test organization, coverage, patterns |

---

*Last updated: 2025-12-21*
*Version: v0.4.0*
