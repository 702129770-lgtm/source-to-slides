import type PptxGenJS from 'pptxgenjs'
import type { DeckDraft, DeckPage } from '../domain/deck'
import { validateDeckCapacity } from '../domain/layoutCapacity'

const C = {
  forest: '173F3A',
  green: '1F806D',
  coral: 'F2644B',
  background: 'FFFFFF',
  text: '16211F',
  muted: '61706C',
  border: 'DCE5E2',
}

function addTitle(slide: PptxGenJS.Slide, page: DeckPage) {
  slide.addText(page.title, { x: 0.7, y: 0.48, w: 11.8, h: 0.42, fontFace: 'DengXian', fontSize: 22, bold: true, color: C.forest, margin: 0 })
  if (page.subtitle) slide.addText(page.subtitle, { x: 0.72, y: 0.94, w: 6, h: 0.2, fontFace: 'Arial', fontSize: 7, color: C.muted, charSpacing: 1.2, margin: 0 })
}

function addConclusion(pptx: PptxGenJS, slide: PptxGenJS.Slide, text: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 6.94, w: 13.333, h: 0.56, line: { transparency: 100 }, fill: { color: C.green } })
  slide.addText(text, { x: 0.7, y: 7.05, w: 11.9, h: 0.24, fontFace: 'DengXian', fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', margin: 0 })
}

function addPageImage(slide: PptxGenJS.Slide, page: DeckPage, position: { x: number; y: number; w: number; h: number }) {
  const asset = page.assets[0]
  if (asset) slide.addImage({ data: asset.url, ...position })
}

function addPage(pptx: PptxGenJS, page: DeckPage) {
  const slide = pptx.addSlide()
  slide.background = { color: C.background }
  if (page.layout === 'cover') {
    slide.addText(page.subtitle, { x: 0.85, y: 1.45, w: 6.5, h: 0.28, fontFace: 'Arial', fontSize: 9, color: C.muted, charSpacing: 1.3, margin: 0 })
    slide.addText(page.title, { x: 0.82, y: 2.05, w: page.assets.length > 0 ? 7.6 : 8.2, h: 0.9, fontFace: 'DengXian', fontSize: 34, bold: true, color: C.forest, margin: 0, breakLine: false })
    slide.addShape(pptx.ShapeType.line, { x: 0.85, y: 3.25, w: 2.4, h: 0, line: { color: C.green, width: 3 } })
    slide.addText(page.emphasis, { x: 0.85, y: 3.55, w: 8.6, h: 0.5, fontFace: 'DengXian', fontSize: 15, color: C.coral, margin: 0 })
    addPageImage(slide, page, { x: 9.25, y: 1.35, w: 3.35, h: 4.25 })
    return
  }
  addTitle(slide, page)
  const imageLayout = page.assets.length > 0 && (page.layout === 'text-image' || page.layout === 'image-text')
  const contentX = imageLayout && page.layout === 'image-text' ? 6.65 : 0.75
  slide.addText(page.body, { x: contentX, y: 1.6, w: imageLayout ? 5.4 : 5.2, h: 1.3, fontFace: 'DengXian', fontSize: 17, color: C.text, breakLine: false, margin: 0.06, valign: 'middle' })
  page.bullets.forEach((item, index) => {
    const x = imageLayout ? contentX : page.layout === 'data-proof' ? 6.5 + (index % 2) * 2.8 : 6.3
    const y = imageLayout ? 3.15 + index * 0.66 : page.layout === 'data-proof' ? 1.55 + Math.floor(index / 2) * 1.25 : 1.55 + index * 0.82
    const width = imageLayout ? 5.4 : page.layout === 'data-proof' ? 2.45 : 5.9
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w: width, h: 0.56, rectRadius: 0.06, line: { color: C.border, width: 0.8 }, fill: { color: C.background, transparency: 4 } })
    slide.addText(item, { x: x + 0.2, y: y + 0.14, w: width - 0.4, h: 0.22, fontFace: 'DengXian', fontSize: 13, bold: index === 0, color: index === 0 ? C.green : C.text, margin: 0 })
  })
  if (imageLayout) addPageImage(slide, page, { x: page.layout === 'image-text' ? 0.75 : 7.15, y: 1.45, w: 5.35, h: 4.85 })
  if (page.emphasis) addConclusion(pptx, slide, page.emphasis)
}

export async function buildPresentation(draft: DeckDraft): Promise<Blob> {
  const capacityIssue = validateDeckCapacity(draft.pages)[0]
  if (capacityIssue) throw new Error(`第 ${draft.pages.findIndex((page) => page.id === capacityIssue.pageId) + 1} 页：${capacityIssue.message}`)
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Source to Slides'
  pptx.subject = 'Source-backed editable presentation'
  pptx.title = draft.title
  pptx.company = ''
  draft.pages.forEach((page) => addPage(pptx, page))
  const output = await pptx.write({ outputType: 'blob' })
  return new Blob([output as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
}

export async function downloadPresentation(draft: DeckDraft) {
  const blob = await buildPresentation(draft)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${draft.title || 'Source-to-Slides'}.pptx`
  anchor.click()
  URL.revokeObjectURL(url)
}
