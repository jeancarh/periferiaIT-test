import { construirOrden } from "../../domain/constructor-orden"
import type { MotorControles } from "../../domain/controles/motor-controles"
import type { Hallazgo } from "../../domain/controles/tipos"
import type { OrdenCompra } from "../../domain/orden-compra"
import { exito, type Resultado } from "../../shared/resultado"
import { cargarCaso } from "../cargar-caso"
import type { ArtefactosCaso, MaestrosRepository, PaqueteRepository } from "../puertos"
import { requiereConfirmacion } from "./validar-paquete"

export type PayloadConstruido = {
  readonly orden: OrdenCompra
  readonly ruta_trazabilidad: string
  readonly confirmaciones: readonly Hallazgo[]
  readonly retroactiva: boolean
  readonly requiere_confirmacion: boolean
}

export class ConstruirPayload {
  constructor(
    private readonly paquetes: PaqueteRepository,
    private readonly maestros: MaestrosRepository,
    private readonly motor: MotorControles,
    private readonly artefactos: ArtefactosCaso,
  ) {}

  async ejecutar(caso: string): Promise<Resultado<PayloadConstruido>> {
    const cargado = await cargarCaso(this.paquetes, this.maestros, caso)
    if (!cargado.ok) return cargado
    const { paquete, maestros } = cargado.data
    const validacion = this.motor.evaluar(paquete, maestros)
    const construida = construirOrden({ paquete, maestros, validacion, confirmadoPor: null })
    if (!construida.ok) return construida
    return exito({
      orden: construida.data.orden,
      ruta_trazabilidad: await this.artefactos.guardarTrazabilidad(caso, construida.data.trazabilidad),
      confirmaciones: validacion.confirmaciones,
      retroactiva: validacion.retroactiva,
      requiere_confirmacion: requiereConfirmacion(validacion),
    })
  }
}
