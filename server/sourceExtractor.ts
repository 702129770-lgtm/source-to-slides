import { load } from 'cheerio'
import JSZip from 'jszip'
import pdfParse from 'pdf-parse'
import { Readable } from 'node:stream'

export interface ExtractedImage {
  name: string
  dataUrl: string
}

export interface ExtractedSource {
  name: string
  text: string
  images: ExtractedImage[]
}

export class SourceExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SourceExtractionError'
  }
}

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
}

const MAX_ZIP_ENTRIES = 2_000
const MAX_ZIP_ENTRY_BYTES = 16 * 1024 * 1024
const MAX_ZIP_TOTAL_BYTES = 64 * 1024 * 1024
const MAX_ZIP_IMAGE_BYTES = 32 * 1024 * 1024

type SizedZipEntry = JSZip.JSZipObject & {
  _data?: { uncompressedSize?: number }
}

interface ZipReadBudget {
  totalBytes: number
  imageBytes: number
}

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function decodeEntities(value: string) {
  return load(`<body>${value}</body>`).text()
}

function compactText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function xmlText(xml: string) {
  const runs = [...xml.matchAll(/<(?:a|w):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:a|w):t>/g)].map((match) => decodeEntities(match[1]))
  return compactText(runs.join('\n'))
}

async function loadOfficeZip(buffer: Buffer, fileName: string) {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new SourceExtractionError(`${fileName} 不是可读取的 Office 文件`)
  }
  const entries = Object.values(zip.files) as SizedZipEntry[]
  if (entries.length > MAX_ZIP_ENTRIES) throw new SourceExtractionError(`${fileName} 包含过多 ZIP 条目`)
  if (entries.some((entry) => (entry._data?.uncompressedSize ?? 0) > MAX_ZIP_ENTRY_BYTES)) {
    throw new SourceExtractionError(`${fileName} 的 ZIP 条目超过 16 MiB`)
  }
  const totalBytes = entries.reduce((total, entry) => total + (entry._data?.uncompressedSize ?? 0), 0)
  if (totalBytes > MAX_ZIP_TOTAL_BYTES) throw new SourceExtractionError(`${fileName} 的 ZIP 解压总量超过 64 MiB`)
  const imageBytes = entries
    .filter((entry) => IMAGE_MIME[extension(entry.name)])
    .reduce((total, entry) => total + (entry._data?.uncompressedSize ?? 0), 0)
  if (imageBytes > MAX_ZIP_IMAGE_BYTES) throw new SourceExtractionError(`${fileName} 的内嵌图片解压总量超过 32 MiB`)
  return zip
}

function readZipEntry(entry: JSZip.JSZipObject, fileName: string, budget: ZipReadBudget, image = false): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const stream = entry.nodeStream('nodebuffer') as Readable
    let entryBytes = 0
    let settled = false

    const fail = (message: string) => {
      if (settled) return
      settled = true
      stream.destroy()
      reject(new SourceExtractionError(message))
    }

    stream.on('data', (value: Buffer | Uint8Array) => {
      if (settled) return
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
      const nextEntryBytes = entryBytes + chunk.length
      const nextTotalBytes = budget.totalBytes + chunk.length
      const nextImageBytes = budget.imageBytes + (image ? chunk.length : 0)

      if (nextEntryBytes > MAX_ZIP_ENTRY_BYTES) {
        fail(`${fileName} 的 ZIP 条目实际解压大小超过 16 MiB`)
        return
      }
      if (nextTotalBytes > MAX_ZIP_TOTAL_BYTES) {
        fail(`${fileName} 的 ZIP 实际解压总量超过 64 MiB`)
        return
      }
      if (nextImageBytes > MAX_ZIP_IMAGE_BYTES) {
        fail(`${fileName} 的内嵌图片实际解压总量超过 32 MiB`)
        return
      }

      entryBytes = nextEntryBytes
      budget.totalBytes = nextTotalBytes
      budget.imageBytes = nextImageBytes
      chunks.push(chunk)
    })
    stream.once('error', () => {
      if (settled) return
      settled = true
      reject(new SourceExtractionError(`${fileName} 无法安全解压`))
    })
    stream.once('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks, entryBytes))
    })
  })
}

async function embeddedImages(zip: JSZip, prefix: string, fileName: string, budget: ZipReadBudget): Promise<ExtractedImage[]> {
  const entries = Object.keys(zip.files).filter((name) => name.startsWith(prefix) && IMAGE_MIME[extension(name)]).slice(0, 12)
  const images: ExtractedImage[] = []
  for (const name of entries) {
    const mime = IMAGE_MIME[extension(name)]
    const data = await readZipEntry(zip.file(name)!, fileName, budget, true)
    images.push({ name: name.split('/').pop() ?? name, dataUrl: `data:${mime};base64,${data.toString('base64')}` })
  }
  return images
}

async function extractOfficeTextFromZip(zip: JSZip, fileName: string, budget: ZipReadBudget): Promise<string> {
  const ext = extension(fileName)
  if (ext === 'docx') {
    const document = zip.file('word/document.xml')
    if (!document) throw new SourceExtractionError(`${fileName} 中没有可读取的正文`)
    return xmlText((await readZipEntry(document, fileName, budget)).toString('utf8'))
  }
  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
  const parts: string[] = []
  for (const [index, name] of slides.entries()) {
    const xml = (await readZipEntry(zip.file(name)!, fileName, budget)).toString('utf8')
    parts.push(`【第 ${index + 1} 页】\n${xmlText(xml)}`)
  }
  return compactText(parts.join('\n\n'))
}

export async function extractOfficeText(buffer: Buffer, fileName: string): Promise<string> {
  const zip = await loadOfficeZip(buffer, fileName)
  return extractOfficeTextFromZip(zip, fileName, { totalBytes: 0, imageBytes: 0 })
}

export async function extractUploadedFile(file: Express.Multer.File): Promise<ExtractedSource> {
  const ext = extension(file.originalname)
  if (ext === 'pptx' || ext === 'docx') {
    const zip = await loadOfficeZip(file.buffer, file.originalname)
    const budget = { totalBytes: 0, imageBytes: 0 }
    return {
      name: file.originalname,
      text: await extractOfficeTextFromZip(zip, file.originalname, budget),
      images: await embeddedImages(zip, ext === 'pptx' ? 'ppt/media/' : 'word/media/', file.originalname, budget),
    }
  }
  if (ext === 'pdf') {
    try {
      const result = await pdfParse(file.buffer)
      return { name: file.originalname, text: compactText(result.text).slice(0, 50_000), images: [] }
    } catch {
      throw new SourceExtractionError(`${file.originalname} 不是可读取的 PDF 文件`)
    }
  }
  if (IMAGE_MIME[ext]) {
    return { name: file.originalname, text: '', images: [{ name: file.originalname, dataUrl: `data:${IMAGE_MIME[ext]};base64,${file.buffer.toString('base64')}` }] }
  }
  throw new SourceExtractionError(`${file.originalname} 的格式不受支持`)
}
