import { z } from 'zod'
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
    contributionFrequency: z.enum(['monthly', 'annual']).default('monthly'),
    contributionEndAge: z.number().int().min(0).max(18).default(18),
    share529: z.number().min(0).max(1).default(0.5),
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
