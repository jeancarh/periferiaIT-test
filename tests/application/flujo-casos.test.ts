import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { crearModuloOc, type ModuloOc } from "../../src/composition/modulo-oc"

const raizProyecto = resolve(import.meta.dirname, "../..")
const relojFijo = { ahora: () => new Date("2026-09-03T15:00:00.000Z") }

let salida: string
let modulo: ModuloOc

beforeEach(async () => {
  salida = await mkdtemp(join(tmpdir(), "oc-"))
  modulo = crearModuloOc(
    { raizProyecto: salida, raizFixtures: join(raizProyecto, "fixtures", "reto-03"), raizSalida: salida },
    relojFijo,
  )
})

afterEach(async () => {
  await rm(salida, { recursive: true, force: true })
})

const validar = async (caso: string) => {
  const resultado = await modulo.validarPaquete.ejecutar(caso)
  if (!resultado.ok) throw new Error(resultado.error)
  return resultado.data
}

const crear = (caso: string, confirmado = false, confirmacionHumana = false) =>
  modulo.crearOrden.ejecutar({ caso, confirmado, confirmacionHumana })

const codigos = (hallazgos: readonly { codigo: string }[]) => hallazgos.map((hallazgo) => hallazgo.codigo)

describe("casos del reto", () => {
  it("sol-001 crea la OC sin intervención humana", async () => {
    const validacion = await validar("sol-001")
    const creada = await crear("sol-001")

    expect(validacion.apta).toBe(true)
    expect(validacion.confirmaciones).toEqual([])
    expect(creada).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ numero_oc: "4500000001" }) }))
  })

  it("sol-001 es idempotente al crearse dos veces", async () => {
    await crear("sol-001")
    const segunda = await crear("sol-001")

    expect(segunda.ok && segunda.data).toEqual(expect.objectContaining({ numero_oc: "4500000001", idempotente: true }))
    const ordenes = await readFile(join(salida, "sap", "ordenes.jsonl"), "utf8")
    expect(ordenes.trim().split("\n")).toHaveLength(1)
  })

  it("sol-002 se bloquea porque el proveedor no existe", async () => {
    const validacion = await validar("sol-002")
    const creada = await crear("sol-002", true, true)

    expect(codigos(validacion.bloqueos)).toEqual(["RC1"])
    expect(creada.ok).toBe(false)
  })

  it("sol-003 se bloquea porque el aprobador no tiene autoridad en el centro", async () => {
    const validacion = await validar("sol-003")

    expect(validacion.apta).toBe(false)
    expect(codigos(validacion.bloqueos)).toContain("RC2")
  })

  it("sol-004 pide confirmación por diferencia entre cotización y solicitud", async () => {
    const validacion = await validar("sol-004")
    const sinConfirmar = await crear("sol-004")
    const confirmada = await crear("sol-004", true, true)

    expect(codigos(validacion.confirmaciones)).toEqual(["RC5"])
    expect(sinConfirmar).toEqual({ ok: false, error: expect.stringContaining("requiere confirmación"), requiere_confirmacion: true })
    expect(confirmada.ok).toBe(true)
  })

  it("sol-004 no se crea si la confirmación no viene del usuario", async () => {
    const resultado = await crear("sol-004", true, false)

    expect(resultado.ok).toBe(false)
  })

  it("sol-005 queda marcada como retroactiva y se crea solo con confirmación", async () => {
    const validacion = await validar("sol-005")
    const creada = await crear("sol-005", true, true)

    expect(validacion.retroactiva).toBe(true)
    expect(codigos(validacion.confirmaciones)).toEqual(["RC8"])
    expect(creada.ok && creada.data.retroactiva).toBe(true)
    const control = await readFile(join(salida, "control.csv"), "utf8")
    expect(control).toContain("SOL-2026-005,creada,4500000001,true")
  })

  it("sol-006 deriva IVA y condiciones de pago y pide confirmación del IVA", async () => {
    const validacion = await validar("sol-006")

    expect(codigos(validacion.confirmaciones)).toEqual(["RC6"])
    expect(validacion.derivados.indicador_iva?.valor).toBe("C1")
    expect(validacion.derivados.condiciones_pago?.valor).toBe("Z030")
  })

  it("rechaza un payload alterado frente al validado", async () => {
    const construido = await modulo.construirPayload.ejecutar("sol-001")
    if (!construido.ok) throw new Error(construido.error)
    const alterado = {
      ...construido.data.orden,
      posiciones: construido.data.orden.posiciones.map((posicion) => ({ ...posicion, precio_unitario: 1 })),
    }

    const resultado = await modulo.crearOrden.ejecutar({ caso: "sol-001", confirmado: false, confirmacionHumana: false, payload: alterado })

    expect(resultado.ok).toBe(false)
  })

  it("acepta el payload sin alterar devuelto por construir payload", async () => {
    const construido = await modulo.construirPayload.ejecutar("sol-001")
    if (!construido.ok) throw new Error(construido.error)

    const resultado = await modulo.crearOrden.ejecutar({
      caso: "sol-001",
      confirmado: false,
      confirmacionHumana: false,
      payload: construido.data.orden,
    })

    expect(resultado.ok).toBe(true)
  })

  it("genera la evidencia de aprobación en txt y pdf con su sha256", async () => {
    const evidencia = await modulo.generarEvidencia.ejecutar("sol-001")

    expect(evidencia.ok).toBe(true)
    if (!evidencia.ok) return
    const texto = await readFile(join(salida, evidencia.data.ruta), "utf8")
    expect(texto).toContain(`SHA-256: ${evidencia.data.sha256}`)
    expect(evidencia.data.ruta_pdf).toBe(join("sol-001", "aprobacion.pdf"))
  })

  it("informa un caso inexistente sin lanzar", async () => {
    const resultado = await modulo.validarPaquete.ejecutar("sol-999")

    expect(resultado).toEqual({ ok: false, error: expect.stringContaining("no existe") })
  })
})
