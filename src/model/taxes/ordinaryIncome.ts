import { taxRules2026 as rules } from '../../data/federal/tax2026'
import type { Scenario } from '../../scenarios/schema'
import { D, Decimal, nonnegative } from '../engine/money'
export function bracketTax(taxable: Decimal.Value, joint = false): Decimal {
  const income = nonnegative(D(taxable))
  let total = D(0),
    floor = D(0)
  for (const [ceiling, rate] of joint ? rules.jointBrackets.value : rules.singleBrackets.value) {
    const upper = ceiling === null ? income : Decimal.min(income, ceiling)
    total = total.plus(nonnegative(upper.minus(floor)).mul(rate))
    if (ceiling === null || income.lte(ceiling)) break
    floor = D(ceiling)
  }
  return total
}
export function kiddieApplies(s: Scenario, year: number, earned: Decimal.Value): boolean {
  const age = year - Number(s.birthDate.slice(0, 4)) + (s.birthDate.endsWith('01-01') ? 1 : 0)
  const selfSupport = s.childEarnedOverHalfSupport || D(earned).gt(D(s.childSupportAnnual).div(2))
  return (
    age < 18 ||
    (!selfSupport && (age === 18 || (age >= 19 && age < 24 && age < s.studentThroughAge)))
  )
}
export interface TaxContext {
  scenario: Scenario
  year: number
  earned: Decimal
  unearnedYtd: Decimal
  conversion?: boolean
}
export function incomeTax(amount: Decimal, ctx: TaxContext): Decimal {
  const s = ctx.scenario
  if (s.taxMode === 'manual') {
    const age = ctx.year - Number(s.birthDate.slice(0, 4))
    const override = s.conversionTaxByAge.find((r) => age >= r.fromAge && age <= r.throughAge)
    return amount.mul(
      ctx.conversion ? (override?.rate ?? s.conversionTaxRate) : s.withdrawalTaxRate,
    )
  }
  const age = ctx.year - Number(s.birthDate.slice(0, 4))
  const dependent = age < s.studentThroughAge || age < 19
  const deduction = dependent
    ? Decimal.min(
        rules.singleDeduction.value,
        Decimal.max(
          rules.dependentDeduction.value,
          ctx.earned.plus(rules.dependentEarnedAdd.value),
        ),
      )
    : D(rules.singleDeduction.value)
  const before = ctx.unearnedYtd.plus(s.otherUnearnedIncome)
  const allTax = (unearned: Decimal) => {
    const taxable = nonnegative(ctx.earned.plus(unearned).minus(deduction))
    if (!kiddieApplies(s, ctx.year, ctx.earned)) return bracketTax(taxable)
    const parentPart = Decimal.min(
      taxable,
      nonnegative(unearned.minus(rules.kiddieThreshold.value)),
    )
    const childPart = taxable.minus(parentPart)
    return Decimal.max(
      bracketTax(taxable),
      bracketTax(childPart).plus(
        bracketTax(D(s.parentTaxableIncome).plus(parentPart), s.nyJoint).minus(
          bracketTax(s.parentTaxableIncome, s.nyJoint),
        ),
      ),
    )
  }
  return nonnegative(allTax(before.plus(amount)).minus(allTax(before)))
}
