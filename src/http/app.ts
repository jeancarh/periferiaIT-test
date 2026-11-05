import express, { type ErrorRequestHandler, type Express } from "express"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import type { Agente } from "../agent/agente"

export type DependenciasHttp = {
  readonly agente: Agente
  readonly salud: { readonly provider: string; readonly model: string }
  readonly rutaWeb: string | null
}

const SolicitudChatSchema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/, "sessionId inválido"),
  message: z.string().trim().min(1, "el mensaje está vacío").max(4_000, "el mensaje supera 4000 caracteres"),
})

const manejarError: ErrorRequestHandler = (_error, _req, res, _next) => {
  res.status(500).json({ error: "Ocurrió un error interno. Intenta de nuevo." })
}

export const crearApp = ({ agente, salud, rutaWeb }: DependenciasHttp): Express => {
  const app = express()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "32kb" }))

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, provider: salud.provider, model: salud.model })
  })

  app.post("/api/chat", async (req, res) => {
    const solicitud = SolicitudChatSchema.safeParse(req.body)
    if (!solicitud.success) {
      res.status(400).json({ error: solicitud.error.issues.map((issue) => issue.message).join("; ") })
      return
    }
    res.json(await agente.responder(solicitud.data.sessionId, solicitud.data.message))
  })

  app.get("/api/sessions/:id", async (req, res) => {
    const turnos = await agente.historial(req.params.id)
    if (!turnos) {
      res.status(404).json({ error: "La sesión no existe." })
      return
    }
    res.json({ sessionId: req.params.id, turnos })
  })

  if (rutaWeb && existsSync(rutaWeb)) {
    app.use(express.static(rutaWeb))
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next()
      res.sendFile(join(rutaWeb, "index.html"))
    })
  }

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ruta no encontrada." })
  })
  app.use(manejarError)
  return app
}
