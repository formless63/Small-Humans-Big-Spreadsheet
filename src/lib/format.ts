import { Decimal } from '../model/engine/money'
export const currency = (value: string | number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value))
export const dollars = (value: string | number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value))
export const percent = (value: number) => `${(value * 100).toFixed(1)}%`
export const sumMoney = (...values: string[]) =>
  values.reduce((a, v) => a.plus(v), new Decimal(0)).toFixed(2)
