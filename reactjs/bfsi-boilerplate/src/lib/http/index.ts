/**
 * HTTP — axios factory with composable BFSI-grade interceptors.
 *
 * Pattern: instead of one monolithic axios instance, expose composable
 * interceptors. Each app composes the ones it needs.
 */
export * from './createAxios.js';
export * from './interceptors.js';
export * from './errors.js';
