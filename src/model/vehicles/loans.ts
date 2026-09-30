import { D, Decimal, nonnegative } from '../engine/money'
export interface LoanState {
  id: string
  kind: 'federal' | 'gap'
  originatedAt: string
  repaymentStartsAt: string
  annualRate: number
  subsidized: boolean
  termMonths: number
  principal: Decimal
  balance: Decimal
  accrued: Decimal
  interest: Decimal
  schoolInterest: Decimal
  repaid: Decimal
  payment: Decimal
  started: boolean
  payoffDate?: string
}
export function amortizingPayment(
  principal: Decimal.Value,
  annualRate: Decimal.Value,
  months: number,
): Decimal {
  const p = D(principal),
    r = D(annualRate).div(12)
  if (r.isZero()) return p.div(months)
  return p.mul(r).div(D(1).minus(D(1).plus(r).pow(-months)))
}
export function originateLoan(
  id: string,
  kind: LoanState['kind'],
  principal: Decimal,
  annualRate: number,
  originatedAt: string,
  repaymentStartsAt: string,
  termMonths: number,
  subsidized = false,
): LoanState {
  return {
    id,
    kind,
    principal,
    balance: principal,
    annualRate,
    originatedAt,
    repaymentStartsAt,
    termMonths,
    subsidized,
    accrued: D(0),
    schoolInterest: D(0),
    interest: D(0),
    repaid: D(0),
    payment: D(0),
    started: false,
  }
}
export function tickLoan(loan: LoanState, date: string): { interest: Decimal; payment: Decimal } {
  if (loan.balance.plus(loan.accrued).lte('0.00000001')) return { interest: D(0), payment: D(0) }
  const inSchool = date < loan.repaymentStartsAt
  if (!inSchool && !loan.started) {
    // Illustrative capitalization at repayment start, explicitly recorded by the tranche.
    loan.balance = loan.balance.plus(loan.accrued)
    loan.accrued = D(0)
    loan.payment = amortizingPayment(loan.balance, loan.annualRate, loan.termMonths)
    loan.started = true
  }
  const interest = inSchool && loan.subsidized ? D(0) : loan.balance.mul(loan.annualRate).div(12)
  loan.interest = loan.interest.plus(interest)
  if (inSchool) {
    loan.accrued = loan.accrued.plus(interest)
    loan.schoolInterest = loan.schoolInterest.plus(interest)
    return { interest, payment: D(0) }
  }
  loan.balance = loan.balance.plus(interest)
  const payment = Decimal.min(loan.payment, loan.balance)
  loan.balance = nonnegative(loan.balance.minus(payment))
  loan.repaid = loan.repaid.plus(payment)
  if (loan.balance.lt('0.00000001')) {
    loan.balance = D(0)
    loan.payoffDate = date
  }
  return { interest, payment }
}
export function extraLoanPayment(loan: LoanState, amount: Decimal): Decimal {
  const paid = Decimal.min(amount, loan.balance.plus(loan.accrued))
  const interestPaid = Decimal.min(paid, loan.accrued)
  loan.accrued = loan.accrued.minus(interestPaid)
  loan.balance = nonnegative(loan.balance.minus(paid.minus(interestPaid)))
  loan.repaid = loan.repaid.plus(paid)
  return paid
}
