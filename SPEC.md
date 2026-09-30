# Small Humans, Big Spreadsheet

> An aggressively transparent calculator for the financial consequences of funding small humans.

**Repository slug:** `small-humans-big-spreadsheet`  
**Document:** `SPEC.md`  
**Status:** Initial implementation specification  
**Data baseline:** September 30, 2026  
**Primary jurisdiction for initial state-specific modeling:** United States / New York  
**License:** MIT unless changed by repository owner

---

# 1. Product Summary

Small Humans, Big Spreadsheet is a static, client-side financial modeling application for comparing strategies used to fund a child's education, early adulthood, and retirement.

The product must answer questions such as:

- What happens if a family contributes $5,000/year to a 529 versus a Trump Account?
- What if the child attends no college?
- What if they attend trade school?
- What if they attend a public university, private university, or expensive university with substantial need-based aid?
- What happens when savings are insufficient and the child must borrow?
- How much interest is ultimately paid?
- What happens to unused money?
- What happens if a traditional/Trump Account is gradually converted to a Roth IRA during low-income years?
- How do taxes, penalties, aid, debt service, and lost investment compounding affect the result?
- What does each strategy leave the child with at retirement age?
- What happens if contributions are split between multiple vehicles?
- Which result changes when one assumption changes?

This is **not** a 529-vs-Trump-Account website.

The architecture must support arbitrary combinations of financial vehicles and funding policies.

Examples that may be added later include:

- taxable brokerage
- UTMA/UGMA
- custodial Roth IRA
- ordinary Roth IRA once earned income exists
- Coverdell ESA
- cash/HYSA
- Series I or EE savings bonds
- ABLE accounts
- trusts
- prepaid tuition programs
- employer contributions
- scholarships
- family gifts
- mixtures of any of the above

The fundamental product is the **simulation engine**, not the UI.

---

# 2. Primary Design Principle: No Free Lunch

The calculator must operate as a closed financial system.

## Default invariant

If the parent/family contribution is:

> $5,000/year through age 17

then that is the **only parental funding** supplied to the model unless the user explicitly adds another parental contribution.

At and after age 18, an education bill cannot disappear.

Every dollar of cost must come from one of:

1. grants or scholarships;
2. the child's modeled financial accounts;
3. the child's earnings specifically allocated to education;
4. federal student borrowing;
5. other explicitly modeled borrowing;
6. another explicitly enabled source.

If none of those can cover the cost, the output must contain:

`UNFUNDED EDUCATION GAP`

The application must never silently assume:

- parents write another check;
- some unspecified person pays tuition;
- unlimited federal loans exist;
- private lending is guaranteed;
- the Trump Account stays untouched while education somehow gets paid elsewhere.

This invariant is a core correctness requirement.

---

# 3. Terminology

## Vehicle

A legal or financial account/container.

Examples:

- 529 plan
- Trump Account
- Roth IRA
- taxable brokerage
- student loan

## Strategy

A set of rules governing how money flows among one or more vehicles.

Examples:

- 100% 529
- 100% Trump Account
- 50% 529 / 50% Trump Account
- 529 until projected public-college funding target is reached, then Trump Account
- take federal student loans before touching retirement assets
- spend account assets before borrowing
- gradually Roth-convert after graduation

Do not couple UI code to specific vehicles.

## Scenario

A complete set of assumptions:

- child
- contribution schedule
- strategy
- education path
- investment returns
- aid
- borrowing
- tax assumptions
- income path
- retirement assumptions

---

# 4. Technology Stack

Use a deliberately simple static stack.

## Required

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts 3.x
- Zod
- Decimal.js or equivalent decimal-arithmetic library
- Vitest
- Playwright
- GitHub Actions
- GitHub Pages

Use current stable mutually compatible versions at implementation time.

Prefer Node.js 24 LTS or the current active LTS if that changes before implementation.

Use **Bun** for dependency installation, scripts, and the lockfile. Commit `bun.lock` and use `bun install --frozen-lockfile` in CI.

## Formatting / linting

Prefer one consolidated modern formatter/linter such as Biome.

If compatibility issues make that undesirable, ESLint + Prettier is acceptable.

## Explicitly not required

Do not introduce:

- Next.js
- Nuxt
- TanStack Start
- a database
- PostgreSQL
- authentication
- SSR
- an API server
- serverless functions
- Redux
- Zustand
- remote persistence
- analytics/tracking

unless a later requirement actually needs them.

The whole product should build to static files.

Vite officially supports deployment to GitHub Pages through GitHub Actions. [SRC-TECH-VITE]

---

# 5. Repository Layout

Recommended starting structure:

```text
/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── pages.yml
├── docs/
│   ├── methodology.md
│   └── sources.md
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── defaults.ts
│   │
│   ├── model/
│   │   ├── engine/
│   │   │   ├── simulate.ts
│   │   │   ├── timeline.ts
│   │   │   ├── money.ts
│   │   │   └── formulas.ts
│   │   ├── vehicles/
│   │   │   ├── vehicle.ts
│   │   │   ├── plan529.ts
│   │   │   ├── trumpAccount.ts
│   │   │   ├── rothIra.ts
│   │   │   ├── federalStudentLoan.ts
│   │   │   └── gapLoan.ts
│   │   ├── policies/
│   │   │   ├── contributionPolicy.ts
│   │   │   ├── educationFundingPolicy.ts
│   │   │   ├── rothConversionPolicy.ts
│   │   │   └── debtRepaymentPolicy.ts
│   │   ├── education/
│   │   │   ├── expenses.ts
│   │   │   ├── eligibility.ts
│   │   │   └── aid.ts
│   │   ├── taxes/
│   │   │   ├── ordinaryIncome.ts
│   │   │   ├── kiddieTax.ts
│   │   │   ├── plan529Tax.ts
│   │   │   └── iraTax.ts
│   │   ├── career/
│   │   │   ├── income.ts
│   │   │   └── retirementSaving.ts
│   │   └── types.ts
│   │
│   ├── data/
│   │   ├── sources.ts
│   │   ├── federal/
│   │   │   ├── tax2026.ts
│   │   │   ├── ira2026.ts
│   │   │   └── studentLoans2026.ts
│   │   ├── states/
│   │   │   └── ny2026.ts
│   │   ├── education/
│   │   │   ├── collegeBoard2025.ts
│   │   │   └── eliteAid2026.ts
│   │   └── earnings/
│   │       └── bls2025.ts
│   │
│   ├── scenarios/
│   │   ├── presets.ts
│   │   └── schema.ts
│   │
│   ├── components/
│   │   ├── inputs/
│   │   ├── results/
│   │   ├── charts/
│   │   └── methodology/
│   │
│   └── lib/
│       ├── queryState.ts
│       └── format.ts
│
├── tests/
│   ├── model/
│   ├── regression/
│   └── e2e/
├── AGENTS.md
├── SPEC.md
├── README.md
└── package.json
```

