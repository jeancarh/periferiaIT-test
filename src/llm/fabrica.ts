import { ErrorProveedorLlm, type LlmAdapter, type RespuestaLlm } from "./adapter"
import { OpenAiCompatibleLlm } from "./openai-compatible"

type PresetProveedor = {
  readonly urlBase: string
  readonly modeloPorDefecto: string
  readonly variableClave: string
}

export const PRESETS_PROVEEDOR: Readonly<Record<string, PresetProveedor>> = {
  gemini: {
    urlBase: "https://generativelanguage.googleapis.com/v1beta/openai",
    modeloPorDefecto: "gemini-3.1-flash-lite",
    variableClave: "GEMINI_API_KEY",
  },
  groq: {
    urlBase: "https://api.groq.com/openai/v1",
    modeloPorDefecto: "llama-3.3-70b-versatile",
    variableClave: "GROQ_API_KEY",
  },
}

export type ConfiguracionLlm = {
  readonly proveedor: string
  readonly modelo: string | undefined
  readonly timeoutMs: number
  readonly entorno: Readonly<Record<string, string | undefined>>
}

class LlmNoConfigurado implements LlmAdapter {
  constructor(
    readonly proveedor: string,
    readonly modelo: string,
    private readonly motivo: string,
  ) {}

  enviar(): Promise<RespuestaLlm> {
    return Promise.reject(new ErrorProveedorLlm(this.motivo))
  }
}

export const crearLlm = ({ proveedor, modelo, timeoutMs, entorno }: ConfiguracionLlm): LlmAdapter => {
  const preset = PRESETS_PROVEEDOR[proveedor]
  if (!preset) {
    return new LlmNoConfigurado(proveedor, modelo ?? "desconocido", `El proveedor de modelo "${proveedor}" no está soportado.`)
  }
  const modeloElegido = modelo || preset.modeloPorDefecto
  const apiKey = entorno[preset.variableClave]
  if (!apiKey) {
    return new LlmNoConfigurado(proveedor, modeloElegido, `Falta configurar ${preset.variableClave} en el servidor.`)
  }
  return new OpenAiCompatibleLlm({ proveedor, modelo: modeloElegido, urlBase: preset.urlBase, apiKey, timeoutMs })
}
