/**
 * PII masking utilities. All functions take a value and return a masked string.
 *
 * Convention: masking happens at the display layer, NOT at storage. Always store
 * the full value (encrypted via secureStorage) and mask only for render.
 */
export * from './maskers.js';
export * from './validators.js';
export * from './patterns.js';
