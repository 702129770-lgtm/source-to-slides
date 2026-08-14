import { describe, expect, it } from 'vitest'
import { validateFiles } from './sourceValidation'

function file(name: string, type: string, size = 3) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('validateFiles', () => {
  it('accepts supported business source formats', () => {
    const result = validateFiles([
      file('brand.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
      file('brief.pdf', 'application/pdf'),
      file('logo.png', 'image/png'),
    ])
    expect(result.accepted.map((item) => item.name)).toEqual(['brand.pptx', 'brief.pdf', 'logo.png'])
    expect(result.issues).toEqual([])
  })

  it('keeps valid files when the selection also contains invalid files', () => {
    const result = validateFiles([file('notes.txt', 'text/plain'), file('brief.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')])
    expect(result.accepted).toHaveLength(1)
    expect(result.issues[0]).toMatchObject({ sourceName: 'notes.txt' })
  })

  it('rejects a supported file larger than 25 MB', () => {
    const oversized = file('large.pdf', 'application/pdf')
    Object.defineProperty(oversized, 'size', { value: 25 * 1024 * 1024 + 1 })
    expect(validateFiles([oversized]).issues[0].message).toContain('25 MB')
  })
})
