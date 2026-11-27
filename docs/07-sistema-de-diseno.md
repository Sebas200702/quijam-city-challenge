# 07 · Sistema de diseño

> **Estado: propuesta.** "QUILLART" (Quilla + Smart + Art) es el nombre de trabajo
> del sistema de diseño. El nombre del producto sigue **por definir**; si cambia,
> solo hay que renombrar los archivos y el logotipo.

Guía visual y playground interactivo (privado, pide acceso):
<https://claude.ai/artifact/MgKeQXeK2iWzobvhaGsuyn>

## Archivos

| Archivo | Contenido |
|---|---|
| [`design-system/quillart-tokens.css`](../design-system/quillart-tokens.css) | Tokens como variables CSS, tema oscuro y claro |
| [`design-system/quillart-tokens.json`](../design-system/quillart-tokens.json) | Los mismos tokens en JSON, con su uso |
| [`design-system/quillart.css`](../design-system/quillart.css) | Estilos de componentes (clases `q-*`), solo referencian tokens |
| [`design-system/tailwind.preset.cjs`](../design-system/tailwind.preset.cjs) | Preset de Tailwind que expone los tokens como clases |

## Dirección: Tropical Cyber-Clean

La calidez del Caribe con la precisión de un buen anfitrión. Formas suaves:
píldoras, radios grandes, sombras difusas y sin bordes duros.

Principios:

1. **Color es estado, nunca decoración.** Rojo, Oro y Verde salen de la bandera de
   Barranquilla y cada uno significa una sola cosa.
2. **Ningún estado depende solo del color.** Siempre lleva palabra (Fluido,
   Moderado, Saturado), glifo propio en el pin o trazo distinto en el tráfico.
3. **El dato en vivo dice qué tan fresco es** ("Actualizado hace 30 s").
4. **Poco texto, mucha gráfica.** Ilustración e iconos antes que párrafos.

## Temas

- **Oscuro (predeterminado):** mapas y "Lo que la ciudad aprende". Es el valor de `:root`.
- **Claro:** uso turístico bajo el sol. Se activa con `data-theme="light"`.

```js
document.documentElement.dataset.theme = 'light';
```

El atributo también funciona en cualquier contenedor, para mezclar temas en una
misma página.

## Color

| Rol | Relleno | Texto encima | Como texto | Fondo tenue | Oscuro | Claro |
|---|---|---|---|---|---|---|
| Alerta, congestión alta, en vivo | `--red` | `--on-red` | `--red-text` | `--red-soft` | `#E6192E` | `#CE1126` |
| Turismo destacado, Fan Fest, ruta recomendada | `--gold` | `--on-gold` | `--gold-text` | `--gold-soft` | `#FFD100` | `#FCD116` |
| Flujo óptimo, transporte disponible, zona segura | `--green` | `--on-green` | `--green-text` | `--green-soft` | `#009B3A` | `#007A33` |
| Núcleo de marca, estrella | `--star` | | | | `#FFFFFF` | `#FFFFFF` |

Superficies: `--bg` → `--surface` → `--surface-raised`. Texto: `--ink` →
`--ink-muted` → `--ink-subtle`. Bordes: `--line` (decorativo) y `--line-control`
(inputs, 3:1 o más).

**Acción primaria** (`--action` / `--on-action`): oro en oscuro, tinta en claro.
El oro sobre blanco tiene 1,5:1, por eso en claro el botón primario no es dorado.

### Contraste (WCAG 2.1, calculado; mínimo entre los dos temas)

| Par | Ratio | Nivel |
|---|---|---|
| `--on-gold` sobre `--gold` | 12,7:1 | AAA |
| `--on-red` sobre `--red` | 4,6:1 | AA |
| `--on-green` sobre `--green` | 5,1:1 | AA |
| `--ink` sobre superficies | 14:1 | AAA |
| `--ink-muted` sobre superficies | 6,9:1 | AA |
| `--ink-subtle` sobre superficies | 4,6:1 | AA |

Reglas: nunca blanco sobre oro; como texto, rojo y verde usan su variante
`-text`. Los ratios son calculados, falta medirlos en pantalla.

## Tipografía

