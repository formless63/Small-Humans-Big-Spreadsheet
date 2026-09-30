import type { Scenario } from '../scenarios/schema'
import { SourceLink } from './Inputs'

export function TransferInputs({
  scenario: s,
  update,
  showTaxInputs = true,
}: {
  scenario: Scenario
  update: (v: Partial<Scenario>) => void
  showTaxInputs?: boolean
}) {
  const number = (key: keyof Scenario, label: string, max = 10000000) => (
    <label className="field">
      <span>
        {label} <small>You chose</small>
      </span>
      <input
        type="number"
        min="0"
        max={max}
        value={Number(s[key])}
        onChange={(e) => update({ [key]: Number(e.target.value) })}
      />
    </label>
  )
  return (
    <div className="transfer-inputs">
      <p>
        Deposits choose where new money goes. Transfers move existing savings into Roth retirement
        accounts. You can change either without leaving this page.
      </p>
      <div className="form-grid">
        <label className="field">
          <span>Trump → Roth conversion</span>
          <select
            value={s.conversionMode}
            onChange={(e) =>
              update({ conversionMode: e.target.value as Scenario['conversionMode'] })
            }
          >
            <option value="none">Leave the Trump Account in place</option>
            <option value="immediate">Full when growth period ends</option>
            <option value="afterSchool">Full after school</option>
            <option value="fixed">Fixed annual amount</option>
            <option value="threshold">Fill an annual income target</option>
            <option value="custom">Choose amounts by calendar age</option>
          </select>
        </label>
        <label className="field">
          <span>Conversion tax payer</span>
          <select
            value={s.conversionTaxPayer}
            onChange={(e) =>
              update({ conversionTaxPayer: e.target.value as Scenario['conversionTaxPayer'] })
            }
          >
            <option value="account">Withhold from Trump account</option>
            <option value="earnings">Child earnings (cash constrained)</option>
          </select>
        </label>
        {s.conversionMode === 'fixed' &&
          number('conversionAnnual', 'Fixed annual gross conversion')}
        {s.conversionMode === 'threshold' &&
          number('conversionThreshold', 'Annual income threshold (planning target)')}
        {['fixed', 'threshold'].includes(s.conversionMode) &&
          number(
            'conversionStartAge',
            'Start annual conversions at calendar age (0 = after school)',
            69,
          )}
        {s.conversionMode !== 'none' &&
          number('conversionEndAge', 'Last conversion calendar age', 69)}
        {number(
          'transferEducationReserve',
          'Keep at least this much in each transfer source account',
        )}
      </div>
      <p className="muted">
        The reserve limits transfers, not education spending. It is a balance floor you choose, not
        an estimate of future tuition. Calendar age means the calendar year minus the birth year;
        annual moves occur at January boundaries (or the first modeled month).
      </p>
      {s.conversionMode === 'custom' && (
        <div>
          <p>
            Choose the calendar ages and gross amounts to move. Available funds, the education
            reserve, and tax funding can reduce a requested conversion.
          </p>
          {s.conversionSchedule.map((entry, i) => (
            <div className="schedule-row" key={i}>
              <label>
                Calendar age
                <input
                  type="number"
                  min="18"
                  max="69"
                  value={entry.age}
                  onChange={(e) =>
                    update({
                      conversionSchedule: s.conversionSchedule.map((v, j) =>
                        j === i ? { ...v, age: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Gross amount
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  value={entry.amount}
                  onChange={(e) =>
                    update({
                      conversionSchedule: s.conversionSchedule.map((v, j) =>
                        j === i ? { ...v, amount: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                aria-label={`Remove conversion at calendar age ${entry.age}`}
                onClick={() =>
                  update({ conversionSchedule: s.conversionSchedule.filter((_, j) => j !== i) })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={s.conversionSchedule.length >= 52}
            onClick={() => {
              const ages = new Set(s.conversionSchedule.map((v) => v.age))
              const age = Array.from({ length: 52 }, (_, i) => i + 18).find((v) => !ages.has(v))
              if (age !== undefined)
                update({
                  conversionSchedule: [
                    ...s.conversionSchedule,
                    { age, amount: s.conversionAnnual },
                  ],
                })
            }}
          >
            Add conversion year
          </button>
        </div>
      )}
      {showTaxInputs && (
        <details>
          <summary>Taxes in low-income years</summary>
          <div className="form-grid">
            <label className="field">
              <span>Tax modeling</span>
              <select
                value={s.taxMode}
                onChange={(e) => update({ taxMode: e.target.value as Scenario['taxMode'] })}
              >
                <option value="manual">Manual effective rates</option>
                <option value="estimate2026">2026 current-law estimate (simplified)</option>
              </select>
            </label>
            <label className="field">
              <span>Roth conversion effective tax (%)</span>
              <input
                type="number"
                min="0"
                max="80"
                value={s.conversionTaxRate * 100}
                onChange={(e) => update({ conversionTaxRate: Number(e.target.value) / 100 })}
              />
            </label>
            {number('childEmploymentAnnual', 'Annual child employment income before career')}
            {number('childEmploymentAge', 'Child starts eligible work at age', 25)}
            {number('careerStartAge', 'Career starts at age', 50)}
            {number('annualIncome', 'Annual career income')}
            {number('otherUnearnedIncome', 'Child other annual unearned income')}
            {number('studentThroughAge', 'Full-time student through age (exclusive)', 30)}
            {number('parentTaxableIncome', 'Parent taxable income (tax estimate)')}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={s.childEarnedOverHalfSupport}
              onChange={(e) => update({ childEarnedOverHalfSupport: e.target.checked })}
            />
            <span>Child earned income exceeds half of support</span>
          </label>
          <p className="muted">
            Low or zero wages do not automatically mean zero conversion tax. Dependency, student
            status, support, other income and kiddie-tax rules matter. The income target is a
            planning ceiling before deductions, not an automatic bracket optimizer. Age-specific
            manual rates and further tax assumptions are available in detailed controls.{' '}
            <SourceLink id="SRC-IRS-8615" /> <SourceLink id="SRC-IRS-8606" />
          </p>
        </details>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={s.rolloverEnabled}
          onChange={(e) => update({ rolloverEnabled: e.target.checked })}
        />
        <span>Enable eligible 529 → Roth rollovers</span>
      </label>
      {s.rolloverEnabled && (
        <div className="form-grid">
          {number(
            'rolloverStartAge',
            'Start 529 rollover attempts at calendar age (0 = after school)',
            69,
          )}
          <label className="field">
            <span>529 account opening date</span>
            <input
              type="date"
              min={s.birthDate}
              max={s.asOf}
              value={s.accountOpenedAt}
              onChange={(e) => update({ accountOpenedAt: e.target.value })}
            />
          </label>
          {number('annualRothCapacity', 'Annual unused IRA capacity (capped by law)')}
          {number('annualOtherIraContributions', 'Other annual IRA contributions')}
        </div>
      )}
      <p className="muted">
        529 rollovers require the same beneficiary, a direct trustee-to-trustee transfer, more than
        15 years of account history, a five-year contribution/earnings lookback, compensation and
        unused annual IRA capacity, with a $35,000 lifetime cap. The model preserves Roth funds
        received by transfer for retirement rather than spending them on school; early transfers can
        increase borrowing. These are rollovers, not taxable Trump conversions. Withholding Trump
        conversion tax reduces what reaches Roth and can incur an early-distribution additional tax.{' '}
        <SourceLink id="SRC-IRS-529-TOPIC313" /> <SourceLink id="SRC-IRS-PUB590A" />{' '}
        <SourceLink id="SRC-IRS-TOPIC557" />
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={s.transferComparisonEnabled}
          onChange={(e) => update({ transferComparisonEnabled: e.target.checked })}
        />
        <span>Compare transfer timing with the same starting mix</span>
      </label>
    </div>
  )
}