---

# 6. Calculation Granularity

Use a **monthly simulation timeline**.

A lifetime simulation of roughly 800 months is computationally trivial and avoids unnecessary approximation around:

- contribution timing;
- tuition timing;
- loan interest;
- repayment schedules;
- Roth conversions.

Tax rules should be settled at the appropriate calendar-year boundaries.

Annual reporting can be generated from the monthly ledger.

## Investment return conversion

If the user supplies an annual effective return `r`, calculate the equivalent monthly rate rather than simply dividing by 12.

Keep internal calculations at high precision.

Round currency only at defined transaction/reporting boundaries.

---

# 7. Dollars and Inflation

The calculator must support:

### Real-dollar mode

Default.

All displayed dollars are expressed in base-year purchasing power.

This is the easiest mode for comparing a two-year-old's education and retirement without displaying meaningless future nominal dollar amounts.

### Nominal-dollar mode

Optional.

Uses:

- investment return;
- inflation assumption;
- education inflation;
- income growth;

to produce nominal future values.

Every chart and output must visibly say whether it is displaying:

- real dollars; or
- nominal dollars.

Never mix them on the same axis without explicit conversion.

---

# 8. Contributions

Core input:

```ts
type ContributionSchedule = {
  amount: Decimal
  frequency: "monthly" | "annual"
  startsAt: Date
  endsAtAge: number
}
```

Default comparison:

- $5,000/year gross contribution
- through the end of the Trump Account contribution-eligible growth period / comparable 529 timeline
- no additional parental contribution after that point

## Contribution comparison mode

Support two concepts separately.

### Equal gross contribution

Example:

> Put exactly $5,000 into either account.

This is the default for the original comparison.

### Equal parent net cash outlay

Future option.

Example:

> Parent is willing to spend exactly $5,000 after considering state tax deductions.

A NY 529 tax deduction could then allow a somewhat larger gross 529 contribution without increasing parent net outlay.

Do not mix these two concepts.

---

# 9. Vehicle Interface

Every vehicle should satisfy a common conceptual interface.

Example:

```ts
interface FinancialVehicle {
  id: string
  contribute(...)
  accrue(...)
  availableForExpense(...)
  withdraw(...)
  convert(...)
  yearEnd(...)
  value(...)
  basis(...)
}
```

Vehicle implementations own their legal/tax behavior.

The simulation engine should not contain statements like:

```ts
if (vehicle === "529")
```

throughout the core engine.

Use a registry/module approach.

---

# 10. 529 Module

Initial implementation should support federal treatment plus a New York state layer.

Track at minimum:

```ts
type Plan529State = {
  balance: Decimal
  basis: Decimal
  earnings: Decimal
  openedAt: Date
  beneficiaryId: string
  rothRolledLifetime: Decimal
}
```

## Federal rules currently relevant

Model these from authoritative sources rather than duplicating prose assumptions.

### Qualified withdrawals

Earnings generally avoid federal income tax when distributions are used for qualifying expenses. [SRC-IRS-529-TOPIC313]

### Expense categories

Do **not** treat the entire published college cost-of-attendance budget as automatically 529-qualified.

Track expense buckets separately.

Examples currently qualifying under federal rules include:

- tuition and required fees;
- required books, supplies, and equipment;
- certain special-needs expenses;
- eligible computer/software/internet expenses;
- room and board for at-least-half-time students, subject to limits;
- qualifying registered-apprenticeship expenses;
- qualifying postsecondary credential expenses under current law;
- limited student-loan repayments.

Transportation and ordinary personal/living expenses must not automatically be treated as qualified 529 expenses. [SRC-IRS-PUB970]

### Student loans

Current federal law allows qualifying 529 distributions for up to $10,000 lifetime of qualifying student-loan principal/interest for an individual, subject to the statutory rules. [SRC-IRS-529-TOPIC313]

### 529 → Roth IRA

Current rules include:

- direct trustee-to-trustee transfer;
- Roth IRA for the beneficiary;
- $35,000 lifetime cap;
- annual Roth contribution-limit constraint;
- 529 must have been open more than 15 years;
- recent contributions/earnings within the five-year lookback are excluded.

Implement the compensation/annual IRA-limit interaction according to current authoritative IRS guidance, with regression tests. [SRC-IRS-529-TOPIC313] [SRC-IRS-PUB590A]

### Nonqualified withdrawals

Model:

- return of basis;
- taxable earnings portion;
- federal additional tax on taxable earnings when applicable;
- statutory exceptions;
- relevant state recapture.

The calculator must not tax/penalize original contributions as though they were earnings.

---

# 11. New York 529 Module

New York-specific values must be separate from federal 529 logic.

Current sourced rules include:

