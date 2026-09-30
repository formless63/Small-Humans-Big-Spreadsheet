import { z } from 'zod'
import { D } from '../model/engine/money'
import { presetById } from './presets'

const amount = z.number().finite().min(0).max(1e7)
const rate = z.number().finite().min(0).max(0.8)
const date = z.iso.date().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date')
export const scenarioSchema = z
  .object({
    version: z.literal(1).default(1),
    asOf: date.default('2026-09-30'),
    birthDate: date.default('2024-09-30'),
    annualContribution: amount.default(5000),
    householdBudgetShare: z.number().min(0).max(1).default(1),
    contributionFrequency: z.enum(['monthly', 'annual']).default('monthly'),
    contributionEndAge: z.number().int().min(0).max(18).default(18),
    share529: z.number().min(0).max(1).default(0.5),
    strategyVehicle: z
      .enum([
        'split',
        '529',
        'trump',
        'brokerage',
        'custodial',
        'cash',
        'childRoth',
        'parentRoth',
        'custom',
      ])
      .default('split'),
    compareVehicles: z
      .array(z.enum(['529', 'trump', 'brokerage', 'custodial', 'cash', 'childRoth', 'parentRoth']))
      .max(7)
      .default(['529', 'trump']),
    allocation: z
      .array(
        z.object({
          vehicle: z.enum([
            '529',
            'trump',
            'brokerage',
            'custodial',
            'cash',
            'childRoth',
            'parentRoth',
          ]),
          share: z.number().min(0).max(1),
        }),
      )
      .max(7)
      .default([]),
    allocationChanges: z
      .array(
        z.object({
          age: z.number().min(0).max(25),
          vehicle: z.enum([
            '529',
            'trump',
            'brokerage',
            'custodial',
            'cash',
            'childRoth',
            'parentRoth',
          ]),
          share529: z.number().min(0).max(1),
        }),
      )
      .max(10)
      .default([]),
    comparisonMode: z.enum(['gross', 'net']).default('gross'),
    withdrawalOrder: z
      .enum(['educationFirst', 'flexibleFirst', 'retirementFirst'])
      .default('educationFirst'),
    glidePath: z.boolean().default(false),
    glideStartAge: z.number().min(0).max(30).default(14),
    glideReturn: z.number().min(-0.95).max(0.5).default(0.02),
    shockEnabled: z.boolean().default(false),
    shockAge: z.number().min(0).max(50).default(17),
    shockReturn: z.number().min(-0.95).max(0.5).default(-0.3),
    dividendYield: z.number().min(0).max(0.2).default(0.02),
    parentCapitalGainsRate: rate.default(0.15),
    parentOrdinaryRate: rate.default(0.24),
    childCapitalGainsRate: rate.default(0.15),
    stateInvestmentTaxRate: rate.default(0),
    cashReturn: z.number().min(0).max(0.3).default(0.02),
    cashKind: z.enum(['savings', 'cd', 'treasury']).default('savings'),
    cashMaturityAge: z.number().min(0).max(70).default(19),
    cashEarlyWithdrawalRate: rate.default(0),
    childEmploymentAge: z.number().int().min(0).max(25).default(16),
    childEmploymentAnnual: amount.default(0),
    childRothAnnualSaving: amount.default(0),
    parentAge: z.number().int().min(18).max(75).default(35),
    parentCompensation: amount.default(150000),
    parentRothEligible: z.boolean().default(false),
    parentOtherIraContributions: amount.default(0),
    parentRothEducation: z.boolean().default(false),
    childRothEducation: z.boolean().default(true),
    state529Mode: z.enum(['ny', 'custom', 'none']).default('ny'),
    customStateName: z.string().max(50).default('My state'),
    customStateDeductionCap: amount.default(0),
    customStateDeductionRate: rate.default(0),
    customStateCreditRate: rate.default(0),
    customStateCreditCap: amount.default(0),
    customStateRecapture: z.boolean().default(false),
    aidMode: z.enum(['manual', 'assetImpact']).default('manual'),
    parentAidMarginalRate: z.number().min(0).max(0.47).default(0.47),
    assetReportingExempt: z.boolean().default(false),
    trumpAidTreatment: z.enum(['retirement', 'parent', 'student']).default('retirement'),
    institutionAssessment: z.boolean().default(false),
    institutionParentAssetRate: rate.default(0.05),
    institutionStudentAssetRate: rate.default(0.25),
    institutionRetirementAssetRate: rate.default(0),
    aidAwardResponse: z.number().min(0).max(1).default(0),
    creditMode: z.enum(['none', 'aotc', 'llc']).default('none'),
    creditEligible: z.boolean().default(false),
    creditJoint: z.boolean().default(true),
    creditMagi: amount.default(150000),
    creditTaxLiability: amount.default(10000),
    creditReserveAnnual: amount.default(4000),
    extraDebtPayment: amount.default(0),
    extraDebtOrder: z.enum(['highestRate', 'federalFirst', 'gapFirst']).default('highestRate'),
    leftover529: z.enum(['liquidate', 'family']).default('liquidate'),
    siblingBirthDates: z.array(date).max(3).default([]),
    familyTransferEligible: z.boolean().default(false),
    outsideIraBasis: amount.default(0),
    outsideIraYearEndValue: amount.default(0),
    sensitivityEnabled: z.boolean().default(false),
    annualReturn: z.number().min(-0.95).max(0.5).default(0.05),
    retirementAge: z.number().int().min(60).max(70).default(65),
    educationPreset: z
      .enum(['none', 'trade', 'twoYear', 'public4', 'private', 'harvard', 'yale', 'custom'])
      .default('public4'),
    educationStartAge: z.number().int().min(16).max(30).default(18),
    educationYears: z.number().int().min(0).max(8).default(4),
    expenses: z
      .object({
        tuition: amount,
        books: amount,
        roomBoard: amount,
        computer: amount,
        transportation: amount,
        personal: amount,
        other: amount,
      })
      .default(presetById.public4.expenses),
    annualAid: amount.default(9650),
    annualChildEducation: amount.default(0),
    annual529PenaltyException: amount.default(0),
    eligibleInstitution: z.boolean().default(true),
    halfTime: z.boolean().default(true),
    roomBoardQualifiedLimit: amount.default(13200),
    fundingPolicy: z.enum(['minimizeDebt', 'preserveRetirement']).default('minimizeDebt'),
    gapEnabled: z.boolean().default(true),
    gapRate: rate.default(0.09),
    gapTermYears: z.number().int().min(1).max(30).default(10),
    federalRate: rate.default(0.0652),
    federalTermYears: z.number().int().min(1).max(30).default(10),
    subsidizedAnnual: amount.max(5500).default(0),
    pilotEnabled: z.boolean().default(false),
    employerAnnual: amount.max(2500).default(0),
    conversionMode: z
      .enum(['none', 'immediate', 'afterSchool', 'fixed', 'threshold', 'custom'])
      .default('none'),
    conversionAnnual: amount.default(7500),
    conversionThreshold: amount.default(25000),
    conversionSchedule: z
      .array(z.object({ age: z.number().int().min(18).max(69), amount }))
      .max(52)
      .default([]),
    conversionTaxPayer: z.enum(['account', 'earnings']).default('account'),
    taxMode: z.enum(['manual', 'estimate2026']).default('manual'),
    withdrawalTaxRate: rate.default(0.12),
    conversionTaxRate: rate.default(0.12),
    conversionTaxByAge: z
      .array(
        z.object({
          fromAge: z.number().int().min(18).max(69),
          throughAge: z.number().int().min(18).max(69),
          rate,
        }),
      )
      .max(52)
      .default([]),
    retirementTaxRate: rate.default(0.22),
    parentTaxableIncome: amount.default(150000),
    otherUnearnedIncome: amount.default(0),
    studentThroughAge: z.number().int().min(0).max(30).default(22),
    childEarnedOverHalfSupport: z.boolean().default(false),
    childSupportAnnual: amount.default(25000),
    nyEnabled: z.boolean().default(true),
    nyJoint: z.boolean().default(true),
    nyTaxRate: rate.default(0.065),
    rolloverEnabled: z.boolean().default(false),
    accountOpenedAt: date.default('2026-09-30'),
    annualRothCapacity: amount.default(7500),
    annualOtherIraContributions: amount.default(0),
    studentLoan529Enabled: z.boolean().default(false),
    careerEnabled: z.boolean().default(false),
    incomePreset: z
      .enum(['highSchool', 'associate', 'bachelor', 'master', 'electrician', 'hvac', 'custom'])
      .default('bachelor'),
    annualIncome: amount.default(82056),
    careerStartAge: z.number().int().min(18).max(50).default(22),
    savingsRate: z.number().min(0).max(0.6).default(0.1),
    wageGrowth: z.number().min(-0.1).max(0.15).default(0),
    debtCrowdOut: z.boolean().default(true),
  })
  .superRefine((s, ctx) => {
    if (
      s.strategyVehicle === 'custom' &&
      (s.allocation.length === 0 ||
        !s.allocation.reduce((a, v) => a.plus(v.share), D(0)).eq(1) ||
        new Set(s.allocation.map((v) => v.vehicle)).size !== s.allocation.length)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['allocation'],
        message: 'Use each account once and allocate exactly 100% of new contributions.',
      })
    if (new Set(s.allocationChanges.map((c) => c.age)).size !== s.allocationChanges.length)
      ctx.addIssue({
        code: 'custom',
        path: ['allocationChanges'],
        message: 'Choose a different starting age for each allocation change.',
      })
    if (
      Math.max(
        s.parentCapitalGainsRate,
        s.parentOrdinaryRate,
        s.childCapitalGainsRate,
        s.withdrawalTaxRate,
      ) +
        s.stateInvestmentTaxRate >=
      0.95
    )
      ctx.addIssue({
        code: 'custom',
        path: ['stateInvestmentTaxRate'],
        message: 'Combined investment tax rates must stay below 95%.',
      })
    if (s.customStateDeductionRate + s.customStateCreditRate >= 0.95)
      ctx.addIssue({
        code: 'custom',
        path: ['customStateDeductionRate'],
        message: 'Combined state incentives must stay below 95%.',
      })
    if (s.nyEnabled && Math.max(s.withdrawalTaxRate, s.retirementTaxRate) + s.nyTaxRate + 0.1 >= 1)
      ctx.addIssue({
        code: 'custom',
        path: ['nyTaxRate'],
        message:
          'Combined effective income tax, NY recapture rate and additional tax must stay below 100%.',
      })
    for (const range of s.conversionTaxByAge)
      if (range.fromAge > range.throughAge)
        ctx.addIssue({
          code: 'custom',
          path: ['conversionTaxByAge'],
          message: 'Tax age ranges must end after they begin.',
        })
    if (s.birthDate > s.asOf)
      ctx.addIssue({
        code: 'custom',
        path: ['birthDate'],
        message: 'Birth date cannot be after the simulation start.',
      })
    for (const birth of s.siblingBirthDates)
      if (birth > s.asOf || (Date.parse(s.asOf) - Date.parse(birth)) / 31557600000 > 25)
        ctx.addIssue({
          code: 'custom',
          path: ['siblingBirthDates'],
          message: 'Additional children must be age 0–25 at the simulation start.',
        })
    const age = (Date.parse(s.asOf) - Date.parse(s.birthDate)) / 31557600000
    if (age >= s.retirementAge || age < 0 || age > 25)
      ctx.addIssue({
        code: 'custom',
        path: ['birthDate'],
        message: 'Start with a child age 0–25 before retirement.',
      })
    if (s.accountOpenedAt > s.asOf || s.accountOpenedAt < s.birthDate)
      ctx.addIssue({
        code: 'custom',
        path: ['accountOpenedAt'],
        message: 'Account opening must be between birth and simulation start.',
      })
    if (s.educationStartAge + s.educationYears >= s.retirementAge)
      ctx.addIssue({
        code: 'custom',
        path: ['educationYears'],
        message: 'Education must finish before retirement.',
      })
  })
export type Scenario = z.infer<typeof scenarioSchema>
export const defaultScenario: Scenario = scenarioSchema.parse({})
