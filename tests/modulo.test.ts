import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { generarContenidoModulo } from "../scripts/modulo"
import * as herramientasModulo from "../modulo/tools/oc"
import * as herramientasApp from "../src/tools/oc"

const directorio = resolve(import.meta.dirname, "..")

describe("modulo reutilizable", () => {
  it("está sincronizado con el prompt, el conocimiento y las herramientas de la aplicación", async () => {
    const esperado = await generarContenidoModulo(directorio)

    for (const [ruta, contenido] of Object.entries(esperado)) {
      expect(await readFile(join(directorio, ruta), "utf8"), `${ruta} desincronizado: ejecuta npm run modulo`).toBe(contenido)
    }
  })

  it("expone exactamente las mismas herramientas que usa el servidor", () => {
    expect(Object.keys(herramientasModulo).sort()).toEqual(Object.keys(herramientasApp).sort())
    expect(herramientasModulo.crear).toBe(herramientasApp.crear)
  })
})
