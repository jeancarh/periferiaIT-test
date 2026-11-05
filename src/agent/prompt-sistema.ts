import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const RUTA_PROMPT = join("agent", "prompt.md")
export const RUTA_CONOCIMIENTO = join("src", "knowledge", "ordenes-compra.md")

export const cargarPromptSistema = async (directorio: string): Promise<string> => {
  const [prompt, conocimiento] = await Promise.all([
    readFile(join(directorio, RUTA_PROMPT), "utf8"),
    readFile(join(directorio, RUTA_CONOCIMIENTO), "utf8"),
  ])
  return `${prompt.trim()}\n\n# Conocimiento del proceso\n\n${conocimiento.trim()}\n`
}
