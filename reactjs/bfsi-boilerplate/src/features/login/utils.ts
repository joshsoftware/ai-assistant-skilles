/**
 * Login feature — Zod schema, form defaults, and validation helpers.
 *
 * Convention (mirrors stp-portal, swap Yup → Zod):
 *   - Schema lives next to the feature, not in a global schemas folder.
 *   - Form value type is INFERRED from the schema (`z.infer<typeof ...>`),
 *     never hand-written.
 *   - Validation error messages are user-friendly strings (route them
 *     through i18n's `t()` if your feature needs locale-aware messages).
 *   - Regex patterns come from `@/lib/pii` where applicable;
 *     project-specific patterns go in `src/constants/regex.ts`
 *     (add when you have your first one — don't pre-create empty files).
 */
import { z } from 'zod';

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 50;

export const loginSchema = z.object({
  username: z
    .string()
    .min(MIN_USERNAME_LENGTH, `Username must be at least ${MIN_USERNAME_LENGTH} characters`)
    .max(MAX_USERNAME_LENGTH, `Username cannot exceed ${MAX_USERNAME_LENGTH} characters`),
  password: z.string().trim().min(1, 'Password is required'),
});

export type ILoginFormValues = z.infer<typeof loginSchema>;

export const LOGIN_FORM_DEFAULT_VALUES: ILoginFormValues = {
  username: '',
  password: '',
};
