import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { mask, type MaskerType } from '@/lib/pii';
import { cn } from '@/lib/utils/cn';

export interface PIIMaskedDisplayProps {
  /** PII type — controls masking and reveal duration. */
  type: MaskerType;
  /** The actual value. Masked by default; revealed on click. */
  value: string | null | undefined;
  /** Reveal duration override (ms). Default depends on type. */
  revealDurationMs?: number;
  /** Disable reveal entirely (display-only mask). */
  disabled?: boolean;
  /** Custom className for the outer wrapper. */
  className?: string;
  /** Override label for the reveal toggle (defaults to `Reveal <type>`). */
  revealLabel?: string;
  /**
   * Called when the value is revealed. The app can wire its own
   * logging / telemetry here — the component intentionally has no
   * direct dependency on any logging client.
   */
  onReveal?: () => void;
  /** Called when value re-masks. */
  onMask?: () => void;
}

const DEFAULT_REVEAL_MS: Record<MaskerType, number> = {
  pan: 30_000,
  aadhaar: 15_000,
  account_number: 30_000,
  card_last4: 60_000,
  mobile: 30_000,
  email: 30_000,
  name: 60_000,
  address: 60_000,
  dob: 60_000,
  generic: 30_000,
};

/**
 * BFSI PII display with click-to-reveal.
 *
 * Behaviour:
 *  - Shows masked value by default
 *  - Click "reveal" → shows real value + fires `onReveal` callback
 *  - After `revealDurationMs`, automatically re-masks + fires `onMask`
 *  - Copy guard: copying the revealed text returns the value, but copying
 *    the masked text returns "****" (browser default behaviour from text content)
 */
export function PIIMaskedDisplay({
  type,
  value,
  revealDurationMs,
  disabled,
  className,
  revealLabel,
  onReveal,
  onMask,
}: PIIMaskedDisplayProps): ReactElement {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reMask = useCallback(() => {
    setRevealed(false);
    onMask?.();
  }, [onMask]);

  const handleReveal = useCallback(() => {
    if (disabled) {
      return;
    }
    if (revealed) {
      // Toggle off
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      reMask();
      return;
    }
    setRevealed(true);
    onReveal?.();
    const duration = revealDurationMs ?? DEFAULT_REVEAL_MS[type];
    if (duration > 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(reMask, duration);
    }
  }, [disabled, revealed, onReveal, revealDurationMs, type, reMask]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Re-mask if value changes while revealed. This is a SECURITY guarantee:
  // when a parent re-renders with a different PAN/Aadhaar, the prior reveal
  // must be cleared AND the `onMask` telemetry must fire — refactoring to
  // derived state would skip the callback.
  useEffect(() => {
    if (revealed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: see comment above
      reMask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const displayValue = revealed ? value ?? '' : mask(type, value);

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 tabular-nums', className)}
      data-testid={`pii-${type}`}
    >
      <span
        className={cn(revealed ? 'text-foreground' : 'text-muted-foreground')}
        aria-label={revealed ? undefined : `masked ${type}, click to reveal`}
      >
        {displayValue || '—'}
      </span>
      {!disabled && value ? (
        <button
          type="button"
          onClick={handleReveal}
          className={cn(
            'inline-flex items-center justify-center rounded-md p-0.5 opacity-60 hover:opacity-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'text-xs',
          )}
          aria-label={revealLabel ?? `${revealed ? 'mask' : 'reveal'} ${type}`}
          aria-pressed={revealed}
        >
          {revealed ? '🙈' : '👁'}
        </button>
      ) : null}
    </span>
  );
}