- up to $5,000 NY subtraction for eligible individual filers;
- up to $10,000 for married taxpayers filing jointly;
- New York has its own treatment of nonqualified distributions;
- New York recognizes qualifying 529-to-Roth rollovers under its currently published rules;
- New York recognizes qualifying student-loan use under its currently published rules;
- some uses treated as federally qualified can differ under NY rules, so federal qualification must never automatically imply NY qualification.

[SRC-NY-IT201] [SRC-NY-IT225]

The UI should show:

> NY tax benefit is not automatically reinvested unless the scenario explicitly says to reinvest it.

For equal-gross-contribution comparisons, state tax savings are reported separately as a parent-side benefit.

---

# 12. Trump Account Module

The module must use the actual legal/tax structure rather than treating a Trump Account as a Roth IRA.

Track:

```ts
type TrumpAccountState = {
  balance: Decimal
  basis: Decimal
  taxableComponent: Decimal
  openedAt: Date
  beneficiaryBirthDate: Date
  growthPeriodEnded: boolean
}
```

## Current-law facts to encode

### Eligibility / timing

An eligible Trump Account can be established for a qualifying child under age 18 with an SSN.

Contributions cannot be made before **July 4, 2026**. [SRC-IRS-4547]

### Growth period

The special growth period ends December 31 of the calendar year in which the beneficiary turns 17.

Beginning January 1 of the year in which the beneficiary turns 18, traditional IRA rules generally apply, subject to continuing Trump Account-specific provisions. [SRC-IRS-TA-2026-37]

Do not implement this as merely:

`birthday + 18 years`

because the statute/guidance operates on calendar-year boundaries.

### Contributions

Current general growth-period contribution limit:

**$5,000/year**

subject to inflation adjustments after 2027.

Relevant exempt contributions must be tracked separately. [SRC-IRS-4547]

Unlike an ordinary IRA during this growth period, contributions can be made without the child having compensation. [SRC-IRS-4547]

### Basis

Ordinary contributions from parents/child/other persons create basis.

Pilot contributions, qualified general contributions, and qualifying employer contributions have different basis treatment and must be represented separately according to source guidance. [SRC-IRS-4547]

### Federal pilot contribution

Current pilot contribution:

**$1,000 once**

for otherwise eligible U.S. citizen children born:

- January 1, 2025 through
- December 31, 2028

subject to election and program rules. [SRC-IRS-TA-2026-38]

This must never be automatically added merely because a Trump Account exists.

Eligibility must be calculated from birth date.

### Employer contribution

Current law/guidance provides for qualifying employer contributions of up to **$2,500/year**, indexed after 2027, counting toward the general $5,000 limit and potentially excluded from employee income when statutory requirements are met. [SRC-IRS-TA-2026-37]

This should be optional and default to zero.

### Investments during growth period

Current rules restrict the account to eligible low-fee broad-index investments meeting statutory/regulatory requirements, including an expense ceiling generally no greater than 0.1% during the growth period. [SRC-IRS-TA-2026-38]

The calculator need not simulate individual funds.

It should simply prevent users from interpreting arbitrary speculative returns as a legal investment choice.

### Distributions during growth period

Generally prohibited except for specified statutory exceptions. [SRC-IRS-TA-2025-52]

The engine must therefore reject ordinary tuition withdrawals before the growth period ends.

---

# 13. Trump Account Education Withdrawals After Growth Period

Once traditional IRA rules generally apply, qualified higher-education expenses can qualify for the IRA exception to the normal 10% additional early-distribution tax.

However:

> Waiver of the 10% additional tax does not mean the taxable portion of the distribution becomes income-tax-free.

Model separately:

1. gross withdrawal;
2. return of basis;
3. taxable portion;
4. ordinary income tax;
5. additional early-distribution tax, if any.

Qualified higher-education withdrawals should receive the applicable exception to the 10% additional tax while still paying ordinary income tax on taxable amounts. [SRC-IRS-TOPIC557] [SRC-IRS-PUB970]

Do not simply calculate:

`tuition = account withdrawal`

If taxes are due and tuition requires $20,000 of spendable cash, the engine must solve for the gross withdrawal needed to fund:

- tuition; and
- tax generated by the withdrawal,

unless the tax is paid from another explicit child-owned source.

---

# 14. Trump Account → Roth IRA Conversion

This is a major modeled strategy.

After the growth period, because traditional IRA rules generally apply, the model should support conversion to a Roth IRA under applicable IRA rules. [SRC-IRS-TA-2026-37] [SRC-IRS-PUB590A]

## Conversion strategies

Support:

- no conversion;
- immediate full conversion;
- fixed annual conversion;
- convert up to selected taxable-income threshold/bracket;
- custom year-by-year schedule;
- "low-income years" strategy.

## Conversion accounting

For every conversion calculate:

- amount converted;
- basis represented in conversion;
- taxable conversion income;
- conversion tax;
- amount reaching Roth;
- source used to pay tax.

Untaxed traditional IRA amounts converted to Roth are generally included in gross income. [SRC-IRS-PUB590A] [SRC-IRS-8606]

## Closed-system rule applies here too

Do not magically pay conversion tax.

Possible tax sources:

- child's current earnings/cash;
- a separate modeled cash account;
- withholding/distribution from the account.

If tax is withheld from retirement assets rather than paid externally by the child, model the resulting reduction in converted assets and any applicable early-distribution consequences.

Parental money after the modeled parental contribution period is not available unless explicitly enabled.

## Kiddie tax

Do not assume "18-year-old with no wages = zero-tax conversion."

Current kiddie-tax rules may apply to children:

- under 18;
- age 18 in certain support circumstances;
- full-time students age 19 through 23 in certain circumstances.

Current Form 8615 guidance generally treats income other than compensation for actual work as unearned income and applies special tax rules above the indexed threshold. [SRC-IRS-8615]

The conversion optimizer must therefore distinguish:

- dependent/student years potentially subject to kiddie tax;
- later low-income years outside those rules.

A sophisticated tax-return simulator is outside v1 scope, but conversion tax may not simply be hard-coded to 0%.

