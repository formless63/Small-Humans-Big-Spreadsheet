import { assumptions } from './assumptions'
import { earnings2025, weeklyEarnings2025 } from './earnings/bls2025'
import { collegeBoard2025 } from './education/collegeBoard2025'
import { eliteAid2026 } from './education/eliteAid2026'
import { iraRules2026 } from './federal/ira2026'
import { planningRules2026 } from './federal/planning2026'
import { loanRules2026 } from './federal/studentLoans2026'
import { taxRules2026 } from './federal/tax2026'
import { nyRules2026 } from './states/ny2026'
export const parameters = [
  ...Object.values(planningRules2026),
  ...Object.values(assumptions),
  ...Object.values(collegeBoard2025),
  ...Object.values(eliteAid2026),
  ...Object.values(earnings2025),
  ...Object.values(weeklyEarnings2025),
  ...Object.values(iraRules2026),
  ...Object.values(loanRules2026),
  ...Object.values(nyRules2026),
  ...Object.values(taxRules2026),
]

export const parameterByKey = {
  ...planningRules2026,
  ...assumptions,
  ...collegeBoard2025,
  ...eliteAid2026,
  ...earnings2025,
  ...weeklyEarnings2025,
  ...iraRules2026,
  ...loanRules2026,
  ...nyRules2026,
  ...taxRules2026,
}
