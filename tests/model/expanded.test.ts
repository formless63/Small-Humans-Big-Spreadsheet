import { describe, expect, it } from 'vitest'
import { decodeScenario, encodeScenario } from '../../src/lib/queryState'
import { compareStrategies, familyCases, sensitivityCases } from '../../src/model/engine/compare'
import { D } from '../../src/model/engine/money'
import { expectFundingToReconcile, simulateScenario } from '../../src/model/engine/simulate'
import { assetAssessment, educationCredit } from '../../src/model/policies/education'
import { allocationAt } from '../../src/model/policies/strategies'
import {
  contribute,
  createAccount,
  vehicleRegistry,
  withdrawNet,
} from '../../src/model/vehicles/vehicle'
import { defaultScenario, type Scenario, scenarioSchema } from '../../src/scenarios/schema'

const scenario = (overrides: Partial<Scenario> = {}) =>
  scenarioSchema.parse({ ...defaultScenario, ...overrides })
const noSchool = (overrides: Partial<Scenario> = {}) =>
  scenario({ educationYears: 0, annualReturn: 0, nyEnabled: false, ...overrides })
const context = (s: Scenario, date = '2044-10-01', age = 20) => ({
  date,
  age,
  qualified: false,
  stateQualified: false,
  tax: {
    scenario: s,
    year: Number(date.slice(0, 4)),
    earned: D(0),
    unearnedYtd: D(0),
    conversion: false,
  },
})

describe('additional ownership and account paths', () => {
  it('reconciles every new account with and without gap borrowing', () => {
    for (const strategyVehicle of [
      'brokerage',
      'custodial',
      'cash',
      'childRoth',
      'parentRoth',
    ] as const) {
      for (const gapEnabled of [true, false]) {
        const r = simulateScenario(
          scenario({
            strategyVehicle,
            gapEnabled,
            childEmploymentAnnual: 5000,
            parentRothEligible: true,
          }),
        )
        expectFundingToReconcile(r)
        expect(D(r.contributions.parent).plus(r.contributions.rejected).toNumber()).toBeCloseTo(
          76250,
          2,
        )
        expect(r.timeline.every((t) => D(t.flexible).gte(0) && D(t.parentRetirement).gte(0))).toBe(
          true,
        )
      }
    }
  })
  it('never gives child Roth compensation from a parent gift', () => {
    const r = simulateScenario(noSchool({ strategyVehicle: 'childRoth', childEmploymentAnnual: 0 }))
    expect(r.contributions.parent).toBe('0.00')
    expect(r.contributions.rejected).toBe('76250.00')
  })
  it('limits child Roth deposits to earned compensation and shared annual capacity', () => {
    const r = simulateScenario(
      noSchool({
        strategyVehicle: 'childRoth',
        childEmploymentAge: 16,
        childEmploymentAnnual: 1000,
        annualOtherIraContributions: 900,
        annualIncome: 0,
        childRothAnnualSaving: 1000,
      }),
    )
    const years = new Map<string, number>()
    for (const e of r.ledger.filter(
      (e) => e.category === 'contribution' && ['childRoth', 'wageRoth'].includes(e.vehicleId ?? ''),
    ))
      years.set(e.date.slice(0, 4), (years.get(e.date.slice(0, 4)) ?? 0) + Number(e.amountExact))
    expect([...years.values()].every((v) => v <= 100.000001)).toBe(true)
  })
  it('requires confirmed parent Roth eligibility and keeps retirement assets separate', () => {
    const rejected = simulateScenario(noSchool({ strategyVehicle: 'parentRoth' }))
    expect(rejected.contributions.parent).toBe('0.00')
    const r = simulateScenario(
      noSchool({ strategyVehicle: 'parentRoth', parentRothEligible: true }),
    )
    expect(r.retirement.afterTaxChildhood).toBe('0.00')
    expect(r.retirement.parentRetirement).toBe(r.contributions.parent)
  })
  it('does not secretly spend preserved parent retirement on education', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'parentRoth',
        parentRothEligible: true,
        parentRothEducation: false,
        gapEnabled: false,
      }),
    )
    expect(r.education.accounts).toBe('0.00')
    expect(D(r.education.unfunded).gt(0)).toBe(true)
  })
  it('withdraws direct Roth contributions before taxable earnings', () => {
    const a = createAccount('childRoth')
    contribute(a, D(1000), '2030-01-01')
    a.balance = D(2000)
    const s = scenario({ withdrawalTaxRate: 0.2 })
    const w = withdrawNet(a, D(500), context(s))
    expect(w.tax.toNumber()).toBe(0)
    expect(a.basis.toNumber()).toBeCloseTo(500)
    const next = withdrawNet(a, D(700), { ...context(s), qualified: true })
    expect(next.tax.gt(0)).toBe(true)
    expect(next.penalty.toNumber()).toBe(0)
  })
  it('taxes only gains when selling taxable investments and applies holding periods', () => {
    const a = createAccount('brokerage')
    contribute(a, D(1000), '2026-10-01')
    a.balance = D(2000)
    a.lots[0].value = D(2000)
    const s = scenario({ parentCapitalGainsRate: 0.15, parentOrdinaryRate: 0.3 })
    const recent = vehicleRegistry.brokerage.quote(a, D(1000), context(s, '2027-01-01'))
    const old = vehicleRegistry.brokerage.quote(a, D(1000), context(s, '2028-01-01'))
    expect(recent.tax.toNumber()).toBe(150)
    expect(old.tax.toNumber()).toBe(75)
  })
  it('taxes cash interest from account income, never original cash', () => {
    const r = simulateScenario(
      noSchool({ strategyVehicle: 'cash', cashReturn: 0.02, parentOrdinaryRate: 0.3 }),
    )
    expect(D(r.investmentTaxes).gt(0)).toBe(true)
    expect(r.retirement.liquidationTax).toBe('0.00')
    expect(
      r.ledger.filter((e) => e.category === 'tax').every((e) => e.payer === 'investment income'),
    ).toBe(true)
  })
  it('does not add dividends on top of total investment return', () => {
    const zero = simulateScenario(
      noSchool({
        strategyVehicle: 'brokerage',
        annualReturn: 0,
        dividendYield: 0.02,
        parentCapitalGainsRate: 0,
      }),
    )
    expect(D(zero.retirement.afterTaxChildhood).toNumber()).toBeCloseTo(
      Number(zero.contributions.parent),
      2,
    )
    const taxed = simulateScenario(
      noSchool({ strategyVehicle: 'brokerage', dividendYield: 0.02, parentCapitalGainsRate: 0.2 }),
    )
    expect(D(taxed.retirement.afterTaxChildhood).lt(taxed.contributions.parent)).toBe(true)
  })
})

