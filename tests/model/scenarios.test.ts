import { describe, expect, it } from 'vitest'
import { decodeScenario, encodeScenario } from '../../src/lib/queryState'
import { D } from '../../src/model/engine/money'
import { expectFundingToReconcile, simulateScenario } from '../../src/model/engine/simulate'
import { bracketTax, kiddieApplies } from '../../src/model/taxes/ordinaryIncome'
import { defaultScenario, scenarioSchema } from '../../src/scenarios/schema'

const scenario = (overrides: Partial<typeof defaultScenario>) =>
  scenarioSchema.parse({ ...defaultScenario, ...overrides })
describe('closed financial system', () => {
  it('reconciles every education month across strategies and financing policies', () => {
    for (const share529 of [0, 0.25, 0.5, 0.75, 1])
      for (const gapEnabled of [false, true])
        for (const fundingPolicy of ['minimizeDebt', 'preserveRetirement'] as const) {
          const r = simulateScenario(scenario({ share529, gapEnabled, fundingPolicy }))
          expectFundingToReconcile(r)
          expect(r.education.periods.length).toBe(48)
          expect(D(r.education.unfunded).gte(0)).toBe(true)
          for (const t of r.timeline)
            for (const key of ['plan529', 'traditional', 'roth', 'debt', 'career'] as const)
              expect(D(t[key]).gte(0)).toBe(true)
        }
  }, 30000)
  it('zero contributions + disabled gap produces an explicit gap and capped federal loans', () => {
    const r = simulateScenario(scenario({ annualContribution: 0, annualAid: 0, gapEnabled: false }))
    expectFundingToReconcile(r)
    expect(r.debt.federalPrincipal).toBe('27000.00')
    expect(D(r.education.unfunded).gt(0)).toBe(true)
    expect(r.contributions.parent).toBe('0.00')
  })
  it('caps Trump contributions and never invents post-childhood parent funding', () => {
    const r = simulateScenario(scenario({ share529: 0, annualContribution: 20000 }))
    expect(D(r.contributions.rejected).gt(0)).toBe(true)
    const events = r.ledger.filter((e) => e.category === 'contribution' && e.payer === 'parent')
    for (const e of events) expect(e.date < '2042-01-01').toBe(true)
    const years = new Map<string, number>()
    for (const e of events)
      years.set(e.date.slice(0, 4), (years.get(e.date.slice(0, 4)) ?? 0) + Number(e.amount))
    for (const total of years.values()) expect(total).toBeLessThanOrEqual(5000.01)
  })
  it('zero growth preserves contributions in no-education scenario', () => {
    const r = simulateScenario(
      scenario({
        educationYears: 0,
        educationPreset: 'none',
        annualReturn: 0,
        share529: 1,
        nyEnabled: false,
      }),
    )
    expect(r.retirement.plan529).toBe(r.contributions.parent)
    expect(r.retirement.afterTaxChildhood).toBe(r.contributions.parent)
  })
  it('withholding conversions have explicit tax and preserve total wealth less tax/penalty', () => {
    const r = simulateScenario(
      scenario({ share529: 0, educationYears: 0, conversionMode: 'immediate' }),
    )
    const conversions = r.ledger.filter((e) => e.category === 'conversion')
    expect(conversions.length).toBe(1)
    expect(Number(conversions[0].tax)).toBeGreaterThan(0)
    expect(Number(conversions[0].penalty)).toBeGreaterThan(0)
    expect(conversions[0].payer).toBe('Trump account withholding')
    expect(r.retirement.traditional).toBe('0.00')
  })
  it('earnings-funded conversion cannot use missing cash', () => {
    const r = simulateScenario(
      scenario({
        share529: 0,
        educationYears: 0,
        conversionMode: 'immediate',
        conversionTaxPayer: 'earnings',
        annualIncome: 0,
      }),
    )
    expect(r.conversions.converted).toBe('0.00')
    expect(D(r.retirement.traditional).gt(0)).toBe(true)
  })
  it('529 rollover requires account age, compensation, annual cap and lifetime cap', () => {
    const r = simulateScenario(scenario({ share529: 1, educationYears: 0, rolloverEnabled: true }))
    expect(r.conversions.rollover).toBe('35000.00')
    const rollovers = r.ledger.filter((e) => e.category === 'rollover')
    for (const e of rollovers) {
      expect(e.date > '2041-09-01').toBe(true)
      expect(Number(e.amount)).toBeLessThanOrEqual(7500)
    }
    const noIncome = simulateScenario(
      scenario({ share529: 1, educationYears: 0, rolloverEnabled: true, annualIncome: 0 }),
    )
    expect(noIncome.conversions.rollover).toBe('0.00')
  })
  it('student-loan 529 payments stay within $10,000 lifetime', () => {
    const r = simulateScenario(
      scenario({
        share529: 1,
        fundingPolicy: 'preserveRetirement',
        studentLoan529Enabled: true,
        educationYears: 4,
      }),
    )
    const payments = r.ledger.filter(
      (e) => e.category === 'withdrawal' && e.explanation.includes('student-loan'),
    )
    expect(payments.reduce((a, e) => a + Number(e.amount), 0)).toBeLessThanOrEqual(10000.1)
  })
  it('gives deterministic results and URL round trips', () => {
    const s = scenario({ conversionMode: 'fixed', conversionAnnual: 12000, careerEnabled: true })
    expect(decodeScenario(encodeScenario(s)).scenario).toEqual(s)
    expect(simulateScenario(s)).toEqual(simulateScenario(s))
    expect(decodeScenario('?v=999').error).toBeTruthy()
    expect(decodeScenario('?v=1&s=bad').error).toBeTruthy()
  })
  it('rejects malformed dates, excessive ages and non-finite rates', () => {
    expect(scenarioSchema.safeParse({ birthDate: '2025-02-30' }).success).toBe(false)
    expect(scenarioSchema.safeParse({ annualReturn: Infinity }).success).toBe(false)
    expect(scenarioSchema.safeParse({ birthDate: '1950-01-01' }).success).toBe(false)
  })
})
describe('2026 tax estimate', () => {
  it('calculates single-filer brackets and zero-income correctly', () => {
    expect(bracketTax(0).eq(0)).toBe(true)
    expect(bracketTax(12400).eq(1240)).toBe(true)
    expect(bracketTax(50400).eq(5800)).toBe(true)
  })
  it('checks age, full-time student and self-support for kiddie tax', () => {
    expect(kiddieApplies(defaultScenario, 2042, 0)).toBe(true)
    expect(kiddieApplies(defaultScenario, 2046, 0)).toBe(false)
    expect(kiddieApplies({ ...defaultScenario, studentThroughAge: 24 }, 2045, 0)).toBe(true)
    expect(kiddieApplies(defaultScenario, 2042, 20000)).toBe(false)
  })
})

