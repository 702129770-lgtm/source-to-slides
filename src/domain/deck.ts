export const pageKinds = [
  'cover',
  'overview',
  'narrative',
  'process',
  'timeline',
  'comparison',
  'data',
  'logos',
  'cta',
] as const

export type PageKind = (typeof pageKinds)[number]

export const layoutIds = [
  'cover',
  'overview',
  'text-image',
  'image-text',
  'process',
  'timeline',
  'comparison',
  'data-proof',
  'logo-wall',
  'cta',
] as const

export type LayoutId = (typeof layoutIds)[number]

const compatibility: Record<PageKind, LayoutId[]> = {
  cover: ['cover'],
  overview: ['overview', 'text-image', 'image-text'],
  narrative: ['text-image', 'image-text', 'overview'],
  process: ['process', 'timeline'],
  timeline: ['timeline', 'process'],
  comparison: ['comparison', 'overview'],
  data: ['data-proof', 'overview'],
  logos: ['logo-wall'],
  cta: ['cta'],
}

const layoutKinds: Record<LayoutId, PageKind> = {
  cover: 'cover', overview: 'overview', 'text-image': 'narrative', 'image-text': 'narrative',
  process: 'process', timeline: 'timeline', comparison: 'comparison',
  'data-proof': 'data', 'logo-wall': 'logos', cta: 'cta',
}

export function compatibleLayouts(kind: PageKind): LayoutId[] {
  return [...compatibility[kind]]
}

export function pageKindForLayout(layout: LayoutId): PageKind {
  return layoutKinds[layout]
}

export type SourceStatus = 'ready' | 'invalid'

export interface SourceItem {
  id: string
  name: string
  kind: 'file' | 'url'
  size?: number
  type?: string
  status: SourceStatus
  file?: File
}

export interface ValidationIssue {
  sourceName: string
  message: string
}

export interface PageAsset {
  id: string
  name: string
  url: string
  sourceName: string
  type: string
}

export interface UnusedAsset extends PageAsset {
  reason: string
}

export interface UnusedSource {
  name: string
  reason: string
}

export interface DeckPage {
  id: string
  kind: PageKind
  layout: LayoutId
  title: string
  subtitle: string
  body: string
  emphasis: string
  bullets: string[]
  sourceLabels: string[]
  warnings: string[]
  assets: PageAsset[]
}

export interface DeckDraft {
  id: string
  title: string
  pages: DeckPage[]
  sources: SourceItem[]
  unusedAssets: UnusedAsset[]
  unusedSources: UnusedSource[]
}

export type WizardStep = 'upload' | 'processing' | 'editor' | 'preview'
