// @vitest-environment node
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractOfficeText, extractUploadedFile } from './sourceExtractor'

function patchDeclaredSize(buffer: Buffer, entryName: string, size: number) {
  const result = Buffer.from(buffer)
  const centralHeader = Buffer.from([0x50, 0x4b, 0x01, 0x02])
  let offset = 0

  while ((offset = result.indexOf(centralHeader, offset)) !== -1) {
    const nameLength = result.readUInt16LE(offset + 28)
    const extraLength = result.readUInt16LE(offset + 30)
    const commentLength = result.readUInt16LE(offset + 32)
    const name = result.subarray(offset + 46, offset + 46 + nameLength).toString('utf8')
    if (name === entryName) {
      result.writeUInt32LE(size, offset + 24)
      return result
    }
    offset += 46 + nameLength + extraLength + commentLength
  }

  throw new Error(`Missing central-directory entry: ${entryName}`)
}

describe('sourceExtractor', () => {
  it('extracts the actual words from a PPTX archive', async () => {
    const zip = new JSZip()
    zip.file('ppt/slides/slide1.xml', '<p:sld><a:t>星河科技</a:t><a:t>智能投放平台</a:t></p:sld>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    const text = await extractOfficeText(buffer, 'company.pptx')
    expect(text).toContain('星河科技')
    expect(text).toContain('智能投放平台')
  })

  it('extracts the actual words from a DOCX archive', async () => {
    const zip = new JSZip()
    zip.file('word/document.xml', '<w:document><w:t>云帆品牌</w:t><w:t>出海增长方案</w:t></w:document>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    expect(await extractOfficeText(buffer, 'brief.docx')).toContain('出海增长方案')
  })

  it('rejects an Office archive with more than 2,000 ZIP entries', async () => {
    const zip = new JSZip()
    zip.file('word/document.xml', '<w:document><w:t>测试</w:t></w:document>')
    for (let index = 0; index < 2_000; index += 1) zip.file(`entry-${index}.txt`, '')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })

    await expect(extractOfficeText(buffer, 'too-many-entries.docx')).rejects.toThrow('too-many-entries.docx 包含过多 ZIP 条目')
  })

  it('rejects an Office archive declaring an entry larger than 16 MiB', async () => {
    const zip = new JSZip()
    zip.file('word/document.xml', '<w:document><w:t>测试</w:t></w:document>', { createFolders: false })
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    const oversized = patchDeclaredSize(buffer, 'word/document.xml', 16 * 1024 * 1024 + 1)

    await expect(extractOfficeText(oversized, 'oversized-entry.docx')).rejects.toThrow('oversized-entry.docx 的 ZIP 条目超过 16 MiB')
  })

  it('rejects an Office archive declaring more than 64 MiB uncompressed in total', async () => {
    const zip = new JSZip()
    const names = ['word/document.xml', 'one.bin', 'two.bin', 'three.bin', 'four.bin']
    names.forEach((name) => zip.file(name, name === 'word/document.xml' ? '<w:document><w:t>测试</w:t></w:document>' : 'x', { createFolders: false }))
    let buffer = await zip.generateAsync({ type: 'nodebuffer' })
    for (const name of names) buffer = patchDeclaredSize(buffer, name, 13 * 1024 * 1024 + 1)

    await expect(extractOfficeText(buffer, 'oversized-total.docx')).rejects.toThrow('oversized-total.docx 的 ZIP 解压总量超过 64 MiB')
  })

  it('rejects an Office archive declaring more than 32 MiB of embedded images', async () => {
    const zip = new JSZip()
    zip.file('ppt/slides/slide1.xml', '<p:sld><a:t>测试</a:t></p:sld>', { createFolders: false })
    const imageNames = ['ppt/media/image1.png', 'ppt/media/image2.png', 'ppt/media/image3.png']
    imageNames.forEach((name) => zip.file(name, 'x', { createFolders: false }))
    let buffer = await zip.generateAsync({ type: 'nodebuffer' })
    for (const name of imageNames) buffer = patchDeclaredSize(buffer, name, 11 * 1024 * 1024)
    const file = { originalname: 'image-heavy.pptx', buffer } as Express.Multer.File

    await expect(extractUploadedFile(file)).rejects.toThrow('image-heavy.pptx 的内嵌图片解压总量超过 32 MiB')
  })

  it('stops decompression when an entry expands beyond 16 MiB despite a false declared size', async () => {
    const zip = new JSZip()
    zip.file('word/document.xml', `<w:document><w:t>${'a'.repeat(16 * 1024 * 1024)}</w:t></w:document>`, { createFolders: false })
    const generated = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    const deceptive = patchDeclaredSize(generated, 'word/document.xml', 1)

    await expect(extractOfficeText(deceptive, 'deceptive.docx')).rejects.toThrow('deceptive.docx 的 ZIP 条目实际解压大小超过 16 MiB')
  })
})
