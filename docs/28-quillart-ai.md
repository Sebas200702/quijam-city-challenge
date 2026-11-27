# Quillart AI: la conversación como puerta de entrada

Fecha: 27 nov 2026. Rama: `ccr-4d25b120-swburf`. Decisiones en [02-decisiones.md](02-decisiones.md).

## Idea

Quillart AI es **el punto de entrada** de residentes y visitantes: el conducto para conocer la ciudad y ejecutar acciones en la plataforma (inscribirse, publicar un evento, abrir una conversación, avisar a la ciudad). Detrás no hay un solo asistente genérico sino **agentes especializados, uno por apartado**, y un **orquestador** que decide cuál responde. La **voz es solo el conducto**: convierte habla en texto y texto en habla; no decide nada.

```
Voz (Web Speech API) o texto
        │
        ▼
Orquestador ──► un agente especializado (instrucciones propias + herramientas permitidas)
        │              │
        │              ├── Gemini con llamadas a funciones, o
        │              └── agente local determinista (respaldo)
        ▼
Respuesta + herramientas propuestas
        │
        ▼
Navegador ejecuta las herramientas con la sesión de la persona
   (lecturas de inmediato; acciones solo después de confirmar en una tarjeta)
```

## Agentes especializados

Contrato en `src/lib/assistant/assistant-types.ts` (`AssistantAgentId`) y nombres en `assistant-labels.ts`. Cada respuesta muestra qué agente contestó.

| Agente | Qué hace | Herramientas | ¿Pide confirmación? |
|---|---|---|---|
| Agente de Agenda (`agenda`) | Buscar eventos, ver detalle, inscribirse o cancelar, publicar un evento. | `search_events`, `get_event`, `register_for_event`, `unregister_from_event`, `create_event`, `open_page` | Sí, para inscribir, cancelar y publicar |
| Agente de Comunidad (`community`) | Leer el foro, abrir conversaciones y responder. | `list_threads`, `create_thread`, `reply_to_thread`, `open_page` | Sí, para publicar y responder |
| Agente de Lugares y naturaleza (`places`) | Espacios públicos, parques y naturaleza; cómo llegar. | `list_places`, `get_place`, `get_directions`, `search_events`, `open_page` | No (solo lectura) |
| Agente de Movilidad (`mobility`) | Rutas en el corredor, tarifa justa y alertas de arroyo; usa el Guía y el Decisor existentes. | `plan_route`, `get_directions`, `open_page` | No (solo lectura) |
| Agente de Reportes a la ciudad (`city_reports`) | Avisar de un problema en el espacio público (arroyo crecido, hueco, cable caído). Pasa por el triaje y llega a la cola de la ciudad. | `report_issue`, `list_threads`, `open_page` | Sí |
| Agente de tu Cuenta (`account`) | Mis inscripciones, mis publicaciones y perfil. | `my_registrations`, `open_page` | No (solo lectura) |

La lista final de herramientas de cada agente vive en `src/lib/assistant/assistant-agents.ts`. Un agente **solo ve sus herramientas**: el de Lugares no puede publicar en el foro aunque el modelo lo intente.

`open_page` solo sugiere una pantalla: la interfaz la muestra como botón y nunca navega sola.

## Orquestador (`src/lib/assistant/orchestrator.ts`)

Elige **un** agente por turno, en este orden:

1. **Continuación:** si el turno anterior quedó abierto (por ejemplo, el agente de Agenda pidió la fecha del evento), sigue el mismo agente.
2. **Palabras clave:** coincidencias sin tildes ("inscrib*", "evento", "foro", "arroyo", "ruta"…; ayudas en `assistant-text.ts`). Si un agente gana con claridad, responde ese.
3. **OpenJev:** si las palabras no alcanzan o empatan, una pregunta de elección (`choice`) con los seis agentes como opciones (ver [13-openjev.md](13-openjev.md)).
4. **Por defecto:** el agente de Agenda, que también sugiere los demás apartados.

La respuesta trae `routedBy` (`continuation`, `keywords`, `openjev` o `gemini`) para depurar y para la demo.

## Gemini con llamadas a funciones y respaldo local

- `gemini-agent.ts`: con `GEMINI_API_KEY`, Gemini recibe las instrucciones del agente elegido, el contexto (`now`, si hay sesión, nombre visible, si es visitante, pantalla de origen) y **solo** las declaraciones de funciones de ese agente. Devuelve texto y llamadas a herramientas.
- `local-agents.ts`: sin llave, si Gemini falla o se demora, un agente local determinista entiende las intenciones más comunes y propone las mismas herramientas. La conversación nunca queda muda.
- `POST /api/assistant` recibe `AssistantRequest` (mensajes + contexto) y responde `AssistantResponse` (agente, `routedBy`, texto, herramientas, `source: gemini | local`, sugerencias).

