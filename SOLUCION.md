# Solución — Agente de Órdenes de Compra SAP

## 1. Problema en una frase

La analista administrativa digita a mano en SAP cada orden de compra y valida de memoria que proveedor, aprobador, montos e impuestos cumplan control; eso cuesta tiempo, genera errores que se corrigen en cierre contable y no deja medir cuántas OC se crean después de la factura. Le duele a la analista (tiempo), a contabilidad y auditoría (control) y a la dirección (medición).

## 2. Arquitectura

```
┌──────────────────────┐   HTTP    ┌──────────────────────────────────────────────────────────────┐
│ web/ (React)         │ ────────▶ │ src/http (Express)                                           │
│ features/chat        │ ◀──────── │   /api/chat · /api/sessions/:id · /api/health                │
│  domain · application│           └───────────────┬──────────────────────────────────────────────┘
│  infrastructure · ui │                           ▼
└──────────────────────┘           ┌──────────────────────────────────────────────────────────────┐
                                   │ src/agent  ciclo del agente, sesiones, catálogo de tools      │
                                   │   └─ puerto LlmAdapter ── src/llm (OpenAI-compatible: Gemini) │
                                   └───────────────┬──────────────────────────────────────────────┘
                                                   ▼
                                   ┌──────────────────────────────────────────────────────────────┐
                                   │ src/tools/oc.ts  adaptador de entrada: zod, { ok, data }      │
                                   └───────────────┬──────────────────────────────────────────────┘
                                                   ▼
                                   ┌──────────────────────────────────────────────────────────────┐
                                   │ src/application  casos de uso + puertos                       │
                                   │ src/domain       paquete, maestros, RC1–RC10, OrdenCompra     │
                                   └───────┬───────────────────────────────┬──────────────────────┘
                                           ▼                               ▼
                         src/infrastructure/fixtures              src/sap/mock.ts · infrastructure/salida
                         fixtures/ (solo lectura)                 out/ (escritura)
```

Es una arquitectura hexagonal. El dominio no conoce archivos, HTTP ni el modelo. Los casos de uso dependen de puertos (`PaqueteRepository`, `MaestrosRepository`, `SapAdapter`, `ArtefactosCaso`, `RegistroControl`, `BitacoraHerramientas`, `Reloj`) y la composición se hace en un solo lugar (`src/composition/modulo-oc.ts`). Cambiar el SAP simulado por el real, o los fixtures por SharePoint, es escribir un adaptador nuevo sin tocar dominio ni casos de uso.

| Responsabilidad | Ubicación |
|---|---|
| Comportamiento del agente | `agent/prompt.md` |
| Conocimiento del proceso | `src/knowledge/ordenes-compra.md` |
| Ejecución | `src/tools/oc.ts` → `src/application` → `src/domain` |
| Reglas de control | `src/domain/controles/` (una clase por regla) y `politica.ts` (tolerancias) |

El front sigue el mismo principio por feature: `domain` (tipos y reducer puro), `application` (`useChat`, que depende del puerto `ChatGateway`), `infrastructure` (cliente HTTP validado con zod) y `ui` (un container y componentes presentacionales).

## 3. Ciclo del agente

`src/agent/agente.ts`:

1. Agrega el mensaje del usuario a la sesión y envía al modelo el system prompt (prompt + conocimiento), el historial y las definiciones de herramientas generadas desde los esquemas zod.
2. Si el modelo pide herramientas, el catálogo valida los argumentos, ejecuta, registra en `out/log.jsonl` y devuelve el resultado al modelo. Se repite hasta que el modelo responde con texto.
3. **Tope de iteraciones** (`AGENT_MAX_ITERATIONS`, 25): al alcanzarlo, el agente responde con las herramientas ejecutadas y pide continuar.
4. **Presupuesto de consumo:** tokens por sesión (`AGENT_MAX_SESSION_TOKENS`) y un cupo diario de peticiones y tokens compartido por todas las sesiones (`AGENT_MAX_DAILY_REQUESTS`, `AGENT_MAX_DAILY_TOKENS`). Al agotarse, el turno se cierra con un mensaje claro sin llamar al modelo. Como el link es público, el cupo diario impide que alguien gaste la clave sin límite, aunque abra sesiones nuevas.
5. **Errores del proveedor** (timeout, 429, 5xx con dos reintentos y backoff): se traducen a lenguaje claro y la sesión sigue viva.
6. Los turnos de una misma sesión se serializan para que dos peticiones simultáneas no mezclen historial.

**Confirmación humana**, en dos capas:

