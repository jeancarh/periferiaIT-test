export type LlamadaHerramienta = {
  readonly id: string
  readonly nombre: string
  readonly argumentos: string
  readonly metadatosProveedor?: unknown
}

export type MensajeChat =
  | { readonly rol: "system"; readonly contenido: string }
  | { readonly rol: "user"; readonly contenido: string }
  | { readonly rol: "assistant"; readonly contenido: string | null; readonly llamadas: readonly LlamadaHerramienta[] }
  | { readonly rol: "tool"; readonly idLlamada: string; readonly nombre: string; readonly contenido: string }

export type DefinicionHerramientaLlm = {
  readonly nombre: string
  readonly descripcion: string
  readonly parametros: Readonly<Record<string, unknown>>
}

export type RespuestaLlm = {
  readonly contenido: string | null
  readonly llamadas: readonly LlamadaHerramienta[]
  readonly tokens: number
}

export interface LlmAdapter {
  readonly proveedor: string
  readonly modelo: string
  enviar(mensajes: readonly MensajeChat[], herramientas: readonly DefinicionHerramientaLlm[]): Promise<RespuestaLlm>
}

export class ErrorProveedorLlm extends Error {
  constructor(readonly mensajeUsuario: string) {
    super(mensajeUsuario)
    this.name = "ErrorProveedorLlm"
  }
}
