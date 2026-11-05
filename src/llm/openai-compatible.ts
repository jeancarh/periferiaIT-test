import { randomUUID } from "node:crypto"
import { z } from "zod"
import {
  ErrorProveedorLlm,
  type DefinicionHerramientaLlm,
  type LlamadaHerramienta,
  type LlmAdapter,
  type MensajeChat,
  type RespuestaLlm,
} from "./adapter"

export type ConfiguracionOpenAiCompatible = {
  readonly proveedor: string
  readonly modelo: string
  readonly urlBase: string
  readonly apiKey: string
  readonly timeoutMs: number
}

const RespuestaWireSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(
              z.object({
                id: z.string().nullish(),
                function: z.object({ name: z.string(), arguments: z.string().nullish() }),
                extra_content: z.unknown().optional(),
              }),
            )
            .nullish(),
        }),
      }),
    )
    .min(1),
  usage: z.object({ total_tokens: z.number() }).nullish(),
})

const CLAVES_NO_SOPORTADAS = new Set(["$schema", "additionalProperties"])
const ESTADOS_REINTENTABLES = new Set([429, 500, 502, 503, 504])
const REINTENTOS = 2
const ESPERA_BASE_MS = 1_500

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

const limpiarEsquema = (valor: unknown): unknown => {
  if (Array.isArray(valor)) return valor.map(limpiarEsquema)
  if (valor === null || typeof valor !== "object") return valor
  return Object.fromEntries(
    Object.entries(valor)
      .filter(([clave]) => !CLAVES_NO_SOPORTADAS.has(clave))
      .map(([clave, contenido]) => [clave, limpiarEsquema(contenido)]),
  )
}

const aMensajeWire = (mensaje: MensajeChat) => {
  switch (mensaje.rol) {
    case "system":
    case "user":
      return { role: mensaje.rol, content: mensaje.contenido }
    case "assistant":
      return {
        role: "assistant",
        content: mensaje.contenido,
        ...(mensaje.llamadas.length > 0 && {
          tool_calls: mensaje.llamadas.map((llamada) => ({
            id: llamada.id,
            type: "function",
            function: { name: llamada.nombre, arguments: llamada.argumentos },
            ...(llamada.metadatosProveedor !== undefined && { extra_content: llamada.metadatosProveedor }),
          })),
        }),
      }
    case "tool":
      return { role: "tool", tool_call_id: mensaje.idLlamada, content: mensaje.contenido }
  }
}

const aHerramientaWire = (herramienta: DefinicionHerramientaLlm) => ({
  type: "function",
  function: {
    name: herramienta.nombre,
    description: herramienta.descripcion,
    parameters: limpiarEsquema(herramienta.parametros),
  },
})

const mensajeSegunEstado = (estado: number): string => {
  if (estado === 401 || estado === 403) return "El proveedor del modelo rechazó la credencial configurada en el servidor."
  if (estado === 429) return "El proveedor del modelo alcanzó su límite de uso. Intenta de nuevo en un minuto."
  if (estado >= 500) return "El proveedor del modelo no está disponible en este momento. Intenta de nuevo."
  return `El proveedor del modelo rechazó la solicitud (HTTP ${estado}).`
}

export class OpenAiCompatibleLlm implements LlmAdapter {
  readonly proveedor: string
  readonly modelo: string

  constructor(private readonly configuracion: ConfiguracionOpenAiCompatible) {
    this.proveedor = configuracion.proveedor
    this.modelo = configuracion.modelo
  }

  async enviar(mensajes: readonly MensajeChat[], herramientas: readonly DefinicionHerramientaLlm[]): Promise<RespuestaLlm> {
    const respuesta = await this.solicitar({
      model: this.modelo,
      messages: mensajes.map(aMensajeWire),
      ...(herramientas.length > 0 && { tools: herramientas.map(aHerramientaWire), tool_choice: "auto" }),
    })
    if (!respuesta.ok) throw new ErrorProveedorLlm(mensajeSegunEstado(respuesta.status))
    const cuerpo = RespuestaWireSchema.safeParse(await respuesta.json())
    if (!cuerpo.success) throw new ErrorProveedorLlm("El proveedor del modelo devolvió una respuesta con un formato inesperado.")
    const [opcion] = cuerpo.data.choices
    const llamadas: LlamadaHerramienta[] = (opcion?.message.tool_calls ?? []).map((llamada) => ({
      id: llamada.id || randomUUID(),
      nombre: llamada.function.name,
      argumentos: llamada.function.arguments ?? "{}",
      ...(llamada.extra_content !== undefined && { metadatosProveedor: llamada.extra_content }),
    }))
    return {
      contenido: opcion?.message.content ?? null,
      llamadas,
      tokens: cuerpo.data.usage?.total_tokens ?? 0,
    }
  }

  private async solicitar(cuerpo: Record<string, unknown>): Promise<Response> {
    for (let intento = 1; ; intento++) {
      const respuesta = await this.solicitarUnaVez(cuerpo)
      if (!ESTADOS_REINTENTABLES.has(respuesta.status) || intento > REINTENTOS) return respuesta
      await esperar(ESPERA_BASE_MS * intento)
    }
  }

  private async solicitarUnaVez(cuerpo: Record<string, unknown>): Promise<Response> {
    try {
      return await fetch(`${this.configuracion.urlBase}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.configuracion.apiKey}` },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(this.configuracion.timeoutMs),
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new ErrorProveedorLlm(`El modelo no respondió en ${Math.round(this.configuracion.timeoutMs / 1000)} segundos.`)
      }
      throw new ErrorProveedorLlm("No fue posible conectar con el proveedor del modelo.")
    }
  }
}
