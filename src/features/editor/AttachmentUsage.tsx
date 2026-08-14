import { AlertTriangle, CheckCircle2, ImageOff, Paperclip } from 'lucide-react'
import type { DeckDraft } from '../../domain/deck'

export function hasAttachmentUsage(draft: DeckDraft) {
  return draft.pages.some((page) => page.assets.length > 0) || draft.unusedAssets.length > 0 || draft.unusedSources.length > 0
}

export function AttachmentUsage({ draft }: { draft: DeckDraft }) {
  const usedAssets = draft.pages.flatMap((page) => page.assets.map((asset) => ({ asset, pageTitle: page.title })))
  if (!hasAttachmentUsage(draft)) return null

  return <section className="attachment-usage" aria-labelledby="attachment-usage-title">
    <div className="attachment-usage-heading">
      <div><Paperclip size={15} /><h2 id="attachment-usage-title">附件使用情况</h2></div>
      <span>{usedAssets.length} 个已使用 · {draft.unusedAssets.length + draft.unusedSources.length} 个未使用</span>
    </div>
    {usedAssets.length === 0 && draft.unusedAssets.length > 0 ? <div className="attachment-warning"><AlertTriangle size={15} />已上传图片，但 AI 未选择任何图片</div> : null}
    <div className="attachment-usage-list">
      {usedAssets.map(({ asset, pageTitle }) => <article className="attachment-item is-used" key={`${asset.id}-${pageTitle}`}>
        <img src={asset.url} alt="" />
        <div><b>{asset.name}</b><span><CheckCircle2 size={12} />已用于：{pageTitle}</span></div>
      </article>)}
      {draft.unusedAssets.map((asset) => <article className="attachment-item" key={asset.id}>
        <img src={asset.url} alt="" />
        <div><b>{asset.name}</b><span><ImageOff size={12} />{asset.reason}</span></div>
      </article>)}
      {draft.unusedSources.map((source) => <article className="attachment-item source-item" key={source.name}>
        <Paperclip size={19} />
        <div><b>{source.name}</b><span>{source.reason}</span></div>
      </article>)}
    </div>
  </section>
}