describe('comparison methods', () => {
  it('holds parent net cost equal and enforces the annual state deduction cap', () => {
    const s = noSchool({
      strategyVehicle: '529',
      nyEnabled: true,
      comparisonMode: 'net',
      annualContribution: 10000,
      nyJoint: true,
      nyTaxRate: 0.065,
    })
    const r = simulateScenario(s)
    expect(D(r.contributions.netParentOutlay).toNumber()).toBeCloseTo(152500, 2)
    expect(D(r.contributions.parent).gt(r.contributions.netParentOutlay)).toBe(true)
    const benefits = r.ledger
      .filter((e) => e.category === 'benefit')
      .reduce((v, e) => v + Number(e.amountExact), 0)
    expect(benefits).toBeLessThanOrEqual(16 * 650)
  })
  it('supports explicit state assumptions without also applying NY incentives', () => {
    const r = simulateScenario(
      noSchool({
        strategyVehicle: '529',
        state529Mode: 'custom',
        customStateDeductionCap: 1000,
        customStateDeductionRate: 0.1,
        customStateCreditRate: 0.1,
        customStateCreditCap: 50,
      }),
    )
    expect(D(r.parentBenefits).toNumber()).toBeCloseTo(2400, 2)
  })
  it('changing allocations redirects deposits without moving existing money', () => {
    const s = noSchool({
      strategyVehicle: '529',
      allocationChanges: [{ age: 10, vehicle: 'brokerage', share529: 1 }],
    })
    expect(allocationAt(s, 9)).toEqual([{ vehicle: '529', share: 1 }])
    const r = simulateScenario(s)
    const brokerage = r.ledger.filter(
      (e) => e.category === 'contribution' && e.vehicleId === 'brokerage',
    )
    expect(brokerage.every((e) => e.age >= 10)).toBe(true)
    expect(D(r.retirement.plan529).gt(0)).toBe(true)
    expect(D(r.retirement.brokerage).gt(0)).toBe(true)
  })
  it('validates custom mixes instead of inventing an unallocated contribution', () => {
    expect(
      scenarioSchema.safeParse({
        ...defaultScenario,
        strategyVehicle: 'custom',
        allocation: [{ vehicle: '529', share: 0.2 }],
      }).success,
    ).toBe(false)
    const s = scenario({
      strategyVehicle: 'custom',
      allocation: [
        { vehicle: '529', share: 0.4 },
        { vehicle: 'brokerage', share: 0.6 },
      ],
    })
    expectFundingToReconcile(simulateScenario(s))
  })
  it('applies an investment shock once and leaves cash unshocked', () => {
    const s = noSchool({
      strategyVehicle: 'brokerage',
      annualReturn: 0.05,
      shockEnabled: true,
      shockAge: 17,
      shockReturn: -0.3,
    })
    const r = simulateScenario(s)
    expect(r.ledger.filter((e) => e.explanation.includes('One-time adverse')).length).toBe(1)
    expect(
      D(r.retirement.afterTaxChildhood).lt(
        simulateScenario({ ...s, shockEnabled: false }).retirement.afterTaxChildhood,
      ),
    ).toBe(true)
    const cash = simulateScenario({ ...s, strategyVehicle: 'cash' })
    expect(cash.ledger.some((e) => e.explanation.includes('One-time adverse'))).toBe(false)
  })
  it('lower-return education glide paths reduce modeled growth', () => {
    const s = scenario({
      strategyVehicle: '529',
      glidePath: true,
      glideStartAge: 14,
      glideReturn: 0.01,
    })
    expect(
      D(simulateScenario(s).contributions.age18).lt(
        simulateScenario({ ...s, glidePath: false }).contributions.age18,
      ),
    ).toBe(true)
  })
  it('extra principal payments reduce debt interest and have an explicit wage payer', () => {
    const s = scenario({ annualContribution: 0, annualIncome: 100000, extraDebtPayment: 300 })
    const r = simulateScenario(s),
      base = simulateScenario({ ...s, extraDebtPayment: 0 })
    expect(D(r.debt.totalInterest).lt(base.debt.totalInterest)).toBe(true)
    expect(r.debt.payoffAge!).toBeLessThan(base.debt.payoffAge!)
    expect(
      r.ledger
        .filter((e) => e.explanation.includes('Extra principal'))
        .every((e) => e.payer === 'child earnings'),
    ).toBe(true)
  })
  it('retained family 529 is not also spendable child retirement money', () => {
    const r = simulateScenario(
      noSchool({ strategyVehicle: '529', leftover529: 'family', familyTransferEligible: true }),
    )
    expect(r.retirement.afterTaxChildhood).toBe('0.00')
    expect(r.retirement.family529).toBe(r.contributions.parent)
    expect(r.retirement.liquidationTax).toBe('0.00')
    expect(r.retirement.liquidationPenalty).toBe('0.00')
  })
  it('keeps selected strategy first and removes duplicate references', () => {
    const r = compareStrategies(
      scenario({
        strategyVehicle: 'brokerage',
        compareVehicles: ['brokerage', '529', 'cash', 'cash'],
      }),
    )
    expect(r.map((v) => v.id)).toEqual(['brokerage', '529', 'cash'])
  })
  it('shares and restores all new allocation and workflow assumptions', () => {
    const s = scenario({
      strategyVehicle: 'custom',
      allocation: [
        { vehicle: '529', share: 0.25 },
        { vehicle: 'brokerage', share: 0.75 },
      ],
      sensitivityEnabled: true,
      aidMode: 'assetImpact',
      extraDebtPayment: 100,
    })
    expect(decodeScenario(`?${encodeScenario(s)}`).scenario).toEqual(s)
  })
  it('generates separate one-assumption sensitivity cases', () => {
    const cases = sensitivityCases(scenario({ strategyVehicle: 'brokerage' }))
    expect(cases).toHaveLength(5)
    for (const { result } of cases) expectFundingToReconcile(result)
  })
  it('splits the family budget without multiplying parent state benefits', () => {
    const s = noSchool({
      strategyVehicle: '529',
      nyEnabled: true,
      annualContribution: 15000,
      siblingBirthDates: ['2024-09-30'],
    })
    const cases = familyCases(s)
    const parent = cases.reduce((sum, c) => sum.plus(c.result.contributions.parent), D(0))
    const benefits = cases.reduce((sum, c) => sum.plus(c.result.parentBenefits), D(0))
    expect(parent.toNumber()).toBeCloseTo(Number(simulateScenario(s).contributions.parent), 2)
    expect(benefits.minus(simulateScenario(s).parentBenefits).abs().lte('0.02')).toBe(true)
  })
})

