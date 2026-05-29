# BFSI Validation Regex Catalogue

All regex patterns used by the `bfsi-form` skill. Keep this file as the single source of truth — the `@/lib/pii` module imports from here.

## Identity

| Field           | Regex                           | Notes                                                  |
| --------------- | ------------------------------- | ------------------------------------------------------ |
| PAN             | `^[A-Z]{5}[0-9]{4}[A-Z]$`       | Permanent Account Number (Income Tax India)            |
| Aadhaar         | `^\d{12}$`                      | 12 digits + Verhoeff checksum (see `aadhaar.verhoeff`) |
| Passport        | `^[A-Z][0-9]{7}$`               | Indian passport                                        |
| Voter ID        | `^[A-Z]{3}\d{7}$`               | EPIC number                                            |
| Driving Licence | `^[A-Z]{2}\d{2} ?\d{4} ?\d{7}$` | State-prefix + sequence                                |

## Contact

| Field          | Regex                                    | Notes                  |
| -------------- | ---------------------------------------- | ---------------------- |
| Mobile (India) | `^[6-9]\d{9}$`                           | 10 digits starting 6-9 |
| Email          | RFC 5322 lite (use `z.string().email()`) | Don't roll your own    |
| Pincode        | `^\d{6}$`                                | Indian postal code     |

## Banking

| Field          | Regex                                         | Notes                                   |
| -------------- | --------------------------------------------- | --------------------------------------- |
| Account Number | `^\d{9,18}$`                                  | Bank-specific; widest common range      |
| IFSC           | `^[A-Z]{4}0[A-Z0-9]{6}$`                      | 4 alphas + `0` + 6 alphanumeric         |
| MICR           | `^\d{9}$`                                     | Magnetic Ink Character Recognition code |
| UPI VPA        | `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`     | virtual payment address                 |
| SWIFT/BIC      | `^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$` | 8 or 11 chars                           |
| GSTIN          | `^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d][Z][A-Z\d]$`  | Goods and Services Tax ID               |

## Money

| Field      | Pattern                                  | Notes                                                                           |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| Amount (₹) | `z.number().positive().multipleOf(0.01)` | NEVER use float math — always paise as integer for internal, format for display |
| Percentage | `z.number().min(0).max(100)`             | Interest rates, ratios                                                          |

## Card data — DO NOT USE

There are no regex patterns for card numbers, CVVs, expiry dates in this catalogue. **All card data must flow through `<PCITokenizedCardInput>` which uses a PCI-compliant iframe.** A bare `<input>` capturing card data brings your app into PCI-DSS scope — never worth it.

## Implementation notes

- All regex patterns are case-sensitive unless noted.
- For "uppercase-or-lowercase" inputs, normalise to uppercase in the schema's `.transform()` step — don't make the regex case-insensitive.
- For visual readability (e.g. account number with spaces), add a `display` mapper that formats; never store the formatted version.
- Aadhaar regex alone is not enough — add `.refine(aadhaarVerhoeff)` to validate the checksum digit.
