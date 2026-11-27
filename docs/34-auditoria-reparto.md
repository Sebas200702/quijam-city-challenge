# Auditoría de la aplicación: reparto de pruebas

La auditoría se hace usando la app, no leyendo el código. Cada persona prueba un área que no construyó, como la usaría alguien de Barranquilla.

## Cómo probar

- Usar la app desplegada, o `main` en local después de fusionar #214.
- Probar en un celular real y en un computador.
- Probar en español y en inglés.
- Crear al menos 2 cuentas de prueba para los flujos entre personas.
- Probar también con mala conexión y sin conexión.

## Cómo reportar

- Un issue por hallazgo, con la etiqueta `auditoria` y la del área.
- Título: `[área] qué pasó`.
- Cuerpo: qué hiciste paso a paso, qué esperabas y qué pasó. Agrega una captura o un video, el dispositivo y el navegador.
- Severidad: `bloqueante` (rompe la demo o muestra datos de otra persona), `alta`, `media` o `baja`.
- También vale reportar lo que confunde, aunque no sea un error.

## Reparto

| Área | Responsable |
|---|---|
| 1. Cuenta, privacidad y seguridad | @Sebas200702 |
| 2. Quillart AI: dock y voz | @estebann123107 |
| 3. Mapa y comunidad | @mtccjesus |
| 4. Experiencia y accesibilidad | @S-kun-2007 |
| 5. Velocidad, sin conexión y uso simultáneo | @AngelitoCastro |

### 1. Cuenta, privacidad y seguridad (@Sebas200702)

- [ ] Registrarse con correo: el captcha, la verificación y los mensajes de error.
- [ ] Iniciar sesión con Google, cerrar sesión y volver a entrar.
- [ ] Activar y usar la verificación en dos pasos.
- [ ] Recuperar la contraseña.
- [ ] Con la cuenta B, intentar editar o borrar un evento o un mensaje de la cuenta A.
- [ ] Sin sesión, abrir pantallas privadas pegando su URL.
- [ ] Usar como nombre visible un correo o una palabra reservada: debe rechazarse.
- [ ] Reclamar un negocio con su QR.
- [ ] Repetir una acción muchas veces seguidas: debe aparecer un aviso de límite claro.
- [ ] Leer la página de privacidad y comprobar que la app cumple lo que dice.

### 2. Quillart AI: dock y voz (@estebann123107)

- [ ] Abrir el dock en cada pantalla y preguntarle algo sobre lo que se ve en ella.
- [ ] Voz en vivo: conectar, hablar, interrumpir, cortar y volver a conectar.
- [ ] Negar el permiso del micrófono: el aviso debe ser claro y debe seguir funcionando escribiendo.
- [ ] Decir "llévame a la agenda", "llévame al mapa" y otros destinos.
- [ ] Pedirle que cree un evento: revisar los campos que llena y probar "deshacer".
- [ ] Hablarle en inglés y en español en la misma conversación.
- [ ] Pedirle cosas que no puede hacer o que no tienen sentido.
- [ ] Probar con ruido de fondo y en celular.

### 3. Mapa y comunidad (@mtccjesus)

- [ ] Recorrer el mapa en celular: solo debe mostrar el Área Metropolitana.
- [ ] Prender y apagar las capas Lugares, Eventos y Comunidad.
- [ ] Abrir un evento o una conversación desde el mapa y volver al mapa con "Ver en el mapa".
- [ ] Crear un evento eligiendo el punto en el mapa, con "Usar mi ubicación" y sin elegir punto.
- [ ] Crear un evento con cupo y precio, llenarlo con otra cuenta y probar la lista de espera.
- [ ] Inscribirse y cancelar la inscripción.
- [ ] Crear una conversación en el foro y responder con 2 cuentas a la vez.
- [ ] Reportar un mensaje, moderarlo y apelar la decisión.
- [ ] Reportar un cobro excesivo con su punto en el mapa.
- [ ] Elegir el barrio en el perfil.

### 4. Experiencia y accesibilidad (@S-kun-2007)

- [ ] Hacer los flujos principales solo con el teclado: registrarse, crear un evento e inscribirse.
- [ ] Usar la app con lector de pantalla: TalkBack en Android o VoiceOver en iPhone.
- [ ] Usar la app con el texto del sistema al 200 % y con el modo oscuro.
- [ ] Revisar las pantallas vacías, de carga, de error y sin conexión.
- [ ] Buscar textos confusos, botones pequeños o difíciles de tocar y contraste bajo.
- [ ] Probar con una persona que no conozca la app: anotar dónde se pierde.
- [ ] Comparar con los hallazgos de `docs/30-auditoria-ui-ux.md` y marcar cuáles siguen abiertos.

### 5. Velocidad, sin conexión y uso simultáneo (@AngelitoCastro)

- [ ] Medir con Lighthouse en celular el inicio, el mapa, la agenda y el panel de la ciudad.
- [ ] Abrir la app con conexión 3G lenta: anotar cuánto tarda cada pantalla.
- [ ] Instalar la app, apagar el internet y ver qué sigue funcionando.
- [ ] Publicar una versión nueva y comprobar que la app instalada se actualiza.
- [ ] Usar la app con 5 o más personas a la vez: presencia, foro y agenda en tiempo real.
- [ ] Revisar en el panel de la ciudad que cada indicador muestre su fuente y su fecha.
- [ ] Revisar que los lugares y las estaciones de Transmetro estén en el sitio correcto del mapa.

## Cierre

Cada responsable deja aquí, al terminar, un resumen de una línea con los números de sus issues.
