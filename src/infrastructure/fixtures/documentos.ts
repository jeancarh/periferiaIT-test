import { z } from "zod"
import type { Aprobacion, Cotizacion, Factura } from "../../domain/paquete"
import { sumarDias } from "../../shared/fechas"
import { exito, fallo, type Resultado } from "../../shared/resultado"
import { normalizarNit, parsearMonto } from "../../shared/texto"

export const CorreoArchivoSchema = z.object({
  id: z.string().min(1),
  de: z.string().min(1),
  asunto: z.string().min(1),
  fecha: z.string().min(1),
})

export const AprobacionArchivoSchema = z.object({
  de: z.string().min(1),
  para: z.string().min(1),
  fecha: z.string().min(1),
  asunto: z.string().min(1),
  cuerpo: z.string(),
})

const capturar = (texto: string, patron: RegExp): string | null => patron.exec(texto)?.[1]?.trim() ?? null

export const parsearCotizacion = (texto: string): Resultado<Cotizacion> => {
  const proveedor = capturar(texto, /^Proveedor:\s*(.+)$/m)
  const total = /^TOTAL[^:\n]*:\s*([A-Z]{3})\s*([\d.,]+)/m.exec(texto)
  if (!proveedor || !total?.[1] || !total[2]) return fallo("La cotización no tiene proveedor o total legibles.")
  const fecha = capturar(texto, /^Fecha:\s*(\d{4}-\d{2}-\d{2})/m)
  const validezDias = capturar(texto, /Validez de la oferta:\s*(\d+)\s*d[ií]as/i)
  const nit = capturar(texto, /^NIT:\s*([\d.\-]+)/m)
  return exito({
    numero: capturar(texto, /^COTIZACI[OÓ]N\s+(\S+)/m),
    proveedor,
    nit: nit ? normalizarNit(nit) : null,
    total: parsearMonto(total[2]),
    moneda: total[1],
    validez_hasta: fecha && validezDias ? sumarDias(fecha, Number(validezDias)) : null,
    texto,
  })
}

export const parsearFactura = (texto: string): Resultado<Factura> => {
  const numero = capturar(texto, /No\.\s*(\S+)/)
  const fecha = capturar(texto, /Fecha de emisi[oó]n:\s*(\d{4}-\d{2}-\d{2})/)
  const total = capturar(texto, /^TOTAL:\s*[A-Z]{3}\s*([\d.,]+)/m)
  if (!numero || !fecha || !total) return fallo("La factura no tiene número, fecha de emisión o total legibles.")
  return exito({ numero, fecha, total: parsearMonto(total) })
}

export const normalizarAprobacion = (archivo: z.infer<typeof AprobacionArchivoSchema>): Aprobacion => ({
  de: archivo.de,
  para: archivo.para,
  asunto: archivo.asunto,
  fecha: archivo.fecha,
  aprobado: /\baprobado\b/i.test(archivo.cuerpo) && !/\bno\s+(?:est[aá]\s+)?aprobado\b/i.test(archivo.cuerpo),
  texto: archivo.cuerpo,
})
