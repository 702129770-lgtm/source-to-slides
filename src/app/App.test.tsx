import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { apiParser } from '../services/apiParser'

vi.mock('../services/apiParser', () => ({
  apiParser: {
    parse: vi.fn(async () => ({
      id: 'generated', title: '品牌资料', sources: [],
      pages: [{ id: 'page-1', kind: 'cover', layout: 'cover', title: '品牌资料', subtitle: 'BRAND INTRODUCTION', body: '', emphasis: '真实资料生成', bullets: [], sourceLabels: ['品牌资料.pdf'], warnings: [], assets: [{
        id: 'asset-1-1', name: '产品截图.png', url: 'data:image/png;base64,aGVybw==', sourceName: '品牌资料.pdf', type: 'image/png',
      }] }],
      unusedAssets: [{ id: 'asset-1-2', name: '备用图.png', url: 'data:image/png;base64,ZXh0cmE=', sourceName: '品牌资料.pdf', type: 'image/png', reason: '与页面主题相关性不足' }],
      unusedSources: [{ name: '补充说明.pdf', reason: '正文未提供可支持当前页面的信息' }],
    })),
  },
}))

describe('AI PPT wizard', () => {
  it('uses direct text, requested page count, and an optional attachment to generate', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(/提取文字、文件名和可用图片会发送/)).toBeInTheDocument()
    expect(screen.queryByText(/上传公司、品牌或产品资料/)).not.toBeInTheDocument()
    expect(screen.queryByText('只使用本次资料')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('主要资料文本'), '星河科技真实资料')
    await user.clear(screen.getByLabelText('生成页数'))
    await user.type(screen.getByLabelText('生成页数'), '5')
    await user.upload(screen.getByLabelText('选择附件文件'), new File(['deck'], '品牌资料.pdf', { type: 'application/pdf' }))
    expect(screen.getByText('品牌资料.pdf')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '整理资料并生成方案' }))
    expect(await screen.findByRole('heading', { name: '逐页确认内容' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '附件使用情况' })).toBeInTheDocument()
    expect(screen.getByText('产品截图.png')).toBeInTheDocument()
    expect(screen.getByText('备用图.png')).toBeInTheDocument()
    expect(screen.getByText('与页面主题相关性不足')).toBeInTheDocument()
    expect(screen.getByText('补充说明.pdf')).toBeInTheDocument()
    expect(vi.mocked(apiParser.parse)).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: '品牌资料.pdf' })]),
      '星河科技真实资料',
      5,
      ['overview', 'overview', 'overview', 'overview', 'overview'],
    )
    await user.click(screen.getByRole('button', { name: '生成完整预览' }))
    expect(screen.getByRole('button', { name: '下载可编辑 PPTX' })).toBeInTheDocument()
  })

  it('does not submit a page count outside 1 through 30', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('主要资料文本'), '真实资料')
    await user.clear(screen.getByLabelText('生成页数'))
    await user.type(screen.getByLabelText('生成页数'), '31')
    expect(screen.getByRole('button', { name: '整理资料并生成方案' })).toBeDisabled()
  })

  it('lets users choose and retain one layout per page for short decks', async () => {
    const user = userEvent.setup()
    render(<App />)
    const count = screen.getByLabelText('生成页数')
    await user.clear(count)
    await user.type(count, '3')

    const groups = screen.getAllByRole('group', { name: /第 \d 页版式/ })
    expect(groups).toHaveLength(3)
    expect(screen.getAllByRole('radio', { name: '概述/正文' })).toHaveLength(3)

    await user.click(within(groups[1]).getByRole('radio', { name: '左图右文' }))
    expect(within(groups[1]).getByRole('radio', { name: '左图右文' })).toBeChecked()

    await user.clear(count)
    await user.type(count, '6')
    expect(screen.queryByRole('group', { name: '第 1 页版式' })).not.toBeInTheDocument()
    expect(screen.getByText('6 页及以上由 AI 自动匹配版式')).toBeInTheDocument()

    await user.clear(count)
    await user.type(count, '3')
    const restoredGroups = screen.getAllByRole('group', { name: /第 \d 页版式/ })
    expect(within(restoredGroups[1]).getByRole('radio', { name: '左图右文' })).toBeChecked()
  })
})
