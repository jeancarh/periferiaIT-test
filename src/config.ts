import { z } from "zod"

const entero = (porDefecto: number) => z.coerce.number().int().positive().default(porDefecto)

const EntornoSchema = z.object({
  PORT: entero(3000),
  NODE_ENV: z.string().default("development"),
  LLM_PROVIDER: z.string().default("gemini"),
  LLM_MODEL: z.string().optional(),
  LLM_TIMEOUT_MS: entero(30_000),
  AGENT_MAX_ITERATIONS: entero(25),
  AGENT_MAX_SESSION_TOKENS: entero(150_000),
  AGENT_MAX_DAILY_REQUESTS: entero(300),
  AGENT_MAX_DAILY_TOKENS: entero(3_000_000),
  AGENT_MAX_SESSIONS: entero(500),
})

export type Configuracion = z.infer<typeof EntornoSchema>

const cargarArchivoEnv = (): void => {
  try {
    process.loadEnvFile()
  } catch {
    return
  }
}

export const cargarConfiguracion = (): Configuracion => {
  cargarArchivoEnv()
  return EntornoSchema.parse(process.env)
}
