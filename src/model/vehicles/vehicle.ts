import { iraRules2026 as rules } from '../../data/federal/ira2026'
import type { Scenario } from '../../scenarios/schema'
import { D, Decimal, nonnegative } from '../engine/money'
import { trumpAvailableFrom } from '../engine/timeline'
import { incomeTax, type TaxContext } from '../taxes/ordinaryIncome'
import type { VehicleId, Withdrawal } from '../types'
export interface Lot {
  date: string
  value: Decimal
  basis: Decimal
}
export interface Account {
  id: VehicleId
  balance: Decimal
  basis: Decimal
  lots: Lot[]
  totalContributions: Decimal
  nyDeductions: Decimal
  nyNonqualified: Decimal
  nyAdditions: Decimal
  rolloverLifetime: Decimal
  rothCategories: {
    direct: Decimal
    conversions: { year: number; amount: Decimal }[]
    rollovers: Decimal
  }
}
export function createAccount(id: VehicleId): Account {
  return {
    id,
    balance: D(0),
    basis: D(0),
    lots: [],
    totalContributions: D(0),
    nyDeductions: D(0),
    nyNonqualified: D(0),
    nyAdditions: D(0),
    rolloverLifetime: D(0),
    rothCategories: { direct: D(0), conversions: [], rollovers: D(0) },
  }
}
export function contribute(account: Account, amount: Decimal, date: string, createsBasis = true) {
  account.balance = account.balance.plus(amount)
  account.totalContributions = account.totalContributions.plus(amount)
  if (createsBasis) account.basis = account.basis.plus(amount)
  account.lots.push({ date, value: amount, basis: createsBasis ? amount : D(0) })
}
export function accrue(account: Account, rate: Decimal): Decimal {
  const growth = account.balance.mul(rate)
  account.balance = account.balance.plus(growth)
  for (const lot of account.lots) lot.value = lot.value.mul(D(1).plus(rate))
  return growth
}
export function remove(account: Account, gross: Decimal): Decimal {
  if (gross.lt(0) || gross.gt(account.balance.plus('0.00000001')))
    throw new Error('Invalid account withdrawal')
  gross = Decimal.min(gross, account.balance)
  if (account.balance.isZero()) return D(0)
  const fraction = gross.div(account.balance)
  const basis = Decimal.min(gross, account.basis.mul(fraction))
  account.balance = account.balance.minus(gross)
  // Preserve unrecovered basis under investment losses; full liquidation removes all remaining basis.
  account.basis = account.balance.isZero() ? D(0) : nonnegative(account.basis.minus(basis))
  for (const lot of account.lots) {
    lot.value = lot.value.mul(D(1).minus(fraction))
    lot.basis = lot.basis.mul(D(1).minus(fraction))
  }
  return basis
}
export function nyRecapture(account: Account, gross: Decimal, s: Scenario): Decimal {
  if (!s.nyEnabled) return D(0)
  const addition = nonnegative(
    account.nyNonqualified
      .plus(gross)
      .minus(account.totalContributions.minus(account.nyDeductions))
      .minus(account.nyAdditions),
  )
  return addition.mul(s.nyTaxRate)
}
export interface WithdrawalContext {
  date: string
  qualified: boolean
  stateQualified: boolean
  additionalTaxExemptGross?: Decimal
  age: number
  tax: TaxContext
}
export interface VehicleModule {
  available(account: Account, ctx: WithdrawalContext): boolean
  quote(account: Account, gross: Decimal, ctx: WithdrawalContext): Withdrawal
  sourceIds: string[]
}
const allocation = (account: Account, gross: Decimal) => {
  const basis = account.balance.isZero()
    ? D(0)
    : Decimal.min(gross, account.basis.div(account.balance).mul(gross))
  return { basis, taxable: nonnegative(gross.minus(basis)) }
}
export const vehicleRegistry: Record<VehicleId, VehicleModule> = {
  '529': {
    available: () => true,
    quote: (account, gross, ctx) => {
      const { basis, taxable } = allocation(account, gross)
      const tax = ctx.qualified ? D(0) : incomeTax(taxable, ctx.tax)
      const exemptEarnings = gross.isZero()
        ? D(0)
        : taxable.mul(Decimal.min(gross, ctx.additionalTaxExemptGross ?? 0)).div(gross)
      const penalty = ctx.qualified
        ? D(0)
        : nonnegative(taxable.minus(exemptEarnings)).mul(rules.additionalTaxRate.value)
      const stateRecapture = ctx.stateQualified
        ? D(0)
        : nyRecapture(account, gross, ctx.tax.scenario)
      return {
        gross,
        basis,
        taxable: ctx.qualified ? D(0) : taxable,
        tax,
        penalty,
        stateRecapture,
        net: gross.minus(tax).minus(penalty).minus(stateRecapture),
      }
    },
    sourceIds: ['SRC-IRS-PUB970', 'SRC-NY-IT225'],
  },
  trump: {
    available: (_a, ctx) => ctx.date >= trumpAvailableFrom(ctx.tax.scenario.birthDate),
    quote: (account, gross, ctx) => {
      const { basis, taxable } = allocation(account, gross)
      const tax = incomeTax(taxable, ctx.tax)
      const penalty =
        !ctx.qualified && ctx.age < 59.5 ? taxable.mul(rules.additionalTaxRate.value) : D(0)
      return {
        gross,
        basis,
        taxable,
        tax,
        penalty,
        stateRecapture: D(0),
        net: gross.minus(tax).minus(penalty),
      }
    },
    sourceIds: ['SRC-IRS-8606', 'SRC-IRS-TOPIC557', 'SRC-IRS-PUB970'],
  },
  roth: {
    available: (_a, ctx) => ctx.age >= 59.5,
    quote: (_a, gross) => ({
      gross,
      basis: gross,
      taxable: D(0),
      tax: D(0),
      penalty: D(0),
      stateRecapture: D(0),
      net: gross,
    }),
    sourceIds: ['SRC-IRS-PUB590A'],
  },
}
export function withdrawNet(account: Account, needed: Decimal, ctx: WithdrawalContext): Withdrawal {
  const module = vehicleRegistry[account.id]
  const zero = module.quote(account, D(0), ctx)
  if (needed.lte(0) || !module.available(account, ctx)) return zero
  let lo = D(0),
    hi = account.balance
  const max = module.quote(account, hi, ctx)
  if (max.net.lte(0)) return zero
  if (max.net.gt(needed)) {
    if (ctx.qualified && account.id === '529' && ctx.stateQualified) hi = needed
    else if (ctx.tax.scenario.taxMode === 'manual' && !ctx.additionalTaxExemptGross?.gt(0)) {
      const ratio = account.balance.isZero()
        ? D(0)
        : Decimal.min(1, account.basis.div(account.balance))
      const earningsShare = D(1).minus(ratio)
      const taxRate = account.id === '529' && ctx.qualified ? 0 : ctx.tax.scenario.withdrawalTaxRate
      const penaltyRate =
        (account.id === '529' && !ctx.qualified) ||
        (account.id === 'trump' && !ctx.qualified && ctx.age < 59.5)
          ? rules.additionalTaxRate.value
          : 0
      const netRate = D(1).minus(earningsShare.mul(D(taxRate).plus(penaltyRate)))
      const stateRate =
        account.id === '529' && !ctx.stateQualified && ctx.tax.scenario.nyEnabled
          ? D(ctx.tax.scenario.nyTaxRate)
          : D(0)
      const threshold = nonnegative(
        account.totalContributions
          .minus(account.nyDeductions)
          .minus(account.nyNonqualified)
          .plus(account.nyAdditions),
      )
      hi =
        needed.lte(threshold.mul(netRate)) || stateRate.isZero()
          ? needed.div(netRate)
          : needed.minus(stateRate.mul(threshold)).div(netRate.minus(stateRate))
      hi = Decimal.min(nonnegative(hi), account.balance)
    } else {
      for (let i = 0; i < 48; i++) {
        const mid = lo.plus(hi).div(2)
        if (module.quote(account, mid, ctx).net.lt(needed)) lo = mid
        else hi = mid
      }
    }
  }
  const result = module.quote(account, hi, ctx)
  remove(account, result.gross)
  if (account.id === '529' && !ctx.stateQualified) {
    account.nyNonqualified = account.nyNonqualified.plus(result.gross)
    if (ctx.tax.scenario.nyTaxRate > 0)
      account.nyAdditions = account.nyAdditions.plus(
        result.stateRecapture.div(ctx.tax.scenario.nyTaxRate),
      )
  }
  return result
}