describe('aid, tax credits and annual review', () => {
  it('distinguishes parent, student and excluded retirement assets', () => {
    const a = Object.fromEntries(
      ['529', 'brokerage', 'custodial', 'cash', 'roth', 'childRoth', 'parentRoth', 'trump'].map(
        (id) => [id, createAccount(id as Parameters<typeof createAccount>[0])],
      ),
    )
    a.brokerage.balance = D(10000)
    a.custodial.balance = D(10000)
    a.parentRoth.balance = D(100000)
    const assessment = assetAssessment(scenario({ parentAidMarginalRate: 0.47 }), a)
    expect(assessment.federal.toNumber()).toBe(2564)
    expect(assessment.reduction.toNumber()).toBe(0)
  })
  it('does not turn an assessed asset amount into an automatic grant reduction', () => {
    const s = scenario({
      strategyVehicle: 'custodial',
      aidMode: 'assetImpact',
      aidAwardResponse: 0,
    })
    const r = simulateScenario(s)
    expect(r.education.aid).toBe(simulateScenario({ ...s, aidMode: 'manual' }).education.aid)
    expect(r.aidAssessment.some((a) => D(a.federalAssetContribution).gt(0))).toBe(true)
  })
  it('a user-enabled grant response is bounded by the grant and still reconciles', () => {
    const s = scenario({
      strategyVehicle: 'custodial',
      aidMode: 'assetImpact',
      aidAwardResponse: 1,
    })
    const r = simulateScenario(s)
    expectFundingToReconcile(r)
    expect(D(r.education.aid).gte(0)).toBe(true)
    expect(D(r.education.aid).lt(simulateScenario({ ...s, aidMode: 'manual' }).education.aid)).toBe(
      true,
    )
  })
  it('reserves education-credit tuition from tax-free 529 withdrawals', () => {
    const s = scenario({
      strategyVehicle: '529',
      creditMode: 'aotc',
      creditEligible: true,
      creditMagi: 100000,
      creditJoint: true,
      creditReserveAnnual: 4000,
    })
    const r = simulateScenario(s)
    expectFundingToReconcile(r)
    expect(D(r.educationCredits).gt(0)).toBe(true)
    expect(D(r.debt.federalPrincipal).gt(0)).toBe(true)
    expect(
      r.ledger
        .filter((e) => e.explanation.includes('education credit'))
        .every((e) => e.payer === 'parent tax return'),
    ).toBe(true)
  })
  it('enforces education credit phaseout, tax liability and eligible years', () => {
    expect(
      educationCredit(
        scenario({ creditMode: 'aotc', creditEligible: true, creditMagi: 100000 }),
        D(4000),
        0,
      ).toNumber(),
    ).toBe(2500)
    expect(
      educationCredit(
        scenario({ creditMode: 'aotc', creditEligible: true, creditMagi: 180000 }),
        D(4000),
        0,
      ).toNumber(),
    ).toBe(0)
    expect(
      educationCredit(
        scenario({ creditMode: 'aotc', creditEligible: true, creditMagi: 100000 }),
        D(4000),
        4,
      ).toNumber(),
    ).toBe(0)
    expect(
      educationCredit(
        scenario({
          creditMode: 'llc',
          creditEligible: true,
          creditMagi: 100000,
          creditReserveAnnual: 10000,
          creditTaxLiability: 500,
        }),
        D(10000),
        0,
      ).toNumber(),
    ).toBe(500)
  })
  it('provides an aggregate annual IRA basis worksheet without changing baseline tax calculations', () => {
    const r = simulateScenario(
      scenario({
        share529: 0,
        conversionMode: 'afterSchool',
        outsideIraYearEndValue: 50000,
        outsideIraBasis: 5000,
      }),
    )
    expect(r.iraWorksheets.length).toBeGreaterThan(0)
    for (const row of r.iraWorksheets) {
      expect(
        D(row.taxable).plus(row.nontaxable).minus(row.distributionAndConversion).abs().lte('0.01'),
      ).toBe(true)
      expect(D(row.nontaxable).lte(row.basisAvailable)).toBe(true)
    }
  })
})

