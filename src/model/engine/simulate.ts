import { iraRules2026 as ira } from '../../data/federal/ira2026'
import { loanRules2026 as federal } from '../../data/federal/studentLoans2026'
import { type ExpenseKey, expenseKeys } from '../../scenarios/presets'
import { type Scenario, scenarioSchema } from '../../scenarios/schema'
import { assetAssessment, educationCredit } from '../policies/education'
import { allocationAt, grossForNetBudget, stateBenefit } from '../policies/strategies'
import { incomeTax, kiddieApplies, type TaxContext } from '../taxes/ordinaryIncome'
import type { FundingPeriod, LedgerEvent, SimulationResult, TimelinePoint } from '../types'
import { parentAgeAt } from '../vehicles/flexible'
import {
  amortizingPayment,
  extraLoanPayment,
  type LoanState,
  originateLoan,
  tickLoan,
} from '../vehicles/loans'
import {
  type Account,
  accrue,
  contribute,
  createAccount,
  remove,
  vehicleRegistry,
  type WithdrawalContext,
  withdrawNet,
} from '../vehicles/vehicle'
import { D, Decimal, money, monthlyRate, nonnegative, serializeMoney as str } from './money'
import { addMonths, ageAt, atAge, monthDate, pilotEligible, trumpAvailableFrom } from './timeline'

