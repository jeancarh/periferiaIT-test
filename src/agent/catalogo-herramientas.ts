import { z, type ZodRawShape } from "zod"
import type { DefinicionHerramientaLlm, LlamadaHerramienta } from "../llm/adapter"
import type { ContextoHerramienta } from "../tools/definir-herramienta"

export interface HerramientaAgente {
  readonly description: string
  readonly args: ZodRawShape
  execute(args: unknown, ctx: ContextoHerramienta): Promise<string>
}

export type EjecucionHerramienta = {
  readonly id: string
  readonly nombre: string
  readonly argumentos: unknown
  readonly ok: boolean
  readonly resumen: string
  readonly salida: string
  readonly requiereConfirmacion: boolean | null
}

const SalidaSchema = z.object({
  ok: z.boolean(),
  resumen: z.string().optional(),
  error: z.string().optional(),
  requiere_confirmacion: z.boolean().optional(),
  data: z.object({ requiere_confirmacion: z.boolean().optional() }).loose().optional(),
})

const parsearJson = (texto: string): { valido: true; valor: unknown } | { valido: false } => {
  try {
    return { valido: true, valor: JSON.parse(texto) }
  } catch {
    return { valido: false }
  }
}

export class CatalogoHerramientas {
  private readonly herramientas: ReadonlyMap<string, HerramientaAgente>

  constructor(modulos: Readonly<Record<string, Readonly<Record<string, HerramientaAgente>>>>) {
    this.herramientas = new Map(
      Object.entries(modulos).flatMap(([prefijo, exportaciones]) =>
        Object.entries(exportaciones).map(([nombre, herramienta]) => [`${prefijo}_${nombre}`, herramienta] as const),
      ),
    )
  }

  definiciones(): DefinicionHerramientaLlm[] {
    return [...this.herramientas].map(([nombre, herramienta]) => ({
      nombre,
      descripcion: herramienta.description,
      parametros: z.toJSONSchema(z.object(herramienta.args), { io: "input" }),
    }))
  }

  async ejecutar(llamada: LlamadaHerramienta, ctx: ContextoHerramienta): Promise<EjecucionHerramienta> {
    const herramienta = this.herramientas.get(llamada.nombre)
    const argumentos = parsearJson(llamada.argumentos)
    if (!herramienta) return this.rechazo(llamada, null, `La herramienta ${llamada.nombre} no existe.`)
    if (!argumentos.valido) return this.rechazo(llamada, null, `Los argumentos de ${llamada.nombre} no son JSON válido.`)
    const salida = await herramienta.execute(argumentos.valor, ctx)
    const salidaJson = parsearJson(salida)
    const interpretada = SalidaSchema.safeParse(salidaJson.valido ? salidaJson.valor : null)
    const datos = interpretada.success ? interpretada.data : null
    return {
      id: llamada.id,
      nombre: llamada.nombre,
      argumentos: argumentos.valor,
      ok: datos?.ok ?? false,
      resumen: datos?.resumen ?? datos?.error ?? "Salida sin resumen.",
      salida,
      requiereConfirmacion: datos?.requiere_confirmacion ?? datos?.data?.requiere_confirmacion ?? null,
    }
  }

  private rechazo(llamada: LlamadaHerramienta, argumentos: unknown, error: string): EjecucionHerramienta {
    return {
      id: llamada.id,
      nombre: llamada.nombre,
      argumentos,
      ok: false,
      resumen: error,
      salida: JSON.stringify({ ok: false, error }),
      requiereConfirmacion: null,
    }
  }
}
