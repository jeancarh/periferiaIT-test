import type { Maestros } from "../maestros"
import type { Paquete } from "../paquete"
import { AprobacionDeAprobadorAutorizado, AprobacionPosteriorASolicitud, MontoDentroDelTope } from "./reglas-aprobacion"
import { OrdenNoRetroactiva, SubareaPerteneceAlCentro } from "./reglas-imputacion"
import { CantidadPorPrecioCuadraConTotal, CotizacionCoincideConSolicitud } from "./reglas-montos"
import { CondicionesPagoInformadas, IndicadorIvaInformado, ProveedorRegistradoActivo } from "./reglas-proveedor"
import type { ContextoControl, Derivados, ReglaControl, ResultadoValidacion } from "./tipos"

export class MotorControles {
  constructor(private readonly reglas: readonly ReglaControl[]) {}

  evaluar(paquete: Paquete, maestros: Maestros): ResultadoValidacion {
    const contexto: ContextoControl = {
      paquete,
      maestros,
      proveedor: maestros.buscarProveedor(paquete.solicitud.proveedor_nit, paquete.solicitud.proveedor_nombre),
      centro: maestros.buscarCentroCosto(paquete.solicitud.centro_costo),
    }
    const evaluaciones = this.reglas.map((regla) => regla.evaluar(contexto))
    const hallazgos = evaluaciones.flatMap((evaluacion) => evaluacion.hallazgos)
    const bloqueos = hallazgos.filter((hallazgo) => hallazgo.tipo === "bloqueo")
    return {
      apta: bloqueos.length === 0,
      bloqueos,
      confirmaciones: hallazgos.filter((hallazgo) => hallazgo.tipo === "confirmacion"),
      derivados: evaluaciones.reduce<Derivados>((acumulado, evaluacion) => ({ ...acumulado, ...evaluacion.derivados }), {}),
      retroactiva: evaluaciones.some((evaluacion) => evaluacion.retroactiva === true),
    }
  }
}

export const reglasDeControl: readonly ReglaControl[] = [
  new ProveedorRegistradoActivo(),
  new AprobacionDeAprobadorAutorizado(),
  new MontoDentroDelTope(),
  new SubareaPerteneceAlCentro(),
  new CotizacionCoincideConSolicitud(),
  new IndicadorIvaInformado(),
  new CondicionesPagoInformadas(),
  new OrdenNoRetroactiva(),
  new AprobacionPosteriorASolicitud(),
  new CantidadPorPrecioCuadraConTotal(),
]

export const crearMotorControles = (): MotorControles => new MotorControles(reglasDeControl)
