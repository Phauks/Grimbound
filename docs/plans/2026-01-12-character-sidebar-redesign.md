# Character Sidebar Redesign

**Date:** 2026-01-12
**Status:** Approved

## Overview

Redesign the CharacterNavigation sidebar in Characters view to be more minimal and compact, removing boxy team dividers and improving visual consistency with the rest of the application.

## Design Decisions

- **Layout:** Inline team labels with dashed line extending to count
- **Thumbnails:** Standard size (32px)
- **Header:** Two ghost buttons (`+` for custom, `📚` for official)
- **Selected state:** Full-width subtle background, no accent bars
- **Collapse:** Removed entirely - all teams always expanded

## Visual Design

```
┌───────────────────────────────────┐
│ CHARACTERS                  +  📚 │
├───────────────────────────────────┤
│                                   │
│ townsfolk ──────────────────── 3  │
│  ○ Washerwoman               ②   │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Selected
│  ○ Librarian                 ①   │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ○ Investigator              ✦   │
│                                   │
│ outsiders ─────────────────── 2   │
│  ○ Drunk                         │
│  ○ Saint                     ①   │
│                                   │
│ minions ──────────────────── 2    │
│  ○ Poisoner                  ③   │
│  ○ Baron                         │
│                                   │
│ demons ───────────────────── 1    │
│  ○ Imp                       ②   │
└───────────────────────────────────┘
```

## Specifications

### Header
| Element | Value |
|---------|-------|
| Title | `CHARACTERS` - 0.75rem, uppercase, letter-spacing 0.5px, `--text-muted` |
| Buttons | Ghost variant, 24×24px, `<Button variant="ghost" size="small" isIconOnly />` |
| `+` button | Creates new custom character |
| `📚` button | Opens official character drawer |

### Team Labels
| Element | Value |
|---------|-------|
| Text | 0.7rem, lowercase, team color |
| Line | 1px dashed, `--border-color` at 50% opacity |
| Count | 0.7rem, `--text-muted`, right-aligned |
| Spacing | 12px gap above each team section (except first) |

### Character Rows
| Element | Value |
|---------|-------|
| Thumbnail | 32px circle |
| Name | 0.875rem, `--text-primary` |
| Row padding | 6px vertical, 8px horizontal |
| Reminder count | Small circled number, `--text-muted` |
| Official badge | `✦` in `--color-accent` |

### Selected State
| Element | Value |
|---------|-------|
| Background | `var(--color-primary-subtle)` full width |
| Border-radius | 4px |

## Implementation Steps

### 1. Update CharacterNavigation.tsx
- [ ] Remove `collapsedTeams` state and all collapse/expand logic
- [ ] Remove `toggleTeamCollapse` and `toggleAllCollapse` functions
- [ ] Update header to use `<Button>` components instead of custom styled buttons
- [ ] Change title from "Characters" to uppercase "CHARACTERS" with new styling
- [ ] Update team section rendering to use inline label + dashed line pattern
- [ ] Remove `teamHeader` button elements, replace with styled div
- [ ] Simplify character item rendering (remove team border classes)

### 2. Update CharacterNavigation.module.css
- [ ] Update `.header` styles (smaller title, different layout)
- [ ] Remove `.iconBtn` and `.addBtn` styles (using Button component)
- [ ] Add new `.teamLabel` styles for inline team labels with dashed line
- [ ] Remove `.teamHeader` button styles
- [ ] Remove `.collapseIcon` styles
- [ ] Simplify `.item` styles (remove left border, update selected state)
- [ ] Remove team-specific border classes (`.teamTownsfolk`, etc. for items)
- [ ] Keep team color variables for label text color
- [ ] Update `.selected` to use full-width background only

### 3. Clean Up
- [ ] Remove unused CSS classes
- [ ] Run biome check
- [ ] Test all interactions (select, hover, add, delete, drag-drop team change)

## Files to Modify

1. `src/components/ViewComponents/CharactersComponents/CharacterNavigation.tsx`
2. `src/styles/components/characterEditor/CharacterNavigation.module.css`

## Migration Notes

- Collapse state is removed entirely, no migration needed
- Existing functionality (context menu, drag-drop team change, delete confirmation) preserved
- Button components imported from `@/components/Shared/UI/Button`
