# Agente de Órdenes de Compra SAP

Agente conversacional que lee el paquete de una solicitud de compra, lo valida contra los maestros (RC1–RC10), construye la orden de compra, genera la evidencia de aprobación y la crea en un SAP simulado con confirmación humana.

- **Link de prueba:** https://periferia-oc-agent.onrender.com
- **Planteamiento de la solución:** [SOLUCION.md](SOLUCION.md)

## Requisitos

- Node 22 o superior (también corre con Bun 1.3).
- Una API key de Google AI Studio (capa gratuita) para el modo conversacional. La demo no la necesita.

## Arranque local

```bash
cp .env.example .env
npm install
npm run dev
```

`npm run dev` levanta la API en `http://localhost:3000` y el chat en `http://localhost:5173`, con proxy de `/api` hacia la API.

## Demo sin modelo

```bash
npm install && npm run demo
```

También funciona `bun install && bun run demo.ts`. Limpia `out/`, procesa los seis casos llamando directamente a las herramientas, muestra la idempotencia de `sol-001` y la creación de `sol-004` tras confirmación explícita.

## Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `LLM_PROVIDER` | `gemini` | Proveedor del modelo: `gemini` o `groq`. |
| `LLM_MODEL` | según proveedor | Modelo a usar. Para Gemini, `gemini-3.1-flash-lite`. |
| `GEMINI_API_KEY` | — | Clave de Google AI Studio. Solo en el servidor. |
| `GROQ_API_KEY` | — | Clave de Groq, si se usa ese proveedor. |
| `LLM_TIMEOUT_MS` | `30000` | Timeout por llamada al modelo. |
| `AGENT_MAX_ITERATIONS` | `25` | Tope de iteraciones herramienta → modelo por turno. |
| `AGENT_MAX_SESSION_TOKENS` | `150000` | Presupuesto de tokens por sesión. |
| `AGENT_MAX_DAILY_REQUESTS` | `300` | Cupo diario de peticiones al modelo entre todas las sesiones. |
| `AGENT_MAX_DAILY_TOKENS` | `3000000` | Cupo diario de tokens entre todas las sesiones. |
| `PORT` | `3000` | Puerto HTTP. |

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | API y chat en modo desarrollo. |
| `npm run demo` | Ejecuta las herramientas sobre los seis casos sin modelo. |
| `npm test` | Pruebas unitarias e integración (Vitest). |
| `npm run typecheck` | Verificación de tipos. |
| `npm run build` | Compila el chat a `dist/web`. |
| `npm start` | Servidor de producción: API y chat en un solo puerto. |
| `npm run modulo` | Regenera `modulo/` desde el prompt, el conocimiento y las herramientas de la aplicación. |

## API

| Método | Ruta | Cuerpo / respuesta |
|---|---|---|
| `POST` | `/api/chat` | `{ sessionId, message }` → `{ reply, toolCalls[], needsConfirmation }` |
| `GET` | `/api/sessions/:id` | `{ sessionId, turnos[] }` con mensajes, respuestas y llamadas a herramientas. |
| `GET` | `/api/health` | `{ ok, provider, model }` sin exponer claves. |

`toolCalls[]` trae `{ id, nombre, argumentos, ok, resumen }`. `needsConfirmation` es `true` cuando una herramienta dejó una confirmación pendiente; el chat lo resalta y ofrece confirmar o rechazar.

## Herramientas

| Herramienta | Entrada | Salida |
|---|---|---|
| `oc_listar_casos` | `{}` | `{ casos[] }` |
| `oc_leer_paquete` | `{ caso }` | Paquete normalizado: correo, solicitud, cotización, aprobación, factura y faltantes. |
| `oc_validar` | `{ caso }` | `{ apta, bloqueos[], confirmaciones[], derivados, retroactiva, requiere_confirmacion }` |
| `oc_construir_payload` | `{ caso }` | `{ orden, ruta_trazabilidad, confirmaciones[], retroactiva }` |
| `oc_generar_evidencia` | `{ caso }` | `{ ruta, ruta_pdf, sha256 }` |
| `oc_crear` | `{ caso, confirmado?, payload? }` | `{ numero_oc, fecha, idempotente, retroactiva }` o `{ ok: false, error }` |

Todas devuelven JSON serializado con `{ ok: true, data, resumen }` o `{ ok: false, error, resumen }` y nunca lanzan excepciones.

## Artefactos generados

| Ruta | Contenido |
|---|---|
| `out/sap/ordenes.jsonl` | Órdenes creadas en el SAP simulado, numeradas desde `4500000001`. |
| `out/control.csv` | Cada intento de creación: creada, idempotente, bloqueada o pendiente. |
| `out/log.jsonl` | Cada llamada a herramienta con `{ ts, herramienta, caso, sesion, ok, resumen }`. |
| `out/<caso>/trazabilidad.json` | Fuente de cada valor del payload. |
| `out/<caso>/aprobacion.txt` y `.pdf` | Evidencia del correo de aprobación con su SHA-256. |

## Despliegue

`render.yaml` define un web service gratuito en Render: `npm ci --include=dev && npm run build` y `npm start`. `GEMINI_API_KEY` se configura en el panel de Render, nunca en el repositorio. Cada push a `main` se despliega automáticamente y `.github/workflows/ci.yml` corre typecheck, pruebas y demo.

En el plan gratuito el servicio se suspende tras un periodo de inactividad; la primera petición puede tardar cerca de un minuto.
