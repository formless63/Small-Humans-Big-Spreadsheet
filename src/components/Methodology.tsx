import { assumptions } from '../data/assumptions'
import { parameters } from '../data/registry'
import { sources } from '../data/sources'
import type { SimulationResult } from '../model/types'
export function Methodology({ result }: { result: SimulationResult }) {
  return (
    <section id="methodology" className="methodology">
      <details>
        <summary>
          <span>
            <span className="eyebrow">Read the fine print, without squinting</span>
            <span className="summary-title">Methodology & sources</span>
          </span>
          <span className="muted">2026 baseline · assumptions, not predictions</span>
        </summary>
        <div className="method-grid">
          <div>
            <h3>One closed financial system</h3>
            <p>
              Education expense = grants and scholarships + spendable account withdrawals +
              explicitly enabled child funding + federal loans + illustrative gap loans + unfunded
              gap. Taxes and penalties reduce spendable proceeds. Parents stop contributing on the
              configured schedule.
            </p>
            <p>
              Real annual effective returns compound monthly. Contributions arrive before monthly
              growth; education follows growth, then conversion/rollover and career saving. Loan
              interest is simple during school and grace, then capitalizes once at repayment.
              Currency reports round half up; account bookkeeping uses Decimal arithmetic.
            </p>
            <h3>Who owns the money?</h3>
            <p>
              <strong>Childhood-funded education / future assets:</strong> education savings, child
              accounts and parent-owned investments earmarked for the child, after hypothetical
              liquidation tax. Parent-controlled investments are not automatically a legal gift.
              Nonqualified 529 earnings incur modeled taxes and penalties unless savings are
              retained as a separate restricted family education asset.
            </p>
            <p>
              <strong>Parent retirement:</strong> retained parent Roth assets, separate from child
              funds. <strong>Career assets:</strong> separate gross-income-based savings and
              explicitly wage-funded child Roth contributions.{' '}
              <strong>Debt opportunity cost:</strong> counterfactual future value of earnings-funded
              payments; never subtracted twice.
            </p>
            <h3>Comparison methods</h3>
            <p>
              Compare equal gross deposits or equal parental cost after state contribution
              incentives. Education credits stay a separate parent benefit. Allocation changes
              redirect new deposits without transferring existing assets. Investment glide paths,
              adverse-return scenarios, and sensitivity cases use explicit return assumptions, not
              forecasts. Taxable sales use proportional holdings; direct Roth contributions are
              withdrawn before earnings. All taxes reduce an identified source of money.
            </p>
            <h3>Limits of this model</h3>
            <ul>
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Planning assumptions</h3>
            <p>
              These are defaults, not legal rules, recommendations, or guaranteed returns. Your
              controls override them.
            </p>
            <ul>
              {Object.values(assumptions).map((a) => (
                <li key={a.label}>
                  {a.label}:{' '}
                  <strong>
                    {typeof a.value === 'number' && a.value < 1
                      ? `${a.value * 100}%`
                      : String(a.value)}
                  </strong>
                  <span className="provenance">Assumption</span>
                </li>
              ))}
            </ul>
            <h3>Every number has a provenance</h3>
            <p>
              <span className="provenance">Source</span> factual reference ·{' '}
              <span className="provenance">Derived</span> formula ·{' '}
              <span className="provenance">Assumption</span> planning choice ·{' '}
              <span className="provenance">You chose</span> editable input.
            </p>
            <details>
              <summary>Financial parameter registry</summary>
              <ul className="parameter-list">
                {parameters
                  .filter((p) => p.provenance !== 'MODEL_ASSUMPTION')
                  .map((p) => (
                    <li key={p.label}>
                      <strong>{p.label}</strong>
                      <br />
                      {JSON.stringify(p.value)} · {p.provenance} · as of {p.asOf}
                      {p.formula && (
                        <p>
                          Formula: {p.formula}; upstream: {p.upstream?.join(', ')}
                        </p>
                      )}
                      <div>
                        {p.sourceIds.map((id) => {
                          const source = sources.find((s) => s.id === id)!
                          return (
                            <a key={id} href={source.canonicalUrl} target="_blank" rel="noreferrer">
                              {source.publisher} · {source.title}
                            </a>
                          )
                        })}
                      </div>
                    </li>
                  ))}
              </ul>
            </details>
          </div>
        </div>
        <h3>Primary source registry</h3>
        <p className="muted">
          Current-policy illustrations are not future guarantees. Proposed guidance is identified
          below. Source verification status is recorded separately from publication date.
        </p>
        <div className="source-grid">
          {sources.map((s) => (
            <article key={s.id}>
              <p className="eyebrow">{s.publisher}</p>
              <a href={s.canonicalUrl} target="_blank" rel="noreferrer">
                {s.title} ↗
              </a>
              <p className="muted">
                {s.sourceDate} · {s.status.replaceAll('-', ' ')}
                <br />
                {s.verification === 'verified'
                  ? `Checked ${s.accessedAt}`
                  : s.verification === 'link-checked'
                    ? 'Link checked; see FSA Handbook for verified rules'
                    : 'Verification pending'}
              </p>
              {s.notes && <p>{s.notes}</p>}
            </article>
          ))}
        </div>
      </details>
    </section>
  )
}
