import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { RUTA_CONOCIMIENTO, RUTA_PROMPT } from "../src/agent/prompt-sistema"

export const RUTA_AGENTE_MODULO = join("modulo", "agent.md")
export const RUTA_SKILL_MODULO = join("modulo", "skill", "ordenes-compra", "SKILL.md")
export const RUTA_HERRAMIENTAS_MODULO = join("modulo", "tools", "oc.ts")

const FRONTMATTER_AGENTE = [
  "---",
  "description: Agente que valida paquetes de compra contra los maestros y crea órdenes de compra en SAP con confirmación humana.",
  "mode: primary",
  "permission:",
  "  edit: deny",
  "  bash: deny",
  "---",
].join("\n")

const FRONTMATTER_SKILL = [
  "---",
  "name: ordenes-compra",
  "description: Conocimiento del proceso de órdenes de compra de Periferia, controles RC1 a RC10, reglas del payload SAP y evidencia de aprobación.",
  "---",
].join("\n")

export const HERRAMIENTAS_MODULO = 'export * from "../../src/tools/oc"\n'

export const generarContenidoModulo = async (directorio: string): Promise<Record<string, string>> => {
  const [prompt, conocimiento] = await Promise.all([
    readFile(join(directorio, RUTA_PROMPT), "utf8"),
    readFile(join(directorio, RUTA_CONOCIMIENTO), "utf8"),
  ])
  return {
    [RUTA_AGENTE_MODULO]: `${FRONTMATTER_AGENTE}\n\n${prompt.trim()}\n`,
    [RUTA_SKILL_MODULO]: `${FRONTMATTER_SKILL}\n\n${conocimiento.trim()}\n`,
    [RUTA_HERRAMIENTAS_MODULO]: HERRAMIENTAS_MODULO,
  }
}
