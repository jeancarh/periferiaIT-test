import { z } from "zod"
import { normalizarNit, normalizarNombre } from "../shared/texto"

export const ProveedorSchema = z.object({
  codigo_sap: z.string().min(1),
  nit: z.string().min(1),
  nombre: z.string().min(1),
  condiciones_pago_default: z.string().min(1),
  indicador_iva_default: z.string().min(1),
  activo: z.boolean(),
})

export const CentroCostoSchema = z.object({
  centro_costo: z.string().min(1),
  nombre: z.string().min(1),
  subareas: z.array(z.string().min(1)),
  aprobadores: z.array(
    z.object({
      email: z.string().min(1),
      nombre: z.string().min(1),
      tope: z.number().nonnegative(),
    }),
  ),
})

export const IndicadorIvaSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  tasa: z.number().nonnegative(),
})

export const CondicionPagoSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  dias: z.number().int().nonnegative(),
})

export type Proveedor = z.infer<typeof ProveedorSchema>
export type CentroCosto = z.infer<typeof CentroCostoSchema>
export type Aprobador = CentroCosto["aprobadores"][number]
export type IndicadorIva = z.infer<typeof IndicadorIvaSchema>
export type CondicionPago = z.infer<typeof CondicionPagoSchema>

export type DatosMaestros = {
  readonly proveedores: readonly Proveedor[]
  readonly centrosCosto: readonly CentroCosto[]
  readonly indicadoresIva: readonly IndicadorIva[]
  readonly condicionesPago: readonly CondicionPago[]
}

export class Maestros {
  constructor(private readonly datos: DatosMaestros) {}

  buscarProveedor(nit: string | undefined, nombre: string): Proveedor | null {
    if (nit) {
      const objetivo = normalizarNit(nit)
      return this.datos.proveedores.find((proveedor) => normalizarNit(proveedor.nit) === objetivo) ?? null
    }
    const objetivo = normalizarNombre(nombre)
    return this.datos.proveedores.find((proveedor) => normalizarNombre(proveedor.nombre) === objetivo) ?? null
  }

  buscarCentroCosto(codigo: string): CentroCosto | null {
    return this.datos.centrosCosto.find((centro) => centro.centro_costo === codigo) ?? null
  }

  buscarIndicadorIva(codigo: string): IndicadorIva | null {
    return this.datos.indicadoresIva.find((indicador) => indicador.codigo === codigo) ?? null
  }

  buscarCondicionPago(codigo: string): CondicionPago | null {
    return this.datos.condicionesPago.find((condicion) => condicion.codigo === codigo) ?? null
  }
}

export const buscarAprobador = (centro: CentroCosto, email: string): Aprobador | null =>
  centro.aprobadores.find((aprobador) => aprobador.email.toLowerCase() === email.toLowerCase()) ?? null
