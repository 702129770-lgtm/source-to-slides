import { layoutIds, type DeckPage, type LayoutId } from './deck'

export interface LayoutCapacity { body: number; bullets: number; bullet: number }
export type CapacityIssueCode = 'body-length' | 'bullet-count' | 'bullet-length'

export interface CapacityIssue {
  code: CapacityIssueCode
  pageId: string
  layout: LayoutId
  actual: number
  limit: number
  bulletIndex?: number
  message: string
}

export const layoutCapacities: Record<LayoutId, LayoutCapacity> = {
  cover: { body: 0, bullets: 0, bullet: 0 },
  overview: { body: 180, bullets: 4, bullet: 40 },
  'text-image': { body: 130, bullets: 3, bullet: 32 },
  'image-text': { body: 130, bullets: 3, bullet: 32 },
  process: { body: 0, bullets: 4, bullet: 24 },
  timeline: { body: 0, bullets: 4, bullet: 24 },
  comparison: { body: 120, bullets: 4, bullet: 32 },
  'data-proof': { body: 0, bullets: 4, bullet: 24 },
  'logo-wall': { body: 0, bullets: 6, bullet: 20 },
  cta: { body: 120, bullets: 3, bullet: 32 },
}

const layoutNames: Record<LayoutId, string> = {
  cover: '封面', overview: '概述/正文', 'text-image': '左文右图', 'image-text': '左图右文',
  process: '流程卡片', timeline: '时间线', comparison: '对比矩阵',
  'data-proof': '数据证明', 'logo-wall': 'Logo 墙', cta: '行动召唤',
}

function characterCount(value: string) {
  return Array.from(value.trim()).length
}

export function getLayoutCapacity(layout: LayoutId) {
  return layoutCapacities[layout]
}

export function validatePageCapacity(page: DeckPage): CapacityIssue[] {
  const capacity = getLayoutCapacity(page.layout)
  const name = layoutNames[page.layout]
  const issues: CapacityIssue[] = []
  const bodyLength = characterCount(page.body)
  const bullets = page.bullets.filter((bullet) => bullet.trim())

  if (bodyLength > capacity.body) issues.push({
    code: 'body-length', pageId: page.id, layout: page.layout, actual: bodyLength, limit: capacity.body,
    message: capacity.body === 0 ? `${name}不承载正文，当前正文为 ${bodyLength} 字。` : `${name}正文最多容纳 ${capacity.body} 字，当前为 ${bodyLength} 字。`,
  })
  if (bullets.length > capacity.bullets) issues.push({
    code: 'bullet-count', pageId: page.id, layout: page.layout, actual: bullets.length, limit: capacity.bullets,
    message: `${name}最多容纳 ${capacity.bullets} 条要点，当前为 ${bullets.length} 条。`,
  })
  if (capacity.bullet > 0) bullets.forEach((bullet, bulletIndex) => {
    const length = characterCount(bullet)
    if (length > capacity.bullet) issues.push({
      code: 'bullet-length', pageId: page.id, layout: page.layout, actual: length, limit: capacity.bullet, bulletIndex,
      message: `${name}第 ${bulletIndex + 1} 条要点最多 ${capacity.bullet} 字，当前为 ${length} 字。`,
    })
  })
  return issues
}

export function validateDeckCapacity(pages: DeckPage[]) {
  return pages.flatMap(validatePageCapacity)
}

function formatCapacity(layout: LayoutId) {
  const capacity = layoutCapacities[layout]
  const body = capacity.body === 0 ? '不使用正文' : `正文不超过 ${capacity.body} 字`
  return `${layoutNames[layout]}：${body}、要点不超过 ${capacity.bullets} 条、每条不超过 ${capacity.bullet} 字`
}

export function layoutCapacityPrompt(layout?: LayoutId) {
  return layout ? formatCapacity(layout) : layoutIds.map(formatCapacity).join('；')
}
