import { useEffect, useRef } from "react"
import type { EntradaChat } from "../../domain/estado-chat"
import { MessageBubble } from "./MessageBubble"
import { ThinkingIndicator } from "./ThinkingIndicator"

type Props = {
  readonly entradas: readonly EntradaChat[]
  readonly pensando: boolean
}

export const MessageList = ({ entradas, pensando }: Props) => {
  const final = useRef<HTMLDivElement>(null)

  useEffect(() => {
    final.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [entradas.length, pensando])

  return (
    <div className="mensajes" role="log" aria-live="polite">
      {entradas.map((entrada) => (
        <MessageBubble key={entrada.id} entrada={entrada} />
      ))}
      {pensando && <ThinkingIndicator />}
      <div ref={final} />
    </div>
  )
}
