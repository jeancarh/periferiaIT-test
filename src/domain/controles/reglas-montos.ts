import { formatearMonto, formatearPorcentaje } from "../../shared/texto"
import { TOLERANCIA_COTIZACION, TOLERANCIA_CUADRE_MONTOS } from "./politica"
import { bloqueo, confirmacion, sinHallazgos, type ContextoControl, type EvaluacionRegla, type ReglaControl } from "./tipos"

export class CotizacionCoincideConSolicitud implements ReglaControl {
  readonly codigo = "RC5"

  evaluar({ paquete }: ContextoControl): EvaluacionRegla {
    const { cotizacion, solicitud } = paquete
    if (!cotizacion) {
      return confirmacion(
        this.codigo,
        "El paquete no trae cotización del proveedor.",
        "Confirmar que se crea la OC sin cotización o pedirla al proveedor.",
      )
    }
    const desviacion = Math.abs(cotizacion.total - solicitud.valor_total) / solicitud.valor_total
    if (desviacion <= TOLERANCIA_COTIZACION) return sinHallazgos
    return confirmacion(
      this.codigo,
      `La cotización suma ${formatearMonto(cotizacion.total, cotizacion.moneda)} y la solicitud ${formatearMonto(solicitud.valor_total, solicitud.moneda)} (diferencia ${formatearPorcentaje(desviacion)}, tolerancia ${formatearPorcentaje(TOLERANCIA_COTIZACION)}).`,
      "Confirmar el valor de la solicitud o pedir una cotización actualizada; la OC se crea con el valor de la solicitud.",
    )
  }
}

export class CantidadPorPrecioCuadraConTotal implements ReglaControl {
  readonly codigo = "RC10"

  evaluar({ paquete }: ContextoControl): EvaluacionRegla {
    const { cantidad, valor_unitario, valor_total, moneda } = paquete.solicitud
    const calculado = cantidad * valor_unitario
    if (Math.abs(calculado - valor_total) <= TOLERANCIA_CUADRE_MONTOS) return sinHallazgos
    return bloqueo(
      this.codigo,
      `Cantidad × valor unitario da ${formatearMonto(calculado, moneda)} y el valor total es ${formatearMonto(valor_total, moneda)}.`,
      "Corregir la cantidad, el valor unitario o el total con el solicitante.",
    )
  }
}
