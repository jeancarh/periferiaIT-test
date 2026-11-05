import { access, appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { ZodType } from "zod"
import { describirErrorZod } from "../../shared/errores-zod"
import { exito, fallo, type Resultado } from "../../shared/resultado"

export const existe = async (ruta: string): Promise<boolean> => {
  try {
    await access(ruta)
    return true
  } catch {
    return false
  }
}

export const leerTextoOpcional = async (ruta: string): Promise<string | null> =>
  (await existe(ruta)) ? readFile(ruta, "utf8") : null

export const leerJson = async <T>(ruta: string, esquema: ZodType<T>, nombre: string): Promise<Resultado<T> | null> => {
  const texto = await leerTextoOpcional(ruta)
  if (texto === null) return null
  let contenido: unknown
  try {
    contenido = JSON.parse(texto)
  } catch {
    return fallo(`${nombre} no es un JSON válido.`)
  }
  const validado = esquema.safeParse(contenido)
  return validado.success ? exito(validado.data) : fallo(`${nombre} tiene datos inválidos: ${describirErrorZod(validado.error)}`)
}

export const escribirArchivo = async (ruta: string, contenido: string | Uint8Array): Promise<void> => {
  await mkdir(dirname(ruta), { recursive: true })
  await writeFile(ruta, contenido)
}

export const agregarLinea = async (ruta: string, linea: string): Promise<void> => {
  await mkdir(dirname(ruta), { recursive: true })
  await appendFile(ruta, `${linea}\n`, "utf8")
}