- Las herramientas devuelven `requiere_confirmacion`. El ciclo toma el último valor del turno y lo expone como `needsConfirmation`; el front lo resalta con un banner de confirmar o rechazar.
- El servidor exige que la confirmación sea humana: `oc_crear` solo acepta `confirmado: true` si el turno anterior terminó con una confirmación pendiente (`confirmacionHumana` en el contexto de la herramienta). Si el modelo intenta confirmar por su cuenta en el mismo turno, la herramienta lo rechaza.

## 4. Elección del modelo

- **Proveedor y modelo:** Google Gemini `gemini-3.1-flash-lite` a través del endpoint compatible con OpenAI de Google AI Studio.
- **Por qué:** el trabajo de razonamiento pesado lo hacen las herramientas deterministas; el modelo solo orquesta y redacta, así que un modelo liviano basta, y es el de menor costo y latencia. Probé `gemini-3.5-flash`, pero en capa gratuita tiene un cupo de 20 peticiones diarias, que se agota con tres o cuatro casos. El adaptador `OpenAiCompatibleLlm` sirve igual para Groq, OpenRouter u OpenAI, así que cambiar de proveedor o de modelo es configuración (`LLM_PROVIDER`, `LLM_MODEL`).
- **Menos peticiones por caso:** el prompt pide agrupar las herramientas independientes en una misma respuesta (leer y validar; luego construir, generar la evidencia y crear). Así un caso se resuelve en 2 a 5 peticiones al modelo en lugar de 6 o 7.
- **Detalle técnico:** los modelos Gemini recientes devuelven una `thought_signature` por llamada a herramienta que hay que reenviar en el historial. El adaptador la conserva como metadato opaco del proveedor, sin que el ciclo del agente lo sepa.
- **Consumo medido con `gemini-3.1-flash-lite`:** `sol-001` de punta a punta, 4 peticiones y unos 13 000 tokens; `sol-004` con su confirmación, 5 peticiones y unos 18 000 tokens; `sol-003` bloqueada, 2 peticiones y unos 5 000 tokens. La mayoría son tokens de entrada (prompt, conocimiento e historial).
- **Costo:** USD 0 en la capa gratuita. En capa paga: `tokens por caso × precio por token vigente del modelo`, que con un modelo flash-lite queda en el orden de un centavo de dólar o menos por caso. Además del cupo diario de la aplicación, en Google Cloud se configuran una alerta de presupuesto y un límite de cuota diaria de la API como tope duro.

## 5. Matriz de controles

Cada control es una clase que implementa `ReglaControl` y recibe un contexto con el paquete, los maestros, el proveedor y el centro de costo ya resueltos. `MotorControles` las ejecuta y separa bloqueos, confirmaciones, derivados y retroactividad. Agregar un control es agregar una clase a la lista, sin modificar el motor.

| Control | Implementación | Caso que lo prueba |
|---|---|---|
| RC1 | Proveedor por NIT normalizado (sin puntos ni DV) o por nombre normalizado (sin tildes ni puntuación) y `activo`. | `sol-002` |
| RC2 | Aprobación presente, "Aprobado" sin negación y remitente en `aprobadores` del centro. | `sol-003` |
| RC3 | `valor_total ≤ tope` del aprobador encontrado. | prueba unitaria |
| RC4 | Centro existente y subárea en su lista. | prueba unitaria |
| RC5 | Desviación relativa con tolerancia de 2 %; sin cotización también confirma. | `sol-004` |
| RC6 | Deriva `indicador_iva_default` del proveedor y pide confirmación. | `sol-006` |
| RC7 | Deriva `condiciones_pago_default` y solo informa. | `sol-006` |
| RC8 | Factura con fecha anterior a la solicitud: `retroactiva = true` y confirmación. | `sol-005` |
| RC9 | Fecha calendario de la aprobación ≥ fecha de solicitud. | prueba unitaria |
| RC10 | `|cantidad × valor_unitario − valor_total| ≤ 1`. | prueba unitaria |

**La más difícil fue RC1.** Las fuentes no coinciden en formato: la cotización trae `901.222.333-1`, la solicitud `901222333` y el nombre puede venir como "S.A.S." o "SAS". Las pruebas encontraron que una normalización ingenua convertía "S.A.S." en "s a s" y fallaba el match por nombre de `sol-006`, que no trae NIT.

## 6. Diseño del adaptador SAP real

**Opción elegida: OData `API_PURCHASEORDER_PROCESS_SRV`** (S/4HANA), expuesta vía SAP BTP o el gateway del cliente.

