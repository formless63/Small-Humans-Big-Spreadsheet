import Decimal from 'decimal.js'

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }
export const D = (value: Decimal.Value = 0) => new Decimal(value)
export const nonnegative = (value: Decimal) => Decimal.max(0, value)
export const money = (value: Decimal.Value) => D(value).toDecimalPlaces(2)
export const monthlyRate = (annual: Decimal.Value) => D(1).plus(annual).pow(D(1).div(12)).minus(1)
export const serializeMoney = (value: Decimal.Value) => money(value).toFixed(2)
