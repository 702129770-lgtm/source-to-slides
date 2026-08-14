import { useState } from 'react'
import type { DeckDraft, LayoutId, SourceItem, ValidationIssue, WizardStep } from '../domain/deck'
import { UploadStep } from '../features/upload/UploadStep'
import { validateFiles } from '../features/upload/sourceValidation'
import { ProcessingStep } from '../features/processing/ProcessingStep'
import { EditorStep } from '../features/editor/EditorStep'
import { PreviewStep } from '../features/preview/PreviewStep'
import { apiParser } from '../services/apiParser'
import { downloadPresentation } from '../services/pptxExporter'

function Brand() {
  return <a className="brand" href="/" aria-label="GZL PPT 首页"><span className="brand-mark" aria-hidden="true">G</span><span><b>GZL PPT</b><small>SOURCE TO SLIDES</small></span></a>
}

function Stepper({ step }: { step: WizardStep }) {
  const index = { upload: 0, processing: 1, editor: 2, preview: 3 }[step]
  return <nav className="stepper" aria-label="生成进度">{['资料', '生成', '编辑', '导出'].map((label, itemIndex) => <div key={label} className={itemIndex <= index ? 'active' : ''}><span>{itemIndex < index ? '✓' : itemIndex + 1}</span><b>{label}</b>{itemIndex < 3 && <i />}</div>)}</nav>
}

export function App() {
  const [step, setStep] = useState<WizardStep>('upload')
  const [sources, setSources] = useState<SourceItem[]>([])
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [text, setText] = useState('')
  const [pageCount, setPageCount] = useState('8')
  const [layoutPreferences, setLayoutPreferences] = useState<LayoutId[]>(() => Array.from({ length: 5 }, () => 'overview'))
  const [draft, setDraft] = useState<DeckDraft | null>(null)

  const addFiles = (files: File[]) => {
    const result = validateFiles(files)
    setSources((current) => [...current, ...result.accepted])
    setIssues(result.issues)
  }

  const process = async () => {
    setStep('processing')
    setIssues([])
    try {
      const count = Number(pageCount)
      const result = await apiParser.parse(sources, text, count, count <= 5 ? layoutPreferences.slice(0, count) : undefined)
      setDraft({ ...result, sources })
      setStep('editor')
    } catch (error) {
      setIssues([{ sourceName: '生成失败', message: error instanceof Error ? error.message : '未知错误，请重新尝试。' }])
      setStep('upload')
    }
  }

  const setLayoutPreference = (index: number, layout: LayoutId) => {
    setLayoutPreferences((current) => current.map((item, itemIndex) => itemIndex === index ? layout : item))
  }

  return <div className={`app step-${step}`}>
    <div className="app-background" aria-hidden="true" />
    <header className="app-header"><Brand /><Stepper step={step} /><div className="session-note">本地模式 <span>●</span></div></header>
    {step === 'upload' && <UploadStep sources={sources} text={text} pageCount={pageCount} layoutPreferences={layoutPreferences} issues={issues} onFiles={addFiles} onTextChange={setText} onPageCountChange={setPageCount} onLayoutPreferenceChange={setLayoutPreference} onRemove={(id) => setSources((current) => current.filter((source) => source.id !== id))} onContinue={process} />}
    {step === 'processing' && <ProcessingStep sources={sources} hasText={Boolean(text.trim())} />}
    {step === 'editor' && draft && <EditorStep draft={draft} onBack={() => setStep('upload')} onPreview={(nextDraft) => { setDraft(nextDraft); setStep('preview') }} />}
    {step === 'preview' && draft && <PreviewStep draft={draft} onBack={() => setStep('editor')} onDownload={() => downloadPresentation(draft)} />}
  </div>
}
