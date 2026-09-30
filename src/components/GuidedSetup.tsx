import { useRef, useState } from 'react'
import { earnings2025 } from '../data/earnings/bls2025'
import type { ContributionVehicle } from '../model/types'
import { educationPresets, presetById } from '../scenarios/presets'
import type { Scenario } from '../scenarios/schema'
import { strategyChoices } from './ExpandedInputs'
import { SourceLink } from './Inputs'
import { TransferInputs } from './TransferInputs'

const steps = [
  'Your goal',
  'Your budget',
  'Education',
  'Where to save',
  'How to use it',
  'Move money later',
]
const explanations: Record<ContributionVehicle, string> = {
  '529':
    'Education-focused savings. Eligible education withdrawals receive tax advantages; other uses can create taxes and penalties.',
  trump:
    'A child’s long-term account with special childhood contribution rules, then traditional retirement-account rules. Education withdrawals can still create income tax.',
  brokerage:
    'Invest for education or another goal while the parent keeps control. Dividends and realized gains can be taxable.',
  custodial:
    'Investments that belong to the child. Flexible use for their benefit, with tax and aid effects; the child eventually controls the money.',
  cash: 'Lower-return savings for near-term needs. Enter a realistic return and verify liquidity for CDs or other fixed-term products.',
  childRoth:
    'Retirement savings for a child with eligible earned income. Contribution limits apply even when a parent supplies the contribution money.',
  parentRoth:
    'Protect the parent’s retirement first. Education must still be funded explicitly; saved retirement assets remain the parent’s.',
}
export function GuidedSetup({
  scenario: s,
  update,
  editAll,
}: {
  scenario: Scenario
  update: (v: Partial<Scenario>) => void
  editAll: () => void
}) {
  const [step, setStep] = useState(0),
    [goal, setGoal] = useState('education'),
    [finished, setFinished] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const move = (n: number) => {
    setStep(n)
    setFinished(false)
    requestAnimationFrame(() => heading.current?.focus())
  }
  const amount = (key: keyof Scenario, label: string, min = 0, max = 10000000) => (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={Number(s[key])}
        onChange={(e) => update({ [key]: Number(e.target.value) })}
      />
    </label>
  )
  function education(id: Scenario['educationPreset']) {
    const p = presetById[id],
      income =
        id === 'none'
          ? 'highSchool'
          : id === 'twoYear'
            ? 'associate'
            : id === 'trade'
              ? 'electrician'
              : 'bachelor'
    update({
      educationPreset: id,
      educationYears: p.years,
      expenses: { ...p.expenses },
      annualAid: p.aid,
      roomBoardQualifiedLimit: p.expenses.roomBoard,
      incomePreset: income,
      annualIncome: earnings2025[income].value,
      careerStartAge: s.educationStartAge + p.years,
      studentThroughAge: s.educationStartAge + p.years,
    })
  }
  const visible =
    goal === 'education'
      ? ['529', 'split', 'brokerage', 'cash', 'trump']
      : goal === 'flexibility'
        ? ['brokerage', 'cash', 'custodial', '529']
        : goal === 'retirement'
          ? ['trump', 'childRoth', 'parentRoth', '529']
          : ['split', ...strategyChoices.map(([id]) => id)]
  return (
    <section className="guided-panel" aria-label="Guided setup">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A few questions. Your own comparison.</p>
          <h2>Let’s build your plan.</h2>
        </div>
        <button type="button" onClick={editAll}>
          Open detailed controls
        </button>
      </div>
      <nav className="guide-steps" aria-label="Setup steps">
        {steps.map((name, i) => (
          <button
            key={name}
            type="button"
            aria-current={step === i ? 'step' : undefined}
            onClick={() => move(i)}
          >
            <span>{i + 1}</span>
            {name}
          </button>
        ))}
      </nav>
      <h3 ref={heading} tabIndex={-1}>
        {finished
          ? 'Your comparison is ready.'
          : [
              'What would you like this money to do?',
              'Who are you saving for, and what can you set aside?',
              'What education path should we use as a starting point?',
              'Where would you like to put the money?',
              s.educationYears > 0
                ? 'When education arrives, how should the money work?'
                : 'What should we assume about growth?',
              'Would you like to move savings into Roth later?',
            ][step]}
      </h3>
      {finished ? (
        <>
          <p>
            Your answers already drive the results below. Change any answer, explore another
            account, or open all assumptions whenever you like.
          </p>
          <a className="hero-link" href="#comparison">
            See your comparison ↓
          </a>
        </>
      ) : (
        <>
          {step === 0 && (
            <>
              <p>
                Choose a starting point. This narrows the next questions; you can still compare
                every strategy later.
              </p>
              <div className="question-options">
                {[
                  [
                    'education',
                    'Help pay for education',
                    'Start with school-focused savings and flexible alternatives.',
                  ],
                  [
                    'flexibility',
                    'Keep future options open',
                    'Start with savings that can serve education or another goal.',
                  ],
                  [
                    'retirement',
                    'Build long-term family security',
                    'Compare child accounts with protecting the parent’s retirement.',
                  ],
                  [
                    'all',
                    'Explore all the tradeoffs',
                    'Keep the full set of account choices available.',
                  ],
                ].map(([id, name, description]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={goal === id}
                    onClick={() => {
                      setGoal(id)
                      update(
                        id === 'flexibility'
                          ? {
                              strategyVehicle: 'brokerage',
                              compareVehicles: ['529', 'cash'],
                              allocationChanges: [],
                            }
                          : id === 'retirement'
                            ? {
                                strategyVehicle: 'trump',
                                compareVehicles: ['529', 'brokerage'],
                                allocationChanges: [],
                              }
                            : {
                                strategyVehicle: 'split',
                                share529: 0.5,
                                compareVehicles: ['529', 'trump'],
                                allocationChanges: [],
                              },
                      )
                    }}
                  >
                    <strong>{name}</strong>
                    <span>{description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <div className="form-grid">
                <label className="field">
                  <span>Child’s birth date</span>
                  <input
                    type="date"
                    max={s.asOf}
                    value={s.birthDate}
                    onChange={(e) =>
                      update({
                        birthDate: e.target.value,
                        accountOpenedAt:
                          e.target.value > s.accountOpenedAt ? e.target.value : s.accountOpenedAt,
                      })
                    }
                  />
                </label>
                {amount('annualContribution', 'Annual family saving budget')}
                {amount('contributionEndAge', 'Stop parent deposits at child age', 0, 18)}
              </div>
              <p>
                This is your total budget. Savings, taxes, education bills and loans will all have
                an identified source. No extra parent checks are assumed after the childhood funding
                period.
              </p>
              <label className="field">
                <span>Compare the same deposit or the same cost to you?</span>
                <select
                  value={s.comparisonMode}
                  onChange={(e) =>
                    update({ comparisonMode: e.target.value as Scenario['comparisonMode'] })
                  }
                >
                  <option value="gross">Same amount deposited into each strategy</option>
                  <option value="net">
                    Same parental cost after state education-saving incentives
                  </option>
                </select>
              </label>
              <p className="muted">
                State incentives start with New York. Change your state rules in “Edit all
                assumptions” if that is not your situation.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <p>
                You do not need to predict your child’s future. Pick an example and compare another
                path later. Costs and grants remain editable.
              </p>
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
                {presetById[s.educationPreset].note}{' '}
                {presetById[s.educationPreset].sourceIds.map((id) => (
                  <SourceLink key={id} id={id} />
                ))}
              </p>
              {s.educationYears > 0 && (
                <div className="form-grid">
                  {amount('educationStartAge', 'Education starts at age', 16, 30)}
                  {amount('annualAid', 'Annual grants or scholarships')}
                </div>
              )}
              <p className="muted">
                Loans are borrowing, not grants. Today’s cost and aid references are not promises
                about future prices or awards.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <div className="question-options">
                {visible.map((id) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={id === s.strategyVehicle}
                    onClick={() =>
                      update({
                        strategyVehicle: id as Scenario['strategyVehicle'],
                        allocationChanges: [],
                      })
                    }
                  >
                    <strong>
                      {id === 'split'
                        ? 'Split education and long-term savings'
                        : strategyChoices.find(([v]) => v === id)?.[1]}
                    </strong>
                    <span>
                      {id === 'split'
                        ? 'Put some new contributions in education savings and some in a Trump Account.'
                        : explanations[id as ContributionVehicle]}
                    </span>
                  </button>
                ))}
              </div>
              {s.strategyVehicle === 'split' && (
                <label className="field">
                  <span>Percent of new deposits for education savings (529)</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={s.share529 * 100}
                    onChange={(e) => update({ share529: Number(e.target.value) / 100 })}
                  />
                  <strong>
                    {Math.round(s.share529 * 100)}% education / {Math.round((1 - s.share529) * 100)}
                    % Trump Account
                  </strong>
                </label>
              )}
              {s.strategyVehicle === 'childRoth' && (
                <>
                  <p>
                    This choice needs eligible work income; gifts or investment earnings do not
                    count as compensation. <SourceLink id="SRC-IRS-PUB590A" />
                  </p>
                  {amount('childEmploymentAge', 'Child starts eligible work at age', 0, 25)}
                  {amount('childEmploymentAnnual', 'Annual child employment income before career')}
                </>
              )}
              {s.strategyVehicle === 'parentRoth' && (
                <>
                  <div className="form-grid">
                    {amount('parentAge', 'Parent age today', 18, 75)}
                    {amount('parentCompensation', 'Parent annual eligible compensation')}
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={s.parentRothEligible}
                      onChange={(e) => update({ parentRothEligible: e.target.checked })}
                    />
                    <span>I have checked direct Roth contribution income eligibility</span>
                  </label>
                  <SourceLink id="SRC-IRS-PUB590A" />
                </>
              )}
              <p className="muted">
                Your selected account appears first in the results. Single-account alternatives give
                you reference points. You can select other comparisons in the full controls.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              {s.educationYears > 0 && (
                <>
                  <label className="field">
                    <span>Use savings first, or use available federal borrowing first?</span>
                    <select
                      value={s.fundingPolicy}
                      onChange={(e) =>
                        update({ fundingPolicy: e.target.value as Scenario['fundingPolicy'] })
                      }
                    >
                      <option value="minimizeDebt">
                        Use available savings first to reduce borrowing
                      </option>
                      <option value="preserveRetirement">
                        Use eligible federal loans first to preserve investments
                      </option>
                    </select>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={s.gapEnabled}
                      onChange={(e) => update({ gapEnabled: e.target.checked })}
                    />
                    <span>
                      Illustrate additional borrowing if savings and federal loans are insufficient
                    </span>
                  </label>
                  <p className="muted">
                    Additional loans are an illustration, not a lending offer. Turning this off
                    shows any education expense without a funding source.
                  </p>
                </>
              )}
              <div className="form-grid">
                <label className="field">
                  <span>Illustrative annual growth after inflation (%)</span>
                  <input
                    type="number"
                    min="-95"
                    max="50"
                    step="0.5"
                    value={s.annualReturn * 100}
                    onChange={(e) => update({ annualReturn: Number(e.target.value) / 100 })}
                  />
                </label>
                {amount('retirementAge', 'Child’s retirement comparison age', 60, 70)}
              </div>
              <p className="muted">
                You can keep the starting assumptions. These are illustrations, not predictions.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={s.sensitivityEnabled}
                  onChange={(e) => update({ sensitivityEnabled: e.target.checked })}
                />
                <span>Show how different returns, tuition, aid, and taxes affect the result</span>
              </label>
              <p>
                You can also explore scholarships, tax credits, aid ownership, changing allocations,
                multiple children, and loan repayment through the full controls.
              </p>
            </>
          )}
          {step === 5 && <TransferInputs scenario={s} update={update} />}
          <div className="guide-actions">
            <button type="button" disabled={step === 0} onClick={() => move(step - 1)}>
              Back
            </button>
            <button
              type="button"
              onClick={() => (step === steps.length - 1 ? setFinished(true) : move(step + 1))}
            >
              {step === steps.length - 1 ? 'Show my comparison' : 'Continue'}
            </button>
            <span>Changes update the comparison below.</span>
          </div>
        </>
      )}
    </section>
  )
}
