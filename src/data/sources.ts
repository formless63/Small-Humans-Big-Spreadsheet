export type SourceStatus =
  | 'statute'
  | 'final-guidance'
  | 'proposed-guidance'
  | 'official-data'
  | 'institution-policy'
export interface SourceRecord {
  id: string
  publisher: string
  title: string
  canonicalUrl: string
  sourceDate: string
  accessedAt: string | null
  status: SourceStatus
  verification: 'pending' | 'verified' | 'link-checked'
  notes?: string
}
const source = (
  id: string,
  publisher: string,
  title: string,
  canonicalUrl: string,
  sourceDate: string,
  status: SourceStatus,
  notes?: string,
): SourceRecord => ({
  id,
  publisher,
  title,
  canonicalUrl,
  sourceDate,
  status,
  accessedAt: '2026-09-30',
  verification: 'verified',
  notes,
})
export const sources: SourceRecord[] = [
  source(
    'SRC-FSA-HANDBOOK2025',
    'Federal Student Aid',
    '2025–26 Handbook, Volume 8: Annual and Aggregate Loan Limits',
    'https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2025-2026/vol8/ch4-annual-and-aggregate-loan-limits',
    '2025-26',
    'final-guidance',
  ),
  source(
    'SRC-FSA-HANDBOOK-ELIGIBILITY2025',
    'Federal Student Aid',
    '2025–26 Handbook, Volume 8: Direct Loan Eligibility',
    'https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2025-2026/vol8/ch1-student-and-parent-eligibility-direct-loans',
    '2025-26',
    'final-guidance',
  ),
  source(
    'SRC-IRS-PUB590B',
    'IRS',
    'Publication 590-B: Distributions from IRAs',
    'https://www.irs.gov/publications/p590b',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-IRS-REVPROC2025-32',
    'IRS',
    'Revenue Procedure 2025-32: 2026 Inflation Adjustments',
    'https://www.irs.gov/irb/2025-45_IRB#REV-PROC-2025-32',
    '2025-11',
    'final-guidance',
  ),
  source(
    'SRC-IRS-4547',
    'IRS',
    'Instructions for Form 4547 (12/2025)',
    'https://www.irs.gov/instructions/i4547',
    '2025-12',
    'final-guidance',
  ),
  source(
    'SRC-IRS-TA-2025-52',
    'IRS',
    'Internal Revenue Bulletin 2025-52 / Notice 2025-68',
    'https://www.irs.gov/irb/2025-52_IRB',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-IRS-TA-2026-37',
    'IRS',
    'Internal Revenue Bulletin 2026-37',
    'https://www.irs.gov/irb/2026-37_IRB',
    '2026',
    'proposed-guidance',
    'Proposed regulation material is not final guidance.',
  ),
  source(
    'SRC-IRS-TA-2026-38',
    'IRS',
    'Internal Revenue Bulletin 2026-38',
    'https://www.irs.gov/irb/2026-38_IRB',
    '2026',
    'proposed-guidance',
    'Proposed regulation material is not final guidance.',
  ),
  source(
    'SRC-IRS-PUB590A',
    'IRS',
    'Publication 590-A: Contributions to IRAs',
    'https://www.irs.gov/publications/p590a',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-IRS-8606',
    'IRS',
    'Instructions for Form 8606',
    'https://www.irs.gov/instructions/i8606',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-IRS-TOPIC557',
    'IRS',
    'Topic 557: Additional Tax on Early IRA Distributions',
    'https://www.irs.gov/taxtopics/tc557',
    '2026',
    'final-guidance',
  ),
  source(
    'SRC-IRS-8615',
    'IRS',
    'Instructions for Form 8615: Certain Children’s Unearned Income',
    'https://www.irs.gov/instructions/i8615',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-IRS-529-TOPIC313',
    'IRS',
    'Topic 313: Qualified Tuition Programs',
    'https://www.irs.gov/taxtopics/tc313',
    '2026',
    'final-guidance',
  ),
  source(
    'SRC-IRS-PUB970',
    'IRS',
    'Publication 970: Tax Benefits for Education',
    'https://www.irs.gov/publications/p970',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-NY-IT201',
    'New York Department of Taxation and Finance',
    'Instructions for Form IT-201',
    'https://www.tax.ny.gov/pdf/2025/inc/it201i_2025.pdf',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-NY-IT225',
    'New York Department of Taxation and Finance',
    'Instructions for Form IT-225',
    'https://www.tax.ny.gov/pdf/2025/inc/it225i_2025.pdf',
    '2025',
    'final-guidance',
  ),
  source(
    'SRC-FSA-LOAN-LIMITS',
    'Federal Student Aid',
    'Financial Aid Dictionary: Loan Limits',
    'https://studentaid.gov/help-center/answers/article/what-is-annual-loan-limit',
    '2026',
    'final-guidance',
  ),
  source(
    'SRC-FSA-RATES-2026',
    'Federal Student Aid Knowledge Center',
    '2026–27 Direct Loan Interest Rates',
    'https://fsapartners.ed.gov/knowledge-center/library/electronic-announcements/2026-06-04/interest-rates-federal-direct-loans-first-disbursed-between-july-1-2026-and-june-30-2027',
    '2026-07',
    'final-guidance',
    'GENERAL-26-33; June 4, 2026. Undergraduate fixed reference rate is 6.52%.',
  ),
  source(
    'SRC-FSA-SUBSIDIZED',
    'Federal Student Aid',
    'Direct Subsidized vs. Unsubsidized Loans',
    'https://studentaid.gov/understand-aid/types/loans/subsidized-unsubsidized',
    '2026',
    'final-guidance',
  ),
  source(
    'SRC-COLLEGEBOARD-2025',
    'College Board',
    'Trends in College Pricing and Student Aid 2025',
    'https://research.collegeboard.org/media/pdf/Trends-in-College-Pricing-and-Student-Aid-2025-final_1.pdf',
    '2025',
    'official-data',
  ),
  source(
    'SRC-HARVARD-AID-2026',
    'Harvard College',
    'How Aid Works',
    'https://college.harvard.edu/financial-aid/how-aid-works',
    '2026-27',
    'institution-policy',
  ),
  source(
    'SRC-YALE-AID-2026',
    'Yale Undergraduate Admissions',
    'Estimate Your Cost',
    'https://admissions.yale.edu/estimate-your-cost',
    '2026',
    'institution-policy',
  ),
  source(
    'SRC-BLS-EDUCATION-2025',
    'Bureau of Labor Statistics',
    'Education Pays: Table 5.1, 2025',
    'https://www.bls.gov/emp/tables/unemployment-earnings-education.htm',
    '2025',
    'official-data',
  ),
  source(
    'SRC-BLS-ELECTRICIAN-2025',
    'Bureau of Labor Statistics',
    'Occupational Outlook Handbook: Electricians',
    'https://www.bls.gov/ooh/construction-and-extraction/electricians.htm',
    '2025-05',
    'official-data',
  ),
  source(
    'SRC-BLS-HVAC-2025',
    'Bureau of Labor Statistics',
    'Occupational Outlook Handbook: HVAC Mechanics and Installers',
    'https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm',
    '2025-05',
    'official-data',
  ),
  source(
    'SRC-TECH-VITE',
    'Vite',
    'Deploying a Static Site',
    'https://vite.dev/guide/static-deploy',
    '2026',
    'final-guidance',
  ),
]
for (const record of sources) {
  if (['SRC-FSA-LOAN-LIMITS', 'SRC-FSA-SUBSIDIZED'].includes(record.id)) {
    record.verification = 'link-checked'
    record.notes =
      'Canonical page requires JavaScript; financial details verified against the separately cited official FSA Handbook.'
  }
}
export const sourceById = Object.fromEntries(sources.map((s) => [s.id, s]))
export const DATA_AS_OF = '2026-09-30'
