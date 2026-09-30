import { assumed } from './provenance'
export const assumptions = {
  investmentReturn: assumed(0.05, 'Real annual effective investment return'),
  retirementAge: assumed(65, 'Retirement age'),
  savingsRate: assumed(0.1, 'Career retirement saving share of gross income'),
  gapRate: assumed(0.09, 'Illustrative gap-loan annual rate'),
  gapYears: assumed(10, 'Illustrative gap-loan repayment term'),
  educationTaxRate: assumed(0.12, 'Manual effective ordinary tax rate on withdrawal earnings'),
  conversionTaxRate: assumed(0.12, 'Manual effective Roth conversion tax rate'),
  retirementTaxRate: assumed(0.22, 'Manual effective retirement tax rate'),
  nyRate: assumed(0.065, 'Manual NY marginal rate for benefits/recapture'),
}
