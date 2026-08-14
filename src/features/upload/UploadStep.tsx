import { ArrowRight, FileText, Paperclip, ShieldCheck, Trash2 } from 'lucide-react'
import { layoutIds, type LayoutId, type SourceItem, type ValidationIssue } from '../../domain/deck'

interface Props {
  sources: SourceItem[]
  text: string
  pageCount: string
  layoutPreferences: LayoutId[]
  issues: ValidationIssue[]
  onFiles: (files: File[]) => void
  onTextChange: (value: string) => void
  onPageCountChange: (value: string) => void
  onLayoutPreferenceChange: (index: number, layout: LayoutId) => void
  onRemove: (id: string) => void
  onContinue: () => void
}

const layoutLabels: Record<LayoutId, string> = {
  cover: '封面', overview: '概述/正文', 'text-image': '左文右图', 'image-text': '左图右文',
  process: '流程卡片', timeline: '时间线', comparison: '对比矩阵',
  'data-proof': '数据证明', 'logo-wall': 'Logo 墙', cta: '行动召唤',
}

function formatSize(size = 0) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export function UploadStep({ sources, text, pageCount, layoutPreferences, issues, onFiles, onTextChange, onPageCountChange, onLayoutPreferenceChange, onRemove, onContinue }: Props) {
  const count = Number(pageCount)
  const pageCountValid = /^\d+$/.test(pageCount) && Number.isInteger(count) && count >= 1 && count <= 30
  const hasInput = text.trim().length > 0 || sources.length > 0
  return (
    <main className="upload-step page-shell">
      <section className="upload-intro">
        <h1>把资料变成<br /><span>可校对、可继续编辑的 PPT</span></h1>
        <p className="lead">粘贴文字或添加参考文件，生成 1–30 页结构，逐页确认后导出可编辑 PPTX。</p>
        <ol className="intro-flow" aria-label="工作流程">
          {['资料', '生成', '编辑', '导出'].map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, '0')}</span><b>{label}</b></li>)}
        </ol>
      </section>

      <section className="upload-panel" aria-label="上传资料">
        <div className="panel-heading"><div><h2>创建演示文稿</h2></div><p>从文字或文件开始</p></div>
        <label className="text-source-field">
          <span>主要资料文本</span>
          <textarea aria-label="主要资料文本" value={text} onChange={(event) => onTextChange(event.target.value)} placeholder="粘贴公司、品牌或产品资料。可包含背景、产品能力、用户价值、案例与数据……" />
        </label>

        <div className="generation-options">
          <label className="page-count-field">
            <span>生成页数</span>
            <input aria-label="生成页数" type="number" min="1" max="30" step="1" value={pageCount} onChange={(event) => onPageCountChange(event.target.value)} />
            <small>1–30 页</small>
          </label>
          <label className="attachment-field">
            <input aria-label="选择附件文件" type="file" multiple accept=".pptx,.pdf,.docx,.png,.jpg,.jpeg,.webp" onChange={(event) => onFiles(Array.from(event.target.files ?? []))} />
            <Paperclip size={18} />
            <span><b>添加附件</b><small>PPTX、PDF、DOCX 或图片 · 单个不超过 25 MB</small></span>
          </label>
        </div>
        {!pageCountValid && <p className="field-error">生成页数必须是 1–30 的整数。</p>}

        {pageCountValid && count <= 5 ? (
          <section className="short-deck-layouts" aria-label="逐页版式">
            <header><div><span>LAYOUT</span><h3>逐页选择版式</h3></div><small>1–5 页由你决定每页版式</small></header>
            {Array.from({ length: count }, (_, index) => (
              <fieldset key={index} aria-label={`第 ${index + 1} 页版式`}>
                <legend>第 {index + 1} 页</legend>
                <div className="short-layout-options">
                  {layoutIds.map((layout) => <label key={layout} className={layoutPreferences[index] === layout ? 'selected' : ''}>
                    <input type="radio" name={`page-layout-${index}`} value={layout} checked={layoutPreferences[index] === layout} onChange={() => onLayoutPreferenceChange(index, layout)} />
                    <i className={`layout-icon layout-icon-${layout}`} /><span>{layoutLabels[layout]}</span>
                  </label>)}
                </div>
              </fieldset>
            ))}
          </section>
        ) : pageCountValid ? <p className="automatic-layout-note">6 页及以上由 AI 自动匹配版式</p> : null}

        {(sources.length > 0 || issues.length > 0) && <div className="source-list">
          {sources.map((source) => <div className="source-row" key={source.id}><FileText size={18} /><p><b>{source.name}</b><small>{formatSize(source.size)} · 已就绪</small></p><button type="button" aria-label={`移除 ${source.name}`} onClick={() => onRemove(source.id)}><Trash2 size={17} /></button></div>)}
          {issues.map((issue) => <div className="source-error" key={`${issue.sourceName}-${issue.message}`}><b>{issue.sourceName}</b><span>{issue.message}</span></div>)}
        </div>}

        <div className="privacy-note"><ShieldCheck size={17} /><span>文件只在当前请求的服务内存中处理；提取文字、文件名和可用图片会发送给你配置的模型服务。</span></div>
        <button className="primary-action" type="button" aria-label="整理资料并生成方案" disabled={!hasInput || !pageCountValid} onClick={onContinue}>整理资料并生成方案 <ArrowRight size={17} /></button>
        <p className="demo-note">系统要求 AI 只使用本次资料；无法确认的内容应标记为缺失，请在导出前人工核验。</p>
      </section>
    </main>
  )
}
