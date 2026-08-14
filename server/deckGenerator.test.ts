// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { generateDeck } from './deckGenerator'

describe('generateDeck', () => {
  it('sends extracted source content and returns model-authored pages', async () => {
    const page = {
      kind: 'cover', layout: 'cover', title: '星河科技', subtitle: 'XINGHE TECHNOLOGY', body: '',
      emphasis: '让投放判断更快发生', bullets: [], sourceLabels: ['company.pptx'], warnings: [], assets: [],
    }
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({
      title: '星河科技介绍',
      pages: Array.from({ length: 5 }, () => page),
    }) })
    const client = { responses: { create } }
    const draft = await generateDeck([{ name: 'company.pptx', text: '星河科技是一家智能投放平台。', images: [] }], client, undefined, 5)
    const request = create.mock.calls[0][0]
    expect(draft.pages[0].title).toBe('星河科技')
    expect(draft.pages).toHaveLength(5)
    expect(JSON.stringify(request)).toContain('智能投放平台')
    expect(request.model).toBe('gpt-5.5')
    expect(request.text.format.type).toBe('json_schema')
    expect(request.text.format.schema.properties.pages.minItems).toBe(5)
    expect(request.text.format.schema.properties.pages.maxItems).toBe(5)
    expect(request.text.format.schema.properties.pages.items.properties.sourceLabels.minItems).toBe(1)
    expect(request.instructions).toContain('必须生成恰好 5 页')
    expect(request.instructions).toContain('流程卡片：不使用正文、要点不超过 4 条、每条不超过 24 字')
  })

  it('fails explicitly instead of returning example pages when the model returns no output', async () => {
    const client = { responses: { create: vi.fn().mockResolvedValue({ output_text: '' }) } }
    await expect(generateDeck([{ name: 'brief.docx', text: '真实内容', images: [] }], client)).rejects.toThrow('没有返回可用内容')
  })

  it('rejects pages whose model-provided source labels are not in the request', async () => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({
      title: '来源错误',
      pages: [{
        kind: 'cover', layout: 'cover', title: '来源错误', subtitle: '', body: '', emphasis: '', bullets: [],
        sourceLabels: ['invented.pdf'], warnings: [], assets: [],
      }],
      unusedAssets: [], unusedSources: [],
    }) })
    const client = { responses: { create } }

    await expect(generateDeck([{ name: 'brief.docx', text: '真实内容', images: [] }], client, undefined, 1))
      .rejects.toThrow('无法验证的页面来源')
  })

  it('resolves trusted image IDs and reports every unused image', async () => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({
      title: '素材验证',
      pages: [{
        kind: 'narrative', layout: 'text-image', title: '产品能力', subtitle: 'CAPABILITY', body: '真实正文',
        emphasis: '', bullets: [], sourceLabels: ['images.docx'], warnings: [],
        assets: [{ id: 'asset-1-1' }, { id: 'missing-asset' }],
      }],
      unusedAssets: [{ id: 'asset-1-2', reason: '与页面主题相关性不足' }],
      unusedSources: [],
    }) })
    const client = { responses: { create } }
    const draft = await generateDeck([{
      name: 'images.docx', text: '产品能力说明',
      images: [
        { name: 'hero.png', dataUrl: 'data:image/png;base64,aGVybw==' },
        { name: 'extra.png', dataUrl: 'data:image/png;base64,ZXh0cmE=' },
      ],
    }], client, undefined, 1)

    expect(draft.pages[0].assets).toEqual([expect.objectContaining({
      id: 'asset-1-1', name: 'hero.png', sourceName: 'images.docx', url: 'data:image/png;base64,aGVybw==',
    })])
    expect(draft.pages[0].assets).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'missing-asset' })]))
    expect(draft.unusedAssets).toEqual([expect.objectContaining({
      id: 'asset-1-2', name: 'extra.png', reason: '与页面主题相关性不足',
    })])
    expect(JSON.stringify(create.mock.calls[0][0].input)).toContain('asset-1-1')
  })

  it('enforces the exact per-page layouts selected for a short deck', async () => {
    const wrongPage = {
      kind: 'cover', layout: 'cover', title: '测试页面', subtitle: '', body: '正文',
      emphasis: '', bullets: [], sourceLabels: ['brief.docx'], warnings: [], assets: [],
    }
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({
      title: '短演示', pages: Array.from({ length: 3 }, () => wrongPage), unusedAssets: [], unusedSources: [],
    }) })
    const client = { responses: { create } }
    const draft = await generateDeck(
      [{ name: 'brief.docx', text: '真实正文', images: [] }],
      client,
      undefined,
      3,
      ['overview', 'image-text', 'data-proof'],
    )

    expect(draft.pages.map((page) => page.layout)).toEqual(['overview', 'image-text', 'data-proof'])
    expect(draft.pages.map((page) => page.kind)).toEqual(['overview', 'narrative', 'data'])
    expect(create.mock.calls[0][0].instructions).toContain('第 1 页=overview；第 2 页=image-text；第 3 页=data-proof')
    expect(create.mock.calls[0][0].instructions).toContain('第 2 页 左图右文：正文不超过 130 字、要点不超过 3 条、每条不超过 32 字')
  })
})
