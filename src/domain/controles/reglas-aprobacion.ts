import { fechaCalendario } from "../../shared/fechas"
import { formatearMonto } from "../../shared/texto"
import { buscarAprobador } from "../maestros"
import { bloqueo, confirmacion, sinHallazgos, type ContextoControl, type EvaluacionRegla, type ReglaControl } from "./tipos"

export class AprobacionDeAprobadorAutorizado implements ReglaControl {
  readonly codigo = "RC2"

  evaluar({ paquete, centro }: ContextoControl): EvaluacionRegla {
    const { aprobacion, solicitud } = paquete
    if (!aprobacion) {
      return bloqueo(
        this.codigo,
        "El paquete no trae correo de aprobación.",
        "Pedir al solicitante el correo de aprobación de su líder.",
      )
    }
    if (!aprobacion.aprobado) {
      return bloqueo(
        this.codigo,
        `El correo de ${aprobacion.de} no contiene la palabra "Aprobado".`,
        "Pedir al líder una aprobación explícita.",
      )
    }
    if (!centro || !buscarAprobador(centro, aprobacion.de)) {
      const autorizados = centro?.aprobadores.map((aprobador) => aprobador.email).join(", ") ?? "ninguno"
      return bloqueo(
        this.codigo,
        `${aprobacion.de} no es aprobador del centro de costo ${solicitud.centro_costo}.`,
        `Pedir la aprobación a un aprobador autorizado de ${solicitud.centro_costo}: ${autorizados}.`,
      )
    }
    return sinHallazgos
  }
}

export class MontoDentroDelTope implements ReglaControl {
  readonly codigo = "RC3"

  evaluar({ paquete, centro }: ContextoControl): EvaluacionRegla {
    const { aprobacion, solicitud } = paquete
    const aprobador = centro && aprobacion ? buscarAprobador(centro, aprobacion.de) : null
    if (!aprobador || solicitud.valor_total <= aprobador.tope) return sinHallazgos
    return bloqueo(
      this.codigo,
      `El valor ${formatearMonto(solicitud.valor_total, solicitud.moneda)} supera el tope de ${aprobador.nombre} (${formatearMonto(aprobador.tope, solicitud.moneda)}) en ${solicitud.centro_costo}.`,
      "Escalar la aprobación a un aprobador con tope suficiente.",
    )
  }
}

export class AprobacionPosteriorASolicitud implements ReglaControl {
  readonly codigo = "RC9"

  evaluar({ paquete }: ContextoControl): EvaluacionRegla {
    const { aprobacion, solicitud } = paquete
    if (!aprobacion) return sinHallazgos
    const fechaAprobacion = fechaCalendario(aprobacion.fecha)
    if (fechaAprobacion >= solicitud.fecha_solicitud) return sinHallazgos
    return confirmacion(
      this.codigo,
      `La aprobación (${fechaAprobacion}) es anterior a la solicitud (${solicitud.fecha_solicitud}).`,
      "Confirmar que la aprobación corresponde a esta solicitud.",
    )
  }
}
