import type { Trazabilidad } from "../domain/constructor-orden"
import type { Evidencia } from "../domain/evidencia"
import type { Maestros } from "../domain/maestros"
import type { Paquete } from "../domain/paquete"
import type { Resultado } from "../shared/resultado"

export interface PaqueteRepository {
  obtener(caso: string): Promise<Resultado<Paquete>>
  listarCasos(): Promise<string[]>
}

export interface MaestrosRepository {
  obtener(): Promise<Resultado<Maestros>>
}

export type RutasEvidencia = {
  readonly ruta: string
  readonly ruta_pdf: string
}

export interface ArtefactosCaso {
  guardarTrazabilidad(caso: string, trazabilidad: Trazabilidad): Promise<string>
  guardarEvidencia(caso: string, evidencia: Evidencia): Promise<RutasEvidencia>
}

export type ResultadoIntento = "creada" | "idempotente" | "bloqueada" | "pendiente_confirmacion"

export type FilaControl = {
  readonly solicitud_id: string
  readonly resultado: ResultadoIntento
  readonly numero_oc: string | null
  readonly retroactiva: boolean
  readonly bloqueos: readonly string[]
  readonly confirmaciones: readonly string[]
  readonly ts: string
}

export interface RegistroControl {
  registrar(fila: FilaControl): Promise<void>
}

export type EntradaBitacora = {
  readonly herramienta: string
  readonly caso: string | null
  readonly sesion: string
  readonly ok: boolean
  readonly resumen: string
}

export interface BitacoraHerramientas {
  registrar(entrada: EntradaBitacora): Promise<void>
}

export interface Reloj {
  ahora(): Date
}
