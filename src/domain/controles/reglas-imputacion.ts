import { bloqueo, confirmacion, sinHallazgos, type ContextoControl, type EvaluacionRegla, type ReglaControl } from "./tipos"

export class SubareaPerteneceAlCentro implements ReglaControl {
  readonly codigo = "RC4"

  evaluar({ paquete, centro }: ContextoControl): EvaluacionRegla {
    const { centro_costo, subarea } = paquete.solicitud
    if (!centro) {
      return bloqueo(
        this.codigo,
        `El centro de costo ${centro_costo} no existe en el maestro.`,
        "Corregir el centro de costo con el solicitante.",
      )
    }
    if (centro.subareas.includes(subarea)) return sinHallazgos
    return bloqueo(
      this.codigo,
      `La subárea ${subarea} no pertenece a ${centro_costo} (válidas: ${centro.subareas.join(", ")}).`,
      "Corregir la subárea con el solicitante.",
    )
  }
}

export class OrdenNoRetroactiva implements ReglaControl {
  readonly codigo = "RC8"

  evaluar({ paquete }: ContextoControl): EvaluacionRegla {
    const { factura, solicitud } = paquete
    if (!factura || factura.fecha >= solicitud.fecha_solicitud) return sinHallazgos
    return {
      ...confirmacion(
        this.codigo,
        `La factura ${factura.numero} (${factura.fecha}) es anterior a la solicitud (${solicitud.fecha_solicitud}): la OC es retroactiva.`,
        "Confirmar la creación; quedará marcada como retroactiva en el log de control.",
      ),
      retroactiva: true,
    }
  }
}
