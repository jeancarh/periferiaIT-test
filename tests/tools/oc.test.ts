import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import * as oc from "../../src/tools/oc"

const ctx = { directory: resolve(import.meta.dirname, "../.."), sessionId: "test" }

describe("herramientas oc", () => {
  it("devuelven un error legible ante argumentos inválidos sin lanzar", async () => {
    const salida = JSON.parse(await oc.validar.execute({ caso: "../../etc" }, ctx))

    expect(salida).toEqual(expect.objectContaining({ ok: false, error: expect.stringContaining("Argumentos inválidos") }))
  })

  it("devuelven ok con datos y resumen", async () => {
    const salida = JSON.parse(await oc.leer_paquete.execute({ caso: "sol-001" }, ctx))

    expect(salida.ok).toBe(true)
    expect(salida.data.solicitud.solicitud_id).toBe("SOL-2026-001")
    expect(salida.resumen).toContain("SOL-2026-001")
  })

  it("exponen description y args con describe en cada campo", () => {
    for (const herramienta of Object.values(oc)) {
      expect(herramienta.description.length).toBeGreaterThan(10)
      for (const esquema of Object.values(herramienta.args)) {
        expect(esquema.description).toBeTruthy()
      }
    }
  })
})
