import { nyRules2026 } from '../../data/states/ny2026'
import type { Scenario } from '../../scenarios/schema'
import { D, Decimal, nonnegative } from '../engine/money'
import type { ContributionVehicle } from '../types'
export const vehicleNames: Record<ContributionVehicle, string> = {
  '529': 'Education savings (529)',
  trump: 'Trump Account',
  brokerage: 'Parent-owned investments',
  custodial: 'Child-owned investments (UTMA/UGMA)',
  cash: 'Cash / savings / CDs',
  childRoth: 'Child’s earned-income Roth IRA',
  parentRoth: 'Parent retirement first (Roth IRA)',
}
export function allocationAt(
  s: Scenario,
  age: number,
): { vehicle: ContributionVehicle; share: number }[] {
  const change = [...s.allocationChanges]
    .filter((c) => age >= c.age)
    .sort((a, b) => b.age - a.age)[0]
  if (change)
    return [
      { vehicle: change.vehicle, share: change.share529 },
      { vehicle: '529' as const, share: 1 - change.share529 },
    ].reduce<{ vehicle: ContributionVehicle; share: number }[]>((a, v) => {
      const previous = a.find((x) => x.vehicle === v.vehicle)
      if (previous) previous.share += v.share
      else a.push(v)
      return a
    }, [])
  if (s.strategyVehicle === 'custom') return s.allocation
  if (s.strategyVehicle === 'split')
    return [
      { vehicle: '529', share: s.share529 },
      { vehicle: 'trump', share: 1 - s.share529 },
    ]
  return [{ vehicle: s.strategyVehicle, share: 1 }]
}
export function stateBenefit(s: Scenario, amount: Decimal, deducted: Decimal, credited: Decimal) {
  if (s.state529Mode === 'none') return { deduction: D(0), benefit: D(0), credit: D(0) }
  const custom = s.state529Mode === 'custom'
  const cap = custom
    ? s.customStateDeductionCap
    : s.nyEnabled
      ? s.nyJoint
        ? nyRules2026.jointDeduction.value
        : nyRules2026.individualDeduction.value
      : 0
  const deduction = Decimal.min(
    amount,
    nonnegative(D(cap).mul(s.householdBudgetShare).minus(deducted)),
  )
  const credit = custom
    ? Decimal.min(
        amount.mul(s.customStateCreditRate),
        nonnegative(D(s.customStateCreditCap).mul(s.householdBudgetShare).minus(credited)),
      )
    : D(0)
  const benefit = deduction.mul(custom ? s.customStateDeductionRate : s.nyTaxRate).plus(credit)
  return { deduction, benefit, credit }
}
export function grossForNetBudget(
  s: Scenario,
  budget: Decimal,
  share529: number,
  deducted: Decimal,
  credited: Decimal,
) {
  if (s.comparisonMode === 'gross' || share529 === 0) return budget
  let lo = budget,
    hi = budget.div('0.05')
  for (let i = 0; i < 45; i++) {
    const mid = lo.plus(hi).div(2),
      benefit = stateBenefit(s, mid.mul(share529), deducted, credited).benefit
    if (mid.minus(benefit).gt(budget)) hi = mid
    else lo = mid
  }
  return lo
}
export function selectedName(s: Scenario) {
  if (s.allocationChanges.length) return 'Your changing allocation'
  if (s.strategyVehicle === 'custom') return 'Your custom mix'
  if (s.strategyVehicle === 'split')
    return s.share529 === 1
      ? '529 plan'
      : s.share529 === 0
        ? 'Trump Account'
        : `${Math.round(s.share529 * 100)}/${Math.round((1 - s.share529) * 100)} split`
  return vehicleNames[s.strategyVehicle]
}
