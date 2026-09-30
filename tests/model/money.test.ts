import { describe, expect, it } from 'vitest'
import { D, money, monthlyRate } from '../../src/model/engine/money'
import {
  ageAt,
  getTrumpGrowthPeriodEnd,
  pilotEligible,
  trumpAvailableFrom,
} from '../../src/model/engine/timeline'

describe('Decimal and calendar contract', () => {
  it('geometrically converts effective annual returns', () => {
    expect(D(1).plus(monthlyRate('.05')).pow(12).minus('1.05').abs().lt('1e-25')).toBe(true)
  })
  it('rounds money half up and never adds binary cents', () => {
    expect(money('1.005').toFixed(2)).toBe('1.01')
    expect(D('.1').plus('.2').eq('.3')).toBe(true)
  })
  it('handles January and December growth-period boundaries', () => {
    expect(getTrumpGrowthPeriodEnd('2025-01-01')).toBe('2042-12-31')
    expect(getTrumpGrowthPeriodEnd('2025-12-31')).toBe('2042-12-31')
    expect(trumpAvailableFrom('2025-12-31')).toBe('2043-01-01')
    expect(ageAt('2043-01-01', '2025-12-31')).toBeCloseTo(17.08333, 4)
  })
  it('requires pilot eligibility, including boundary dates', () => {
    expect(pilotEligible('2024-12-31')).toBe(false)
    expect(pilotEligible('2025-01-01')).toBe(true)
    expect(pilotEligible('2028-12-31')).toBe(true)
    expect(pilotEligible('2029-01-01')).toBe(false)
  })
})
