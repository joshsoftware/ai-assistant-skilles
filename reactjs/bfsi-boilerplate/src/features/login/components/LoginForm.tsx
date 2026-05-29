import { type ReactElement } from 'react';
/**
 * Login form — react-hook-form + Zod + the feature's useLogin mutation.
 *
 * Reads as: schema → resolver → form → fields → submit handler that calls
 * mutate(values, { onSuccess, onError }). Errors from the API are surfaced
 * via mutation.error; field-level errors come from the resolver.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormInput } from '@/components/common/FormInput';

import { useLogin } from '../hooks/useLogin';
import { LOGIN_FORM_DEFAULT_VALUES, loginSchema, type ILoginFormValues } from '../utils';
import type { ILoginResponse } from '../types';

interface LoginFormProps {
  onLoggedIn: (response: ILoginResponse) => void;
}

export function LoginForm({ onLoggedIn }: LoginFormProps): ReactElement {
  const { mutate, isPending, error } = useLogin();

  const form = useForm<ILoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: LOGIN_FORM_DEFAULT_VALUES,
    mode: 'onTouched',
  });

  const onSubmit = (values: ILoginFormValues): void => {
    mutate(values, {
      onSuccess: (response) => {
        onLoggedIn(response);
      },
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
      <FormInput
        control={form.control}
        name="username"
        label="Username"
        placeholder="john.doe"
        autoComplete="username"
        isRequired
      />

      <FormInput
        control={form.control}
        name="password"
        label="Password"
        autoComplete="current-password"
        isSensitive
        isRequired
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {(error as { message?: string })?.message ?? 'Login failed. Please try again.'}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
