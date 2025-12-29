/**
 * Test data fixtures for E2E tests.
 */

/**
 * Sample script JSON for testing.
 */
export const SAMPLE_SCRIPT = [
  { id: '_meta', name: 'Test Script', author: 'E2E Test' },
  'washerwoman',
  'librarian',
  'investigator',
  'drunk',
  'poisoner',
  'imp',
];

/**
 * Sample script as JSON string.
 */
export const SAMPLE_SCRIPT_JSON = JSON.stringify(SAMPLE_SCRIPT, null, 2);

/**
 * Minimal script for quick tests.
 */
export const MINIMAL_SCRIPT = [
  { id: '_meta', name: 'Minimal Script' },
  'imp',
];

/**
 * Minimal script as JSON string.
 */
export const MINIMAL_SCRIPT_JSON = JSON.stringify(MINIMAL_SCRIPT, null, 2);
