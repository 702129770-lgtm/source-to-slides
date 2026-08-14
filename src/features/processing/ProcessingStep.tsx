import { Check, FileText, LoaderCircle } from 'lucide-react'
import type { SourceItem } from '../../domain/deck'

export function ProcessingStep({ sources, hasText }: { sources: SourceItem[]; hasText: boolean }) {
  return <main className="processing-step page-shell single-column">
    <section className="processing-card">
      <div className="orbital-progress" aria-label="正在整理资料"><span /><span /><LoaderCircle size={34} /></div>
      <p className="eyebrow">STRUCTURING YOUR DECK</p>
      <h1>正在把资料整理成逐页方案</h1>
      <p className="lead">识别可引用内容、标记缺失信息，并为每一页匹配固定版式。</p>
      <div className="processing-phases"><div className="done"><Check size={15} />读取资料</div><div className="active"><LoaderCircle size={15} />组织叙事</div><div>匹配版式</div></div>
      <div className="processing-files">
        {hasText && <div><FileText size={16} /><span>用户输入文本</span><b>已读取</b></div>}
        {sources.map((source) => <div key={source.id}><FileText size={16} /><span>{source.name}</span><b>已读取</b></div>)}
      </div>
      <small>不展示模型思考过程；如果信息不足，将直接进入确认页并标记缺失项。</small>
    </section>
  </main>
}
