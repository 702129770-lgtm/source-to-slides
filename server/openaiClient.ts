import OpenAI from 'openai'

interface OpenAIEnvironment {
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
}

export function createOpenAIClient(environment: OpenAIEnvironment = process.env) {
  return new OpenAI({
    apiKey: environment.OPENAI_API_KEY,
    baseURL: environment.OPENAI_BASE_URL || undefined,
  })
}
