import { describe, expect, it } from 'vitest';
import { getTeamStyleClass, normalizeTeamName, TEAM_CLASS_MAP } from '@/ts/utils/teamUtils';

describe('teamUtils', () => {
  describe('TEAM_CLASS_MAP', () => {
    it('should have all standard teams', () => {
      expect(TEAM_CLASS_MAP.townsfolk).toBe('teamTownsfolk');
      expect(TEAM_CLASS_MAP.outsider).toBe('teamOutsider');
      expect(TEAM_CLASS_MAP.minion).toBe('teamMinion');
      expect(TEAM_CLASS_MAP.demon).toBe('teamDemon');
      expect(TEAM_CLASS_MAP.fabled).toBe('teamFabled');
      expect(TEAM_CLASS_MAP.loric).toBe('teamLoric');
      expect(TEAM_CLASS_MAP.meta).toBe('teamMeta');
    });

    it('should handle both traveller spellings', () => {
      expect(TEAM_CLASS_MAP.traveller).toBe('teamTraveller');
      expect(TEAM_CLASS_MAP.traveler).toBe('teamTraveller');
    });
  });

  describe('getTeamStyleClass', () => {
    const mockStyles: Record<string, string> = {
      teamTownsfolk: 'scoped-townsfolk-123',
      teamOutsider: 'scoped-outsider-456',
      teamMinion: 'scoped-minion-789',
      teamDemon: 'scoped-demon-abc',
      teamTraveller: 'scoped-traveller-def',
      teamFabled: 'scoped-fabled-ghi',
      teamLoric: 'scoped-loric-jkl',
      teamMeta: 'scoped-meta-mno',
    };

    it('should return correct class for townsfolk', () => {
      expect(getTeamStyleClass('townsfolk', mockStyles)).toBe('scoped-townsfolk-123');
    });

    it('should return correct class for outsider', () => {
      expect(getTeamStyleClass('outsider', mockStyles)).toBe('scoped-outsider-456');
    });

    it('should return correct class for minion', () => {
      expect(getTeamStyleClass('minion', mockStyles)).toBe('scoped-minion-789');
    });

    it('should return correct class for demon', () => {
      expect(getTeamStyleClass('demon', mockStyles)).toBe('scoped-demon-abc');
    });

    it('should return correct class for traveller', () => {
      expect(getTeamStyleClass('traveller', mockStyles)).toBe('scoped-traveller-def');
    });

    it('should handle American spelling traveler', () => {
      expect(getTeamStyleClass('traveler', mockStyles)).toBe('scoped-traveller-def');
    });

    it('should return correct class for fabled', () => {
      expect(getTeamStyleClass('fabled', mockStyles)).toBe('scoped-fabled-ghi');
    });

    it('should return correct class for loric', () => {
      expect(getTeamStyleClass('loric', mockStyles)).toBe('scoped-loric-jkl');
    });

    it('should be case-insensitive', () => {
      expect(getTeamStyleClass('TOWNSFOLK', mockStyles)).toBe('scoped-townsfolk-123');
      expect(getTeamStyleClass('Demon', mockStyles)).toBe('scoped-demon-abc');
      expect(getTeamStyleClass('MINION', mockStyles)).toBe('scoped-minion-789');
    });

    it('should default to townsfolk for undefined team', () => {
      expect(getTeamStyleClass(undefined, mockStyles)).toBe('scoped-townsfolk-123');
    });

    it('should fallback to townsfolk for unknown team', () => {
      expect(getTeamStyleClass('unknown', mockStyles)).toBe('scoped-townsfolk-123');
    });

    it('should return empty string if styles object lacks fallback', () => {
      const emptyStyles = {};
      expect(getTeamStyleClass('townsfolk', emptyStyles)).toBe('');
    });

    it('should try dynamic class name for unknown teams', () => {
      const stylesWithCustom = {
        ...mockStyles,
        teamCustom: 'scoped-custom-xyz',
      };
      expect(getTeamStyleClass('custom', stylesWithCustom)).toBe('scoped-custom-xyz');
    });
  });

  describe('normalizeTeamName', () => {
    it('should return lowercase team name', () => {
      expect(normalizeTeamName('Townsfolk')).toBe('townsfolk');
      expect(normalizeTeamName('DEMON')).toBe('demon');
      expect(normalizeTeamName('Minion')).toBe('minion');
    });

    it('should normalize traveler to traveller', () => {
      expect(normalizeTeamName('traveler')).toBe('traveller');
      expect(normalizeTeamName('Traveler')).toBe('traveller');
      expect(normalizeTeamName('TRAVELER')).toBe('traveller');
    });

    it('should keep traveller as is', () => {
      expect(normalizeTeamName('traveller')).toBe('traveller');
      expect(normalizeTeamName('Traveller')).toBe('traveller');
    });

    it('should default to townsfolk for undefined', () => {
      expect(normalizeTeamName(undefined)).toBe('townsfolk');
    });

    it('should handle empty string', () => {
      expect(normalizeTeamName('')).toBe('townsfolk');
    });

    it('should handle other teams without modification', () => {
      expect(normalizeTeamName('outsider')).toBe('outsider');
      expect(normalizeTeamName('fabled')).toBe('fabled');
      expect(normalizeTeamName('loric')).toBe('loric');
    });
  });
});
