import { describe, expect, it } from 'vitest';
import {
  getTeamsFromTags,
  getTypeFromTags,
  getUserTags,
  isStarred,
  isSystemTag,
  isTeamTag,
  isTypeTag,
  TEAM_TAGS,
  TYPE_TAGS,
  toggleTag,
  validateTags,
} from '@/ts/services/upload/tagUtils.js';

describe('tagUtils', () => {
  describe('isSystemTag', () => {
    it('should return true for type: prefixed tags', () => {
      expect(isSystemTag('type:icon')).toBe(true);
      expect(isSystemTag('type:token-background')).toBe(true);
    });

    it('should return true for team: prefixed tags', () => {
      expect(isSystemTag('team:townsfolk')).toBe(true);
      expect(isSystemTag('team:demon')).toBe(true);
    });

    it('should return false for user tags', () => {
      expect(isSystemTag('homebrew')).toBe(false);
      expect(isSystemTag('starred')).toBe(false);
      expect(isSystemTag('scary')).toBe(false);
    });
  });

  describe('isTypeTag', () => {
    it('should return true only for type: prefixed tags', () => {
      expect(isTypeTag('type:icon')).toBe(true);
      expect(isTypeTag('team:townsfolk')).toBe(false);
      expect(isTypeTag('homebrew')).toBe(false);
    });
  });

  describe('isTeamTag', () => {
    it('should return true only for team: prefixed tags', () => {
      expect(isTeamTag('team:townsfolk')).toBe(true);
      expect(isTeamTag('type:icon')).toBe(false);
      expect(isTeamTag('homebrew')).toBe(false);
    });
  });

  describe('getTypeFromTags', () => {
    it('should extract type from tags array', () => {
      expect(getTypeFromTags(['type:icon', 'homebrew'])).toBe('icon');
      expect(getTypeFromTags(['type:token-background', 'team:demon'])).toBe('token-background');
    });

    it('should return null if no type tag', () => {
      expect(getTypeFromTags(['homebrew', 'starred'])).toBeNull();
      expect(getTypeFromTags([])).toBeNull();
    });
  });

  describe('getTeamsFromTags', () => {
    it('should extract all team tags', () => {
      expect(getTeamsFromTags(['type:icon', 'team:townsfolk', 'team:outsider'])).toEqual([
        'townsfolk',
        'outsider',
      ]);
    });

    it('should return empty array if no team tags', () => {
      expect(getTeamsFromTags(['type:icon', 'homebrew'])).toEqual([]);
    });
  });

  describe('isStarred', () => {
    it('should return true if starred tag present', () => {
      expect(isStarred(['type:icon', 'starred'])).toBe(true);
    });

    it('should return false if starred tag absent', () => {
      expect(isStarred(['type:icon', 'homebrew'])).toBe(false);
    });
  });

  describe('getUserTags', () => {
    it('should return only user-defined tags', () => {
      expect(getUserTags(['type:icon', 'team:townsfolk', 'starred', 'homebrew', 'scary'])).toEqual([
        'homebrew',
        'scary',
      ]);
    });
  });

  describe('toggleTag', () => {
    it('should add tag if not present', () => {
      expect(toggleTag(['type:icon'], 'starred')).toEqual(['type:icon', 'starred']);
    });

    it('should remove tag if present', () => {
      expect(toggleTag(['type:icon', 'starred'], 'starred')).toEqual(['type:icon']);
    });
  });

  describe('validateTags', () => {
    it('should pass for valid tags with one type', () => {
      const result = validateTags(['type:icon', 'homebrew']);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail if no type tag', () => {
      const result = validateTags(['homebrew', 'starred']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must have exactly one type:* tag');
    });

    it('should fail if multiple type tags', () => {
      const result = validateTags(['type:icon', 'type:logo']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must have exactly one type:* tag');
    });

    it('should fail for invalid type tag', () => {
      const result = validateTags(['type:invalid']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid type tag');
    });

    it('should fail for invalid team tag', () => {
      const result = validateTags(['type:icon', 'team:invalid']);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid team tag');
    });
  });

  describe('constants', () => {
    it('should have expected TYPE_TAGS', () => {
      expect(TYPE_TAGS).toContain('icon');
      expect(TYPE_TAGS).toContain('token-background');
      expect(TYPE_TAGS).toContain('script-background');
      expect(TYPE_TAGS).toContain('setup');
      expect(TYPE_TAGS).toContain('accent');
      expect(TYPE_TAGS).toContain('logo');
      expect(TYPE_TAGS).toContain('studio-icon');
      expect(TYPE_TAGS).toContain('studio-logo');
      expect(TYPE_TAGS).toContain('studio-project');
    });

    it('should have expected TEAM_TAGS', () => {
      expect(TEAM_TAGS).toContain('townsfolk');
      expect(TEAM_TAGS).toContain('outsider');
      expect(TEAM_TAGS).toContain('minion');
      expect(TEAM_TAGS).toContain('demon');
      expect(TEAM_TAGS).toContain('traveller');
      expect(TEAM_TAGS).toContain('fabled');
      expect(TEAM_TAGS).toContain('loric');
    });
  });
});
