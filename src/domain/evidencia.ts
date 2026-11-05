import { createHash } from "node:crypto"
import type { Aprobacion } from "./paquete"

export type Evidencia = {
  readonly contenido: string
  readonly sha256: string
}

export const renderizarEvidencia = (aprobacion: Aprobacion): Evidencia => {
  const contenido = [
    `De: ${aprobacion.de}`,
    `Para: ${aprobacion.para}`,
    `Fecha: ${aprobacion.fecha}`,
    `Asunto: ${aprobacion.asunto}`,
    "",
    aprobacion.texto,
  ].join("\n")
  return { contenido, sha256: createHash("sha256").update(contenido, "utf8").digest("hex") }
}
