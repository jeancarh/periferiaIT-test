import { bloqueo, confirmacion, sinHallazgos, type ContextoControl, type EvaluacionRegla, type ReglaControl } from "./tipos"

export class ProveedorRegistradoActivo implements ReglaControl {
  readonly codigo = "RC1"

  evaluar({ paquete, proveedor }: ContextoControl): EvaluacionRegla {
    const { proveedor_nombre, proveedor_nit } = paquete.solicitud
    const identificacion = proveedor_nit ? `${proveedor_nombre} (NIT ${proveedor_nit})` : proveedor_nombre
    if (!proveedor) {
      return bloqueo(
        this.codigo,
        `El proveedor ${identificacion} no existe en el maestro de proveedores.`,
        "Solicitar la creación del proveedor en SAP (RUT y certificación bancaria) antes de crear la OC.",
      )
    }
    if (!proveedor.activo) {
      return bloqueo(
        this.codigo,
        `El proveedor ${identificacion} está inactivo en el maestro.`,
        "Solicitar a compras la reactivación del proveedor o cotizar con un proveedor activo.",
      )
    }
    return sinHallazgos
  }
}

export class IndicadorIvaInformado implements ReglaControl {
  readonly codigo = "RC6"

  evaluar({ paquete, proveedor, maestros }: ContextoControl): EvaluacionRegla {
    if (paquete.solicitud.indicador_iva) return sinHallazgos
    if (!proveedor) {
      return confirmacion(
        this.codigo,
        "La solicitud no informa indicador de IVA y no hay proveedor del cual derivarlo.",
        "Pedir el indicador de IVA al solicitante.",
      )
    }
    const codigo = proveedor.indicador_iva_default
    const descripcion = maestros.buscarIndicadorIva(codigo)?.descripcion ?? "sin descripción en el maestro"
    return {
      ...confirmacion(
        this.codigo,
        `La solicitud no informa indicador de IVA; se propone ${codigo} (${descripcion}), el predeterminado del proveedor.`,
        `Confirmar el indicador de IVA ${codigo}.`,
      ),
      derivados: {
        indicador_iva: {
          valor: codigo,
          fuente: "maestro.proveedores",
          detalle: `indicador_iva_default de ${proveedor.nombre}`,
        },
      },
    }
  }
}

export class CondicionesPagoInformadas implements ReglaControl {
  readonly codigo = "RC7"

  evaluar({ paquete, proveedor, maestros }: ContextoControl): EvaluacionRegla {
    if (paquete.solicitud.condiciones_pago || !proveedor) return sinHallazgos
    const codigo = proveedor.condiciones_pago_default
    const descripcion = maestros.buscarCondicionPago(codigo)?.descripcion ?? "sin descripción en el maestro"
    return {
      hallazgos: [],
      derivados: {
        condiciones_pago: {
          valor: codigo,
          fuente: "maestro.proveedores",
          detalle: `${descripcion}, condición predeterminada de ${proveedor.nombre}`,
        },
      },
    }
  }
}
