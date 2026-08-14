import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import type { DeckDraft } from '../domain/deck'
import { buildPresentation } from './pptxExporter'

function readBlob(blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

describe('buildPresentation', () => {
  it('returns a non-empty editable pptx blob', async () => {
    const draft: DeckDraft = {
      id: 'deck', title: '测试演示', sources: [], unusedAssets: [], unusedSources: [],
      pages: [{ id: 'p1', kind: 'cover', layout: 'cover', title: '测试演示', subtitle: 'TEST DECK', body: '', emphasis: '', bullets: [], sourceLabels: ['product.png'], warnings: [], assets: [{
        id: 'asset-1-1', name: '产品截图', sourceName: 'product.png', type: 'image/png',
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nAAAAABJRU5ErkJggg==',
      }] }],
    }
    const blob = await buildPresentation(draft)
    expect(blob.type).toContain('presentationml.presentation')
    expect(blob.size).toBeGreaterThan(1000)
    const arrayBuffer = await readBlob(blob)
    const zip = await JSZip.loadAsync(arrayBuffer)
    expect(Object.keys(zip.files).some((name) => name.startsWith('ppt/media/') && !zip.files[name].dir)).toBe(true)
  })

  it('rejects a deck whose content exceeds the selected layout', async () => {
    const overCapacityDraft: DeckDraft = {
      id: 'overflow', title: '超量测试', sources: [], unusedAssets: [], unusedSources: [],
      pages: [{ id: 'p1', kind: 'narrative', layout: 'text-image', title: '产品', subtitle: '', body: '正文', emphasis: '',
        bullets: ['要点一', '要点二', '要点三', '要点四', '要点五'], sourceLabels: [], warnings: [], assets: [] }],
    }
    await expect(buildPresentation(overCapacityDraft)).rejects.toThrow('左文右图最多容纳 3 条要点，当前为 5 条')
  })

  it('exports every bullet allowed by the layout capacity', async () => {
    const completeDraft: DeckDraft = {
      id: 'complete', title: '完整要点', sources: [], unusedAssets: [], unusedSources: [],
      pages: [{ id: 'p1', kind: 'logos', layout: 'logo-wall', title: '生态伙伴', subtitle: '', body: '', emphasis: '',
        bullets: ['第一个唯一要点', '第二个唯一要点', '第三个唯一要点', '第四个唯一要点', '第五个唯一要点', '第六个唯一要点'], sourceLabels: [], warnings: [], assets: [] }],
    }
    const zip = await JSZip.loadAsync(await readBlob(await buildPresentation(completeDraft)))
    const slideXml = await Promise.all(Object.entries(zip.files)
      .filter(([name, entry]) => /^ppt\/slides\/slide\d+\.xml$/.test(name) && !entry.dir)
      .map(([, entry]) => entry.async('text')))
    expect(slideXml.join('\n')).toContain('第六个唯一要点')
  })
})
