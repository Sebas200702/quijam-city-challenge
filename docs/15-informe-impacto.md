# Informe de impacto con IA

Issue #54. Botón "Generar informe" en el tablero de ciudad (`/ciudad`).

## Cómo funciona

1. El tablero envía el token de sesión del operador a `POST /api/city/impact-report`.
2. El servidor lee los datos **con los permisos de ese usuario** (RLS) y solo continúa si el rol es `city`.
3. Calcula cifras agregadas (`computeImpactMetrics`): visitantes y ocupación por zona, zonas saturadas, alertas de arroyo activas, negocios verificados abiertos y reportes de cobro abusivo por estado.
4. Gemini redacta el texto a partir de **solo esas cifras**. Nunca recibe notas de reportes, QR de conductores ni datos personales.
5. **Verificación:** cada número del texto debe existir en las cifras agregadas. Si Gemini escribe uno que no está, si falla o si no hay `GEMINI_API_KEY`, se entrega el informe de plantilla, armado sin IA con las mismas cifras. La interfaz dice cuál de los dos se usó.
6. Se descarga en Markdown.

## Cifras que aún no existen

"Personas desviadas" y "visitas a negocios" aparecen como "aún sin datos". Dependen del simulador de multitudes (#42) y del pasaporte con sellos (#45). Cuando existan, se agregan a `computeImpactMetrics`.

## Variables de entorno

- `GEMINI_API_KEY`: la misma del Guía.
- `GEMINI_REPORT_MODEL` (opcional): modelo de texto. Si no se define se usa `gemini-flash-latest`. **No se probó con una key real:** si la API no lo reconoce, se verá el informe de plantilla con el motivo.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/lib/impact-report/impact-metrics.ts` | Cifras agregadas. |
| `src/lib/impact-report/impact-report-text.ts` | Plantilla, instrucciones para Gemini y verificación de números. |
| `src/lib/impact-report/impact-report-server.ts` | Lectura con RLS y llamada a Gemini con respaldo. |
| `src/pages/api/city/impact-report.ts` | Endpoint. |
| `src/components/impact-report-panel.tsx` | Tarjeta del tablero con estados de carga, error y vacío. |
