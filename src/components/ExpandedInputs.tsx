import { vehicleNames } from '../model/policies/strategies'
import type { ContributionVehicle } from '../model/types'
import type { Scenario } from '../scenarios/schema'
import { SourceLink } from './Inputs'

export const strategyChoices = Object.entries(vehicleNames) as [ContributionVehicle, string][]
export function ExpandedInputs({
  scenario: s,
  update,
}: {
  scenario: Scenario
  update: (v: Partial<Scenario>) => void
}) {
  const num = (key: keyof Scenario, label: string, percent = false, min = 0, max = 10000000) => (
    <label className="field" key={key}>
      <span>
        {label}
        <small>You chose</small>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={percent ? 0.5 : 1}
        value={Number(s[key]) * (percent ? 100 : 1)}
        onChange={(e) => update({ [key]: Number(e.target.value) / (percent ? 100 : 1) })}
      />
    </label>
  )
  const check = (key: keyof Scenario, label: string) => (
    <label className="check" key={key}>
      <input
        type="checkbox"
        checked={Boolean(s[key])}
        onChange={(e) => update({ [key]: e.target.checked })}
      />
      <span>{label}</span>
    </label>
  )
  const select = (key: keyof Scenario, label: string, choices: [string, string][]) => (
    <label className="field">
      <span>{label}</span>
      <select value={String(s[key])} onChange={(e) => update({ [key]: e.target.value })}>
        {choices.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
  const section = (title: string, body: React.ReactNode) => (
    <details className="expanded-section">
      <summary>{title}</summary>
      <div className="expanded-body">{body}</div>
    </details>
  )
  return (
    <div className="expanded-inputs">
      <div className="form-grid">
        {select('strategyVehicle', 'Selected savings strategy', [
          ['split', '529 / Trump split'],
          ...strategyChoices,
          ['custom', 'Custom account mix'],
        ])}
        {select('comparisonMode', 'How should parental cost be compared?', [
          ['gross', 'Same amount deposited'],
          ['net', 'Same cost after state 529 incentives'],
        ])}
      </div>
      <fieldset>
        <legend>
          Also compare <span>Keep only the alternatives you want to see</span>
        </legend>
        <div className="comparison-choices">
          {strategyChoices.map(([vehicle, name]) => (
            <label className="check" key={vehicle}>
              <input
                type="checkbox"
                checked={s.compareVehicles.includes(vehicle)}
                onChange={(e) =>
                  update({
                    compareVehicles: e.target.checked
                      ? [...s.compareVehicles, vehicle]
                      : s.compareVehicles.filter((v) => v !== vehicle),
                  })
                }
              />
              <span>{name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {s.strategyVehicle === 'custom' &&
        section(
          'Allocate new contributions',
          <>
            <p>
              Percentages must total 100%. This changes new deposits; it does not transfer existing
              balances.
            </p>
            <div className="form-grid">
              {strategyChoices.map(([vehicle, name]) => (
                <label className="field" key={vehicle}>
                  <span>{name} (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={(s.allocation.find((a) => a.vehicle === vehicle)?.share ?? 0) * 100}
                    onChange={(e) =>
                      update({
                        allocation: [
                          ...s.allocation.filter((a) => a.vehicle !== vehicle),
                          { vehicle, share: Number(e.target.value) / 100 },
                        ],
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </>,
        )}
      {section(
        'Change allocation over time',
        <>
          <p>
            Redirect new deposits at a chosen child age. Existing accounts stay invested.
            Contributions still stop at the configured childhood boundary.
          </p>
          {s.allocationChanges.map((c, i) => (
            <div className="schedule-row" key={`${i}-${c.vehicle}`}>
              <label>
                Starting age
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={c.age}
                  onChange={(e) =>
                    update({
                      allocationChanges: s.allocationChanges.map((v, j) =>
                        j === i ? { ...v, age: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                New destination
                <select
                  value={c.vehicle}
                  onChange={(e) =>
                    update({
                      allocationChanges: s.allocationChanges.map((v, j) =>
                        j === i ? { ...v, vehicle: e.target.value as ContributionVehicle } : v,
                      ),
                    })
                  }
                >
                  {strategyChoices.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destination share (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={c.share529 * 100}
                  onChange={(e) =>
                    update({
                      allocationChanges: s.allocationChanges.map((v, j) =>
                        j === i ? { ...v, share529: Number(e.target.value) / 100 } : v,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  update({ allocationChanges: s.allocationChanges.filter((_, j) => j !== i) })
                }
              >
                Remove change
              </button>
            </div>
          ))}
          <p className="muted">
            The rest of each new contribution goes to education savings (529).
          </p>
          <button
            type="button"
            disabled={s.allocationChanges.length >= 10}
            onClick={() =>
              update({
                allocationChanges: [
                  ...s.allocationChanges,
                  {
                    age:
                      Array.from({ length: 26 }, (_, i) => (i + 14) % 26).find(
                        (age) => !s.allocationChanges.some((c) => c.age === age),
                      ) ?? 14,
                    vehicle: 'brokerage',
                    share529: 1,
                  },
                ],
              })
            }
          >
            Add allocation change
          </button>
        </>,
      )}
      {section(
        'Investment risk & stress scenarios',
        <>
          <p>
            Returns are assumptions, not promises. The glide path changes the investment-return
            assumption near education; it does not simulate individual funds. Cash uses a separate
            return.
          </p>
          <div className="form-grid">
            {check('glidePath', 'Reduce investment risk near education')}
            {num('glideStartAge', 'Start lower-return phase at age', false, 0, 30)}
            {num('glideReturn', 'Lower-risk real return (%)', true, -95, 50)}
            {check('shockEnabled', 'Apply a one-time investment loss')}
            {num('shockAge', 'Investment loss at child age', false, 0, 50)}
            {num('shockReturn', 'One-time market change (%)', true, -95, 50)}
            {check('sensitivityEnabled', 'Compare alternate returns, tuition, aid and tax rates')}
          </div>
        </>,
      )}
      {section(
        'Taxable investments & cash',
        <>
          <p>
            Parent-owned investments remain under parental control. Custodial investments belong
            irrevocably to the child; the age of control depends on state law. Capital-gains rates
            are effective assumptions, including kiddie-tax effects where applicable. Total
            investment return already includes dividends. <SourceLink id="SRC-IRS-PUB550" />{' '}
            <SourceLink id="SRC-IRS-8615" />
          </p>
          <div className="form-grid">
            {num('dividendYield', 'Qualified dividend yield (%)', true, 0, 20)}
            {num(
              'parentCapitalGainsRate',
              'Parent effective capital-gains / dividend tax (%)',
              true,
              0,
              80,
            )}
            {num('parentOrdinaryRate', 'Parent effective ordinary income tax (%)', true, 0, 80)}
            {num(
              'childCapitalGainsRate',
              'Child effective capital-gains / dividend tax (%)',
              true,
              0,
              80,
            )}
            {num('stateInvestmentTaxRate', 'State investment income tax (%)', true, 0, 80)}
            {num('cashReturn', 'Cash / CD real return (%)', true, 0, 30)}
            {select('cashKind', 'Cash alternative', [
              ['savings', 'Savings / cash'],
              ['cd', 'Certificate of deposit'],
              ['treasury', 'Treasury held to maturity'],
            ])}
            {s.cashKind === 'cd' &&
              num('cashMaturityAge', 'CD maturity at child age', false, 0, 70)}
            {s.cashKind === 'cd' &&
              num('cashEarlyWithdrawalRate', 'Assumed CD early-withdrawal cost (%)', true, 0, 80)}
          </div>
          <p className="muted">
            Sales use proportional dated lots and short/long holding periods. Capital losses get no
            assumed tax refund. Treasury interest excludes the entered state investment tax. CD
            maturity and early-withdrawal costs are user assumptions; market price changes and tax
            deductions for penalties are not simulated.
          </p>
        </>,
      )}
      {section(
        'Roth contributions & parent retirement',
        <>
          <p>
            A Roth IRA is a retirement account funded with after-tax money. Contributions require
            eligible earned income and unused annual IRA capacity. Money supplied by parents does
            not create earned income for the child. <SourceLink id="SRC-IRS-PUB590A" />{' '}
            <SourceLink id="SRC-IRS-PUB590B" />
          </p>
          <div className="form-grid">
            {num('childEmploymentAge', 'Child starts eligible work at age', false, 0, 25)}
            {num('childEmploymentAnnual', 'Annual child employment income before career')}
            {num('childRothAnnualSaving', 'Additional annual Roth saving from child wages')}
            {check(
              'childRothEducation',
              'Allow child Roth contributions / eligible earnings to fund education',
            )}
            {num('parentAge', 'Parent age today', false, 18, 75)}
            {num('parentCompensation', 'Parent annual eligible compensation')}
            {num('parentOtherIraContributions', 'Parent other annual IRA contributions')}
            {check(
              'parentRothEligible',
              'Parent confirms direct Roth contribution income eligibility',
            )}
            {check('parentRothEducation', 'Explicitly allow parent Roth withdrawals for education')}
          </div>
          <p>
            Parent retirement assets are separate from funds earmarked for the child. Preserving
            them can leave education borrowing or an unfunded gap. This illustration uses a Roth
            IRA, not a deductible IRA or workplace plan.
          </p>
        </>,
      )}
      {section(
        'State 529 benefits & equal-cost comparisons',
        <>
          <div className="form-grid">
            {select('state529Mode', 'State incentive rules', [
              ['ny', 'New York sourced rules'],
              ['custom', 'Another state: enter verified rules'],
              ['none', 'No state incentive'],
            ])}
          </div>
          {s.state529Mode === 'custom' && (
            <>
              <label className="field">
                <span>State name</span>
                <input
                  value={s.customStateName}
                  onChange={(e) => update({ customStateName: e.target.value })}
                />
              </label>
              <div className="form-grid">
                {num('customStateDeductionCap', 'State annual deduction cap')}
                {num('customStateDeductionRate', 'State deduction marginal rate (%)', true, 0, 80)}
                {num('customStateCreditRate', 'State contribution credit rate (%)', true, 0, 80)}
                {num('customStateCreditCap', 'State annual contribution credit cap')}
                {check(
                  'customStateRecapture',
                  'Illustrate proportional recapture of earlier state benefits',
                )}
              </div>
              <p>
                These are user-supplied assumptions. Use the state tax authority and confirm
                eligible plans, filing status, carryforwards, and distribution rules. This
                proportional recapture illustration does not implement another state’s tax form.
              </p>
            </>
          )}
          <p>
            Equal-net-cost mode increases deposits only by the modeled contribution incentive,
            subject to its annual cap. It assumes the tax benefit is available within the same year.
            Education credits are shown separately and are not reinvested.
          </p>
        </>,
      )}
      {section(
        'Financial aid: ownership sensitivity',
        <>
          <p>
            How savings are owned can affect aid. This compares the asset portion of current
            dependent-student federal aid rules, with optional school-specific assumptions. It does
            not predict a grant award or calculate a complete student aid index.{' '}
            <SourceLink id="SRC-FSA-ASSETS2026" /> <SourceLink id="SRC-FSA-SAI2026" />
          </p>
          <div className="form-grid">
            {select('aidMode', 'Aid modeling', [
              ['manual', 'Use my entered grants / scholarships'],
              ['assetImpact', 'Show asset assessment and optional award response'],
            ])}
            {check('assetReportingExempt', 'Federal asset reporting exemption confirmed')}
            {num('parentAidMarginalRate', 'Parent federal marginal assessment (%)', true, 0, 47)}
            {select('trumpAidTreatment', 'Assumed Trump Account asset classification', [
              ['retirement', 'Retirement asset excluded'],
              ['parent', 'Parent asset'],
              ['student', 'Student asset'],
            ])}
            {check(
              'institutionAssessment',
              'Use custom school asset assessment for award sensitivity',
            )}
            {num('institutionParentAssetRate', 'School parent asset assessment (%)', true, 0, 80)}
            {num('institutionStudentAssetRate', 'School student asset assessment (%)', true, 0, 80)}
            {num(
              'institutionRetirementAssetRate',
              'School retirement asset assessment (%)',
              true,
              0,
              80,
            )}
            {num(
              'aidAwardResponse',
              'Assumed grant reduction per assessed dollar (%)',
              true,
              0,
              100,
            )}
          </div>
          <p>
            The default award response is zero: an assessed asset contribution does not
            automatically reduce aid dollar for dollar. Future Trump Account treatment and school
            formulas require review. Use each school’s net-price calculator for an actual estimate.
          </p>
        </>,
      )}
      {section(
        'Education tax credits & withdrawal order',
        <>
          <p>
            Reserve eligible tuition for a tax credit rather than using the same expense for a
            tax-free 529 withdrawal. Loans or other explicit sources must pay that reserved expense.
            The credit stays a parent-side benefit. <SourceLink id="SRC-IRS-PUB970" />
          </p>
          <div className="form-grid">
            {select('withdrawalOrder', 'Account withdrawal sequence', [
              ['educationFirst', 'Education savings, then flexible assets, then retirement'],
              ['flexibleFirst', 'Flexible assets, then education savings, then retirement'],
              [
                'retirementFirst',
                'Retirement assets, then education savings, then flexible assets',
              ],
            ])}
            {select('creditMode', 'Education credit illustration', [
              ['none', 'No credit'],
              ['aotc', 'American Opportunity: eligible undergraduate years'],
              ['llc', 'Lifetime Learning: eligible tuition'],
            ])}
            {check('creditEligible', 'Confirm eligibility to claim the selected education credit')}
            {check('creditJoint', 'Education-credit taxpayer files married jointly')}
            {num('creditMagi', 'Education-credit taxpayer modified adjusted gross income')}
            {num('creditTaxLiability', 'Annual tax liability available for nonrefundable credit')}
            {num('creditReserveAnnual', 'Annual eligible tuition reserved for credit')}
            {num(
              'creditPriorYears',
              'American Opportunity credit years already claimed',
              false,
              0,
              4,
            )}
          </div>
          <p>
            Refundable credits and full tax-return interactions are not assumed. Scholarship amounts
            reduce available credit expenses. Education savings cannot also pay the reserved tuition
            tax-free.
          </p>
        </>,
      )}
      {section(
        'Debt repayment & unused family savings',
        <>
          <div className="form-grid">
            {num('extraDebtPayment', 'Extra monthly debt payment from child earnings')}
            {select('extraDebtOrder', 'Extra repayment priority', [
              ['highestRate', 'Highest interest rate first'],
              ['federalFirst', 'Federal loans first'],
              ['gapFirst', 'Illustrative gap loans first'],
            ])}
            {select('leftover529', 'Unused education savings', [
              ['liquidate', 'Illustrate nonqualified liquidation at retirement'],
              ['family', 'Retain for an eligible family beneficiary'],
            ])}
            {check(
              'familyTransferEligible',
              'Confirm an eligible same-generation family beneficiary change',
            )}
          </div>
          <p>
            Extra repayment is limited by modeled child earnings after scheduled payments. Retained
            529 funds remain restricted family education money, shown separately from spendable
            retirement assets.
          </p>
        </>,
      )}
      {section(
        'Multiple children & annual IRA basis review',
        <>
          <p>
            Allocate the same total family budget equally among children. Each child has a separate
            education and retirement timeline; annual parent deduction and IRA capacities are
            shared. Family projections are shown separately rather than summed across different
            retirement dates.
          </p>
          <label className="field">
            <span>Additional children’s birth dates (comma separated)</span>
            <input
              placeholder="2027-01-15, 2029-06-10"
              defaultValue={s.siblingBirthDates.join(', ')}
              key={s.siblingBirthDates.join(', ')}
              onBlur={(e) =>
                update({
                  siblingBirthDates: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <p>
            Use children already born as of the simulation date. Planned future births require a
            later scenario start.
          </p>
          <div className="form-grid">
            {num('outsideIraBasis', 'Outside traditional IRA basis for annual review')}
            {num(
              'outsideIraYearEndValue',
              'Outside traditional IRA year-end value for annual review',
            )}
          </div>
          <p>
            The annual basis worksheet aggregates modeled distributions and conversions with
            year-end balances using the Form 8606 framework. It shows the difference from monthly
            planning allocations; it does not silently change headline taxes or constitute a filed
            return. Outside IRA inputs are held constant for this review.{' '}
            <SourceLink id="SRC-IRS-8606" />
          </p>
        </>,
      )}
    </div>
  )
}
