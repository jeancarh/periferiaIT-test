import { z } from "zod"
import { ErrorHttp, solicitarJson } from "../../../shared/http/cliente-http"
import type { ChatGateway, EstadoServicio, RespuestaChat, TurnoChat } from "../domain/chat"

const LlamadaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  argumentos: z.unknown(),
  ok: z.boolean(),
  resumen: z.string(),
})

const RespuestaSchema = z.object({
  reply: z.string(),
  toolCalls: z.array(LlamadaSchema),
  needsConfirmation: z.boolean(),
})

const HistorialSchema = z.object({
  turnos: z.array(
    z.object({
      usuario: z.string(),
      respuesta: z.string(),
      llamadas: z.array(LlamadaSchema),
      needsConfirmation: z.boolean(),
    }),
  ),
})

const SaludSchema = z.object({ provider: z.string(), model: z.string() })

export class ChatGatewayHttp implements ChatGateway {
  constructor(private readonly urlBase: string = "") {}

  enviar(sessionId: string, mensaje: string): Promise<RespuestaChat> {
    return solicitarJson(`${this.urlBase}/api/chat`, RespuestaSchema, {
      method: "POST",
      body: JSON.stringify({ sessionId, message: mensaje }),
    })
  }

  async historial(sessionId: string): Promise<readonly TurnoChat[]> {
    try {
      const { turnos } = await solicitarJson(`${this.urlBase}/api/sessions/${encodeURIComponent(sessionId)}`, HistorialSchema)
      return turnos
    } catch (error) {
      if (error instanceof ErrorHttp && error.estado === 404) return []
      throw error
    }
  }

  salud(): Promise<EstadoServicio> {
    return solicitarJson(`${this.urlBase}/api/health`, SaludSchema)
  }
}