Provide:

### Simple mode

User-defined effective conversion tax rates by age range.

### Current-law estimate mode

Use sourced current federal tax parameters plus dependency/student assumptions.

Clearly label current-law results as estimates, not forecasts of future tax law.

---

# 15. Roth IRA Module

Track Roth basis by category because withdrawal rules can differ:

- direct contributions;
- conversions by conversion year;
- earnings;
- qualifying 529 rollovers.

Do not treat all Roth dollars identically.

The primary v1 purpose is retirement compounding after:

- Trump Account conversions; and/or
- 529-to-Roth rollovers.

Ordinary earned-income Roth contributions from the child's wages can be added later or enabled as a separate retirement-savings input.

---

# 16. Education Expense Model

Represent education as expense categories rather than a single number.

```ts
type EducationYear = {
  tuitionAndFees: Decimal
  booksSuppliesEquipment: Decimal
  roomBoard: Decimal
  computerInternet: Decimal
  transportation: Decimal
  personalExpenses: Decimal
  other: Decimal
}
```

Each category must include qualification metadata:

```ts
type ExpenseQualification = {
  plan529Federal: boolean
  plan529State?: boolean
  iraHigherEdPenaltyException: boolean
}
```

This is necessary because "cost of attendance" and "529-qualified expense" are not synonyms.

---

# 17. Education Presets

Presets exist for convenience, not prophecy.

All presets must show:

- source year;
- source;
- whether values are published/sticker or derived net estimates;
- which pieces are assumptions.

## No postsecondary education

Education expense: $0.

## Trade / technical

Provide at least:

- custom trade program;
- public two-year benchmark;
- eligible apprenticeship/credential scenario where legally applicable.

Do not assume every trade program qualifies for every 529 rule.

## Public four-year, in-state

Current College Board 2025–26 national benchmark:

- tuition and fees: **$11,950/year**
- total published student budget: **$30,990/year**
- estimated average net tuition/fees for first-time full-time in-state students after grant aid: **$2,300/year**

[SRC-COLLEGEBOARD-2025]

Derived illustrative average net total cost, assuming non-tuition components remain unchanged:

`$30,990 - $11,950 + $2,300 = $21,340/year`

This **$21,340** is a derived value, not a separately published College Board statistic.

Mark it `DERIVED`.

## Public two-year

Current College Board 2025–26 national benchmark:

- tuition and fees: **$4,150/year**
- total published budget: **$21,320/year**
- average grant aid generally covers tuition/fees for first-time full-time in-district students.

[SRC-COLLEGEBOARD-2025]

Do not repeat the earlier rough $15,980 figure from exploratory analysis; that number was not supported by the current College Board arithmetic.

## Private nonprofit four-year

Current College Board benchmark:

- published tuition/fees: **$45,000/year**
- total published budget: **$65,470/year**
- estimated average net tuition/fees after grant aid: **$16,910/year**

[SRC-COLLEGEBOARD-2025]

Derived illustrative net total:

`$65,470 - $45,000 + $16,910 = $37,380/year`

Again mark `DERIVED`.

## Elite / high-aid institution

Do not create a generic "Ivy costs X" factual claim.

Instead provide separate reference presets.

### Harvard 2026–27 reference

Current published cost of attendance:

- tuition: $62,226
- fees: $6,216
- housing: $14,250
- food: $8,942
- personal expenses: $2,500
- books: $1,000
- transportation: $0–$5,000
- total excluding separately required health insurance: approximately **$95,134–$100,134**

Current Harvard aid policy states, for families with typical assets:

- income below $100,000: expected parent contribution zero;
- income up to $200,000: financial aid covers at least full tuition;
- aid may remain available above $200,000 depending on circumstances.

[SRC-HARVARD-AID-2026]

Do not extrapolate those policies 15 years into the future as fact.

### Yale current-aid illustration

Yale currently publishes examples for families with typical assets:

| Family annual income | Typical annual Yale family cost |
|---:|---:|
| $100,000 | $0 |
| $150,000 | $10,000 |
| $200,000 | $20,000 |
| $250,000 | $43,000 |
| $300,000 | $53,000 |
| $350,000 | $63,000 |

[SRC-YALE-AID-2026]

Use these only as explicit **current-policy illustrative scenarios**.

---

# 18. Scholarships and Aid

Aid is legitimate external funding and does not violate the no-extra-parent-money rule.

Track:

```ts
type Aid = {
  grants: Decimal
  scholarships: Decimal
  workStudy?: Decimal
  institutionalAid: Decimal
}
```

Do not treat loans as aid.

Do not dynamically estimate future FAFSA or CSS Profile results in v1.

Account treatment in need analysis can materially differ and future rules can change.

If aid-impact modeling is later added, it requires its own sourced module.

---

# 19. Student Loans

Loans must exist as actual amortizing liabilities.

Do not simply subtract principal from age-65 wealth.

Track every loan tranche.

```ts
type LoanTranche = {
  principal: Decimal
  annualRate: Decimal
  originatedAt: Date
  interestSubsidizedWhileInSchool: boolean
  repaymentStartsAt: Date
  repaymentTermMonths: number
}
```

## Current federal dependent-undergraduate limits

Current annual combined Subsidized + Unsubsidized Direct Loan limits:

| Year | Combined maximum |
|---|---:|
| First | $5,500 |
| Second | $6,500 |
| Third and beyond | $7,500 |

Current aggregate dependent-undergraduate limit:

**$31,000**

with a subsidized aggregate sublimit of $23,000.

[SRC-FSA-LOAN-LIMITS]

A four-year student using only the annual maximums would ordinarily reach:

`$5,500 + $6,500 + $7,500 + $7,500 = $27,000`

not $31,000.

The $31,000 figure is the aggregate cap, not a promise that a four-year student can borrow $31,000 on that schedule.

## Current rate baseline

