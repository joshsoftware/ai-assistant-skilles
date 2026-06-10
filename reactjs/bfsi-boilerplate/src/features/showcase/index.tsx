/**
 * Dev-only primitive showcase. One card per shipped BFSI primitive — proof
 * of life, NOT aspirational previews. Rules:
 *
 *   - Only add a section for code that already ships and is used somewhere.
 *   - When you add a new shared primitive, add its section here in the SAME
 *     PR. The Stop-hook reviewer treats a missing section as P2.
 *   - Never add placeholder / "this is what it WILL look like" content.
 *
 * Route is gated on `import.meta.env.DEV` in `src/routes/index.tsx` — this
 * page never reaches production bundles.
 */
import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PIIMaskedDisplay } from '@/components/bfsi';
import { FormInput } from '@/components/common/FormInput';
import { Image } from '@/components/common/Image';
import {
  AADHAAR_REGEX,
  EMAIL_REGEX,
  IFSC_REGEX,
  MOBILE_REGEX,
  OTP_REGEX,
  PAN_REGEX,
  PASSWORD_REGEX,
} from '@/constants/regex';

const showcaseFormSchema = z.object({
  pan: z.string().regex(PAN_REGEX, 'Invalid PAN format (e.g. ABCDE1234F)'),
  mobile: z.string().regex(MOBILE_REGEX, 'Enter a valid 10-digit mobile starting 6-9'),
  email: z.string().regex(EMAIL_REGEX, 'Enter a valid email'),
  password: z
    .string()
    .regex(PASSWORD_REGEX, 'Min 8 chars with upper, lower, digit, special'),
});

type ShowcaseFormValues = z.infer<typeof showcaseFormSchema>;

const SHOWCASE_FORM_DEFAULTS: ShowcaseFormValues = {
  pan: '',
  mobile: '',
  email: '',
  password: '',
};

export function ShowcasePage(): ReactElement {
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dev only
        </p>
        <h1 className="text-3xl font-bold tracking-tight">BFSI primitives showcase</h1>
        <p className="text-muted-foreground">
          Live examples of every shared primitive this boilerplate ships. This route is gated on{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">import.meta.env.DEV</code> and
          never reaches production bundles.
        </p>
      </header>

      <PIIMaskedDisplaySection />
      <FormInputSection />
      <RegexCatalogueSection />
      <ImageSection />
    </div>
  );
}

// ----------------------------------------------------------------------------

