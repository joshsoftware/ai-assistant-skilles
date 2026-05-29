---
name: bfsi-design-system
description: Research-backed design language for BFSI products (banking, fintech, insurance, payments, lending). Provides the 30-60-10 color rule, design tokens (Inter, 16px base, tabular numerals, 4/8pt spacing), component specs (buttons, inputs, cards, tables, modals), form patterns, accessibility floor (WCAG AA), dark mode palette, motion rules, and BFSI anti-patterns. Use proactively whenever building or styling ANY UI in a BFSI project — pages, components, forms, dashboards, tables, charts — or when the user says "design this", "make it look like a bank", "BFSI design", "fintech polish", "apply the design system", or types /bfsi-design-system. Also use when reviewing UI code for visual quality, hierarchy, or trust signals.
argument-hint: [page-or-component-name]
allowed-tools: Read Edit Write Glob Grep
---

# BFSI Design System

A research-backed design language for Banking, Financial Services & Insurance products. Built on the 30-60-10 color principle, minimalism, and trust-first interaction design.

## How to use this skill

**You are building or styling a UI in a BFSI project.** Apply the rules below as you write JSX/CSS/Tailwind. Don't lecture the user about the system unless asked — just _apply it_. The goal is for the rendered UI to feel like Stripe / Mercury / Wise / Monzo: calm, generous, restrained, predictable.

### Quick decision flow

