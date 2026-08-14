import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DeckDraft, SourceItem } from '../domain/deck'
import { apiParser } from './apiParser'

afterEach(() => vi.unstubAllGlobals())

describe('apiParser', () => {
  it('uploads the actual files, direct text, and page count to the generation endpoint', async () => {
    const response: DeckDraft = { id: 'real-deck', title: '星河科技', pages: [], sources: [], unusedAssets: [], unusedSources: [] }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['真实资料正文'], 'company.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const sources: SourceItem[] = [{ id: '1', name: file.name, kind: 'file', status: 'ready', file }]
    const result = await apiParser.parse(sources, '星河科技是一家广告创意分析平台。', 8)
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(fetchMock).toHaveBeenCalledWith('/api/generate', expect.objectContaining({ method: 'POST' }))
    expect((body.get('files') as File).name).toBe('company.docx')
    expect(body.get('text')).toBe('星河科技是一家广告创意分析平台。')
    expect(body.get('pageCount')).toBe('8')
    expect(body.get('url')).toBeNull()
    expect(result.title).toBe('星河科技')
  })

  it('surfaces server errors and never falls back to sample content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: '缺少 OPENAI_API_KEY' }) }))
    await expect(apiParser.parse([], '真实资料', 8)).rejects.toThrow('缺少 OPENAI_API_KEY')
  })

  it('sends manual layouts only for decks with at most five pages', async () => {
    const response: DeckDraft = { id: 'deck', title: '测试', pages: [], sources: [], unusedAssets: [], unusedSources: [] }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response })
    vi.stubGlobal('fetch', fetchMock)

    await apiParser.parse([], '正文', 3, ['overview', 'image-text', 'data-proof'])
    const shortBody = fetchMock.mock.calls[0][1].body as FormData
    expect(shortBody.get('layoutPreferences')).toBe('["overview","image-text","data-proof"]')

    await apiParser.parse([], '正文', 6, ['cover', 'cover', 'cover', 'cover', 'cover'])
    const longBody = fetchMock.mock.calls[1][1].body as FormData
    expect(longBody.get('layoutPreferences')).toBeNull()
  })
})
