import { z } from "zod"
import type { Hallazgo } from "../domain/controles/tipos"
import { moduloOcPara } from "../composition/modulo-oc"
import { formatearMonto } from "../shared/texto"
import { definirHerramienta, type ContextoHerramienta } from "./definir-herramienta"

const modulo = (ctx: ContextoHerramienta) => moduloOcPara(ctx.directory)
const bitacora = (ctx: ContextoHerramienta) => modulo(ctx).bitacora

const caso = z
  .string()
  .regex(/^[a-z0-9-]+$/, "solo minúsculas, números y guiones")
  .describe("Nombre de la carpeta del caso en fixtures/reto-03/solicitudes/, por ejemplo sol-001")

const codigos = (hallazgos: readonly Hallazgo[]): string =>
  hallazgos.length > 0 ? hallazgos.map((hallazgo) => hallazgo.codigo).join(", ") : "ninguna"

export const listar_casos = definirHerramienta({
  nombre: "oc_listar_casos",
  description: "Lista los casos de solicitud de compra disponibles para procesar.",
  args: {},
  bitacora,
  ejecutar: (_args, ctx) => modulo(ctx).consultarPaquetes.listar(),
  resumir: ({ casos }) => `${casos.length} casos: ${casos.join(", ")}`,
})

export const leer_paquete = definirHerramienta({
  nombre: "oc_leer_paquete",
  description: "Lee y normaliza el correo, la solicitud, la cotización, la aprobación y la factura de un caso.",
  args: { caso },
  bitacora,
  ejecutar: (args, ctx) => modulo(ctx).consultarPaquetes.leer(args.caso),
  resumir: ({ solicitud, faltantes, factura }) =>
    `${solicitud.solicitud_id} · ${solicitud.proveedor_nombre} · ${formatearMonto(solicitud.valor_total, solicitud.moneda)}` +
    ` · faltantes: ${faltantes.length > 0 ? faltantes.join(", ") : "ninguno"}${factura ? ` · factura ${factura.numero}` : ""}`,
})

export const validar = definirHerramienta({
  nombre: "oc_validar",
  description: "Aplica los controles RC1 a RC10 contra los maestros y devuelve bloqueos, confirmaciones, derivados y si es retroactiva.",
  args: { caso },
  bitacora,
  ejecutar: (args, ctx) => modulo(ctx).validarPaquete.ejecutar(args.caso),
  resumir: (validacion) =>
    `${validacion.apta ? "apta" : "no apta"} · bloqueos: ${codigos(validacion.bloqueos)} · confirmaciones: ${codigos(validacion.confirmaciones)}` +
    ` · retroactiva: ${validacion.retroactiva ? "sí" : "no"}`,
})

export const construir_payload = definirHerramienta({
  nombre: "oc_construir_payload",
  description: "Construye la orden de compra tal como quedaría en SAP y guarda la trazabilidad de cada valor.",
  args: { caso },
  bitacora,
  ejecutar: (args, ctx) => modulo(ctx).construirPayload.ejecutar(args.caso),
  resumir: ({ orden, ruta_trazabilidad }) =>
    `${orden.proveedor.nombre} · ${orden.posiciones.length} posición(es) · excepciones: ${orden.excepciones.length} · ${ruta_trazabilidad}`,
})

export const generar_evidencia = definirHerramienta({
  nombre: "oc_generar_evidencia",
  description: "Genera la evidencia del correo de aprobación en txt y pdf con su huella sha256.",
  args: { caso },
  bitacora,
  ejecutar: (args, ctx) => modulo(ctx).generarEvidencia.ejecutar(args.caso),
  resumir: ({ ruta, ruta_pdf, sha256 }) => `${ruta} · ${ruta_pdf} · sha256 ${sha256.slice(0, 12)}…`,
})

export const crear = definirHerramienta({
  nombre: "oc_crear",
  description: "Crea la orden de compra en SAP si la solicitud es apta y, cuando hay confirmaciones, solo con confirmación explícita del usuario.",
  args: {
    caso,
    confirmado: z
      .boolean()
      .default(false)
      .describe("true solo si el usuario confirmó explícitamente en su último mensaje las excepciones informadas"),
    payload: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Opcional. Si se envía, debe ser exactamente la orden devuelta por oc_construir_payload"),
  },
  bitacora,
  ejecutar: (args, ctx) =>
    modulo(ctx).crearOrden.ejecutar({
      caso: args.caso,
      confirmado: args.confirmado,
      confirmacionHumana: ctx.confirmacionHumana === true,
      payload: args.payload,
    }),
  resumir: ({ numero_oc, idempotente, retroactiva }) =>
    `OC ${numero_oc}${idempotente ? " (ya existía, idempotente)" : " creada"}${retroactiva ? " · retroactiva" : ""}`,
})
