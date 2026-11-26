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
| Autenticación | Supabase Auth | Roles: visitante anónimo, vendedor, ciudad. |
| Agente Guía | Gemini Live API | Conversación multilingüe por voz en tiempo real, con chat de texto como respaldo. |
| Agente Decisor | Reglas duras + OpenJev por API (Codiv) o puntaje ponderado | Función propia (estado + opciones → opción + confianza). Reglas descartan rutas con arroyo activo o no accesibles; OpenJev (`openjev-latest` en `https://api.codiv.ai`) elige entre las restantes; si la API falla o la confianza es baja, puntaje ponderado en código. Ver [11-openjev.md](11-openjev.md). |
| Agente Recomendador | Reglas en código | Prioriza eventos ambientales y negocios de barrio según los gustos del visitante. |
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

## Arquitectura de despliegue

```
Visitante / vendedor / ciudad
        │
        ▼
App Astro + React  ──(Dokploy, VPS)
   │        │
   │        ├── Gemini Live API (voz y texto del Guía)
   │        └── OpenJev API en Codiv (Decisor)
   ▼
Supabase Cloud (Postgres, Auth, Realtime)
```

## Puntos a resolver

- **Llave de Gemini:** la API key no puede quedar expuesta en el navegador. Hay que confirmar en la documentación de Gemini Live cómo se conecta el cliente de forma segura (por ejemplo, tokens efímeros emitidos por el servidor).
- **Wifi del evento:** Gemini Live y Supabase Cloud dependen de internet. Plan B sin internet: pendiente #8.
- **OpenJev:** se usa por API (Codiv), probado el 26 nov. Ver [11-openjev.md](11-openjev.md).
- **Datos simulados:** los datos de 2034 son simulados y se marcan así en la interfaz.
- **Privacidad:** la ubicación se queda en el dispositivo; a Supabase solo llegan conteos anónimos (pendiente #9, Ley 1581 de 2012).
