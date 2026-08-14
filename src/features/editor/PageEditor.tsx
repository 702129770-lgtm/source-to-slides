import { AlertTriangle, Link2 } from 'lucide-react'
import { compatibleLayouts, type DeckPage, type LayoutId } from '../../domain/deck'
import type { CapacityIssue } from '../../domain/layoutCapacity'
import type { EditorAction } from './deckReducer'

const layoutNames: Record<LayoutId, string> = { cover: '封面', overview: '概述', 'text-image': '左文右图', 'image-text': '左图右文', process: '流程卡片', timeline: '时间线', comparison: '对比矩阵', 'data-proof': '数据证明', 'logo-wall': 'Logo 墙', cta: '行动召唤' }

export function PageEditor({ page, capacityIssues, dispatch }: { page: DeckPage; capacityIssues: CapacityIssue[]; dispatch: React.Dispatch<EditorAction> }) {
  const update = (field: 'title' | 'subtitle' | 'body' | 'emphasis', value: string) => dispatch({ type: 'update', pageId: page.id, field, value })
  return <section className="page-editor">
    <div className="editor-section-heading"><div><span>CONTENT</span><h3>本页内容</h3></div><small>所有内容可继续修改</small></div>
    <label><span>页面标题</span><input value={page.title} onChange={(event) => update('title', event.target.value)} /></label>
    <label><span>英文副标题</span><input value={page.subtitle} onChange={(event) => update('subtitle', event.target.value)} /></label>
    <label><span>正文摘要</span><textarea aria-label="正文摘要" rows={4} value={page.body} onChange={(event) => update('body', event.target.value)} /></label>
    <label><span>要点（每行一项）</span><textarea aria-label="要点（每行一项）" rows={4} value={page.bullets.join('\n')} onChange={(event) => dispatch({ type: 'set-bullets', pageId: page.id, value: event.target.value.split('\n').filter(Boolean) })} /></label>
    <label><span>结论强调</span><input value={page.emphasis} onChange={(event) => update('emphasis', event.target.value)} /></label>

    <div className="editor-section-heading layout-heading"><div><span>LAYOUT</span><h3>兼容版式</h3></div><small>只显示可安全承载本页内容的布局</small></div>
    <div className="layout-options">{compatibleLayouts(page.kind).map((layout) => <button type="button" key={layout} className={page.layout === layout ? 'selected' : ''} onClick={() => dispatch({ type: 'set-layout', pageId: page.id, layout })}><i className={`layout-icon layout-icon-${layout}`} /><span>{layoutNames[layout]}</span></button>)}</div>

    {capacityIssues.length > 0 && <div className="capacity-warning" role="alert"><AlertTriangle size={18} /><div><b>内容超出版式容量</b>{capacityIssues.map((issue) => <p key={`${issue.code}-${issue.bulletIndex ?? ''}`}>{issue.message}</p>)}<small>请精简内容、增加页数或更换版式后继续。</small></div></div>}
    {page.warnings.length > 0 && <div className="warning-box"><AlertTriangle size={18} /><div><b>需要确认</b>{page.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></div>}
    <div className="source-box"><Link2 size={16} /><div><b>原始来源</b><p>{page.sourceLabels.join(' · ')}</p></div></div>
  </section>
}
