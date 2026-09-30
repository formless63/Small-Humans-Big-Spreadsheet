import { ArrowDown, ArrowUpRight, Check, Copy, RotateCcw, Sprout } from 'lucide-react'
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Inputs } from './components/Inputs'
import { Ledger } from './components/Ledger'
import { Methodology } from './components/Methodology'
import { Results } from './components/Results'
import { Button } from './components/ui/button'
import { decodeScenario, encodeScenario } from './lib/queryState'
import { expectFundingToReconcile, simulateScenario } from './model/engine/simulate'
import { defaultScenario, type Scenario, scenarioSchema } from './scenarios/schema'

const Charts = lazy(() => import('./components/Charts').then((m) => ({ default: m.Charts })))
const initial = decodeScenario(window.location.search)
export function App() {
  const [scenario, setScenario] = useState<Scenario>(initial.scenario),
    [shareStatus, setShareStatus] = useState(''),
    [urlError, setUrlError] = useState(initial.error)
  const deferred = useDeferredValue(scenario)
  const parsed = useMemo(() => scenarioSchema.safeParse(deferred), [deferred])
  const valid = parsed.success ? parsed.data : defaultScenario
  const results = useMemo(() => {
    const a = simulateScenario(
      { ...valid, share529: 1, employerAnnual: 0, pilotEnabled: false },
      '529',
      '529 plan',
    )
    const b = simulateScenario({ ...valid, share529: 0 }, 'trump', 'Trump Account')
    const selected =
      valid.share529 > 0 && valid.share529 < 1
        ? simulateScenario(
            valid,
            'split',
            `${Math.round(valid.share529 * 100)}/${Math.round((1 - valid.share529) * 100)} split`,
          )
        : null
    const results = selected ? [selected, a, b] : valid.share529 === 0 ? [b, a] : [a, b]
    for (const r of results) expectFundingToReconcile(r)
    return results
  }, [valid])
  useEffect(() => {
    const restore = () => {
      const next = decodeScenario(window.location.search)
      setScenario(next.scenario)
      setUrlError(next.error)
    }
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  async function share() {
    const url = new URL(window.location.href)
    url.search = encodeScenario(scenario)
    window.history.replaceState(null, '', url)
    try {
      await navigator.clipboard.writeText(url.toString())
      setShareStatus('Copied. The link includes your financial assumptions.')
    } catch {
      setShareStatus(
        'Scenario saved in the address bar. Copy that URL to share your financial assumptions.',
      )
    }
  }
  const selected = results[0]
  const pending = scenario !== deferred
  return (
    <>
      <header className="site-header" id="top">
        <a href="#top" className="brand" aria-label="Small Humans, Big Spreadsheet home">
          <span className="brand-icon">
            <Sprout size={23} />
          </span>
          <span>
            Small Humans,
            <br />
            <strong>Big Spreadsheet</strong>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#comparison">The comparison</a>
          <a href="#methodology">
            Methodology & sources <ArrowUpRight size={13} />
          </a>
          <Button variant="outline" size="sm" onClick={share}>
            <Copy size={14} /> Copy scenario link
          </Button>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> A little saving. A very long story.
            </p>
            <h1>
              Small humans.
              <br />
              <em>Big possibilities.</em>
            </h1>
            <p className="hero-description">
              Follow every dollar from childhood savings to education, debt, and retirement. Compare
              the tradeoffs. See the math. Make your own call.
            </p>
            <a className="hero-link" href="#scenario">
              Build your comparison <ArrowDown size={17} />
            </a>
          </div>
          <div className="hero-illustration" aria-hidden="true">
            <div className="paper-label">A PLAN THAT GROWS WITH THEM</div>
            <div className="growth-path">
              <div className="growth-stage stage-one">
                <span className="stage-age">AGE 2</span>
                <Sprout size={34} />
                <span>Plant a little</span>
              </div>
              <div className="growth-stage stage-two">
                <span className="stage-age">AGE 18</span>
                <div className="plant">✳</div>
                <span>Keep your options</span>
              </div>
              <div className="growth-stage stage-three">
                <span className="stage-age">AGE 65</span>
                <div className="tree">
                  <i />
                  <i />
                  <i />
                  <i />
                  <b />
                </div>
                <span>Think generations</span>
              </div>
            </div>
            <div className="paper-footer">
              <span>Saving → education → future</span>
              <span>Every dollar has a story.</span>
            </div>
          </div>
        </section>
        <div className="principles">
          <span>
            <Check size={15} /> Every dollar reconciles
          </span>
          <span>
            <Check size={15} /> Rules have sources
          </span>
          <span>
            <Check size={15} /> Runs in your browser
          </span>
          <span>Real 2026 dollars · deterministic model</span>
        </div>
        <p className="disclaimer">
          An educational modeling tool, not tax, legal, investment, lending, or financial advice.
          Future law, aid, costs, returns, and loan availability can change. Verify current rules
          before making decisions.
        </p>
        {(urlError || shareStatus) && (
          <p role="status" className="notice">
            {urlError || shareStatus}
          </p>
        )}
        <div id="scenario">
          <Inputs
            scenario={scenario}
            update={(changes) => {
              setScenario((s) => ({ ...s, ...changes }))
              setShareStatus('')
              setUrlError(undefined)
            }}
          />
        </div>
        {!parsed.success ? (
          <p className="error" role="alert">
            Please correct these inputs:{' '}
            {parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}
          </p>
        ) : (
          <section id="comparison" className="comparison" aria-busy={pending}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">The comparison</p>
                <h2>Where the same dollars lead.</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScenario(defaultScenario)
                  setShareStatus('')
                  window.history.replaceState(null, '', window.location.pathname)
                }}
              >
                <RotateCcw size={14} /> Reset assumptions
              </Button>
            </div>
            <p className="comparison-note">
              Your selected strategy appears first. The other cards compare the same budget invested
              entirely in one account; changing the split does not change those comparison
              scenarios. Funding policy:{' '}
              <strong>
                {scenario.fundingPolicy === 'minimizeDebt'
                  ? 'Minimize debt — accounts before borrowing'
                  : 'Preserve retirement — federal borrowing before accounts'}
              </strong>
              . Same gross parental budget; no extra parent checks after childhood.{' '}
              {pending ? 'Recalculating…' : ''}
            </p>
            <Results
              results={results}
              retirementAge={valid.retirementAge}
              selectedId={selected.id}
            />
            <Suspense fallback={<p role="status">Loading comparison charts…</p>}>
              <Charts results={results} retirementAge={valid.retirementAge} />
            </Suspense>
            <Ledger results={results} />
            <Methodology result={selected} />
          </section>
        )}
        <section className="closing">
          <Sprout size={26} />
          <h2>
            The point isn’t to pick a winner.
            <br />
            It’s to understand the tradeoffs.
          </h2>
          <p>No guaranteed returns. No mystery funding. Just a model you can inspect.</p>
        </section>
      </main>
      <footer>
        <span>Small Humans, Big Spreadsheet</span>
        <span>Local calculations. No tracking. No account required.</span>
        <a
          href="https://github.com/formless63/Small-Humans-Big-Spreadsheet"
          target="_blank"
          rel="noreferrer"
        >
          Open source ↗
        </a>
      </footer>
    </>
  )
}