For Direct Subsidized and Direct Unsubsidized undergraduate loans first disbursed July 1, 2026 through June 30, 2027:

**6.52% fixed**

[SRC-FSA-RATES-2026]

This is a current-rate reference, not a future-rate forecast.

## Subsidized vs unsubsidized interest

Model separately.

Current federal guidance provides that:

- qualifying Direct Subsidized Loans generally do not accrue borrower-paid interest while the borrower is enrolled at least half time and during the applicable grace period;
- Direct Unsubsidized Loans accrue interest during school and other periods.

[SRC-FSA-SUBSIDIZED]

## Gap financing

When account assets + aid + federal borrowing cannot cover education, the model may create an explicitly synthetic:

`Gap Financing Loan`

This exists to mathematically close scenarios.

Its UI must state:

> Illustrative financing assumption. Availability is not guaranteed.

Default illustrative values may include:

- rate: 9%
- term: 10 years

but both must be tagged `MODEL_ASSUMPTION`, not sourced fact.

Users must be able to change or disable this borrowing.

If disabled and funding is insufficient, display an unfunded gap.

---

# 20. Education Funding Policies

At least three policies should eventually be supported.

## Minimize debt

Aid → available account assets → federal loans → gap financing.

## Preserve retirement assets

Aid → federal borrowing → education-appropriate account assets → gap financing / retirement assets according to rules.

## Custom

User controls order.

For v1, default to **Minimize debt** because it produces straightforward comparisons and never preserves an account using imaginary financing.

The strategy name must always be displayed in the result.

---

# 21. Career Income Benchmarks

Income figures provide context and retirement modeling.

They must not be described as causal outcomes of attending a particular school.

Current BLS 2025 median weekly earnings for full-time wage/salary workers age 25+:

| Educational attainment | Weekly median | Annualized ×52 |
|---|---:|---:|
| High school diploma | $966 | $50,232 |
| Associate's degree | $1,135 | $59,020 |
| Bachelor's degree | $1,578 | $82,056 |
| Master's degree | $1,876 | $97,552 |

[SRC-BLS-EDUCATION-2025]

BLS explicitly notes that educational-attainment categories do not capture factors such as apprenticeship and on-the-job training.

Provide occupation presets separately.

Current May 2025 examples:

- Electrician median annual wage: **$63,190**
- HVAC mechanic/installer median annual wage: **$61,010**

[SRC-BLS-ELECTRICIAN-2025] [SRC-BLS-HVAC-2025]

Do not label one path financially "better" based merely on these medians.

---

# 22. Career / Retirement Model

The calculator should be able to show both:

### Childhood-strategy-only outcome

"What remains from the original childhood funding strategy at age 65?"

and:

### Whole-lifetime illustrative outcome

Childhood strategy + career saving + education debt interaction.

These must never be conflated.

## Career income

Support:

- sourced benchmark;
- custom income;
- optional real wage growth;
- career start age.

## Retirement saving rate

User-adjustable.

Example default:

`10% of gross income`

This is a planning assumption, not a sourced recommendation.

## Debt crowd-out

Provide an option:

> Reduce retirement saving by required student-loan payments, up to the planned retirement contribution.

This captures the opportunity cost of debt without inventing negative wealth.

Also show a separate:

`Age-65 opportunity cost of loan payments`

metric calculated as the future value of those payments had they instead been invested.

Clearly label it a counterfactual metric.

---

# 23. Outputs

Every simulation returns structured results.

```ts
type SimulationResult = {
  timeline: TimelinePoint[]
  education: EducationResult
  debt: DebtResult
  taxes: TaxResult
  conversions: ConversionResult
  retirement: RetirementResult
  parentalBenefits: ParentSideResult
  fundingGap: Decimal
  warnings: ModelWarning[]
}
```

---

# 24. Primary UI

The initial view should be approachable.

## Inputs shown immediately

### Child

- current age or birth date

### Contributions

- annual amount
- contribution end age

### Education

Preset buttons:

- None
- Trade / technical
- Public two-year
- Public four-year
- Private nonprofit
- Elite / high-aid
- Custom

### Strategy

- 529
- Trump Account
- split strategy
- custom

### Investment return

Default:

**5% real annual return**

This is a model assumption.

### Retirement age

Default:

**65**

Model assumption.

Everything else belongs under **Advanced assumptions**.

---

# 25. Headline Comparison

Use side-by-side strategy columns.

Example metrics:

### During childhood

- parent contributions
- third-party contributions
- tax benefits
- balance at age 18

### Education

- gross education cost
- grants/scholarships
- account withdrawals
- withdrawal income tax
- withdrawal penalties
- federal loan principal
- gap-loan principal
- unfunded gap

### Debt

- balance at graduation
- monthly payment
- total interest
- payoff age

### Retirement

- Trump/traditional balance
- Roth balance
- remaining 529
- after-tax retirement value
- lifetime taxes associated with strategy
- retirement opportunity cost of education debt

---

# 26. Visualizations

Keep the app visually strong but not dashboard-heavy.

## Chart 1 — Lifetime balances

Line chart by age.

Possible series:

- strategy account balance
- Roth balance
- education debt

Important events should be visible:

- age 18
- start/end education
- Roth conversions
- loan payoff
- retirement

## Chart 2 — Education funding sources

100% stacked bars for each strategy:

- grant/scholarship
- savings/account
- federal debt
- gap debt
- unfunded amount

This chart exists specifically to demonstrate that education funding never appears from nowhere.

## Chart 3 — Age-65 outcome

Simple side-by-side bar chart:

- after-tax retirement assets

Optional adjacent metrics:

- total loan interest
- taxes paid
- lifetime account penalties

Do not combine incompatible units on a single axis.

---

# 27. Calculation Ledger

Provide a collapsible:

**Show the math**

ledger.

Example:

