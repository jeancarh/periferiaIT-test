import { describirErrorZod } from "../shared/errores-zod"
import { fallo, exito, type Resultado } from "../shared/resultado"
import { recortar } from "../shared/texto"
import type { ResultadoValidacion } from "./controles/tipos"
import { renderizarEvidencia } from "./evidencia"
import type { Maestros } from "./maestros"
import { LIMITE_TEXTO_BREVE_SAP, OrdenCompraSchema, type OrdenCompra, type UnidadMedida } from "./orden-compra"
import type { Paquete } from "./paquete"

export const NUMERO_PRIMERA_POSICION = 10

export type Fuente =
  | "solicitud"
  | "cotizacion"
  | "aprobacion"
  | "correo"
  | "constante"
  | "derivado"
  | `maestro.${string}`

export type Trazabilidad = Readonly<Record<string, Fuente>>

export type OrdenConstruida = {
  readonly orden: OrdenCompra
  readonly trazabilidad: Trazabilidad
}

export type EntradaConstruccion = {
  readonly paquete: Paquete
  readonly maestros: Maestros
  readonly validacion: ResultadoValidacion
  readonly confirmadoPor: string | null
}

type ValorTrazado = { readonly valor: string; readonly fuente: Fuente }

const inferirUnidad = (descripcion: string): UnidadMedida => {
  if (/\bhoras?\b/i.test(descripcion)) return "H"
  if (/\bmensual(es|idad)?\b/i.test(descripcion)) return "MES"
  return "UN"
}

const resolverCampo = (
  informado: string | undefined,
  derivado: { readonly valor: string; readonly fuente: string } | undefined,
): ValorTrazado | null => {
  if (informado) return { valor: informado, fuente: "solicitud" }
  if (derivado) return { valor: derivado.valor, fuente: "derivado" }
  return null
}

export const construirOrden = ({ paquete, maestros, validacion, confirmadoPor }: EntradaConstruccion): Resultado<OrdenConstruida> => {
  const { solicitud, aprobacion, cotizacion, correo } = paquete
  if (!validacion.apta) return fallo(`La solicitud tiene bloqueos: ${validacion.bloqueos.map((b) => b.codigo).join(", ")}.`)
  const proveedor = maestros.buscarProveedor(solicitud.proveedor_nit, solicitud.proveedor_nombre)
  if (!proveedor || !aprobacion) return fallo("Faltan el proveedor o la aprobación para construir la orden.")
  const indicadorIva = resolverCampo(solicitud.indicador_iva, validacion.derivados.indicador_iva)
  const condicionesPago = resolverCampo(solicitud.condiciones_pago, validacion.derivados.condiciones_pago)
  if (!indicadorIva || !condicionesPago) return fallo("No se pudo determinar el indicador de IVA o las condiciones de pago.")

  const candidata = {
    referencia: { solicitud_id: solicitud.solicitud_id, correo_id: correo.id, cotizacion_ref: cotizacion?.numero ?? null },
    sociedad: "1000",
    organizacion_compras: "1000",
    proveedor: { codigo_sap: proveedor.codigo_sap, nit: proveedor.nit, nombre: proveedor.nombre },
    moneda: solicitud.moneda,
    condiciones_pago: condicionesPago.valor,
    aprobador: {
      email: aprobacion.de,
      fecha_aprobacion: aprobacion.fecha,
      evidencia_sha256: renderizarEvidencia(aprobacion).sha256,
    },
    posiciones: [
      {
        numero: NUMERO_PRIMERA_POSICION,
        descripcion: recortar(solicitud.descripcion, LIMITE_TEXTO_BREVE_SAP),
        cantidad: solicitud.cantidad,
        unidad: inferirUnidad(`${solicitud.descripcion} ${cotizacion?.texto ?? ""}`),
        precio_unitario: solicitud.valor_unitario,
        centro_costo: solicitud.centro_costo,
        subarea: solicitud.subarea,
        indicador_iva: indicadorIva.valor,
      },
    ],
    excepciones: validacion.confirmaciones.map((hallazgo) => ({
      codigo: hallazgo.codigo,
      detalle: hallazgo.detalle,
      confirmado_por: confirmadoPor,
    })),
  }

  const orden = OrdenCompraSchema.safeParse(candidata)
  if (!orden.success) return fallo(`La orden no cumple el esquema SAP: ${describirErrorZod(orden.error)}`)

  return exito({
    orden: orden.data,
    trazabilidad: {
      "referencia.solicitud_id": "solicitud",
      "referencia.correo_id": "correo",
      "referencia.cotizacion_ref": "cotizacion",
      sociedad: "constante",
      organizacion_compras: "constante",
      "proveedor.codigo_sap": "maestro.proveedores",
      "proveedor.nit": "maestro.proveedores",
      "proveedor.nombre": "maestro.proveedores",
      moneda: "solicitud",
      condiciones_pago: condicionesPago.fuente,
      "aprobador.email": "aprobacion",
      "aprobador.fecha_aprobacion": "aprobacion",
      "aprobador.evidencia_sha256": "derivado",
      "posiciones[0].numero": "constante",
      "posiciones[0].descripcion": "solicitud",
      "posiciones[0].cantidad": "solicitud",
      "posiciones[0].unidad": "derivado",
      "posiciones[0].precio_unitario": "solicitud",
      "posiciones[0].centro_costo": "solicitud",
      "posiciones[0].subarea": "solicitud",
      "posiciones[0].indicador_iva": indicadorIva.fuente,
      excepciones: "derivado",
    },
  })
}
