import { defaultScenario, type Scenario, scenarioSchema } from '../scenarios/schema'
export function encodeScenario(scenario: Scenario): string {
  const overrides = Object.fromEntries(
    Object.entries(scenario).filter(
      ([key, value]) =>
        key !== 'version' &&
        JSON.stringify(value) !== JSON.stringify(defaultScenario[key as keyof Scenario]),
    ),
  )
  const params = new URLSearchParams({ v: '1' })
  if (Object.keys(overrides).length) params.set('s', JSON.stringify(overrides))
  return params.toString()
}
export function decodeScenario(search: string): { scenario: Scenario; error?: string } {
  try {
    const params = new URLSearchParams(search)
    if (params.has('v') && params.get('v') !== '1') throw new Error('Unsupported scenario version')
    const raw = params.get('s')
    if (raw && raw.length > 16000) throw new Error('Scenario URL is too large')
    const overrides: unknown = raw ? JSON.parse(raw) : {}
    const result = scenarioSchema.safeParse(overrides)
    if (!result.success) throw new Error('Some shared inputs are invalid')
    return { scenario: result.data }
  } catch (e) {
    return {
      scenario: defaultScenario,
      error: `${e instanceof Error ? e.message : 'Invalid URL'}. Defaults restored.`,
    }
  }
}
