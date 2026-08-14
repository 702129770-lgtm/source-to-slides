import { useState } from 'react'
import { ArrowLeft, Download, LoaderCircle } from 'lucide-react'
import type { DeckDraft } from '../../domain/deck'
import { SlideCanvas } from '../slides/SlideCanvas'

export function PreviewStep({ draft, onBack, onDownload }: { draft: DeckDraft; onBack: () => void; onDownload: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(draft.pages[0].id)
  const [downloading, setDownloading] = useState(false)
  const selected = draft.pages.find((page) => page.id === selectedId) ?? draft.pages[0]
  const download = async () => { setDownloading(true); try { await onDownload() } finally { setDownloading(false) } }
  return <main className="preview-step">
    <header className="workspace-header"><button className="quiet-button" onClick={onBack}><ArrowLeft size={17} />返回修改</button><div><p>03 / 03</p><h1>完整预览</h1><span>FINAL REVIEW & EXPORT</span></div><button className="primary-action compact" aria-label="下载可编辑 PPTX" onClick={download} disabled={downloading}>{downloading ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}下载可编辑 PPTX</button></header>
    <div className="preview-workspace"><aside className="preview-rail"><div className="rail-heading"><b>缩略图</b><span>{draft.pages.length} PAGES</span></div>{draft.pages.map((page, index) => <button type="button" key={page.id} className={selected.id === page.id ? 'selected' : ''} onClick={() => setSelectedId(page.id)}><span>{String(index + 1).padStart(2, '0')}</span><SlideCanvas page={page} compact /></button>)}</aside>
      <section className="preview-stage"><div className="preview-info"><span>{draft.title}</span><b>{draft.pages.findIndex((page) => page.id === selected.id) + 1} / {draft.pages.length}</b></div><SlideCanvas page={selected} /><p>导出的页面顺序、文字和版式与当前预览一致；文字与形状可在 PowerPoint 中继续编辑。</p></section>
    </div>
  </main>
}
