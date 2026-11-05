import type { ChatGateway } from "../domain/chat"
import { useChat, type ProveedorSesion } from "../application/use-chat"
import { Composer } from "./components/Composer"
import { ConfirmBanner } from "./components/ConfirmBanner"
import { MessageList } from "./components/MessageList"
import { Suggestions } from "./components/Suggestions"

const SUGERENCIAS = [
  'Procesa la solicitud "sol-004". Muéstrame la OC como quedaría en SAP, qué validaciones pasó y cuáles no, y no la crees hasta que yo lo confirme.',
  "Procesa la solicitud sol-001 y crea la OC si todo está en orden.",
  "¿Por qué no se puede crear la OC de sol-003?",
  "Procesa sol-005 y dime si es retroactiva.",
]

const CONFIRMAR = "Confirmo, procede con la creación de la OC."
const RECHAZAR = "No confirmo. No crees la OC."

type Props = {
  readonly gateway: ChatGateway
  readonly sesion: ProveedorSesion
}

export const ChatContainer = ({ gateway, sesion }: Props) => {
  const { estado, servicio, enviar, reiniciar } = useChat(gateway, sesion)
  const vacio = estado.entradas.length === 0

  return (
    <div className="chat">
      <header className="chat__encabezado">
        <div>
          <h1 className="chat__titulo">Agente de Órdenes de Compra</h1>
          <p className="chat__subtitulo">
            {servicio ? `${servicio.provider} · ${servicio.model}` : "Conectando con el servidor…"} · SAP simulado
          </p>
        </div>
        <button type="button" className="boton" onClick={reiniciar} disabled={estado.pensando}>
          Nueva sesión
        </button>
      </header>

      <main className="chat__cuerpo">
        {vacio ? <Suggestions sugerencias={SUGERENCIAS} onElegir={enviar} /> : <MessageList entradas={estado.entradas} pensando={estado.pensando} />}
      </main>

      <footer className="chat__pie">
        {estado.esperandoConfirmacion && (
          <ConfirmBanner deshabilitado={estado.pensando} onConfirmar={() => enviar(CONFIRMAR)} onRechazar={() => enviar(RECHAZAR)} />
        )}
        <Composer deshabilitado={estado.pensando} onEnviar={enviar} />
      </footer>
    </div>
  )
}
