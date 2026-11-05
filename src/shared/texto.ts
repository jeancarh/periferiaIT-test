export const normalizarNombre = (valor: string): string =>
  valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

export const normalizarNit = (valor: string): string => (valor.split("-")[0] ?? "").replace(/\D/g, "")

export const parsearMonto = (valor: string): number => Number(valor.replace(/\./g, "").replace(",", "."))

export const formatearMonto = (valor: number, moneda: string): string =>
  `${moneda} ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(valor)}`

export const formatearPorcentaje = (valor: number): string => `${(valor * 100).toFixed(1)} %`

export const recortar = (valor: string, maximo: number): string => valor.slice(0, maximo).trimEnd()
