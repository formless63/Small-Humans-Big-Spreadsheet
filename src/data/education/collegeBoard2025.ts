import { derived, sourced } from '../provenance'
export const collegeBoard2025 = {
  publicTuition: sourced(11950, '2025–26 public four-year in-state tuition', [
    'SRC-COLLEGEBOARD-2025',
  ]),
  publicBudget: sourced(30990, '2025–26 public four-year total budget', ['SRC-COLLEGEBOARD-2025']),
  publicNetTuition: sourced(2300, '2025–26 public four-year average net tuition', [
    'SRC-COLLEGEBOARD-2025',
  ]),
  publicNetBudget: derived(
    21340,
    'Illustrative public four-year net total',
    '30990 - 11950 + 2300',
    ['publicBudget', 'publicTuition', 'publicNetTuition'],
    ['SRC-COLLEGEBOARD-2025'],
  ),
  twoYearTuition: sourced(4150, '2025–26 public two-year tuition', ['SRC-COLLEGEBOARD-2025']),
  twoYearBudget: sourced(21320, '2025–26 public two-year total budget', ['SRC-COLLEGEBOARD-2025']),
  privateTuition: sourced(45000, '2025–26 private nonprofit tuition', ['SRC-COLLEGEBOARD-2025']),
  privateBudget: sourced(65470, '2025–26 private nonprofit total budget', [
    'SRC-COLLEGEBOARD-2025',
  ]),
  privateNetTuition: sourced(16910, '2025–26 private nonprofit average net tuition', [
    'SRC-COLLEGEBOARD-2025',
  ]),
  privateNetBudget: derived(
    37380,
    'Illustrative private nonprofit net total',
    '65470 - 45000 + 16910',
    ['privateBudget', 'privateTuition', 'privateNetTuition'],
    ['SRC-COLLEGEBOARD-2025'],
  ),
}
