import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
import multer from 'multer'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractUploadedFile, SourceExtractionError, type ExtractedSource } from './sourceExtractor'
import { generateDeck } from './deckGenerator'
import { GenerationRequestError, parseGenerationFields } from './generationRequest'
import { createOpenAIClient } from './openaiClient'
import { resolveServerPort, type ServerEnvironment } from './serverConfig'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 12, fields: 4, parts: 15, fieldSize: 512 * 1024 },
})

export const MAX_REQUEST_FILE_BYTES = 75 * 1024 * 1024
export const MAX_REQUEST_IMAGE_BYTES = 32 * 1024 * 1024

export function isWithinRequestFileBudget(files: Array<Pick<Express.Multer.File, 'size'>>) {
  return files.reduce((total, file) => total + file.size, 0) <= MAX_REQUEST_FILE_BYTES
}

function dataUrlBytes(dataUrl: string) {
  const payload = dataUrl.split(',', 2)[1] ?? ''
  return Math.floor(payload.length * 3 / 4)
}

async function extractFiles(files: Express.Multer.File[]) {
  const extracted: ExtractedSource[] = []
  let imageBytes = 0
  for (const file of files) {
    const source = await extractUploadedFile(file)
    imageBytes += source.images.reduce((total, image) => total + dataUrlBytes(image.dataUrl), 0)
    if (imageBytes > MAX_REQUEST_IMAGE_BYTES) {
      throw new SourceExtractionError('所有附件的可用图片总量超过 32 MiB')
    }
    extracted.push(source)
  }
  return extracted
}

const handleRequestError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(413).json({ error: '上传内容超过限制。' })
    return
  }
  response.status(500).json({ error: '生成失败，请稍后重试。' })
}

function trustedOrigins(environment: ServerEnvironment) {
  const port = resolveServerPort(environment)
  const origins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ])

  for (const value of environment.TRUSTED_ORIGINS?.split(',') ?? []) {
    const candidate = value.trim()
    if (!candidate) continue
    try {
      origins.add(new URL(candidate).origin)
    } catch {
      // Invalid configured origins are ignored rather than weakening the allowlist.
    }
  }
  return origins
}

function requireTrustedOrigin(environment: ServerEnvironment): RequestHandler {
  const allowed = trustedOrigins(environment)
  return (request, response, next) => {
    const origin = request.get('origin')
    if (!origin) {
      next()
      return
    }
    if (allowed.has(origin)) {
      next()
      return
    }
    response.status(403).json({ error: '不允许的请求来源。' })
  }
}

export function createApp(environment: ServerEnvironment = process.env) {
  const app = express()

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, modelConfigured: Boolean(environment.OPENAI_API_KEY) })
  })

  app.post('/api/generate', requireTrustedOrigin(environment), upload.array('files', 12), async (request, response) => {
    try {
      if (!environment.OPENAI_API_KEY) {
        response.status(503).json({ error: '服务端缺少 OPENAI_API_KEY，请配置后重新生成。' })
        return
      }
      const files = (request.files as Express.Multer.File[] | undefined) ?? []
      if (!isWithinRequestFileBudget(files)) {
        response.status(413).json({ error: '单次请求的附件总量不能超过 75 MiB。' })
        return
      }
      const { text, pageCount, layoutPreferences } = parseGenerationFields(request.body, files.length)
      const extracted = await extractFiles(files)
      if (text) extracted.unshift({ name: '用户输入文本', text, images: [] })
      const client = createOpenAIClient(environment)
      const draft = await generateDeck(extracted, client, environment.OPENAI_MODEL, pageCount, layoutPreferences)
      draft.sources = extracted.map((source, index) => ({ id: `source-${index + 1}`, name: source.name, kind: 'file', status: 'ready' }))
      response.json(draft)
    } catch (error) {
      if (error instanceof GenerationRequestError) {
        response.status(400).json({ error: error.message })
        return
      }
      if (error instanceof SourceExtractionError) {
        response.status(400).json({ error: error.message })
        return
      }
      response.status(500).json({ error: '生成失败，请稍后重试。' })
    }
  })

  const dist = resolve(process.cwd(), 'dist')
  if (existsSync(dist)) {
    app.use(express.static(dist))
    app.use((_request, response) => response.sendFile(resolve(dist, 'index.html')))
  }

  app.use(handleRequestError)

  return app
}
