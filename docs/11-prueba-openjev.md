# Prueba de OpenJev (issue #20)

Fecha: 26 nov 2026. Responsable: Sebastián.

## Repositorios evaluados

Hay muchos proyectos con el nombre OpenJev. Revisamos los de más uso y los que dicen correr sin GPU.

| Repositorio | Licencia | Modelo | Corre sin GPU | Nota |
|---|---|---|---|---|
| [lookski/openjev](https://github.com/lookski/openjev) | MIT | Cualquier LLM pequeño (por defecto Qwen3-0.6B) o una API compatible con OpenAI | Sí, documentado en CPU | **Elegido para la prueba.** |
| [Heman10x-NGU/openJev-verdict-2.0](https://github.com/Heman10x-NGU/openJev-verdict-2.0) | Apache-2.0 (GitHub lo muestra como "Other") | Verdict 2.0, 151M parámetros | Probable (también WebGPU en navegador) | Quickstart incompleto. Candidato si falla el elegido. |
| [alanhuangyoo/OpenJev](https://github.com/alanhuangyoo/OpenJev) | Apache-2.0 | OpenJev-1.7B / 4B / 8B | 1.7B "para portátiles", latencias medidas en GPU | Pesos de 3,5 GB o más. |
| [razorback16/openjev](https://github.com/razorback16/openjev) | Apache-2.0 (servidor) | DiffusionGemma 26B y otros | No para el modelo principal (vLLM o MLX) | Muy pesado para la demo. |
| [SiliconLabAI/OpenJev-Cactus](https://github.com/SiliconLabAI/OpenJev-Cactus) | MIT | Needle | Sí (CPU edge) | Poca documentación. |

## Equipo de prueba

Portátil sin GPU usable (`nvidia-smi` no encuentra el driver), 12 núcleos, 15 GB de RAM. Python 3.12, PyTorch 2.15 CPU, transformers 5.24.

Repositorio probado: `lookski/openjev`, commit `49eb1382c88024e0f2550005264c13847d6ec167`, motor `LocalJev` con `Qwen/Qwen3-0.6B` en CPU (fp32).

Script: [`research/openjev/decider_probe.py`](../research/openjev/decider_probe.py).

## Resultados

| Medida | Valor |
|---|---|
| Primera carga (incluye descarga de ~1,5 GB del modelo) | 435 s |
| Latencia por decisión | 1,0 a 1,6 s |
| Repetibilidad | Misma respuesta y mismas probabilidades en 3 corridas |

### Decisión 1: ruta Malecón → Estadio (caso 1)

Opciones que quedaban después de las reglas duras: Transmetro por la Troncal Murillo, taxi verificado con tarifa de referencia, caminar al Centro y tomar bus.

Resultado: `bus_transmetro` con probabilidad 0,57 (confianza 0,35). **Razonable.**

### Decisión 2: a dónde desviar gente desde el Malecón saturado (caso 3)

Opciones: Barrio Abajo (60 % de aforo, 12 negocios abiertos), Centro (85 %), zona del estadio (95 %, partido en 3 horas).

Resultado: `estadio_area` con probabilidad 0,61 (confianza 0,42). **Incorrecto:** manda gente a la zona más llena.

## Conclusiones

1. **OpenJev corre en un portátil sin GPU** y responde en 1 a 1,6 s por decisión. Es aceptable para la demo.
2. **El modelo de 0,6B se equivoca en decisiones obvias.** Las reglas duras no son opcionales: además de descartar rutas con arroyo activo o no accesibles, deben descartar zonas con aforo igual o mayor a un umbral (propuesta: 90 %) antes de que el modelo elija.
3. **La confianza es baja (0,35 a 0,42).** Hay que mostrarla en la interfaz; si baja de un umbral, el Decisor usa el puntaje ponderado (plan B ya decidido).
4. **El modelo no se puede descargar en el evento.** La primera carga tarda más de 7 minutos. Hay que tenerlo descargado y precargado antes de la demo.
5. **OpenJev es Python y nuestra app es Bun + Astro.** Si se usa, corre como un servicio aparte (por ejemplo, un contenedor en Dokploy) que la app llama por HTTP. Si ese servicio no responde, se usa el puntaje ponderado.

## Recomendación

- Usar `lookski/openjev` con Qwen3-0.6B en CPU detrás de las reglas duras, como ya estaba decidido (pendientes #3 y #4).
- Agregar la regla dura de aforo.
- Implementar primero el puntaje ponderado en TypeScript (#18). OpenJev se conecta después, como servicio opcional.
- Si queda tiempo, probar Verdict 2.0 (151M): es más pequeño y puede ser más rápido, pero su documentación está incompleta.

Esta recomendación necesita la aprobación del equipo antes de considerarse decidida.
