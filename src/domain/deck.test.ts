import { describe, expect, it } from 'vitest'
import { compatibleLayouts, pageKindForLayout, pageKinds } from './deck'

describe('compatibleLayouts', () => {
  it('offers at least one fixed layout for every page kind', () => {
    pageKinds.forEach((kind) => expect(compatibleLayouts(kind).length).toBeGreaterThan(0))
  })

  it('does not offer a logo wall for narrative process content', () => {
    expect(compatibleLayouts('process')).not.toContain('logo-wall')
  })

  it('keeps the cover constrained to the cover layout', () => {
    expect(compatibleLayouts('cover')).toEqual(['cover'])
  })

  it('maps every concrete layout back to a compatible page kind', () => {
    expect(pageKindForLayout('cover')).toBe('cover')
    expect(pageKindForLayout('overview')).toBe('overview')
    expect(pageKindForLayout('text-image')).toBe('narrative')
    expect(pageKindForLayout('image-text')).toBe('narrative')
    expect(pageKindForLayout('process')).toBe('process')
    expect(pageKindForLayout('timeline')).toBe('timeline')
    expect(pageKindForLayout('comparison')).toBe('comparison')
    expect(pageKindForLayout('data-proof')).toBe('data')
    expect(pageKindForLayout('logo-wall')).toBe('logos')
    expect(pageKindForLayout('cta')).toBe('cta')
  })
})
