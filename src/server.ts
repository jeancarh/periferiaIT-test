import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Agente } from "./agent/agente"
import { CatalogoHerramientas } from "./agent/catalogo-herramientas"
import { PresupuestoDiario } from "./agent/presupuesto-diario"
import { cargarPromptSistema } from "./agent/prompt-sistema"
import { cargarConfiguracion } from "./config"
import { crearApp } from "./http/app"
import { SesionesEnMemoria } from "./infrastructure/memoria/sesiones-en-memoria"
import { crearLlm } from "./llm/fabrica"
import * as oc from "./tools/oc"

const directorio = fileURLToPath(new URL("..", import.meta.url))
const configuracion = cargarConfiguracion()

const llm = crearLlm({
  proveedor: configuracion.LLM_PROVIDER,
  modelo: configuracion.LLM_MODEL,
  timeoutMs: configuracion.LLM_TIMEOUT_MS,
  entorno: process.env,
})

const agente = new Agente({
  llm,
  herramientas: new CatalogoHerramientas({ oc }),
  sesiones: new SesionesEnMemoria(configuracion.AGENT_MAX_SESSIONS),
  presupuesto: new PresupuestoDiario({
    maxPeticiones: configuracion.AGENT_MAX_DAILY_REQUESTS,
    maxTokens: configuracion.AGENT_MAX_DAILY_TOKENS,
  }),
  promptSistema: await cargarPromptSistema(directorio),
  directorio,
  limites: {
    maxIteraciones: configuracion.AGENT_MAX_ITERATIONS,
    maxTokensSesion: configuracion.AGENT_MAX_SESSION_TOKENS,
  },
})

const app = crearApp({
  agente,
  salud: { provider: llm.proveedor, model: llm.modelo },
  rutaWeb: configuracion.NODE_ENV === "production" ? join(directorio, "dist", "web") : null,
})

app.listen(configuracion.PORT, () => {
  console.log(`Agente de órdenes de compra escuchando en http://localhost:${configuracion.PORT} (${llm.proveedor} · ${llm.modelo})`)
})
