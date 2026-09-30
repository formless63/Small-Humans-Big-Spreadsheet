import { sourced } from '../provenance'
export const loanRules2026 = {
  subsidizedAnnualLimits: sourced(
    [3500, 4500, 5500],
    'Dependent undergraduate annual subsidized sublimits',
    ['SRC-FSA-HANDBOOK2025'],
  ),
  annualLimits: sourced([5500, 6500, 7500], 'Dependent undergraduate combined annual limits', [
    'SRC-FSA-LOAN-LIMITS',
  ]),
  aggregateLimit: sourced(31000, 'Dependent undergraduate aggregate limit', [
    'SRC-FSA-LOAN-LIMITS',
  ]),
  subsidizedAggregate: sourced(23000, 'Subsidized aggregate sublimit', [
    'SRC-FSA-LOAN-LIMITS',
    'SRC-FSA-HANDBOOK2025',
  ]),
  rate: sourced(0.0652, '2026–27 undergraduate fixed-rate reference; not a future-rate forecast', [
    'SRC-FSA-RATES-2026',
  ]),
  graceMonths: sourced(6, 'Direct Loan grace period', [
    'SRC-FSA-SUBSIDIZED',
    'SRC-FSA-HANDBOOK-ELIGIBILITY2025',
  ]),
}
