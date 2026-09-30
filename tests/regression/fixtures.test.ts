import { expect, it } from 'vitest'
import { expectFundingToReconcile, simulateScenario } from '../../src/model/engine/simulate'
import { cases } from './cases'
import fixtures from './fixtures.json'

for (const [name, scenario] of Object.entries(cases))
  it(name, () => {
    const r = simulateScenario(scenario)
    expectFundingToReconcile(r)
    expect({
      parent: r.contributions.parent,
      age18: r.contributions.age18,
      education: r.education.cost,
      federal: r.debt.federalPrincipal,
      gap: r.debt.gapPrincipal,
      graduation: r.debt.graduationBalance,
      interest: r.debt.totalInterest,
      withdrawalTaxes: r.taxes.withdrawal,
      conversionTaxes: r.taxes.conversion,
      rollover: r.conversions.rollover,
      retirement: r.retirement.afterTaxChildhood,
    }).toEqual(fixtures[name as keyof typeof fixtures])
  })