| Date/Age | Event | Vehicle | Inflow | Outflow | Tax | Ending balance |
|---|---|---|---:|---:|---:|---:|
| Age 2 | Contribution | 529 | $416.67 | — | — | … |
| Age 18 | Tuition | 529 | — | $12,000 | $0 | … |
| Age 18 | Nonqualified living cost | Loan | $3,000 | — | — | … |
| Age 22 | Loan enters repayment | Federal loan | — | — | — | … |
| Age 24 | Roth conversion | Trump | — | $8,000 | $X | … |

A user must be able to inspect how a headline number was produced.

---

# 28. Assumption Transparency

Every number must have one of four provenance types:

```ts
type Provenance =
  | "SOURCE"
  | "DERIVED"
  | "MODEL_ASSUMPTION"
  | "USER_INPUT"
```

UI presentation:

- **Source** — factual parameter from cited authority
- **Derived** — formula based on cited parameters
- **Assumption** — planning assumption
- **You chose** — user input

Never display a model assumption as though it were legislation or measured data.

---

# 29. Source Registry

Create:

`src/data/sources.ts`

Example schema:

```ts
type SourceRecord = {
  id: string
  publisher: string
  title: string
  canonicalUrl: string
  publishedAt?: string
  accessedAt: string
  status:
    | "statute"
    | "final-guidance"
    | "proposed-guidance"
    | "official-data"
    | "institution-policy"
    | "secondary"
  notes?: string
}
```

Every sourced constant must declare one or more `sourceIds`.

Build should fail if a referenced source ID does not exist.

## Initial source registry

The implementing agent must resolve and store the canonical URLs for these exact sources.

### Federal — Trump Accounts

**SRC-IRS-4547**  
Internal Revenue Service  
"Instructions for Form 4547 (12/2025)"  
Supports:
- contribution start no earlier than July 4, 2026;
- $5,000 annual general contribution limit;
- indexing after 2027;
- ordinary family contributions create basis;
- contributions during growth period do not require compensation;
- pilot eligibility basics.

### SRC-IRS-TA-2025-52

Internal Revenue Service  
"Internal Revenue Bulletin: 2025-52" / Notice 2025-68 material  
Supports:
- Trump Account is a traditional IRA with special rules;
- contribution restrictions;
- distribution restrictions during growth period;
- investment requirements.

### SRC-IRS-TA-2026-37

Internal Revenue Service  
"Internal Revenue Bulletin: 2026-37"  
Status: proposed regulation material where applicable  
Supports:
- growth-period definition;
- traditional IRA rules generally apply afterward;
- employer contribution rules;
- current annual limits.

### SRC-IRS-TA-2026-38

Internal Revenue Service  
"Internal Revenue Bulletin: 2026-38"  
Status: proposed regulation material where applicable  
Supports:
- eligible-investment rules;
- $1,000 pilot program;
- 2025–2028 birth window;
- broad-index / fee requirements.

### Federal — IRAs / Roth

**SRC-IRS-PUB590A**  
Internal Revenue Service  
"Publication 590-A, Contributions to Individual Retirement Arrangements (IRAs)"  
Supports:
- traditional IRA → Roth conversion mechanics;
- taxable conversion amount;
- IRA contribution limits;
- 529 → Roth requirements.

### SRC-IRS-8606

Internal Revenue Service  
"Instructions for Form 8606"  
Supports:
- nondeductible traditional IRA basis;
- distributions involving basis;
- Roth conversions.

### SRC-IRS-TOPIC557

Internal Revenue Service  
"Topic No. 557, Additional Tax on Early Distributions From Traditional and Roth IRAs"  
Supports:
- normal additional 10% early-distribution tax;
- qualified higher-education exception.

### SRC-IRS-8615

Internal Revenue Service  
"Instructions for Form 8615, Tax for Certain Children Who Have Unearned Income"  
Supports:
- kiddie-tax framework;
- current threshold;
- age/student/support tests;
- definition of unearned income.

### Federal — 529

**SRC-IRS-529-TOPIC313**  
Internal Revenue Service  
"Topic No. 313, Qualified Tuition Programs (QTPs)"  
Supports:
- tax-free qualified distributions;
- $10,000 lifetime student-loan use;
- 529 → Roth rules;
- $35,000 lifetime Roth rollover limit;
- 15-year rule;
- five-year lookback.

### SRC-IRS-PUB970

Internal Revenue Service  
"Publication 970, Tax Benefits for Education"  
Supports:
- qualified 529 expense definitions;
- qualified room-and-board limitations;
- apprenticeship/credential provisions;
- nonqualified distribution tax;
- additional tax;
- IRA higher-education exception.

### New York

**SRC-NY-IT201**  
New York State Department of Taxation and Finance  
"Instructions for Form IT-201"  
Supports:
- NY 529 contribution subtraction;
- $5,000 / $10,000 limits;
- state treatment of distributions.

### SRC-NY-IT225

New York State Department of Taxation and Finance  
"Instructions for Form IT-225"  
Supports:
- NY treatment/recapture of nonqualified 529 withdrawals;
- recognized qualified uses.

### Student aid

**SRC-FSA-LOAN-LIMITS**  
Federal Student Aid  
"Financial Aid Dictionary: Top Terms Related to Grants, Work-Study, and Student Loans"  
Supports:
- annual dependent undergraduate Direct Loan limits;
- aggregate limits.

### SRC-FSA-RATES-2026

U.S. Department of Education / Federal Student Aid Knowledge Center  
"Interest Rates for Federal Direct Loans First Disbursed Between July 1, 2026 and June 30, 2027"  
Supports:
- 6.52% undergraduate Direct Subsidized/Unsubsidized rate;
- contemporary federal-loan rate benchmark.

### SRC-FSA-SUBSIDIZED

Federal Student Aid  
"Direct Subsidized Loans vs. Direct Unsubsidized Loans"  
Supports:
- subsidy during qualifying in-school/grace periods;
- unsubsidized interest accrual.

### Education costs

