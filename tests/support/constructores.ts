import { Maestros } from "../../src/domain/maestros"
import type { Aprobacion, Paquete, Solicitud } from "../../src/domain/paquete"

export const maestrosDePrueba = (): Maestros =>
  new Maestros({
    proveedores: [
      {
        codigo_sap: "100234",
        nit: "900555111",
        nombre: "TecnoSuministros S.A.S.",
        condiciones_pago_default: "Z030",
        indicador_iva_default: "C1",
        activo: true,
      },
      {
        codigo_sap: "100402",
        nit: "901777888",
        nombre: "Consultores Ágiles S.A.S.",
        condiciones_pago_default: "Z030",
        indicador_iva_default: "C1",
        activo: false,
      },
    ],
    centrosCosto: [
      {
        centro_costo: "CC-1010",
        nombre: "Tecnología",
        subareas: ["Infraestructura", "Soporte"],
        aprobadores: [{ email: "lider@empresa.test", nombre: "Líder Tecnología", tope: 50_000_000 }],
      },
    ],
    indicadoresIva: [{ codigo: "C1", descripcion: "IVA 19%", tasa: 0.19 }],
    condicionesPago: [{ codigo: "Z030", descripcion: "30 días fecha factura", dias: 30 }],
  })

export const solicitudDePrueba = (cambios: Partial<Solicitud> = {}): Solicitud => ({
  solicitud_id: "SOL-TEST-001",
  solicitante: "Persona Solicitante",
  proveedor_nombre: "TecnoSuministros S.A.S.",
  proveedor_nit: "900555111",
  descripcion: "Licencias de software",
  centro_costo: "CC-1010",
  subarea: "Infraestructura",
  cantidad: 10,
  valor_unitario: 100_000,
  valor_total: 1_000_000,
  moneda: "COP",
  indicador_iva: "C1",
  condiciones_pago: "Z030",
  fecha_solicitud: "2026-08-20",
  ...cambios,
})

export const aprobacionDePrueba = (cambios: Partial<Aprobacion> = {}): Aprobacion => ({
  de: "lider@empresa.test",
  para: "solicitante@empresa.test",
  asunto: "RE: Solicitud",
  fecha: "2026-08-21T10:00:00-05:00",
  aprobado: true,
  texto: "Aprobado.",
  ...cambios,
})

export const paqueteDePrueba = (cambios: Partial<Paquete> = {}): Paquete => ({
  correo: { id: "correo-test", de: "solicitante@empresa.test", asunto: "Solicitud", fecha: "2026-08-20T09:00:00-05:00" },
  solicitud: solicitudDePrueba(),
  cotizacion: {
    numero: "COT-1",
    proveedor: "TecnoSuministros S.A.S.",
    nit: "900555111",
    total: 1_000_000,
    moneda: "COP",
    validez_hasta: "2026-09-20",
    texto: "",
  },
  aprobacion: aprobacionDePrueba(),
  factura: null,
  faltantes: [],
  ...cambios,
})
