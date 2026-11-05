import { join, relative } from "node:path"
import type { ArtefactosCaso, RutasEvidencia } from "../../application/puertos"
import type { Trazabilidad } from "../../domain/constructor-orden"
import type { Evidencia } from "../../domain/evidencia"
import { escribirArchivo } from "../fs/archivos"
import { generarPdf } from "./pdf-evidencia"

export class FsArtefactosCaso implements ArtefactosCaso {
  constructor(
    private readonly raizSalida: string,
    private readonly raizProyecto: string,
  ) {}

  async guardarTrazabilidad(caso: string, trazabilidad: Trazabilidad): Promise<string> {
    const ruta = join(this.raizSalida, caso, "trazabilidad.json")
    await escribirArchivo(ruta, `${JSON.stringify(trazabilidad, null, 2)}\n`)
    return this.relativa(ruta)
  }

  async guardarEvidencia(caso: string, evidencia: Evidencia): Promise<RutasEvidencia> {
    const documento = `${evidencia.contenido}\n\nSHA-256: ${evidencia.sha256}\n`
    const ruta = join(this.raizSalida, caso, "aprobacion.txt")
    const rutaPdf = join(this.raizSalida, caso, "aprobacion.pdf")
    await escribirArchivo(ruta, documento)
    await escribirArchivo(rutaPdf, await generarPdf(`Evidencia de aprobación · ${caso}`, documento))
    return { ruta: this.relativa(ruta), ruta_pdf: this.relativa(rutaPdf) }
  }

  private relativa(ruta: string): string {
    return relative(this.raizProyecto, ruta)
  }
}
