import { renderizarEvidencia } from "../../domain/evidencia"
import { exito, fallo, type Resultado } from "../../shared/resultado"
import type { ArtefactosCaso, PaqueteRepository, RutasEvidencia } from "../puertos"

export type EvidenciaGenerada = RutasEvidencia & { readonly sha256: string }

export class GenerarEvidencia {
  constructor(
    private readonly paquetes: PaqueteRepository,
    private readonly artefactos: ArtefactosCaso,
  ) {}

  async ejecutar(caso: string): Promise<Resultado<EvidenciaGenerada>> {
    const paquete = await this.paquetes.obtener(caso)
    if (!paquete.ok) return paquete
    const { aprobacion } = paquete.data
    if (!aprobacion) return fallo(`El caso "${caso}" no tiene correo de aprobación; pídelo al solicitante.`)
    const evidencia = renderizarEvidencia(aprobacion)
    const rutas = await this.artefactos.guardarEvidencia(caso, evidencia)
    return exito({ ...rutas, sha256: evidencia.sha256 })
  }
}
