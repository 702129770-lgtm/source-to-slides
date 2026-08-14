import { describe, expect, it } from 'vitest'
import type { DeckDraft } from '../../domain/deck'
import { deckReducer, initialEditorState } from './deckReducer'

const draft: DeckDraft = {
  id: 'draft', title: 'Deck', sources: [], unusedAssets: [], unusedSources: [], pages: [
    { id: 'a', kind: 'cover', layout: 'cover', title: 'A', subtitle: '', body: '', emphasis: '', bullets: [], sourceLabels: [], warnings: [], assets: [] },
    { id: 'b', kind: 'process', layout: 'process', title: 'B', subtitle: '', body: '', emphasis: '', bullets: [], sourceLabels: [], warnings: [], assets: [] },
  ],
}

describe('deckReducer', () => {
  it('updates content and moves pages without mutation', () => {
    const state = initialEditorState(draft)
    const edited = deckReducer(state, { type: 'update', pageId: 'a', field: 'title', value: '新标题' })
    const moved = deckReducer(edited, { type: 'move', pageId: 'b', direction: -1 })
    expect(edited.draft.pages[0].title).toBe('新标题')
    expect(state.draft.pages[0].title).toBe('A')
    expect(moved.draft.pages.map((page) => page.id)).toEqual(['b', 'a'])
  })

  it('rejects an incompatible layout and keeps selection valid after removal', () => {
    const state = initialEditorState(draft)
    const incompatible = deckReducer(state, { type: 'set-layout', pageId: 'b', layout: 'logo-wall' })
    const selected = deckReducer(state, { type: 'select', pageId: 'b' })
    const removed = deckReducer(selected, { type: 'remove', pageId: 'b' })
    expect(incompatible.draft.pages[1].layout).toBe('process')
    expect(removed.selectedPageId).toBe('a')
  })
})
