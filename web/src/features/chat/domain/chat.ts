export type LlamadaHerramienta = {
  readonly id: string
  readonly nombre: string
  readonly argumentos: unknown
  readonly ok: boolean
  readonly resumen: string
}

export type RespuestaChat = {
  readonly reply: string
  readonly toolCalls: readonly LlamadaHerramienta[]
  readonly needsConfirmation: boolean
}

export type TurnoChat = {
  readonly usuario: string
  readonly respuesta: string
  readonly llamadas: readonly LlamadaHerramienta[]
  readonly needsConfirmation: boolean
}

export type EstadoServicio = {
  readonly provider: string
  readonly model: string
}

export interface ChatGateway {
  enviar(sessionId: string, mensaje: string): Promise<RespuestaChat>
  historial(sessionId: string): Promise<readonly TurnoChat[]>
  salud(): Promise<EstadoServicio>
}
