import { compatibleLayouts, pageKindForLayout, type DeckDraft, type DeckPage, type LayoutId, type PageAsset, type PageKind } from '../src/domain/deck'
import { layoutCapacityPrompt } from '../src/domain/layoutCapacity'
import type { ExtractedSource } from './sourceExtractor'

type ResponsesClient = { responses: { create: (request: any) => Promise<{ output_text?: string }> } }

const pageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'layout', 'title', 'subtitle', 'body', 'emphasis', 'bullets', 'sourceLabels', 'warnings', 'assets'],
  properties: {
    kind: { type: 'string', enum: ['cover', 'overview', 'narrative', 'process', 'timeline', 'comparison', 'data', 'logos', 'cta'] },
    layout: { type: 'string', enum: ['cover', 'overview', 'text-image', 'image-text', 'process', 'timeline', 'comparison', 'data-proof', 'logo-wall', 'cta'] },
    title: { type: 'string' }, subtitle: { type: 'string' }, body: { type: 'string' }, emphasis: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    sourceLabels: { type: 'array', minItems: 1, items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    assets: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string' } } } },
  },
} as const

function deckSchema(pageCount: number) {
  return {
    type: 'object', additionalProperties: false, required: ['title', 'pages', 'unusedAssets', 'unusedSources'],
    properties: {
      title: { type: 'string' },
      pages: { type: 'array', minItems: pageCount, maxItems: pageCount, items: pageSchema },
      unusedAssets: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'reason'], properties: { id: { type: 'string' }, reason: { type: 'string' } } } },
      unusedSources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'reason'], properties: { name: { type: 'string' }, reason: { type: 'string' } } } },
    },
  } as const
}

function sourceText(sources: ExtractedSource[]) {
  return sources.map((source) => `\n===== 来源：${source.name} =====\n${source.text || '[仅图片资料]'}`).join('\n').slice(0, 120_000)
}

type ModelPage = Omit<DeckPage, 'id' | 'assets'> & { assets: Array<{ id: string }> }

function imageType(dataUrl: string) {
  return /^data:([^;]+);/.exec(dataUrl)?.[1] ?? 'application/octet-stream'
}

function buildAssetCatalog(sources: ExtractedSource[]): PageAsset[] {
  return sources.flatMap((source, sourceIndex) => source.images.map((image, imageIndex) => ({
    id: `asset-${sourceIndex + 1}-${imageIndex + 1}`,
    name: image.name,
    url: image.dataUrl,
    sourceName: source.name,
    type: imageType(image.dataUrl),
  })))
}

function normalizePage(page: ModelPage, index: number, allowedSources: Set<string>, assetsById: Map<string, PageAsset>, preferredLayout?: LayoutId): DeckPage {
  const kind = preferredLayout ? pageKindForLayout(preferredLayout) : page.kind as PageKind
  const requested = preferredLayout ?? page.layout as LayoutId
  const layout = compatibleLayouts(kind).includes(requested) ? requested : compatibleLayouts(kind)[0]
  return {
    ...page,
    id: `page-${index + 1}`,
    kind,
    layout,
    sourceLabels: page.sourceLabels.filter((label) => allowedSources.has(label)),
    assets: page.assets.flatMap((asset) => assetsById.get(asset.id) ?? []),
  }
}

