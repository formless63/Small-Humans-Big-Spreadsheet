export function monthDate(date: string): string {
  return `${date.slice(0, 7)}-01`
}
export function addMonths(date: string, months: number): string {
  const d = new Date(`${monthDate(date)}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}
export function ageAt(date: string, birthDate: string): number {
  const a = new Date(`${date}T00:00:00Z`),
    b = new Date(`${birthDate}T00:00:00Z`)
  return a.getUTCFullYear() - b.getUTCFullYear() + (a.getUTCMonth() - b.getUTCMonth()) / 12
}
export function atAge(birthDate: string, age: number): string {
  return addMonths(birthDate, age * 12)
}
export function getTrumpGrowthPeriodEnd(birthDate: string): string {
  return `${Number(birthDate.slice(0, 4)) + 17}-12-31`
}
export function trumpAvailableFrom(birthDate: string): string {
  return `${Number(birthDate.slice(0, 4)) + 18}-01-01`
}
export function pilotEligible(birthDate: string): boolean {
  return birthDate >= '2025-01-01' && birthDate <= '2028-12-31'
}
