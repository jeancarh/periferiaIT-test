import type { Maestros } from "../domain/maestros"
import type { Paquete } from "../domain/paquete"
import { exito, type Resultado } from "../shared/resultado"
import type { MaestrosRepository, PaqueteRepository } from "./puertos"

export type CasoCargado = {
  readonly paquete: Paquete
  readonly maestros: Maestros
}

export const cargarCaso = async (
  paquetes: PaqueteRepository,
  maestrosRepository: MaestrosRepository,
  caso: string,
): Promise<Resultado<CasoCargado>> => {
  const paquete = await paquetes.obtener(caso)
  if (!paquete.ok) return paquete
  const maestros = await maestrosRepository.obtener()
  if (!maestros.ok) return maestros
  return exito({ paquete: paquete.data, maestros: maestros.data })
}
