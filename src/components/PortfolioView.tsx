import { type ReactNode, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currency, dollars, sumMoney } from '../lib/format'
import { accountLabels, accountPurpose, portfolioAccounts } from '../model/engine/portfolio'
import type { PortfolioAccount, SimulationResult } from '../model/types'
import type { Scenario } from '../scenarios/schema'
import { SourceLink } from './Inputs'

const palette = [
  '#2b6953',
  '#b9683b',
  '#536c99',
  '#917331',
  '#7e5596',
  '#427e87',
  '#67792d',
  '#a34d6a',
  '#796555',
  '#4774a2',
]
const axisMoney = (v: number) =>
  Math.abs(v) >= 1000000 ? `$${(v / 1000000).toFixed(1)}m` : `$${Math.round(v / 1000)}k`
const chartStyle = {
  background: '#fffefa',
  border: '1px solid #deddd3',
  borderRadius: 12,
  fontSize: 12,
}
function Scrollable({ children }: { children: ReactNode }) {
  return (
    <section
      className="table-scroll"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Wide financial tables need keyboard scrolling (WCAG 2.1.1).
      tabIndex={0}
      aria-label="Scrollable account and transfer data"
    >
      {children}
    </section>
  )
}
export function PortfolioView({
  result: r,
  scenario: s,
  timing,
}: {
  result: SimulationResult
  scenario: Scenario
  timing: { name: string; result: SimulationResult }[]
}) {
  const [yearChoice, setYear] = useState<number>(),
    [hidden, setHidden] = useState<PortfolioAccount[]>([]),
    [chartRange, setChartRange] = useState<'education' | 'lifetime'>('education')
  const schoolCutoff = Number(s.birthDate.slice(0, 4)) + s.educationStartAge + s.educationYears + 3
  const selectYear = (value: number) => {
    setYear(value)
    if (value > schoolCutoff) setChartRange('lifetime')
  }
  const years = r.portfolioYears
  const year =
    years.find((v) => v.year === yearChoice) ??
    years.find((v) => v.year === Number(s.birthDate.slice(0, 4)) + s.educationStartAge) ??
    years[0]
  const active = portfolioAccounts.filter((id) =>
    years.some((y) => {
      const a = y.accounts.find((a) => a.account === id)!
      return Number(a.closing) !== 0 || Number(a.contributions) !== 0 || Number(a.transfersIn) !== 0
    }),
  )
  const visible = active.filter((id) => !hidden.includes(id))
  const balances = years.map((y) => ({
    year: y.year,
    debt: Number(y.debt),
    total: Number(sumMoney(...y.accounts.map((a) => a.closing))),
    ...Object.fromEntries(y.accounts.map((a) => [a.account, Number(a.closing)])),
  }))
  const flows = years.map((y) => ({
    year: y.year,
    Deposits: Number(sumMoney(...y.accounts.map((a) => a.contributions))),
    'Growth / loss': Number(sumMoney(...y.accounts.map((a) => a.growth))),
    'Education / loan drawdowns': -Number(sumMoney(...y.accounts.map((a) => a.spending))),
    'Account taxes / penalties': -Number(sumMoney(...y.accounts.map((a) => a.tax))),
    'Transfers in': Number(sumMoney(...y.accounts.map((a) => a.transfersIn))),
    'Transfers out': -Number(sumMoney(...y.accounts.map((a) => a.transfersOut))),
  }))
  const transfers = r.transfers.filter((t) => Number(t.date.slice(0, 4)) === year.year)
  const totals = (ids: PortfolioAccount[]) =>
    sumMoney(...year.accounts.filter((a) => ids.includes(a.account)).map((a) => a.closing))
  const transferTable = (events: SimulationResult['transfers'], caption: string) => (
    <Scrollable>
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Date / age</th>
            <th>Move</th>
            <th>Leaves source</th>
            <th>Taxable portion</th>
            <th>Tax / penalty</th>
            <th>Reaches Roth</th>
            <th>Earned income</th>
            <th>Payer / constraints</th>
          </tr>
        </thead>
        <tbody>
          {events.map((t, i) => (
            <tr key={`${t.date}-${t.from}-${i}`}>
              <th>
                {t.date} / {t.age.toFixed(1)}
              </th>
              <td>{t.from === 'trump' ? 'Trump → Roth' : '529 → Roth'}</td>
              <td>{dollars(t.gross)}</td>
              <td>{dollars(t.taxable)}</td>
              <td>{dollars(sumMoney(t.tax, t.penalty))}</td>
              <td>{dollars(t.net)}</td>
              <td>{currency(t.earned)}</td>
              <td className="flow-explanation">
                <strong>{t.payer}</strong>
                <br />
                {t.reasons.length ? t.reasons.join(' ') : 'Requested move completed.'}
                <br />
                <SourceLink id={t.from === 'trump' ? 'SRC-IRS-8606' : 'SRC-IRS-529-TOPIC313'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scrollable>
  )
  return (
    <section className="planning-panel portfolio-panel" aria-labelledby="portfolio-heading">
      <p className="eyebrow">Your selected plan / balances and money moving</p>
      <h3 id="portfolio-heading">Where the money lives—and where it goes</h3>
      <p>
        {r.name}: account balances before hypothetical liquidation taxes. Moving money between
        accounts creates no new savings. Any account-funded tax or penalty reduces combined assets.
        These views include parent retirement and wage-funded assets, which remain separate in the
        childhood-strategy comparison.
      </p>
      <fieldset className="account-toggles">
        <legend>Accounts shown in the balance chart</legend>
        {active.map((id) => (
          <label className="check" key={id}>
            <input
              type="checkbox"
              checked={!hidden.includes(id)}
              onChange={() =>
                setHidden((all) => (all.includes(id) ? all.filter((a) => a !== id) : [...all, id]))
              }
            />
            <span>{accountLabels[id]}</span>
          </label>
        ))}
      </fieldset>
      <label className="field chart-horizon">
        <span>Chart horizon</span>
        <select
          value={chartRange}
          onChange={(e) => setChartRange(e.target.value as 'education' | 'lifetime')}
        >
          <option value="education">Childhood, education and early adulthood</option>
          <option value="lifetime">Full lifetime through retirement</option>
        </select>
      </label>
      <p className="muted">
        Annual closing balances. Education and transfers within a year appear in the breakdown
        below. Select a year to inspect it; hiding a chart series does not change your plan or
        totals.
      </p>
      <div
        className="chart"
        role="img"
        aria-label="Selected-plan account makeup and debt over time. Exact values follow in the yearly breakdown."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={balances.filter((v) => chartRange === 'lifetime' || v.year <= schoolCutoff)}
            margin={{ top: 24, right: 18, left: 4, bottom: 4 }}
            onClick={(state) => {
              if (state.activeLabel) selectYear(Number(state.activeLabel))
            }}
          >
            <CartesianGrid strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="year" minTickGap={32} />
            <YAxis tickFormatter={axisMoney} width={66} />
            <ReferenceLine x={year.year} stroke="#405b47" strokeDasharray="2 4" />
            <Tooltip
              formatter={(v) => currency(Number(v))}
              labelFormatter={(v) => `End of ${v}`}
              contentStyle={chartStyle}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {visible.map((id) => (
              <Area
                key={id}
                dataKey={id}
                name={accountLabels[id]}
                stackId="accounts"
                fill={palette[portfolioAccounts.indexOf(id)]}
                stroke={palette[portfolioAccounts.indexOf(id)]}
                fillOpacity={0.65}
                isAnimationActive={false}
              />
            ))}
            <Line
              dataKey="debt"
              name="Education debt (owed)"
              stroke="#9b2536"
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            {visible.length === active.length &&
              balances
                .filter((v) => chartRange === 'lifetime' || v.year <= schoolCutoff)
                .filter((v) =>
                  r.transfers.some((t) => t.date.startsWith(String(v.year)) && Number(t.net) > 0),
                )
                .map((v) => (
                  <ReferenceDot
                    key={v.year}
                    x={v.year}
                    y={v.total}
                    r={4}
                    fill="#243b30"
                    stroke="#fff"
                    label={{ value: '↔', position: 'top', fontSize: 13 }}
                  />
                ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="muted">
        ↔ marks a year with a completed transfer. The dashed line is debt owed, not an asset. Chart
        clicks and the year selector open the same breakdown.
      </p>
      <div className="portfolio-year-control">
        <label className="field">
          <span>Inspect calendar year</span>
          <select value={year.year} onChange={(e) => selectYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y.year} value={y.year}>
                {y.year} · child age {y.age.toFixed(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Move through the plan</span>
          <input
            type="range"
            min={years[0].year}
            max={years.at(-1)!.year}
            value={year.year}
            onChange={(e) => selectYear(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="portfolio-totals" aria-live="polite">
        <div>
          <span>All modeled assets</span>
          <strong>{currency(totals(portfolioAccounts))}</strong>
        </div>
        <div>
          <span>Education savings (restricted)</span>
          <strong>{currency(totals(['529']))}</strong>
        </div>
        <div>
          <span>Flexible accounts</span>
          <strong>{currency(totals(['brokerage', 'custodial', 'cash']))}</strong>
        </div>
        <div>
          <span>Child retirement · parent funded / transfers</span>
          <strong>{currency(totals(['trump', 'roth', 'childRoth']))}</strong>
        </div>
        <div>
          <span>Child career / wage funded</span>
          <strong>{currency(totals(['career', 'wageRoth']))}</strong>
        </div>
        <div>
          <span>Parent retirement</span>
          <strong>{currency(totals(['parentRoth']))}</strong>
        </div>
        <div>
          <span>Education debt owed</span>
          <strong>{currency(year.debt)}</strong>
        </div>
      </div>
      <p className="muted">
        Account purpose and ownership differ. Total assets are not a spendable tuition balance.
        Retirement withdrawals, education qualification, ownership and liquidity restrictions still
        apply.
      </p>
      <Scrollable>
        <table>
          <caption>{year.year}: account balances and flows</caption>
          <thead>
            <tr>
              <th>Account / purpose</th>
              <th>Opening</th>
              <th>New deposits</th>
              <th>Growth / loss</th>
              <th>Transfers in</th>
              <th>Transfers out</th>
              <th>Education / loan spending</th>
              <th>Account tax / penalty</th>
              <th>Closing</th>
            </tr>
          </thead>
          <tbody>
            {year.accounts
              .filter((a) => active.includes(a.account))
              .map((a) => (
                <tr key={a.account}>
                  <th className="flow-explanation">
                    {accountLabels[a.account]}
                    <small>{accountPurpose[a.account]}</small>
                  </th>
                  {[
                    a.opening,
                    a.contributions,
                    a.growth,
                    a.transfersIn,
                    a.transfersOut,
                    a.spending,
                    a.tax,
                    a.closing,
                  ].map((v, i) => (
                    <td key={i}>{dollars(v)}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </Scrollable>
      <p className="muted">
        Opening + deposits + growth + transfers in − transfers out − spending − account
        taxes/penalties = closing (rounding to cents may differ by a cent). Conversion taxes paid
        from child earnings appear in the transfer table, not as account outflows. Hypothetical
        retirement liquidation is a valuation, not a drawdown.
      </p>
      {transfers.length ? (
        transferTable(transfers, `${year.year}: transfers and eligibility checks`)
      ) : (
        <p>
          No transfer was attempted in {year.year}. Choose another year or adjust “Move money
          later.”
        </p>
      )}
      <details>
        <summary>All transfer dates and blocked attempts ({r.transfers.length})</summary>
        {r.transfers.length ? (
          transferTable(r.transfers, 'Full transfer schedule and constraints')
        ) : (
          <p>No transfers scheduled, or no source funds remain at the scheduled dates.</p>
        )}
      </details>
      <details>
        <summary>Annual money flows and account balances</summary>
        <p className="muted">
          Positive bars add to accounts; negative bars leave them. Transfers in and out cancel
          across the portfolio. Tax/penalty is separate from net education or loan spending. Growth
          includes reinvested dividends, interest and modeled market losses.
        </p>
        <div
          className="chart"
          role="img"
          aria-label="Annual contributions, growth, drawdowns, taxes and internal transfers. Equivalent values follow in a table."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={flows.filter((v) => chartRange === 'lifetime' || v.year <= schoolCutoff)}
              stackOffset="sign"
              margin={{ top: 15, right: 18, left: 4, bottom: 4 }}
              onClick={(state) => {
                if (state.activeLabel) selectYear(Number(state.activeLabel))
              }}
            >
              <CartesianGrid strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="year" minTickGap={32} />
              <YAxis tickFormatter={axisMoney} width={66} />
              <Tooltip formatter={(v) => currency(Number(v))} contentStyle={chartStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {[
                'Deposits',
                'Growth / loss',
                'Education / loan drawdowns',
                'Account taxes / penalties',
                'Transfers in',
                'Transfers out',
              ].map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="flows"
                  fill={['#2b6953', '#536c99', '#b9683b', '#9b2536', '#7e5596', '#796555'][i]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Scrollable>
          <table>
            <caption>Annual portfolio flow totals</caption>
            <thead>
              <tr>
                <th>Year</th>
                <th>Deposits</th>
                <th>Growth / loss</th>
                <th>Net spending</th>
                <th>Account tax / penalty</th>
                <th>Moved between accounts</th>
                <th>Closing assets / debt</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((f, i) => (
                <tr key={f.year}>
                  <th>
                    <button
                      type="button"
                      onClick={() => selectYear(f.year)}
                      aria-label={`Inspect year ${f.year}`}
                    >
                      {f.year}
                    </button>
                  </th>
                  <td>{dollars(f.Deposits)}</td>
                  <td>{dollars(f['Growth / loss'])}</td>
                  <td>{dollars(-f['Education / loan drawdowns'])}</td>
                  <td>{dollars(-f['Account taxes / penalties'])}</td>
                  <td>{dollars(f['Transfers in'])}</td>
                  <td>
                    {dollars(balances[i].total)} / {dollars(balances[i].debt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scrollable>
      </details>
      {timing.length > 0 && (
        <details open>
          <summary>Same deposits and mix, different transfer timing</summary>
          <p className="muted">
            Each alternative keeps your budget, account allocation, tax assumptions and education
            reserve. It changes the transfer policy only. Annual spread uses your fixed amount (
            {currency(s.conversionAnnual)}). Early moves can change education funding and debt;
            these are comparisons, not recommendations.
          </p>
          <Scrollable>
            <table>
              <caption>Transfer timing comparison for the selected mix</caption>
              <thead>
                <tr>
                  <th>Transfer policy</th>
                  <th>Net Trump → Roth</th>
                  <th>Conversion tax</th>
                  <th>529 → Roth</th>
                  <th>Graduation debt</th>
                  <th>Unfunded education</th>
                  <th>After-tax childhood assets at {s.retirementAge}</th>
                </tr>
              </thead>
              <tbody>
                {[{ name: 'Your selected transfer policy', result: r }, ...timing].map(
                  ({ name, result }) => (
                    <tr key={name}>
                      <th>{name}</th>
                      {[
                        result.conversions.converted,
                        result.conversions.taxes,
                        result.conversions.rollover,
                        result.debt.graduationBalance,
                        result.education.unfunded,
                        result.retirement.afterTaxChildhood,
                      ].map((v, i) => (
                        <td key={i}>{currency(v)}</td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </Scrollable>
        </details>
      )}
    </section>
  )
}
