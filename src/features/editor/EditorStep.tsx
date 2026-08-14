import { useReducer } from 'react'
import { ArrowLeft, Eye } from 'lucide-react'
import type { DeckDraft } from '../../domain/deck'
import { validateDeckCapacity } from '../../domain/layoutCapacity'
import { PageRail } from './PageRail'
import { PageEditor } from './PageEditor'
import { deckReducer, initialEditorState } from './deckReducer'
import { SlideCanvas } from '../slides/SlideCanvas'
import { AttachmentUsage, hasAttachmentUsage } from './AttachmentUsage'

export function EditorStep({ draft, onBack, onPreview }: { draft: DeckDraft; onBack: () => void; onPreview: (draft: DeckDraft) => void }) {
  const [state, dispatch] = useReducer(deckReducer, draft, initialEditorState)
  const selected = state.draft.pages.find((page) => page.id === state.selectedPageId) ?? state.draft.pages[0]
  const showsAttachmentUsage = hasAttachmentUsage(state.draft)
  const capacityIssues = validateDeckCapacity(state.draft.pages)
  const selectedCapacityIssues = capacityIssues.filter((issue) => issue.pageId === selected.id)
  return <main className="editor-step">
    <header className="workspace-header"><button className="quiet-button" onClick={onBack}><ArrowLeft size={17} />返回上传</button><div><p>02 / 03</p><h1>逐页确认内容</h1><span>REVIEW THE STORY & LAYOUT</span>{capacityIssues.length > 0 && <small className="capacity-status">{new Set(capacityIssues.map((issue) => issue.pageId)).size} 个页面存在容量问题</small>}</div><button className="primary-action compact" aria-label="生成完整预览" disabled={capacityIssues.length > 0} onClick={() => onPreview(state.draft)}><Eye size={17} />生成完整预览</button></header>
    <AttachmentUsage draft={state.draft} />
    <div className={`editor-workspace${showsAttachmentUsage ? ' has-attachment-usage' : ''}`}><PageRail pages={state.draft.pages} selectedId={state.selectedPageId} onSelect={(pageId) => dispatch({ type: 'select', pageId })} onMove={(pageId, direction) => dispatch({ type: 'move', pageId, direction })} onRemove={(pageId) => dispatch({ type: 'remove', pageId })} />
      <section className="canvas-stage"><div className="canvas-meta"><span>16:9 PREVIEW</span><b>{selected.layout.toUpperCase()}</b></div><SlideCanvas page={selected} /></section>
      <PageEditor page={selected} capacityIssues={selectedCapacityIssues} dispatch={dispatch} />
    </div>
  </main>
}
