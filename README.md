# Small Humans, Big Spreadsheet

A private, static financial calculator that traces childhood contributions through education, taxes, loans, Roth strategies and retirement. Compare education savings, Trump Accounts, parent brokerage, custodial investments, cash, child Roth and parent retirement strategies without unexplained funding. Start with guided questions or edit every assumption on the same page.

## Develop

Use Node 24 LTS and **Bun 1.4.2**. Bun is the required package manager; commit `bun.lock`.

```sh
bun install --frozen-lockfile
bun run dev
```

The application runs on port 3000. There is no backend, account, database, analytics, or remote scenario storage. Source links are optional external navigation; all calculations work offline after static assets load.

## Validate

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun x playwright install --with-deps chromium
bun run test:e2e
```

`bun run check` runs the whole sequence after Chromium is installed. Browser tests cover desktop/mobile, preset changes, funding gaps, controls, source links, the ledger, URL round trips, and invalid input handling.

## GitHub Pages

The Actions CI workflow validates the application with the actual repository base path, builds static assets, runs browser tests, and uploads a Pages artifact. A second workflow deploys the exact artifact only after CI passes on `main`; it does not rebuild a different commit.

Configure the repository's **Settings → Pages → Source → GitHub Actions** if Pages is not already enabled. The deployment workflow attempts enablement with the available token; an administrator may need to set it once.

```sh
PAGES_BASE=/Small-Humans-Big-Spreadsheet/ bun run build
PAGES_BASE=/Small-Humans-Big-Spreadsheet/ bun run test:e2e
```

GitHub project Pages are case-sensitive: the configured base matches this repository's actual name. Root hosting uses the default `/` base. Scenarios use versioned query parameters, so no server-side route fallback is needed.

## Model and data

Read [SPEC.md](SPEC.md) and [AGENTS.md](AGENTS.md) before architectural work. [Methodology](docs/methodology.md) documents the monthly calendar, rounding, qualification, basis, funding, loans and tax approximations. [Sources](docs/sources.md) records primary-source verification and versions.

- `src/model`: React-independent Decimal engine, vehicle registry, taxes and loan tranches.
- `src/data`: source/provenance registry and versioned federal, NY, education and earnings data.
- `src/scenarios`: Zod inputs, editable presets and contribution splits.
- `src/components`: accessible charts, tables, ledger, controls and methodology.
- `tests/model`: source and financial invariants.
- `tests/regression`: named deterministic fixtures. Explain numerical changes; do not blindly regenerate.

Every education month must reconcile within one cent. Legal facts carry source IDs; forecasts and effective tax rates are assumptions or user inputs. 2026 rules are reference illustrations, not predictions of future policy. Proposed IRS guidance is labeled separately from final guidance. The tax engine is simplified and supports manual effective rates for complex cases.

Educational use only; not tax, legal, investment, lending, or financial advice.

The guided **Move money later** step plans Trump-to-Roth conversions and eligible 529 rollovers. The selected-plan portfolio view shows individual account balances, drawdowns, transfer taxes and constraints, with a year selector and account toggles. Optional comparisons hold the deposit mix constant while changing transfer timing. See [the methodology](docs/methodology.md) for the source-account reserve and early-Roth modeling assumptions.
