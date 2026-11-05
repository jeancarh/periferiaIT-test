import { join } from "node:path"
import { z, type ZodType } from "zod"
import type { MaestrosRepository } from "../../application/puertos"
import {
  CentroCostoSchema,
  CondicionPagoSchema,
  IndicadorIvaSchema,
  Maestros,
  ProveedorSchema,
} from "../../domain/maestros"
import { exito, fallo, type Resultado } from "../../shared/resultado"
import { leerJson } from "../fs/archivos"

export class FsMaestrosRepository implements MaestrosRepository {
  constructor(private readonly raizMaestros: string) {}

  async obtener(): Promise<Resultado<Maestros>> {
    const proveedores = await this.leer("proveedores.json", ProveedorSchema)
    const centrosCosto = await this.leer("centros-costo.json", CentroCostoSchema)
    const indicadoresIva = await this.leer("indicadores-iva.json", IndicadorIvaSchema)
    const condicionesPago = await this.leer("condiciones-pago.json", CondicionPagoSchema)
    if (!proveedores.ok) return proveedores
    if (!centrosCosto.ok) return centrosCosto
    if (!indicadoresIva.ok) return indicadoresIva
    if (!condicionesPago.ok) return condicionesPago
    return exito(
      new Maestros({
        proveedores: proveedores.data,
        centrosCosto: centrosCosto.data,
        indicadoresIva: indicadoresIva.data,
        condicionesPago: condicionesPago.data,
      }),
    )
  }

  private async leer<T>(archivo: string, esquema: ZodType<T>): Promise<Resultado<T[]>> {
    const resultado = await leerJson(join(this.raizMaestros, archivo), z.array(esquema), archivo)
    return resultado ?? fallo(`Falta el maestro ${archivo}.`)
  }
}
