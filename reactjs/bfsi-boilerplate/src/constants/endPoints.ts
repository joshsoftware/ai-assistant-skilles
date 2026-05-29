/**
 * API endpoint constants. Grouped by feature/service with a frozen object
 * each — never inline URL strings in service code.
 *
 * Full convention (file map for all constant kinds, queryKey factories,
 * dynamic-path pattern, worked KYC example) lives in the
 * `constants-organization` skill — auto-loads when you add an endpoint, or
 * open `.claude/skills/constants-organization/SKILL.md` directly.
 *
 * TL;DR:
 *   1. Prefix base path per service module (`const API_BASE_<FEATURE>`).
 *   2. `Object.freeze()` the exported map so accidental mutation throws.
 *   3. Static paths are strings; dynamic paths are functions
 *      (`DETAIL: (id: string) => \`${BASE}/${id}\``).
 *   4. New feature → new `API_BASE_<FEATURE>` + new
 *      `export const <FEATURE>_ENDPOINTS = Object.freeze({...})`.
 */

const API_BASE_AUTH = '/auth/api/v1';

export const ENDPOINTS = Object.freeze({
  LOGIN: `${API_BASE_AUTH}/login`,
  LOGOUT: `${API_BASE_AUTH}/logout`,
});
