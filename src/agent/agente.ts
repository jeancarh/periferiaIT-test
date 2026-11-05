import { ErrorProveedorLlm, type LlmAdapter, type MensajeChat, type RespuestaLlm } from "../llm/adapter"
import type { CatalogoHerramientas, EjecucionHerramienta } from "./catalogo-herramientas"
import type { PresupuestoDiario } from "./presupuesto-diario"
import { nuevaSesion, type LlamadaVisible, type Sesion, type SesionRepository, type Turno } from "./sesion"

export type LimitesAgente = {
  readonly maxIteraciones: number
  readonly maxTokensSesion: number
}

export type DependenciasAgente = {
  readonly llm: LlmAdapter
  readonly herramientas: CatalogoHerramientas
  readonly sesiones: SesionRepository
  readonly presupuesto: PresupuestoDiario
  readonly promptSistema: string
  readonly directorio: string
  readonly limites: LimitesAgente
  readonly ahora?: () => Date
}

export type RespuestaTurno = {
  readonly reply: string
  readonly toolCalls: readonly LlamadaVisible[]
  readonly needsConfirmation: boolean
}

type EstadoTurno = {
  readonly sesion: Sesion
  readonly llamadas: LlamadaVisible[]
  needsConfirmation: boolean
}

const RESPUESTA_VACIA = "El modelo no devolvió texto. Revisa arriba el resultado de las herramientas ejecutadas."

const aVisible = ({ id, nombre, argumentos, ok, resumen }: EjecucionHerramienta): LlamadaVisible => ({
  id,
  nombre,
  argumentos,
  ok,
  resumen,
})

export class Agente {
  private readonly colas = new Map<string, Promise<unknown>>()

  constructor(private readonly deps: DependenciasAgente) {}

  responder(sessionId: string, mensaje: string): Promise<RespuestaTurno> {
    const anterior = this.colas.get(sessionId) ?? Promise.resolve()
    const turno = anterior.then(() => this.procesarTurno(sessionId, mensaje))
    this.colas.set(sessionId, turno.catch(() => undefined))
    return turno
  }

  async historial(sessionId: string): Promise<readonly Turno[] | null> {
    return (await this.deps.sesiones.obtener(sessionId))?.turnos ?? null
  }

  private async procesarTurno(sessionId: string, mensaje: string): Promise<RespuestaTurno> {
    const sesion = (await this.deps.sesiones.obtener(sessionId)) ?? nuevaSesion(sessionId)
    const estado: EstadoTurno = { sesion, llamadas: [], needsConfirmation: false }
    const limite = this.limiteDeConsumoAlcanzado(sesion)
    if (limite) return this.cerrar(estado, mensaje, limite)

    const confirmacionHumana = sesion.esperandoConfirmacion
    sesion.mensajes.push({ rol: "user", contenido: mensaje })

    for (let iteracion = 0; iteracion < this.deps.limites.maxIteraciones; iteracion++) {
      const respuesta = await this.consultarModelo(sesion)
      if (typeof respuesta === "string") return this.cerrar(estado, mensaje, respuesta, true)
      sesion.mensajes.push({ rol: "assistant", contenido: respuesta.contenido, llamadas: respuesta.llamadas })
      if (respuesta.llamadas.length === 0) return this.cerrar(estado, mensaje, respuesta.contenido || RESPUESTA_VACIA)
      await this.ejecutarLlamadas(estado, respuesta, confirmacionHumana)
      const limiteTurno = this.limiteDeConsumoAlcanzado(sesion)
      if (limiteTurno) return this.cerrar(estado, mensaje, limiteTurno, true)
    }

    const ejecutadas = estado.llamadas.map((llamada) => llamada.nombre).join(", ")
    return this.cerrar(
      estado,
      mensaje,
      `Alcancé el tope de ${this.deps.limites.maxIteraciones} pasos en este turno. Herramientas ejecutadas: ${ejecutadas}. Escríbeme "continúa" para seguir con lo que falta.`,
      true,
    )
  }

  private async consultarModelo(sesion: Sesion): Promise<RespuestaLlm | string> {
    try {
      const respuesta = await this.deps.llm.enviar(
        [{ rol: "system", contenido: this.deps.promptSistema }, ...sesion.mensajes],
        this.deps.herramientas.definiciones(),
      )
      sesion.tokensUsados += respuesta.tokens
      this.deps.presupuesto.registrar(respuesta.tokens)
      return respuesta
    } catch (error) {
      const detalle = error instanceof ErrorProveedorLlm ? error.mensajeUsuario : "Ocurrió un error inesperado al consultar el modelo."
      return `No pude completar la respuesta: ${detalle} La conversación sigue activa; puedes reintentar.`
    }
  }

  private async ejecutarLlamadas(estado: EstadoTurno, respuesta: RespuestaLlm, confirmacionHumana: boolean): Promise<void> {
    for (const llamada of respuesta.llamadas) {
      const ejecucion = await this.deps.herramientas.ejecutar(llamada, {
        directory: this.deps.directorio,
        sessionId: estado.sesion.id,
        confirmacionHumana,
      })
      estado.llamadas.push(aVisible(ejecucion))
      if (ejecucion.requiereConfirmacion !== null) estado.needsConfirmation = ejecucion.requiereConfirmacion
      estado.sesion.mensajes.push({ rol: "tool", idLlamada: llamada.id, nombre: llamada.nombre, contenido: ejecucion.salida })
    }
  }

  private limiteDeConsumoAlcanzado(sesion: Sesion): string | null {
    if (sesion.tokensUsados >= this.deps.limites.maxTokensSesion) {
      return "Esta sesión alcanzó su presupuesto de tokens. Abre una sesión nueva para continuar."
    }
    return this.deps.presupuesto.motivoDeBloqueo()
  }

  private async cerrar(estado: EstadoTurno, mensaje: string, respuesta: string, registrarEnModelo = false): Promise<RespuestaTurno> {
    const { sesion } = estado
    if (registrarEnModelo) sesion.mensajes.push({ rol: "assistant", contenido: respuesta, llamadas: [] } satisfies MensajeChat)
    sesion.esperandoConfirmacion = estado.needsConfirmation
    sesion.turnos.push({
      usuario: mensaje,
      respuesta,
      llamadas: estado.llamadas,
      needsConfirmation: estado.needsConfirmation,
      ts: (this.deps.ahora ?? (() => new Date()))().toISOString(),
    })
    await this.deps.sesiones.guardar(sesion)
    return { reply: respuesta, toolCalls: estado.llamadas, needsConfirmation: estado.needsConfirmation }
  }
}
