import { sourced } from '../provenance'
export const iraRules2026 = {
  annualRothCap50: sourced(
    8600,
    '2026 annual IRA contribution limit for age 50+; held constant in projections',
    ['SRC-IRS-PUB590A'],
  ),
  qualifiedRothAge: sourced(59.5, 'Ordinary qualified Roth distribution minimum age', [
    'SRC-IRS-PUB590B',
  ]),
  rothTaxYears: sourced(5, 'Roth qualified distribution holding period in tax years', [
    'SRC-IRS-PUB590B',
  ]),
  trumpAnnualLimit: sourced(
    5000,
    'Trump Account general annual contribution limit; held constant in this model after 2027',
    ['SRC-IRS-4547'],
  ),
  employerLimit: sourced(2500, 'Trump Account employer annual contribution limit', [
    'SRC-IRS-TA-2026-37',
  ]),
  pilotAmount: sourced(1000, 'Optional one-time pilot contribution', ['SRC-IRS-TA-2026-38']),
  contributionStart: sourced('2026-07-04', 'Earliest Trump Account contribution date', [
    'SRC-IRS-4547',
  ]),
  additionalTaxRate: sourced(0.1, 'Ordinary IRA / 529 additional early or nonqualified tax rate', [
    'SRC-IRS-TOPIC557',
    'SRC-IRS-PUB970',
  ]),
  rolloverLifetimeCap: sourced(35000, '529 → Roth lifetime limit', ['SRC-IRS-529-TOPIC313']),
  rolloverAccountYears: sourced(15, '529 account age must exceed 15 years', [
    'SRC-IRS-529-TOPIC313',
  ]),
  rolloverLookbackYears: sourced(5, '529 Roth contribution/earnings lookback', [
    'SRC-IRS-529-TOPIC313',
  ]),
  studentLoanLifetimeCap: sourced(10000, '529 qualified student-loan repayment lifetime cap', [
    'SRC-IRS-529-TOPIC313',
  ]),
  annualRothCap: sourced(
    7500,
    '2026 annual IRA contribution limit, under age 50; held constant in projections',
    ['SRC-IRS-PUB590A'],
  ),
}