it('child wage-funded Roth saving is separate from childhood-funded wealth', () => {
  const r = simulateScenario(
    noSchool({
      annualContribution: 0,
      childRothAnnualSaving: 1000,
      childEmploymentAnnual: 1000,
      annualIncome: 50000,
    }),
  )
  expect(r.retirement.afterTaxChildhood).toBe('0.00')
  expect(D(r.retirement.career).gt(0)).toBe(true)
  expect(D(r.contributions.childEarned).gt(0)).toBe(true)
})
it('Treasury interest excludes state investment tax without removing federal tax', () => {
  const s = noSchool({
    strategyVehicle: 'cash',
    cashReturn: 0.02,
    parentOrdinaryRate: 0.2,
    stateInvestmentTaxRate: 0.1,
  })
  const savings = simulateScenario(s),
    treasury = simulateScenario({ ...s, cashKind: 'treasury' })
  expect(D(treasury.investmentTaxes).gt(0)).toBe(true)
  expect(D(treasury.investmentTaxes).lt(savings.investmentTaxes)).toBe(true)
  expect(D(treasury.retirement.afterTaxChildhood).gt(savings.retirement.afterTaxChildhood)).toBe(
    true,
  )
})
it('CD early-withdrawal costs reduce available proceeds and reconcile', () => {
  const s = scenario({
    strategyVehicle: 'cash',
    cashKind: 'cd',
    cashMaturityAge: 21,
    cashEarlyWithdrawalRate: 0.02,
  })
  const r = simulateScenario(s)
  expectFundingToReconcile(r)
  expect(D(r.education.penalties).gt(0)).toBe(true)
  const a = createAccount('cash')
  contribute(a, D(1000), '2040-01-01')
  const w = withdrawNet(a, D(490), context(s, '2044-10-01', 20))
  expect(w.gross.toNumber()).toBeCloseTo(500, 6)
  expect(w.net.toNumber()).toBeCloseTo(490, 6)
})
it('custom-state recapture follows the remaining proportional benefits after qualified use', () => {
  const a = createAccount('529')
  contribute(a, D(1000), '2026-10-01')
  a.stateBenefits = D(100)
  const s = scenario({ state529Mode: 'custom', customStateRecapture: true, nyEnabled: false })
  withdrawNet(a, D(900), { ...context(s), qualified: true, stateQualified: true })
  expect(a.stateBenefits.toNumber()).toBeCloseTo(10, 6)
  const w = withdrawNet(a, D(100), context(s))
  expect(w.stateRecapture.toNumber()).toBeCloseTo(10, 6)
  expect(w.net.toNumber()).toBeCloseTo(90, 6)
})

