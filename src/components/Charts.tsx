import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currency, sumMoney } from '../lib/format'
import type { SimulationResult } from '../model/types'

const colors = ['#2b6953', '#b9683b', '#536c99']
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #deddd3',
  background: '#fffefa',
  fontSize: 12,
}
const tick = (n: number) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}m` : `$${Math.round(n / 1000)}k`
export function Charts({
  results,
  retirementAge,
}: {
  results: SimulationResult[]
  retirementAge: number
}) {
  const annual = results[0].timeline.filter(
    (p, i, all) => i === 0 || p.date.endsWith('-01-01') || i === all.length - 1,
  )
  const lifetime = annual.map((p) => ({
    age: Number(p.age.toFixed(1)),
    ...Object.fromEntries(
      results.map((r) => {
        const t = r.timeline.find((t) => t.date === p.date)!
        return [
          r.name,
          Number(sumMoney(t.plan529, t.traditional, t.roth, t.flexible, t.parentRetirement)),
        ]
      }),
    ),
  }))
  const funding = results.map((r) => ({
    name: r.name,
    Aid: Number(r.education.aid),
    Accounts: Number(r.education.accounts),
    Child: Number(r.education.child),
    Federal: Number(r.education.federal),
    Gap: Number(r.education.gap),
    Unfunded: Number(r.education.unfunded),
  }))
  const retirement = results.map((r, i) => ({
    name: r.name,
    value: Number(r.retirement.afterTaxChildhood),
    fill: colors[i % colors.length],
  }))
  return (
    <div className="chart-grid">
      <section className="chart-panel wide" aria-labelledby="lifetime-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / The long view</p>
            <h3 id="lifetime-heading">A lifetime of compounding</h3>
          </div>
          <span className="badge">Real 2026 dollars</span>
        </div>
        <p className="muted">
          Childhood-funded account balances, including parent-retirement savings, before
          hypothetical liquidation taxes. Wage-funded saving is separate. Debt is shown in the table
          below.
        </p>
        <div
          className="chart"
          role="img"
          aria-label="Lifetime account balances by strategy. Equivalent annual values follow in a table."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lifetime} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e4e3db" />
              <XAxis
                dataKey="age"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                label={{ value: 'Child’s age', position: 'insideBottom', offset: -2 }}
              />
              <YAxis tickFormatter={tick} tickLine={false} axisLine={false} width={64} />
              <Tooltip
                formatter={(v) => currency(Number(v))}
                labelFormatter={(v) => `Age ${v}`}
                contentStyle={tooltipStyle}
              />
              <Legend verticalAlign="top" iconType="plainline" />
              {results.map((r, i) => (
                <Line
                  key={r.id}
                  name={r.name}
                  dataKey={r.name}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary>Annual balances table</summary>
          <div className="table-scroll">
            <table>
              <caption>Account balances and debt in real 2026 dollars</caption>
              <thead>
                <tr>
                  <th>Age</th>
                  {results.map((r) => (
                    <th key={r.id}>{r.name} assets / debt</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {annual.map((p) => (
                  <tr key={p.date}>
                    <th>{p.age.toFixed(1)}</th>
                    {results.map((r) => {
                      const t = r.timeline.find((t) => t.date === p.date)!
                      return (
                        <td key={r.id}>
                          {currency(
                            sumMoney(
                              t.plan529,
                              t.traditional,
                              t.roth,
                              t.flexible,
                              t.parentRetirement,
                            ),
                          )}{' '}
                          / {currency(t.debt)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="chart-panel">
        <p className="eyebrow">02 / Every dollar accounted for</p>
        <h3>How education gets paid</h3>
        <p className="muted">Share of total expenses. Loans are borrowing, never aid.</p>
        <div
          className="chart small"
          role="img"
          aria-label="Education funding share by strategy; exact amounts are in the comparison table."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funding}
              stackOffset="expand"
              margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(n) => `${Math.round(n * 100)}%`}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip formatter={(v) => currency(Number(v))} contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              {(['Aid', 'Accounts', 'Child', 'Federal', 'Gap', 'Unfunded'] as const).map(
                (key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="funding"
                    fill={['#97b7a0', '#2b6953', '#536c99', '#d0aa64', '#b9683b', '#a83c49'][i]}
                    isAnimationActive={false}
                  />
                ),
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="chart-panel">
        <p className="eyebrow">03 / What childhood saving leaves</p>
        <h3>At age {retirementAge}, after taxes</h3>
        <p className="muted">Childhood strategy only. Career saving is reported separately.</p>
        <div
          className="chart small"
          role="img"
          aria-label={`After-tax childhood-funded assets at age ${retirementAge}; exact amounts are in the comparison table.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={retirement} margin={{ top: 16, right: 12, left: 10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e4e3db" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={tick} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v) => currency(Number(v))} contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                name="After-tax assets"
                fill="#2b6953"
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
