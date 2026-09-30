# Financial model — version 1, real 2026 dollars

This is a deterministic educational model, not a tax return, forecast, or lending decision. All inputs and results stay in the browser. No analytics or remote scenario storage are used.

## Calendar and rounding

The simulation begins on the first day of the month after `asOf` and ends at the month boundary of the selected retirement birthday. Monthly contributions arrive before monthly growth. Annual contributions arrive in January and in the first simulation month. The first partial calendar year therefore differs between monthly and annual contribution modes; this is deliberate and disclosed.

Monthly effective investment rate = `(1 + annual effective return)^(1/12) - 1`. Decimal.js uses 32 significant digits and half-up rounding. Monetary reports round to cents. Education categories round to cents each month; displayed annual totals can differ slightly from an annual input divided and rounded twelve times. Funding reconciliation allows at most $0.01 per month after display rounding. Internal withdrawals solve for gross proceeds to meet the net expense, including taxes and penalties.

The default comparable parental schedule stops at the earlier of the configured end-age month and January 1 of the calendar year the child turns 18. Trump growth ends December 31 in the year the beneficiary turns 17. Account availability is a calendar boundary, not the eighteenth birthday. No extra parental checks fund tuition or conversion taxes.

## Contributions, vehicles and basis

The registry in `src/model/vehicles/vehicle.ts` owns vehicle withdrawal behavior. Contribution splits describe a strategy; they do not change the vehicle rules. Ordinary Trump contributions create basis; employer and pilot contributions do not. The pilot is opt-in and birth-window checked; citizenship, SSN and election are user eligibility assumptions. Employer amounts are capped by the remaining general annual allowance. Rejected contributions are reported and never invested in another account silently.

Basis allocation is a proportional monthly planning approximation rather than the annual Form 8606 filing computation (which aggregates distributions/conversions and year-end balances). Actual tax-return basis and effective tax can differ; manual rates and this explicit warning avoid claiming filing accuracy. Basis allocation is proportional to total account value, with taxable earnings floored at zero during investment losses. Losses may make remaining basis exceed market value; this is deliberately supported and tested. Full liquidation removes remaining basis. Dated lots support 529 rollover lookback eligibility; withdrawal reduces each lot proportionally, and rollover consumes only eligible lots. No other IRA balances are modeled; use an effective tax rate reflecting outside balances for complex pro-rata cases.

## Education funding

Each month: cost = grants/scholarships + spendable account proceeds + explicit child funding + originated federal debt + illustrative gap debt + unfunded gap. Every month is validated by `expectFundingToReconcile`. Aid and child funding are allocated proportionally across categories. Minimize-debt policy spends 529 then available Trump assets before borrowing. Federal-first policy uses federal loans first, then available assets. Roth is reserved for retirement in v1.

Tuition, required books and equipment, eligible computers, and limited room/board at eligible institutions are modeled as qualified. Room/board additionally requires half-time enrollment and the editable qualification limit. Transportation, personal expenses and other expenses are nonqualified. Custom technical programs require the user to confirm eligibility; no future aid policy is forecast.

A qualified 529 withdrawal avoids federal earnings tax/additional tax. A nonqualified withdrawal taxes and penalizes earnings, never original basis. An explicit annual user-confirmed gross distribution allowance supports statutory additional-tax exceptions (such as qualified scholarship, disability, military-academy or credit coordination cases). That allowance waives only the applicable federal earnings additional tax, not ordinary earnings tax or NY recapture; eligibility is not automatically inferred from generic grant totals. IRA education qualification waives the 10% additional tax on taxable earnings but does not waive ordinary income tax. The higher gross withdrawal pays its own taxes. Federal and NY qualification are separate context fields. In the initial UI, eligible postsecondary expenses match; unsupported K–12 and non-institution credential cases are excluded.

NY parent tax benefits are reported separately, never reinvested. State recapture follows cumulative IT-225 A-103 worksheet addition: `max(0, cumulative nonqualified withdrawals - (cumulative contributions - cumulative subtraction modifications) - prior addition modifications)`, times the manual NY marginal rate. The one-account-owner scenario includes state recapture as an explicit tax obligation funded by the withdrawal; it does not model multiple owners or outside accounts.

