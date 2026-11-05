export type Exito<T> = { readonly ok: true; readonly data: T }

export type Fallo = {
  readonly ok: false
  readonly error: string
  readonly requiere_confirmacion?: boolean
}

export type Resultado<T> = Exito<T> | Fallo

export const exito = <T>(data: T): Exito<T> => ({ ok: true, data })

export const fallo = (error: string, requiereConfirmacion?: boolean): Fallo =>
  requiereConfirmacion === undefined
    ? { ok: false, error }
    : { ok: false, error, requiere_confirmacion: requiereConfirmacion }
