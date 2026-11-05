import { z, type ZodRawShape } from "zod"
import type { BitacoraHerramientas } from "../application/puertos"
import { describirErrorZod } from "../shared/errores-zod"
import type { Resultado } from "../shared/resultado"

export type ContextoHerramienta = {
  readonly directory: string
  readonly sessionId: string
  readonly confirmacionHumana?: boolean
}

type Argumentos<S extends ZodRawShape> = z.output<z.ZodObject<S>>

export type DefinicionHerramienta<S extends ZodRawShape, T> = {
  readonly nombre: string
  readonly description: string
  readonly args: S
  readonly bitacora: (ctx: ContextoHerramienta) => BitacoraHerramientas
  readonly ejecutar: (args: Argumentos<S>, ctx: ContextoHerramienta) => Promise<Resultado<T>>
  readonly resumir: (data: T) => string
}

export type Herramienta<S extends ZodRawShape> = {
  readonly description: string
  readonly args: S
  execute(args: z.input<z.ZodObject<S>>, ctx: ContextoHerramienta): Promise<string>
}

type Salida = Record<string, unknown> & { readonly ok: boolean; readonly resumen: string }

const casoDe = (args: unknown): string | null => {
  const caso = z.object({ caso: z.string() }).safeParse(args)
  return caso.success ? caso.data.caso : null
}

export const definirHerramienta = <S extends ZodRawShape, T>(definicion: DefinicionHerramienta<S, T>): Herramienta<S> => {
  const esquema = z.object(definicion.args)

  const ejecutarSeguro = async (entrada: unknown, ctx: ContextoHerramienta): Promise<Salida> => {
    const args = esquema.safeParse(entrada)
    if (!args.success) {
      const error = `Argumentos inválidos para ${definicion.nombre}: ${describirErrorZod(args.error)}`
      return { ok: false, error, resumen: error }
    }
    try {
      const resultado = await definicion.ejecutar(args.data, ctx)
      return resultado.ok
        ? { ok: true, data: resultado.data, resumen: definicion.resumir(resultado.data) }
        : { ...resultado, resumen: resultado.error }
    } catch {
      const error = `Error interno al ejecutar ${definicion.nombre}. El detalle quedó en out/log.jsonl.`
      return { ok: false, error, resumen: error }
    }
  }

  const registrar = async (ctx: ContextoHerramienta, entrada: unknown, salida: Salida): Promise<void> => {
    try {
      await definicion.bitacora(ctx).registrar({
        herramienta: definicion.nombre,
        caso: casoDe(entrada),
        sesion: ctx.sessionId,
        ok: salida.ok,
        resumen: salida.resumen,
      })
    } catch {
      return
    }
  }

  return {
    description: definicion.description,
    args: definicion.args,
    async execute(entrada, ctx) {
      const salida = await ejecutarSeguro(entrada, ctx)
      await registrar(ctx, entrada, salida)
      return JSON.stringify(salida)
    },
  }
}
