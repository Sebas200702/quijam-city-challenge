# Riesgos abiertos

- **Diferenciación.** Nuestra idea coincide con el ejemplo del organizador. Hay que abrir el pitch con tarifa justa, arroyos y el Decisor, no con "mapa turístico con IA".
- **Nombres quemados.** "Pulso Quilla" y "Quilla Viva" salieron de tres fuentes de IA distintas; es probable que otro equipo los use.
- **OpenJev.** Existen varios proyectos con ese nombre y licencias que no coinciden (Apache-2.0, MIT, CC BY-NC 4.0). Es un modelo de pesos abiertos y algunas variantes usan modelos de chat por debajo: no decir "sin LLM"; decir "no genera texto, elige entre opciones fijas y muestra su confianza". Puede no correr en un portátil sin GPU ni con el wifi del evento. Nadie del equipo lo ha probado todavía.
- **Seguridad.** Una decisión probabilística no puede decidir si se cruza un arroyo activo.
- **Alcance.** Tres agentes reales, tablero, pasaporte y rutas pueden no caber en dos días.
- **Referencia a Watch Dogs 2.** La estética sirve; nombrar el juego ante un jurado con gente de la Alcaldía puede leerse como vigilancia.
- **Datos reales.** La alerta de arroyos y el tiempo real de buses dependen de datos que hoy no son públicos. En la demo son simulados y hay que decirlo.
- **Presencia pública en la demo.** El canal `visitor-presence` es público con la `publishable key` para permitir que el visitante entre sin registro; cualquier cliente podría inflar el conteo o declarar `entry: "qr"`. Se usa la clave de presencia del canal como identidad y se acepta el riesgo acotado para el Demo Day.
