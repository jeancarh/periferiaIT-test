import type { FilaControl, RegistroControl } from "../../application/puertos"
import { agregarLinea, existe } from "../fs/archivos"

const ENCABEZADO = "solicitud_id,resultado,numero_oc,retroactiva,bloqueos,confirmaciones,ts"

const escaparCsv = (valor: string): string => (/[",\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor)

export class CsvRegistroControl implements RegistroControl {
  constructor(private readonly ruta: string) {}

  async registrar(fila: FilaControl): Promise<void> {
    if (!(await existe(this.ruta))) await agregarLinea(this.ruta, ENCABEZADO)
    const columnas = [
      fila.solicitud_id,
      fila.resultado,
      fila.numero_oc ?? "",
      String(fila.retroactiva),
      fila.bloqueos.join(";"),
      fila.confirmaciones.join(";"),
      fila.ts,
    ]
    await agregarLinea(this.ruta, columnas.map(escaparCsv).join(","))
  }
}