**SRC-COLLEGEBOARD-2025**  
College Board  
"Trends in College Pricing and Student Aid 2025"  
Supports:
- 2025–26 public two-year costs;
- public four-year in-state costs;
- private nonprofit costs;
- average net tuition estimates.

### Institutional aid examples

**SRC-HARVARD-AID-2026**  
Harvard College  
"How Aid Works" / current affordability materials  
Supports:
- 2026–27 cost of attendance;
- current income-based aid-policy examples.

### SRC-YALE-AID-2026

Yale Undergraduate Admissions  
"Estimate Your Cost"  
Supports:
- current illustrative family contribution by income.

### Earnings

**SRC-BLS-EDUCATION-2025**  
U.S. Bureau of Labor Statistics  
"Education Pays — Table 5.1, 2025"  
Supports:
- median weekly earnings by educational attainment.

### SRC-BLS-ELECTRICIAN-2025

U.S. Bureau of Labor Statistics  
Occupational Outlook Handbook — Electricians  
Supports:
- $63,190 May 2025 median wage.

### SRC-BLS-HVAC-2025

U.S. Bureau of Labor Statistics  
Occupational Outlook Handbook — Heating, Air Conditioning, and Refrigeration Mechanics and Installers  
Supports:
- $61,010 May 2025 median wage.

### Technical

**SRC-TECH-VITE**  
Vite documentation  
"Deploying a Static Site"  
Supports:
- GitHub Pages static deployment configuration.

---

# 30. Model Assumptions Registry

Keep assumptions in structured data too.

Example:

```ts
const defaultModelAssumptions = {
  realInvestmentReturn: 0.05,
  retirementAge: 65,
  careerRetirementSavingsRate: 0.10,
  gapLoanRate: 0.09,
  gapLoanTermYears: 10,
}
```

Every value above must be marked:

`MODEL_ASSUMPTION`

They are not factual claims.

---

# 31. Shareable Scenarios

Application state must be serializable into the URL.

Use:

`URLSearchParams`

No database.

Include a schema version:

`v=1`

Only encode non-default overrides where practical.

Example conceptual state:

```text
?v=1
&age=2
&annual=5000
&education=public4
&strategy=529
&realReturn=.05
```

Advanced values may be encoded in a compact versioned structure later.

Provide:

**Copy scenario link**

A scenario opened from a URL must reproduce the same result deterministically.

---

# 32. Presets

Ship useful presets:

- No college
- Trade / technical
- Public two-year
- Public four-year
- Private nonprofit
- Harvard current sticker
- Yale current $200k-family illustration
- Custom

Strategy presets:

- 100% 529
- 100% Trump Account
- 75 / 25
- 50 / 50
- 25 / 75
- Custom

Conversion presets:

- None
- Full at 18
- Full after school
- Gradual after school
- Custom annual schedule

Do not call a strategy "best."

---

# 33. Source UX

Every sourced assumption should have a source icon/popover.

Example:

> Federal undergraduate rate: **6.52%**  
> 2026–27 current-law reference  
> Source: U.S. Department of Education  
> Updated: 2026

Provide a global:

**Methodology & Sources**

drawer/section containing:

- model definitions;
- source list;
- source dates;
- assumption list;
- calculation limitations.

No hidden methodology.

---

# 34. Testing Requirements

The financial engine requires substantially more testing than the visual layer.

## Unit tests

Test:

### Compounding

- zero return
- positive return
- contribution timing
- monthly/annual equivalence tolerance

### 529

- basis/earnings accounting
- qualified withdrawal
- partially nonqualified withdrawal
- additional tax only on appropriate taxable earnings
- $10k student-loan limit
- $35k Roth rollover lifetime cap
- annual rollover cap
- 15-year rule
- five-year lookback

### Trump Account

- no ordinary distribution during growth period
- contribution start date
- annual contribution cap
- basis creation by source type
- correct growth-period end
- post-growth traditional-IRA behavior

### IRA

- basis allocation
- education exception to additional tax
- ordinary income tax remains
- partial Roth conversion
- full Roth conversion

### Loans

- no-interest case
- amortization
- subsidized in-school behavior
- unsubsidized in-school accrual
- grace period
- monthly payment
- total interest

### Closed-system invariant

For every education year:

```text
cost
=
aid
+ cash/account withdrawals actually available
+ debt actually originated
+ explicitly enabled child funding
+ unfunded gap
```

Tolerance should be ≤ $0.01 after reporting-round rules.

No unexplained funding source is permitted.

---

# 35. Regression Fixtures

Create named deterministic fixtures.

Examples:

```text
age-2-5000-no-college-529
age-2-5000-no-college-trump
age-2-5000-public4-529
age-2-5000-public4-trump
age-2-5000-private-529
age-2-5000-private-trump
age-4-5000-public4-529
trump-gradual-roth-conversion
trump-kiddie-tax-conversion
529-full-roth-rollover
```

Expected values live in fixtures and intentionally change only when:

- law/data changes;
- formula bug is fixed;
- documented model assumptions change.

Changes to regression outputs must be reviewed.

---

# 36. Property / Invariant Tests

At minimum:

- balances never spontaneously increase except from contributions/returns/transfers;
- a transfer cannot create wealth;
- loan payment cannot exceed balance + accrued interest;
- principal cannot become negative;
- account basis cannot exceed account value except transiently under explicitly tested tax rules;
- funding sources exactly reconcile to expense;
- taxes have an identified payer/source;
- no parent contribution occurs after its allowed schedule;
- no Roth conversion creates value;
- changing visualization code cannot alter model results.

---

# 37. UI Testing

Playwright smoke tests:

1. application loads;
2. selecting a preset changes results;
3. 529 vs Trump switch works;
4. custom contribution works;
5. advanced assumptions open;
6. shared URL reproduces scenario;
7. "Show the math" ledger works;
8. methodology/source links display;
9. mobile viewport is usable;
10. GitHub Pages base path works.

