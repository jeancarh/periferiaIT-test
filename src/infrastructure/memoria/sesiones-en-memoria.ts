import type { Sesion, SesionRepository } from "../../agent/sesion"

export class SesionesEnMemoria implements SesionRepository {
  private readonly sesiones = new Map<string, Sesion>()

  constructor(private readonly capacidad: number) {}

  async obtener(id: string): Promise<Sesion | null> {
    return this.sesiones.get(id) ?? null
  }

  async guardar(sesion: Sesion): Promise<void> {
    this.sesiones.delete(sesion.id)
    this.sesiones.set(sesion.id, sesion)
    if (this.sesiones.size <= this.capacidad) return
    const masAntigua = this.sesiones.keys().next()
    if (!masAntigua.done) this.sesiones.delete(masAntigua.value)
  }
}
