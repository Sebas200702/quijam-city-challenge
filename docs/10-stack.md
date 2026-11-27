# Stack técnico

Decidido el 26 nov 2026. Las versiones exactas se fijan al crear el proyecto.

| Capa | Tecnología | Uso |
|---|---|---|
| Framework web | Astro (modo `server`) | Páginas, rutas de API y renderizado en servidor. |
| Interfaz interactiva | React 19 | Islas: mapa, chat del Guía, tablero de ciudad, panel de presentador. |
| Estilos | Tailwind CSS v4 | Sistema de diseño y tokens. |
| Lenguaje | TypeScript (modo `strict`) | Todo el código. |
| Mapa | Leaflet | Corredor piloto, paraderos, rutas, arroyos, negocios. |
| Datos | Supabase Cloud (plan gratis) | Postgres: corredor, paraderos, tarifas, negocios, reportes. Realtime para el tablero de ciudad. |
| Autenticación | Supabase Auth | Roles: visitante anónimo, vendedor, ciudad. Desde el 27 nov, cuentas con correo para residentes y visitantes que participan en la comunidad (perfil en `profiles`). |
| Agente Guía | Gemini Live API | Conversación multilingüe por voz en tiempo real, con chat de texto como respaldo. |
| Agente Decisor | Reglas duras + OpenJev por API (Codiv) o puntaje ponderado | Función propia (estado + opciones → opción + confianza). Reglas descartan rutas con arroyo activo o no accesibles; OpenJev (`openjev-latest` en `https://api.codiv.ai`) elige entre las restantes; si la API falla o la confianza es baja, puntaje ponderado en código. Ver [13-openjev.md](13-openjev.md). |
| Agente Recomendador | Reglas en código | Prioriza eventos ambientales y negocios de barrio según los gustos del visitante. |
| Quillart AI (27 nov) | Orquestador + seis agentes; Gemini con llamadas a funciones o agente local | Puerta de entrada de la app. `POST /api/assistant`; las herramientas corren en el navegador con la sesión de la persona. Ver [28-quillart-ai.md](28-quillart-ai.md). |
| Voz (27 nov) | Web Speech API del navegador | Habla a texto y texto a habla; solo conducto. Gemini Live queda en beta en `/prueba-guia`. |
| Moderación (27 nov) | Reglas duras + OpenJev (`choice`) | Triaje de eventos, conversaciones y respuestas antes de guardarlos. Ver [27-comunidad-y-moderacion.md](27-comunidad-y-moderacion.md). |
| Gestor de paquetes y runtime | Bun | Instalación, scripts y ejecución. |
| Linter y formateador | Biome | Un solo comando para lint y formato. |
| Pruebas | Vitest | Pruebas unitarias de reglas (tarifa justa, Decisor, recomendaciones). |
| Despliegue | Dokploy (VPS propio) | App Astro en contenedor. Supabase queda en la nube. |

## Verificación antes de cada PR

```bash
bun run astro check
bun run lint
bun run test
bun run build
```

Los nombres exactos de los scripts se fijan al crear el proyecto.

## Rutas de API (27 nov 2026)

| Ruta | Qué hace | Llaves |
|---|---|---|
| `POST /api/community/publish` | Verifica el token de la persona, corre el triaje y guarda el evento, la conversación o la respuesta (publicado o retenido). | `SUPABASE_SERVICE_ROLE_KEY`, `TYPESAFE_API_KEY` opcional |
| `POST /api/community/triage` | Triaje sin guardar nada, para el almacén del dispositivo. | `TYPESAFE_API_KEY` opcional |
| `GET`/`POST /api/community/moderation` | Cola de la ciudad y acciones aprobar, retirar y cerrar (solo rol `city`). | `SUPABASE_SERVICE_ROLE_KEY` |
| `POST /api/assistant` | Orquestador y agentes de Quillart AI. | `GEMINI_API_KEY` y `TYPESAFE_API_KEY` opcionales |
| `DELETE /api/community/account` | Elimina la cuenta de la persona y lo que escribió (Ley 1581). | `SUPABASE_SERVICE_ROLE_KEY` |

Todas las rutas de `src/pages/api/` pasan primero por `guardRequest` (límites de uso por IP o por usuario, `src/lib/security/`) y todas las respuestas llevan cabeceras de seguridad (`src/middleware.ts`). Detalle en [22-seguridad-y-confianza.md](22-seguridad-y-confianza.md).

## Variables de entorno

| Variable | Dónde | Para qué | Sin ella |
|---|---|---|---|
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador y servidor | Datos, Auth y Realtime | Semilla local y comunidad en el dispositivo |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor, nunca con `PUBLIC_` | Insertar contenido público después del triaje y la cola de moderación. Salta RLS: solo la usan rutas que verifican primero a la persona (`src/lib/supabase-admin.ts`). | La comunidad funciona solo en el dispositivo |
| `GEMINI_API_KEY` | Solo servidor | Quillart AI, Guía e informe de impacto | Agente local determinista |
| `TYPESAFE_API_KEY` | Solo servidor | OpenJev: Decisor, moderación y enrutamiento | Puntaje ponderado, solo reglas y palabras clave |

## Arquitectura de despliegue

```
Visitante / vendedor / ciudad
        │
        ▼
App Astro + React  ──(Dokploy, VPS)
   │        │
   │        ├── Gemini (Quillart AI con funciones; Live en beta)
   │        └── OpenJev API en Codiv (Decisor, moderación, enrutamiento)
   ▼
Supabase Cloud (Postgres, Auth, Realtime)
```

## Puntos a resolver

- **Llave de Gemini:** la API key no puede quedar expuesta en el navegador. Hay que confirmar en la documentación de Gemini Live cómo se conecta el cliente de forma segura (por ejemplo, tokens efímeros emitidos por el servidor).
- **Wifi del evento:** Gemini Live y Supabase Cloud dependen de internet. Plan B sin internet: pendiente #8.
- **OpenJev:** se usa por API (Codiv), probado el 26 nov. Ver [13-openjev.md](13-openjev.md).
- **Datos de referencia:** desde el 27 nov el contenido de las personas es real; la semilla del corredor se marca como "datos de referencia" (ver [09-convenciones.md](09-convenciones.md)).
- **Privacidad:** la ubicación se queda en el dispositivo; a Supabase solo llegan conteos anónimos (pendiente #9, Ley 1581 de 2012).
