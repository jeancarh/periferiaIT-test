import { construirOrden } from "../../domain/constructor-orden"
import type { MotorControles } from "../../domain/controles/motor-controles"
import type { Hallazgo, ResultadoValidacion } from "../../domain/controles/tipos"
import { OrdenCompraSchema, type OrdenCompra } from "../../domain/orden-compra"
import type { SapAdapter } from "../../sap/adapter"
import { serializarEstable } from "../../shared/json-estable"
import { exito, fallo, type Resultado } from "../../shared/resultado"
import { cargarCaso } from "../cargar-caso"
import type { MaestrosRepository, PaqueteRepository, RegistroControl, Reloj, ResultadoIntento } from "../puertos"

export const CONFIRMADOR = "analista"

export type SolicitudCreacion = {
  readonly caso: string
  readonly confirmado: boolean
  readonly confirmacionHumana: boolean
  readonly payload?: unknown
}

export type OrdenCreada = {
  readonly numero_oc: string
  readonly fecha: string | null
  readonly idempotente: boolean
  readonly retroactiva: boolean
  readonly requiere_confirmacion: false
}

const describir = (hallazgos: readonly Hallazgo[]): string =>
  hallazgos.map((hallazgo) => `${hallazgo.codigo}: ${hallazgo.detalle}`).join(" | ")

const huellaComparable = (orden: OrdenCompra): string =>
  serializarEstable({
    ...orden,
    excepciones: orden.excepciones.map(({ codigo, detalle }) => ({ codigo, detalle })),
  })

const coincideConValidada = (recibido: unknown, validada: OrdenCompra): boolean => {
  const orden = OrdenCompraSchema.safeParse(recibido)
  return orden.success && huellaComparable(orden.data) === huellaComparable(validada)
}

export class CrearOrden {
  constructor(
    private readonly paquetes: PaqueteRepository,
    private readonly maestros: MaestrosRepository,
    private readonly motor: MotorControles,
    private readonly sap: SapAdapter,
    private readonly control: RegistroControl,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(solicitud: SolicitudCreacion): Promise<Resultado<OrdenCreada>> {
    const cargado = await cargarCaso(this.paquetes, this.maestros, solicitud.caso)
    if (!cargado.ok) return cargado
    const { paquete, maestros } = cargado.data
    const solicitudId = paquete.solicitud.solicitud_id
    const validacion = this.motor.evaluar(paquete, maestros)
    const registrar = (resultado: ResultadoIntento, numeroOc: string | null) =>
      this.registrarIntento(solicitudId, validacion, resultado, numeroOc)

    const existente = await this.sap.buscarOrdenPorReferencia(solicitudId)
    if (existente) {
      await registrar("idempotente", existente.numero_oc)
      return exito(this.creada(existente.numero_oc, existente.fecha ?? null, true, validacion))
    }

    if (!validacion.apta) {
      await registrar("bloqueada", null)
      return fallo(`No se crea la OC por bloqueos de control. ${describir(validacion.bloqueos)}`, false)
    }

    const requiereConfirmacion = validacion.confirmaciones.length > 0
    if (requiereConfirmacion && !(solicitud.confirmado && solicitud.confirmacionHumana)) {
      await registrar("pendiente_confirmacion", null)
      const motivo = solicitud.confirmado
        ? "la confirmación debe venir del usuario en respuesta a la pregunta del turno anterior."
        : describir(validacion.confirmaciones)
      return fallo(`requiere confirmación explícita: ${motivo}`, true)
    }

    const construida = construirOrden({
      paquete,
      maestros,
      validacion,
      confirmadoPor: requiereConfirmacion ? CONFIRMADOR : null,
    })
    if (!construida.ok) {
      await registrar("bloqueada", null)
      return construida
    }
    const { orden } = construida.data
    if (solicitud.payload !== undefined && !coincideConValidada(solicitud.payload, orden)) {
      return fallo(
        "El payload recibido no coincide con el validado por el servidor. Omite el payload o envía exactamente el de oc_construir_payload.",
        false,
      )
    }

    const proveedorSap = await this.sap.consultarProveedor(orden.proveedor.nit)
    if (!proveedorSap?.activo) {
      await registrar("bloqueada", null)
      return fallo(`SAP no reporta activo al proveedor ${orden.proveedor.nombre}.`, false)
    }

    const creada = await this.sap.crearOrden(orden)
    await registrar("creada", creada.numero_oc)
    return exito(this.creada(creada.numero_oc, creada.fecha, false, validacion))
  }

  private creada(numeroOc: string, fecha: string | null, idempotente: boolean, validacion: ResultadoValidacion): OrdenCreada {
    return { numero_oc: numeroOc, fecha, idempotente, retroactiva: validacion.retroactiva, requiere_confirmacion: false }
  }

  private registrarIntento(
    solicitudId: string,
    validacion: ResultadoValidacion,
    resultado: ResultadoIntento,
    numeroOc: string | null,
  ): Promise<void> {
    return this.control.registrar({
      solicitud_id: solicitudId,
      resultado,
      numero_oc: numeroOc,
      retroactiva: validacion.retroactiva,
      bloqueos: validacion.bloqueos.map((hallazgo) => hallazgo.codigo),
      confirmaciones: validacion.confirmaciones.map((hallazgo) => hallazgo.codigo),
      ts: this.reloj.ahora().toISOString(),
    })
  }
}
