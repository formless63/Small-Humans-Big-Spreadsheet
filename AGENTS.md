# AGENTS.md — Small Humans, Big Spreadsheet

This file defines implementation rules for coding agents working in this repository.

Read `SPEC.md` completely before making architectural changes.

---

# Mission

Build a transparent, deterministic, static financial calculator for comparing strategies used to fund a child's education and long-term financial future.

The financial model is the primary product.

The UI is a visualization of that model.

Correctness, traceability, and provenance take priority over visual polish.

---

# Non-Negotiable Rules

## 1. No magic money

Under the default closed-system scenario, parental contributions stop according to the configured contribution schedule.

After that point, expenses must be paid by an explicit source.

For every education period:

```text
education expense
=
grant/scholarship aid
+ eligible account withdrawals
+ explicitly modeled child funding
+ loan proceeds
+ unfunded gap
```

Do not silently invent additional parental funding.

Do not silently assume tuition has been paid from "elsewhere."

---

## 2. Every factual financial rule needs a source

Do not introduce legal/tax/loan limits from memory.

Every factual parameter must contain one or more references to `src/data/sources.ts`.

Examples:

- contribution limits;
- tax thresholds;
- student-loan limits;
- student-loan rates;
- qualified expense definitions;
- Roth rollover limits;
- state tax deductions.

If a value is not sourced, it must be labeled:

`MODEL_ASSUMPTION`

or:

`USER_INPUT`

---

## 3. Resolve sources from primary authorities

Prefer, in order:

1. statute/regulation;
2. IRS / Treasury;
3. U.S. Department of Education / Federal Student Aid;
4. state tax authority;
5. BLS or other official federal statistical source;
6. College Board for national college-cost datasets;
7. the institution itself for institution-specific cost/aid policy.

Do not use blogs, financial-news summaries, Reddit, SEO sites, or vendor marketing pages to encode legal rules when a primary source exists.

The source names supplied in `SPEC.md` are the initial registry.

Resolve their canonical URLs during implementation.

---

# Source Status Matters

Distinguish:

```text
statute
final guidance
proposed guidance
official dataset
institution policy
model assumption
```

Some 2026 Trump Account IRS materials contain proposed regulations.

Do not label proposed guidance as a final regulation.

Display the distinction in source metadata where relevant.

---

# Current Data Baseline

Initial implementation date:

**2026-09-30**

All law/policy/data modules must carry an `asOf` or source date.

Future updates should replace a versioned data module rather than rewriting historical calculations invisibly.

Example:

```text
federal/tax2026.ts
federal/studentLoans2026.ts
states/ny2026.ts
```

---

# Stack

Use:

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts 3
- Zod
- Decimal.js or equivalent
- Vitest
- Playwright
- GitHub Actions
- GitHub Pages

Use latest stable compatible releases at initial implementation.

Avoid prereleases.

Use Node current active LTS, preferably Node 24 while it remains appropriate.

Use Bun for dependency installation, scripts, and the lockfile. Commit `bun.lock` and use `bun install --frozen-lockfile` in CI.

---

# Do Not Add a Backend

Do not add:

- database;
- authentication;
- API;
- SSR;
- serverless functions;
- external state service.

The app must work as static files on GitHub Pages.

All calculations occur locally.

---

# Do Not Add Heavy State Management

React state/reducers are sufficient.

Scenario state should serialize through `URLSearchParams`.

Do not add Redux/Zustand/etc. unless the application's complexity later proves it necessary.

---

# Financial Math

Do not use naive binary floating-point math for account bookkeeping.

Use Decimal arithmetic for:

- balances;
- basis;
- taxes;
- contributions;
- withdrawals;
- loan balances;
- interest.

Convert to ordinary JS numbers only at visualization boundaries when necessary.

Define rounding behavior explicitly.

---

# Simulation Architecture

Keep the simulation engine independent of React.

Bad:

```ts
const tuitionAfterTrumpTax = ...
```

inside a React component.

Good:

```ts
const result = simulateScenario(scenario)
```

React should render `result`.

The same scenario passed into the engine must always return the same result.

No random Monte Carlo behavior in initial v1.

Monte Carlo may be added later as a separate optional analysis mode.

