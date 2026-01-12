/**
 * usePlayerScriptOrder Hook
 *
 * Manages character ordering for player script PDF.
 * Handles drag-and-drop reordering within teams using @dnd-kit.
 */

import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';
import type { PlayerScriptCharacter } from '@/ts/scriptPdf/types.js';
import {
  applyCustomOrder,
  generateCustomOrderFromTeams,
  groupCharactersByTeam,
  SCRIPT_TEAM_ORDER,
  separateCharactersByType,
} from '@/ts/scriptPdf/utils.js';
import type { Team } from '@/ts/types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface UsePlayerScriptOrderOptions {
  /** Characters to display (all types - main, fabled, travellers) */
  characters: PlayerScriptCharacter[];
  /** Custom order from settings (character IDs) */
  customOrder?: string[];
  /** Callback when order changes */
  onOrderChange: (newOrder: string[]) => void;
}

export interface UsePlayerScriptOrderResult {
  /** Main characters (no fabled/travellers) in display order */
  orderedCharacters: PlayerScriptCharacter[];
  /** Characters grouped by team with ordering applied */
  charactersByTeam: Map<Team, PlayerScriptCharacter[]>;
  /** Fabled characters (separate from main list) */
  fabled: PlayerScriptCharacter[];
  /** Traveller characters (separate from main list) */
  travellers: PlayerScriptCharacter[];
  /** IDs for SortableContext (per team) */
  teamItemIds: Map<Team, UniqueIdentifier[]>;
  /** Whether any item is being dragged */
  isDragging: boolean;
  /** ID of currently dragged item */
  activeId: UniqueIdentifier | null;
  /** Handler for DndContext onDragStart */
  onDragStart: (event: { active: { id: UniqueIdentifier } }) => void;
  /** Handler for DndContext onDragEnd */
  onDragEnd: (event: DragEndEvent) => void;
  /** Handler for DndContext onDragCancel */
  onDragCancel: () => void;
  /** Reset to SAO (Standard Amy Order) - clears custom order */
  resetToSAO: () => void;
  /** Move a character to a new index within its team */
  moveCharacter: (characterId: string, newIndex: number) => void;
  /** Whether custom order is active */
  hasCustomOrder: boolean;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePlayerScriptOrder({
  characters,
  customOrder,
  onOrderChange,
}: UsePlayerScriptOrderOptions): UsePlayerScriptOrderResult {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Separate main characters from fabled/travellers
  const { main, fabled, travellers } = separateCharactersByType(characters);

  // Apply custom ordering to main characters
  const orderedCharacters = applyCustomOrder(main, customOrder);

  // Group ordered characters by team
  const charactersByTeam = groupCharactersByTeam(orderedCharacters);

  // Generate item IDs for each team's SortableContext
  const teamItemIds = new Map<Team, UniqueIdentifier[]>();
  for (const team of SCRIPT_TEAM_ORDER) {
    const teamChars = charactersByTeam.get(team) || [];
    teamItemIds.set(
      team,
      teamChars.map((c) => c.id)
    );
  }

  // Check if custom order is active
  const hasCustomOrder = Boolean(customOrder && customOrder.length > 0);

  /**
   * Handle drag start
   */
  const onDragStart = (event: { active: { id: UniqueIdentifier } }) => {
    setActiveId(event.active.id);
  };

  /**
   * Handle drag end - reorder within team
   */
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Find which team the dragged item belongs to
    let targetTeam: Team | null = null;
    for (const team of SCRIPT_TEAM_ORDER) {
      const ids = teamItemIds.get(team) || [];
      if (ids.includes(active.id)) {
        targetTeam = team;
        break;
      }
    }

    if (!targetTeam) return;

    // Get current team characters
    const teamChars = charactersByTeam.get(targetTeam) || [];
    const oldIndex = teamChars.findIndex((c) => c.id === active.id);
    const newIndex = teamChars.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder within team
    const newTeamChars = arrayMove(teamChars, oldIndex, newIndex);

    // Build new grouped map
    const newCharsByTeam = new Map(charactersByTeam);
    newCharsByTeam.set(targetTeam, newTeamChars);

    // Generate new custom order from the updated groups
    const newOrder = generateCustomOrderFromTeams(newCharsByTeam);
    onOrderChange(newOrder);
  };

  /**
   * Handle drag cancel
   */
  const onDragCancel = () => {
    setActiveId(null);
  };

  /**
   * Reset to SAO (clear custom order)
   */
  const resetToSAO = () => {
    onOrderChange([]);
  };

  /**
   * Move a character to a specific index within its team
   */
  const moveCharacter = (characterId: string, newIndex: number) => {
    // Find which team the character belongs to
    let targetTeam: Team | null = null;
    let currentIndex = -1;

    for (const team of SCRIPT_TEAM_ORDER) {
      const teamChars = charactersByTeam.get(team) || [];
      const idx = teamChars.findIndex((c) => c.id === characterId);
      if (idx !== -1) {
        targetTeam = team;
        currentIndex = idx;
        break;
      }
    }

    if (!targetTeam || currentIndex === -1) return;

    const teamChars = charactersByTeam.get(targetTeam) || [];
    const clampedIndex = Math.max(0, Math.min(newIndex, teamChars.length - 1));

    if (currentIndex === clampedIndex) return;

    // Reorder within team
    const newTeamChars = arrayMove(teamChars, currentIndex, clampedIndex);

    // Build new grouped map
    const newCharsByTeam = new Map(charactersByTeam);
    newCharsByTeam.set(targetTeam, newTeamChars);

    // Generate new custom order
    const newOrder = generateCustomOrderFromTeams(newCharsByTeam);
    onOrderChange(newOrder);
  };

  return {
    orderedCharacters,
    charactersByTeam,
    fabled,
    travellers,
    teamItemIds,
    isDragging: activeId !== null,
    activeId,
    onDragStart,
    onDragEnd,
    onDragCancel,
    resetToSAO,
    moveCharacter,
    hasCustomOrder,
  };
}
