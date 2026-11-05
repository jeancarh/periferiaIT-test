import { describe, expect, it } from "vitest"
import { estadoInicial, reducirChat } from "./estado-chat"

const llamada = { id: "1", nombre: "oc_validar", argumentos: { caso: "sol-004" }, ok: true, resumen: "apta" }

describe("reducirChat", () => {
  it("agrega el mensaje del usuario y marca que el agente está pensando", () => {
    const estado = reducirChat(estadoInicial, { tipo: "enviado", id: "t1", texto: "procesa sol-004" })

    expect(estado.pensando).toBe(true)
    expect(estado.entradas).toEqual([expect.objectContaining({ autor: "usuario", texto: "procesa sol-004" })])
  })

  it("agrega la respuesta con sus llamadas y el estado de confirmación", () => {
    const enviado = reducirChat(estadoInicial, { tipo: "enviado", id: "t1", texto: "procesa" })
    const estado = reducirChat(enviado, {
      tipo: "respondido",
      id: "t1",
      respuesta: { reply: "¿Confirmas?", toolCalls: [llamada], needsConfirmation: true },
    })

    expect(estado.pensando).toBe(false)
    expect(estado.esperandoConfirmacion).toBe(true)
    expect(estado.entradas.at(-1)).toEqual(expect.objectContaining({ autor: "agente", llamadas: [llamada], pideConfirmacion: true }))
  })

  it("registra un error sin perder la conversación", () => {
    const enviado = reducirChat(estadoInicial, { tipo: "enviado", id: "t1", texto: "hola" })
    const estado = reducirChat(enviado, { tipo: "fallido", id: "t1", error: "Sin conexión" })

    expect(estado.entradas).toHaveLength(2)
    expect(estado.entradas.at(-1)?.autor).toBe("error")
  })

  it("restaura el historial y la confirmación pendiente del último turno", () => {
    const estado = reducirChat(estadoInicial, {
      tipo: "restaurado",
      turnos: [{ usuario: "procesa", respuesta: "¿Confirmas?", llamadas: [llamada], needsConfirmation: true }],
    })

    expect(estado.entradas).toHaveLength(2)
    expect(estado.esperandoConfirmacion).toBe(true)
  })
})
