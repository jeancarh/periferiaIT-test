import { describe, expect, it } from "vitest"
import { crearMotorControles } from "../../src/domain/controles/motor-controles"
import { aprobacionDePrueba, maestrosDePrueba, paqueteDePrueba, solicitudDePrueba } from "../support/constructores"

const motor = crearMotorControles()
const evaluar = (cambios: Parameters<typeof paqueteDePrueba>[0] = {}) =>
  motor.evaluar(paqueteDePrueba(cambios), maestrosDePrueba())
const codigos = (hallazgos: readonly { codigo: string }[]) => hallazgos.map((hallazgo) => hallazgo.codigo)

describe("MotorControles", () => {
  it("aprueba un paquete limpio sin bloqueos ni confirmaciones", () => {
    const resultado = evaluar()

    expect(resultado.apta).toBe(true)
    expect(resultado.bloqueos).toEqual([])
    expect(resultado.confirmaciones).toEqual([])
    expect(resultado.retroactiva).toBe(false)
  })

  it("RC1 bloquea un proveedor inexistente", () => {
    const resultado = evaluar({ solicitud: solicitudDePrueba({ proveedor_nit: "999999999" }) })

    expect(resultado.apta).toBe(false)
    expect(codigos(resultado.bloqueos)).toContain("RC1")
  })

  it("RC1 bloquea un proveedor inactivo", () => {
    const resultado = evaluar({ solicitud: solicitudDePrueba({ proveedor_nit: "901777888" }) })

    expect(codigos(resultado.bloqueos)).toContain("RC1")
  })

  it("RC1 resuelve el proveedor por nombre normalizado cuando no hay NIT", () => {
    const resultado = evaluar({
      solicitud: solicitudDePrueba({ proveedor_nit: undefined, proveedor_nombre: "tecnosuministros sas" }),
    })

    expect(codigos(resultado.bloqueos)).not.toContain("RC1")
  })

  it("RC2 bloquea cuando no hay aprobación", () => {
    expect(codigos(evaluar({ aprobacion: null }).bloqueos)).toContain("RC2")
  })

  it("RC2 bloquea cuando el correo no dice Aprobado", () => {
    expect(codigos(evaluar({ aprobacion: aprobacionDePrueba({ aprobado: false }) }).bloqueos)).toContain("RC2")
  })

  it("RC2 bloquea cuando quien aprueba no es aprobador del centro", () => {
    const resultado = evaluar({ aprobacion: aprobacionDePrueba({ de: "otra@empresa.test" }) })

    expect(codigos(resultado.bloqueos)).toContain("RC2")
  })

  it("RC3 bloquea cuando el valor supera el tope del aprobador", () => {
    const resultado = evaluar({
      solicitud: solicitudDePrueba({ cantidad: 1, valor_unitario: 60_000_000, valor_total: 60_000_000 }),
      cotizacion: null,
    })

    expect(codigos(resultado.bloqueos)).toContain("RC3")
  })

  it("RC4 bloquea una subárea que no pertenece al centro de costo", () => {
    expect(codigos(evaluar({ solicitud: solicitudDePrueba({ subarea: "Marketing" }) }).bloqueos)).toContain("RC4")
  })

  it("RC5 pide confirmación cuando la cotización difiere más de 2 %", () => {
    const paquete = paqueteDePrueba()
    const resultado = evaluar({ cotizacion: paquete.cotizacion && { ...paquete.cotizacion, total: 1_030_000 } })

    expect(resultado.apta).toBe(true)
    expect(codigos(resultado.confirmaciones)).toEqual(["RC5"])
  })

  it("RC5 tolera una diferencia de hasta 2 %", () => {
    const paquete = paqueteDePrueba()
    const resultado = evaluar({ cotizacion: paquete.cotizacion && { ...paquete.cotizacion, total: 1_020_000 } })

    expect(resultado.confirmaciones).toEqual([])
  })

  it("RC5 pide confirmación cuando no hay cotización", () => {
    expect(codigos(evaluar({ cotizacion: null }).confirmaciones)).toEqual(["RC5"])
  })

  it("RC6 deriva el indicador de IVA del proveedor y pide confirmación", () => {
    const resultado = evaluar({ solicitud: solicitudDePrueba({ indicador_iva: undefined }) })

    expect(codigos(resultado.confirmaciones)).toEqual(["RC6"])
    expect(resultado.derivados.indicador_iva?.valor).toBe("C1")
  })

  it("RC7 deriva las condiciones de pago del proveedor sin pedir confirmación", () => {
    const resultado = evaluar({ solicitud: solicitudDePrueba({ condiciones_pago: undefined }) })

    expect(resultado.confirmaciones).toEqual([])
    expect(resultado.derivados.condiciones_pago?.valor).toBe("Z030")
  })

  it("RC8 marca como retroactiva una factura anterior a la solicitud", () => {
    const resultado = evaluar({ factura: { numero: "FC-1", fecha: "2026-08-10", total: 1_000_000 } })

    expect(resultado.retroactiva).toBe(true)
    expect(codigos(resultado.confirmaciones)).toEqual(["RC8"])
  })

  it("RC9 pide confirmación cuando la aprobación es anterior a la solicitud", () => {
    const resultado = evaluar({ aprobacion: aprobacionDePrueba({ fecha: "2026-08-19T10:00:00-05:00" }) })

    expect(codigos(resultado.confirmaciones)).toEqual(["RC9"])
  })

  it("RC10 bloquea cuando cantidad por valor unitario no cuadra con el total", () => {
    const resultado = evaluar({ solicitud: solicitudDePrueba({ valor_total: 1_000_002 }) })

    expect(codigos(resultado.bloqueos)).toContain("RC10")
  })

  it("RC10 tolera una diferencia de una unidad monetaria", () => {
    const resultado = evaluar({ solicitud: solicitudDePrueba({ valor_total: 1_000_001 }) })

    expect(codigos(resultado.bloqueos)).not.toContain("RC10")
  })
})
