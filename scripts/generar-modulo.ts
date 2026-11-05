import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { escribirArchivo } from "../src/infrastructure/fs/archivos"
import { generarContenidoModulo } from "./modulo"

const directorio = fileURLToPath(new URL("..", import.meta.url))

for (const [ruta, contenido] of Object.entries(await generarContenidoModulo(directorio))) {
  await escribirArchivo(join(directorio, ruta), contenido)
  console.log(`✔ ${ruta}`)
}
