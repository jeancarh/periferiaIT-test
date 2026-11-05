export const fechaCalendario = (iso: string): string => iso.slice(0, 10)

export const sumarDias = (fecha: string, dias: number): string => {
  const resultado = new Date(`${fecha}T00:00:00Z`)
  resultado.setUTCDate(resultado.getUTCDate() + dias)
  return resultado.toISOString().slice(0, 10)
}

export const esFechaValida = (fecha: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))
