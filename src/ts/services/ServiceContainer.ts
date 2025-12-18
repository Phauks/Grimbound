/**
 * Lightweight Service Container
 *
 * A simple dependency injection container for managing service instances.
 * Supports registration, resolution, and scoping of dependencies.
 *
 * @module services/ServiceContainer
 *
 * @example
 * ```typescript
 * // Create a container
 * const container = new ServiceContainer();
 *
 * // Register services
 * container.register('projectService', () => new ProjectService());
 * container.registerSingleton('database', () => new ProjectDatabaseService());
 *
 * // Resolve dependencies
 * const projectService = container.resolve<IProjectService>('projectService');
 *
 * // Create scoped containers for testing
 * const testContainer = container.createScope();
 * testContainer.register('database', () => mockDatabase);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Service token - used to identify services in the container
 */
export type ServiceToken = string | symbol;

/**
 * Factory function that creates a service instance
 */
export type ServiceFactory<T> = (container: IServiceContainer) => T;

/**
 * Service lifetime configuration
 */
export type ServiceLifetime = 'transient' | 'singleton' | 'scoped';

/**
 * Service registration
 */
interface ServiceRegistration<T = unknown> {
  factory: ServiceFactory<T>;
  lifetime: ServiceLifetime;
  instance?: T;
}

/**
 * Service container interface
 */
export interface IServiceContainer {
  /**
   * Register a service with transient lifetime (new instance each time)
   */
  register<T>(token: ServiceToken, factory: ServiceFactory<T>): void;

  /**
   * Register a service with singleton lifetime (shared instance)
   */
  registerSingleton<T>(token: ServiceToken, factory: ServiceFactory<T>): void;

  /**
   * Register an existing instance
   */
  registerInstance<T>(token: ServiceToken, instance: T): void;

  /**
   * Resolve a service by token
   */
  resolve<T>(token: ServiceToken): T;

  /**
   * Try to resolve a service (returns undefined if not found)
   */
  tryResolve<T>(token: ServiceToken): T | undefined;

  /**
   * Check if a service is registered
   */
  has(token: ServiceToken): boolean;

  /**
   * Create a child scope that inherits registrations
   */
  createScope(): IServiceContainer;

  /**
   * Clear all registrations
   */
  clear(): void;
}

// ============================================================================
// Service Tokens
// ============================================================================

/**
 * Well-known service tokens for dependency injection
 */
export const ServiceTokens = {
  // Project services
  ProjectService: Symbol('ProjectService'),
  ProjectDatabase: Symbol('ProjectDatabase'),
  ProjectExporter: Symbol('ProjectExporter'),
  ProjectImporter: Symbol('ProjectImporter'),

  // Upload services
  FileValidationService: Symbol('FileValidationService'),
  ImageProcessingService: Symbol('ImageProcessingService'),
  AssetStorageService: Symbol('AssetStorageService'),
  FileUploadService: Symbol('FileUploadService'),
  AssetSuggestionService: Symbol('AssetSuggestionService'),

  // Sync services
  DataSyncService: Symbol('DataSyncService'),
  StorageManager: Symbol('StorageManager'),
  GitHubReleaseClient: Symbol('GitHubReleaseClient'),
  PackageExtractor: Symbol('PackageExtractor'),

  // Cache services
  CacheManager: Symbol('CacheManager'),
  ImageCache: Symbol('ImageCache'),

  // Other
  Logger: Symbol('Logger'),
} as const;

// ============================================================================
// ServiceContainer Implementation
// ============================================================================

/**
 * Lightweight dependency injection container
 *
 * Features:
 * - Transient, singleton, and scoped lifetimes
 * - Factory-based registration for lazy instantiation
 * - Instance registration for pre-created objects
 * - Scoped containers for testing isolation
 * - Circular dependency detection
 */
export class ServiceContainer implements IServiceContainer {
  private registrations = new Map<ServiceToken, ServiceRegistration>();
  private resolutionStack: ServiceToken[] = [];
  private parent: ServiceContainer | null = null;

  /**
   * Create a new ServiceContainer
   *
   * @param parent - Optional parent container for scoping
   */
  constructor(parent: ServiceContainer | null = null) {
    this.parent = parent;
  }