1. **Before writing any component**, mentally answer the [Decision Checklist](#19-decision-checklist). If the project's brand color, density, and platform aren't established yet, look in `tailwind.config.ts` / `src/styles/tokens.css` / `src/index.css` for tokens. If absent, use the **Light Trust Blue** defaults below.
2. **Apply 30-60-10** to every screen. Walk the screen and tag each pixel as dominant / secondary / accent.
3. **Default to the tokens in §18.3.** If your project already exports CSS custom properties, use those; don't hardcode hex.
4. **Run the [anti-pattern check](#17-anti-patterns-to-avoid) before you finish.** If you're shipping a rainbow CTA, a stock-photo hero, or 10px gray legal text, fix it.

### Quick reference card (print this)

```
COLORS         60% neutral · 30% secondary · 10% accent
SPACING        4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
RADIUS         8 (sm) · 12 (md) · 16 (lg)
TYPE BASE      16px · line-height 1.5 · Inter
TYPE NUMBERS   tabular-nums, always
BUTTONS        one primary per screen
FOCUS          2px brand, 2px offset, always visible
CONTRAST       body ≥ 4.5:1, large ≥ 3:1
TOUCH          44px minimum
MOTION         150-250ms ease-out, respect reduced-motion
COLOR ≠ MEANING   always pair with icon + text
DARK MODE      from day one, not retrofit
```

---

## 1. Why BFSI Design Is Different

BFSI is not e-commerce. A user buying a sweater forgives clutter; a user moving ₹2,00,000 does not. The product has to look like it cannot lose your money.

Three forces shape every decision:

- **Trust must be visible.** Whitespace, alignment, typography, and restraint do more than logos and badges. A messy screen reads as a messy company.
- **Cognitive load must be low.** Users are often anxious (taxes, claims, transfers, KYC). Every extra element is a tax on a stressed user.
- **Regulation is real.** Disclaimers, consent, MFA, audit trails, accessibility (RBI, SEBI, IRDAI, GDPR, PCI-DSS, WCAG) — design must accommodate them gracefully, not as afterthoughts.

The aesthetic that emerges across the best BFSI products is the same: **calm, generous, restrained, predictable**.

## 2. Competitive Research

Studying what the sector actually ships. Notes are practitioner observations, not endorsements.

### 2.1 Traditional / Incumbent Banks

| Company         | Dominant Color                 | Approach                              | What They Do Well                         | What's Dated                 |
| --------------- | ------------------------------ | ------------------------------------- | ----------------------------------------- | ---------------------------- |
| JPMorgan Chase  | Chase Blue `#117ACA` on white  | Conservative, dense, utility-first    | Predictability, deep info architecture    | Heavy chrome, low whitespace |
| Bank of America | Red `#E31837` + Navy `#012169` | Two-color dominance, hierarchical nav | Brand recognition, accessibility          | Cluttered dashboards         |
| Wells Fargo     | Red `#D71E28` + Gold `#FFCD41` | Traditional, "stagecoach" warmth      | Tone of voice                             | Visually busy                |
| HSBC            | Red `#DB0011` + white          | Strong red accent, otherwise minimal  | Restraint on neutral surfaces             | Inconsistent mobile/web      |
| HDFC Bank       | Blue `#004C8F` + Red `#ED232A` | Blue chrome with red CTA              | Recognizable, scaled well                 | Form density                 |
| ICICI Bank      | Orange `#F37920` + Brown       | Warm palette, friendly tone           | Differentiates from blue-bank monoculture | Inconsistent components      |
| Citi            | Citi Blue `#003B70` + Red arc  | Brand-led with bold typography        | Confident hierarchy                       | Marketing > product polish   |
| Barclays        | Cyan `#00AEEF`                 | Single-hue dominance, white-heavy     | Calm, modern feel                         | Limited accent vocabulary    |

**Takeaway:** Incumbents lean on blue + red, prioritize information density, and treat accessibility seriously — but most lose modernity in dashboard chrome.

### 2.2 Modern Fintechs (Neobanks & Challengers)

| Company             | Dominant Color                          | Approach                                                                                              |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Stripe              | White (~75%) + Indigo `#635BFF`         | Whitespace-first, typography-driven, beautiful gradients only on marketing — product is restrained.   |
| Wise (TransferWise) | Bright Green `#9FE870` + Navy `#163300` | Bold, almost loud — but works because everything else is plain and the green is used only as the 10%. |
| Revolut             | Blue `#0075EB` + black                  | Dark, "premium" feel, cards-as-hero, generous spacing.                                                |
| Monzo               | Coral `#FF4F40` + white                 | Friendly, illustrative, sans-serif, conversational microcopy.                                         |
| N26                 | Mint `#48E0A0` + white + black          | Extreme minimalism, near-monochrome, mint as a single accent.                                         |
| Chime               | Mint Green `#1EC677` + white            | Green = "money flowing," generous whitespace.                                                         |
| Robinhood           | Black + Green `#00C805`                 | Dark mode-first, gamified, big numbers.                                                               |
| Cash App            | Black + green `#00D632`                 | Maximalist marketing, minimalist product.                                                             |
| Mercury             | Off-white + Charcoal + subtle accent    | Editorial typography, almost a magazine feel.                                                         |
| Brex                | Off-black + warm cream                  | Premium, restrained, serif-display headings.                                                          |
| Razorpay            | Blue `#3395FF` + white                  | Clean, dev-first, generous whitespace.                                                                |
| Zerodha (Kite)      | Orange `#FF5722` + dark surfaces        | Dense by necessity (trading), but precise typography saves it.                                        |
| Groww               | Green `#00B386` + white                 | Clean, single-accent, retail-investor friendly.                                                       |
| CRED                | Black + white + matte gradients         | Luxury-coded, editorial, font-as-art.                                                                 |

**Takeaway:** Modern fintechs converge on **one dominant neutral (white or near-black), one secondary, one accent.** Exactly 30-60-10.

### 2.3 Investment & Wealth Platforms

| Company                 | Notes                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Vanguard                | Red `#96151D` + white. Editorial, content-heavy, conservative typography.                     |
| Fidelity                | Green `#368727` + white. Tabular density, but balanced spacing.                               |
| Charles Schwab          | Blue `#00A0DF`. Heavy data, but clean grids.                                                  |
| Bloomberg Terminal      | Black + Bloomberg Orange `#FA8000`. Information-dense by design — every pixel is intentional. |
| Interactive Brokers     | Functional, dated visually, but unmatched data fidelity.                                      |
| Public.com              | White + black, photographic, "social investing" tone.                                         |
| Marcus by Goldman Sachs | Navy `#0E1F3A` + gold. "Quiet luxury."                                                        |

### 2.4 Insurance

| Company      | Notes                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Lemonade     | Pink `#FF0083` + white. Completely rejected insurance's blue monoculture. Illustrative, conversational. |
| GEICO        | Green `#00874A` + white. Mascot-led brand, minimal product.                                             |
| Progressive  | Blue `#0033A0` + white + Flo's blue.                                                                    |
| Allstate     | Blue `#00529B` + white. "You're in good hands."                                                         |
| PolicyBazaar | Yellow `#FDB913` + dark blue. Indian aggregator — high density, comparison-led.                         |
| Acko         | Light blue + white. Digital-first, friendly, minimal forms.                                             |
| Oscar Health | Bright orange `#F76652` + white. Healthtech reimagining insurance — illustrative, calm.                 |

### 2.5 Payments & Infrastructure

| Company          | Notes                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| PayPal           | Two blues `#003087` + `#0070BA` + white. Iconic, slightly dated visually.                 |
| Visa             | Visa Blue `#1A1F71` + Gold `#F7B600`. Pure brand layer.                                   |
| Mastercard       | Red `#EB001B` + Yellow `#F79E1B` overlap circle. Now icon-only logo — extreme minimalism. |
| American Express | AmEx Blue `#006FCF` + white. Premium card design language.                                |
| Plaid            | Black + white + subtle gradients. Developer-first, near-monochrome.                       |
| Square / Block   | Black + white. Maximum minimalism.                                                        |
| Adyen            | Green `#0ABF53` + white + black. Enterprise-clean.                                        |

### Patterns That Repeat Across All Categories

- **One brand color, one accent, lots of neutrals.** Never more.
- **Sans-serif body, occasionally serif display** (Mercury, Brex, CRED).
- **8pt or 4pt spacing grid.** Universally.
- **Generous line-height** (1.5+ for body).
- **Cards over containers with borders.** Soft shadows, large radii (8-16px).
- **CTAs are loud, everything else is quiet.**
- **Tabular numerals** for any numeric column.
- **No gradients in product UI** (only marketing). Stripe, Wise, Revolut all follow this.
- **Trust signals are typographic, not badge-y.** Modern fintechs almost never use "SSL secured" badges; instead they earn trust through polish.

## 3. Core Design Principles

These are the rules everything else descends from.

### 3.1 Clarity over Cleverness

If a user has to think about the interface, the interface has already failed. No clever icons without labels. No vague CTAs ("Continue" beats "Let's go!" in BFSI). No hover-only affordances.

### 3.2 Restraint is the Aesthetic

The look of competence is what's _missing_ from the screen. Aim to remove 30% of visual elements after the first draft. If a divider, border, shadow, or color doesn't carry meaning, delete it.

### 3.3 Hierarchy Is Sacred

Every screen has exactly one primary action. Visual weight matches importance: size → color → weight → position. A user squinting at the screen should still see what to do.

### 3.4 Predictability

Same component, same behavior, every time. A "Continue" button cannot mean different things on different screens. State changes are explicit and reversible.

### 3.5 Honest Numbers

Currency formatting, decimal alignment, tabular numerals, locale-aware separators. ₹1,00,000 in India is not ₹100,000. $1,000.00 always shows two decimals. No truncation of monetary values, ever.

### 3.6 Status Always Visible

The user must always know: _Where am I? What is happening? What can I do next? Can I undo this?_ Loading, success, error, and empty states are not edge cases — they are core states.

### 3.7 Mobile Is the Default

60-80% of BFSI traffic is mobile. Design for the thumb zone first, scale up. Desktop is a refinement, not the source of truth.

### 3.8 Accessible by Default, Not by Patch

Color contrast, focus states, keyboard navigation, screen reader labels — built in from the first component, not retrofitted before launch.

## 4. The 30-60-10 Color Rule

A century-old interior design principle, repurposed for digital. Used (consciously or not) by Stripe, Wise, Monzo, N26, and every modern fintech.

### 4.1 The Distribution

```
┌─────────────────────────────────────────────────────────────┐
│  60%  DOMINANT      Background, surfaces, large areas       │
│                     → Neutral. White, off-white, or dark.   │
│                                                             │
│  30%  SECONDARY     Containers, cards, sections, text       │
│                     → Brand neutral or muted brand color.   │
│                                                             │
│  10%  ACCENT        CTAs, links, active states, key data    │
│                     → Bright, brand-defining color.         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Why It Works for BFSI Specifically

- The 60% (neutral) does the heavy lifting — calm, professional, reduces fatigue during long sessions (taxes, loan applications, statements).
- The 30% (secondary) creates structure without competing — cards, dividers, body text.
- The 10% (accent) carries all the brand personality and directs every action. Because it's rare, it works. Saturate it and it stops working.

### 4.3 Two Working Templates

**Template A — Light, "Stripe-coded"**

- 60% Pure White / Near-White (`#FFFFFF` / `#FAFAFA`)
- 30% Cool Gray / Brand-Tinted Gray (`#F4F6F8` surfaces, `#1A1F36` text)
- 10% Brand Color (e.g., Indigo `#635BFF`, Mint `#00B386`, your brand)

**Template B — Dark, "Revolut/CRED-coded"**

- 60% Near-Black / Charcoal (`#0A0A0A` / `#121212`)
- 30% Elevated Surface + Body Text (`#1C1C1E`, `#A0A0A8`)
- 10% Brand Accent (e.g., Electric Blue, Mint Green, Gold)

### 4.4 The Rule for Applying It

Walk through any screen and ask: _which of the three buckets does this pixel belong to?_ If you can't answer, you have a fourth color, which means you're breaking the rule.

The 10% should never appear in more than one or two visually concurrent elements per screen. If three things on screen are accent-colored, nothing is.

## 5. Color System

### 5.1 Recommended Palette (Light Mode Default)

#### Neutrals (the 60% + 30%)

| Token              | Hex       | Use                              |
| ------------------ | --------- | -------------------------------- |
| `--surface-0`      | `#FFFFFF` | App background                   |
| `--surface-1`      | `#FAFAFB` | Subtle section background        |
| `--surface-2`      | `#F4F5F7` | Cards on lighter backgrounds     |
| `--surface-3`      | `#EAECEF` | Hover, deep nesting              |
| `--border-subtle`  | `#E5E7EB` | Dividers, default borders        |
| `--border-strong`  | `#D1D5DB` | Form inputs, emphasized borders  |
| `--text-primary`   | `#0F172A` | Body, headings                   |
| `--text-secondary` | `#475569` | Labels, secondary copy           |
| `--text-tertiary`  | `#94A3B8` | Placeholder, captions, disabled  |
| `--text-inverse`   | `#FFFFFF` | Text on dark/colored backgrounds |

#### Brand Accent (the 10%) — pick ONE family

Choose one and only one of these as your primary brand color. Each is psychologically appropriate for BFSI.

| Family          | Primary   | Hover     | Pressed   | Best For                     |
| --------------- | --------- | --------- | --------- | ---------------------------- |
| Trust Blue      | `#1E5EFF` | `#1A52E0` | `#1745BD` | Banking, B2B, enterprise     |
| Wealth Green    | `#00B386` | `#009974` | `#007F60` | Investing, savings, growth   |
| Premium Navy    | `#0E1F3A` | `#1A2D4F` | `#243B64` | Private banking, wealth      |
| Fintech Indigo  | `#635BFF` | `#5851DB` | `#4A43BD` | Modern fintech, payments     |
| Insurance Coral | `#FF5247` | `#E64438` | `#C73A2F` | Insurance, consumer-friendly |

#### Semantic (always present, regardless of brand)

| Token          | Hex       | Use                                  |
| -------------- | --------- | ------------------------------------ |
| `--success`    | `#0F9D58` | Confirmations, positive deltas, paid |
| `--success-bg` | `#E6F4EC` | Success toast backgrounds            |
| `--warning`    | `#F59E0B` | Pending, attention needed            |
| `--warning-bg` | `#FEF3C7` | Warning toast backgrounds            |
| `--danger`     | `#DC2626` | Errors, negative deltas, destructive |
| `--danger-bg`  | `#FEE2E2` | Error toast backgrounds              |
| `--info`       | `#0EA5E9` | Informational only, never CTAs       |

### 5.2 Rules for Color Use

1. **CTAs are accent only.** Never red, never green — those are reserved for destructive and success states respectively.
2. **Green = money in / success. Red = money out / error.** Don't mix these meanings.
3. **Color is never the only signal.** A red error must also have an icon and text. A green success must also have a checkmark. (See §14 Accessibility.)
4. **Avoid pure black `#000000`.** Use `#0F172A` or `#121212` — pure black creates excessive contrast that fatigues the eye on screens.
5. **Avoid pure white `#FFFFFF` in dark mode comparisons.** Use `#FAFAFA` or `#EDEDED` for text on dark backgrounds.
6. **Test in grayscale.** If the hierarchy survives without color, it's a good design. If it collapses, color is doing work it shouldn't.

## 6. Typography

### 6.1 Typeface Choices

**Recommended stack:**

```css
--font-sans: 'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
  Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
--font-display: 'Inter', 'SF Pro Display', system-ui, sans-serif;
```

**Why Inter:** open-source, optimized for screens, has true tabular numerals (critical for finance), excellent at small sizes, and used by Stripe, Mercury, Linear, Notion, Vercel, and most modern fintechs.

**Alternatives worth considering:** IBM Plex Sans (warmer), Söhne (premium), Geist (Vercel's tighter Inter successor), or system fonts (zero perf cost).

### 6.2 Type Scale (8pt baseline)

| Token         | Size | Line Height | Weight | Use                               |
| ------------- | ---- | ----------- | ------ | --------------------------------- |
| `--text-2xs`  | 11px | 16px        | 500    | Microcopy, legal, tooltips        |
| `--text-xs`   | 12px | 18px        | 400    | Captions, labels                  |
| `--text-sm`   | 14px | 22px        | 400    | Secondary body, dense tables      |
| `--text-base` | 16px | 26px        | 400    | Primary body — **default**        |
| `--text-lg`   | 18px | 28px        | 500    | Subheadings, lead paragraphs      |
| `--text-xl`   | 20px | 30px        | 600    | Section headings                  |
| `--text-2xl`  | 24px | 34px        | 600    | Page headings                     |
| `--text-3xl`  | 32px | 42px        | 700    | Hero, large amounts               |
| `--text-4xl`  | 40px | 50px        | 700    | Marketing, dashboard hero numbers |
| `--text-5xl`  | 56px | 64px        | 700    | Marketing only                    |

### 6.3 Rules for Type in BFSI

1. **Body text is 16px minimum.** Smaller fails accessibility and signals "we hide things."
2. **Line height ≥ 1.5 for body.** Long disclosures and policy text need breathing room.
3. **Tabular numerals (`font-variant-numeric: tabular-nums`) on EVERY numeric column.** Non-negotiable. Without it, `1,234` and `1,567` don't align in a column.
4. **Weight, not italics, for emphasis.** Italics are hard to read at small sizes.
5. **Sentence case for UI labels and buttons.** "Transfer money," not "TRANSFER MONEY."
6. **All caps only for tiny labels** (10-12px), with `letter-spacing: 0.05em`.
7. **Maximum line length: 75 characters** for body text. Beyond this, readability collapses.
8. **Currency: tabular nums, right-aligned in tables, never truncated.**

## 7. Spacing, Grid & Layout

### 7.1 The 4pt / 8pt System

All spacing, sizing, and positioning derives from multiples of 4.

```
4   →  --space-1   (inline icon gap)
8   →  --space-2   (label-to-input)
12  →  --space-3   (related items)
16  →  --space-4   (default gap)
24  →  --space-6   (section internal)
32  →  --space-8   (section breaks)
48  →  --space-12  (page sections)
64  →  --space-16  (hero spacing)
96  →  --space-24  (page chapters)
```

### 7.2 Layout Grid

- **Desktop:** 12-column, 1200-1280px max-width, 24-32px gutters
- **Tablet:** 8-column, 24px gutters
- **Mobile:** 4-column, 16px gutters, 16-20px outer padding

### 7.3 Container & Card Patterns

- **Border radius:** 8px (small), 12px (default cards), 16px (large surfaces), 24px (hero cards)
- **Shadow elevation** (light mode):
  - Level 1 (rest): `0 1px 2px rgba(15, 23, 42, 0.04)`
  - Level 2 (raised): `0 4px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`
  - Level 3 (modal): `0 12px 32px rgba(15, 23, 42, 0.12)`
- **Never** use heavy drop shadows in BFSI. Subtle shadows + 1px borders = professional. Heavy shadows = consumer e-commerce.

### 7.4 Whitespace Rule

If in doubt, double the space. The single most reliable upgrade to a BFSI design is increasing whitespace by 25-50%.

## 8. Components

### 8.1 Buttons

| Variant          | Use                                      | Example            |
| ---------------- | ---------------------------------------- | ------------------ |
| Primary          | THE action on this screen. One per view. | "Transfer ₹50,000" |
| Secondary        | Alternative actions.                     | "Save as draft"    |
| Tertiary / Ghost | Low-emphasis actions.                    | "Cancel"           |
| Destructive      | Irreversible/dangerous actions.          | "Close account"    |
| Link             | Navigation, inline actions.              | "View statement"   |

**Specs:** Height 40px (default) / 48px (large mobile) / 32px (compact tables). Padding 16-24px horizontal. Radius 8px. Font weight 500-600. Focus ring 2px brand, 2px offset. Disabled = 40% opacity. Loading replaces label with spinner — preserve width to prevent layout shift.

### 8.2 Inputs

- Height: 44px minimum (touch target compliance)
- Border: 1px `--border-strong` at rest, 2px brand on focus
- Padding: 12px 16px
- Radius: 8px
- Label: above input, never floating-only (accessibility)
- Helper text: 12-13px, `--text-secondary`
- Error state: 2px `--danger` border + icon + message below
- Currency inputs: prefix with symbol, right-align numbers, tabular nums

### 8.3 Cards

- Background: `--surface-0` on `--surface-1` backgrounds, or `--surface-2` for sub-cards
- Border: 1px `--border-subtle` OR shadow Level 1 — pick one, never both
- Radius: 12px
- Padding: 16-24px

### 8.4 Tables (Financial Data)

- Row height: 48-56px
- Header: `--surface-2` background, `--text-secondary`, 12px uppercase
- Numeric columns: right-aligned, tabular numerals
- Zebra striping: avoid; use subtle row borders instead
- Hover row: `--surface-1`
- Sticky header on scroll
- Mobile: collapse to cards, never horizontal-scroll long tables

### 8.5 Modals & Dialogs

- Width: 480px (default), 640px (forms), 800px (data)
- Backdrop: `rgba(15, 23, 42, 0.5)` with optional `blur(4px)`
- Always: title, body, primary action, cancel/close
- Destructive actions: confirmation with typed value ("type DELETE to confirm") for irreversible actions

## 9. Iconography & Imagery

### 9.1 Icons

- **System:** Lucide (default — already in `lucide-react`), Phosphor, Heroicons, or Tabler.
- **Size:** 16px, 20px, 24px standard. Never odd sizes.
- **Stroke:** 1.5-2px consistent across the set.
- **Style:** Outlined for default, filled for active/selected states only.
- **Always pair with labels** unless universally recognized (search, close, back).

### 9.2 Imagery

- **Avoid stock photos of "happy diverse people holding cards."** Most over-used and lowest-trust visual in BFSI.
- **Prefer:**
  - Real product UI screenshots (Stripe, Linear)
  - Abstract geometric illustrations (Wise, Monzo)
  - Editorial photography of objects/places (Mercury, Brex)
  - Data-as-art (line charts, abstract finance graphics)

### 9.3 Empty States

Every list/table has an empty state. Components:

1. Small illustration or icon (not a photo)
2. Headline: "No transactions yet"
3. Helper: One sentence explaining why or what to do
4. Action: A button to populate it if applicable

## 10. Data Visualization

Finance is data. Charts are the product.

### 10.1 Rules

1. **One color per series.** Categorical palettes for categorical data, sequential for ordinal, diverging for +/- around zero.
2. **Money up/positive = brand green, never just "green."** Money down/negative = `--danger`. Same on every chart.
3. **Always label axes and units.** "₹ in lakhs," "Q3 2025," etc.
4. **No 3D charts. Ever.**
5. **No pie charts beyond 4 slices.** Use stacked bars or treemaps instead.
6. **Tooltips on hover, not just legends.** Touch users need tap-to-reveal.
7. **Lines for time series, bars for comparison, area for cumulative.** Pick the right chart.
8. **Y-axis: don't truncate without an explicit break marker** — misleading users about scale violates regulator advertising rules in many jurisdictions.

### 10.2 Recommended Libraries

- **Recharts** (React) — clean defaults, easy to theme
- **Visx** (Airbnb) — D3 with React composition
- **Chart.js** — pragmatic, vanilla-friendly
- **D3** — when you need full control
- **ApexCharts** — strong out-of-the-box look

## 11. Forms

Forms are 70% of BFSI surface area (KYC, onboarding, transfers, claims, applications). Treat them as the product.

### 11.1 Form Design Principles

1. **One column.** Two-column forms double error rates on mobile and slow desktop completion.
2. **Group related fields.** Personal info, address, identity, etc. — visible sections, not crammed.
3. **Show progress on multi-step.** Progress bar or step indicator at top.
4. **Save state aggressively.** A user who reloads loses nothing.
5. **Inline validation, but only after blur.** Validating while typing is hostile.
6. **Be explicit about format.** Don't reject `4111 1111 1111 1111` for having spaces — strip them.
7. **PAN, Aadhaar, IFSC, account numbers: auto-uppercase, monospace, formatted.**
8. **Phone numbers: country code selector + national format guide.**
9. **Currency: localized formatting as user types** (`100000` → `1,00,000`).
10. **Error messages:**
    - Specific: "Card number must be 16 digits" not "Invalid input"
    - Solution-oriented: "Add the 3-digit CVV from the back of your card"
    - Inline + summarized at top for long forms

### 11.2 Field-Type Defaults

| Field         | Input Type                        | Pattern                       | Mask                    |
| ------------- | --------------------------------- | ----------------------------- | ----------------------- |
| Email         | `type="email"`                    | —                             | lowercase auto          |
| Phone         | `type="tel"`                      | digit-only                    | `+91 XXXXX XXXXX`       |
| Card          | `type="text" inputmode="numeric"` | digits                        | `XXXX XXXX XXXX XXXX`   |
| OTP           | `type="text" inputmode="numeric"` | digits, autofocus, paste-safe | 6 separated boxes       |
| Amount        | `type="text" inputmode="decimal"` | currency                      | Locale-aware separators |
| Date of Birth | Three selects or date picker      | DD/MM/YYYY                    | Locale order            |

## 12. Trust, Security & Compliance Signals

### 12.1 Visible Trust Cues

- **HTTPS lock icon** in any custom URL bar; mention secure transfer at sensitive steps.
- **Last login timestamp** at the top of the dashboard.
- **Device & session list** in security settings.
- **Mask sensitive numbers by default** — show last 4 digits, reveal on tap. (See `bfsi-pii-field` skill.)
- **Two-factor everywhere** that mutates state.
- **Logout timer** with countdown + extend prompt before idle expiry.
- **Receipt of every action** — confirmation screen + email + in-app notification.

### 12.2 Avoid

- Trust badge soup ("SSL secured," "Norton certified," "TRUSTe"). Modern users find these reduce trust.
- Pop-ups asking for ratings during transactions.
- Cross-sell offers on confirmation screens — wait until later.
- Marketing in transactional flows.

### 12.3 Compliance UI Conventions

- **Consent must be opt-in**, not pre-checked.
- **Disclosures must be readable** (16px, 1.5 line-height, not 11px gray-on-gray).
- **Material risks in the same visual weight as benefits** — many regulators now require this.
- **Audit trail visible to user** (transaction history, downloadable statements, support chat archive).

## 13. Motion & Microinteractions

### 13.1 Principles

- **Function over flourish.** Motion explains state changes, never decorates.
- **Fast.** 150-250ms for most transitions; 80-120ms for hover.
- **Ease, don't bounce.** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-quint) is a safe default.
- **Respect `prefers-reduced-motion`.** Always.
- **Numbers count up.** When a balance updates, animate the digit (300ms ease-out) — confirms the change emotionally.
- **Success states linger briefly** (1.5-2s) before auto-dismissing.
- **No surprise modals.** Anything that interrupts must be expected.

### 13.2 Microinteraction Inventory

| Interaction        | Behavior                                     |
| ------------------ | -------------------------------------------- |
| Button press       | Scale 0.98, 80ms                             |
| Toggle/switch      | Slide + color crossfade, 200ms               |
| Tab change         | Underline slide + content crossfade, 200ms   |
| Modal open         | Fade backdrop, scale modal 0.96 → 1.0, 200ms |
| Toast appear       | Slide from top/bottom edge, 250ms            |
| Skeleton → content | Crossfade, 150ms                             |
| Form error         | Shake X-axis, 6-8px, 200ms (very gentle)     |

## 14. Accessibility

WCAG 2.1 AA is the floor. AAA where you can. Regulatory in many BFSI contexts (RBI, EU Accessibility Act, ADA).

### 14.1 Color Contrast

- **Body text:** 4.5:1 minimum (AA), aim for 7:1 (AAA)
- **Large text (18px+ or 14px bold):** 3:1 minimum
- **UI components and focus indicators:** 3:1 minimum against adjacent colors
- Tools: WebAIM Contrast Checker, Stark, axe DevTools

### 14.2 Keyboard

- Every interactive element reachable via Tab in logical order.
- Visible focus ring (2px brand accent, 2px offset). Never `outline: none` without replacement.
- `Esc` closes modals. `Enter` submits forms.
- Skip-to-content link at the top.

### 14.3 Screen Readers

- Semantic HTML first (`<button>`, `<nav>`, `<main>`, `<table>`), ARIA second.
- Form inputs have associated `<label>` (not just placeholders).
- Live regions (`aria-live="polite"`) for balance updates, toast notifications.
- Icons have `aria-label` when standalone, `aria-hidden="true"` when decorative beside text.

### 14.4 Touch Targets

- 44×44px minimum (Apple HIG), 48×48dp (Material). 8px spacing between adjacent targets.

### 14.5 Beyond Color

- Every error has: red color + icon + text. Never red alone.
- Every success has: green + checkmark + text.
- Charts have patterns or labels in addition to color.

## 15. Dark Mode

Not optional for finance apps post-2022.

### 15.1 Dark Palette

| Token              | Hex       | Use                   |
| ------------------ | --------- | --------------------- |
| `--surface-0`      | `#0A0A0B` | App background        |
| `--surface-1`      | `#121214` | Cards                 |
| `--surface-2`      | `#1A1A1D` | Elevated cards        |
| `--surface-3`      | `#26262A` | Hover, inputs         |
| `--border-subtle`  | `#26262A` | Dividers              |
| `--border-strong`  | `#3A3A3F` | Inputs, emphasized    |
| `--text-primary`   | `#FAFAFA` | Body                  |
| `--text-secondary` | `#A1A1AA` | Labels                |
| `--text-tertiary`  | `#71717A` | Disabled, placeholder |

### 15.2 Rules

- **Brand accent stays the same hue, slightly desaturated.** Highly saturated brand colors glow on dark and hurt the eyes.
- **Semantic colors brightened ~10%** for visibility on dark surfaces.
- **Elevate with lighter surfaces, not shadow.** Shadows don't read on dark.
- **Test both modes from day one.** Retrofitting dark mode is twice the work.

## 16. Mobile-First Considerations

### 16.1 Thumb Zone

- Primary actions in the bottom 30% of the screen.
- Avoid placing critical CTAs in the top-right corner of mobile screens.
- Bottom nav over top nav for app-shell patterns.

### 16.2 Native Patterns

- iOS Human Interface Guidelines + Material 3 — respect the platform.
- Use system pickers (date, time) over custom unless customization is essential.
- Pull-to-refresh on transaction lists. Always.
- Haptic feedback on success / error / important confirmations.

### 16.3 Performance

- First Contentful Paint < 1.5s on 3G.
- Skeleton screens, not spinners, for data loading.
- Lazy-load below-the-fold content.
- Compress and serve images as WebP/AVIF.

## 17. Anti-Patterns to Avoid

Things observed in BFSI products that consistently fail. **Run this check before declaring a screen done.**

- **Rainbow CTAs.** More than one accent color across a flow.
- **Pop-up roulette.** Multiple modals/banners on landing (cookie + KYC + promo + survey).
- **Stock-photo hero of smiling family.** Reads as 2014.
- **Gradient buttons.** Read as marketing, not product.
- **Tiny disclosures (10px gray on white).** Accessibility fail and regulatory risk.
- **All-caps body text.** Hostile.
- **Auto-playing animations.** Especially celebratory ones around money.
- **Forcing app download to view a statement on mobile web.**
- **Truncated currency amounts.** ₹1,23,...
- **Confirmation buttons that say "Yes" and "No."** Always restate the action: "Transfer ₹50,000" / "Cancel."
- **Logout that's hard to find.** Logout is a trust signal — surface it.
- **Different terms for the same thing.** "Account" / "Profile" / "User" — pick one.

## 18. Recommended Stack

### 18.1 Frontend

- **Framework:** React + TypeScript (the starter uses Vite + React 19).
- **Styling:** Tailwind with a custom theme matching the tokens below, OR vanilla CSS with custom properties.
- **Component library:** shadcn/ui (copy-paste, you own the code), or Radix UI primitives + custom styles.
- **Icons:** Lucide (`lucide-react`) — already in deps.
- **Charts:** Recharts for most cases, Visx for complex.
- **Forms:** React Hook Form + Zod — already in deps.
- **Animation:** Framer Motion (sparingly).
- **Fonts:** Inter, self-hosted with `font-display: swap`.

### 18.2 Design Tokens

Tokens live in a single source of truth (`tokens.json` or `tokens.css`) and are consumed by both design (Figma variables) and code. Use Style Dictionary or Tokens Studio if multi-platform.

### 18.3 Sample CSS Custom Properties (drop-in)

```css
:root {
  /* Surfaces */
  --surface-0: #ffffff;
  --surface-1: #fafafb;
  --surface-2: #f4f5f7;
  --surface-3: #eaecef;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;

  /* Borders */
  --border-subtle: #e5e7eb;
  --border-strong: #d1d5db;

  /* Brand (replace with your chosen family) */
  --brand: #1e5eff;
  --brand-hover: #1a52e0;
  --brand-pressed: #1745bd;

  /* Semantic */
  --success: #0f9d58;
  --warning: #f59e0b;
  --danger: #dc2626;
  --info: #0ea5e9;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-1: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-2: 0 4px 8px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-3: 0 12px 32px rgba(15, 23, 42, 0.12);

  /* Type */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface-0: #0a0a0b;
    --surface-1: #121214;
    --surface-2: #1a1a1d;
    --surface-3: #26262a;
    --text-primary: #fafafa;
    --text-secondary: #a1a1aa;
    --text-tertiary: #71717a;
    --border-subtle: #26262a;
    --border-strong: #3a3a3f;
  }
}

/* Tabular numerals globally on numbers */
.num,
td.num,
[data-numeric] {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

## 19. Decision Checklist

Lock these decisions before building. Everything else flows from them.

- [ ] **Sub-sector:** Banking? Investing? Insurance? Payments? Lending?
- [ ] **Audience:** Retail? HNI? SMB? Enterprise? Developer?
- [ ] **Light or dark default?** (Or system-respecting.)
- [ ] **Brand accent color** from §5.1 — pick one family.
- [ ] **Typeface:** Inter (recommended default) or alternative?
- [ ] **Density:** Comfortable (consumer) or compact (pro/trading)?
- [ ] **Platforms:** Web responsive? Native iOS/Android? Both?
- [ ] **Regulatory floor:** RBI? SEBI? IRDAI? GDPR? PCI-DSS? WCAG AA or AAA?
- [ ] **Reference products** (3-5): which competitors' design you most admire.
- [ ] **What you don't want to look like:** name the products that feel wrong for your brand.

## Workflow when invoked on a specific page/component

1. **Read the file** the user is asking you to design or restyle.
2. **Check the project tokens first.** Read `tailwind.config.ts` and `src/index.css` / `src/styles/tokens.css`. If tokens exist, use them. If not, propose adding §18.3.
3. **Audit the current state** against §17 anti-patterns. Surface what's wrong before changing it.
4. **Apply 30-60-10.** Walk the screen, assign every region.
5. **Apply the rules** in this order: hierarchy → spacing → type → color → motion. Don't reorder — color is the last decision, not the first.
6. **Run the [accessibility floor](#14-accessibility)** — keyboard, contrast, touch targets, beyond-color cues.
7. **Sanity-check the quick reference card** at the top of this skill before reporting done.

## Related skills

- `bfsi-form` — apply §11 form rules
- `bfsi-data-table` — apply §8.4 table rules
- `bfsi-pii-field` — pair with §12 trust signals
- `bfsi-perf-react`, `bfsi-perf-virtualize-list` — back §16.3 performance
- `bfsi-accessibility-auditor` (agent) — verify §14 compliance