function PIIMaskedDisplaySection(): ReactElement {
  return (
    <section aria-labelledby="pii-masked-display-heading" className="space-y-4">
      <SectionHeading id="pii-masked-display-heading" title="<PIIMaskedDisplay>">
        Click the eye icon to reveal — the value auto-re-masks after a type-specific timeout (15s
        for Aadhaar, 30s for PAN/mobile/email/account, 60s for name/address/DOB/card-last4).
      </SectionHeading>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
        <ShowcaseField label="PAN">
          <PIIMaskedDisplay type="pan" value="ABCDE1234F" />
        </ShowcaseField>
        <ShowcaseField label="Aadhaar">
          <PIIMaskedDisplay type="aadhaar" value="123456789012" />
        </ShowcaseField>
        <ShowcaseField label="Mobile">
          <PIIMaskedDisplay type="mobile" value="9876543210" />
        </ShowcaseField>
        <ShowcaseField label="Email">
          <PIIMaskedDisplay type="email" value="customer@example.com" />
        </ShowcaseField>
        <ShowcaseField label="Account number">
          <PIIMaskedDisplay type="account_number" value="123456789012" />
        </ShowcaseField>
        <ShowcaseField label="Card last 4">
          <PIIMaskedDisplay type="card_last4" value="4111111111111111" />
        </ShowcaseField>
        <ShowcaseField label="Name">
          <PIIMaskedDisplay type="name" value="Priya Sharma" />
        </ShowcaseField>
        <ShowcaseField label="Address">
          <PIIMaskedDisplay type="address" value="221B Baker Street, Mumbai" />
        </ShowcaseField>
        <ShowcaseField label="Date of birth">
          <PIIMaskedDisplay type="dob" value="1990-05-14" />
        </ShowcaseField>
        <ShowcaseField label="Disabled (display only)">
          <PIIMaskedDisplay type="pan" value="ABCDE1234F" disabled />
        </ShowcaseField>
        <ShowcaseField label="Null value">
          <PIIMaskedDisplay type="pan" value={null} />
        </ShowcaseField>
        <ShowcaseField label="Custom reveal duration (3s)">
          <PIIMaskedDisplay type="pan" value="ABCDE1234F" revealDurationMs={3_000} />
        </ShowcaseField>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------

function FormInputSection(): ReactElement {
  const form = useForm<ShowcaseFormValues>({
    resolver: zodResolver(showcaseFormSchema),
    defaultValues: SHOWCASE_FORM_DEFAULTS,
    mode: 'onBlur',
  });

  return (
    <section aria-labelledby="form-input-heading" className="space-y-4">
      <SectionHeading id="form-input-heading" title="<FormInput> + Zod + react-hook-form">
        Generic typed RHF wrapper. Schema messages surface automatically. Set{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">isSensitive</code> for credentials —
        renders a password input with a built-in show/hide toggle.
      </SectionHeading>

      <form
        className="rounded-lg border border-border bg-card p-6 sm:grid sm:grid-cols-2 sm:gap-4"
        onSubmit={form.handleSubmit((values) => {
          console.warn('[showcase] form submitted', { ...values, password: '[redacted]' });
        })}
        noValidate
      >
        <FormInput
          control={form.control}
          name="pan"
          label="PAN"
          placeholder="ABCDE1234F"
          maxLength={10}
          autoComplete="off"
          isRequired
          transform={(v) => v.toUpperCase()}
        />
        <FormInput
          control={form.control}
          name="mobile"
          label="Mobile"
          placeholder="9876543210"
          type="tel"
          maxLength={10}
          autoComplete="tel"
          isRequired
        />
        <FormInput
          control={form.control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          isRequired
        />
        <FormInput
          control={form.control}
          name="password"
          label="Password"
          autoComplete="new-password"
          isSensitive
          isRequired
        />

        <div className="col-span-full pt-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Validate (logs to console)
          </button>
        </div>
      </form>
    </section>
  );
}

// ----------------------------------------------------------------------------

function RegexCatalogueSection(): ReactElement {
  const patterns: Array<{ name: string; source: string; example: string }> = [
    { name: 'PAN_REGEX', source: PAN_REGEX.source, example: 'ABCDE1234F' },
    { name: 'AADHAAR_REGEX', source: AADHAAR_REGEX.source, example: '123456789012' },
    { name: 'MOBILE_REGEX', source: MOBILE_REGEX.source, example: '9876543210' },
    { name: 'EMAIL_REGEX', source: EMAIL_REGEX.source, example: 'you@example.com' },
    { name: 'IFSC_REGEX', source: IFSC_REGEX.source, example: 'HDFC0001234' },
    { name: 'OTP_REGEX', source: OTP_REGEX.source, example: '482910' },
    { name: 'PASSWORD_REGEX', source: PASSWORD_REGEX.source, example: 'Strong@Pass1' },
  ];

  return (
    <section aria-labelledby="regex-heading" className="space-y-4">
      <SectionHeading id="regex-heading" title="Validation regex catalogue">
        Import from <code className="rounded bg-muted px-1 py-0.5 text-xs">@/constants/regex</code>{' '}
        — never inline. PII patterns re-export from{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">@/lib/pii</code>; credentials live
        inline.
      </SectionHeading>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-medium">Constant</th>
              <th className="px-4 py-3 font-medium">Pattern</th>
              <th className="px-4 py-3 font-medium">Example match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {patterns.map(({ name, source, example }) => (
              <tr key={name}>
                <td className="px-4 py-3 font-mono text-xs">{name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{source}</td>
                <td className="px-4 py-3 font-mono text-xs">{example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------

function ImageSection(): ReactElement {
  // Inline 1x1 SVG (no network) so the showcase works offline and doesn't
  // depend on hosted assets that might not exist in cloned projects.
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><rect width="320" height="160" fill="#e2e8f0"/><text x="50%" y="50%" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle" dominant-baseline="middle">320 × 160 placeholder</text></svg>',
    );

  return (
    <section aria-labelledby="image-heading" className="space-y-4">
      <SectionHeading id="image-heading" title="<Image>">
        Wrapper around <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;img&gt;</code>{' '}
        that enforces intrinsic <code className="rounded bg-muted px-1 py-0.5 text-xs">width</code>
        /<code className="rounded bg-muted px-1 py-0.5 text-xs">height</code> (prevents CLS) and
        defaults to{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">loading=&quot;lazy&quot;</code> +
        <code className="rounded bg-muted px-1 py-0.5 text-xs">decoding=&quot;async&quot;</code>.
        Pass <code className="rounded bg-muted px-1 py-0.5 text-xs">priority</code> for
        above-the-fold (hero, logo).
      </SectionHeading>

      <div className="grid gap-6 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
        <ShowcaseField label='Default (lazy, async)'>
          <Image src={placeholder} alt="Lazy placeholder" width={320} height={160} />
        </ShowcaseField>
        <ShowcaseField label='priority (eager, sync, fetchPriority="high")'>
          <Image src={placeholder} alt="Priority placeholder" width={320} height={160} priority />
        </ShowcaseField>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------

function SectionHeading({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <div className="space-y-1">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function ShowcaseField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}

export default ShowcasePage;
