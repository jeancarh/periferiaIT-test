import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import type { ChatGateway, EstadoServicio } from "../domain/chat"
import { estadoInicial, reducirChat } from "../domain/estado-chat"

export type ProveedorSesion = {
  readonly actual: () => string
  readonly renovar: () => string
}

const mensajeDe = (error: unknown): string =>
  error instanceof Error ? error.message : "Ocurrió un error inesperado. Intenta de nuevo."

export const useChat = (gateway: ChatGateway, sesion: ProveedorSesion) => {
  const [estado, despachar] = useReducer(reducirChat, estadoInicial)
  const [servicio, setServicio] = useState<EstadoServicio | null>(null)
  const sessionId = useRef(sesion.actual())
  const contador = useRef(0)

  useEffect(() => {
    gateway.salud().then(setServicio, () => setServicio(null))
    gateway.historial(sessionId.current).then(
      (turnos) => turnos.length > 0 && despachar({ tipo: "restaurado", turnos }),
      () => undefined,
    )
  }, [gateway])

  const enviar = useCallback(
    async (texto: string) => {
      const mensaje = texto.trim()
      if (!mensaje || estado.pensando) return
      const id = `t${++contador.current}`
      despachar({ tipo: "enviado", id, texto: mensaje })
      try {
        despachar({ tipo: "respondido", id, respuesta: await gateway.enviar(sessionId.current, mensaje) })
      } catch (error) {
        despachar({ tipo: "fallido", id, error: mensajeDe(error) })
      }
    },
    [gateway, estado.pensando],
  )

  const reiniciar = useCallback(() => {
    sessionId.current = sesion.renovar()
    despachar({ tipo: "reiniciado" })
  }, [sesion])

  return { estado, servicio, enviar, reiniciar }
}
