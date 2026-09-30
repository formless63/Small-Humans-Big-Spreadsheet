import { currency } from '../lib/format'
import type { PlanCalculation } from '../model/engine/calculation'
import type { SimulationResult } from '../model/types'
import type { Scenario } from '../scenarios/schema'
export function PlanningResults({
  scenario: s,
  selected,
  results,
  sensitivity,
  family,
}: {
  scenario: Scenario
  selected: SimulationResult
  results: SimulationResult[]
  sensitivity: PlanCalculation['sensitivity']
  family: PlanCalculation['family']
}) {
  return (
    <div className="planning-results">
      {sensitivity.length > 0 && (
        <section className="planning-panel">
          <p className="eyebrow">Assumptions matter</p>
          <h3>How sensitive is your selected plan?</h3>
          <p>
            Each row changes one assumption from your current plan. These are deterministic
            scenarios, not probabilities or forecasts.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Selected-strategy sensitivity comparison</caption>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>After-tax education / future assets</th>
                  <th>Difference</th>
                  <th>Graduation debt</th>
                  <th>Unfunded education</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Current assumptions</th>
                  <td>{currency(selected.retirement.afterTaxChildhood)}</td>
                  <td>—</td>
                  <td>{currency(selected.debt.graduationBalance)}</td>
                  <td>{currency(selected.education.unfunded)}</td>
                </tr>
                {sensitivity.map(({ name, result }) => (
                  <tr key={name}>
                    <th>{name}</th>
                    <td>{currency(result.retirement.afterTaxChildhood)}</td>
                    <td>
                      {currency(
                        Number(result.retirement.afterTaxChildhood) -
                          Number(selected.retirement.afterTaxChildhood),
                      )}
                    </td>
                    <td>{currency(result.debt.graduationBalance)}</td>
                    <td>{currency(result.education.unfunded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Parent retirement and retained family 529 money remain separate; view their values in
            the full comparison. Tax sensitivity switches ordinary tax to the explicit
            effective-rate mode.
          </p>
        </section>
      )}
      {s.aidMode === 'assetImpact' && (
        <details className="planning-panel">
          <summary>Financial aid: what ownership changes</summary>
          <p>
            Current dependent-student federal asset component only. It is not a complete student aid
            index or grant prediction. School rates and grant response are user assumptions; future
            rules can change.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Annual asset assessments and modeled aid response</caption>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Assessment date</th>
                  <th>Federal asset component</th>
                  <th>Custom school asset component</th>
                  <th>Assumed annual grant reduction</th>
                </tr>
              </thead>
              <tbody>
                {results.flatMap((r) =>
                  r.aidAssessment.map((a) => (
                    <tr key={`${r.id}-${a.date}`}>
                      <th>{r.name}</th>
                      <td>{a.date}</td>
                      <td>{currency(a.federalAssetContribution)}</td>
                      <td>{currency(a.institutionAssetContribution)}</td>
                      <td>{currency(a.modeledAidReduction)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {family.length > 0 && (
        <section className="planning-panel">
          <p className="eyebrow">One family budget</p>
          <h3>What if you divide it among your children?</h3>
          <p>
            The total annual budget of {currency(s.annualContribution)} is divided equally. Parent
            state-incentive and IRA capacities are shared. Each row uses that child’s own timeline;
            their retirement values occur on different dates and are not added together.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Equal-budget family projections</caption>
              <thead>
                <tr>
                  <th>Child</th>
                  <th>Birth date</th>
                  <th>Annual allocation</th>
                  <th>Parent contributions</th>
                  <th>Graduation debt</th>
                  <th>After-tax education / future assets</th>
                  <th>Retained parent retirement</th>
                  <th>Retained family education savings</th>
                </tr>
              </thead>
              <tbody>
                {family.map(({ name, birthDate, result }) => (
                  <tr key={name}>
                    <th>{name}</th>
                    <td>{birthDate}</td>
                    <td>{currency(s.annualContribution / family.length)}</td>
                    <td>{currency(result.contributions.parent)}</td>
                    <td>{currency(result.debt.graduationBalance)}</td>
                    <td>{currency(result.retirement.afterTaxChildhood)}</td>
                    <td>{currency(result.retirement.parentRetirement)}</td>
                    <td>{currency(result.retirement.family529)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            These are separate budget allocations, not a pooled household tax return or automatic
            sibling transfer schedule. School aid needs review of shared family assets. Confirmed
            beneficiary changes retain unused 529 funds as a restricted family asset.
          </p>
        </section>
      )}
      {selected.iraWorksheets.length > 0 && (
        <details className="planning-panel">
          <summary>Annual IRA basis review</summary>
          <p>
            Form 8606 uses annual distributions, conversions and year-end values. Compare that
            aggregate framework with the engine’s proportional monthly planning allocation. Headline
            taxes still use the monthly allocation; this worksheet flags the difference for review
            rather than claiming a filed tax return.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Selected-strategy annual traditional IRA basis worksheet</caption>
              <thead>
                <tr>
                  <th>Tax year</th>
                  <th>Available basis</th>
                  <th>Distributions + conversions</th>
                  <th>Year-end IRA value</th>
                  <th>Annual framework taxable amount</th>
                  <th>Monthly planning taxable amount</th>
                </tr>
              </thead>
              <tbody>
                {selected.iraWorksheets.map((row) => (
                  <tr key={row.year}>
                    <th>{row.year}</th>
                    <td>{currency(row.basisAvailable)}</td>
                    <td>{currency(row.distributionAndConversion)}</td>
                    <td>{currency(row.yearEndValue)}</td>
                    <td>{currency(row.taxable)}</td>
                    <td>{currency(row.planningTaxable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