## Taxes and Roth

Manual mode uses separate education, conversion, and retirement effective rates. 2026 estimate mode uses the sourced single-filer brackets and standard deduction, dependent deduction, earned-income/support/student conditions, and a simplified Form 8615 parent-rate calculation. Parent taxable income and filing status are inputs. Other siblings, tax credits, other IRAs, capital-gain tax schedules and state IRA income tax are excluded. The model warns about these limits and supports manual effective rates instead of claiming precise tax-return accuracy.

Conversion is either full on growth-period exit, full after school, fixed annually, annual gross-income-threshold fill, or custom annual amounts by age. Education is funded before conversion in the same month. Threshold fill is a planning target for total gross earned and modeled taxable unearned income, not a full tax optimizer. Account-funded tax is withheld and reduces the Roth amount; withholding earnings incur the modeled early-distribution additional tax. Child earnings-funded tax is limited by available monthly gross cash after child education and debt obligations. No parental conversion-tax payer exists.

529 Roth transfers require account age **over** 15 years, contributions/earnings older than five years, beneficiary compensation, annual IRA capacity net of other contributions, and $35,000 cumulative maximum. Statutory conditions such as same beneficiary and trustee-to-trustee transfer are explicit assumptions. 2026 annual capacity is held constant ($7,500 under age 50, $8,600 when age 50 by tax-year end). The user may reduce unused capacity but cannot bypass the applicable statutory cap by increasing the input. Roth conversions and rollovers are categorized separately; v1 does not permit early Roth spending. Retirement ages are limited to 60–70. Roth distributions are tax-free only after the five-tax-year account holding period; otherwise Roth earnings incur the retirement effective ordinary rate.

## Loans and retirement

Loans are dated monthly tranches within an academic year, not a lump sum created at graduation. Annual federal limits are $5,500/$6,500/$7,500, capped at $31,000 aggregate. The subsidized portion is user-selected within annual and $23,000 aggregate caps and requires eligibility. Unsubsidized loans accrue simple interest during school/grace. Subsidized loans do not accrue borrower interest in those periods. Federal repayment begins six months after education ends. Gap loans begin repayment at education end. Interest capitalizes once at repayment start as an explicit approximation; the model is not a federal servicer billing engine and excludes origination fees.

Amortizing payment = `P * i / (1 - (1+i)^(-n))`, with `i = annual rate / 12`; the zero-rate case is `P / n`. Payments never exceed principal plus accrued interest. Scheduled 529 payment reimbursements consume a $10,000 lifetime allowance and reduce the earnings-funded payment; they do not repay the same debt twice.

The UI separates childhood-funded assets, career-funded gross-income-based savings, and the counterfactual future value of earnings-funded loan payments. Career saving can be crowded out by payments and never becomes negative. Loan payments exceeding modeled income generate warnings; this is an obligation scenario, not a cash-flow solvency guarantee. Whole-lifetime net assets = after-tax childhood assets + career savings − outstanding debt. The debt opportunity cost is not deducted again.

After-tax childhood value is a hypothetical liquidation at retirement, not an executed transaction: 529 nonqualified earnings taxes/additional tax/NY recapture + ordinary tax on traditional taxable value + qualified tax-free Roth. The final ledger valuation explains this headline. Career savings are a separate illustrative after-tax-equivalent investment bucket, not a detailed employer-plan tax simulator. All future dollar caps and reference interest rates are held constant in real-dollar space, explicitly a planning convention rather than predicted indexed law.

## Regression contract

Named fixtures in `tests/regression/fixtures.json` lock model version 1's monthly convention and 2026 dataset. The no-growth no-college invariant independently verifies contributions. Source, loan-formula, basis, tax and closed-system tests validate the mechanisms. A fixture change must state a source update, formula fix, or changed model assumption; never regenerate fixtures simply to pass CI.