- Es REST y JSON, no necesita librerías propietarias como el RFC SDK ni conexión a nivel de red con el servidor de aplicaciones, y es la API que SAP mantiene y documenta como estable.
- Como la viabilidad no está confirmada, el puerto `SapAdapter` desacopla la decisión: si el cliente está en ECC, se implementa `BapiSapAdapter` con `BAPI_PO_CREATE1` (vía SAP Cloud Connector o un microservicio con el RFC SDK) sin tocar el agente.

**Mapeo del payload:**

| `OrdenCompra` | `A_PurchaseOrder` / `A_PurchaseOrderItem` |
|---|---|
| `sociedad` | `CompanyCode` |
| `organizacion_compras` | `PurchasingOrganization` (+ `PurchasingGroup` por configuración) |
| `proveedor.codigo_sap` | `Supplier` |
| `moneda` | `DocumentCurrency` |
| `condiciones_pago` | `PaymentTerms` |
| `referencia.solicitud_id` | `CorrespncExternalReference` (clave de idempotencia) |
| `posiciones[].numero` | `PurchaseOrderItem` |
| `posiciones[].descripcion` | `PurchaseOrderItemText` |
| `posiciones[].cantidad` / `unidad` | `OrderQuantity` / `PurchaseOrderQuantityUnit` |
| `posiciones[].precio_unitario` | `NetPriceAmount` |
| `posiciones[].indicador_iva` | `TaxCode` |
| `centro_costo` / `subarea` | Imputación `A_PurOrdAccountAssignment`: `CostCenter` (la subárea como `WBSElement` o campo de usuario, según configuración) |
| `aprobador` + evidencia | Anexo vía `API_CV_ATTACHMENT_SRV` con el PDF y su SHA-256 en la descripción |

**Autenticación y credenciales:** OAuth 2.0 client credentials contra BTP, o un usuario técnico con certificado X.509. Las credenciales viven en un gestor de secretos (Azure Key Vault o AWS Secrets Manager) y las lee solo el adaptador al arrancar. Nunca llegan al prompt, a las herramientas ni a los logs. El usuario técnico tiene solo el rol de creación de OC.

**Idempotencia y errores parciales:**

- Antes de crear, `buscarOrdenPorReferencia` filtra por `CorrespncExternalReference = solicitud_id`. Si existe, devuelve el número (el adaptador simulado ya implementa esta verificación).
- Reintentos con backoff solo ante errores de red y 5xx, y siempre repitiendo primero la consulta por referencia: una creación pudo completarse aunque la respuesta se haya perdido.
- Un error de negocio (4xx con mensajes `BAPIRET2`) no se reintenta. Se registra en `control.csv` con resultado `error_sap` y se le muestra a la analista con el mensaje de SAP.
- Si se crea la OC pero falla el anexo, la OC queda creada, el anexo se reintenta en cola y el control marca `evidencia_pendiente`.

**Plan B si no hay conexión:** el agente sigue haciendo todo hasta el payload validado y trazado, y produce un archivo listo para cargar: un CSV para LSMW o la plantilla de carga masiva de S/4 (Migration Cockpit), o una vista "lista para pegar" en el orden de los campos de ME21N. La analista pasa de digitar y validar a solo revisar y cargar, y el control y la medición de retroactivas se mantienen iguales.

## 7. Lectura del proceso

Para la dirección: una OC retroactiva no es un problema de digitación, es un problema de control. Cuando la factura llega antes que la OC, la compra ya se comprometió sin verificar proveedor, tope de aprobación ni precio contra cotización. La OC queda como un trámite para poder pagar, y el control preventivo se vuelve un registro después de los hechos.

Lo que propongo:

1. **Medir antes de prohibir.** `out/control.csv` marca cada OC retroactiva. Con un mes de datos se sabe el porcentaje, el valor y qué áreas y proveedores concentran el desvío.
2. **Política escalonada.** Tolerar retroactivas con marca por debajo de un umbral y con confirmación de la analista, como hace hoy el agente. Por encima del umbral, exigir aprobación adicional del director financiero.
3. **Cerrar la puerta en origen.** Comunicar a proveedores frecuentes que una factura sin número de OC se devuelve. Es el cambio con mayor efecto y menor costo.
4. **Quitar la excusa de la lentitud.** Si crear la OC toma minutos con el agente, desaparece la razón principal para saltarse el paso.