describe('Roth and rollover boundaries', () => {
  it('excludes recent 529 contribution lots until the five-year lookback passes', () => {
    const r = simulateScenario(
      scenario({
        birthDate: '2010-09-30',
        accountOpenedAt: '2010-09-30',
        share529: 1,
        educationYears: 0,
        educationPreset: 'none',
        rolloverEnabled: true,
        careerStartAge: 18,
      }),
    )
    const rolls = r.ledger.filter((e) => e.category === 'rollover')
    expect(rolls.length).toBeGreaterThan(0)
    expect(rolls[0].date >= '2032-01-01').toBe(true)
  })
  it('does not roll over on the exact 15-year account anniversary and reserves other IRA contributions', () => {
    const r = simulateScenario(
      scenario({
        share529: 1,
        educationYears: 0,
        educationPreset: 'none',
        rolloverEnabled: true,
        accountOpenedAt: '2026-01-01',
        annualOtherIraContributions: 7500,
      }),
    )
    expect(r.conversions.rollover).toBe('0.00')
  })
  it('taxes Roth earnings when a late conversion has not met five tax years', () => {
    const r = simulateScenario(
      scenario({
        share529: 0,
        educationYears: 0,
        educationPreset: 'none',
        conversionMode: 'custom',
        conversionSchedule: [{ age: 64, amount: 10000000 }],
      }),
    )
    expect(Number(r.retirement.roth)).toBeGreaterThan(0)
    expect(Number(r.retirement.liquidationTax)).toBeGreaterThan(0)
    expect(r.warnings.some((w) => w.includes('five-tax-year'))).toBe(true)
  })
  it('limits retirement inputs to the supported qualified-age range', () => {
    expect(scenarioSchema.safeParse({ ...defaultScenario, retirementAge: 35 }).success).toBe(false)
  })
})

