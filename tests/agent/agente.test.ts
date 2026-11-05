import { describe, expect, it } from "vitest"
import { z } from "zod"
import { Agente, type LimitesAgente } from "../../src/agent/agente"
import { CatalogoHerramientas, type HerramientaAgente } from "../../src/agent/catalogo-herramientas"
import { PresupuestoDiario } from "../../src/agent/presupuesto-diario"
import { SesionesEnMemoria } from "../../src/infrastructure/memoria/sesiones-en-memoria"
import { ErrorProveedorLlm, type LlmAdapter, type MensajeChat, type RespuestaLlm } from "../../src/llm/adapter"
import type { ContextoHerramienta } from "../../src/tools/definir-herramienta"

class LlmGuionado implements LlmAdapter {
  readonly proveedor = "guion"
  readonly modelo = "guion-1"
  readonly recibidos: MensajeChat[][] = []

  constructor(private readonly guion: Array<RespuestaLlm | Error>) {}

  async enviar(mensajes: readonly MensajeChat[]): Promise<RespuestaLlm> {
    this.recibidos.push([...mensajes])
    const siguiente = this.guion.shift() ?? { contenido: "fin", llamadas: [], tokens: 1 }
    if (siguiente instanceof Error) throw siguiente
    return siguiente
  }
}

const llamada = (nombre: string, argumentos: object = {}): RespuestaLlm => ({
  contenido: null,
  llamadas: [{ id: `id-${nombre}`, nombre, argumentos: JSON.stringify(argumentos) }],
  tokens: 10,
})

const texto = (contenido: string): RespuestaLlm => ({ contenido, llamadas: [], tokens: 5 })

const contextos: ContextoHerramienta[] = []

const herramienta = (salida: object): HerramientaAgente => ({
  description: "herramienta de prueba",
  args: { caso: z.string().optional().describe("caso") },
  async execute(_args, ctx) {
    contextos.push(ctx)
    return JSON.stringify(salida)
  },
})

const catalogo = new CatalogoHerramientas({
  oc: {
    validar: herramienta({ ok: true, resumen: "apta con confirmaciones", data: { requiere_confirmacion: true } }),
    crear: herramienta({ ok: true, resumen: "OC creada", data: { requiere_confirmacion: false } }),
  },
})

const limites: LimitesAgente = { maxIteraciones: 25, maxTokensSesion: 1_000 }

const presupuestoAmplio = () => new PresupuestoDiario({ maxPeticiones: 1_000, maxTokens: 1_000_000 })

const crearAgente = (llm: LlmAdapter, limitesAgente: LimitesAgente = limites, presupuesto = presupuestoAmplio()) =>
  new Agente({ llm, herramientas: catalogo, sesiones: new SesionesEnMemoria(10), presupuesto, promptSistema: "prompt", directorio: "/tmp", limites: limitesAgente })

describe("Agente", () => {
  it("ejecuta herramientas, expone las llamadas y marca la confirmación pendiente", async () => {
    const agente = crearAgente(new LlmGuionado([llamada("oc_validar", { caso: "sol-004" }), texto("¿Confirmas?")]))

    const respuesta = await agente.responder("s1", "procesa sol-004")

    expect(respuesta.reply).toBe("¿Confirmas?")
    expect(respuesta.toolCalls).toEqual([expect.objectContaining({ nombre: "oc_validar", ok: true, resumen: "apta con confirmaciones" })])
    expect(respuesta.needsConfirmation).toBe(true)
  })

  it("solo habilita la confirmación humana en el turno siguiente a la pregunta", async () => {
    contextos.length = 0
    const agente = crearAgente(
      new LlmGuionado([llamada("oc_validar"), texto("¿Confirmas?"), llamada("oc_crear"), texto("Creada")]),
    )

    await agente.responder("s2", "procesa")
    const segunda = await agente.responder("s2", "confirmo")

    expect(contextos.map((ctx) => ctx.confirmacionHumana)).toEqual([false, true])
    expect(segunda.needsConfirmation).toBe(false)
  })

  it("envía el system prompt y el historial al modelo", async () => {
    const llm = new LlmGuionado([texto("hola")])

    await crearAgente(llm).responder("s3", "hola")

    expect(llm.recibidos[0]?.[0]).toEqual({ rol: "system", contenido: "prompt" })
    expect(llm.recibidos[0]?.[1]).toEqual({ rol: "user", contenido: "hola" })
  })

  it("corta el turno al llegar al tope de iteraciones", async () => {
    const llm = new LlmGuionado(Array.from({ length: 5 }, () => llamada("oc_validar")))

    const respuesta = await crearAgente(llm, { ...limites, maxIteraciones: 2 }).responder("s4", "procesa")

    expect(respuesta.reply).toContain("tope de 2 pasos")
    expect(respuesta.toolCalls).toHaveLength(2)
  })

  it("informa en lenguaje claro un error del proveedor y mantiene la sesión", async () => {
    const agente = crearAgente(new LlmGuionado([new ErrorProveedorLlm("El modelo no respondió en 30 segundos."), texto("de nuevo")]))

    const conError = await agente.responder("s5", "hola")
    const siguiente = await agente.responder("s5", "reintenta")

    expect(conError.reply).toContain("El modelo no respondió en 30 segundos.")
    expect(siguiente.reply).toBe("de nuevo")
    expect(await agente.historial("s5")).toHaveLength(2)
  })

  it("devuelve el error de una herramienta inexistente al modelo sin romper el turno", async () => {
    const respuesta = await crearAgente(new LlmGuionado([llamada("oc_inexistente"), texto("listo")])).responder("s6", "x")

    expect(respuesta.toolCalls[0]).toEqual(expect.objectContaining({ ok: false }))
    expect(respuesta.reply).toBe("listo")
  })

  it("detiene la sesión al agotar el presupuesto de tokens", async () => {
    const agente = crearAgente(new LlmGuionado([{ ...texto("uno"), tokens: 50 }]), { ...limites, maxTokensSesion: 40 })

    await agente.responder("s7", "uno")
    const bloqueada = await agente.responder("s7", "dos")

    expect(bloqueada.reply).toContain("presupuesto de tokens")
  })

  it("deja de consultar al modelo al agotar el cupo diario de peticiones", async () => {
    const llm = new LlmGuionado([texto("uno"), texto("dos")])
    const agente = crearAgente(llm, limites, new PresupuestoDiario({ maxPeticiones: 1, maxTokens: 1_000_000 }))

    await agente.responder("s8", "uno")
    const bloqueada = await agente.responder("s9", "dos")

    expect(bloqueada.reply).toContain("cupo diario")
    expect(llm.recibidos).toHaveLength(1)
  })

  it("publica las herramientas con el prefijo del módulo y esquema JSON", () => {
    expect(catalogo.definiciones().map((definicion) => definicion.nombre)).toEqual(["oc_validar", "oc_crear"])
    expect(catalogo.definiciones()[0]?.parametros).toEqual(expect.objectContaining({ type: "object" }))
  })
})
