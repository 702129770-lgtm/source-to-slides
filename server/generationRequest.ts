import { layoutIds, type LayoutId } from '../src/domain/deck'

export class GenerationRequestError extends Error {}

export function parseGenerationFields(body: Record<string, unknown>, fileCount: number) {
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const rawPageCount = typeof body.pageCount === 'string' ? body.pageCount.trim() : ''
  const pageCount = Number(rawPageCount)

  if (!text && fileCount === 0) throw new GenerationRequestError('请输入文本或添加附件。')
  if (!rawPageCount || !Number.isInteger(pageCount) || pageCount < 1 || pageCount > 30) {
    throw new GenerationRequestError('生成页数必须是 1–30 的整数。')
  }

  let layoutPreferences: LayoutId[] | undefined
  if (pageCount <= 5) {
    if (typeof body.layoutPreferences !== 'string') throw new GenerationRequestError('请为每一页选择版式。')
    let parsed: unknown
    try {
      parsed = JSON.parse(body.layoutPreferences)
    } catch {
      throw new GenerationRequestError('逐页版式格式无效。')
    }
    if (!Array.isArray(parsed) || parsed.length !== pageCount) {
      throw new GenerationRequestError('版式数量必须与生成页数一致。')
    }
    if (!parsed.every((item): item is LayoutId => typeof item === 'string' && layoutIds.includes(item as LayoutId))) {
      throw new GenerationRequestError('逐页版式包含不支持的版式。')
    }
    layoutPreferences = parsed
  }

  return { text, pageCount, layoutPreferences }
}
