export type Provenance = 'SOURCE' | 'DERIVED' | 'MODEL_ASSUMPTION' | 'USER_INPUT'
export interface Parameter<T = number> {
  value: T
  label: string
  provenance: Provenance
  asOf: string
  sourceIds: string[]
  formula?: string
  upstream?: string[]
}
export const sourced = <T>(value: T, label: string, sourceIds: string[]): Parameter<T> => ({
  value,
  label,
  provenance: 'SOURCE',
  asOf: '2026-09-30',
  sourceIds,
})
export const assumed = <T>(value: T, label: string): Parameter<T> => ({
  value,
  label,
  provenance: 'MODEL_ASSUMPTION',
  asOf: '2026-09-30',
  sourceIds: [],
})
export const derived = (
  value: number,
  label: string,
  formula: string,
  upstream: string[],
  sourceIds: string[],
): Parameter => ({
  value,
  label,
  provenance: 'DERIVED',
  asOf: '2026-09-30',
  formula,
  upstream,
  sourceIds,
})
