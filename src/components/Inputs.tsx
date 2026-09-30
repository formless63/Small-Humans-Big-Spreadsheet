import { earnings2025 } from '../data/earnings/bls2025'
import { sourceById } from '../data/sources'
import { currency } from '../lib/format'
import { educationPresets, expenseKeys, presetById, strategyPresets } from '../scenarios/presets'
import type { Scenario } from '../scenarios/schema'
export function SourceLink({ id }: { id: string }) {
  const s = sourceById[id]
  return s ? (
    <a
      className="source-link"
      href={s.canonicalUrl}
      target="_blank"
      rel="noreferrer"
      title={`${s.publisher}: ${s.title}`}
    >
      Source ↗
    </a>
  ) : null
}
export function Inputs({
  scenario: s,
  update,
}: {
  scenario: Scenario
  update: (changes: Partial<Scenario>) => void
}) {
  function numeric(
    key: keyof Scenario,
    label: string,
    options: { percent?: boolean; min?: number; max?: number; step?: number; source?: string } = {},
  ) {
    return (
      <label className="field" key={key}>
        <span>
          {label}
          {options.source ? <SourceLink id={options.source} /> : <small>You chose</small>}
        </span>
        <div className="input-wrap">
          <input
            type="number"
            value={Number(s[key]) * (options.percent ? 100 : 1)}
            min={options.min ?? 0}
            max={options.max}
            step={options.step ?? 1}
            onChange={(e) =>
              update({ [key]: Number(e.target.value) / (options.percent ? 100 : 1) })
            }
          />
          {options.percent && <span>%</span>}
        </div>
      </label>
    )
  }
  function select(key: keyof Scenario, label: string, items: [string, string][]) {
    return (
      <label className="field" key={key}>
        <span>{label}</span>
        <select value={String(s[key])} onChange={(e) => update({ [key]: e.target.value })}>
          {items.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
    )
  }
  function check(key: keyof Scenario, label: string) {
    return (
      <label className="check" key={key}>
        <input
          type="checkbox"
          checked={Boolean(s[key])}
          onChange={(e) => update({ [key]: e.target.checked })}
        />
        <span>{label}</span>
      </label>
    )
  }
  function education(id: Scenario['educationPreset']) {
    const p = presetById[id]
    update({
      educationPreset: id,
      educationYears: p.years,
      expenses: { ...p.expenses },
      annualAid: p.aid,
      roomBoardQualifiedLimit: p.expenses.roomBoard,
      incomePreset:
        id === 'none'
          ? 'highSchool'
          : id === 'twoYear'
            ? 'associate'
            : id === 'trade'
              ? 'electrician'
              : 'bachelor',
      annualIncome:
        earnings2025[
          id === 'none'
            ? 'highSchool'
            : id === 'twoYear'
              ? 'associate'
              : id === 'trade'
                ? 'electrician'
                : 'bachelor'
        ].value,
      careerStartAge: s.educationStartAge + p.years,
      studentThroughAge: s.educationStartAge + p.years,
    })
  }
  const p = presetById[s.educationPreset]
  return (
    <section className="input-panel" aria-labelledby="scenario-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Start with your small human</p>
          <h2 id="scenario-heading">
            Same childhood budget.
            <br />
            Different futures.
          </h2>
        </div>
        <span className="badge">Private by design</span>
      </div>
      <div className="main-fields">
        <label className="field">
          <span>
            Child’s birth date <small>You chose</small>
          </span>
          <input
            type="date"
            value={s.birthDate}
            max={s.asOf}
            onChange={(e) =>
              update({
                birthDate: e.target.value,
                accountOpenedAt:
                  e.target.value > s.accountOpenedAt ? e.target.value : s.accountOpenedAt,
              })
            }
          />
        </label>
        {numeric('annualContribution', 'Annual parent contribution', { max: 1000000, step: 500 })}
        {numeric('contributionEndAge', 'Contribution end age', { max: 18 })}
        {numeric('annualReturn', 'Real investment return', {
          percent: true,
          min: -95,
          max: 50,
          step: 0.5,
        })}
        {numeric('retirementAge', 'Retirement age', { min: 60, max: 70 })}
      </div>
      <fieldset>
        <legend>
          Education path <span>Editable current-cost reference</span>
        </legend>
        <div className="preset-buttons">
          {educationPresets.map((p) => (
            <button
              type="button"
              key={p.id}
              aria-pressed={s.educationPreset === p.id}
              onClick={() => education(p.id as Scenario['educationPreset'])}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="preset-note">
          {p.note}{' '}
          {p.sourceIds.map((id) => (
            <SourceLink key={id} id={id} />
          ))}
        </p>
      </fieldset>
      <div className="strategy-control">
        <fieldset>
          <legend>
            Your contribution split <span>We always compare the two single-account strategies</span>
          </legend>
          <div className="preset-buttons">
            {strategyPresets.map((p) => (
              <button
                type="button"
                key={p.id}
                aria-pressed={s.share529 === p.share529}
                onClick={() => update({ share529: p.share529 })}
              >
                {p.name}
              </button>
            ))}
          </div>
          <label className="split-label" htmlFor="split">
            {Math.round(s.share529 * 100)}% 529{' '}
            <span>{Math.round((1 - s.share529) * 100)}% Trump</span>
          </label>
          <input
            id="split"
            aria-label="529 contribution share"
            type="range"
            min="0"
            max="100"
            step="5"
            value={s.share529 * 100}
            onChange={(e) => update({ share529: Number(e.target.value) / 100 })}
          />
        </fieldset>
      </div>
      <details className="advanced">
        <summary>
          Advanced assumptions <span>Costs, aid, taxes, loans, Roth & career</span>
        </summary>
        <section>
          <h3>Education costs & eligibility</h3>
          <p className="muted">
            Annual gross expenses before aid. Published totals and net examples are current
            references; component allocations remain assumptions unless individually sourced. Keep
            grants separate from loans.
          </p>
          <div className="form-grid">
            {numeric('educationStartAge', 'Education starts at age', { min: 16, max: 30 })}
            {numeric('educationYears', 'Years of education', { max: 8 })}
            {expenseKeys.map((key) => (
              <label className="field" key={key}>
                <span>
                  Annual{' '}
                  {
                    {
                      tuition: 'tuition & fees',
                      books: 'books & supplies',
                      roomBoard: 'room & board',
                      computer: 'computer / internet',
                      transportation: 'transportation',
                      personal: 'personal expenses',
                      other: 'other expenses',
                    }[key]
                  }{' '}
                  <small>You chose</small>
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={s.expenses[key]}
                  onChange={(e) =>
                    update({ expenses: { ...s.expenses, [key]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
            {numeric('annualAid', 'Annual grant / scholarship aid', { step: 100 })}
            {numeric('annualChildEducation', 'Annual explicit child education funding', {
              step: 100,
            })}
            {numeric('roomBoardQualifiedLimit', 'Annual qualified room/board limit', { step: 100 })}
            {numeric('annual529PenaltyException', 'Annual 529 gross eligible for 10% exception', {
              step: 100,
              source: 'SRC-IRS-PUB970',
            })}
          </div>
          {check(
            'eligibleInstitution',
            'Institution / program is eligible for these higher-education rules',
          )}
          {check('halfTime', 'Student enrolled at least half time')}
          <p className="muted">
            Transportation, personal and other expenses are nonqualified. Room/board requires at
            least half-time status and an applicable cost-of-attendance limit.{' '}
            <SourceLink id="SRC-IRS-PUB970" />
          </p>
        </section>
        <section>
          <h3>Borrowing & withdrawal order</h3>
          <div className="form-grid">
            {select('fundingPolicy', 'Education funding policy', [
              ['minimizeDebt', 'Minimize debt: aid → accounts → loans'],
              ['preserveRetirement', 'Federal borrowing first: aid → federal → accounts'],
            ])}
            {numeric('federalRate', 'Federal undergraduate reference rate', {
              percent: true,
              step: 0.01,
              max: 80,
              source: 'SRC-FSA-RATES-2026',
            })}
            {numeric('federalTermYears', 'Federal repayment years', { min: 1, max: 30 })}
            {numeric('subsidizedAnnual', 'Eligible annual subsidized portion', {
              max: 5500,
              step: 500,
              source: 'SRC-FSA-LOAN-LIMITS',
            })}
            {numeric('gapRate', 'Illustrative gap-loan rate', {
              percent: true,
              max: 80,
              step: 0.25,
            })}
            {numeric('gapTermYears', 'Gap-loan repayment years', { min: 1, max: 30 })}
          </div>
          {check('gapEnabled', 'Enable illustrative gap financing')}
          {check(
            'studentLoan529Enabled',
            'Use eligible remaining 529 funds for federal student-loan payments (up to $10,000 lifetime)',
          )}
          <p className="muted">
            Illustrative gap financing; real-world availability and rates may differ. Disable it to
            expose an unfunded gap. No Parent PLUS or additional parental funding. Federal loans
            require enrollment and eligibility; future rates may differ.
          </p>
        </section>
        <section>
          <h3>Contributions & New York</h3>
          <div className="form-grid">
            {select('contributionFrequency', 'Contribution timing', [
              ['monthly', 'Monthly (annual amount / 12)'],
              ['annual', 'Annual (January, plus first month)'],
            ])}
            {numeric('employerAnnual', 'Annual eligible Trump employer contribution', {
              max: 2500,
              step: 250,
              source: 'SRC-IRS-TA-2026-37',
            })}
            {numeric('nyTaxRate', 'NY marginal rate for benefit / recapture', {
              percent: true,
              max: 80,
              step: 0.1,
            })}
          </div>
          {check(
            'pilotEnabled',
            'Elect optional $1,000 Trump pilot (eligible birth dates; citizenship and SSN assumed)',
          )}
          {check('nyEnabled', 'Model NY 529 benefit and state recapture')}
          {check('nyJoint', 'Parent files married jointly (NY limits; parent tax estimate)')}
          <p className="muted">
            NY tax benefit is not automatically reinvested. Employer contributions count toward the
            Trump general cap and do not create basis. <SourceLink id="SRC-IRS-4547" />{' '}
            <SourceLink id="SRC-NY-IT225" />
          </p>
        </section>
        <section>
          <h3>Ordinary tax & kiddie tax</h3>
          <div className="form-grid">
            {select('taxMode', 'Tax modeling', [
              ['manual', 'Manual effective rates'],
              ['estimate2026', '2026 current-law estimate (simplified)'],
            ])}
            {numeric('withdrawalTaxRate', 'Education withdrawal effective tax', {
              percent: true,
              max: 80,
              step: 1,
            })}
            {numeric('conversionTaxRate', 'Roth conversion effective tax', {
              percent: true,
              max: 80,
              step: 1,
            })}
            <label className="field">
              <span>Conversion tax by calendar age: from-through:percent</span>
              <input
                type="text"
                placeholder="18-23:24, 24-30:12"
                defaultValue={s.conversionTaxByAge
                  .map((r) => `${r.fromAge}-${r.throughAge}:${r.rate * 100}`)
                  .join(', ')}
                onBlur={(e) => {
                  const ranges = e.target.value
                    .split(',')
                    .filter((v) => v.trim())
                    .map((v) => {
                      const [ages, pct] = v.split(':')
                      const [fromAge, throughAge] = ages.split('-').map(Number)
                      return { fromAge, throughAge, rate: Number(pct) / 100 }
                    })
                  if (
                    ranges.every(
                      (r) =>
                        Number.isFinite(r.fromAge) &&
                        Number.isFinite(r.throughAge) &&
                        r.fromAge <= r.throughAge &&
                        r.rate >= 0 &&
                        r.rate <= 0.8,
                    )
                  )
                    update({ conversionTaxByAge: ranges })
                }}
              />
            </label>
            {numeric('retirementTaxRate', 'Retirement effective ordinary tax', {
              percent: true,
              max: 80,
              step: 1,
            })}
            {numeric('parentTaxableIncome', 'Parent taxable income (tax estimate)', { step: 1000 })}
            {numeric('otherUnearnedIncome', 'Child other annual unearned income', { step: 100 })}
            {numeric('studentThroughAge', 'Full-time student through age (exclusive)', { max: 30 })}
            {numeric('childSupportAnnual', 'Child total annual support', { step: 500 })}
          </div>
          {check('childEarnedOverHalfSupport', 'Child earned income exceeds half of support')}
          <p className="muted">
            A low-income student is not automatically a zero-tax converter. Estimate mode uses 2026
            federal brackets and simplified Form 8615 treatment; manual rates are appropriate for
            complex cases and state IRA tax. Retirement uses your effective rate in both modes.{' '}
            <SourceLink id="SRC-IRS-8615" />
          </p>
        </section>
        <section>
          <h3>Roth conversions & rollovers</h3>
          <div className="form-grid">
            {select('conversionMode', 'Trump → Roth conversion', [
              ['none', 'None'],
              ['immediate', 'Full when growth period ends'],
              ['afterSchool', 'Full after school'],
              ['fixed', 'Fixed annual amount after school'],
              ['threshold', 'Annual income-threshold fill after school'],
              ['custom', 'Custom annual schedule'],
            ])}
            {select('conversionTaxPayer', 'Conversion tax payer', [
              ['account', 'Withhold from Trump account'],
              ['earnings', 'Child earnings (cash constrained)'],
            ])}
            {numeric('conversionAnnual', 'Fixed annual gross conversion', { step: 500 })}
            {numeric('conversionThreshold', 'Annual income threshold (planning target)', {
              step: 1000,
            })}
            <label className="field">
              <span>
                529 account opening date <small>You chose</small>
              </span>
              <input
                type="date"
                value={s.accountOpenedAt}
                min={s.birthDate}
                max={s.asOf}
                onChange={(e) => update({ accountOpenedAt: e.target.value })}
              />
            </label>
            {numeric('annualRothCapacity', 'Annual unused IRA capacity (capped by law)', {
              step: 500,
              source: 'SRC-IRS-PUB590A',
            })}
            {numeric('annualOtherIraContributions', 'Other annual IRA contributions', {
              step: 500,
            })}
          </div>
          {s.conversionMode === 'custom' && (
            <label className="field">
              <span>Schedule: age:amount, separated by commas</span>
              <input
                type="text"
                placeholder="22:7500, 23:7500, 24:12000"
                defaultValue={s.conversionSchedule.map((e) => `${e.age}:${e.amount}`).join(', ')}
                onBlur={(e) => {
                  const schedule = e.target.value
                    .split(',')
                    .filter((v) => v.trim())
                    .map((v) => {
                      const [age, amount] = v.split(':').map(Number)
                      return { age, amount }
                    })
                  if (schedule.every((e) => Number.isFinite(e.age) && Number.isFinite(e.amount)))
                    update({ conversionSchedule: schedule })
                }}
              />
            </label>
          )}
          {check('rolloverEnabled', 'Enable eligible 529 → Roth rollovers after school')}
          <p className="muted">
            Tax always has a payer. Withholding can incur an early-distribution additional tax and
            reduces assets reaching Roth. 529 rollovers enforce 15-year age, five-year lookback,
            annual compensation/capacity, and $35,000 lifetime limits.{' '}
            <SourceLink id="SRC-IRS-529-TOPIC313" />
          </p>
        </section>
        <section>
          <h3>Career saving (separate from childhood assets)</h3>
          {check('careerEnabled', 'Show career-funded retirement saving')}
          {check('debtCrowdOut', 'Reduce planned career saving by required loan payments')}
          <div className="form-grid">
            <label className="field">
              <span>
                Income benchmark <SourceLink id="SRC-BLS-EDUCATION-2025" />
              </span>
              <select
                value={s.incomePreset}
                onChange={(e) => {
                  const value = e.target.value as Scenario['incomePreset']
                  update({
                    incomePreset: value,
                    ...(value !== 'custom' ? { annualIncome: earnings2025[value].value } : {}),
                  })
                }}
              >
                {Object.entries(earnings2025).map(([id, p]) => (
                  <option key={id} value={id}>
                    {id.replace(/([A-Z])/g, ' $1')} · {currency(p.value)}
                  </option>
                ))}
                <option value="custom">Custom income</option>
              </select>
            </label>
            {numeric('annualIncome', 'Annual gross career income', { step: 1000 })}
            {numeric('careerStartAge', 'Career start age', { min: 18, max: 50 })}
            {numeric('savingsRate', 'Planned career savings rate', {
              percent: true,
              max: 60,
              step: 1,
            })}
            {numeric('wageGrowth', 'Real annual wage growth', {
              percent: true,
              min: -10,
              max: 15,
              step: 0.5,
            })}
          </div>
          <p className="muted">
            Current median benchmark for workers with this educational attainment or occupation, not
            a causal return of attending a school. Gross-income planning approximation; no
            payroll-tax/living-expense budget is simulated.
          </p>
        </section>
      </details>
    </section>
  )
}