describe('additional source and tax contracts', () => {
  it('has every source ID referenced in material ledger events', async () => {
    const { sourceById } = await import('../../src/data/sources')
    const r = simulateScenario(
      scenario({ careerEnabled: true, conversionMode: 'fixed', rolloverEnabled: true }),
    )
    for (const event of r.ledger)
      for (const id of event.sourceIds) expect(sourceById[id], id).toBeDefined()
    for (const e of r.ledger.filter((e) => Number(e.tax ?? 0) > 0 || Number(e.penalty ?? 0) > 0))
      expect(e.payer).toBeTruthy()
  })
  it('supports manual conversion rates by age instead of treating low-income students as zero-tax', async () => {
    const { incomeTax } = await import('../../src/model/taxes/ordinaryIncome')
    const s = scenario({ conversionTaxByAge: [{ fromAge: 18, throughAge: 23, rate: 0.24 }] })
    expect(
      incomeTax(D(10000), {
        scenario: s,
        year: 2042,
        earned: D(0),
        unearnedYtd: D(0),
        conversion: true,
      }).eq(2400),
    ).toBe(true)
    expect(
      incomeTax(D(10000), {
        scenario: s,
        year: 2048,
        earned: D(0),
        unearnedYtd: D(0),
        conversion: true,
      }).eq(1200),
    ).toBe(true)
  })
})

describe('independent wealth and rounding invariants', () => {
  it('zero growth conserves childhood wealth across education and conversions', () => {
    const r = simulateScenario(
      scenario({
        annualReturn: 0,
        withdrawalTaxRate: 0,
        conversionTaxRate: 0,
        retirementTaxRate: 0,
        nyEnabled: false,
        conversionMode: 'afterSchool',
        share529: 0.5,
      }),
    )
    expectFundingToReconcile(r)
    expect(
      D(r.retirement.afterTaxChildhood)
        .minus(r.contributions.parent)
        .minus(r.contributions.thirdParty)
        .plus(r.education.accounts)
        .abs()
        .lt('.02'),
    ).toBe(true)
  })
  it('cent-scale aid allocations cannot overfund education categories', () => {
    const r = simulateScenario(
      scenario({
        annualContribution: 0,
        annualAid: 0.24,
        annualChildEducation: 0,
        expenses: {
          tuition: 0.12,
          books: 0.12,
          roomBoard: 0.12,
          computer: 0.12,
          transportation: 0.12,
          personal: 0.12,
          other: 0,
        },
      }),
    )
    expectFundingToReconcile(r)
    for (const p of r.education.periods) expect(D(p.unfunded).gte(0)).toBe(true)
  })
})

it('cannot bypass the annual Roth rollover statutory cap by increasing capacity input', () => {
  const r = simulateScenario(
    scenario({
      share529: 1,
      educationYears: 0,
      educationPreset: 'none',
      rolloverEnabled: true,
      annualRothCapacity: 100000,
    }),
  )
  for (const e of r.ledger.filter((e) => e.category === 'rollover'))
    expect(Number(e.amount)).toBeLessThanOrEqual(e.age < 49 ? 7500 : 8600)
  expect(Number(r.conversions.rollover)).toBeLessThanOrEqual(35000)
})