---

# Monthly Ledger

Use a monthly simulation timeline.

Maintain an event ledger.

Every material transaction should have enough information to explain itself.

Recommended event shape:

```ts
type LedgerEvent = {
  date: string
  age: number
  category:
    | "contribution"
    | "growth"
    | "education"
    | "withdrawal"
    | "tax"
    | "penalty"
    | "loan"
    | "loan-payment"
    | "conversion"
    | "rollover"
  vehicleId?: string
  amount: Decimal
  sourceIds?: string[]
  explanation: string
}
```

The "Show the math" UI is produced from this ledger.

Do not create a second, separate explanation engine.

---

# Vehicle Extensibility

Do not architect the model as:

```ts
if (strategy === "529") ...
else if (strategy === "trump") ...
```

The code must accommodate future vehicles.

Use a vehicle registry or polymorphic module pattern.

Likely future modules:

```text
taxableBrokerage
utma
rothIra
coverdell
cash
iBond
able
trust
```

V1 does not need to implement all of these.

It must not make them difficult to add.

---

# Strategies Are Not Vehicles

A strategy may contain multiple vehicles.

Example:

```ts
{
  id: "split-529-trump",
  contributions: [
    { vehicle: "529", share: 0.5 },
    { vehicle: "trump", share: 0.5 }
  ]
}
```

Withdrawal/funding policies must also be independently configurable.

---

# Critical Closed-System Test

Create a reusable assertion:

```ts
expectFundingToReconcile(result)
```

For each education month/year:

```text
expense
- grants
- scholarships
- account withdrawals
- child contribution
- federal borrowing
- gap borrowing
- unfunded gap
= 0
```

within rounding tolerance.

This should be one of the most important tests in the repository.

---

# 529 Implementation Traps

Do not:

- assume all college cost-of-attendance categories are qualified 529 expenses;
- penalize returned contribution basis as earnings;
- apply a 10% penalty to the entire nonqualified distribution;
- ignore state recapture;
- allow unlimited immediate 529 → Roth transfer;
- ignore the 15-year account rule;
- ignore the five-year contribution lookback;
- ignore annual Roth contribution constraints.

Break college costs into qualification categories.

See `SPEC.md`.

---

# Trump Account Implementation Traps

Do not treat a Trump Account as a Roth IRA.

During the growth period:

- ordinary withdrawals are generally restricted;
- investment restrictions apply;
- contribution rules differ from ordinary IRAs;
- a child does not need compensation for permitted growth-period contributions.

After the growth period:

- traditional IRA rules generally apply, subject to continuing special provisions.

Track basis.

A parent-funded $5,000 contribution is not automatically fully taxable later.

Likewise, investment growth is not automatically tax-free.

---

# Growth-Period Date Logic

Do not use only the child's 18th birthday.

Current rules define the growth period on calendar-year boundaries.

Implement a dedicated function such as:

```ts
getTrumpGrowthPeriodEnd(birthDate)
```

and unit test December/January birthdays.

---

# Trump Education Withdrawals

A qualified higher-education expense can qualify for the IRA exception to the ordinary 10% additional early-distribution tax.

That does **not** make the taxable portion ordinary-income-tax-free.

Always separate:

```text
gross withdrawal
basis
taxable amount
ordinary tax
additional tax
spendable proceeds
```

If the child needs $20,000 of tuition and a withdrawal creates $2,000 of tax, do not report a $20,000 withdrawal as though $20,000 reaches the school unless the tax has another modeled payer.

---

# Roth Conversions

Trump → Roth conversion is a core use case.

Support:

- none;
- immediate;
- fixed amount;
- threshold/bracket fill;
- custom annual schedule.

Conversion tax must have a payer.

No free conversion tax.

If tax is paid from the retirement account itself, model the economic consequences.

If tax is paid from the child's earnings, deduct it from the child's available cash flow.

Never assume parents pay it after the parental funding period unless the user explicitly enables that.

---

# Kiddie Tax

Do not implement:

```ts
if (income === 0) conversionTax = 0
```

That is potentially wrong.

Use the sourced Form 8615 framework.

At minimum account for:

- child's age;
- student status;
- earned income/support condition;
- unearned income;
- parent taxable-income input when required.

