import type { BitacoraHerramientas, EntradaBitacora, Reloj } from "../../application/puertos"
import { agregarLinea } from "../fs/archivos"

export class JsonlBitacoraHerramientas implements BitacoraHerramientas {
  constructor(
    private readonly ruta: string,
    private readonly reloj: Reloj,
  ) {}

  async registrar(entrada: EntradaBitacora): Promise<void> {
    await agregarLinea(this.ruta, JSON.stringify({ ts: this.reloj.ahora().toISOString(), ...entrada }))
  }
}
