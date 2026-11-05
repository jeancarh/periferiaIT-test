import type { LlamadaHerramienta } from "../../domain/chat"

type Props = {
  readonly llamada: LlamadaHerramienta
}

export const ToolCallCard = ({ llamada }: Props) => (
  <details className={`tool-call ${llamada.ok ? "tool-call--ok" : "tool-call--error"}`}>
    <summary>
      <span className="tool-call__estado" aria-label={llamada.ok ? "correcta" : "con error"}>
        {llamada.ok ? "✓" : "✕"}
      </span>
      <code className="tool-call__nombre">{llamada.nombre}</code>
      <span className="tool-call__resumen">{llamada.resumen}</span>
    </summary>
    <pre className="tool-call__argumentos">{JSON.stringify(llamada.argumentos, null, 2)}</pre>
  </details>
)