If the simplified tax engine cannot accurately resolve a case, return a warning and allow manual effective-tax-rate modeling.

Never pretend false precision is accuracy.

---

# Student Loans

Represent federal loans as individual tranches by academic year.

Keep:

- origination date;
- principal;
- subsidized/unsubsidized status;
- interest rate;
- in-school treatment;
- grace period;
- repayment term.

Do not simply create one $27,000 loan at graduation.

Interest timing matters.

---

# Federal Loan Limits

Initial dependent-undergraduate annual combined maximums:

```text
Year 1: $5,500
Year 2: $6,500
Year 3+: $7,500
Aggregate: $31,000
```

These require source metadata.

Do not confuse:

- four-year scheduled total ($27,000);
- aggregate lifetime undergraduate cap ($31,000).

---

# Gap Financing

Gap financing is a mathematical model, not a statement that a lender will approve the loan.

Always display:

> Illustrative gap financing; real-world availability and rates may differ.

An assumed 9% rate and 10-year term are acceptable defaults only if visibly tagged as assumptions.

The user can disable synthetic gap financing.

Disabled + insufficient funds must produce an unfunded gap.

---

# Parent PLUS

Do not use Parent PLUS by default.

The original closed-system comparison specifies that parents do not provide additional post-childhood funding.

Parent borrowing therefore represents a different strategy and should only appear when explicitly enabled later.

---

# Aid

Grant and scholarship aid is allowed because it is genuinely external non-repayable funding.

Never call a loan "aid" in the funding visualization.

Institutional aid presets must include policy year and source.

Do not project Harvard/Yale 2026 rules decades forward as facts.

---

# Education Presets

Presets are convenience values.

They must remain editable.

College Board values should include both:

- published cost;
- clearly marked derived average-net examples.

When deriving:

```text
net total
=
published total budget
- published tuition
+ net tuition
```

store the formula and source IDs.

Do not encode the derived number as though the source directly published it.

---

# Income Modeling

BLS education medians are descriptive benchmarks.

Do not imply:

> Bachelor's degree causes exactly $82,056 income.

Likewise, institution-level earnings must never be presented as the causal return of attending that institution.

Use language such as:

> Current median benchmark for workers with this educational attainment.

Trade occupations should use separate BLS occupation presets.

---

# Retirement Results

Always distinguish:

## Childhood-strategy retirement value

Assets at retirement attributable to the childhood-funded strategy.

## Career retirement assets

Assets resulting from the child's own later earnings and savings.

## Debt opportunity cost

Counterfactual future value of loan payments if invested instead.

Never add/subtract these concepts without an explicit explanation.

---

# State Tax Benefit

For a fixed gross annual contribution comparison:

```text
$5,000 to 529
vs.
$5,000 to other account
```

do not automatically reinvest the parent's resulting NY tax savings.

Report it separately.

A separate "equal parent net outlay" mode may reinvest/adjust for tax benefits later.

---

# Source Registry Tests

Create tests asserting:

- every `sourceId` referenced by data exists;
- every source has a nonempty canonical URL;
- every sourced constant has at least one source;
- model assumptions are not mislabeled `SOURCE`;
- derived values name their upstream source values/formula.

CI must fail on broken provenance.

---

# Source UI

A user should be able to click from a result/assumption to:

- publisher;
- document title;
- year/date;
- canonical external source.

Do not send users to a generic home page when a specific official source page exists.

---

# Data Updates

When a source changes:

1. add/update versioned data;
2. update `asOf`;
3. update tests;
4. review regression fixture differences;
5. update methodology notes if behavior changes.

Do not silently alter historical source data without changing provenance/version metadata.

---

# Regression Discipline

Large numerical result changes are bugs until proven otherwise.

When a snapshot/regression value changes, explain why in the commit/PR:

```text
Changed because 2027 federal Direct Loan rate updated
```

or:

```text
Fixed 529 nonqualified withdrawal basis allocation
```

Never regenerate snapshots just to make CI green.

---

# UI Priorities

Order of importance:

1. understandable comparison;
2. source transparency;
3. correctness;
4. responsive behavior;
5. visual polish.

