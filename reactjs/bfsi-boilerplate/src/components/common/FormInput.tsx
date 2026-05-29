/**
 * Generic, typed form input wrapper around react-hook-form's <Controller>.
 *
 * Pairs with a Zod schema + zodResolver: validation messages from the schema
 * surface automatically via field.error.
 *
 * Usage:
 *
 *   const form = useForm<ILoginFormValues>({
 *     resolver: zodResolver(loginSchema),
 *     defaultValues: LOGIN_FORM_DEFAULT_VALUES,
 *   });
 *
 *   <FormInput
 *     control={form.control}
 *     name="username"
 *     label="Username"
 *     placeholder="amar.j"
 *     isRequired
 *   />
 *
 * `name` is type-checked against the form's field shape via `Path<T>`, so a
 * typo here is a compile error.
 */
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  isRequired?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  autoComplete?: string;
  className?: string;
  transform?: (value: string) => string;
  isSensitive?: boolean;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  placeholder,
  isRequired = false,
  disabled = false,
  readOnly = false,
  maxLength,
  autoComplete = 'off',
  className,
  transform,
  isSensitive = false,
}: FormInputProps<T>): ReactElement {
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isSensitive ? (revealed ? 'text' : 'password') : type;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1">
          {label && (
            <label htmlFor={String(name)} className="block text-sm font-medium text-foreground">
              {label}
              {isRequired && <span className="ml-1 text-destructive">*</span>}
            </label>
          )}

          <div className="relative">
            <input
              {...field}
              id={String(name)}
              type={effectiveType}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              maxLength={maxLength}
              autoComplete={autoComplete}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.error ? `${String(name)}-error` : undefined}
              onChange={(e) => {
                const next = transform ? transform(e.target.value) : e.target.value;
                field.onChange(next);
              }}
              value={field.value ?? ''}
              className={[
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSensitive ? 'pr-10' : '',
                fieldState.error ? 'border-destructive' : '',
                className ?? '',
              ]
                .filter(Boolean)
                .join(' ')}
            />

            {isSensitive && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={revealed ? 'Hide value' : 'Reveal value'}
                onClick={() => setRevealed((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>

          <p id={`${String(name)}-error`} role="alert" className="min-h-4 text-xs text-destructive">
            {fieldState.error?.message ?? ' '}
          </p>
        </div>
      )}
    />
  );
}
