import { collegeBoard2025 as cb } from '../data/education/collegeBoard2025'
import { eliteAid2026 as elite } from '../data/education/eliteAid2026'
export const expenseKeys = [
  'tuition',
  'books',
  'roomBoard',
  'computer',
  'transportation',
  'personal',
  'other',
] as const
export type ExpenseKey = (typeof expenseKeys)[number]
export type ExpenseBuckets = Record<ExpenseKey, number>
export interface EducationPreset {
  id: string
  name: string
  years: number
  expenses: ExpenseBuckets
  aid: number
  sourceIds: string[]
  note: string
}
const buckets = (
  tuition: number,
  books: number,
  roomBoard: number,
  transportation: number,
  personal: number,
  other = 0,
): ExpenseBuckets => ({ tuition, books, roomBoard, computer: 0, transportation, personal, other })
export const educationPresets: EducationPreset[] = [
  {
    id: 'none',
    name: 'No college',
    years: 0,
    expenses: buckets(0, 0, 0, 0, 0),
    aid: 0,
    sourceIds: [],
    note: 'No postsecondary expenses modeled.',
  },
  {
    id: 'trade',
    name: 'Trade / technical',
    years: 2,
    expenses: buckets(8000, 1500, 6000, 1500, 1000),
    aid: 0,
    sourceIds: [],
    note: 'Editable model assumption for an eligible technical program; not an average trade-school cost.',
  },
  {
    id: 'twoYear',
    name: 'Public two-year',
    years: 2,
    expenses: buckets(cb.twoYearTuition.value, 1500, 11500, 2200, 1970),
    aid: 4150,
    sourceIds: ['SRC-COLLEGEBOARD-2025'],
    note: '2025–26 published total $21,320. Tuition covered by illustrative average grants. Non-tuition category allocations are editable assumptions.',
  },
  {
    id: 'public4',
    name: 'Public four-year',
    years: 4,
    expenses: buckets(cb.publicTuition.value, 1200, 13200, 1800, 2840),
    aid: 9650,
    sourceIds: ['SRC-COLLEGEBOARD-2025'],
    note: '2025–26 published $30,990. Derived net example: $30,990 − $11,950 + $2,300 = $21,340. Non-tuition category allocations are editable assumptions.',
  },
  {
    id: 'private',
    name: 'Private nonprofit',
    years: 4,
    expenses: buckets(cb.privateTuition.value, 1200, 16000, 1400, 1870),
    aid: 28090,
    sourceIds: ['SRC-COLLEGEBOARD-2025'],
    note: '2025–26 published $65,470. Derived net example: $65,470 − $45,000 + $16,910 = $37,380. Non-tuition category allocations are editable assumptions.',
  },
  {
    id: 'harvard',
    name: 'Harvard sticker',
    years: 4,
    expenses: buckets(
      elite.harvardTuition.value + elite.harvardFees.value,
      elite.harvardBooks.value,
      elite.harvardHousing.value + elite.harvardFood.value,
      2500,
      elite.harvardPersonal.value,
    ),
    aid: 0,
    sourceIds: ['SRC-HARVARD-AID-2026'],
    note: '2026–27 sticker costs; $2,500 transportation midpoint is an assumption. Health insurance excluded. Current-policy illustration, not future guaranteed aid.',
  },
  {
    id: 'yale',
    name: 'Yale $200k illustration',
    years: 4,
    expenses: buckets(14000, 1000, 4000, 500, 500),
    aid: 0,
    sourceIds: ['SRC-YALE-AID-2026'],
    note: 'Current-policy $20,000 annual family-cost illustration for typical assets, already net of aid. Category allocations are assumptions; no second aid subtraction. Not future guaranteed aid.',
  },
  {
    id: 'custom',
    name: 'Custom education',
    years: 4,
    expenses: buckets(12000, 1000, 12000, 2000, 2000),
    aid: 0,
    sourceIds: [],
    note: 'All values are user inputs. Verify institution and expense eligibility.',
  },
]
export const presetById = Object.fromEntries(educationPresets.map((p) => [p.id, p]))
export const strategyPresets = [
  { id: '529', name: '100% 529', share529: 1 },
  { id: 'trump', name: '100% Trump Account', share529: 0 },
  { id: 'split75', name: '75% 529 / 25% Trump', share529: 0.75 },
  { id: 'split50', name: '50% 529 / 50% Trump', share529: 0.5 },
  { id: 'split25', name: '25% 529 / 75% Trump', share529: 0.25 },
] as const
