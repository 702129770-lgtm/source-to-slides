// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createOpenAIClient } from './openaiClient'

describe('createOpenAIClient', () => {
  it('uses the configured relay base URL', () => {
    const client = createOpenAIClient({
      OPENAI_API_KEY: 'test-key',
      OPENAI_BASE_URL: 'https://api.example.com/v1',
    })

    expect(client.baseURL).toBe('https://api.example.com/v1')
  })
})
