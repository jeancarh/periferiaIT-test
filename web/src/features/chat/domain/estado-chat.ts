import type { LlamadaHerramienta, RespuestaChat, TurnoChat } from "./chat"

export type AutorEntrada = "usuario" | "agente" | "error"

export type EntradaChat = {
  readonly id: string
  readonly autor: AutorEntrada
  readonly texto: string
  readonly llamadas: readonly LlamadaHerramienta[]
  readonly pideConfirmacion: boolean
}

export type EstadoChat = {
  readonly entradas: readonly EntradaChat[]
  readonly pensando: boolean
  readonly esperandoConfirmacion: boolean
}

export type AccionChat =
  | { readonly tipo: "enviado"; readonly id: string; readonly texto: string }
  | { readonly tipo: "respondido"; readonly id: string; readonly respuesta: RespuestaChat }
  | { readonly tipo: "fallido"; readonly id: string; readonly error: string }
  | { readonly tipo: "restaurado"; readonly turnos: readonly TurnoChat[] }
  | { readonly tipo: "reiniciado" }

export const estadoInicial: EstadoChat = { entradas: [], pensando: false, esperandoConfirmacion: false }

const entradaUsuario = (id: string, texto: string): EntradaChat => ({
  id,
  autor: "usuario",
  texto,
  llamadas: [],
  pideConfirmacion: false,
})

const entradaAgente = (id: string, texto: string, llamadas: readonly LlamadaHerramienta[], pideConfirmacion: boolean): EntradaChat => ({
  id,
  autor: "agente",
  texto,
  llamadas,
  pideConfirmacion,
})

export const reducirChat = (estado: EstadoChat, accion: AccionChat): EstadoChat => {
  switch (accion.tipo) {
    case "enviado":
      return { ...estado, pensando: true, entradas: [...estado.entradas, entradaUsuario(`${accion.id}-u`, accion.texto)] }
    case "respondido": {
      const { reply, toolCalls, needsConfirmation } = accion.respuesta
      return {
        pensando: false,
        esperandoConfirmacion: needsConfirmation,
        entradas: [...estado.entradas, entradaAgente(`${accion.id}-a`, reply, toolCalls, needsConfirmation)],
      }
    }
    case "fallido":
      return {
        ...estado,
        pensando: false,
        entradas: [...estado.entradas, { id: `${accion.id}-e`, autor: "error", texto: accion.error, llamadas: [], pideConfirmacion: false }],
      }
    case "restaurado":
      return {
        pensando: false,
        esperandoConfirmacion: accion.turnos.at(-1)?.needsConfirmation ?? false,
        entradas: accion.turnos.flatMap((turno, indice) => [
          entradaUsuario(`h${indice}-u`, turno.usuario),
          entradaAgente(`h${indice}-a`, turno.respuesta, turno.llamadas, turno.needsConfirmation),
        ]),
      }
    case "reiniciado":
      return estadoInicial
  }
}
