import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { layoutIds, type DeckPage } from '../../domain/deck'
import { SlideCanvas } from './SlideCanvas'

describe('SlideCanvas', () => {
  it.each(layoutIds)('renders %s as an accessible 16:9 slide', (layout) => {
    const page: DeckPage = {
      id: layout, kind: layout === 'cover' ? 'cover' : 'narrative', layout,
      title: '页面标题', subtitle: 'PAGE TITLE', body: '正文内容', emphasis: '关键结论',
      bullets: ['第一点', '第二点', '第三点'], sourceLabels: ['资料.pdf'], warnings: ['缺失信息'], assets: [],
    }
    render(<SlideCanvas page={page} />)
    const slide = screen.getByRole('img', { name: '页面标题' })
    expect(slide).toHaveAttribute('data-ratio', '16:9')
    expect(slide).not.toHaveTextContent('缺失信息')
  })

  it('renders a selected trusted image in a compatible layout', () => {
    const dataUrl = 'data:image/png;base64,aGVybw=='
    const page: DeckPage = {
      id: 'media', kind: 'narrative', layout: 'text-image', title: '产品能力', subtitle: 'CAPABILITY',
      body: '正文内容', emphasis: '', bullets: ['第一点'], sourceLabels: ['product.docx'], warnings: [],
      assets: [{ id: 'asset-1-1', name: '产品截图', url: dataUrl, sourceName: 'product.docx', type: 'image/png' }],
    }
    render(<SlideCanvas page={page} />)
    expect(screen.getByRole('img', { name: '产品截图' })).toHaveAttribute('src', dataUrl)
  })
})
