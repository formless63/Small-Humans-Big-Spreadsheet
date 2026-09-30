import { describe, expect, it } from 'vitest'
import { parameterByKey, parameters } from '../../src/data/registry'
import { sourceById, sources } from '../../src/data/sources'
import { educationPresets } from '../../src/scenarios/presets'

describe('provenance', () => {
  it('has unique IDs and specific HTTPS source URLs', () => {
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length)
    for (const source of sources) {
      const url = new URL(source.canonicalUrl)
      expect(url.protocol).toBe('https:')
      expect(url.pathname.length).toBeGreaterThan(1)
      expect(source.sourceDate).toBeTruthy()
      expect(source.status).toBeTruthy()
    }
  })
  it('resolves every data and preset source', () => {
    for (const p of [...parameters, ...educationPresets])
      for (const id of p.sourceIds) expect(sourceById[id], id).toBeDefined()
  })
  it('requires citations for facts and formulas/upstream names for derivations', () => {
    for (const p of parameters) {
      expect(p.asOf).toBeTruthy()
      if (p.provenance === 'SOURCE') expect(p.sourceIds.length).toBeGreaterThan(0)
      if (p.provenance === 'MODEL_ASSUMPTION') expect(p.sourceIds).toEqual([])
      if (p.provenance === 'DERIVED') {
        expect(p.formula).toBeTruthy()
        expect(p.upstream?.length).toBeGreaterThan(0)
        expect(p.sourceIds.length).toBeGreaterThan(0)
      }
    }
  })
})

it('derived values resolve all upstream parameter names', () => {
  for (const p of parameters)
    if (p.provenance === 'DERIVED')
      for (const key of p.upstream ?? [])
        expect(parameterByKey[key as keyof typeof parameterByKey], key).toBeDefined()
})
