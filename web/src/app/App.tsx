import { ChatContainer } from "../features/chat/ui/ChatContainer"
import { ChatGatewayHttp } from "../features/chat/infrastructure/chat-gateway-http"
import { obtenerIdentificadorSesion, renovarIdentificadorSesion } from "../features/chat/infrastructure/identificador-sesion"

const gateway = new ChatGatewayHttp()
const sesion = { actual: obtenerIdentificadorSesion, renovar: renovarIdentificadorSesion }

export const App = () => <ChatContainer gateway={gateway} sesion={sesion} />