- **Space Grotesk** (`--font-display`): títulos y toda cifra de ciudad, con cifras
  tabulares.
- **Inter** (`--font-sans`): interfaz, mapas y conversación.

| Estilo | Tamaño / interlínea | Peso | Uso |
|---|---|---|---|
| `display-xl` | 56 / 60 | 700 | Héroes, una vez por vista |
| `display` | 40 / 44 | 700 | Títulos de pantalla en modo Turista |
| `heading-1` | 28 / 34 | 600 | Títulos de sección |
| `heading-2` | 20 / 26 | 600 | Títulos de card y punto de interés |
| `kpi-xl` | 48 / 52 | 700 | KPI principal de ciudad |
| `kpi` | 28 / 32 | 600 | Impacto de decisiones |
| `body-lg` | 17 / 26 | 400 | Respuestas de la IA |
| `body` | 15 / 22 | 400 | Texto de interfaz |
| `body-sm` | 13 / 18 | 400 | Metadatos |
| `label` | 12 / 16 | 600 | Badges y eyebrows, en mayúsculas |
| `map-label` | 11 / 14 | 600 | Etiquetas sobre el mapa |

## Espacio, radios y elevación

- Espaciado, escala de 4px: `--space-1` (4) a `--space-12` (48).
- Radios: `xs` 4, `sm` 8, `md` 14, `lg` 24 (cards), `xl` 32 (mapa, hojas), `pill`.
- Sombras: `--shadow-card` en reposo, `--shadow-modal` sobre el mapa.
- Glows (`--glow-red`, `--glow-gold`, `--glow-green`): solo el elemento
  seleccionado o activo, uno a la vez.

## Geometría de bandera

- **Marca de bandera** (`.q-flagmark`): rectángulos concéntricos rojo, oro y verde
  con la estrella al centro.
- **Franja tricolor** (`.q-flag`): píldora corta 1 : 1 : 2 arriba de las cards de
  marca. Nunca como borde izquierdo.
- **Banda de estado** (`.q-band--green|gold|red`): prioridad normal, alta, crítica.
- **Marco concéntrico** (`.q-card--frame`): solo en tarjetas flotantes sobre el
  mapa, una por vista.
- **Estrella de 8 puntas** (`.q-star`): isotipo, indicador de IA pensando
  (`.q-star--think`, gira 45° por paso) y marcador de ubicación (`.q-user`).

## Componentes

| Componente | Clases | Notas |
|---|---|---|
| Botón | `.q-btn` + `--primary` `--secondary` `--alert` `--ghost`, `--sm` `--lg` `--icon` `--block` | Píldora, 48px de alto (`--sm` 44px, `--lg` 56px); nunca menos de 44px. Primary una vez por vista; Alert solo para seguridad o acciones irreversibles. Carga: `aria-busy="true"` y la estrella |
| Badge | `.q-badge` + `--live` `--high` `--optimal` `--alert` `--event` `--active` `--neutral`, `--solid` | Una o dos palabras en mayúsculas. Máximo dos juntos |
| Densidad | `.q-meter` + `--green` `--gold` `--red` | Verde < 60 ≤ oro < 85 ≤ rojo. `role="meter"` y la palabra de estado |
| Segmentado | `.q-seg`, `.q-seg__opt.is-on` | Modo, tema, idioma. Botones con `aria-pressed`, cada opción de 44px de alto como mínimo |
| Header | `.q-header` | Logo, modo (Turista / Lo que la ciudad aprende), tema, idioma |
| Card | `.q-card` + `--raised` `--frame` `--active` `--dismissed` | Cabecera, cuerpo y pie con `__head` `__body` `__foot` |
| Pin de mapa | `.q-pin` + `--fluid` `--event` `--alert`, `.is-selected` | Glifo propio: flechas, estrella, signo de exclamación |
| Controles de mapa | `.q-mapctl`, `.q-fab`, `.q-zoom` | Capas y centrar en botones redondos; zoom +/− agrupado. Botones de 48px con `aria-label` |
| Hoja de trayecto | `.q-sheet`, `.q-sheet__handle`, `.q-trip`, `.q-trip__fill`, `.q-trip__bus`, `.q-trip__ends` | Hoja inferior en móvil: vehículo, estado con palabra, línea origen → vehículo → destino como `role="progressbar"` |
| Chat | `.q-msg--ai` `.q-msg--user`, `.q-bubble`, `.q-thinking`, `.q-chip`, `.q-prompt` | Sugerencias rápidas y barra de prompt |
| KPI | `.q-kpi`, `.q-delta--good` `--bad` | El color sigue al sentido bueno, no a la flecha |
| Ilustración | `.q-illus` | Panel crema fijo en ambos temas |

