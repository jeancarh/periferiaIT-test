const ordenarClaves = (valor: unknown): unknown => {
  if (Array.isArray(valor)) return valor.map(ordenarClaves)
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([clave, contenido]) => [clave, ordenarClaves(contenido)]),
    )
  }
  return valor
}

export const serializarEstable = (valor: unknown): string => JSON.stringify(ordenarClaves(valor))
