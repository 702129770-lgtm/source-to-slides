import type { DeckDraft, LayoutId, SourceItem } from '../domain/deck'

export interface ParserAdapter {
  parse(sources: SourceItem[], text: string, pageCount: number, layoutPreferences?: LayoutId[]): Promise<DeckDraft>
}
