import { rm } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import * as oc from "./src/tools/oc"
import type { ContextoHerramienta } from "./src/tools/definir-herramienta"

const directory = fileURLToPath(new URL(".", import.meta.url))
const contexto: ContextoHerramienta = { directory, sessionId: "demo" }
const contextoConfirmado: ContextoHerramienta = { ...contexto, confirmacionHumana: true }

const SalidaSchema = z.object({
  ok: z.boolean(),
  resumen: z.string(),
  data: z.object({ apta: z.boolean().optional(), casos: z.array(z.string()).optional() }).loose().optional(),
})

const interpretar = (salida: string) => SalidaSchema.parse(JSON.parse(salida))

const imprimir = (herramienta: string, salida: string) => {
  const { ok, resumen } = interpretar(salida)
  console.log(`  ${ok ? "✔" : "✖"} ${herramienta.padEnd(22)} ${resumen}`)
  return interpretar(salida)
}

const procesar = async (caso: string) => {
  console.log(`\n━━ ${caso}`)
  imprimir("oc_leer_paquete", await oc.leer_paquete.execute({ caso }, contexto))
  const validacion = imprimir("oc_validar", await oc.validar.execute({ caso }, contexto))
  if (validacion.data?.apta) {
    imprimir("oc_construir_payload", await oc.construir_payload.execute({ caso }, contexto))
    imprimir("oc_generar_evidencia", await oc.generar_evidencia.execute({ caso }, contexto))
  }
  imprimir("oc_crear", await oc.crear.execute({ caso }, contexto))
}

await rm(join(directory, "out"), { recursive: true, force: true })

const casos = interpretar(await oc.listar_casos.execute({}, contexto)).data?.casos ?? []
for (const caso of casos) await procesar(caso)

console.log("\n━━ sol-001 por segunda vez (idempotencia)")
imprimir("oc_crear", await oc.crear.execute({ caso: "sol-001" }, contexto))

console.log("\n━━ sol-004 tras confirmación explícita del usuario")
imprimir("oc_crear", await oc.crear.execute({ caso: "sol-004", confirmado: true }, contextoConfirmado))

console.log("\nArtefactos en out/: sap/ordenes.jsonl, control.csv, log.jsonl y una carpeta por caso.")
