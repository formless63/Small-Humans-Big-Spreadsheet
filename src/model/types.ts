import type { Decimal } from './engine/money'
export type VehicleId = '529' | 'trump' | 'roth'
export type Category =
  | 'contribution'
  | 'growth'
  | 'education'
  | 'withdrawal'
  | 'tax'
  | 'penalty'
  | 'loan'
  | 'loan-payment'
  | 'conversion'
  | 'rollover'
  | 'aid'
  | 'gap'
  | 'career'
  | 'benefit'
  | 'valuation'
export interface LedgerEvent {
  date: string
  age: number
  category: Category
  vehicleId?: string
  amount: string
  amountExact?: string
  basis?: string
  taxable?: string
  tax?: string
  penalty?: string
  balance?: string
  payer?: string
  sourceIds: string[]
  explanation: string
}
export interface FundingPeriod {
  date: string
  age: number
  expense: string
  aid: string
  accounts: string
  child: string
  federal: string
  gap: string
  unfunded: string
}
export interface TimelinePoint {
  date: string
  age: number
  plan529: string
  traditional: string
  roth: string
  debt: string
  career: string
}
export interface LoanTranche {
  id: string
  kind: 'federal' | 'gap'
  originatedAt: string
  repaymentStartsAt: string
  annualRate: number
  subsidized: boolean
  termMonths: number
  principal: string
  accruedInSchool: string
  payment: string
  repaid: string
  interest: string
  balance: string
  payoffDate?: string
}
export interface Withdrawal {
  gross: Decimal
  basis: Decimal
  taxable: Decimal
  tax: Decimal
  penalty: Decimal
  stateRecapture: Decimal
  net: Decimal
}
export interface SimulationResult {
  id: string
  name: string
  ledger: LedgerEvent[]
  timeline: TimelinePoint[]
  education: {
    periods: FundingPeriod[]
    cost: string
    aid: string
    accounts: string
    child: string
    federal: string
    gap: string
    unfunded: string
    taxes: string
    penalties: string
  }
  contributions: { parent: string; thirdParty: string; rejected: string; age18: string }
  debt: {
    tranches: LoanTranche[]
    federalPrincipal: string
    gapPrincipal: string
    graduationBalance: string
    totalInterest: string
    repaid: string
    monthlyPayment: string
    payoffAge: number | null
    remaining: string
    opportunityCost: string
  }
  taxes: { withdrawal: string; conversion: string; penalties: string; lifetime: string }
  conversions: { converted: string; taxes: string; rollover: string }
  retirement: {
    plan529: string
    traditional: string
    roth: string
    career: string
    afterTaxChildhood: string
    wholeLifetime: string
    liquidationTax: string
    liquidationPenalty: string
  }
  parentBenefits: string
  warnings: string[]
}
