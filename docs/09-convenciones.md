# Convenciones

## Idioma

| Qué | Idioma |
|---|---|
| Código (variables, funciones, archivos, comentarios) | Inglés |
| Mensajes de commit | Inglés |
| Títulos y descripciones de PR | Español |
| Issues | Español |
| Documentación en `docs/` | Español |
| README | Bilingüe: español con resumen en inglés |
| Textos de la interfaz | Por definir (el visitante es extranjero: idealmente multilingüe) |

## Ramas

- Nadie hace push directo a `main`, ni el admin.
- Toda rama sale de `main` actualizada.
- Formato: `<tipo>/<descripcion-corta>` en kebab-case e inglés.

| Prefijo | Uso |
|---|---|
| `feat/` | Funcionalidad nueva |
| `fix/` | Corrección |
| `docs/` | Documentación |
| `chore/` | Configuración, dependencias, mantenimiento |

Ejemplos: `feat/corridor-map`, `fix/route-fare-rounding`, `docs/program-components`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), en inglés y en imperativo.

```
<type>(<optional scope>): <description>
```

Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.

Ejemplos:

```
feat(map): add corridor stops from seed data
fix(decider): discard routes with active flood alert
docs: add stakeholder map
```

Un commit por paso lógico. No mezclar cambios no relacionados.

## Pull requests

- Tamaño objetivo: **~400 líneas cambiadas** por PR. Si crece más, dividir en PR encadenados.
- **1 aprobación** de otra persona para fusionar. Nadie aprueba su propio PR.
- Título en español, con el mismo formato de Conventional Commits: `feat(mapa): corredor con paraderos`.
- Descripción en español con:
  - **Qué cambia.**
  - **Por qué.**
  - **Cómo se verificó** (capturas, comandos, pasos).
  - `Closes #<issue>`.
- Si un PR depende de otro, decirlo en la descripción y fusionar en orden.

## Revisión

Quien revisa comprueba:

1. Que cumple los criterios de aceptación del issue.
2. Que no rompe nada existente.
3. Que se entiende sin explicación oral.
4. Que las cifras citadas están en [04-cifras-verificadas.md](04-cifras-verificadas.md).

Se aprueba o se piden cambios concretos. Comentarios en español.

## Código

- Un archivo = una responsabilidad.
- Nombres de archivo en kebab-case.
- Tipos compartidos en archivos `-types.ts`.
- TypeScript en modo `strict`.
- Formato y lint con Biome. Excluidos por ahora: `*.md`, `public/` y `design-system/` (propuesta QUILLART; se incluye cuando la app lo integre).
- Antes de abrir un PR: `astro check → lint → test → build` (ver [10-stack.md](10-stack.md)).

## Datos

- Los datos del prototipo son simulados y se marcan como tales en la interfaz y en el pitch.
- Toda cifra real lleva fuente y fecha.
- No se suben datos personales al repositorio.
- No se suben secretos (`.env`, llaves de API). Se documentan en un `.env.example` sin valores.

## Documentos

- Un tema por archivo en `docs/`, numerado en el orden de lectura.
- Nombres en kebab-case.
- Toda decisión nueva se anota en [02-decisiones.md](02-decisiones.md).
- Todo comentario del jurado o de mentores se anota en [feedback.md](feedback.md).
