import type { ParserAdapter } from './parserAdapter'

export const apiParser: ParserAdapter = {
  async parse(sources, text, pageCount, layoutPreferences) {
    const form = new FormData()
    sources.forEach((source) => { if (source.file) form.append('files', source.file, source.name) })
    if (text.trim()) form.append('text', text.trim())
    form.append('pageCount', String(pageCount))
    if (pageCount <= 5 && layoutPreferences) form.append('layoutPreferences', JSON.stringify(layoutPreferences.slice(0, pageCount)))
    const response = await fetch('/api/generate', { method: 'POST', body: form })
    const payload = await response.json() as { error?: string }
    if (!response.ok) throw new Error(payload.error || '生成失败，请稍后重试')
    return payload as Awaited<ReturnType<ParserAdapter['parse']>>
  },
}
