import { iraRules2026 as rules } from '../../data/federal/ira2026'
import type { Scenario } from '../../scenarios/schema'
import { D, Decimal, nonnegative } from '../engine/money'
import { addMonths, ageAt } from '../engine/timeline'
import { incomeTax } from '../taxes/ordinaryIncome'
import type { Withdrawal } from '../types'
import type { Account, VehicleModule, WithdrawalContext } from './vehicle'

const noTax = (gross: Decimal, basis = gross): Withdrawal => ({
  gross,
  basis,
  taxable: D(0),
  tax: D(0),
  penalty: D(0),
  stateRecapture: D(0),
  net: gross,
})
export function parentAgeAt(s: Scenario, date: string) {
  return s.parentAge + ageAt(date, s.birthDate) - ageAt(s.asOf, s.birthDate)
}
const taxableModule = (child: boolean): VehicleModule => ({
  available: () => true,
  quote: (a, gross, ctx) => {
    const fraction = a.balance.isZero() ? D(0) : gross.div(a.balance)
    const basis = a.basis.mul(fraction),
      s = ctx.tax.scenario
    let shortGain = D(0),
      longGain = D(0)
    for (const lot of a.lots) {
      const gain = lot.value.minus(lot.basis).mul(fraction)
      if (addMonths(lot.date, 12) >= ctx.date) shortGain = shortGain.plus(gain)
      else longGain = longGain.plus(gain)
    }
    // Offset opposite holding-period losses inside this proportional sale.
    // No refund or future carryforward is assumed for a net capital loss.
    const shortTaxable = nonnegative(shortGain.plus(Decimal.min(0, longGain)))
    const longTaxable = nonnegative(longGain.plus(Decimal.min(0, shortGain)))
    const taxable = shortTaxable.plus(longTaxable)
    const longRate = child ? s.childCapitalGainsRate : s.parentCapitalGainsRate
    const shortTax = child
      ? incomeTax(shortTaxable, ctx.tax)
      : shortTaxable.mul(s.parentOrdinaryRate)
    const tax = shortTax.plus(longTaxable.mul(longRate)).plus(taxable.mul(s.stateInvestmentTaxRate))
    return { ...noTax(gross, basis), taxable, tax, net: gross.minus(tax) }
  },
  sourceIds: ['SRC-IRS-PUB550', 'SRC-IRS-CAPITAL', 'SRC-IRS-8615'],
})
const directRoth = (parent: boolean): VehicleModule => ({
  available: (_a, ctx) =>
    parent ? ctx.tax.scenario.parentRothEducation : ctx.tax.scenario.childRothEducation,
  quote: (a, gross, ctx: WithdrawalContext) => {
    const basis = Decimal.min(gross, a.basis),
      earnings = nonnegative(gross.minus(basis)),
      s = ctx.tax.scenario
    const age = parent ? parentAgeAt(s, ctx.date) : ctx.age
    const firstYear = a.lots.length
      ? Number(a.lots[0].date.slice(0, 4))
      : Number(ctx.date.slice(0, 4))
    const qualified =
      age >= rules.qualifiedRothAge.value &&
      Number(ctx.date.slice(0, 4)) >= firstYear + rules.rothTaxYears.value
    const taxable = qualified ? D(0) : earnings
    const tax = parent ? taxable.mul(s.parentOrdinaryRate) : incomeTax(taxable, ctx.tax)
    const penalty =
      age < rules.qualifiedRothAge.value && !ctx.qualified
        ? taxable.mul(rules.additionalTaxRate.value)
        : D(0)
    return { ...noTax(gross, basis), taxable, tax, penalty, net: gross.minus(tax).minus(penalty) }
  },
  sourceIds: ['SRC-IRS-PUB590A', 'SRC-IRS-PUB590B', 'SRC-IRS-TOPIC557'],
})
export const flexibleVehicles = {
  brokerage: taxableModule(false),
  custodial: taxableModule(true),
  cash: {
    available: () => true,
    quote: (_a: Account, gross: Decimal, ctx: WithdrawalContext) => {
      const penalty =
        ctx.tax.scenario.cashKind === 'cd' && ctx.age < ctx.tax.scenario.cashMaturityAge
          ? gross.mul(ctx.tax.scenario.cashEarlyWithdrawalRate)
          : D(0)
      return { ...noTax(gross), penalty, net: gross.minus(penalty) }
    },
    sourceIds: ['SRC-IRS-PUB550'],
  },
  childRoth: directRoth(false),
  wageRoth: directRoth(false),
  parentRoth: directRoth(true),
} satisfies Record<string, VehicleModule>
