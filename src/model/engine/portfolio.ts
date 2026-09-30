import type {
  AccountYear,
  LedgerEvent,
  PortfolioAccount,
  PortfolioSnapshot,
  PortfolioYear,
} from '../types'
import { D } from './money'

export const portfolioAccounts: PortfolioAccount[] = [
  '529',
  'trump',
  'roth',
  'brokerage',
  'custodial',
  'cash',
  'childRoth',
  'parentRoth',
  'wageRoth',
  'career',
]
export const accountLabels: Record<PortfolioAccount, string> = {
  '529': 'Education savings (529)',
  trump: 'Trump / traditional IRA',
  roth: 'Roth from transfers',
  brokerage: 'Parent brokerage',
  custodial: 'Child custodial investments',
  cash: 'Cash / savings',
  childRoth: 'Child Roth — parent funded',
  parentRoth: 'Parent Roth retirement',
  wageRoth: 'Child Roth — wage funded',
  career: 'Career retirement savings',
}
export const accountPurpose: Record<PortfolioAccount, string> = {
  '529': 'Restricted education / eligible rollover',
  trump: 'Child retirement; education tax rules apply',
  roth: 'Child retirement; model preserves transferred Roth',
  brokerage: 'Parent owned / flexible',
  custodial: 'Child owned / flexible',
  cash: 'Parent owned / liquidity terms apply',
  childRoth: 'Child retirement; contribution withdrawal rules apply',
  parentRoth: 'Parent retirement / parent owned',
  wageRoth: 'Child retirement / earned-income funded',
  career: 'Separate career-funded retirement illustration',
}

// Reporting is derived from the actual ledger and exact account snapshots, never a second simulation.
export function portfolioYears(
  snapshots: PortfolioSnapshot[],
  ledger: LedgerEvent[],
): PortfolioYear[] {
  const years = new Map<
    number,
    {
      first: PortfolioSnapshot
      last: PortfolioSnapshot
      rows: Map<PortfolioAccount, Record<string, ReturnType<typeof D>>>
    }
  >()
  let previous = snapshots[0]
  for (const point of snapshots.slice(1)) {
    const year = Number(point.date.slice(0, 4))
    const existing = years.get(year)
    if (existing) existing.last = point
    else
      years.set(year, {
        first: previous,
        last: point,
        rows: new Map(
          portfolioAccounts.map((id) => [
            id,
            {
              contributions: D(0),
              growth: D(0),
              transfersIn: D(0),
              transfersOut: D(0),
              spending: D(0),
              tax: D(0),
            },
          ]),
        ),
      })
    previous = point
  }
  for (const e of ledger) {
    const group = years.get(Number(e.date.slice(0, 4)))
    if (!group) continue
    const amount = D(e.amountExact ?? e.amount)
    const row = group.rows.get(e.vehicleId as PortfolioAccount)
    if (e.category === 'conversion' || e.category === 'rollover') {
      const source = group.rows.get(e.category === 'conversion' ? 'trump' : '529')!
      source.transfersOut = source.transfersOut.plus(amount)
      source.tax = source.tax.plus(e.taxFromAccountExact ?? 0)
      group.rows.get('roth')!.transfersIn = group.rows.get('roth')!.transfersIn.plus(amount)
    } else if (row) {
      if (e.category === 'contribution' || e.category === 'career')
        row.contributions = row.contributions.plus(amount)
      if (e.category === 'growth') row.growth = row.growth.plus(amount)
      if (e.category === 'tax') row.tax = row.tax.plus(amount)
      if (e.category === 'withdrawal') {
        const tax = D(e.taxExact ?? e.tax ?? 0).plus(e.penaltyExact ?? e.penalty ?? 0)
        row.spending = row.spending.plus(amount.minus(tax))
        row.tax = row.tax.plus(tax)
      }
    }
  }
  return [...years].map(([year, group]) => ({
    year,
    age: group.last.age,
    debt: group.last.debt,
    accounts: portfolioAccounts.map(
      (account): AccountYear =>
        ({
          account,
          opening: group.first.balances[account],
          closing: group.last.balances[account],
          ...Object.fromEntries(
            Object.entries(group.rows.get(account)!).map(([key, value]) => [key, value.toString()]),
          ),
        }) as AccountYear,
    ),
  }))
}