export async function generateDeck(sources: ExtractedSource[], client: ResponsesClient, model = process.env.OPENAI_MODEL || 'gpt-5.5', pageCount = 8, layoutPreferences?: LayoutId[]): Promise<DeckDraft> {
  if (!sources.some((source) => source.text || source.images.length)) throw new Error('没有从资料中读取到可用内容')
  const sourceNames = sources.map((source) => source.name)
  const assetCatalog = buildAssetCatalog(sources)
  const assetsById = new Map(assetCatalog.map((asset) => [asset.id, asset]))
  const imageInputs = assetCatalog.flatMap((asset) => [
    { type: 'input_text', text: `图片素材：${asset.id}；名称：${asset.name}；来源附件：${asset.sourceName}` },
    { type: 'input_image', image_url: asset.url, detail: 'auto' },
  ])
  const layoutInstruction = layoutPreferences
    ? `用户已指定逐页版式，必须按顺序组织内容：${layoutPreferences.map((layout, index) => `第 ${index + 1} 页=${layout}`).join('；')}。`
    : '根据内容结构、信息密度和可用图片自动选择兼容版式。'
  const capacityInstruction = layoutPreferences
    ? layoutPreferences.map((layout, index) => `第 ${index + 1} 页 ${layoutCapacityPrompt(layout)}`).join('；')
    : `自动选择版式后必须遵守对应容量：${layoutCapacityPrompt()}`
  const response = await client.responses.create({
    model,
    reasoning: { effort: 'medium' },
    instructions: [
      '你是企业介绍与产品介绍 PPT 的内容编排专家。',
      '只使用用户资料中能够直接确认的事实。不得编造公司、客户、案例、数据、Logo、截图、联系人或联系方式。',
      `必须生成恰好 ${pageCount} 页；内容不足时在 warnings 中指出缺失，不得减少页面数量或编造内容。`,
      'sourceLabels 只能使用给定的来源名称，且每一页至少列出一个实际使用的来源。',
      '图片只能通过给定 assetId 引用，并只分配给 cover、text-image 或 image-text 布局。选择与页面主题相关且可安全排版的图片。',
      '每张未分配到页面的图片都必须写入 unusedAssets 并给出具体原因；没有被页面引用的附件写入 unusedSources 并给出原因。',
      '每页选择与 kind 兼容的固定 layout；文字过多时拆页或缩短，不用密集长段落。',
      layoutInstruction,
      capacityInstruction,
      '无法容纳时保留最关键事实，并在 warnings 中说明需要增加页数或更换版式；不得把信息写入该版式不显示的字段。',
      `可用来源名称：${sourceNames.join('；')}`,
    ].join('\n'),
    input: [{ role: 'user', content: [{ type: 'input_text', text: `请根据以下真实资料生成公司/产品介绍 Deck：\n${sourceText(sources)}` }, ...imageInputs] }],
    text: { format: { type: 'json_schema', name: 'deck_draft', strict: true, schema: deckSchema(pageCount) } },
  })
  if (!response.output_text) throw new Error('AI 没有返回可用内容')
  const parsed = JSON.parse(response.output_text) as {
    title: string
    pages: ModelPage[]
    unusedAssets?: Array<{ id: string; reason: string }>
    unusedSources?: Array<{ name: string; reason: string }>
  }
  if (parsed.pages.length !== pageCount) throw new Error('AI 返回的页面数量与要求不一致')
  const allowedSources = new Set(sourceNames)
  const pages = parsed.pages.map((page, index) => normalizePage(page, index, allowedSources, assetsById, layoutPreferences?.[index]))
  if (pages.some((page) => page.sourceLabels.length === 0)) {
    throw new Error('AI 返回了无法验证的页面来源')
  }
  const usedAssetIds = new Set(pages.flatMap((page) => page.assets.map((asset) => asset.id)))
  const unusedReasons = new Map((parsed.unusedAssets ?? []).map((asset) => [asset.id, asset.reason.trim() || 'AI 未选择该素材']))
  const unusedAssets = assetCatalog.filter((asset) => !usedAssetIds.has(asset.id)).map((asset) => ({
    ...asset,
    reason: unusedReasons.get(asset.id) ?? 'AI 未选择该素材',
  }))
  const usedSourceNames = new Set(pages.flatMap((page) => [
    ...page.sourceLabels,
    ...page.assets.map((asset) => asset.sourceName),
  ]))
  const unusedSourceReasons = new Map((parsed.unusedSources ?? []).map((source) => [source.name, source.reason.trim() || 'AI 未在页面中引用该附件']))
  const unusedSources = sourceNames.filter((name) => name !== '用户输入文本' && !usedSourceNames.has(name)).map((name) => ({
    name,
    reason: unusedSourceReasons.get(name) ?? 'AI 未在页面中引用该附件',
  }))
  return { id: `deck-${Date.now()}`, title: parsed.title, pages, sources: [], unusedAssets, unusedSources }
}
