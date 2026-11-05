import type { MotorControles } from "../../domain/controles/motor-controles"
import type { ResultadoValidacion } from "../../domain/controles/tipos"
import { exito, type Resultado } from "../../shared/resultado"
import { cargarCaso } from "../cargar-caso"
import type { MaestrosRepository, PaqueteRepository } from "../puertos"

export type ValidacionCaso = ResultadoValidacion & {
  readonly solicitud_id: string
  readonly requiere_confirmacion: boolean
}

export const requiereConfirmacion = (validacion: ResultadoValidacion): boolean =>
  validacion.apta && validacion.confirmaciones.length > 0

export class ValidarPaquete {
  constructor(
    private readonly paquetes: PaqueteRepository,
    private readonly maestros: MaestrosRepository,
    private readonly motor: MotorControles,
  ) {}

  async ejecutar(caso: string): Promise<Resultado<ValidacionCaso>> {
    const cargado = await cargarCaso(this.paquetes, this.maestros, caso)
    if (!cargado.ok) return cargado
    const validacion = this.motor.evaluar(cargado.data.paquete, cargado.data.maestros)
    return exito({
      solicitud_id: cargado.data.paquete.solicitud.solicitud_id,
      ...validacion,
      requiere_confirmacion: requiereConfirmacion(validacion),
    })
  }
}
