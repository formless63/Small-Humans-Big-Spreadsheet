import { sourced } from '../provenance'
export const taxRules2026 = {
  singleBrackets: sourced(
    [
      [12400, 0.1],
      [50400, 0.12],
      [105700, 0.22],
      [201775, 0.24],
      [256225, 0.32],
      [640600, 0.35],
      [null, 0.37],
    ] as const,
    '2026 single ordinary-income brackets',
    ['SRC-IRS-REVPROC2025-32'],
  ),
  jointBrackets: sourced(
    [
      [24800, 0.1],
      [100800, 0.12],
      [211400, 0.22],
      [403550, 0.24],
      [512450, 0.32],
      [768700, 0.35],
      [null, 0.37],
    ] as const,
    '2026 joint ordinary-income brackets',
    ['SRC-IRS-REVPROC2025-32'],
  ),
  singleDeduction: sourced(16100, '2026 single standard deduction', ['SRC-IRS-REVPROC2025-32']),
  dependentDeduction: sourced(1350, '2026 dependent minimum standard deduction', [
    'SRC-IRS-REVPROC2025-32',
  ]),
  dependentEarnedAdd: sourced(450, '2026 dependent earned-income deduction addition', [
    'SRC-IRS-REVPROC2025-32',
  ]),
  kiddieThreshold: sourced(2700, '2026 net-unearned-income threshold (2 × $1,350)', [
    'SRC-IRS-REVPROC2025-32',
    'SRC-IRS-8615',
  ]),
}