La llave de Gemini nunca sale del servidor.

## Ejecución de herramientas en el navegador

`tool-executor.ts` corre cada herramienta **en el navegador con la sesión de la persona**, contra la misma capa de comunidad que usan las pantallas (`src/lib/community/`). Consecuencias:

- El servidor del asistente nunca actúa en nombre de nadie: no tiene la llave de servicio en este flujo.
- RLS y el triaje aplican igual que si la persona usara el formulario. Un evento creado por conversación pasa por `POST /api/community/publish` y puede quedar retenido o rechazado.
- Los resultados vuelven al modelo resumidos (`summary`, sin datos personales de terceros) y a la interfaz como tarjetas (`display`: eventos, lugares, conversaciones, resultado de publicación, enlace o aviso).

### Regla de confirmación

Toda herramienta de acción (`ACTION_TOOLS`: inscribirse, cancelar inscripción, crear evento, crear conversación, responder, reportar) muestra primero una **tarjeta de confirmación** con lo que se va a hacer. Solo se ejecuta si la persona toca "Confirmar". Si no hay sesión, la tarjeta invita a entrar o crear cuenta. Si la persona dice que no, el resultado vuelve como `declined` y el agente sigue la conversación.

## Voz como conducto

- **Por defecto:** Web Speech API del navegador. Micrófono → texto (reconocimiento de voz) → el mismo flujo de texto. La respuesta se puede leer en voz alta (síntesis de voz). Si el navegador no soporta reconocimiento, el botón de micrófono no aparece y queda el texto.
- **Beta:** Gemini Live sigue en `/prueba-guia` (ver [29-gemini-live.md](29-gemini-live.md)). Todavía no usa los agentes ni sus herramientas.

## Entradas a la conversación

- `/inicio` es la conversación: la pantalla de inicio de la app.
- `?q=` abre la conversación con una pregunta lista: `/inicio?q=¿Qué hay este sábado?`.
- `AskQuillartButton` (`src/components/assistant/ask-quillart-button.tsx`) pone ese atajo en cada pantalla (por ejemplo, "¿Cómo llego a este evento?" en el detalle de un evento).
- Navegación móvil: Quillart (Inicio), Agenda, Comunidad, Lugares, Perfil. El mapa es un apartado más.

## Privacidad

- A Gemini va la conversación y el contexto mínimo: nombre visible y si es visitante; nunca correo, contraseña ni ubicación exacta.
- A OpenJev va solo el mensaje para elegir agente, sin datos de cuenta.
- Los resúmenes de herramientas no llevan datos personales de otras personas (por ejemplo, los inscritos de un evento).
- El audio de la voz lo procesa el navegador; la aplicación solo recibe el texto.

## Cómo probar

```bash
cp .env.example .env   # GEMINI_API_KEY y TYPESAFE_API_KEY opcionales
bun run dev
```

1. Abrir `/inicio` sin cuenta y escribir "¿Qué eventos de naturaleza hay esta semana?" → responde el Agente de Agenda con tarjetas.
2. "Inscríbeme en el primero" → tarjeta de confirmación; sin sesión invita a entrar.
3. Con sesión: confirmar → la inscripción aparece en `/perfil` y baja el número de cupos.
4. "Quiero abrir una conversación sobre el Gran Malecón" → Agente de Comunidad, confirmación, triaje.
5. "El arroyo de la 21 está crecido" → Agente de Reportes a la ciudad; con rol `city`, verlo en `/moderacion`.
6. "¿Cómo llego al estadio desde el Malecón?" → Agente de Movilidad con la ruta del Decisor.
7. Repetir sin `GEMINI_API_KEY`: responde el agente local (`source: local`).
8. Abrir `/agenda/<id>` y tocar "Pregúntale a Quillart": la conversación empieza con la pregunta del evento.

## Por construir

- Gemini Live con herramientas: voz en tiempo real usando los mismos agentes y la misma regla de confirmación.
- Multilenguaje de Quillart AI y de la comunidad (ver #48).
- Recordatorios de eventos y notificaciones.
- Medir el enrutamiento: qué agente eligió el orquestador frente al que la persona necesitaba.
