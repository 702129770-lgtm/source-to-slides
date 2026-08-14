export interface ServerEnvironment {
  HOST?: string
  PORT?: string
  TRUSTED_ORIGINS?: string
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  OPENAI_MODEL?: string
}

export function resolveServerHost(environment: Pick<ServerEnvironment, 'HOST'>) {
  return environment.HOST?.trim() || '127.0.0.1'
}

export function resolveServerPort(environment: Pick<ServerEnvironment, 'PORT'>) {
  return Number(environment.PORT || 8787)
}
