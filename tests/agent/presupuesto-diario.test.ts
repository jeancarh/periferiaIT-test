import { describe, expect, it } from "vitest"
import { PresupuestoDiario } from "../../src/agent/presupuesto-diario"

describe("PresupuestoDiario", () => {
  it("bloquea al llegar al cupo de peticiones y se renueva al cambiar el día", () => {
    let ahora = new Date("2026-11-05T10:00:00Z")
    const presupuesto = new PresupuestoDiario({ maxPeticiones: 2, maxTokens: 1_000 }, () => ahora)

    presupuesto.registrar(10)
    presupuesto.registrar(10)
    const bloqueado = presupuesto.motivoDeBloqueo()
    ahora = new Date("2026-11-06T00:00:01Z")

    expect(bloqueado).toContain("cupo diario")
    expect(presupuesto.motivoDeBloqueo()).toBeNull()
  })

  it("bloquea al llegar al cupo de tokens", () => {
    const presupuesto = new PresupuestoDiario({ maxPeticiones: 100, maxTokens: 50 })

    presupuesto.registrar(60)

    expect(presupuesto.motivoDeBloqueo()).not.toBeNull()
  })
})
