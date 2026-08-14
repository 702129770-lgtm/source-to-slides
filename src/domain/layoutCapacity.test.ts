import { describe, expect, it } from 'vitest'
import type { DeckPage } from './deck'
import { layoutCapacityPrompt, validatePageCapacity } from './layoutCapacity'

const page: DeckPage = {
  id: 'page-1', kind: 'narrative', layout: 'text-image', title: '产品介绍', subtitle: '',
  body: '可读正文', emphasis: '', bullets: ['要点一'], sourceLabels: [], warnings: [], assets: [],
}

describe('validatePageCapacity', () => {
  it('reports body, bullet count, and individual bullet overflow', () => {
    expect(validatePageCapacity({ ...page, bullets: ['一', '二', '三', '四'] }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'bullet-count', actual: 4, limit: 3 })]))
    expect(validatePageCapacity({ ...page, body: '正'.repeat(131) }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'body-length', actual: 131, limit: 130 })]))
    expect(validatePageCapacity({ ...page, bullets: ['要'.repeat(33)] }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'bullet-length', actual: 33, limit: 32, bulletIndex: 0 })]))
  })

  it('counts Unicode characters and rejects body text in a zero-body layout', () => {
    expect(validatePageCapacity({ ...page, body: '😀'.repeat(131) }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'body-length', actual: 131 })]))
    expect(validatePageCapacity({ ...page, layout: 'process', kind: 'process', body: '不会显示的正文' }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'body-length', limit: 0 })]))
  })

  it('accepts content that fits the selected layout', () => {
    expect(validatePageCapacity({ ...page, body: '可读正文', bullets: ['要点一', '要点二', '要点三'] })).toEqual([])
  })

  it('describes exact capacity constraints for AI generation', () => {
    expect(layoutCapacityPrompt('text-image')).toContain('左文右图：正文不超过 130 字、要点不超过 3 条、每条不超过 32 字')
    expect(layoutCapacityPrompt('process')).toContain('流程卡片：不使用正文、要点不超过 4 条、每条不超过 24 字')
  })
})
