# Sources — checked September 30, 2026

Canonical URLs, publisher, source year and status live in `src/data/sources.ts`. Legal/data parameters reference source IDs in versioned modules. Provenance tests fail on missing references or missing derivation formulas.

## Verification notes

- IRS Form 4547: July 4, 2026 earliest contribution; $5,000 general growth-period annual cap; ordinary family contributions create basis; employer and pilot contributions do not. Pilot election and birth window are explicit eligibility requirements.
- IRS IRB 2025-52 / Notice 2025-68: special traditional IRA structure, investment and growth-period distribution restrictions.
- IRS IRB 2026-37 and 2026-38: employer/investment proposed regulation material remains labeled **proposed guidance**, not final regulation. The calendar boundary ends December 31 in the year the child turns 17.
- IRS Publication 590-A: 2026 under-50 IRA limit is **$7,500**; 529 Roth transfer requires lifetime, annual, account-age and contribution-age conditions. Publication 590-B supports IRA distribution and qualified Roth holding-period treatment. The model does not permit early Roth spending.
- IRS Form 8606, Topic 557 and Publication 970: basis allocation, ordinary income tax, early additional tax and education exception; 529 additional tax applies to earnings. The app explicitly identifies its proportional monthly basis approximation instead of claiming annual tax-return accuracy.
- IRS Form 8615 is the current published 2025 instruction framework; Revenue Procedure 2025-32 (IRB 2025-45) supplies the **2026** brackets/deductions and $1,350 inflation parameter. The modeled $2,700 kiddie threshold is twice that amount, not an invented 2026 publication date.
- NY 2025 IT-201 and IT-225 PDFs are the currently published annual instructions. IT-225 A-103 is a cumulative account-owner worksheet, not a flat penalty on every withdrawn basis dollar. It recognizes qualifying Roth rollovers and student-loan payments on/after September 5, 2024; eligibility differs for other uses.
- Federal Student Aid **GENERAL-26-33, June 4, 2026** confirms the 2026–27 undergraduate Direct Loan fixed reference rate of **6.52%**. The 2025–26 FSA Handbook Volume 8 verifies the $5,500/$6,500/$7,500 annual and $31,000 combined aggregate dependent-undergraduate limits, the $3,500/$4,500/$5,500 annual subsidized sublimits and $23,000 subsidized aggregate. The current 2026–27 reference is used for rates; the latest available handbook rules are versioned separately.
- Some studentaid.gov pages are JavaScript shells. Their canonical links are retained for users; the readable official FSA Handbook supplements the factual verification. A successful shell fetch is not evidence that its hidden article text was inspected.
- College Board **Trends in College Pricing and Student Aid 2025** full report PDF: public two-year $4,150 tuition/$21,320 budget; public four-year $11,950/$30,990 and $2,300 average net tuition; private nonprofit $45,000/$65,470 and $16,910 average net tuition. Derived net totals are **$21,340** and **$37,380**, with formulas/upstream values retained. Non-tuition category allocations are visibly marked planning assumptions.
- Harvard How Aid Works: 2026–27 billed and unbilled expenses, and current income/typical-assets aid examples. Yale Estimate Your Cost: the current $200,000-family/$20,000-cost illustration. Yale is already net of aid; no second aid subtraction is made. Neither preset forecasts future policy.
- BLS Table 5.1 (2025), Electricians and HVAC Occupational Outlook Handbook pages: earnings are descriptive medians. Attainment weekly medians are annualized ×52; they are not causal school returns. BLS notes the 2025 attainment estimates exclude October and are 11-month averages.
- Vite Deploying a Static Site: repository GitHub Pages base and Actions deployment.

## Access status

Direct primary-source requests used normal TLS verification. The official College Board PDF initially returned 403, then succeeded with the canonical report URL and standard browser user-agent/referer. IRS, NY PDFs, BLS, institutions, the FSA handbook and the exact rate announcement were read. No package, checksum, or TLS verification was disabled.

The source registry distinguishes reference pages that require JavaScript from verified full documents. Every data module uses a source date/as-of date; a future update must change the data version and explain regression differences.

Expanded rules were checked against IRS Publication 550 (investment income, reinvested dividends, basis and interest), Topic 409 (capital gains and holding periods), Publications 590-A/590-B (compensation, IRA caps and direct Roth distributions), Publication 970 (credit qualification, phaseouts and expense coordination), Form 8606 instructions (annual basis aggregation), and the Federal Student Aid 2026–27 Handbook chapters on FAFSA assets and the Student Aid Index. The official Handbook confirms the dependent parent 12% conversion / up-to-47% marginal assessment and student 20% asset contribution. Those are an asset-component sensitivity, not a complete aid formula. Optional institutional assessment, future Trump classification, other-state rules, investment returns and effective taxes remain user assumptions. Source document hashes are appended in `source-verification.json`.
