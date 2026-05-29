import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name composer. Combines clsx (conditional classes) with tailwind-merge
 * (de-duplicates conflicting Tailwind classes by keeping the last one).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
