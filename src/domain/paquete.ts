import { z } from "zod"
import { esFechaValida } from "../shared/fechas"

const fechaIso = z.string().refine(esFechaValida, "debe ser una fecha YYYY-MM-DD válida")

export const SolicitudSchema = z.object({
  solicitud_id: z.string().min(1),
  solicitante: z.string().min(1),
  proveedor_nombre: z.string().min(1),
  proveedor_nit: z.string().min(1).optional(),
  descripcion: z.string().min(1),
  centro_costo: z.string().min(1),
  subarea: z.string().min(1),
  cantidad: z.number().positive(),
  valor_unitario: z.number().nonnegative(),
  valor_total: z.number().positive(),
  moneda: z.string().min(3),
  indicador_iva: z.string().min(1).optional(),
  condiciones_pago: z.string().min(1).optional(),
  fecha_solicitud: fechaIso,
})

export type Solicitud = z.infer<typeof SolicitudSchema>

export type Correo = {
  readonly id: string
  readonly de: string
  readonly asunto: string
  readonly fecha: string
}

export type Cotizacion = {
  readonly numero: string | null
  readonly proveedor: string
  readonly nit: string | null
  readonly total: number
  readonly moneda: string
  readonly validez_hasta: string | null
  readonly texto: string
}

export type Aprobacion = {
  readonly de: string
  readonly para: string
  readonly asunto: string
  readonly fecha: string
  readonly aprobado: boolean
  readonly texto: string
}

export type Factura = {
  readonly numero: string
  readonly fecha: string
  readonly total: number
}

export type Paquete = {
  readonly correo: Correo
  readonly solicitud: Solicitud
  readonly cotizacion: Cotizacion | null
  readonly aprobacion: Aprobacion | null
  readonly factura: Factura | null
  readonly faltantes: readonly string[]
}
