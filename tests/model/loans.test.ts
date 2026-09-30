import { describe, expect, it } from 'vitest'
import { D } from '../../src/model/engine/money'
import { addMonths } from '../../src/model/engine/timeline'
import { amortizingPayment, originateLoan, tickLoan } from '../../src/model/vehicles/loans'

describe('loan tranches', () => {
  it('handles zero-interest amortization', () => {
    expect(amortizingPayment(12000, 0, 120).eq(100)).toBe(true)
  })
  it('uses the amortizing loan formula', () => {
    expect(amortizingPayment(10000, '.06', 120).toFixed(2)).toBe('111.02')
  })
  it('subsidizes in-school/grace interest', () => {
    const l = originateLoan('sub', 'federal', D(10000), 0.06, '2044-09-01', '2049-03-01', 120, true)
    expect(tickLoan(l, '2045-01-01').interest.isZero()).toBe(true)
    expect(l.accrued.isZero()).toBe(true)
  })
  it('unsubsidized school interest is simple and capitalizes at repayment', () => {
    const l = originateLoan('unsub', 'federal', D(10000), 0.06, '2044-09-01', '2049-03-01', 120)
    for (let n = 0; n < 12; n++) tickLoan(l, addMonths('2044-09-01', n))
    expect(l.accrued.eq(600)).toBe(true)
    tickLoan(l, '2049-03-01')
    expect(l.started).toBe(true)
    expect(l.accrued.isZero()).toBe(true)
    expect(l.payment.toFixed(2)).toBe(amortizingPayment(10600, 0.06, 120).toFixed(2))
  })
  it('pays off at term and never makes negative principal', () => {
    const l = originateLoan('repay', 'gap', D(10000), 0.09, '2044-09-01', '2044-09-01', 120)
    for (let n = 0; n < 121; n++) {
      const out = tickLoan(l, addMonths('2044-09-01', n))
      expect(out.payment.gte(0)).toBe(true)
      expect(l.balance.gte(0)).toBe(true)
    }
    expect(l.balance.isZero()).toBe(true)
    expect(l.payoffDate).toBe('2054-08-01')
    expect(l.repaid.minus(10000).minus(l.interest).abs().lt('0.000001')).toBe(true)
  })
})