Tarjeta de decisión (Decision Engine): `.q-card` con `.q-band`, impacto en
`.q-impact`, confianza en `.q-meter--sm` y acciones Aplicar / Descartar /
Revertir. Toda decisión se puede revertir.

## Componentes de navegación por rol (issue #56)

Sostienen las reglas de UX de la épica #57 y la arquitectura de
[20-arquitectura-de-informacion.md](20-arquitectura-de-informacion.md). Solo
usan tokens existentes: ningún color nuevo.

| Componente | Clases | Cuándo usarlo |
|---|---|---|
| Tu siguiente paso | `.q-next-step`, `__head` `__eyebrow` `__title` `__why` `__facts` | La única tarjeta de acción en la pantalla de inicio del visitante, del vendedor y del anfitrión. Un título con verbo, una frase de por qué y un solo `.q-btn--primary.q-btn--block` |
| Aviso | `.q-alert` + `--info` `--safe` `--alert`, `__icon` `__body` `__title` `__text` `__actions` `__close` | Tarjeta discreta para todo lo que no es seguridad: desvío, anfitrión en camino, reporte enviado. Máximo uno visible a la vez |
| Aviso de seguridad | `.q-backdrop` > `.q-alert.q-alert--alert.q-alert--modal` | Solo para un arroyo activo que toca la ruta o la zona del visitante. Es la única interrupción permitida |
| Hoja inferior | `.q-sheet` + `--dock` `--peek` `--expanded`, `__grab` `__handle` `__head` `__body` `__more` | Detalle sobre el mapa (ruta, negocio, menú secundario). En `--peek` se oculta `__more` |
| Estado | `.q-state` + `--loading` `--empty` `--error` `--offline`, `__glyph` `__title` `__text` `__action` | Ocupa el área completa cuando no hay contenido que mostrar. Cada pantalla tiene los cuatro |
| Datos simulados | `.q-sim-tag` | Una vez por pantalla, cerca del mapa o del título. Nunca en cada tarjeta |
| Ver detalles | `.q-details` (sobre `<details>`), `__body` | Probabilidades, confianza y fuentes del Decisor. Cerrado por defecto |

### Tu siguiente paso

```html
<section class="q-next-step" aria-labelledby="next-title">
  <div class="q-next-step__head">
    <p class="q-next-step__eyebrow"><span class="q-star" aria-hidden="true"></span>Tu siguiente paso</p>
    <span class="q-badge q-badge--optimal">Ruta verde</span>
  </div>
  <h2 class="q-next-step__title" id="next-title">Toma el Transmetro al estadio</h2>
  <p class="q-next-step__why">Evitamos el trancón de la Vía 40; esta ruta tiene sombra en los paraderos.</p>
  <button class="q-btn q-btn--primary q-btn--block" type="button">Empezar ruta</button>
</section>
```

- El título empieza con verbo. El por qué cabe en una línea (regla 6).
- Cifras en `__facts` (tiempo, tarifa de referencia), como `<dl>`.
- Probabilidades y confianza nunca en la tarjeta: van en `.q-details`.

### Aviso y aviso de seguridad

- `--info` (oro): sugerencia o novedad. `--safe` (verde): algo salió bien o
  alguien viene a ayudar. `--alert` (rojo): riesgo.
- El título dice el estado en palabras; el icono lleva un glifo (`!`, `✓`,
  `i`) además del color.
- Discreto: `role="status"` y `aria-live="polite"`. Botón de cerrar
  `.q-alert__close` de 44 px con `aria-label`.
