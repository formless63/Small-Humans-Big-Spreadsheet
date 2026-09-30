import type { Scenario } from '../../scenarios/schema'
import { selectedName, vehicleNames } from '../policies/strategies'
import type { ContributionVehicle } from '../types'
import { expectFundingToReconcile, simulateScenario } from './simulate'
export function compareStrategies(s: Scenario) {
  const selectedVehicle =
    s.allocationChanges.length || s.strategyVehicle === 'custom'
      ? 'custom'
      : s.strategyVehicle === 'split'
        ? s.share529 === 1
          ? '529'
          : s.share529 === 0
            ? 'trump'
            : 'split'
        : s.strategyVehicle
  const selected = simulateScenario(
    s,
    selectedVehicle,
    selectedVehicle === '529'
      ? '529 plan'
      : selectedVehicle === 'trump'
        ? 'Trump Account'
        : selectedName(s),
  )
  const results = [selected]
  for (const vehicle of [...new Set(s.compareVehicles)]) {
    if (vehicle === selectedVehicle) continue
    const scenario = {
      ...s,
      strategyVehicle: vehicle,
      allocationChanges: [],
      allocation: [],
      pilotEnabled: vehicle === 'trump' ? s.pilotEnabled : false,
      employerAnnual: vehicle === 'trump' ? s.employerAnnual : 0,
    }
    results.push(
      simulateScenario(
        scenario,
        vehicle,
        vehicle === '529'
          ? '529 plan'
          : vehicle === 'trump'
            ? 'Trump Account'
            : vehicleNames[vehicle],
      ),
    )
  }
  for (const result of results) expectFundingToReconcile(result)
  return results
}
export function sensitivityCases(s: Scenario) {
  const variants: [string, Partial<Scenario>][] = [
    [
      'Lower investment return (−2 percentage points)',
      { annualReturn: Math.max(-0.95, s.annualReturn - 0.02) },
    ],
    [
      'Higher investment return (+2 percentage points)',
      { annualReturn: Math.min(0.5, s.annualReturn + 0.02) },
    ],
    ['Higher tuition (+25%)', { expenses: { ...s.expenses, tuition: s.expenses.tuition * 1.25 } }],
    ['Lower grants (−50%)', { annualAid: s.annualAid * 0.5 }],
    [
      'Higher effective taxes (+5 percentage points)',
      {
        taxMode: 'manual',
        withdrawalTaxRate: Math.min(0.75, s.withdrawalTaxRate + 0.05),
        conversionTaxRate: Math.min(0.75, s.conversionTaxRate + 0.05),
        retirementTaxRate: Math.min(0.75, s.retirementTaxRate + 0.05),
        parentCapitalGainsRate: Math.min(0.75, s.parentCapitalGainsRate + 0.05),
        childCapitalGainsRate: Math.min(0.75, s.childCapitalGainsRate + 0.05),
      },
    ],
  ]
  return variants.map(([name, overrides]) => ({
    name,
    result: simulateScenario({ ...s, ...overrides }, 'sensitivity', name),
  }))
}
export function familyCases(s: Scenario) {
  const dates = [s.birthDate, ...s.siblingBirthDates],
    share = 1 / dates.length
  return dates.map((birthDate, i) => {
    const scenario = {
      ...s,
      birthDate,
      accountOpenedAt: birthDate > s.accountOpenedAt ? birthDate : s.accountOpenedAt,
      annualContribution: s.annualContribution * share,
      parentAge: s.parentAge,
      creditTaxLiability: s.creditTaxLiability * share,
      creditReserveAnnual:
        s.creditMode === 'llc' ? s.creditReserveAnnual * share : s.creditReserveAnnual,
      householdBudgetShare: share,
      siblingBirthDates: [],
      outsideIraBasis: s.outsideIraBasis * share,
      outsideIraYearEndValue: s.outsideIraYearEndValue * share,
    }
    return {
      birthDate,
      name: `Child ${i + 1}`,
      result: simulateScenario(scenario, `child-${i + 1}`, 'Equal family-budget allocation'),
    }
  })
}
export const contributionVehicleIds: ContributionVehicle[] = [
  '529',
  'trump',
  'brokerage',
  'custodial',
  'cash',
  'childRoth',
  'parentRoth',
]
