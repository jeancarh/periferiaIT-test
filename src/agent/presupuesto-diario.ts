export type LimitesDiarios = {
  readonly maxPeticiones: number
  readonly maxTokens: number
}

export class PresupuestoDiario {
  private dia = ""
  private peticiones = 0
  private tokens = 0

  constructor(
    private readonly limites: LimitesDiarios,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  motivoDeBloqueo(): string | null {
    this.renovarSiCambioElDia()
    if (this.peticiones >= this.limites.maxPeticiones || this.tokens >= this.limites.maxTokens) {
      return "El servicio alcanzó su cupo diario de consultas al modelo. Intenta de nuevo mañana."
    }
    return null
  }

  registrar(tokens: number): void {
    this.renovarSiCambioElDia()
    this.peticiones += 1
    this.tokens += tokens
  }

  private renovarSiCambioElDia(): void {
    const hoy = this.ahora().toISOString().slice(0, 10)
    if (hoy === this.dia) return
    this.dia = hoy
    this.peticiones = 0
    this.tokens = 0
  }
}
