/**
 * Env vars — validated at startup via Zod.
 * Throws on app boot if anything required is missing or malformed.
 */
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  VITE_AUTH_HEADER_NAME: z.string().min(1).default('Authorization'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(900_000),
  VITE_SENSITIVE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  VITE_FEATURE_FLAGS_PROVIDER: z.enum(['local', 'growthbook', 'unleash']).default('local'),
});

export type Env = z.infer<typeof envSchema>;

function load(): Env {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = load();
