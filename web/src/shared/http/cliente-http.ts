import type { ZodType } from "zod"

export class ErrorHttp extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje)
    this.name = "ErrorHttp"
  }
}

const mensajeDeError = async (respuesta: Response): Promise<string> => {
  try {
    const cuerpo: unknown = await respuesta.json()
    if (cuerpo && typeof cuerpo === "object" && "error" in cuerpo && typeof cuerpo.error === "string") return cuerpo.error
  } catch {
    return `El servidor respondió ${respuesta.status}.`
  }
  return `El servidor respondió ${respuesta.status}.`
}

export const solicitarJson = async <T>(ruta: string, esquema: ZodType<T>, opciones: RequestInit = {}): Promise<T> => {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      ...opciones,
      headers: { "content-type": "application/json", ...opciones.headers },
    })
  } catch {
    throw new ErrorHttp(0, "No hay conexión con el servidor. Revisa tu red e intenta de nuevo.")
  }
  if (!respuesta.ok) throw new ErrorHttp(respuesta.status, await mensajeDeError(respuesta))
  const validado = esquema.safeParse(await respuesta.json())
  if (!validado.success) throw new ErrorHttp(respuesta.status, "El servidor devolvió una respuesta inesperada.")
  return validado.data
}