## 8. Decisiones y trade-offs

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Las herramientas reciben solo `caso` y el servidor recarga el paquete como fuente de verdad. | `{ caso, paquete }` y `{ caso, paquete, derivados }` como en la tabla del PRD. | Si el modelo transporta los datos, puede alterarlos (el riesgo de "arreglar un monto" de la sección 10). Con referencias desaparece esa superficie de ataque y se ahorran tokens. `oc_crear` acepta `payload` opcional, pero solo si coincide exactamente con el validado. |
| La confirmación humana se valida en el servidor (`confirmacionHumana`), no solo en el prompt. | Confiar en que el modelo pregunte antes de confirmar. | Un prompt es una instrucción, no un control. El servidor garantiza que `confirmado: true` solo llega después de un turno que pidió confirmación. |
| Adaptador OpenAI-compatible con `fetch` y zod. | SDK nativo de Google. | Una sola implementación sirve para Gemini, Groq u OpenRouter, sin dependencias extra, y la respuesta del proveedor se valida con zod en lugar de confiar en tipos `any`. |
| Una clase por control con un motor que las compone. | Una función grande de validación. | Abierto a extensión y cerrado a modificación: un control nuevo no toca los existentes y cada uno se prueba aislado. |
| Express sirve la API y el build del chat en un solo servicio. | Front en Vercel y API en otro host. | Una URL, sin CORS ni dos despliegues. Vercel serverless tampoco sirve para escribir en `out/`. |
| `modulo/` se genera desde las fuentes de la app y una prueba verifica que estén sincronizados. | Copiar los archivos a mano. | Evita copias divergentes entre la app y el módulo. |

## 9. Supuestos

- La OC se crea con el valor de la **solicitud**, que es lo que aprobó el líder, aunque la cotización difiera (`sol-004`: "Aprobado por 25 millones según la solicitud").
- Cuando no hay NIT en la solicitud, el nombre normalizado basta para identificar al proveedor.
- La fecha de aprobación se compara en el calendario de su propia zona horaria (`2026-08-26T18:45:00-05:00` es 26 de agosto).
- La unidad de medida se infiere del texto ("hora/horas" → `H`, "mensual" → `MES`, si no `UN`) y se traza como derivada.
- `confirmado_por` registra el rol `analista` porque no hay autenticación; en producción sería el usuario autenticado.
- La subárea viaja en la posición tal como la define el esquema de 7.4; su campo real en SAP depende de la configuración del cliente.

## 10. Cobertura

| Historia | Estado | Qué falta para producción |
|---|---|---|
| HU-1 Leer el paquete | Hecho | Leer `.xlsx`, `.pdf` y `.eml` binarios (P1, `oc_leer_excel` no implementado). |
| HU-2 Validar contra maestros | Hecho | Consultar maestros en SAP en tiempo real. |
| HU-3 Construir el payload | Hecho, con trazabilidad por campo | Varias posiciones por solicitud. |
| HU-4 Evidencia de aprobación | Hecho (P0 txt y P1 pdf) | Firma digital si auditoría la exige. |
| HU-5 Crear la OC en SAP simulado | Hecho, con idempotencia y `control.csv` | Adaptador real (sección 6). |
| HU-6 Manejo de errores | Hecho | Alertas operativas sobre `log.jsonl`. |
| Bonus `modulo/` | Hecho, con prueba de sincronía | — |

Verificación: 62 pruebas (Vitest) sobre controles, constructor de la orden, flujo de los seis casos, herramientas, ciclo del agente, adaptador LLM, estado del chat y sincronía del módulo; además typecheck estricto sin `any` y `demo.ts`.

## 11. Riesgos de producción

| Riesgo | Mitigación |
|---|---|
| Disponibilidad y cuota del proveedor del modelo (durante las pruebas hubo respuestas 503 por alta demanda y 429 por agotar el cupo diario gratuito). | Reintentos con backoff, mensajes claros, menos peticiones por caso y cambio de modelo o proveedor por configuración. En producción: plan pago con SLA y un modelo de respaldo. |
| El modelo afirma un valor que no salió de una herramienta. | Las herramientas son la única fuente; el prompt lo prohíbe; `oc_crear` recalcula la orden en el servidor y rechaza payloads alterados. |
| Plantillas de cotización y facturas reales más variadas que los fixtures. | Parsers aislados en infraestructura con pruebas por formato; si un campo no se lee, se pide confirmación en lugar de adivinar. |
| Uso abusivo del link público. | Tope de iteraciones por turno, tokens por sesión, cupo diario de peticiones y tokens, límite de tamaño de mensaje, y alerta de presupuesto más cuota diaria en Google Cloud. El cupo de la aplicación vive en memoria y se reinicia si el servicio se reinicia; por eso el tope duro es la cuota de Google. En producción: autenticación y rate limiting por usuario. |
| Estado en memoria y disco efímero. | Aceptable para la prueba. En producción: sesiones en Redis y control y órdenes en base de datos o directamente en SAP. |
| Credenciales SAP. | Gestor de secretos, usuario técnico de mínimo privilegio y rotación (sección 6). |
