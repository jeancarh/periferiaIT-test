import type { Paquete } from "../../domain/paquete"
import { exito, type Resultado } from "../../shared/resultado"
import type { PaqueteRepository } from "../puertos"

export class ConsultarPaquetes {
  constructor(private readonly paquetes: PaqueteRepository) {}

  async listar(): Promise<Resultado<{ casos: string[] }>> {
    return exito({ casos: await this.paquetes.listarCasos() })
  }

  leer(caso: string): Promise<Resultado<Paquete>> {
    return this.paquetes.obtener(caso)
  }
}
