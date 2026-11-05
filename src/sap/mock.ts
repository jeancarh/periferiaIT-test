import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import type { MaestrosRepository, Reloj } from "../application/puertos"
import { OrdenCompraSchema } from "../domain/orden-compra"
import { agregarLinea, existe } from "../infrastructure/fs/archivos"
import type { OrdenCompra, SapAdapter } from "./adapter"

export const PRIMER_NUMERO_OC = 4_500_000_001

const RegistroOrdenSchema = z.object({
  numero_oc: z.string(),
  fecha: z.string(),
  orden: OrdenCompraSchema,
})

type RegistroOrden = z.infer<typeof RegistroOrdenSchema>

export class MockSapAdapter implements SapAdapter {
  private cola: Promise<unknown> = Promise.resolve()
  private readonly rutaOrdenes: string

  constructor(
    raizSap: string,
    private readonly maestros: MaestrosRepository,
    private readonly reloj: Reloj,
  ) {
    this.rutaOrdenes = join(raizSap, "ordenes.jsonl")
  }

  async consultarProveedor(nit: string): Promise<{ codigo_sap: string; activo: boolean } | null> {
    const maestros = await this.maestros.obtener()
    if (!maestros.ok) return null
    const proveedor = maestros.data.buscarProveedor(nit, "")
    return proveedor ? { codigo_sap: proveedor.codigo_sap, activo: proveedor.activo } : null
  }

  crearOrden(orden: OrdenCompra): Promise<{ numero_oc: string; fecha: string }> {
    return this.enExclusion(async () => {
      const registros = await this.leerRegistros()
      const existente = registros.find((registro) => registro.orden.referencia.solicitud_id === orden.referencia.solicitud_id)
      if (existente) return { numero_oc: existente.numero_oc, fecha: existente.fecha }
      const registro: RegistroOrden = {
        numero_oc: String(PRIMER_NUMERO_OC + registros.length),
        fecha: this.reloj.ahora().toISOString().slice(0, 10),
        orden,
      }
      await agregarLinea(this.rutaOrdenes, JSON.stringify(registro))
      return { numero_oc: registro.numero_oc, fecha: registro.fecha }
    })
  }

  async buscarOrdenPorReferencia(solicitud_id: string): Promise<{ numero_oc: string; fecha: string } | null> {
    const registro = (await this.leerRegistros()).find((orden) => orden.orden.referencia.solicitud_id === solicitud_id)
    return registro ? { numero_oc: registro.numero_oc, fecha: registro.fecha } : null
  }

  private async leerRegistros(): Promise<RegistroOrden[]> {
    if (!(await existe(this.rutaOrdenes))) return []
    const lineas = (await readFile(this.rutaOrdenes, "utf8")).split("\n").filter((linea) => linea.trim() !== "")
    return lineas.map((linea) => RegistroOrdenSchema.parse(JSON.parse(linea)))
  }

  private enExclusion<T>(operacion: () => Promise<T>): Promise<T> {
    const resultado = this.cola.then(operacion)
    this.cola = resultado.catch(() => undefined)
    return resultado
  }
}