  /**
   * Register a service with transient lifetime
   * A new instance is created each time the service is resolved
   */
  register<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
    this.registrations.set(token, {
      factory,
      lifetime: 'transient',
    });
  }

  /**
   * Register a service with singleton lifetime
   * The same instance is returned for all resolutions
   */
  registerSingleton<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
    this.registrations.set(token, {
      factory,
      lifetime: 'singleton',
    });
  }

  /**
   * Register an existing instance
   * Equivalent to a singleton with pre-created instance
   */
  registerInstance<T>(token: ServiceToken, instance: T): void {
    this.registrations.set(token, {
      factory: () => instance,
      lifetime: 'singleton',
      instance,
    });
  }

  /**
   * Resolve a service by token
   *
   * @throws Error if service is not registered or circular dependency detected
   */
  resolve<T>(token: ServiceToken): T {
    const result = this.tryResolve<T>(token);
    if (result === undefined) {
      const tokenName = typeof token === 'symbol' ? token.toString() : token;
      throw new Error(`Service not registered: ${tokenName}`);
    }
    return result;
  }

  /**
   * Try to resolve a service (returns undefined if not found)
   */
  tryResolve<T>(token: ServiceToken): T | undefined {
    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token]
        .map((t) => (typeof t === 'symbol' ? t.toString() : t))
        .join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    // Look up registration (including parent)
    const registration = this.getRegistration(token);
    if (!registration) {
      return undefined;
    }

    // Return existing instance for singletons
    if (registration.lifetime === 'singleton' && registration.instance !== undefined) {
      return registration.instance as T;
    }

    // Create new instance
    try {
      this.resolutionStack.push(token);
      const instance = registration.factory(this) as T;

      // Cache singleton instances
      if (registration.lifetime === 'singleton') {
        registration.instance = instance;
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: ServiceToken): boolean {
    return this.getRegistration(token) !== undefined;
  }

  /**
   * Create a child scope that inherits registrations
   * Useful for testing - override specific services while keeping others
   */
  createScope(): IServiceContainer {
    return new ServiceContainer(this);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get registration from this container or parent
   */
  private getRegistration(token: ServiceToken): ServiceRegistration | undefined {
    const local = this.registrations.get(token);
    if (local) {
      return local;
    }
    return this.parent?.getRegistration(token);
  }
}

// ============================================================================
// Default Container & Helper Functions
// ============================================================================

/**
 * Global default service container
 *
 * Use this for application-wide dependency injection.
 * For testing, create isolated containers with `new ServiceContainer()`.
 */
export const defaultContainer = new ServiceContainer();

/**
 * Register a service in the default container
 */
export function registerService<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
  defaultContainer.register(token, factory);
}

/**
 * Register a singleton in the default container
 */
export function registerSingleton<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
  defaultContainer.registerSingleton(token, factory);
}

/**
 * Register an instance in the default container
 */
export function registerInstance<T>(token: ServiceToken, instance: T): void {
  defaultContainer.registerInstance(token, instance);
}

/**
 * Resolve a service from the default container
 */
export function resolveService<T>(token: ServiceToken): T {
  return defaultContainer.resolve<T>(token);
}

// ============================================================================
// Testing Utilities
// ============================================================================

/**
 * Create a test container with common mocks
 *
 * @example
 * ```typescript
 * const { container, mocks } = createTestContainer();
 *
 * // Use container for DI
 * const service = new ProjectService({
 *   database: container.resolve(ServiceTokens.ProjectDatabase),
 * });
 *
 * // Verify mock calls
 * expect(mocks.database.saveProject).toHaveBeenCalled();
 * ```
 */
export function createTestContainer(): {
  container: ServiceContainer;
  mocks: Record<string, Record<string, unknown>>;
} {
  const container = new ServiceContainer();
  const mocks: Record<string, Record<string, unknown>> = {};

  return { container, mocks };
}

/**
 * Create a mock factory that returns a proxy with auto-mocked methods
 * Useful for creating mock services in tests
 */
export function createMockFactory<T extends object>(overrides: Partial<T> = {}): () => T {
  return () => {
    const handler: ProxyHandler<object> = {
      get(_target, prop) {
        if (prop in overrides) {
          return overrides[prop as keyof T];
        }
        // Return a jest/vitest-compatible mock function placeholder
        return () => undefined;
      },
    };
    return new Proxy({}, handler) as T;
  };
}
