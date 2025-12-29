/**
 * IndexedDB setup using fake-indexeddb.
 *
 * fake-indexeddb is auto-imported in vitest.setup.ts via:
 * import 'fake-indexeddb/auto';
 *
 * This file provides utilities for test isolation.
 */

import Dexie from 'dexie';

/**
 * Clear all IndexedDB databases.
 * Call this in beforeEach/afterEach for test isolation.
 */
export async function clearAllDatabases(): Promise<void> {
  const databases = await Dexie.getDatabaseNames();
  await Promise.all(
    databases.map((name) => {
      const db = new Dexie(name);
      return db.delete();
    })
  );
}

/**
 * Reset a specific Dexie database.
 */
export async function resetDatabase(db: Dexie): Promise<void> {
  await db.delete();
  await db.open();
}
