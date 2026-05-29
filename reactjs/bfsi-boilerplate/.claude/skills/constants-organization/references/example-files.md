# Constants files — templates

## `src/constants/app.ts`

```ts
// Storage keys
export const SELECTED_LOCALE = 'selectedLocale';
export const THEME_PREFERENCE = 'themePreference';

// Notification types
export const SUCCESS = 'success' as const;
export const ERROR = 'error' as const;
export const INFO = 'info' as const;
export const WARNING = 'warning' as const;

// Status enums
export const KYC_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVIEW: 'review',
} as const;
export type KycStatus = (typeof KYC_STATUS)[keyof typeof KYC_STATUS];
```

## `src/constants/routes.ts`

```ts
export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  kyc: { list: '/kyc', detail: '/kyc/:id', submit: '/kyc/submit' },
  notFound: '*',
} as const;

export const kycDetailPath = (id: string): string => `/kyc/${id}`;
```

## `src/constants/queryKeys.ts`

```ts
// One factory per feature. Each factory exports a const object with:
//   - `all`: top-level scope
//   - `lists()` / `list(filters)`: list queries (filters in key for cache isolation)
//   - `details()` / `detail(id)`: detail queries (id in key)
//   - Other entity-specific keys

export const kycKeys = {
  all: ['kyc'] as const,
  lists: () => [...kycKeys.all, 'list'] as const,
  list: (filters?: KycFilters) => [...kycKeys.lists(), filters] as const,
  details: () => [...kycKeys.all, 'detail'] as const,
  detail: (id: string) => [...kycKeys.details(), id] as const,
};

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters?: TxFilters) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  byAccount: (accountId: string) => [...transactionKeys.all, 'byAccount', accountId] as const,
};

interface KycFilters {
  status?: string;
  page?: number;
}
interface TxFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}
```

## `src/constants/regex.ts`

```ts
export { PII_PATTERNS } from '@/lib/pii';
import { PII_PATTERNS } from '@/lib/pii';

export const PAN_REGEX = PII_PATTERNS.pan;
export const AADHAAR_REGEX = PII_PATTERNS.aadhaar;
export const MOBILE_REGEX = PII_PATTERNS.mobileIndia;
export const IFSC_REGEX = PII_PATTERNS.ifsc;
export const PINCODE_REGEX = PII_PATTERNS.pincodeIndia;
export const EMAIL_REGEX = PII_PATTERNS.email;

// App-specific patterns:
export const REFERENCE_CODE_REGEX = /^ERR-[A-Z0-9]{4}$/;
export const TRANSACTION_ID_REGEX = /^TXN[0-9]{12}$/;
```
