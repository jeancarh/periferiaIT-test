import { afterEach, describe, expect, it, vi } from "vitest"
import { ErrorProveedorLlm } from "../../src/llm/adapter"
import { OpenAiCompatibleLlm } from "../../src/llm/openai-compatible"

const llm = new OpenAiCompatibleLlm({
  proveedor: "prueba",
  modelo: "modelo-prueba",
  urlBase: "https://llm.test/v1",
  apiKey: "clave-prueba",
  timeoutMs: 1_000,
})

const respuestaJson = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("OpenAiCompatibleLlm", () => {
  it("traduce llamadas a herramientas y conserva los metadatos del proveedor", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(
      respuestaJson({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [{ id: "c1", function: { name: "oc_validar", arguments: '{"caso":"sol-001"}' }, extra_content: { firma: "x" } }],
            },
          },
        ],
        usage: { total_tokens: 42 },
      }),
    )
    vi.stubGlobal("fetch", fetchFalso)

    const respuesta = await llm.enviar([{ rol: "user", contenido: "hola" }], [])

    expect(respuesta).toEqual({
      contenido: null,
      llamadas: [{ id: "c1", nombre: "oc_validar", argumentos: '{"caso":"sol-001"}', metadatosProveedor: { firma: "x" } }],
      tokens: 42,
    })
  })

  it("reenvía los metadatos del proveedor en el historial", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(respuestaJson({ choices: [{ message: { content: "ok" } }] }))
    vi.stubGlobal("fetch", fetchFalso)

    await llm.enviar(
      [{ rol: "assistant", contenido: null, llamadas: [{ id: "c1", nombre: "oc_validar", argumentos: "{}", metadatosProveedor: { firma: "x" } }] }],
      [],
    )

    const cuerpo = JSON.parse(String(fetchFalso.mock.calls[0]?.[1]?.body))
    expect(cuerpo.messages[0].tool_calls[0].extra_content).toEqual({ firma: "x" })
  })

  it("reintenta ante un 503 y luego responde", async () => {
    vi.useFakeTimers()
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce(respuestaJson({}, 503))
      .mockResolvedValueOnce(respuestaJson({ choices: [{ message: { content: "listo" } }] }))
    vi.stubGlobal("fetch", fetchFalso)

    const pendiente = llm.enviar([{ rol: "user", contenido: "hola" }], [])
    await vi.runAllTimersAsync()

    expect((await pendiente).contenido).toBe("listo")
    expect(fetchFalso).toHaveBeenCalledTimes(2)
  })

  it("convierte un timeout en un error legible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("tiempo", "TimeoutError")))

    await expect(llm.enviar([{ rol: "user", contenido: "hola" }], [])).rejects.toEqual(
      new ErrorProveedorLlm("El modelo no respondió en 1 segundos."),
    )
  })

  it("no expone la clave en los errores de credencial", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaJson({}, 401)))

    const error = await llm.enviar([{ rol: "user", contenido: "hola" }], []).catch((causa: unknown) => causa)

    expect(error).toBeInstanceOf(ErrorProveedorLlm)
    expect(String(error)).not.toContain("clave-prueba")
  })
})
