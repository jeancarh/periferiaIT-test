import type { MensajeChat } from "../llm/adapter"

export type LlamadaVisible = {
  readonly id: string
  readonly nombre: string
  readonly argumentos: unknown
  readonly ok: boolean
  readonly resumen: string
}

export type Turno = {
  readonly usuario: string
  readonly respuesta: string
  readonly llamadas: readonly LlamadaVisible[]
  readonly needsConfirmation: boolean
  readonly ts: string
}

export type Sesion = {
  readonly id: string
  mensajes: MensajeChat[]
  turnos: Turno[]
  tokensUsados: number
  esperandoConfirmacion: boolean
}

export interface SesionRepository {
  obtener(id: string): Promise<Sesion | null>
  guardar(sesion: Sesion): Promise<void>
}

export const nuevaSesion = (id: string): Sesion => ({
  id,
  mensajes: [],
  turnos: [],
  tokensUsados: 0,
  esperandoConfirmacion: false,
})
