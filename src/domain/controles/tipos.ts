import type { CentroCosto, Maestros, Proveedor } from "../maestros"
import type { Paquete } from "../paquete"

export type CodigoControl = "RC1" | "RC2" | "RC3" | "RC4" | "RC5" | "RC6" | "RC7" | "RC8" | "RC9" | "RC10"

export type TipoHallazgo = "bloqueo" | "confirmacion"

export type Hallazgo = {
  readonly codigo: CodigoControl
  readonly tipo: TipoHallazgo
  readonly detalle: string
  readonly accion_sugerida: string
}

export type ValorDerivado = {
  readonly valor: string
  readonly fuente: string
  readonly detalle: string
}

export type CampoDerivable = "indicador_iva" | "condiciones_pago"

export type Derivados = Partial<Record<CampoDerivable, ValorDerivado>>

export type EvaluacionRegla = {
  readonly hallazgos: readonly Hallazgo[]
  readonly derivados?: Derivados
  readonly retroactiva?: boolean
}

export type ContextoControl = {
  readonly paquete: Paquete
  readonly maestros: Maestros
  readonly proveedor: Proveedor | null
  readonly centro: CentroCosto | null
}

export interface ReglaControl {
  readonly codigo: CodigoControl
  evaluar(contexto: ContextoControl): EvaluacionRegla
}

export type ResultadoValidacion = {
  readonly apta: boolean
  readonly bloqueos: readonly Hallazgo[]
  readonly confirmaciones: readonly Hallazgo[]
  readonly derivados: Derivados
  readonly retroactiva: boolean
}

export const sinHallazgos: EvaluacionRegla = { hallazgos: [] }

export const bloqueo = (codigo: CodigoControl, detalle: string, accion_sugerida: string): EvaluacionRegla => ({
  hallazgos: [{ codigo, tipo: "bloqueo", detalle, accion_sugerida }],
})

export const confirmacion = (codigo: CodigoControl, detalle: string, accion_sugerida: string): EvaluacionRegla => ({
  hallazgos: [{ codigo, tipo: "confirmacion", detalle, accion_sugerida }],
})
