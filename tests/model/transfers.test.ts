import { describe, expect, it } from 'vitest'
import { decodeScenario, encodeScenario } from '../../src/lib/queryState'
import { transferTimingCases } from '../../src/model/engine/compare'
import { D } from '../../src/model/engine/money'
import { expectFundingToReconcile, simulateScenario } from '../../src/model/engine/simulate'
import { defaultScenario, type Scenario, scenarioSchema } from '../../src/scenarios/schema'

const scenario = (changes: Partial<Scenario> = {}) =>
  scenarioSchema.parse({ ...defaultScenario, ...changes })

function reconcile(r: ReturnType<typeof simulateScenario>) {
  expectFundingToReconcile(r)
  for (const y of r.portfolioYears) {
    let incoming = D(0),
      outgoing = D(0)
    for (const a of y.accounts) {
      const expected = D(a.opening)
        .plus(a.contributions)
        .plus(a.growth)
        .plus(a.transfersIn)
        .minus(a.transfersOut)
        .minus(a.spending)
        .minus(a.tax)
      expect(expected.minus(a.closing).abs().toNumber(), `${y.year} ${a.account}`).toBeLessThan(
        0.00000001,
      )
      incoming = incoming.plus(a.transfersIn)
      outgoing = outgoing.plus(a.transfersOut)
    }
    expect(incoming.minus(outgoing).abs().toNumber()).toBeLessThan(0.00000001)
  }
}
describe('portfolio reporting follows actual transactions', () => {
  it.each([
    '529',
    'trump',
    'brokerage',
    'custodial',
    'cash',
    'childRoth',
    'parentRoth',
    'custom',
  ] as const)('reconciles every account and year for %s', (strategyVehicle) => {
    const r = simulateScenario(
      scenario({
        strategyVehicle,
        allocation: [
          { vehicle: '529', share: 0.2 },
          { vehicle: 'trump', share: 0.2 },
          { vehicle: 'brokerage', share: 0.2 },
          { vehicle: 'custodial', share: 0.1 },
          { vehicle: 'cash', share: 0.1 },
          { vehicle: 'childRoth', share: 0.1 },
          { vehicle: 'parentRoth', share: 0.1 },
        ],
        parentRothEligible: true,
        childEmploymentAnnual: 5000,
        childRothAnnualSaving: 1000,
        careerEnabled: true,
        conversionMode: 'fixed',
        conversionStartAge: 18,
        rolloverEnabled: true,
        rolloverStartAge: 18,
        studentLoan529Enabled: true,
        cashKind: 'cd',
        cashEarlyWithdrawalRate: 0.01,
        shockEnabled: true,
        shockAge: 17,
        creditMode: 'aotc',
        creditEligible: true,
      }),
    )
    reconcile(r)
    expect(r.portfolio[0].date).toBe(defaultScenario.asOf)
    expect(r.portfolio.at(-1)!.age).toBe(defaultScenario.retirementAge)
    expect(r.portfolioYears.at(-1)!.accounts.find((a) => a.account === 'roth')!.closing).toBe(
      r.portfolio.at(-1)!.balances.roth,
    )
  })
  it('an account-funded conversion loses only its withholding and creates no new deposits', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'trump',
        educationYears: 0,
        conversionMode: 'immediate',
        conversionTaxRate: 0.24,
      }),
    )
    const transfer = r.transfers.find((t) => D(t.net).gt(0))!
    expect(
      D(transfer.gross)
        .minus(transfer.net)
        .minus(transfer.tax)
        .minus(transfer.penalty)
        .abs()
        .toNumber(),
    ).toBeLessThan(1e-8)
    const year = r.portfolioYears.find((y) => y.year === Number(transfer.date.slice(0, 4)))!
    expect(D(year.accounts.find((a) => a.account === 'roth')!.contributions).isZero()).toBe(true)
    reconcile(r)
  })
  it('child-earnings tax does not get counted as an account tax or free additional deposit', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'trump',
        educationYears: 0,
        conversionMode: 'fixed',
        conversionStartAge: 22,
        conversionAnnual: 10000,
        conversionTaxPayer: 'earnings',
      }),
    )
    const t = r.transfers.find((t) => D(t.net).gt(0))!
    expect(t.net).toBe(t.gross)
    expect(D(t.tax).gt(0)).toBe(true)
    expect(
      r.portfolioYears
        .find((y) => y.year === Number(t.date.slice(0, 4)))!
        .accounts.find((a) => a.account === 'trump')!.tax,
    ).toBe('0')
    reconcile(r)
  })
})
describe('transfer schedules and constraints', () => {
  it('executes a custom calendar-age conversion during school and never before the growth period ends', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'trump',
        fundingPolicy: 'preserveRetirement',
        conversionMode: 'custom',
        conversionSchedule: [
          { age: 18, amount: 5000 },
          { age: 19, amount: 5000 },
        ],
      }),
    )
    expect(r.transfers.map((t) => t.date)).toEqual(['2042-01-01', '2043-01-01'])
    expect(r.transfers.every((t) => D(t.net).gt(0))).toBe(true)
    reconcile(r)
  })
  it('protects the chosen source-account reserve and stops scheduled conversions at the last age', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'trump',
        educationYears: 0,
        annualReturn: 0,
        conversionMode: 'fixed',
        conversionStartAge: 18,
        conversionEndAge: 20,
        conversionAnnual: 50000,
        transferEducationReserve: 70000,
      }),
    )
    expect(r.transfers.every((t) => Number(t.date.slice(0, 4)) <= 2044)).toBe(true)
    expect(r.portfolio.at(-1)!.balances.trump).toBe('70000')
    expect(r.transfers.some((t) => t.reasons.some((v) => v.includes('reserve')))).toBe(true)
    reconcile(r)
  })
  it('zero earnings can allow a Trump conversion but block a 529 rollover', () => {
    const r = simulateScenario(
      scenario({
        educationYears: 0,
        annualIncome: 0,
        childEmploymentAnnual: 0,
        conversionMode: 'fixed',
        conversionStartAge: 18,
        rolloverEnabled: true,
        rolloverStartAge: 18,
      }),
    )
    expect(r.transfers.some((t) => t.from === 'trump' && D(t.net).gt(0))).toBe(true)
    const rollovers = r.transfers.filter((t) => t.from === '529')
    expect(rollovers.length).toBeGreaterThan(0)
    expect(rollovers.every((t) => D(t.net).isZero())).toBe(true)
    expect(rollovers.some((t) => t.reasons.some((v) => v.includes('compensation')))).toBe(true)
    reconcile(r)
  })
  it('shows account age, lookback, compensation/capacity and lifetime restrictions', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: '529',
        birthDate: '2010-09-30',
        annualContribution: 50000,
        educationYears: 0,
        rolloverEnabled: true,
        rolloverStartAge: 18,
        childEmploymentAnnual: 10000,
      }),
    )
    expect(r.transfers[0].reasons.join(' ')).toContain('15 years')
    expect(r.transfers.some((t) => t.reasons.join(' ').includes('lookback'))).toBe(true)
    expect(r.conversions.rollover).toBe('35000.00')
    expect(r.transfers.some((t) => t.reasons.join(' ').includes('lifetime'))).toBe(true)
    reconcile(r)
  })
  it('shares compensation between direct child Roth deposits and 529 rollovers in the same year', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'custom',
        allocation: [
          { vehicle: '529', share: 0.5 },
          { vehicle: 'childRoth', share: 0.5 },
        ],
        educationYears: 0,
        annualReturn: 0,
        accountOpenedAt: defaultScenario.birthDate,
        rolloverEnabled: true,
        rolloverStartAge: 17,
        childEmploymentAnnual: 1000,
        annualIncome: 0,
      }),
    )
    const used = r.ledger
      .filter(
        (e) =>
          e.date.startsWith('2041') &&
          (e.category === 'rollover' ||
            (e.category === 'contribution' && e.vehicleId === 'childRoth')),
      )
      .reduce((total, e) => total.plus(e.amountExact ?? e.amount), D(0))
    expect(used.toNumber()).toBeCloseTo(1000, 8)
    expect(r.transfers.some((t) => t.date.startsWith('2041') && D(t.net).gt(0))).toBe(true)
    reconcile(r)
  })
  it('income-target fill includes school wages and other unearned income', () => {
    const r = simulateScenario(
      scenario({
        strategyVehicle: 'trump',
        educationYears: 0,
        conversionMode: 'threshold',
        conversionStartAge: 18,
        conversionEndAge: 18,
        conversionThreshold: 5000,
        childEmploymentAnnual: 4000,
        otherUnearnedIncome: 2000,
      }),
    )
    expect(r.transfers[0].net).toBe('0')
    expect(r.transfers[0].reasons.join(' ')).toContain('income target')
  })
  it('comparisons keep the selected account mix and deposits, and preserve accounting', () => {
    const s = scenario({
      educationYears: 0,
      conversionMode: 'fixed',
      transferComparisonEnabled: true,
    })
    const cases = transferTimingCases(s)
    expect(cases).toHaveLength(5)
    for (const { result } of cases) {
      expect(result.contributions.parent).toBe('76250.00')
      reconcile(result)
    }
    expect(
      new Set(cases.map(({ result }) => result.retirement.afterTaxChildhood)).size,
    ).toBeGreaterThan(1)
  })
  it('new controls round-trip in a shared URL and reject duplicate custom ages', () => {
    const s = scenario({
      conversionMode: 'custom',
      conversionSchedule: [{ age: 18, amount: 10000 }],
      transferEducationReserve: 20000,
      conversionStartAge: 18,
      conversionEndAge: 30,
      rolloverStartAge: 19,
      transferComparisonEnabled: true,
    })
    expect(decodeScenario(encodeScenario(s)).scenario).toEqual(s)
    expect(
      scenarioSchema.safeParse({
        ...s,
        conversionSchedule: [
          { age: 18, amount: 1000 },
          { age: 18, amount: 2000 },
        ],
      }).success,
    ).toBe(false)
  })
})