export function simulateScenario(
  raw: Scenario,
  id = 'custom',
  name = 'Custom strategy',
): SimulationResult {
  const parsedScenario = scenarioSchema.parse(raw)
  const s = {
    ...parsedScenario,
    nyEnabled: parsedScenario.nyEnabled && parsedScenario.state529Mode === 'ny',
  }
  const accounts = {
    '529': createAccount('529'),
    trump: createAccount('trump'),
    roth: createAccount('roth'),
    brokerage: createAccount('brokerage'),
    custodial: createAccount('custodial'),
    cash: createAccount('cash'),
    childRoth: createAccount('childRoth'),
    wageRoth: createAccount('wageRoth'),
    parentRoth: createAccount('parentRoth'),
  }
  const ledger: LedgerEvent[] = [],
    timeline: TimelinePoint[] = [],
    periods: FundingPeriod[] = [],
    loans: LoanState[] = []
  const warnings = new Set<string>()
  const aidAssessment: SimulationResult['aidAssessment'] = []
  const iraWorksheets: SimulationResult['iraWorksheets'] = []
  const allBalances = () => Object.values(accounts).reduce((sum, a) => sum.plus(a.balance), D(0))
  let stateYearCredit = D(0),
    parentRothYearUsed = D(0),
    childEarnedContributions = D(0),
    investmentTaxes = D(0),
    credits = D(0),
    creditExpenses = D(0),
    creditYears = s.creditPriorYears
  let assessedYear = -1,
    assessedReduction = D(0),
    shockApplied = false,
    previousAge = ageAt(s.asOf, s.birthDate)
  let iraReviewCarry = D(s.outsideIraBasis)
  let iraYearBasis = D(0),
    iraYearDistributions = D(0),
    iraYearPlanningTaxable = D(0)
  const settleYear = () => {
    if (year < 0) return
    const credit = educationCredit(s, creditExpenses, creditYears)
    credits = credits.plus(credit)
    if (credit.gt(0)) creditYears++
    if (credit.gt(0))
      log(
        `${year}-12-31`,
        'benefit',
        credit,
        'Conservative nonrefundable education credit, limited by reserved eligible expenses, MAGI phaseout, confirmed eligibility and available tax liability; not deposited in child accounts.',
        { payer: 'parent tax return', sourceIds: ['SRC-IRS-PUB970'] },
      )
    if (iraYearDistributions.gt(0)) {
      const value = accounts.trump.balance.plus(s.outsideIraYearEndValue)
      const denominator = value.plus(iraYearDistributions)
      const nontaxable = denominator.isZero()
        ? D(0)
        : Decimal.min(iraYearDistributions, iraYearDistributions.mul(iraYearBasis).div(denominator))
      iraReviewCarry = nonnegative(iraYearBasis.minus(nontaxable))
      iraWorksheets.push({
        year,
        basisAvailable: str(iraYearBasis),
        distributionAndConversion: str(iraYearDistributions),
        yearEndValue: str(value),
        nontaxable: str(nontaxable),
        taxable: str(iraYearDistributions.minus(nontaxable)),
        planningTaxable: str(iraYearPlanningTaxable),
      })
    } else iraReviewCarry = iraYearBasis
  }
  const monthly = monthlyRate(s.annualReturn),
    glideMonthly = monthlyRate(s.glideReturn),
    cashMonthly = monthlyRate(s.cashReturn),
    dividendMonthly = monthlyRate(s.dividendYield)
  const start = addMonths(s.asOf, 1),
    retirementDate = atAge(s.birthDate, s.retirementAge)
  const educationStart = atAge(s.birthDate, s.educationStartAge),
    educationEnd = addMonths(educationStart, s.educationYears * 12)
  const parentEnd = [
    atAge(s.birthDate, s.contributionEndAge),
    trumpAvailableFrom(s.birthDate),
  ].sort()[0]
  const retirementStart = atAge(s.birthDate, s.careerStartAge)
  let parent = D(0),
    thirdParty = D(0),
    rejected = D(0),
    age18 = D(0),
    captured18 = false
  let benefits = D(0),
    taxes = D(0),
    penalties = D(0),
    conversionTaxes = D(0),
    converted = D(0),
    rolled = D(0)
  let career = D(0),
    opportunity = D(0),
    maxPayment = D(0),
    graduationDebt = D(0),
    capturedGrad = false
  let federalTotal = D(0),
    gapTotal = D(0),
    loan529Used = D(0),
    pilotAdded = false
  let year = -1,
    trumpYearContributions = D(0),
    nyYearDeduction = D(0),
    rothYearUsed = D(0),
    unearned = D(0),
    penaltyExceptionUsed = D(0)
  const federalSchoolUsed = new Map<number, Decimal>(),
    subsidizedSchoolUsed = new Map<number, Decimal>()
  const log = (
    date: string,
    category: LedgerEvent['category'],
    amount: Decimal,
    explanation: string,
    extra: Partial<LedgerEvent> = {},
  ) => {
    ledger.push({
      date,
      age: ageAt(date, s.birthDate),
      category,
      amount: str(amount),
      amountExact: amount.toString(),
      sourceIds: [],
      explanation,
      ...extra,
    })
  }
  const loanBalance = () =>
    loans.reduce((sum, loan) => sum.plus(loan.balance).plus(loan.accrued), D(0))
  const incomeCache = new Map<number, Decimal>()
  const annualIncome = (date: string) => {
    if (date < retirementStart) return D(0)
    const salaryYear = Number(date.slice(0, 4))
    let value = incomeCache.get(salaryYear)
    if (!value) {
      value = D(s.annualIncome).mul(
        D(1)
          .plus(s.wageGrowth)
          .pow(Math.max(0, salaryYear - Number(retirementStart.slice(0, 4)))),
      )
      incomeCache.set(salaryYear, value)
    }
    return value
  }
  const yearlyEarned = (date: string) => {
    const y = Number(date.slice(0, 4)),
      income = annualIncome(`${y}-12-01`)
    const begin = retirementStart.startsWith(String(y))
      ? Number(retirementStart.slice(5, 7))
      : retirementStart > `${y}-12-01`
        ? 13
        : 1
    let schoolWages = D(0)
    for (let m = 1; m <= 12; m++) {
      const month = `${y}-${String(m).padStart(2, '0')}-01`
      if (month >= atAge(s.birthDate, s.childEmploymentAge) && month < retirementStart)
        schoolWages = schoolWages.plus(D(s.childEmploymentAnnual).div(12))
    }
    return income
      .mul(13 - begin)
      .div(12)
      .plus(schoolWages)
  }
  const taxContext = (date: string, conversion = false): TaxContext => ({
    scenario: s,
    year: Number(date.slice(0, 4)),
    earned: yearlyEarned(date),
    unearnedYtd: unearned,
    conversion,
  })
  const withdrawalContext = (
    date: string,
    qualified: boolean,
    stateQualified = qualified,
  ): WithdrawalContext => ({
    date,
    age: ageAt(date, s.birthDate),
    qualified,
    stateQualified,
    tax: taxContext(date),
  })
  warnings.add(
    'IRA basis and effective taxes use proportional monthly planning allocations; actual Form 8606 aggregates distributions/conversions and year-end values. This is not a year-end tax filing calculation.',
  )
  warnings.add(
    'All amounts are real 2026 dollars. Statutory dollar caps and reference loan rates are held constant; future law, indexing, costs, and aid may differ.',
  )
  warnings.add(
    'Investment taxes apply to modeled real-dollar income/gains and constant reference thresholds. Inflation-aware nominal tax basis and future tax returns are not simulated; effective rates are planning inputs.',
  )
  warnings.add(
    'Monthly transactions occur at month boundaries, beginning next month. Effective annual investment returns convert geometrically; loan interest uses annual rate / 12.',
  )
  if (s.taxMode === 'manual')
    warnings.add(
      'Withdrawal, conversion, and retirement ordinary taxes use your effective rates. These rates must account for dependency, kiddie tax, and other IRAs; no complete tax return is simulated.',
    )
  else
    warnings.add(
      '2026 single-filer federal tax estimate: dependent standard deduction and simplified Form 8615 parent-rate treatment. Siblings, credits, itemized deductions, state IRA tax, and other IRA balances are excluded; use manual rates for complex cases.',
    )
  warnings.add(
    'Parent-owned brokerage remains parent-controlled; its after-tax value is earmarked for education/child future, not an automatic legal gift. Parent Roth retirement assets and retained family 529 savings are reported separately.',
  )
  if (s.compareVehicles.includes('custodial') || s.strategyVehicle === 'custodial')
    warnings.add(
      'UTMA/UGMA assets irrevocably belong to the child; transfer of control depends on state law. Effective child capital-gains/dividend rates must include preferential-rate kiddie-tax treatment when applicable; tax-loss harvesting and full Schedule D are not modeled.',
    )
  if (s.aidMode === 'assetImpact')
    warnings.add(
      'Aid assessment models the dependent-student asset component using current 2026–27 rules only. It is not a complete SAI, Pell or award calculator: income, asset exemptions/protection, prior-prior-year withdrawal income, dependency and school methodology require separate review. Trump Account future treatment is an explicit user assumption. Award response and institutional rates are assumptions; no award reduction is assumed by default.',
    )
  if (s.creditMode !== 'none')
    warnings.add(
      'Education credits require user-confirmed eligibility, MAGI and tax liability. Reserved tuition is not withdrawn tax-free from a 529. Credits are a separate parent-side benefit, never free tuition cash. Refundable AOTC, scholarship reallocation and full tax-return interactions are not simulated.',
    )
  if (s.state529Mode === 'custom')
    warnings.add(
      'Other-state deduction/credit caps, rates and proportional benefit recapture are user-supplied assumptions; verify the selected state and plan rules. NY rules do not apply to this custom state layer.',
    )
  if (s.leftover529 === 'family')
    warnings.add(
      s.familyTransferEligible
        ? 'Unused 529 funds remain a restricted family education asset; no liquidation tax is applied to an unexecuted distribution. A same-generation eligible-family beneficiary change is assumed; funds are not counted as unrestricted child retirement cash.'
        : 'Family retention requires confirmation of an eligible same-generation beneficiary change; liquidation is used until confirmed.',
    )
  if (s.strategyVehicle === 'childRoth' || s.compareVehicles.includes('childRoth'))
    warnings.add(
      'A child Roth contribution needs eligible compensation and unused IRA capacity. Parental gifts may fund contributions but do not create compensation; rejected contributions are shown. Wage-funded saving is reported separately.',
    )
  if (s.strategyVehicle === 'parentRoth' || s.compareVehicles.includes('parentRoth'))
    warnings.add(
      'Parent Roth funding requires user-confirmed direct-contribution income eligibility and eligible compensation. Annual IRA limits include other IRA contributions. This models a Roth IRA, not deductible traditional IRA or workplace-plan contributions.',
    )
  if (s.gapEnabled)
    warnings.add('Illustrative gap financing; real-world availability and rates may differ.')
  warnings.add(
    'Federal loans require eligibility. Subsidized amounts are user-selected within caps, not an aid determination. Origination fees are not modeled. Interest capitalizes once at repayment start as an explicit approximation.',
  )
  if (s.nyEnabled)
    warnings.add(
      'NY benefit/recapture assumes one NY account owner and no outside 529 accounts. Recapture uses cumulative IT-225 A-103 worksheet amounts and your marginal rate; taxes are funded from the withdrawal, including any modeled account-owner tax obligation.',
    )
  if (s.pilotEnabled && !pilotEligible(s.birthDate))
    warnings.add(
      'Pilot contribution excluded: birth date is outside January 2025–December 2028. Citizenship, SSN, and election remain required.',
    )
  if (s.annual529PenaltyException > 0)
    warnings.add(
      '529 additional-tax exception capacity is an explicit user-confirmed eligibility amount per calendar year. Ordinary earnings tax and NY recapture still apply; verify the scholarship, disability, military-academy, or tax-credit exception with IRS guidance.',
    )
  if (s.rolloverEnabled)
    warnings.add(
      '529 → Roth requires compensation, unused annual IRA capacity, account age over 15 years, five-year lookback, and $35,000 lifetime cap. Trustee-to-trustee transfer and same-beneficiary requirements are assumed.',
    )
  for (let date = start; date <= retirementDate; date = addMonths(date, 1)) {
    const age = ageAt(date, s.birthDate),
      y = Number(date.slice(0, 4))
    if (y !== year) {
      settleYear()
      year = y
      stateYearCredit = D(0)
      parentRothYearUsed = D(0)
      creditExpenses = D(0)
      iraYearBasis = iraReviewCarry
      iraYearDistributions = D(0)
      iraYearPlanningTaxable = D(0)
      trumpYearContributions = D(0)
      nyYearDeduction = D(0)
      rothYearUsed = D(0)
      unearned = D(0)
      penaltyExceptionUsed = D(0)
    }
    if (!captured18 && age >= 18) {
      age18 = allBalances()
      captured18 = true
    }
    if (!capturedGrad && date >= educationEnd) {
      graduationDebt = loanBalance()
      capturedGrad = true
    }
    if (date === retirementDate) {
      timeline.push({
        date,
        age,
        plan529: str(accounts['529'].balance),
        traditional: str(accounts.trump.balance),
        roth: str(accounts.roth.balance),
        debt: str(loanBalance()),
        career: str(career.plus(accounts.wageRoth.balance)),
        flexible: str(
          accounts.brokerage.balance
            .plus(accounts.custodial.balance)
            .plus(accounts.cash.balance)
            .plus(accounts.childRoth.balance),
        ),
        parentRetirement: str(accounts.parentRoth.balance),
      })
      break
    }
    const annualSalary = annualIncome(date),
      incomeCash = annualSalary
        .div(12)
        .plus(
          date >= atAge(s.birthDate, s.childEmploymentAge) && date < retirementStart
            ? D(s.childEmploymentAnnual).div(12)
            : 0,
        )
    let cashUsed = D(0)
    // Contributions are the only parental cash flows. Benefit stays outside the accounts.
    if (date < parentEnd) {
      const allocation = allocationAt(s, age)
      const scheduledBudget =
        s.contributionFrequency === 'monthly'
          ? D(s.annualContribution).div(12)
          : date === start || date.endsWith('-01-01')
            ? D(s.annualContribution)
            : D(0)
      const share529 = allocation
        .filter((v) => v.vehicle === '529')
        .reduce((sum, v) => sum + v.share, 0)
      const scheduled = grossForNetBudget(
        s,
        scheduledBudget,
        share529,
        nyYearDeduction,
        stateYearCredit,
      )
      const to529 = scheduled.mul(share529)
      if (to529.gt(0)) {
        contribute(accounts['529'], to529, date)
        parent = parent.plus(to529)
        log(date, 'contribution', to529, 'Scheduled parent contribution; creates 529 basis.', {
          vehicleId: '529',
          balance: str(accounts['529'].balance),
          payer: 'parent',
          basis: str(to529),
        })
        const incentive = stateBenefit(s, to529, nyYearDeduction, stateYearCredit)
        nyYearDeduction = nyYearDeduction.plus(incentive.deduction)
        stateYearCredit = stateYearCredit.plus(incentive.credit)
        accounts['529'].nyDeductions = accounts['529'].nyDeductions.plus(incentive.deduction)
        accounts['529'].stateBenefits = accounts['529'].stateBenefits.plus(incentive.benefit)
        benefits = benefits.plus(incentive.benefit)
        if (incentive.benefit.gt(0))
          log(
            date,
            'benefit',
            incentive.benefit,
            s.comparisonMode === 'net'
              ? 'State incentive supports a larger gross deposit at the same net parental cost; same-year refund availability is a planning assumption.'
              : 'Parent-side state incentive; not reinvested.',
            {
              payer: 'parent tax return',
              sourceIds: s.state529Mode === 'ny' ? ['SRC-NY-IT201'] : [],
            },
          )
      }
      const requested = scheduled.mul(
        allocation.filter((v) => v.vehicle === 'trump').reduce((sum, v) => sum + v.share, 0),
      )
      const eligible =
        date >= monthDate(ira.contributionStart.value) &&
        date >= '2026-07-04' &&
        date < trumpAvailableFrom(s.birthDate)
      const toTrump = eligible
        ? Decimal.min(
            requested,
            nonnegative(D(ira.trumpAnnualLimit.value).minus(trumpYearContributions)),
          )
        : D(0)
      if (toTrump.gt(0)) {
        contribute(accounts.trump, toTrump, date)
        trumpYearContributions = trumpYearContributions.plus(toTrump)
        parent = parent.plus(toTrump)
        iraYearBasis = iraYearBasis.plus(toTrump)
        log(
          date,
          'contribution',
          toTrump,
          'Parent-funded Trump contribution creates nondeductible basis.',
          {
            vehicleId: 'trump',
            basis: str(toTrump),
            balance: str(accounts.trump.balance),
            payer: 'parent',
            sourceIds: ['SRC-IRS-4547'],
          },
        )
      }
      rejected = rejected.plus(requested.minus(toTrump))
      if (
        eligible &&
        allocation.some((v) => v.vehicle === 'trump' && v.share > 0) &&
        s.employerAnnual > 0
      ) {
        const employer = Decimal.min(
          D(s.employerAnnual).div(12),
          nonnegative(D(ira.trumpAnnualLimit.value).minus(trumpYearContributions)),
        )
        if (employer.gt(0)) {
          contribute(accounts.trump, employer, date, false)
          trumpYearContributions = trumpYearContributions.plus(employer)
          thirdParty = thirdParty.plus(employer)
          log(
            date,
            'contribution',
            employer,
            'Employer contribution counts toward general cap and creates no basis.',
            {
              vehicleId: 'trump',
              basis: '0.00',
              payer: 'employer',
              sourceIds: ['SRC-IRS-4547', 'SRC-IRS-TA-2026-37'],
            },
          )
        }
      }
      for (const part of allocation.filter((v) => !['529', 'trump'].includes(v.vehicle))) {
        const wanted = scheduled.mul(part.share),
          account = accounts[part.vehicle]
        let accepted = wanted
        if (part.vehicle === 'childRoth') {
          accepted = Decimal.min(
            wanted,
            nonnegative(
              D(ira.annualRothCap.value).minus(s.annualOtherIraContributions).minus(rothYearUsed),
            ),
            nonnegative(
              yearlyEarned(date).minus(s.annualOtherIraContributions).minus(rothYearUsed),
            ),
          )
          rothYearUsed = rothYearUsed.plus(accepted)
        }
        if (part.vehicle === 'parentRoth') {
          const cap =
            parentAgeAt(s, `${y}-12-31`) >= 50 ? ira.annualRothCap50.value : ira.annualRothCap.value
          accepted = s.parentRothEligible
            ? Decimal.min(
                wanted,
                nonnegative(
                  D(cap)
                    .minus(s.parentOtherIraContributions)
                    .mul(s.householdBudgetShare)
                    .minus(parentRothYearUsed),
                ),
                nonnegative(
                  D(s.parentCompensation)
                    .minus(s.parentOtherIraContributions)
                    .mul(s.householdBudgetShare)
                    .minus(parentRothYearUsed),
                ),
              )
            : D(0)
          parentRothYearUsed = parentRothYearUsed.plus(accepted)
        }
        if (accepted.gt(0)) {
          contribute(account, accepted, date)
          parent = parent.plus(accepted)
          log(
            date,
            'contribution',
            accepted,
            'Scheduled parent contribution to the selected account. Ownership and IRA compensation/cap restrictions remain distinct.',
            {
              vehicleId: account.id,
              payer: 'parent',
              basis: str(accepted),
              balance: str(account.balance),
              sourceIds: vehicleRegistry[account.id].sourceIds,
            },
          )
        }
        rejected = rejected.plus(wanted.minus(accepted))
      }
    }
    if (
      s.pilotEnabled &&
      !pilotAdded &&
      allocationAt(s, age).some((v) => v.vehicle === 'trump' && v.share > 0) &&
      pilotEligible(s.birthDate) &&
      date >= '2026-07-04' &&
      date < trumpAvailableFrom(s.birthDate)
    ) {
      contribute(accounts.trump, D(ira.pilotAmount.value), date, false)
      thirdParty = thirdParty.plus(ira.pilotAmount.value)
      pilotAdded = true
      log(
        date,
        'contribution',
        D(ira.pilotAmount.value),
        'Optional pilot; citizenship, SSN, and election assumed. No basis.',
        {
          vehicleId: 'trump',
          payer: 'federal pilot',
          basis: '0.00',
          sourceIds: ['SRC-IRS-4547', 'SRC-IRS-TA-2026-38'],
        },
      )
    }
    const investedRate =
      s.glidePath && age >= s.glideStartAge && date < educationEnd ? glideMonthly : monthly
    const shock = s.shockEnabled && !shockApplied && previousAge < s.shockAge && age >= s.shockAge
    for (const account of Object.values(accounts)) {
      if (account.balance.isZero()) continue
      const rate = account.id === 'cash' ? cashMonthly : investedRate
      let growth = D(0),
        drag = D(0)
      if (['brokerage', 'custodial'].includes(account.id)) {
        const dividend = account.balance.mul(dividendMonthly)
        growth = accrue(account, rate.minus(dividendMonthly))
        const effective =
          (account.id === 'brokerage' ? s.parentCapitalGainsRate : s.childCapitalGainsRate) +
          s.stateInvestmentTaxRate
        drag = dividend.mul(effective)
        contribute(account, nonnegative(dividend.minus(drag)), date)
        growth = growth.plus(dividend)
        // Proportional sales need one long-term cohort plus recent dated lots, not
        // hundreds of separate old dividend reinvestments with identical tax treatment.
        const cutoff = addMonths(date, -12)
        const old = account.lots.filter((l) => l.date < cutoff)
        if (old.length > 1)
          account.lots = [
            {
              date: old[0].date,
              value: old.reduce((v, l) => v.plus(l.value), D(0)),
              basis: old.reduce((v, l) => v.plus(l.basis), D(0)),
            },
            ...account.lots.filter((l) => l.date >= cutoff),
          ]
      } else {
        growth = accrue(account, rate)
        if (account.id === 'cash') {
          drag = nonnegative(growth).mul(
            s.parentOrdinaryRate + (s.cashKind === 'treasury' ? 0 : s.stateInvestmentTaxRate),
          )
          remove(account, drag)
          account.basis = account.balance
        }
      }
      if (!growth.isZero())
        log(
          date,
          'growth',
          growth,
          'Monthly total return; taxable reinvested distributions increase basis. Cash uses its separate return assumption.',
          { vehicleId: account.id, balance: str(account.balance) },
        )
      if (drag.gt(0)) {
        investmentTaxes = investmentTaxes.plus(drag)
        log(
          date,
          'tax',
          drag,
          'Investment income tax withheld from interest/dividends, not paid by an extra parent contribution.',
          {
            vehicleId: account.id,
            payer: 'investment income',
            tax: str(drag),
            sourceIds: ['SRC-IRS-PUB550', 'SRC-IRS-8615'],
          },
        )
      }
      if (shock && account.id !== 'cash') {
        const change = accrue(account, D(s.shockReturn))
        log(
          date,
          'growth',
          change,
          'One-time adverse-return stress scenario; an assumption, not a forecast.',
          { vehicleId: account.id, balance: str(account.balance) },
        )
      }
    }
    if (shock) shockApplied = true
    previousAge = age
    const careerGrowth = career.mul(monthly)
    career = career.plus(careerGrowth)
    if (!careerGrowth.isZero())
      log(
        date,
        'growth',
        careerGrowth,
        'Monthly growth in the separate career-funded retirement bucket.',
        { vehicleId: 'career', balance: str(career) },
      )
    opportunity = opportunity.mul(D(1).plus(monthly))
    let monthlyPayments = D(0),
      federalPaymentsThisMonth = D(0)
    for (const loan of loans) {
      if (loan.payoffDate) continue
      const tick = tickLoan(loan, date)
      if (tick.interest.gt(0))
        log(
          date,
          'loan',
          tick.interest,
          loan.started
            ? 'Repayment-period interest accrued.'
            : 'Unsubsidized in-school/grace interest accrued; not compounded before repayment.',
          {
            vehicleId: loan.id,
            balance: str(loan.balance.plus(loan.accrued)),
            sourceIds: ['SRC-FSA-SUBSIDIZED'],
          },
        )
      if (tick.payment.gt(0)) {
        if (loan.kind === 'federal')
          federalPaymentsThisMonth = federalPaymentsThisMonth.plus(tick.payment)
        monthlyPayments = monthlyPayments.plus(tick.payment)
        log(
          date,
          'loan-payment',
          tick.payment,
          'Scheduled amortizing payment. Child earnings obligation.',
          {
            vehicleId: loan.id,
            payer: 'child earnings',
            balance: str(loan.balance.plus(loan.accrued)),
          },
        )
      }
    }
    let extraBudget = Decimal.min(
      D(s.extraDebtPayment),
      nonnegative(incomeCash.minus(monthlyPayments)),
    )
    const repaymentOrder = [...loans]
      .filter((l) => l.started && !l.payoffDate)
      .sort((a, b) =>
        s.extraDebtOrder === 'highestRate'
          ? b.annualRate - a.annualRate
          : s.extraDebtOrder === 'federalFirst'
            ? a.kind === 'federal'
              ? -1
              : 1
            : a.kind === 'gap'
              ? -1
              : 1,
      )
    for (const loan of repaymentOrder) {
      const paid = extraLoanPayment(loan, extraBudget)
      if (paid.gt(0)) {
        extraBudget = extraBudget.minus(paid)
        monthlyPayments = monthlyPayments.plus(paid)
        if (loan.kind === 'federal') federalPaymentsThisMonth = federalPaymentsThisMonth.plus(paid)
        if (loan.balance.plus(loan.accrued).lt('0.00000001')) loan.payoffDate = date
        log(
          date,
          'loan-payment',
          paid,
          'Extra principal payment funded from available modeled child gross earnings; reduces career saving capacity.',
          { vehicleId: loan.id, payer: 'child earnings', balance: str(loan.balance) },
        )
      }
    }
    // Eligible 529 reimbursements of actual scheduled loan payments, once only.
    if (
      s.studentLoan529Enabled &&
      monthlyPayments.gt(0) &&
      loan529Used.lt(ira.studentLoanLifetimeCap.value)
    ) {
      const requested = Decimal.min(
        monthlyPayments,
        federalPaymentsThisMonth,
        D(ira.studentLoanLifetimeCap.value).minus(loan529Used),
      )
      const w = withdrawNet(accounts['529'], requested, withdrawalContext(date, true))
      loan529Used = loan529Used.plus(w.net)
      monthlyPayments = monthlyPayments.minus(w.net)
      if (w.net.gt(0))
        log(
          date,
          'withdrawal',
          w.gross,
          '529 qualified federal student-loan payment reimbursement; reduces earnings obligation and consumes $10,000 lifetime allowance.',
          {
            vehicleId: '529',
            payer: '529',
            basis: str(w.basis),
            tax: '0.00',
            penalty: '0.00',
            balance: str(accounts['529'].balance),
            sourceIds: ['SRC-IRS-529-TOPIC313', 'SRC-NY-IT225'],
          },
        )
    }
    opportunity = opportunity.plus(monthlyPayments)
    maxPayment = Decimal.max(maxPayment, monthlyPayments)
    if (monthlyPayments.gt(incomeCash) && monthlyPayments.gt(0))
      warnings.add(
        'Required loan payments exceed modeled gross child earnings in some months. Repayment is an obligation scenario, not a solvency or lending guarantee; career saving is floored at zero.',
      )
    const inEducation = s.educationYears > 0 && date >= educationStart && date < educationEnd
    if (inEducation) {
      const monthIndex =
        (Number(date.slice(0, 4)) - Number(educationStart.slice(0, 4))) * 12 +
        Number(date.slice(5, 7)) -
        Number(educationStart.slice(5, 7))
      const academicYear = Math.floor(monthIndex / 12)
      const creditActive = educationCredit(s, D(s.creditReserveAnnual), creditYears).gt(0)
      const costs = expenseKeys.map((key) => ({ key, expense: money(D(s.expenses[key]).div(12)) }))
      const cost = costs.reduce((a, c) => a.plus(c.expense), D(0))
      if (s.aidMode === 'assetImpact' && academicYear !== assessedYear) {
        assessedYear = academicYear
        const assessment = assetAssessment(s, accounts)
        assessedReduction = assessment.reduction
        aidAssessment.push({
          date,
          federalAssetContribution: str(assessment.federal),
          institutionAssetContribution: str(assessment.institution),
          modeledAidReduction: str(Decimal.min(s.annualAid, assessment.reduction)),
        })
        log(
          date,
          'valuation',
          assessment.federal,
          'Current-year dependent FAFSA asset component sensitivity, not a full SAI or grant award. Institutional formula and award response are user assumptions.',
          { sourceIds: ['SRC-FSA-ASSETS2026', 'SRC-FSA-SAI2026'] },
        )
      }
      const aid = Decimal.min(
        cost,
        money(nonnegative(D(s.annualAid).minus(assessedReduction)).div(12)),
      )
      const child = Decimal.min(cost.minus(aid), money(D(s.annualChildEducation).div(12)))
      cashUsed = cashUsed.plus(child)
      if (child.gt(incomeCash))
        warnings.add(
          'Explicit child education funding exceeds modeled gross earnings in some months. It remains an independently enabled child-owned funding assumption; verify its availability.',
        )
      let fromAccounts = D(0),
        fromFederal = D(0),
        fromGap = D(0),
        unfunded = D(0)
      const residualTotal = cost.minus(aid).minus(child)
      let allocatedResidual = D(0)
      const borrowFederal = (needed: Decimal): Decimal => {
        if (!s.eligibleInstitution || !s.halfTime || needed.lte(0)) return D(0)
        const limit = federal.annualLimits.value[Math.min(2, academicYear)]
        const used = federalSchoolUsed.get(academicYear) ?? D(0)
        const amount = Decimal.min(
          needed,
          nonnegative(D(limit).minus(used)),
          nonnegative(D(federal.aggregateLimit.value).minus(federalTotal)),
        )
        if (amount.lte(0)) return D(0)
        const subsidyCap = Math.min(
          s.subsidizedAnnual,
          federal.subsidizedAnnualLimits.value[Math.min(2, academicYear)],
        )
        const subUsed = subsidizedSchoolUsed.get(academicYear) ?? D(0)
        const subTotal = loans
          .filter((l) => l.subsidized)
          .reduce((a, l) => a.plus(l.principal), D(0))
        const subsidy = Decimal.min(
          amount,
          nonnegative(D(subsidyCap).minus(subUsed)),
          nonnegative(D(federal.subsidizedAggregate.value).minus(subTotal)),
        )
        for (const [principal, subsidized] of [
          [subsidy, true],
          [amount.minus(subsidy), false],
        ] as const) {
          if (principal.lte(0)) continue
          let loan = loans.find(
            (l) => l.kind === 'federal' && l.originatedAt === date && l.subsidized === subsidized,
          )
          if (loan) {
            loan.principal = loan.principal.plus(principal)
            loan.balance = loan.balance.plus(principal)
          } else {
            loan = originateLoan(
              `federal-${loans.length + 1}`,
              'federal',
              principal,
              s.federalRate,
              date,
              addMonths(educationEnd, federal.graceMonths.value),
              s.federalTermYears * 12,
              subsidized,
            )
            loans.push(loan)
          }
          log(
            date,
            'loan',
            principal,
            `Academic year ${academicYear + 1} ${subsidized ? 'subsidized' : 'unsubsidized'} federal tranche originated for education.`,
            {
              vehicleId: loan.id,
              payer: 'federal loan',
              sourceIds: ['SRC-FSA-LOAN-LIMITS', 'SRC-FSA-RATES-2026'],
            },
          )
        }
        federalSchoolUsed.set(academicYear, used.plus(amount))
        subsidizedSchoolUsed.set(academicYear, subUsed.plus(subsidy))
        federalTotal = federalTotal.plus(amount)
        return amount
      }
      const spend = (account: Account, needed: Decimal, key: ExpenseKey): Decimal => {
        const isQualified =
          s.eligibleInstitution && ['tuition', 'books', 'computer', 'roomBoard'].includes(key)
        const qualified = isQualified && (key !== 'roomBoard' || s.halfTime)
        let qualifiedAmount =
          key === 'roomBoard' ? Decimal.min(needed, D(s.roomBoardQualifiedLimit).div(12)) : needed
        if (account.id === '529' && creditActive && ['tuition', 'books'].includes(key))
          qualifiedAmount = nonnegative(
            qualifiedAmount.minus(
              D(s.creditReserveAnnual)
                .div(12)
                .mul(key === 'books' ? 0 : 1),
            ),
          )
        let net = D(0)
        for (const [want, qualify] of [
          [qualifiedAmount, qualified],
          [needed.minus(qualifiedAmount), false],
        ] as const) {
          if (want.lte(0)) continue
          if (account.id === '529' && !qualify && key === 'tuition' && creditActive) continue
          const exemption =
            account.id === '529' && !qualify
              ? nonnegative(D(s.annual529PenaltyException).minus(penaltyExceptionUsed))
              : D(0)
          const w = withdrawNet(account, want, {
            ...withdrawalContext(date, qualify),
            additionalTaxExemptGross: exemption,
          })
          if (account.id === '529' && !qualify)
            penaltyExceptionUsed = penaltyExceptionUsed.plus(Decimal.min(w.gross, exemption))
          if (w.gross.lte(0)) continue
          net = net.plus(w.net)
          taxes = taxes.plus(w.tax).plus(w.stateRecapture)
          penalties = penalties.plus(w.penalty)
          if (['529', 'trump', 'custodial', 'childRoth', 'wageRoth'].includes(account.id))
            unearned = unearned.plus(w.taxable)
          if (account.id === 'trump') {
            iraYearDistributions = iraYearDistributions.plus(w.gross)
            iraYearPlanningTaxable = iraYearPlanningTaxable.plus(w.taxable)
          }
          log(
            date,
            'withdrawal',
            w.gross,
            `Education ${key}: ${qualify ? 'qualified' : 'nonqualified'} withdrawal; ${str(w.net)} spendable after tax.`,
            {
              vehicleId: account.id,
              basis: str(w.basis),
              taxable: str(w.taxable),
              tax: str(w.tax.plus(w.stateRecapture)),
              penalty: str(w.penalty),
              balance: str(account.balance),
              payer: 'account withdrawal',
              sourceIds: vehicleRegistry[account.id].sourceIds,
            },
          )
        }
        return net
      }
      costs.forEach(({ key, expense }, index) => {
        let need =
          index === costs.length - 1
            ? residualTotal.minus(allocatedResidual)
            : cost.isZero()
              ? D(0)
              : money(residualTotal.mul(expense).div(cost))
        need = Decimal.min(nonnegative(need), nonnegative(residualTotal.minus(allocatedResidual)))
        allocatedResidual = allocatedResidual.plus(need)
        if (s.fundingPolicy === 'preserveRetirement') {
          const amount = borrowFederal(need)
          need = need.minus(amount)
          fromFederal = fromFederal.plus(amount)
        }
        const orders = {
          educationFirst: [
            '529',
            'brokerage',
            'cash',
            'custodial',
            'trump',
            'childRoth',
            'wageRoth',
            'parentRoth',
          ],
          flexibleFirst: [
            'brokerage',
            'cash',
            'custodial',
            '529',
            'trump',
            'childRoth',
            'wageRoth',
            'parentRoth',
          ],
          retirementFirst: [
            'trump',
            'childRoth',
            'wageRoth',
            'parentRoth',
            '529',
            'brokerage',
            'cash',
            'custodial',
          ],
        } as const
        let qualified529 = D(0)
        for (const vehicle of orders[s.withdrawalOrder]) {
          const account = accounts[vehicle]
          const amount = spend(account, need, key)
          need = nonnegative(need.minus(amount))
          fromAccounts = fromAccounts.plus(amount)
          if (vehicle === '529' && s.eligibleInstitution && ['tuition', 'books'].includes(key))
            qualified529 = qualified529.plus(amount)
        }
        if (s.fundingPolicy === 'minimizeDebt') {
          const amount = borrowFederal(need)
          need = need.minus(amount)
          fromFederal = fromFederal.plus(amount)
        }
        if (need.gt('0.00000001') && s.gapEnabled) {
          let loan = loans.find((l) => l.kind === 'gap' && l.originatedAt === date)
          if (loan) {
            loan.principal = loan.principal.plus(need)
            loan.balance = loan.balance.plus(need)
          } else {
            loan = originateLoan(
              `gap-${loans.length + 1}`,
              'gap',
              need,
              s.gapRate,
              date,
              educationEnd,
              s.gapTermYears * 12,
            )
            loans.push(loan)
          }
          gapTotal = gapTotal.plus(need)
          fromGap = fromGap.plus(need)
          log(
            date,
            'loan',
            need,
            'Illustrative gap financing for remaining education expense; lender availability not guaranteed.',
            { vehicleId: loan.id, payer: 'illustrative gap loan' },
          )
          need = D(0)
        }
        unfunded = unfunded.plus(need)
        if (
          s.creditMode !== 'none' &&
          (key === 'tuition' || (s.creditMode === 'aotc' && key === 'books'))
        )
          creditExpenses = creditExpenses.plus(
            nonnegative(
              expense
                .minus(cost.isZero() ? 0 : aid.mul(expense).div(cost))
                .minus(qualified529)
                .minus(need),
            ),
          )
      })
      if (aid.gt(0))
        log(date, 'aid', aid, 'Explicit grant/scholarship aid; loans are not aid.', {
          payer: 'grant/scholarship',
        })
      if (child.gt(0))
        log(date, 'education', child, 'Explicitly enabled child-owned education funding.', {
          payer: 'child funding',
        })
      log(
        date,
        'education',
        cost,
        `Education bill reconciles: aid ${str(aid)} + accounts ${str(fromAccounts)} + child ${str(child)} + federal ${str(fromFederal)} + gap ${str(fromGap)} + unfunded ${str(unfunded)}.`,
      )
      if (unfunded.gt(0))
        log(
          date,
          'gap',
          unfunded,
          'UNFUNDED EDUCATION GAP. No additional parent contribution assumed.',
        )
      periods.push({
        date,
        age,
        expense: str(cost),
        aid: str(aid),
        accounts: str(fromAccounts),
        child: str(child),
        federal: str(fromFederal),
        gap: str(fromGap),
        unfunded: str(unfunded),
      })
    }
    const annualEvent = date.endsWith('-01-01') || date === start
    const conversionDate =
      s.conversionMode === 'immediate' ? trumpAvailableFrom(s.birthDate) : educationEnd
    const conversionDue =
      s.conversionMode !== 'none' &&
      date >= trumpAvailableFrom(s.birthDate) &&
      ((['immediate', 'afterSchool'].includes(s.conversionMode) && date >= conversionDate) ||
        (['fixed', 'threshold', 'custom'].includes(s.conversionMode) &&
          annualEvent &&
          date >= educationEnd))
    if (conversionDue && accounts.trump.balance.gt(0)) {
      let requested = accounts.trump.balance
      if (s.conversionMode === 'fixed') requested = D(s.conversionAnnual)
      if (s.conversionMode === 'threshold') {
        const targetTaxable = nonnegative(
          D(s.conversionThreshold).minus(annualSalary).minus(unearned),
        )
        const earningsRatio = accounts.trump.balance.isZero()
          ? D(0)
          : nonnegative(D(1).minus(accounts.trump.basis.div(accounts.trump.balance)))
        requested = earningsRatio.gt(0) ? targetTaxable.div(earningsRatio) : accounts.trump.balance
      }
      if (s.conversionMode === 'custom')
        requested = s.conversionSchedule
          .filter((e) => e.age === Math.floor(age))
          .reduce((a, e) => a.plus(e.amount), D(0))
      requested = Decimal.min(requested, accounts.trump.balance)
      const ctx = { ...taxContext(date, true) },
        ratio = accounts.trump.balance.isZero()
          ? D(0)
          : Decimal.min(1, accounts.trump.basis.div(accounts.trump.balance))
      const taxOn = (gross: Decimal) => incomeTax(gross.mul(D(1).minus(ratio)), ctx)
      if (s.conversionTaxPayer === 'earnings') {
        // Reserve the entire year's conversion tax from one month's explicit available gross cash.
        const availableCash = nonnegative(incomeCash.minus(cashUsed).minus(monthlyPayments))
        if (taxOn(requested).gt(availableCash)) {
          let lo = D(0),
            hi = requested
          for (let n = 0; n < 60; n++) {
            const mid = lo.plus(hi).div(2)
            if (taxOn(mid).gt(availableCash)) hi = mid
            else lo = mid
          }
          requested = lo
          warnings.add(
            'Conversion limited by explicit child earnings available for tax; parents supply no additional tax payment.',
          )
        }
      }
      if (requested.gt('0.005')) {
        const tax = taxOn(requested)
        let withheld = D(0),
          withholdingPenalty = D(0)
        if (s.conversionTaxPayer === 'account') {
          const penaltyRate =
            age < 59.5 ? D(ira.additionalTaxRate.value).mul(D(1).minus(ratio)) : D(0)
          withheld = Decimal.min(requested, tax.div(D(1).minus(penaltyRate)))
          withholdingPenalty = withheld.mul(penaltyRate)
        } else cashUsed = cashUsed.plus(tax)
        const toRoth = nonnegative(requested.minus(withheld)),
          basis = remove(accounts.trump, requested)
        contribute(accounts.roth, toRoth, date)
        accounts.roth.rothCategories.conversions.push({ year: y, amount: toRoth })
        unearned = unearned.plus(requested.minus(basis))
        iraYearDistributions = iraYearDistributions.plus(requested)
        iraYearPlanningTaxable = iraYearPlanningTaxable.plus(requested.minus(basis))
        converted = converted.plus(toRoth)
        conversionTaxes = conversionTaxes.plus(tax)
        penalties = penalties.plus(withholdingPenalty)
        log(
          date,
          'conversion',
          toRoth,
          `Trump → Roth: ${str(requested)} removed, ${str(basis)} basis, ${str(requested.minus(basis))} taxable, ${str(tax)} tax, ${str(withholdingPenalty)} withholding penalty, ${str(toRoth)} reaches Roth.`,
          {
            vehicleId: 'roth',
            basis: str(basis),
            taxable: str(requested.minus(basis)),
            tax: str(tax),
            penalty: str(withholdingPenalty),
            payer:
              s.conversionTaxPayer === 'account' ? 'Trump account withholding' : 'child earnings',
            balance: str(accounts.roth.balance),
            sourceIds: ['SRC-IRS-8606', 'SRC-IRS-PUB590A', 'SRC-IRS-TOPIC557'],
          },
        )
        if (kiddieApplies(s, y, yearlyEarned(date)))
          warnings.add(
            'Conversion occurs during a potentially Form 8615 kiddie-tax year. Manual rates must reflect the parent/support/student situation; estimate mode is simplified.',
          )
      }
    }
    if (
      s.rolloverEnabled &&
      annualEvent &&
      date >= educationEnd &&
      date > addMonths(s.accountOpenedAt, 15 * 12)
    ) {
      const cutoff = addMonths(date, -5 * 12)
      const eligibleLots = accounts['529'].lots.filter((lot) => lot.date < cutoff)
      const eligibleValue = eligibleLots.reduce((a, lot) => a.plus(lot.value), D(0))
      const statutoryCapacity =
        y - Number(s.birthDate.slice(0, 4)) >= 50
          ? ira.annualRothCap50.value
          : ira.annualRothCap.value
      const remainingAnnual = nonnegative(
        Decimal.min(s.annualRothCapacity, statutoryCapacity)
          .minus(s.annualOtherIraContributions)
          .minus(rothYearUsed),
      )
      const compensation = nonnegative(yearlyEarned(date).minus(s.annualOtherIraContributions))
      const amount = Decimal.min(
        accounts['529'].balance,
        eligibleValue,
        nonnegative(D(ira.rolloverLifetimeCap.value).minus(rolled)),
        remainingAnnual,
        compensation,
      )
      if (amount.gt(0)) {
        // Remove from eligible dated lots only, preserving the five-year exclusion.
        const fraction = amount.div(eligibleValue)
        let basisRemoved = D(0)
        for (const lot of eligibleLots) {
          basisRemoved = basisRemoved.plus(lot.basis.mul(fraction))
          lot.value = lot.value.mul(D(1).minus(fraction))
          lot.basis = lot.basis.mul(D(1).minus(fraction))
        }
        accounts['529'].balance = nonnegative(accounts['529'].balance.minus(amount))
        accounts['529'].basis = nonnegative(accounts['529'].basis.minus(basisRemoved))
        contribute(accounts.roth, amount, date)
        accounts.roth.rothCategories.rollovers = accounts.roth.rothCategories.rollovers.plus(amount)
        rolled = rolled.plus(amount)
        rothYearUsed = rothYearUsed.plus(amount)
        accounts['529'].rolloverLifetime = rolled
        log(
          date,
          'rollover',
          amount,
          '529 → Roth direct-transfer illustration; compensation, annual/lifetime limits, 15-year age and five-year lots enforced.',
          {
            vehicleId: 'roth',
            payer: '529 transfer',
            basis: str(amount),
            tax: '0.00',
            balance: str(accounts.roth.balance),
            sourceIds: ['SRC-IRS-529-TOPIC313', 'SRC-IRS-PUB590A', 'SRC-NY-IT225'],
          },
        )
      }
    }
    if (s.childRothAnnualSaving > 0 && incomeCash.gt(0)) {
      const amount = Decimal.min(
        D(s.childRothAnnualSaving).div(12),
        nonnegative(incomeCash.minus(cashUsed).minus(monthlyPayments)),
        nonnegative(
          D(
            y - Number(s.birthDate.slice(0, 4)) >= 50
              ? ira.annualRothCap50.value
              : ira.annualRothCap.value,
          )
            .minus(s.annualOtherIraContributions)
            .minus(rothYearUsed),
        ),
        nonnegative(yearlyEarned(date).minus(s.annualOtherIraContributions).minus(rothYearUsed)),
      )
      if (amount.gt(0)) {
        contribute(accounts.wageRoth, amount, date)
        rothYearUsed = rothYearUsed.plus(amount)
        cashUsed = cashUsed.plus(amount)
        childEarnedContributions = childEarnedContributions.plus(amount)
        log(
          date,
          'contribution',
          amount,
          'Additional direct Roth saving explicitly funded from child wages, subject to compensation and shared annual IRA capacity. Separate from parental funding.',
          {
            vehicleId: 'wageRoth',
            payer: 'child earnings',
            basis: str(amount),
            sourceIds: ['SRC-IRS-PUB590A'],
          },
        )
      }
    }
    if (s.careerEnabled && date >= retirementStart) {
      const planned = incomeCash.mul(s.savingsRate)
      const contribution = nonnegative(
        Decimal.min(
          nonnegative(incomeCash.minus(cashUsed).minus(monthlyPayments)),
          nonnegative(planned.minus(s.debtCrowdOut ? monthlyPayments : 0)),
        ),
      )
      career = career.plus(contribution)
      if (contribution.gt(0))
        log(
          date,
          'career',
          contribution,
          'Child’s career-funded retirement saving; distinct from childhood strategy. Gross-income saving approximation, no payroll/living-expense tax-return model.',
          { vehicleId: 'career', payer: 'child earnings', balance: str(career) },
        )
    }
    timeline.push({
      date,
      age,
      plan529: str(accounts['529'].balance),
      traditional: str(accounts.trump.balance),
      roth: str(accounts.roth.balance),
      debt: str(loanBalance()),
      career: str(career.plus(accounts.wageRoth.balance)),
      flexible: str(
        accounts.brokerage.balance
          .plus(accounts.custodial.balance)
          .plus(accounts.cash.balance)
          .plus(accounts.childRoth.balance),
      ),
      parentRetirement: str(accounts.parentRoth.balance),
    })
  }
  settleYear()
  if (!captured18) age18 = allBalances()
  if (rejected.gt(0))
    warnings.add(
      `${str(rejected)} of scheduled contributions could not enter the chosen accounts because of eligibility/compensation/caps; not counted as contributions or invested elsewhere.`,
    )
  if (s.educationYears > 0 && educationStart < start)
    warnings.add(
      'Education began before this simulation. Only remaining months are modeled; previous savings, expenses, and debts are not reconstructed.',
    )
  const liquidation529 = vehicleRegistry['529'].quote(accounts['529'], accounts['529'].balance, {
    ...withdrawalContext(retirementDate, false),
    tax: {
      ...taxContext(retirementDate),
      scenario: { ...s, taxMode: 'manual', withdrawalTaxRate: s.retirementTaxRate },
    },
  })
  const traditionalTax = nonnegative(accounts.trump.balance.minus(accounts.trump.basis)).mul(
    s.retirementTaxRate,
  )
  const rothFirstYear = accounts.roth.lots.length
    ? Number(accounts.roth.lots[0].date.slice(0, 4))
    : 0
  const rothQualified =
    !rothFirstYear || retirementDate >= `${rothFirstYear + ira.rothTaxYears.value}-01-01`
  const rothTax = rothQualified
    ? D(0)
    : nonnegative(accounts.roth.balance.minus(accounts.roth.basis)).mul(s.retirementTaxRate)
  if (!rothQualified)
    warnings.add(
      'Roth account has not satisfied its five-tax-year requirement at retirement; earnings are included in hypothetical ordinary liquidation tax.',
    )
  const ctx = withdrawalContext(retirementDate, false)
  const flexibleQuotes = [
    accounts.brokerage,
    accounts.custodial,
    accounts.cash,
    accounts.childRoth,
  ].map((a) =>
    vehicleRegistry[a.id].quote(a, a.balance, {
      ...ctx,
      tax: { ...ctx.tax, scenario: { ...s, withdrawalTaxRate: s.retirementTaxRate } },
    }),
  )
  const flexibleNet = flexibleQuotes.reduce((sum, w) => sum.plus(w.net), D(0))
  const flexibleTax = flexibleQuotes.reduce((sum, w) => sum.plus(w.tax), D(0))
  const parentQuote = vehicleRegistry.parentRoth.quote(
    accounts.parentRoth,
    accounts.parentRoth.balance,
    ctx,
  )
  const parentRetirement = parentQuote.net
  const wageRothQuote = vehicleRegistry.wageRoth.quote(
    accounts.wageRoth,
    accounts.wageRoth.balance,
    { ...ctx, tax: { ...ctx.tax, scenario: { ...s, withdrawalTaxRate: s.retirementTaxRate } } },
  )
  const careerNet = career.plus(wageRothQuote.net)
  const family529 =
    s.leftover529 === 'family' && s.familyTransferEligible ? accounts['529'].balance : D(0)
  const childhood = (family529.gt(0) ? D(0) : liquidation529.net)
    .plus(accounts.trump.balance.minus(traditionalTax))
    .plus(accounts.roth.balance.minus(rothTax))
    .plus(flexibleNet)
  log(
    retirementDate,
    'valuation',
    childhood,
    'Hypothetical after-tax childhood-funded valuation, not an executed sale: remaining 529 nonqualified liquidation unless retained for family; traditional taxable share; qualified Roth and direct child Roth; flexible investments net of gain taxes. Parent retirement, restricted family 529 and child wage-funded Roth remain separate.',
    {
      tax: str(
        (family529.gt(0) ? D(0) : liquidation529.tax.plus(liquidation529.stateRecapture))
          .plus(traditionalTax)
          .plus(rothTax)
          .plus(flexibleTax),
      ),
      penalty: str(family529.gt(0) ? D(0) : liquidation529.penalty),
      payer: 'hypothetical liquidation proceeds',
      sourceIds: [
        'SRC-IRS-PUB970',
        'SRC-IRS-8606',
        'SRC-IRS-PUB590B',
        'SRC-IRS-PUB550',
        'SRC-NY-IT225',
      ],
    },
  )
  if (parentRetirement.gt(0))
    log(
      retirementDate,
      'valuation',
      parentRetirement,
      'Retained parent retirement assets at the child comparison horizon; not transferred to the child and not included in childhood-funded assets.',
      {
        vehicleId: 'parentRoth',
        payer: 'hypothetical parent liquidation proceeds',
        tax: str(parentQuote.tax),
        penalty: str(parentQuote.penalty),
        sourceIds: ['SRC-IRS-PUB590B'],
      },
    )
  if (family529.gt(0))
    log(
      retirementDate,
      'valuation',
      family529,
      'Retained restricted family education savings; same-generation eligible beneficiary change confirmed. No spendable child retirement proceeds or executed liquidation.',
      { vehicleId: '529', sourceIds: ['SRC-IRS-PUB970'] },
    )
  if (accounts.wageRoth.balance.gt(0))
    log(
      retirementDate,
      'valuation',
      wageRothQuote.net,
      'After-tax child wage-funded Roth value, included once in separate career assets, excluded from childhood-funded assets.',
      {
        vehicleId: 'wageRoth',
        payer: 'hypothetical wage-funded Roth liquidation proceeds',
        tax: str(wageRothQuote.tax),
        penalty: str(wageRothQuote.penalty),
        sourceIds: ['SRC-IRS-PUB590B'],
      },
    )
  const sum = (key: keyof Omit<FundingPeriod, 'date' | 'age'>) =>
    periods.reduce((a, p) => a.plus(p[key]), D(0))
  const totalInterest = loans.reduce((a, l) => a.plus(l.interest), D(0))
  const payoff =
    loans.length && loans.every((l) => l.payoffDate)
      ? Math.max(...loans.map((l) => ageAt(l.payoffDate!, s.birthDate)))
      : null
  return {
    id,
    name,
    ledger,
    timeline,
    contributions: {
      parent: str(parent),
      thirdParty: str(thirdParty),
      rejected: str(rejected),
      age18: str(age18),
      netParentOutlay: str(parent.minus(benefits).minus(credits)),
      childEarned: str(childEarnedContributions),
    },
    education: {
      periods,
      cost: str(sum('expense')),
      aid: str(sum('aid')),
      accounts: str(sum('accounts')),
      child: str(sum('child')),
      federal: str(sum('federal')),
      gap: str(sum('gap')),
      unfunded: str(sum('unfunded')),
      taxes: str(taxes),
      penalties: str(
        penalties.minus(
          ledger
            .filter((e) => e.category === 'conversion')
            .reduce((a, e) => a.plus(e.penalty ?? 0), D(0)),
        ),
      ),
    },
    debt: {
      tranches: loans.map((l) => ({
        id: l.id,
        kind: l.kind,
        originatedAt: l.originatedAt,
        repaymentStartsAt: l.repaymentStartsAt,
        annualRate: l.annualRate,
        subsidized: l.subsidized,
        termMonths: l.termMonths,
        principal: str(l.principal),
        accruedInSchool: str(l.schoolInterest),
        payment: str(
          l.payment.isZero()
            ? amortizingPayment(l.balance.plus(l.accrued), l.annualRate, l.termMonths)
            : l.payment,
        ),
        repaid: str(l.repaid),
        interest: str(l.interest),
        balance: str(l.balance.plus(l.accrued)),
        payoffDate: l.payoffDate,
      })),
      federalPrincipal: str(federalTotal),
      gapPrincipal: str(gapTotal),
      graduationBalance: str(graduationDebt),
      totalInterest: str(totalInterest),
      repaid: str(loans.reduce((a, l) => a.plus(l.repaid), D(0))),
      monthlyPayment: str(maxPayment),
      payoffAge: payoff,
      remaining: str(loanBalance()),
      opportunityCost: str(opportunity),
    },
    taxes: {
      withdrawal: str(taxes),
      conversion: str(conversionTaxes),
      penalties: str(penalties),
      lifetime: str(taxes.plus(conversionTaxes).plus(investmentTaxes)),
    },
    conversions: { converted: str(converted), taxes: str(conversionTaxes), rollover: str(rolled) },
    retirement: {
      plan529: str(accounts['529'].balance),
      traditional: str(accounts.trump.balance),
      roth: str(accounts.roth.balance),
      career: str(careerNet),
      parentRetirement: str(parentRetirement),
      afterTaxChildhood: str(childhood),
      wholeLifetime: str(childhood.plus(careerNet).minus(loanBalance())),
      liquidationTax: str(
        (family529.gt(0) ? D(0) : liquidation529.tax.plus(liquidation529.stateRecapture))
          .plus(traditionalTax)
          .plus(rothTax)
          .plus(flexibleTax),
      ),
      liquidationPenalty: str(family529.gt(0) ? D(0) : liquidation529.penalty),
      brokerage: str(accounts.brokerage.balance),
      custodial: str(accounts.custodial.balance),
      cash: str(accounts.cash.balance),
      childRoth: str(accounts.childRoth.balance),
      wageRoth: str(accounts.wageRoth.balance),
      family529: str(family529),
      householdAssets: str(
        childhood.plus(parentRetirement).plus(family529).plus(careerNet).minus(loanBalance()),
      ),
    },
    parentBenefits: str(benefits),
    educationCredits: str(credits),
    investmentTaxes: str(investmentTaxes),
    aidAssessment,
    iraWorksheets,
    warnings: [...warnings],
  }
}
export function expectFundingToReconcile(result: SimulationResult) {
  for (const p of result.education.periods) {
    const residual = D(p.expense)
      .minus(p.aid)
      .minus(p.accounts)
      .minus(p.child)
      .minus(p.federal)
      .minus(p.gap)
      .minus(p.unfunded)
    if (residual.abs().gt('0.01'))
      throw new Error(`Funding does not reconcile at ${p.date}: ${residual}`)
  }
}
