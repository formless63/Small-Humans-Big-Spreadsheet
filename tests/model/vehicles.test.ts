import { describe, expect, it } from 'vitest'
import { D } from '../../src/model/engine/money'
import {
  accrue,
  contribute,
  createAccount,
  vehicleRegistry,
  type WithdrawalContext,
  withdrawNet,
} from '../../src/model/vehicles/vehicle'
import { defaultScenario } from '../../src/scenarios/schema'

const context = (qualified = true, state = true): WithdrawalContext => ({
  date: '2044-10-01',
  age: 20,
  qualified,
  stateQualified: state,
  tax: {
    scenario: { ...defaultScenario, nyEnabled: false, withdrawalTaxRate: 0.2 },
    year: 2044,
    earned: D(0),
    unearnedYtd: D(0),
  },
})
const grown = (id: '529' | 'trump') => {
  const a = createAccount(id)
  contribute(a, D(10000), '2026-10-01')
  accrue(a, D(1))
  return a
}
describe('vehicle tax and basis bookkeeping', () => {
  it('529 qualified withdrawals are tax-free and allocate basis', () => {
    const a = grown('529')
    const w = withdrawNet(a, D(10000), context())
    expect(w.gross.eq(10000)).toBe(true)
    expect(w.basis.eq(5000)).toBe(true)
    expect(w.tax.isZero()).toBe(true)
    expect(w.penalty.isZero()).toBe(true)
    expect(a.basis.eq(5000)).toBe(true)
  })
  it('529 nonqualified withdrawal taxes and penalizes only earnings', () => {
    const a = grown('529')
    const w = withdrawNet(a, D(8500), context(false, false))
    expect(w.gross.toFixed(2)).toBe('10000.00')
    expect(w.tax.toFixed(2)).toBe('1000.00')
    expect(w.penalty.toFixed(2)).toBe('500.00')
    expect(w.net.toFixed(2)).toBe('8500.00')
  })
  it('IRA higher-education exception removes additional tax, not ordinary tax', () => {
    const a = grown('trump')
    const w = withdrawNet(a, D(9000), context())
    expect(w.gross.toFixed(2)).toBe('10000.00')
    expect(w.tax.toFixed(2)).toBe('1000.00')
    expect(w.penalty.isZero()).toBe(true)
  })
  it('IRA nonqualified early withdrawals impose earnings additional tax', () => {
    const a = grown('trump')
    const w = withdrawNet(a, D(8500), context(false))
    expect(w.tax.toFixed(2)).toBe('1000.00')
    expect(w.penalty.toFixed(2)).toBe('500.00')
  })
  it('prohibits ordinary Trump distributions during growth period', () => {
    const a = grown('trump')
    const ctx = { ...context(), date: '2030-10-01', age: 6 }
    expect(vehicleRegistry.trump.available(a, ctx)).toBe(false)
    expect(withdrawNet(a, D(5000), ctx).gross.isZero()).toBe(true)
    expect(a.balance.eq(20000)).toBe(true)
  })
  it('employer/pilot contributions create no basis', () => {
    const a = createAccount('trump')
    contribute(a, D(1000), '2026-10-01', false)
    contribute(a, D(5000), '2026-10-01')
    expect(a.basis.eq(5000)).toBe(true)
    expect(a.balance.eq(6000)).toBe(true)
  })
  it('preserves a loss without negative taxable earnings', () => {
    const a = createAccount('529')
    contribute(a, D(10000), '2026-10-01')
    accrue(a, D('-0.5'))
    const w = withdrawNet(a, D(5000), context(false))
    expect(w.tax.isZero()).toBe(true)
    expect(w.penalty.isZero()).toBe(true)
    expect(a.balance.isZero()).toBe(true)
    expect(a.basis.isZero()).toBe(true)
  })
  it('implements cumulative NY worksheet recapture, not tax on all basis', () => {
    const a = grown('529')
    a.nyDeductions = D(5000)
    const ctx = context(false, false)
    ctx.tax.scenario = { ...ctx.tax.scenario, nyEnabled: true, nyTaxRate: 0.1 }
    const first = vehicleRegistry['529'].quote(a, D(4000), ctx)
    expect(first.stateRecapture.eq(0)).toBe(true)
    a.nyNonqualified = D(4000)
    const next = vehicleRegistry['529'].quote(a, D(4000), ctx)
    expect(next.stateRecapture.eq(300)).toBe(true)
  })
})

it('a limited statutory 529 additional-tax exception does not remove ordinary tax', () => {
  const a = grown('529')
  const ctx = { ...context(false, false), additionalTaxExemptGross: D(5000) }
  const w = withdrawNet(a, D(8750), ctx)
  expect(w.gross.toFixed(2)).toBe('10000.00')
  expect(w.tax.toFixed(2)).toBe('1000.00')
  expect(w.penalty.toFixed(2)).toBe('250.00')
})