---

# 38. Accessibility

Required:

- semantic form labels;
- full keyboard accessibility;
- visible focus states;
- no meaning conveyed only through color;
- charts have textual/table equivalents;
- sufficient contrast;
- 44px-ish touch targets where practical;
- readable mobile layout;
- respects `prefers-reduced-motion`.

---

# 39. Responsive / Sharing Design

The application should look good when:

- viewed on desktop;
- viewed on phone;
- screenshotted;
- printed;
- sent as a URL.

Avoid a sprawling admin-dashboard aesthetic.

Prefer:

- strong typography;
- restrained cards;
- one obvious comparison;
- limited number of charts;
- dense details only when expanded.

---

# 40. Financial-Aid Treatment

Do not currently pretend to predict how a Trump Account will be treated by future FAFSA/CSS methodologies when these children apply.

Likewise, do not assume an institution's 2026 aid policy will exist in 2040.

Institutional aid presets must display:

> Current-policy illustration, not future guaranteed aid.

Future aid modeling should be its own module with explicit source-year rules.

---

# 41. Disclaimers

Visible but not obnoxious:

> Small Humans, Big Spreadsheet is an educational modeling tool, not tax, legal, investment, lending, or financial advice. Tax law, education costs, aid formulas, investment returns, loan availability, and future policy can change substantially. Verify current rules before making financial decisions.

Do not hide this only in the footer.

---

# 42. Privacy

No information needs to leave the browser.

Do not send:

- ages;
- incomes;
- balances;
- parent information;
- scenarios

to a server.

No analytics by default.

Sharing occurs only by deliberately creating a scenario URL.

Warn the user that a shared URL may encode financial assumptions.

---

# 43. Initial Implementation Phases

## Phase 1 — Foundation

- scaffold Vite/React/TS
- Tailwind
- shadcn
- source registry
- scenario schema
- Decimal math helpers
- static GitHub Pages CI

## Phase 2 — Core simulation

- contributions
- investment growth
- 529
- Trump Account
- education ledger
- federal loans
- synthetic gap financing
- closed-system reconciliation

No polished UI until core regression tests pass.

## Phase 3 — Roth / tax behavior

- IRA basis
- education withdrawal taxation
- 529 Roth rollover
- Trump → Roth conversion
- simple tax model
- kiddie-tax handling

## Phase 4 — Career / retirement

- BLS income benchmarks
- retirement savings
- debt repayment
- debt crowd-out
- age-65 output

## Phase 5 — UI

- presets
- comparison cards
- charts
- math ledger
- sources/methodology

## Phase 6 — Shareability

- URL state
- responsive design
- print/screenshot view
- Pages deployment

---

# 44. V1 Acceptance Criteria

V1 is complete when a user can:

1. enter a child's age/birth date;
2. choose an annual contribution;
3. compare at least a 529 and Trump Account;
4. select no-college, trade/two-year, public-four-year, private, elite-aid, or custom education;
5. see every education dollar funded or explicitly unfunded;
6. see federal and gap debt separately;
7. see loan interest and payments;
8. see taxes/penalties caused by account withdrawals;
9. model 529 → Roth rollover;
10. model Trump Account → Roth conversion;
11. compare conversion timing;
12. see age-65 after-tax values;
13. inspect the calculation ledger;
14. identify every sourced fact versus assumption;
15. open the cited source for each factual parameter;
16. share the scenario through a URL;
17. reproduce the same result after page reload;
18. run entirely as a static GitHub Pages site.

---

# 45. Core Philosophy

The app should never answer:

> "Which account wins?"

without showing why.

Its job is to expose the mechanics:

```text
money contributed
→ investment growth
→ taxes
→ education
→ aid
→ withdrawals
→ debt
→ interest
→ Roth conversions
→ retirement
```

If two strategies differ by $100,000 at age 65, a user should be able to trace essentially every dollar of that difference.

That transparency is the product.

# 46. Authorized expanded comparison and guided single-page workflow

The owner has authorized the expanded strategies and methods described in `docs/methodology.md`: parent brokerage, custodial investing, cash/CD illustrations, direct child Roth, parent Roth retirement-first, equal-net-cost contribution comparisons, changing allocations, education glide paths and adverse-return scenarios, withdrawal sequencing and conservative education-credit coordination, extra debt repayment, unused family 529 retention, separate multi-child budget projections, state-policy inputs, aid asset-component sensitivity, annual IRA basis review, and deterministic sensitivity comparisons.

The default entry is a short, plain-language guided question flow on the same page. Goals narrow relevant choices. Detailed controls remain available at any time and edit the same scenario. Resources are optional clickable primary-source links. No financial input goes to a backend. New calculations must preserve account ownership and explicit funding, including separate parent retirement, restricted family savings, and child wage-funded assets. New modules and assumptions carry their source year and limitations; partial aid or tax calculations must not be labeled full FAFSA, institutional-award or tax-return predictions.

# 47. Authorized transfer planning and full account makeup

The owner has authorized a same-page “Move money later” guided step and matching detailed controls, early/school-year custom Trump-to-Roth conversion schedules, editable annual starting/ending ages, a source-account education reserve, optional comparisons of transfer policies for the same deposit mix, and visible eligibility/blocked-attempt explanations for 529 rollovers. Use existing sourced financial rules and disclose partial tax/early-Roth modeling assumptions.

Show selected-plan account balances separately, with a stacked makeup chart, debt alongside assets, annual money-flow chart, selectable account series, transfer markers, calendar-year selection, exact account opening/inflow/outflow/closing tables and transfer tax/net/payer details. Parent ownership, retirement restrictions and wage-funded saving must remain distinguishable. Derive annual flows from the actual ledger and exact snapshots; internal transfers cancel and cannot inflate deposits. Every account/year must reconcile. Preserve single-page edits, shareable scenarios, offline operation, keyboard access and narrow-screen usability.
