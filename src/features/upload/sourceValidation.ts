import type { SourceItem, ValidationIssue } from '../../domain/deck'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const supportedExtensions = new Set(['pptx', 'pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp'])

function extensionOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function validateFiles(files: File[]): { accepted: SourceItem[]; issues: ValidationIssue[] } {
  const accepted: SourceItem[] = []
  const issues: ValidationIssue[] = []

  files.forEach((file, index) => {
    if (!supportedExtensions.has(extensionOf(file.name))) {
      issues.push({ sourceName: file.name, message: '不支持此格式，请上传 PPTX、PDF、DOCX 或常见图片。' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      issues.push({ sourceName: file.name, message: '单个文件不能超过 25 MB。' })
      return
    }
    accepted.push({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      kind: 'file',
      size: file.size,
      type: file.type,
      status: 'ready',
      file,
    })
  })

  return { accepted, issues }
}
