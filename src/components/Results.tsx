import { currency, sumMoney } from '../lib/format'
import type { SimulationResult } from '../model/types'
export function Results({
  results,
  retirementAge,
}: {
  results: SimulationResult[]
  retirementAge: number
}) {
  const rows: [string, (r: SimulationResult) => string][] = [
    ['Parent contributions', (r) => currency(r.contributions.parent)],
    ['Third-party contributions', (r) => currency(r.contributions.thirdParty)],
    ['NY parent tax benefit (not reinvested)', (r) => currency(r.parentBenefits)],
    ['Balance at age 18', (r) => currency(r.contributions.age18)],
    ['Gross education expense', (r) => currency(r.education.cost)],
    ['Grants / scholarships', (r) => currency(r.education.aid)],
    ['Accounts spent on education (net)', (r) => currency(r.education.accounts)],
    ['Explicit child education funding', (r) => currency(r.education.child)],
    ['Education withdrawal taxes', (r) => currency(r.education.taxes)],
    ['Education withdrawal penalties', (r) => currency(r.education.penalties)],
    ['Federal loan principal', (r) => currency(r.debt.federalPrincipal)],
    ['Illustrative gap-loan principal', (r) => currency(r.debt.gapPrincipal)],
    ['Unfunded education gap', (r) => currency(r.education.unfunded)],
    ['Debt at graduation', (r) => currency(r.debt.graduationBalance)],
    ['Peak monthly earnings-funded payment', (r) => currency(r.debt.monthlyPayment)],
    ['Lifetime loan interest', (r) => currency(r.debt.totalInterest)],
    ['Lifetime loan payments', (r) => currency(r.debt.repaid)],
    [
      'Loan payoff age',
      (r) =>
        r.debt.payoffAge === null
          ? r.debt.tranches.length
            ? 'Not paid off by retirement'
            : 'No borrowing'
          : r.debt.payoffAge.toFixed(1),
    ],
    ['Debt remaining at retirement', (r) => currency(r.debt.remaining)],
    ['Roth conversion tax', (r) => currency(r.conversions.taxes)],
    ['Net amount converted to Roth', (r) => currency(r.conversions.converted)],
    ['529 → Roth rollovers', (r) => currency(r.conversions.rollover)],
    ['Lifetime transaction taxes', (r) => currency(r.taxes.lifetime)],
    ['Lifetime transaction penalties', (r) => currency(r.taxes.penalties)],
    ['Remaining 529 (before liquidation)', (r) => currency(r.retirement.plan529)],
    ['Trump / traditional (before liquidation)', (r) => currency(r.retirement.traditional)],
    ['Roth balance', (r) => currency(r.retirement.roth)],
    [
      'Hypothetical liquidation tax / penalty',
      (r) => currency(sumMoney(r.retirement.liquidationTax, r.retirement.liquidationPenalty)),
    ],
    [
      `After-tax age-${retirementAge} childhood assets`,
      (r) => currency(r.retirement.afterTaxChildhood),
    ],
    ['Career-funded retirement assets (separate)', (r) => currency(r.retirement.career)],
    ['Whole-lifetime illustrative net assets', (r) => currency(r.retirement.wholeLifetime)],
    [
      'Counterfactual future value of earnings-funded loan payments',
      (r) => currency(r.debt.opportunityCost),
    ],
  ]
  return (
    <>
      <div className={`result-grid columns-${results.length}`}>
        {results.map((r, i) => (
          <article className={`result-card strategy-${i}`} key={r.id}>
            <div className="strategy-title">
              <span className="dot" />
              <h3>{r.name}</h3>
            </div>
            <p className="result-caption">After-tax childhood assets at age {retirementAge}</p>
            <p className="big-number">{currency(r.retirement.afterTaxChildhood)}</p>
            <div className="mini-metrics">
              <div>
                <span>At age 18</span>
                <strong>{currency(r.contributions.age18)}</strong>
              </div>
              <div>
                <span>Graduation debt</span>
                <strong>{currency(r.debt.graduationBalance)}</strong>
              </div>
            </div>
            {Number(r.education.unfunded) > 0 ? (
              <p className="gap-warning">{currency(r.education.unfunded)} unfunded education gap</p>
            ) : (
              <p className="reconciled">Every education dollar reconciles</p>
            )}
          </article>
        ))}
      </div>
      <details className="full-comparison">
        <summary>
          Compare every number <span>Contributions, education, debt, tax & retirement</span>
        </summary>
        <div className="table-scroll">
          <table data-testid="comparison-table">
            <caption>Full strategy comparison in real 2026 dollars</caption>
            <thead>
              <tr>
                <th>Metric</th>
                {results.map((r) => (
                  <th key={r.id}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label}>
                  <th>{label}</th>
                  {results.map((r) => (
                    <td key={r.id}>{get(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Whole-lifetime net assets = after-tax childhood assets + career savings − unpaid education
          debt. The future value of payments is a separate counterfactual; it is not subtracted
          again.
        </p>
      </details>
    </>
  )
}