- Modal: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` y
  `aria-describedby`. El foco entra al botón principal y vuelve al origen al
  cerrar. `Esc` cierra solo si la acción principal no es obligatoria.
- Ningún aviso desaparece solo antes de 20 s (WCAG 2.2.1).

### Hoja inferior

- `.q-sheet` ya existía (hoja de trayecto); se agregan `--dock`, `--peek`,
  `--expanded`, `__grab`, `__head`, `__body` y `__more`, y el relleno inferior
  respeta `env(safe-area-inset-bottom)`.
- `__grab` es un `<button>` de 44 px con `aria-expanded` y `aria-controls`;
  contiene el `__handle` visual. Arrastrar es opcional; tocar siempre funciona.
- Altura del modo `--peek`: variable `--q-sheet-peek` (200 px por defecto).

### Estados

- Carga: `.q-star.q-star--think` dentro de `__glyph` y `aria-busy="true"` en
  la región que carga.
- Vacío: dice qué falta y la acción que lo llena ("Marca tu negocio abierto").
- Error: dice qué pasó sin códigos y ofrece "Reintentar".
- Sin conexión: dice qué sigue funcionando ("El mapa y las respuestas
  guardadas funcionan sin internet").
- El bloque lleva `role="status"`; el error, `role="alert"`.

### Accesibilidad común

- Áreas táctiles de 44 px o más (botones, cerrar, `summary`, `__grab`).
- Foco visible con `--focus` en todos los controles, incluidos `select`,
  `textarea` y `summary`.
- Con `prefers-reduced-motion: reduce` se apagan todas las transiciones de los
  componentes (botones, chips, segmentado, pines, medidores, progreso del viaje,
  hoja, cerrar de la alerta y chevron de `.q-details`) y todas las animaciones.
- Contraste: texto `--ink` y `--ink-muted` sobre `--gold-soft`, `--green-soft`
  y `--red-soft` supera 4,5:1 en ambos temas (calculado, falta medir).

## Iconos e ilustraciones

- **Iconos:** [lucide-react](https://lucide.dev), 24×24, trazo 1,75, color
  heredado. Sin iconos rellenos.
- **Ilustraciones:** [unDraw](https://undraw.co), con el acento cambiado a Oro
  `#FCD116`, sobre `.q-illus` (panel claro fijo, se ve igual en modo oscuro).
  Las nuevas salen del paquete npm `undraw-svg` (colección unDraw, licencia MIT)
  porque undraw.co no es accesible desde el entorno de desarrollo; el acento
  viene como `currentColor` y se reemplaza por `#FCD116`. Viven en
  `public/illustrations/`.
- **Dónde van (27 nov 2026):** la landing (portada, una por agente, pasos,
  confianza y cierre), el encabezado de cada sección (`PageTitle` con
  `illustration`), los estados vacíos y "no encontrado" (`EmptyState`), el
  detalle de lugares y eventos según su tipo
  (`src/lib/community/community-illustrations.ts`) y la portada de Quillart AI.
  Regla: más imagen y menos texto; títulos de 2 a 4 palabras.
- **Altura:** `.q-illus img` fija `height: auto`; para darles alto en Tailwind
  hay que usar `!` (por ejemplo `h-28!`), como hace `SpotIllustration`.

## Uso en React + Tailwind

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
@import '../design-system/quillart-tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```js
// tailwind.config.js
module.exports = {
  presets: [require('./design-system/tailwind.preset.cjs')],
  content: ['./src/**/*.{js,jsx,ts,tsx,astro}'],
};
```

```jsx
import { Route } from 'lucide-react';

export function RouteButton() {
  return (
    <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-action px-6 font-semibold text-on-action shadow-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <Route size={18} strokeWidth={1.75} aria-hidden />
      Cómo llegar
    </button>
  );
}
```

Sin Tailwind, carga `quillart-tokens.css` y `quillart.css` y usa las clases `q-*`.

## Pendiente

- Componentes React como librería: hoy solo existen las clases CSS y el preset.
- Medir contraste en pantalla y probar con lector de pantalla.
- Botón secundario y segmentado usan relleno tenue sin borde: revisar contraste
  de contorno.
- Confirmar el nombre del producto.
