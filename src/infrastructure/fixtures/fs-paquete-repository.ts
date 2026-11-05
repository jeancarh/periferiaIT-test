import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { PaqueteRepository } from "../../application/puertos"
import { SolicitudSchema, type Aprobacion, type Cotizacion, type Factura, type Paquete } from "../../domain/paquete"
import { exito, fallo, type Resultado } from "../../shared/resultado"
import { existe, leerJson, leerTextoOpcional } from "../fs/archivos"
import { AprobacionArchivoSchema, CorreoArchivoSchema, normalizarAprobacion, parsearCotizacion, parsearFactura } from "./documentos"

type Opcional<T> = Resultado<T | null>

const sinDocumento: Opcional<never> = exito(null)

export class FsPaqueteRepository implements PaqueteRepository {
  constructor(private readonly raizSolicitudes: string) {}

  async listarCasos(): Promise<string[]> {
    if (!(await existe(this.raizSolicitudes))) return []
    const entradas = await readdir(this.raizSolicitudes, { withFileTypes: true })
    return entradas.filter((entrada) => entrada.isDirectory()).map((entrada) => entrada.name).sort()
  }

  async obtener(caso: string): Promise<Resultado<Paquete>> {
    const carpeta = join(this.raizSolicitudes, caso)
    if (!(await existe(carpeta))) {
      return fallo(`El caso "${caso}" no existe. Casos disponibles: ${(await this.listarCasos()).join(", ")}.`)
    }
    const correo = await leerJson(join(carpeta, "correo.json"), CorreoArchivoSchema, "correo.json")
    const solicitud = await leerJson(join(carpeta, "solicitud.json"), SolicitudSchema, "solicitud.json")
    if (!correo) return fallo(`El caso "${caso}" no tiene correo.json.`)
    if (!solicitud) return fallo(`El caso "${caso}" no tiene solicitud.json; pide al solicitante el Excel de solicitud.`)
    if (!correo.ok) return correo
    if (!solicitud.ok) return solicitud

    const cotizacion = await this.leerCotizacion(carpeta)
    if (!cotizacion.ok) return cotizacion
    const aprobacion = await this.leerAprobacion(carpeta)
    if (!aprobacion.ok) return aprobacion
    const factura = await this.leerFactura(carpeta)
    if (!factura.ok) return factura

    return exito({
      correo: correo.data,
      solicitud: solicitud.data,
      cotizacion: cotizacion.data,
      aprobacion: aprobacion.data,
      factura: factura.data,
      faltantes: [
        ...(cotizacion.data ? [] : ["cotizacion"]),
        ...(aprobacion.data ? [] : ["aprobacion"]),
      ],
    })
  }

  private async leerCotizacion(carpeta: string): Promise<Opcional<Cotizacion>> {
    const texto = await leerTextoOpcional(join(carpeta, "cotizacion.txt"))
    return texto === null ? sinDocumento : parsearCotizacion(texto)
  }

  private async leerFactura(carpeta: string): Promise<Opcional<Factura>> {
    const texto = await leerTextoOpcional(join(carpeta, "factura.txt"))
    return texto === null ? sinDocumento : parsearFactura(texto)
  }

  private async leerAprobacion(carpeta: string): Promise<Opcional<Aprobacion>> {
    const archivo = await leerJson(join(carpeta, "aprobacion.json"), AprobacionArchivoSchema, "aprobacion.json")
    if (!archivo) return sinDocumento
    return archivo.ok ? exito(normalizarAprobacion(archivo.data)) : archivo
  }
}
