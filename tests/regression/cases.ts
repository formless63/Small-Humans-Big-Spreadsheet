import { presetById } from '../../src/scenarios/presets'
import { defaultScenario, type Scenario } from '../../src/scenarios/schema'
export const cases: Record<string, Scenario> = {}
for (const education of ['none', 'public4', 'private'])
  for (const vehicle of ['529', 'trump']) {
    const p = presetById[education]
    cases[`age-2-5000-${education}-${vehicle}`] = {
      ...defaultScenario,
      share529: vehicle === '529' ? 1 : 0,
      educationPreset: education as Scenario['educationPreset'],
      educationYears: p.years,
      expenses: p.expenses,
      annualAid: p.aid,
    }
  }
cases['age-4-5000-public4-529'] = { ...defaultScenario, birthDate: '2022-09-30', share529: 1 }
cases['trump-gradual-roth-conversion'] = {
  ...cases['age-2-5000-none-trump'],
  conversionMode: 'fixed',
  conversionAnnual: 7500,
}
cases['trump-kiddie-tax-conversion'] = {
  ...cases['age-2-5000-none-trump'],
  conversionMode: 'immediate',
  taxMode: 'estimate2026',
}
cases['529-full-roth-rollover'] = { ...cases['age-2-5000-none-529'], rolloverEnabled: true }
