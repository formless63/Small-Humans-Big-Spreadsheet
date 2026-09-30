import { Download } from 'lucide-react'
import { useState } from 'react'
import { sourceById } from '../data/sources'
import { dollars } from '../lib/format'
import type { SimulationResult } from '../model/types'
import { Button } from './ui/button'
export function Ledger({ results }: { results: SimulationResult[] }) {
  const [strategy, setStrategy] = useState('529'),
    [category, setCategory] = useState('all'),
    [page, setPage] = useState(0)
  const result = results.find((r) => r.id === strategy) ?? results[0]
  const events = result.ledger.filter((e) => category === 'all' || e.category === category)
  const count = Math.ceil(events.length / 60),
    shown = events.slice(page * 60, page * 60 + 60)
  function download() {
    const keys = [
      'date',
      'age',
      'category',
      'vehicleId',
      'amount',
      'amountExact',
      'basis',
      'taxable',
      'tax',
      'penalty',
      'balance',
      'payer',
      'explanation',
      'sourceIds',
    ] as const
    const csv = [
      keys.join(','),
      ...result.ledger.map((e) =>
        keys.map((k) => `"${String(e[k] ?? '').replaceAll('"', '""')}"`).join(','),
      ),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.id}-ledger.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <details className="math-section" id="math">
      <summary>
        <span>
          <span className="eyebrow">Nothing up our sleeves</span>
          <span className="summary-title">Show the math</span>
        </span>
        <span className="muted">The same ledger that produces the results</span>
      </summary>
      <div className="ledger-controls">
        <label>
          Ledger strategy
          <select
            value={result.id}
            onChange={(e) => {
              setStrategy(e.target.value)
              setPage(0)
            }}
          >
            {results.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Event type
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(0)
            }}
          >
            <option value="all">All events</option>
            {[...new Set(result.ledger.map((e) => e.category))].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" onClick={download}>
          <Download size={16} /> Download ledger CSV
        </Button>
      </div>
      <p className="muted">
        {events.length.toLocaleString()} events · page {Math.min(page + 1, count) || 1} of{' '}
        {count || 1}. Money rounds half up to cents for reporting; internal arithmetic uses 32-digit
        Decimal precision.
      </p>
      <div className="table-scroll">
        <table className="ledger-table">
          <caption>{result.name}: monthly calculation ledger</caption>
          <thead>
            <tr>
              <th>Date / age</th>
              <th>Event / vehicle</th>
              <th>Amount</th>
              <th>Tax / penalty</th>
              <th>Explanation & payer</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={`${e.date}-${i}`}>
                <td>
                  {e.date}
                  <br />
                  <span className="muted">Age {e.age.toFixed(1)}</span>
                </td>
                <td>
                  {e.category}
                  <br />
                  <span className="muted">{e.vehicleId}</span>
                </td>
                <td>
                  {dollars(e.amount)}
                  {e.balance && (
                    <>
                      <br />
                      <span className="muted">Balance {dollars(e.balance)}</span>
                    </>
                  )}
                </td>
                <td>
                  {dollars(e.tax ?? 0)} / {dollars(e.penalty ?? 0)}
                  {e.basis && (
                    <>
                      <br />
                      <span className="muted">Basis {dollars(e.basis)}</span>
                    </>
                  )}
                </td>
                <td>
                  {e.explanation}
                  {e.payer && <p className="muted">Payer: {e.payer}</p>}
                  <div className="source-links">
                    {e.sourceIds.map((id) => (
                      <a
                        key={id}
                        href={sourceById[id]?.canonicalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {sourceById[id]?.publisher}
                      </a>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous events
        </Button>
        <Button
          variant="outline"
          disabled={page >= count - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          Next events
        </Button>
      </div>
      <details>
        <summary>Loan tranches and repayment</summary>
        <div className="table-scroll">
          <table>
            <caption>
              Each loan records its own origination, subsidy, school interest and repayment
            </caption>
            <thead>
              <tr>
                <th>Loan</th>
                <th>Originated</th>
                <th>Principal</th>
                <th>Rate</th>
                <th>Repayment start</th>
                <th>School interest</th>
                <th>Payment</th>
                <th>Total interest</th>
                <th>Payoff</th>
              </tr>
            </thead>
            <tbody>
              {result.debt.tranches.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.kind} {l.subsidized ? 'subsidized' : 'unsubsidized'}
                  </td>
                  <td>{l.originatedAt}</td>
                  <td>{dollars(l.principal)}</td>
                  <td>{(l.annualRate * 100).toFixed(2)}%</td>
                  <td>{l.repaymentStartsAt}</td>
                  <td>{dollars(l.accruedInSchool)}</td>
                  <td>{dollars(l.payment)}</td>
                  <td>{dollars(l.interest)}</td>
                  <td>{l.payoffDate ?? 'Outstanding'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </details>
  )
}
