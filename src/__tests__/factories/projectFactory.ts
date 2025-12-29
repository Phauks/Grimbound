import type {
  CreateProjectOptions,
  GenerationOptions,
  Project,
  ProjectState,
  ProjectStats,
  ProjectThumbnail,
  ProjectVersion,
} from '@/ts/types';

let idCounter = 0;

type ProjectOverrides = Partial<Project>;
type ProjectStateOverrides = Partial<ProjectState>;

/**
 * Create default generation options for testing.
 */
export function createDefaultGenerationOptions(): GenerationOptions {
  return {
    displayAbilityText: true,
    generateBootleggerRules: false,
    tokenCount: true,
    setupStyle: 'official',
    reminderBackground: 'Moss',
    characterBackground: 'Moon Phases',
    characterNameFont: 'Dumbledore',
    characterReminderFont: 'Dumbledore',
    scriptNameToken: false,
    almanacToken: false,
    pandemoniumToken: false,
    dpi: 300,
  };
}

/**
 * Create default project stats.
 */
export function createDefaultProjectStats(): ProjectStats {
  return {
    characterCount: 0,
    tokenCount: 0,
    reminderCount: 0,
    customIconCount: 0,
    presetCount: 0,
  };
}

/**
 * Create default project thumbnail.
 */
export function createDefaultProjectThumbnail(): ProjectThumbnail {
  return {
    type: 'auto',
    auto: {
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      generatedAt: Date.now(),
    },
  };
}

/**
 * Create default project state.
 */
export function createDefaultProjectState(overrides: ProjectStateOverrides = {}): ProjectState {
  return {
    jsonInput: '[]',
    characters: [],
    scriptMeta: null,
    characterMetadata: {},
    generationOptions: createDefaultGenerationOptions(),
    customIcons: [],
    schemaVersion: 1,
    ...overrides,
  };
}

/**
 * Create a test project with sensible defaults.
 */
export function createProject(overrides: ProjectOverrides = {}): Project {
  idCounter++;
  const id = overrides.id ?? `test-project-${idCounter}`;
  const now = Date.now();

  return {
    id,
    name: overrides.name ?? `Test Project ${idCounter}`,
    description: overrides.description,
    createdAt: overrides.createdAt ?? now,
    lastModifiedAt: overrides.lastModifiedAt ?? now,
    lastAccessedAt: overrides.lastAccessedAt ?? now,
    thumbnail: overrides.thumbnail ?? createDefaultProjectThumbnail(),
    tags: overrides.tags ?? [],
    state: overrides.state ?? createDefaultProjectState(),
    stats: overrides.stats ?? createDefaultProjectStats(),
    schemaVersion: overrides.schemaVersion ?? 1,
    ...overrides,
  };
}

/**
 * Create a project with a sample script.
 */
export function createProjectWithScript(
  jsonInput: string,
  overrides: ProjectOverrides = {}
): Project {
  return createProject({
    state: createDefaultProjectState({
      jsonInput,
    }),
    ...overrides,
  });
}

/**
 * Create a project version snapshot.
 */
export function createProjectVersion(
  projectId: string,
  versionNumber: string,
  overrides: Partial<ProjectVersion> = {}
): ProjectVersion {
  const [major, minor, patch] = versionNumber.split('.').map(Number);
  return {
    id: `${projectId}-v${versionNumber}`,
    projectId,
    versionNumber,
    versionMajor: major ?? 1,
    versionMinor: minor ?? 0,
    versionPatch: patch ?? 0,
    createdAt: Date.now(),
    stateSnapshot: createDefaultProjectState(),
    ...overrides,
  };
}

/**
 * Create project options for service methods.
 */
export function createProjectOptions(
  overrides: Partial<CreateProjectOptions> = {}
): CreateProjectOptions {
  idCounter++;
  return {
    name: overrides.name ?? `New Project ${idCounter}`,
    description: overrides.description,
    tags: overrides.tags ?? [],
    ...overrides,
  };
}

/**
 * Reset the ID counter.
 */
export function resetProjectFactory(): void {
  idCounter = 0;
}