it('taxable sales use each holding cohort’s basis, not the overall gain percentage', () => {
  const a = createAccount('brokerage')
  contribute(a, D(1000), '2026-01-01')
  a.lots[0].value = D(2000)
  a.balance = D(2000)
  contribute(a, D(1000), '2028-01-01')
  const s = scenario({ parentCapitalGainsRate: 0.15, parentOrdinaryRate: 0.3 })
  const w = vehicleRegistry.brokerage.quote(a, D(3000), context(s, '2028-06-01'))
  expect(w.tax.toNumber()).toBeCloseTo(150, 6)
  const loss = createAccount('brokerage')
  contribute(loss, D(1000), '2026-01-01')
  loss.balance = D(500)
  loss.lots[0].value = D(500)
  withdrawNet(loss, D(250), context(s, '2028-06-01'))
  expect(loss.basis.toNumber()).toBeCloseTo(500, 6)
  expect(loss.lots[0].basis.toNumber()).toBeCloseTo(500, 6)
})

it('rejects tiny overallocations and ambiguous allocation-change ages', () => {
  expect(
    scenarioSchema.safeParse({
      ...defaultScenario,
      strategyVehicle: 'custom',
      allocation: [
        { vehicle: '529', share: 0.5 },
        { vehicle: 'brokerage', share: 0.500000001 },
      ],
    }).success,
  ).toBe(false)
  expect(
    scenarioSchema.safeParse({
      ...defaultScenario,
      allocationChanges: [
        { age: 14, vehicle: '529', share529: 1 },
        { age: 14, vehicle: 'brokerage', share529: 1 },
      ],
    }).success,
  ).toBe(false)
})
