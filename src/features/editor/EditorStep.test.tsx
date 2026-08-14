import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DeckDraft } from '../../domain/deck'
import { EditorStep } from './EditorStep'

const draft: DeckDraft = {
  id: 'deck', title: '容量测试', sources: [], unusedAssets: [], unusedSources: [],
  pages: [{
    id: 'page-1', kind: 'narrative', layout: 'text-image', title: '产品介绍', subtitle: 'PRODUCT',
    body: '简短正文', emphasis: '', bullets: ['要点一', '要点二', '要点三', '要点四', '要点五'],
    sourceLabels: ['用户输入文本'], warnings: [], assets: [],
  }],
}

describe('EditorStep capacity validation', () => {
  it('blocks preview until overflowing bullets are reduced to the layout limit', async () => {
    const user = userEvent.setup()
    render(<EditorStep draft={draft} onBack={vi.fn()} onPreview={vi.fn()} />)

    expect(screen.getByText('左文右图最多容纳 3 条要点，当前为 5 条。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成完整预览' })).toBeDisabled()

    const bullets = screen.getByLabelText('要点（每行一项）')
    await user.clear(bullets)
    await user.type(bullets, '要点一\n要点二\n要点三')

    expect(screen.queryByText('左文右图最多容纳 3 条要点，当前为 5 条。')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成完整预览' })).toBeEnabled()
  })
})
