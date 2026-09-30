import { planningRules2026 as rules } from '../../data/federal/planning2026'
import type { Scenario } from '../../scenarios/schema'
import { D, Decimal, nonnegative } from '../engine/money'
import type { Account } from '../vehicles/vehicle'
export function assetAssessment(s: Scenario, a: Record<string, Account>) {
  let parent = a['529'].balance.plus(a.brokerage.balance).plus(a.cash.balance)
  let student = a.custodial.balance
  const retirement = a.roth.balance
    .plus(a.childRoth.balance)
    .plus(a.parentRoth.balance)
    .plus(a.wageRoth?.balance ?? 0)
  if (s.trumpAidTreatment === 'parent') parent = parent.plus(a.trump.balance)
  if (s.trumpAidTreatment === 'student') student = student.plus(a.trump.balance)
  const federal = s.assetReportingExempt
    ? D(0)
    : parent
        .mul(rules.parentAssetConversion.value)
        .mul(s.parentAidMarginalRate)
        .plus(student.mul(rules.studentAssetAssessment.value))
  const institution = parent
    .mul(s.institutionParentAssetRate)
    .plus(student.mul(s.institutionStudentAssetRate))
    .plus(
      retirement
        .plus(s.trumpAidTreatment === 'retirement' ? a.trump.balance : 0)
        .mul(s.institutionRetirementAssetRate),
    )
  const reduction = (s.institutionAssessment ? institution : federal).mul(s.aidAwardResponse)
  return { federal, institution, reduction }
}
export function educationCredit(s: Scenario, eligibleExpenses: Decimal, claimedYears: number) {
  if (
    !s.creditEligible ||
    s.creditMode === 'none' ||
    !s.eligibleInstitution ||
    (s.creditMode === 'aotc' && (!s.halfTime || claimedYears >= rules.aotcYears.value))
  )
    return D(0)
  const [low, high] = s.creditJoint ? rules.aotcPhaseoutJoint.value : rules.aotcPhaseoutSingle.value
  const fraction = Decimal.min(
    1,
    nonnegative(
      D(high)
        .minus(s.creditMagi)
        .div(high - low),
    ),
  )
  const expenses = Decimal.min(eligibleExpenses, s.creditReserveAnnual)
  const credit =
    s.creditMode === 'aotc'
      ? Decimal.min(expenses, rules.aotcFirstExpenses.value).plus(
          Decimal.min(
            nonnegative(expenses.minus(rules.aotcFirstExpenses.value)),
            rules.aotcSecondExpenses.value,
          ).mul(rules.aotcSecondRate.value),
        )
      : Decimal.min(expenses, rules.llcExpenseCap.value).mul(rules.llcRate.value)
  // Conservative nonrefundable model. Refundability is not assumed from the child's age alone.
  return Decimal.min(credit.mul(fraction), s.creditTaxLiability)
}
