import { compatibleLayouts, type DeckDraft, type LayoutId } from '../../domain/deck'

export interface EditorState {
  draft: DeckDraft
  selectedPageId: string
}

export type EditorAction =
  | { type: 'select'; pageId: string }
  | { type: 'update'; pageId: string; field: 'title' | 'subtitle' | 'body' | 'emphasis'; value: string }
  | { type: 'set-bullets'; pageId: string; value: string[] }
  | { type: 'set-layout'; pageId: string; layout: LayoutId }
  | { type: 'move'; pageId: string; direction: -1 | 1 }
  | { type: 'remove'; pageId: string }

export function initialEditorState(draft: DeckDraft): EditorState {
  return { draft, selectedPageId: draft.pages[0]?.id ?? '' }
}

export function deckReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'select') {
    return state.draft.pages.some((page) => page.id === action.pageId) ? { ...state, selectedPageId: action.pageId } : state
  }
  if (action.type === 'update' || action.type === 'set-bullets') {
    const pages = state.draft.pages.map((page) => page.id === action.pageId
      ? { ...page, ...(action.type === 'update' ? { [action.field]: action.value } : { bullets: action.value }) }
      : page)
    return { ...state, draft: { ...state.draft, pages } }
  }
  if (action.type === 'set-layout') {
    const pages = state.draft.pages.map((page) => page.id === action.pageId && compatibleLayouts(page.kind).includes(action.layout)
      ? { ...page, layout: action.layout }
      : page)
    return { ...state, draft: { ...state.draft, pages } }
  }
  if (action.type === 'move') {
    const index = state.draft.pages.findIndex((page) => page.id === action.pageId)
    const target = index + action.direction
    if (index < 0 || target < 0 || target >= state.draft.pages.length) return state
    const pages = [...state.draft.pages]
    ;[pages[index], pages[target]] = [pages[target], pages[index]]
    return { ...state, draft: { ...state.draft, pages } }
  }
  const pages = state.draft.pages.filter((page) => page.id !== action.pageId)
  if (pages.length === state.draft.pages.length || pages.length === 0) return state
  return {
    draft: { ...state.draft, pages },
    selectedPageId: action.pageId === state.selectedPageId ? pages[0].id : state.selectedPageId,
  }
}
