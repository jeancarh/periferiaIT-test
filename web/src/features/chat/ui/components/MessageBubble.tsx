import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { EntradaChat } from "../../domain/estado-chat"
import { ToolCallCard } from "./ToolCallCard"

type Props = {
  readonly entrada: EntradaChat
}

export const MessageBubble = ({ entrada }: Props) => (
  <article className={`mensaje mensaje--${entrada.autor}${entrada.pideConfirmacion ? " mensaje--confirmacion" : ""}`}>
    {entrada.llamadas.length > 0 && (
      <section className="mensaje__herramientas" aria-label="Llamadas a herramientas">
        {entrada.llamadas.map((llamada) => (
          <ToolCallCard key={llamada.id} llamada={llamada} />
        ))}
      </section>
    )}
    {entrada.pideConfirmacion && <p className="mensaje__etiqueta">Requiere tu confirmación</p>}
    <div className="mensaje__texto">
      {entrada.autor === "agente" ? <Markdown remarkPlugins={[remarkGfm]}>{entrada.texto}</Markdown> : <p>{entrada.texto}</p>}
    </div>
  </article>
)
