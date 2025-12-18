/**
 * App Shell
 *
 * Main application shell containing tab navigation and view rendering.
 * Acts as the container for all sub-tabs (Projects, JSON, Tokens, Characters, Script, Export, Studio).
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useProjects } from '@/hooks/useProjects';
import styles from '@/styles/components/pages/Pages.module.css';
import type { Token } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import { CharactersView } from '@/components/Views/CharactersView';
import { ExportView } from '@/components/Views/ExportView';
import { JsonView } from '@/components/Views/JsonView';
import { ProjectsView } from '@/components/Views/ProjectsView';
import { ScriptView } from '@/components/Views/ScriptView';
import { StudioView } from '@/components/Views/StudioView';
import { TokensView } from '@/components/Views/TokensView';
import { TownSquareView } from '@/components/Views/TownSquareView';
import type { TabType } from './TabNavigation';
import { TabNavigation } from './TabNavigation';

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [selectedTokenForCustomize, setSelectedTokenForCustomize] = useState<Token | undefined>(
    undefined
  );
  const [createNewCharacter, setCreateNewCharacter] = useState(false);
  // Remember the last selected character UUID when navigating away from Characters tab
  const [lastSelectedCharacterUuid, setLastSelectedCharacterUuid] = useState<string | undefined>(
    undefined
  );
  const { createProject, activateProject, currentProject } = useProjects();
  const { addToast } = useToast();
  const { tokens, characters } = useTokenContext();

  const handleTokenClick = useCallback((token: Token) => {
    setSelectedTokenForCustomize(token);
    setCreateNewCharacter(false);
    // Clear last selected character when explicitly clicking a token (explicit navigation)
    setLastSelectedCharacterUuid(undefined);
    setActiveTab('characters');
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    // Reset createNewCharacter when manually changing tabs
    if (tab !== 'characters') {
      setCreateNewCharacter(false);
    }
    // When switching back to characters tab, clear selectedTokenForCustomize
    // so it uses lastSelectedCharacterUuid instead (if available)
    if (tab === 'characters') {
      setSelectedTokenForCustomize(undefined);
      setCreateNewCharacter(false);
    }
    setActiveTab(tab);
  }, []);

  const handleNavigateToCharacters = useCallback(() => {
    setSelectedTokenForCustomize(undefined);
    setCreateNewCharacter(true);
    setActiveTab('characters');
  }, []);

  const handleNavigateToProjects = useCallback(() => {
    setActiveTab('projects');
  }, []);

  // Handle "Edit Character" from night order context menu
  const handleEditCharacter = useCallback(
    (characterId: string) => {
      // Find the character by ID
      const character = characters.find((c) => c.id === characterId);
      if (!character) {
        logger.warn('AppShell', `Character not found: ${characterId}`);
        return;
      }

      // Find the matching token by character name (character tokens have type 'character')
      const token = tokens.find(
        (t) => t.type === 'character' && t.name.toLowerCase() === character.name.toLowerCase()
      );

      if (token) {
        // Use existing handleTokenClick pattern
        setSelectedTokenForCustomize(token);
        setCreateNewCharacter(false);
        // Clear last selected character when explicitly navigating to a character
        setLastSelectedCharacterUuid(undefined);
        setActiveTab('characters');
      } else {
        logger.warn('AppShell', `Token not found for character: ${character.name}`);
      }
    },
    [characters, tokens]
  );

  // Handle character selection changes from CustomizeView
  const handleCharacterSelect = useCallback((characterUuid: string) => {
    setLastSelectedCharacterUuid(characterUuid);
  }, []);

  const handleCreateProject = useCallback(async () => {
    try {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const newProject = await createProject(`New Project - ${timestamp}`);
      if (newProject) {
        await activateProject(newProject.id);
      }
      addToast('New project created and activated!', 'success');
      setActiveTab('projects');
    } catch (err) {
      logger.error('AppShell', 'Failed to create project', err);
      addToast('Failed to create project', 'error');
    }
  }, [createProject, activateProject, addToast]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectsView initialProjectId={currentProject?.id} />;
      case 'json':
        return (
          <JsonView
            onNavigateToCharacters={handleNavigateToCharacters}
            onNavigateToProjects={handleNavigateToProjects}
            onCreateProject={handleCreateProject}
          />
        );
      case 'tokens':
        return <TokensView onTokenClick={handleTokenClick} onTabChange={handleTabChange} />;
      case 'characters':
        return (
          <CharactersView
            key="characters-view"
            initialToken={selectedTokenForCustomize}
            selectedCharacterUuid={lastSelectedCharacterUuid}
            onCharacterSelect={handleCharacterSelect}
            onGoToTokens={() => setActiveTab('tokens')}
            createNewCharacter={createNewCharacter}
          />
        );
      case 'script':
        return <ScriptView onEditCharacter={handleEditCharacter} />;
      case 'studio':
        return <StudioView />;
      case 'export':
        return <ExportView />;
      case 'town-square':
        return <TownSquareView />;
      default:
        return <ProjectsView />;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lastSelectedCharacterUuid={lastSelectedCharacterUuid}
      />
      <div className={styles.pageContent}>{renderActiveView()}</div>
    </div>
  );
}
