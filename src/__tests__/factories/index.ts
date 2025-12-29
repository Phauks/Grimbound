export * from './characterFactory';
export * from './projectFactory';
export * from './tokenFactory';
export * from './tokenOptionsFactory';

import { resetCharacterFactory } from './characterFactory';
import { resetProjectFactory } from './projectFactory';
import { resetTokenFactory } from './tokenFactory';

/**
 * Reset all factory ID counters.
 * Call in afterEach for predictable test data.
 */
export function resetAllFactories(): void {
  resetCharacterFactory();
  resetProjectFactory();
  resetTokenFactory();
}
