// @vitest-environment node
import type { AddressInfo } from 'node:net'
import { once } from 'node:events'
import { describe, expect, it } from 'vitest'
import { createApp, isWithinRequestFileBudget, MAX_REQUEST_FILE_BYTES } from './app'
import { resolveServerHost } from './serverConfig'

async function withServer(
  environment: Parameters<typeof createApp>[0],
  run: (baseUrl: string) => Promise<void>,
) {
  const server = createApp(environment).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address() as AddressInfo
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

function validGenerationForm() {
  const form = new FormData()
  form.set('text', '公开测试资料')
  form.set('pageCount', '6')
  return form
}

describe('server host configuration', () => {
  it('binds to loopback unless HOST is explicitly configured', () => {
    expect(resolveServerHost({})).toBe('127.0.0.1')
  })

  it('uses an explicitly configured HOST', () => {
    expect(resolveServerHost({ HOST: '0.0.0.0' })).toBe('0.0.0.0')
  })
})

describe('generation API request boundary', () => {
  it('caps the combined attachment size before extraction', () => {
    expect(isWithinRequestFileBudget([{ size: MAX_REQUEST_FILE_BYTES }])).toBe(true)
    expect(isWithinRequestFileBudget([{ size: MAX_REQUEST_FILE_BYTES }, { size: 1 }])).toBe(false)
  })

  it('rejects browser requests from an untrusted origin', async () => {
    await withServer({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { Origin: 'https://attacker.example' },
        body: validGenerationForm(),
      })

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ error: '不允许的请求来源。' })
    })
  })

  it('allows CLI, local development, same-service, and configured trusted origins', async () => {
    await withServer({ PORT: '8787', TRUSTED_ORIGINS: 'https://trusted.example' }, async (baseUrl) => {
      const origins = [undefined, 'http://localhost:5173', 'http://127.0.0.1:8787', 'https://trusted.example']

      for (const origin of origins) {
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: origin ? { Origin: origin } : undefined,
          body: validGenerationForm(),
        })
        expect(response.status).toBe(503)
      }
    })
  })

  it('returns request validation details for a 400 response', async () => {
    await withServer({ OPENAI_API_KEY: 'test-key' }, async (baseUrl) => {
      const form = new FormData()
      form.set('pageCount', '6')
      const response = await fetch(`${baseUrl}/api/generate`, { method: 'POST', body: form })

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: '请输入文本或添加附件。' })
    })
  })

  it('returns a safe 400 response for an unreadable attachment', async () => {
    await withServer({ OPENAI_API_KEY: 'test-key' }, async (baseUrl) => {
      const form = validGenerationForm()
      form.set('files', new Blob(['not a valid Office archive']), 'broken.docx')
      const response = await fetch(`${baseUrl}/api/generate`, { method: 'POST', body: form })

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'broken.docx 不是可读取的 Office 文件' })
    })
  })

  it('rejects a multipart text field larger than 512 KiB', async () => {
    await withServer({}, async (baseUrl) => {
      const form = new FormData()
      form.set('text', 'a'.repeat(512 * 1024 + 1))
      form.set('pageCount', '6')
      const response = await fetch(`${baseUrl}/api/generate`, { method: 'POST', body: form })

      expect(response.status).toBe(413)
      await expect(response.json()).resolves.toEqual({ error: '上传内容超过限制。' })
    })
  })

  it('rejects more than four multipart fields', async () => {
    await withServer({}, async (baseUrl) => {
      const form = validGenerationForm()
      form.set('layoutPreferences', '[]')
      form.set('extraOne', '1')
      form.set('extraTwo', '2')
      const response = await fetch(`${baseUrl}/api/generate`, { method: 'POST', body: form })

      expect(response.status).toBe(413)
      await expect(response.json()).resolves.toEqual({ error: '上传内容超过限制。' })
    })
  })

  it('rejects more than fifteen multipart parts', async () => {
    await withServer({}, async (baseUrl) => {
      const form = validGenerationForm()
      form.set('layoutPreferences', '[]')
      form.set('extra', '1')
      for (let index = 0; index < 12; index += 1) {
        form.append('files', new Blob(['x']), `source-${index + 1}.pdf`)
      }
      const response = await fetch(`${baseUrl}/api/generate`, { method: 'POST', body: form })

      expect(response.status).toBe(413)
      await expect(response.json()).resolves.toEqual({ error: '上传内容超过限制。' })
    })
  })
})