Do not create a dense fintech dashboard.

The intended page should be understandable by a normal parent within seconds.

---

# Primary Visuals

Keep the initial product focused on:

1. lifetime balance line chart;
2. education-funding stacked comparison;
3. age-65 outcome comparison.

Everything else can be tables/cards.

Use Recharts.

Always provide textual equivalents for accessibility.

---

# Headline Metrics

Each strategy should expose at least:

```text
Parent contribution
Third-party contribution
Age-18 balance
Education cost
Aid received
Account spent on education
Withdrawal taxes
Withdrawal penalties
Federal debt
Gap debt
Graduation debt
Total loan interest
Monthly loan payment
Loan payoff age
529 remaining
Traditional/Trump remaining
Roth balance
After-tax age-65 childhood-strategy value
Unfunded education gap
```

---

# Shareable URLs

Scenario state belongs in a versioned query string.

Example concept:

```text
?v=1&age=2&annual=5000&education=public4&strategy=529
```

Use defaults to keep URLs reasonably short.

Do not store private scenario data remotely.

Tests must verify URL round trips.

---

# GitHub Pages

Configure Vite's `base` correctly for repository Pages deployments.

Use GitHub Actions rather than checking built `dist/` files into the normal source branch.

Expected workflows:

## CI

On PR/push:

```text
install
lint
typecheck
unit tests
build
Playwright smoke tests
```

## Deploy

On `main` after CI:

```text
build
upload Pages artifact
deploy Pages
```

---

# Performance

The simulation is tiny.

Do not prematurely optimize it.

A monthly simulation to age 65 should execute essentially instantly.

Memoization is acceptable where useful but should not make model logic harder to inspect.

---

# Accessibility

Every interactive control needs:

- label;
- keyboard operation;
- focus state.

Color cannot be the only comparison signal.

Tables/text equivalents must exist for charts.

Test at narrow mobile widths.

---

# Privacy

Do not add analytics, trackers, cookies, telemetry, or remote storage without an explicit repository-owner request.

This app should work fully offline after its static assets are loaded.

---

# Disclaimer

Keep an educational-use disclaimer visible in the application.

Do not market results as:

- personalized investment advice;
- tax advice;
- legal advice;
- guaranteed future aid;
- guaranteed investment performance;
- guaranteed lending availability.

---

# Required Build Order

Agents should generally work in this sequence.

## 1. Scaffold

Create the static app, tests, CI, Pages configuration.

## 2. Provenance

Build `sources.ts` and structured data definitions.

## 3. Core types

Scenario, vehicle, ledger, result models.

## 4. Basic money engine

Contributions, growth, timeline.

## 5. Education ledger

Costs, qualification buckets, aid, reconciliation.

## 6. 529

Federal then NY.

## 7. Trump Account

Growth period, basis, withdrawal rules.

## 8. Loans

Federal tranches + gap financing.

## 9. Roth conversions

529 rollover + Trump/traditional conversion.

## 10. Career/retirement

Income benchmarks, saving, debt interaction.

## 11. Regression suite

Do not proceed to polished UI while the financial engine is untested.

## 12. UI

Controls, cards, charts, math ledger.

## 13. Shareability

URL state.

## 14. Final audit

Sources, formulas, mobile, accessibility, Pages.

---

# Definition of Done

Do not call the first release complete merely because the interface looks good.

The release is complete when:

- the closed-system invariant is enforced;
- core laws/rules are sourced;
- assumptions are visibly distinguished;
- 529 qualification categories are modeled;
- Trump Account basis is modeled;
- ordinary education tax vs 10% IRA additional tax are distinct;
- Roth-conversion tax has a funding source;
- federal loans accrue correctly;
- synthetic gap debt is clearly labeled;
- retirement values are after-tax where labeled as such;
- every displayed result is traceable through the ledger;
- regression tests pass;
- source-provenance tests pass;
- GitHub Pages deployment is green;
- shared URLs reproduce identical results.

---

# Final Rule

When faced with a choice between:

> a simple but financially incorrect result

and:

> a slightly more complicated result that reconciles every dollar

choose the second one.

The entire purpose of Small Humans, Big Spreadsheet is to make the hidden tradeoffs visible.
