import { describe, expect, it } from "vitest"
import { construirOrden } from "../../src/domain/constructor-orden"
import { crearMotorControles } from "../../src/domain/controles/motor-controles"
import type { Paquete } from "../../src/domain/paquete"
import { maestrosDePrueba, paqueteDePrueba, solicitudDePrueba } from "../support/constructores"

const construir = (paquete: Paquete, confirmadoPor: string | null = null) => {
  const maestros = maestrosDePrueba()
  const validacion = crearMotorControles().evaluar(paquete, maestros)
  return construirOrden({ paquete, maestros, validacion, confirmadoPor })
}

describe("construirOrden", () => {
  it("construye una orden válida con proveedor del maestro y valores de la solicitud", () => {
    const resultado = construir(paqueteDePrueba())

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.data.orden.proveedor.codigo_sap).toBe("100234")
    expect(resultado.data.orden.posiciones[0]?.precio_unitario).toBe(100_000)
    expect(resultado.data.orden.aprobador.evidencia_sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(resultado.data.trazabilidad["proveedor.codigo_sap"]).toBe("maestro.proveedores")
  })

  it("recorta la descripción al límite de texto breve de SAP", () => {
    const resultado = construir(paqueteDePrueba({ solicitud: solicitudDePrueba({ descripcion: "x".repeat(80) }) }))

    expect(resultado.ok && resultado.data.orden.posiciones[0]?.descripcion.length).toBe(40)
  })

  it("usa el indicador de IVA derivado y lo traza como derivado", () => {
    const resultado = construir(paqueteDePrueba({ solicitud: solicitudDePrueba({ indicador_iva: undefined }) }))

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.data.orden.posiciones[0]?.indicador_iva).toBe("C1")
    expect(resultado.data.trazabilidad["posiciones[0].indicador_iva"]).toBe("derivado")
    expect(resultado.data.orden.excepciones).toEqual([expect.objectContaining({ codigo: "RC6", confirmado_por: null })])
  })

  it("registra quién confirmó las excepciones", () => {
    const resultado = construir(paqueteDePrueba({ cotizacion: null }), "analista")

    expect(resultado.ok && resultado.data.orden.excepciones[0]?.confirmado_por).toBe("analista")
  })

  it("infiere la unidad H cuando la compra es por horas", () => {
    const resultado = construir(paqueteDePrueba({ solicitud: solicitudDePrueba({ descripcion: "Bolsa de 100 horas" }) }))

    expect(resultado.ok && resultado.data.orden.posiciones[0]?.unidad).toBe("H")
  })

  it("rechaza construir una orden con bloqueos", () => {
    const resultado = construir(paqueteDePrueba({ aprobacion: null }))

    expect(resultado.ok).toBe(false)
  })

  it("rechaza una moneda que SAP no admite", () => {
    const resultado = construir(paqueteDePrueba({ solicitud: solicitudDePrueba({ moneda: "EUR" }) }))

    expect(resultado.ok).toBe(false)
  })
})
