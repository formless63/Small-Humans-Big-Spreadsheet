import { sourced } from '../provenance'
export const planningRules2026 = {
  parentAssetConversion: sourced(0.12, 'Dependent FAFSA parent asset conversion factor', [
    'SRC-FSA-SAI2026',
  ]),
  studentAssetAssessment: sourced(0.2, 'Dependent FAFSA student asset contribution factor', [
    'SRC-FSA-SAI2026',
  ]),
  parentMaximumMarginal: sourced(0.47, 'Maximum parent available-income assessment rate', [
    'SRC-FSA-SAI2026',
  ]),
  aotcFirstExpenses: sourced(2000, 'AOTC: first expense tier', ['SRC-IRS-PUB970']),
  aotcSecondExpenses: sourced(2000, 'AOTC: second expense tier', ['SRC-IRS-PUB970']),
  aotcSecondRate: sourced(0.25, 'AOTC: second tier credit percentage', ['SRC-IRS-PUB970']),
  aotcYears: sourced(4, 'AOTC maximum eligible tax years', ['SRC-IRS-PUB970']),
  aotcPhaseoutSingle: sourced([80000, 90000], 'AOTC single MAGI phaseout range', [
    'SRC-IRS-PUB970',
  ]),
  aotcPhaseoutJoint: sourced([160000, 180000], 'AOTC married joint MAGI phaseout range', [
    'SRC-IRS-PUB970',
  ]),
  llcExpenseCap: sourced(10000, 'LLC eligible expense cap per tax return', ['SRC-IRS-PUB970']),
  llcRate: sourced(0.2, 'LLC expense credit rate', ['SRC-IRS-PUB970']),
}
