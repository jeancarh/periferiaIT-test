const CLAVE = "oc-agent-session"

const generar = (): string => crypto.randomUUID()

export const obtenerIdentificadorSesion = (): string => {
  try {
    const existente = sessionStorage.getItem(CLAVE)
    if (existente) return existente
    const nuevo = generar()
    sessionStorage.setItem(CLAVE, nuevo)
    return nuevo
  } catch {
    return generar()
  }
}

export const renovarIdentificadorSesion = (): string => {
  const nuevo = generar()
  try {
    sessionStorage.setItem(CLAVE, nuevo)
  } catch {
    return nuevo
  }
  return nuevo
}
