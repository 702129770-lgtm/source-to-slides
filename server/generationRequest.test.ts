// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseGenerationFields } from './generationRequest'

describe('parseGenerationFields', () => {
  it('accepts trimmed text and an integer page count', () => {
    expect(parseGenerationFields({ text: ' 真实正文 ', pageCount: '8' }, 0))
      .toEqual({ text: '真实正文', pageCount: 8 })
  })

  it('requires direct text or at least one attachment', () => {
    expect(() => parseGenerationFields({ text: '', pageCount: '8' }, 0))
      .toThrow('请输入文本或添加附件')
    expect(parseGenerationFields({ text: '', pageCount: '8' }, 1))
      .toEqual({ text: '', pageCount: 8 })
  })

  it.each(['', '0', '31', '8.5', 'abc'])('rejects invalid page count %s', (pageCount) => {
    expect(() => parseGenerationFields({ text: '正文', pageCount }, 0))
      .toThrow('生成页数必须是 1–30 的整数')
  })

  it('accepts one valid layout for every page of a short deck', () => {
    expect(parseGenerationFields({ text: '正文', pageCount: '2', layoutPreferences: '["overview","image-text"]' }, 0))
      .toEqual({ text: '正文', pageCount: 2, layoutPreferences: ['overview', 'image-text'] })
  })

  it('requires a valid complete layout list for a short deck', () => {
    expect(() => parseGenerationFields({ text: '正文', pageCount: '2' }, 0))
      .toThrow('请为每一页选择版式')
    expect(() => parseGenerationFields({ text: '正文', pageCount: '2', layoutPreferences: 'not-json' }, 0))
      .toThrow('逐页版式格式无效')
    expect(() => parseGenerationFields({ text: '正文', pageCount: '2', layoutPreferences: '["overview"]' }, 0))
      .toThrow('版式数量必须与生成页数一致')
    expect(() => parseGenerationFields({ text: '正文', pageCount: '2', layoutPreferences: '["overview","unknown"]' }, 0))
      .toThrow('包含不支持的版式')
  })

  it('ignores retained manual layouts for decks with six or more pages', () => {
    expect(parseGenerationFields({ text: '正文', pageCount: '6', layoutPreferences: '["cover"]' }, 0))
      .toEqual({ text: '正文', pageCount: 6, layoutPreferences: undefined })
  })
})
