import { useState, type FormEvent, type KeyboardEvent } from "react"

type Props = {
  readonly deshabilitado: boolean
  readonly onEnviar: (texto: string) => void
}

export const Composer = ({ deshabilitado, onEnviar }: Props) => {
  const [texto, setTexto] = useState("")

  const enviar = () => {
    if (!texto.trim() || deshabilitado) return
    onEnviar(texto)
    setTexto("")
  }

  const alEnviar = (evento: FormEvent) => {
    evento.preventDefault()
    enviar()
  }

  const alTeclear = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault()
      enviar()
    }
  }

  return (
    <form className="composer" onSubmit={alEnviar}>
      <textarea
        className="composer__entrada"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={alTeclear}
        placeholder='Escribe, por ejemplo: procesa la solicitud "sol-004"'
        rows={2}
        maxLength={4000}
        aria-label="Mensaje para el agente"
      />
      <button type="submit" className="boton boton--primario" disabled={deshabilitado || !texto.trim()}>
        Enviar
      </button>
    </form>
  )
}
