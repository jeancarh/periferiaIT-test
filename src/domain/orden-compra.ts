import { z } from "zod"

export const LIMITE_TEXTO_BREVE_SAP = 40

export const OrdenCompraSchema = z.object({
  referencia: z.object({
    solicitud_id: z.string().min(1),
    correo_id: z.string().min(1),
    cotizacion_ref: z.string().min(1).nullable(),
  }),
  sociedad: z.literal("1000"),
  organizacion_compras: z.literal("1000"),
  proveedor: z.object({
    codigo_sap: z.string().min(1),
    nit: z.string().min(1),
    nombre: z.string().min(1),
  }),
  moneda: z.enum(["COP", "USD"]),
  condiciones_pago: z.string().min(1),
  aprobador: z.object({
    email: z.string().min(1),
    fecha_aprobacion: z.string().min(1),
    evidencia_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  posiciones: z
    .array(
      z.object({
        numero: z.number().int().positive(),
        descripcion: z.string().min(1).max(LIMITE_TEXTO_BREVE_SAP),
        cantidad: z.number().positive(),
        unidad: z.enum(["UN", "H", "MES"]),
        precio_unitario: z.number().nonnegative(),
        centro_costo: z.string().min(1),
        subarea: z.string().min(1),
        indicador_iva: z.string().min(1),
      }),
    )
    .min(1),
  excepciones: z.array(
    z.object({
      codigo: z.string().min(1),
      detalle: z.string().min(1),
      confirmado_por: z.string().min(1).nullable(),
    }),
  ),
})

export type OrdenCompra = z.infer<typeof OrdenCompraSchema>
export type UnidadMedida = OrdenCompra["posiciones"][number]["unidad"]
