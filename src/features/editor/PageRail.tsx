import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { DeckPage } from '../../domain/deck'
import { SlideCanvas } from '../slides/SlideCanvas'

export function PageRail({ pages, selectedId, onSelect, onMove, onRemove }: { pages: DeckPage[]; selectedId: string; onSelect: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void; onRemove: (id: string) => void }) {
  return <aside className="page-rail" aria-label="页面顺序">
    <div className="rail-heading"><b>页面</b><span>{pages.length} PAGES</span></div>
    <div className="rail-list">{pages.map((page, index) => <div className={`rail-item ${selectedId === page.id ? 'selected' : ''}`} key={page.id}>
      <button className="rail-preview" type="button" onClick={() => onSelect(page.id)}><span className="page-number">{String(index + 1).padStart(2, '0')}</span><SlideCanvas page={page} compact /></button>
      <div className="rail-actions"><button aria-label="上移" disabled={index === 0} onClick={() => onMove(page.id, -1)}><ChevronUp size={14} /></button><button aria-label="下移" disabled={index === pages.length - 1} onClick={() => onMove(page.id, 1)}><ChevronDown size={14} /></button><button aria-label="删除页面" disabled={pages.length === 1} onClick={() => onRemove(page.id)}><Trash2 size={14} /></button></div>
    </div>)}</div>
  </aside>
}
