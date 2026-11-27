# Caso 1 de punta a punta: guion de ensayo

Issue #19. Visitante extranjero en el Gran Malecón: pregunta en su idioma, recibe la ruta verde al estadio con tarifa justa y reporta un cobro abusivo.

## Qué hay que tener antes

| Necesario | Para qué | Sin eso |
|---|---|---|
| `.env` con `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Datos reales del corredor y guardar el reporte en `overcharge_reports` | El mapa usa la semilla local y el reporte se guarda en el teléfono |
| `GEMINI_API_KEY` (y opcional `GEMINI_TEXT_MODEL`) | Que Gemini redacte la respuesta | Responde el Guía local en español, inglés, portugués, francés y alemán |
| Sesión abierta en `/ciudad` con un usuario de rol `city` | Ver llegar el reporte en vivo | El reporte se guarda igual, pero no se ve en pantalla |

## Guion (2 minutos)

1. Abrir `/mapa` en el celular. Decir: "Soy un hincha alemán en el Malecón; hoy hay partido".
2. Tocar **Pregúntale al Guía · Ask the Guide**.
3. Escribir o tocar una pregunta en otro idioma, por ejemplo **"How do I get to the stadium?"** o "Wie komme ich zum Stadion?".
4. Mostrar la respuesta en ese idioma y la tarjeta:
   - **Ruta verde**: Transmetro, 38 min, **$3.500 COP** de tarifa de referencia.
   - **Taxi verificado**, tarifa justa: **$20.000 a $28.000 COP**.
5. Tocar **Report an overcharge**. Elegir Taxi, escribir **55000** y enviar.
   - Con Supabase: "Report sent. You were charged 129% above the reference fare".
6. Cambiar a `/ciudad`: el reporte aparece en vivo en "Lo que la ciudad aprende".
7. Volver y tocar **Show on map**: el mapa vuela al Estadio Metropolitano.

Los datos son simulados para 2034 y la interfaz lo dice.

## Plan B

- **Sin internet en el evento**: el Guía local responde igual y el reporte queda en el teléfono (`localStorage`, clave `quillart-pending-reports`). Decirlo en voz alta: "sin conexión, el reporte se guarda y se envía después".
- **Gemini lento o caído**: a los 8 s el servidor responde con el Guía local. La tarjeta de ruta nunca depende del modelo.

## Ensayos

| # | Fecha | Modo | Pregunta | Resultado |
|---|---|---|---|---|
| 1 | 26 nov 2026 | Sin Gemini ni Supabase | How do I get to the stadium? | Respuesta en inglés, tarjeta Transmetro 38 min $3,500, reporte guardado en el teléfono, mapa en el Estadio |
| 2 | 26 nov 2026 | Sin Gemini ni Supabase | Comment aller au stade ? | Igual, en francés |
| 3 | 26 nov 2026 | Sin Gemini ni Supabase | Como chego ao estádio? | Igual, en portugués |
| 4–6 | Pendiente | Con Gemini y Supabase | — | Falta ensayar con llaves reales y "Lo que la ciudad aprende" abierto |

## Pendiente

- Voz: conectar Gemini Live (`/prueba-guia`) al mismo Guía.
- Reenviar los reportes guardados en el teléfono cuando vuelva la conexión.
- Límite de envíos en `/api/reports`.
