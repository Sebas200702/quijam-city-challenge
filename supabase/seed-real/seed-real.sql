-- Real AMB data (docs/31-datos-reales-amb.md). Generated from supabase/seed-real/*.json.
-- Idempotent: places upsert by slug, stops by code, events by (organizer, title).
-- Coordinates © OpenStreetMap contributors (ODbL 1.0).

insert into public.places (slug, name, kind, neighborhood, description, address, latitude, longitude, is_accessible, is_free, opening_hours) values
  ('cienaga-de-mallorquin', 'Ecoparque Ciénaga de Mallorquín', 'nature', 'Las Flores', 'Ecoparque con senderos y muelle junto a la Ciénaga de Mallorquín, cuerpo de agua con manglar cerca de la desembocadura del río Magdalena.', 'Muelle', 11.03248, -74.84451, false, true, null),
  ('gran-malecon', 'Gran Malecón del Río', 'waterfront', 'Barranquilla', 'Paseo público a orillas del río Magdalena, con zonas verdes, áreas deportivas, juegos infantiles y oferta gastronómica.', null, 11.00627, -74.77845, false, true, null),
  ('bocas-de-ceniza', 'Bocas de Ceniza y Tajamar', 'nature', 'Las Flores', 'Punto donde el río Magdalena desemboca en el mar Caribe, al final del tajamar del barrio Las Flores.', null, 11.106, -74.85468, false, false, null),
  ('parque-washington', 'Parque Washington', 'park', 'Barranquilla', 'Parque arborizado del norte de Barranquilla, usado para caminar, trotar y pasear mascotas.', null, 11.00549, -74.81099, false, true, null),
  ('zoologico-barranquilla', 'Zoológico de Barranquilla', 'nature', 'La Concepción', 'Zoológico de la ciudad, con fauna de Colombia y otras regiones y programas de educación ambiental.', 'Calle 76 # 68', 11.01098, -74.798, false, false, null),
  ('parque-cultural-del-caribe', 'Parque Cultural del Caribe', 'culture', 'Barranquilla', 'Complejo cultural del centro que reúne el Museo del Caribe, plaza pública y espacios para exposiciones y conciertos.', null, 10.98638, -74.77801, false, true, null),
  ('paseo-bolivar', 'Paseo Bolívar', 'heritage', 'Centro', 'Bulevar histórico del centro de Barranquilla, con la estatua ecuestre de Simón Bolívar y edificios republicanos.', null, 10.98332, -74.77753, false, true, null),
  ('plaza-de-la-paz', 'Plaza de la Paz', 'heritage', 'El Rosario', 'Plaza frente a la Catedral Metropolitana María Reina, escenario habitual de actos públicos y conciertos.', 'Plaza de la Paz', 10.98802, -74.78901, false, true, null),
  ('estadio-metropolitano', 'Estadio Metropolitano Roberto Meléndez', 'sport', 'Ciudadela 20 de Julio', 'Estadio de fútbol más grande de la ciudad, sede del Junior y de partidos de la Selección Colombia.', 'Vía Estadio', 10.92695, -74.80051, false, false, null),
  ('muelle-puerto-colombia', 'Muelle de Puerto Colombia', 'waterfront', 'Puerto Colombia', 'Muelle histórico de Puerto Colombia sobre el mar Caribe, reconstruido como muelle turístico.', 'Calle 2', 10.98962, -74.96047, false, true, null),
  ('catedral-metropolitana', 'Catedral Metropolitana María Reina', 'heritage', 'Boston', 'Catedral de la Arquidiócesis de Barranquilla, frente a la Plaza de la Paz.', 'Carrera 45 # 53-38', 10.9885, -74.79057, false, true, null),
  ('plaza-san-nicolas', 'Plaza de San Nicolás', 'heritage', 'Centro', 'Plaza tradicional del centro histórico, frente a la iglesia de San Nicolás de Tolentino.', null, 10.97978, -74.77744, false, true, null),
  ('iglesia-san-nicolas', 'Iglesia de San Nicolás de Tolentino', 'heritage', 'Centro', 'Templo del centro histórico de Barranquilla, junto a la Plaza de San Nicolás.', 'Calle 34', 10.98014, -74.77796, false, true, null),
  ('antigua-aduana', 'Edificio de la Antigua Aduana', 'heritage', 'Barlovento', 'Edificio histórico de la antigua aduana de Barranquilla, hoy sede cultural y de la Biblioteca Piloto del Caribe.', 'Vía 40 # 36-135', 10.98841, -74.77888, false, true, null),
  ('estacion-montoya', 'Estación Montoya', 'heritage', 'Barlovento', 'Antigua estación del ferrocarril de Bolívar, primera línea férrea de la ciudad, junto al conjunto de la Aduana.', 'Vía 40 # 36-135', 10.98955, -74.77957, false, true, null),
  ('casa-del-carnaval', 'Casa del Carnaval', 'culture', 'Villa Country', 'Sede de la organización del Carnaval de Barranquilla, con el Museo del Carnaval, en el barrio Abajo.', 'Carrera 54 # 49B-39', 10.99284, -74.78767, true, false, null),
  ('fabrica-de-cultura', 'Fábrica de Cultura', 'culture', 'Barlovento', 'Centro de formación artística y cultural del Distrito en el barrio Abajo.', 'Calle 40 # 46-223', 10.98859, -74.78085, false, true, null),
  ('museo-de-arte-moderno', 'Museo de Arte Moderno de Barranquilla (MAMB)', 'culture', 'Barlovento', 'Museo de arte moderno y contemporáneo ubicado en el Parque Cultural del Caribe.', 'Calle 36 # 46-66', 10.98697, -74.77805, false, false, null),
  ('museo-del-atlantico', 'Museo del Atlántico', 'culture', 'Centro', 'Museo del departamento del Atlántico en el centro de Barranquilla.', 'Carrera 39 # 35-21', 10.97825, -74.7799, false, false, null),
  ('teatro-amira-de-la-rosa', 'Teatro Amira de la Rosa', 'culture', 'Villa Country', 'Teatro municipal de Barranquilla, sede tradicional de conciertos y artes escénicas.', 'Carrera 54 # 58', 10.99345, -74.78965, false, false, null),
  ('teatro-jose-consuegra-higgins', 'Teatro José Consuegra Higgins', 'culture', 'Modelo', 'Teatro de la Universidad Simón Bolívar, con programación de música y artes escénicas.', 'Calle 58', 10.99386, -74.79187, false, false, null),
  ('centro-de-eventos-puerta-de-oro', 'Centro de Eventos Puerta de Oro', 'culture', 'El Castillo', 'Centro de convenciones y eventos de Barranquilla a orillas del río Magdalena, junto al Gran Malecón.', 'Vía 40', 11.02385, -74.79982, false, false, null),
  ('ventana-al-mundo', 'Ventana al Mundo', 'heritage', 'Puerto Colombia', 'Monumento de gran formato en la entrada norte de la ciudad, símbolo de Barranquilla como puerta al mundo.', 'Avenida Circunvalar', 11.03316, -74.83143, false, true, null),
  ('ventana-de-campeones', 'Ventana de Campeones', 'heritage', 'Barranquilla', 'Monumento al deporte en el Gran Malecón del Río, junto al río Magdalena.', 'Rotonda Aleta del Tiburón', 10.99829, -74.77278, false, true, null),
  ('parque-sagrado-corazon', 'Parque Sagrado Corazón', 'park', 'Barranquilla', 'Parque de barrio en el norte de Barranquilla, frente a la iglesia del Sagrado Corazón.', null, 10.99359, -74.81811, false, true, null),
  ('parque-venezuela', 'Parque Venezuela', 'park', 'La campiña', 'Parque público del norte de Barranquilla con zonas verdes y senderos.', null, 11.00146, -74.82417, false, true, null),
  ('parque-cisneros', 'Parque Cisneros', 'park', 'Barranquilla', 'Parque del barrio El Prado, uno de los más tradicionales de la ciudad.', null, 11.0013, -74.79127, false, true, null),
  ('parque-suri-salcedo', 'Parque Tomás Suri Salcedo', 'park', 'Barranquilla', 'Parque público del centro-norte de Barranquilla, cerca del estadio Romelio Martínez.', null, 10.99409, -74.80427, false, true, null),
  ('parque-de-los-fundadores', 'Parque de los Fundadores', 'park', 'Barranquilla', 'Parque público del centro-norte de Barranquilla.', null, 10.99449, -74.79331, false, true, null),
  ('parque-de-la-electrificadora', 'Parque de la Electrificadora', 'park', 'Barranquilla', 'Parque público del norte de Barranquilla con zonas verdes.', null, 11.01392, -74.81383, false, true, null),
  ('parque-bicentenario', 'Parque Bicentenario', 'park', 'La Paz', 'Parque público del suroccidente de Barranquilla con zonas verdes y espacios recreativos.', null, 10.96338, -74.83651, false, true, null),
  ('reserva-alameda-del-rio', 'Reserva Natural Alameda del Río', 'nature', 'Barranquilla', 'Área natural protegida dentro del desarrollo urbano Alameda del Río, en el occidente de Barranquilla.', null, 10.98925, -74.85401, false, true, null),
  ('estadio-romelio-martinez', 'Estadio Romelio Martínez', 'sport', 'Olaya', 'Estadio histórico de fútbol de Barranquilla, en la calle 72.', 'Calle 72', 10.99381, -74.80709, false, false, null),
  ('coliseo-elias-chegwin', 'Coliseo Elías Chegwin', 'sport', 'Barrio Colombia', 'Coliseo cubierto para deportes de salón y eventos, junto al estadio Romelio Martínez.', 'Carrera 47', 10.99443, -74.80481, false, false, null),
  ('estadio-edgar-renteria', 'Estadio de Béisbol Édgar Rentería', 'sport', 'Barrio Abajo', 'Estadio de béisbol de Barranquilla, sede de partidos de la liga profesional colombiana.', 'Avenida Murillo', 10.99568, -74.78411, false, false, null),
  ('museo-bolivariano-soledad', 'Casa Museo Bolivariana de Soledad', 'heritage', 'Soledad', 'Casa donde se alojó Simón Bolívar en Soledad, hoy museo, junto a la plaza principal del municipio.', 'Calle 13', 10.9158, -74.76252, false, true, null),
  ('iglesia-san-antonio-soledad', 'Iglesia San Antonio de Padua', 'heritage', 'Soledad', 'Templo principal del centro histórico de Soledad, frente a la plaza.', 'Calle 15', 10.91564, -74.76384, false, true, null),
  ('plaza-de-soledad', 'Plaza de Soledad', 'heritage', 'Soledad', 'Plaza principal del centro histórico de Soledad.', 'Plaza de Soledad', 10.91552, -74.76313, false, true, null),
  ('parque-tambora-soledad', 'Parque Tambora', 'park', 'Soledad', 'Parque público de Soledad.', null, 10.91854, -74.78032, false, true, null),
  ('parque-los-fundadores-soledad', 'Parque Los Fundadores (Soledad)', 'park', 'Soledad', 'Parque público de Soledad.', null, 10.9185, -74.78876, false, true, null),
  ('parque-ferrocarril-soledad', 'Parque Ferrocarril', 'park', 'Soledad', 'Parque público de Soledad.', null, 10.92254, -74.77667, false, true, null),
  ('parque-muvdi-soledad', 'Parque Muvdi', 'park', 'Soledad', 'Parque público de Soledad.', null, 10.92841, -74.78255, false, true, null),
  ('polideportivo-soledad-2000', 'Polideportivo de Soledad 2000', 'sport', 'Soledad', 'Polideportivo con canchas públicas en Soledad.', null, 10.9042, -74.78542, false, true, null),
  ('parroquia-santa-maria-magdalena-malambo', 'Parroquia Santa María Magdalena', 'heritage', 'Malambo', 'Parroquia católica de Malambo.', 'Carrera 12', 10.85939, -74.77247, false, true, null),
  ('parque-favio-miranda-malambo', 'Parque Favio Miranda Varela', 'park', 'Malambo', 'Parque público de Malambo.', null, 10.8578, -74.77595, false, true, null),
  ('parque-la-bombonera-malambo', 'Parque La Bombonera', 'park', 'Malambo', 'Parque público de Malambo.', null, 10.87058, -74.77979, false, true, null),
  ('parque-virgen-del-carmen-malambo', 'Parque Virgen del Carmen', 'park', 'Malambo', 'Parque público de Malambo.', null, 10.87257, -74.78102, false, true, null),
  ('reciparque-la-victoria-malambo', 'Reciparque La Victoria', 'park', 'Malambo', 'Parque público de Malambo.', null, 10.8592, -74.78267, false, true, null),
  ('polideportivo-isolina-majul-malambo', 'Polideportivo Isolina Majul', 'sport', 'Malambo', 'Polideportivo con canchas públicas en Malambo.', null, 10.86996, -74.77776, false, true, null),
  ('parque-plaza-galapa', 'Parque Plaza de Galapa', 'park', 'Galapa', 'Parque de la plaza principal de Galapa, frente a la iglesia de Nuestra Señora de la Candelaria.', null, 10.89952, -74.88637, false, true, null),
  ('iglesia-candelaria-galapa', 'Iglesia Nuestra Señora de la Candelaria', 'heritage', 'Galapa', 'Templo principal de Galapa, en la plaza del municipio.', 'Carrera 18 # 12-10', 10.89933, -74.88602, false, true, null),
  ('megaparque-mundo-feliz-galapa', 'Megaparque Mundo Feliz', 'park', 'Galapa', 'Parque público de Galapa.', null, 10.91695, -74.88528, false, true, null),
  ('parque-lineal-villa-olimpica-galapa', 'Parque Lineal Villa Olímpica', 'park', 'Galapa', 'Parque lineal del sector Villa Olímpica, en Galapa.', null, 10.91623, -74.86511, false, true, null),
  ('parque-mirador-villa-olimpica-galapa', 'Parque Mirador de Villa Olímpica', 'park', 'Galapa', 'Parque mirador del sector Villa Olímpica, en Galapa.', null, 10.91977, -74.86, false, true, null),
  ('castillo-de-salgar', 'Castillo de San Antonio de Salgar', 'heritage', 'Puerto Colombia', 'Fortificación del siglo XIX sobre la costa de Salgar, en Puerto Colombia, con vista al mar Caribe.', 'Vía al Castillo de San Antonio de Salgar', 11.01822, -74.94165, false, false, null),
  ('plaza-cisneros-puerto-colombia', 'Plaza Francisco Javier Cisneros', 'heritage', 'Puerto Colombia', 'Plaza de Puerto Colombia dedicada al ingeniero del ferrocarril y del muelle, cerca del malecón.', null, 10.98874, -74.95966, false, true, null),
  ('parque-7-de-agosto-puerto-colombia', 'Parque 7 de Agosto', 'park', 'Puerto Colombia', 'Parque público del casco urbano de Puerto Colombia.', null, 10.98813, -74.95374, false, true, null),
  ('playa-miramar', 'Playa Miramar', 'waterfront', 'Puerto Colombia', 'Playa del casco urbano de Puerto Colombia, junto al malecón.', null, 10.99884, -74.9544, false, true, null),
  ('playa-pescadores-puerto-colombia', 'Playa Pescadores', 'waterfront', 'Puerto Colombia', 'Playa de Puerto Colombia cercana al muelle.', null, 10.99646, -74.95506, false, true, null),
  ('playas-de-salgar', 'Playas de Salgar', 'waterfront', 'Puerto Colombia', 'Playas del corregimiento de Salgar, en Puerto Colombia, cerca del castillo.', null, 11.0231, -74.92892, false, true, null),
  ('playa-modelo-sabanilla', 'Playa Modelo (Sabanilla)', 'waterfront', 'Puerto Colombia', 'Playa del sector de Sabanilla, en Puerto Colombia.', null, 11.02806, -74.92262, false, true, null),
  ('parque-mirador-lago-del-cisne', 'Parque Mirador Lago del Cisne', 'park', 'Puerto Colombia', 'Parque mirador junto al Lago del Cisne, en la vía al mar.', null, 11.01395, -74.89082, false, true, null)
on conflict (slug) do update set
  name = excluded.name, kind = excluded.kind, neighborhood = excluded.neighborhood,
  description = excluded.description, address = excluded.address,
  latitude = excluded.latitude, longitude = excluded.longitude,
  is_accessible = excluded.is_accessible, is_free = excluded.is_free, opening_hours = excluded.opening_hours;

-- Transmetro stations and portals (real, is_simulated = false). stops.zone only accepts
-- the five corridor zones: Murillo trunk -> troncal_murillo; Olaya Herrera trunk -> centro
-- downtown, barrio_abajo from Barrio Abajo northwards.
insert into public.stops (code, name, zone, stop_type, latitude, longitude, is_accessible, has_qr, has_shade, has_hydration, has_recycling, has_host_duo, is_simulated) values
  ('TM-PORTAL-SOLEDAD', 'Portal de Soledad', 'troncal_murillo', 'transmetro', 10.90729, -74.80114, false, false, false, false, false, false, false),
  ('TM-PACHO-GALAN', 'Estación Pacho Galán', 'troncal_murillo', 'transmetro', 10.91463, -74.79982, false, false, false, false, false, false, false),
  ('TM-PEDRO-RAMAYA', 'Estación Pedro Ramayá Beltrán', 'troncal_murillo', 'transmetro', 10.92124, -74.79888, false, false, false, false, false, false, false),
  ('TM-BUENOS-AIRES', 'Estación Buenos Aires', 'troncal_murillo', 'transmetro', 10.94165, -74.79958, false, false, false, false, false, false, false),
  ('TM-LA-OCHO', 'Estación La Ocho', 'troncal_murillo', 'transmetro', 10.94671, -74.79974, true, false, false, false, false, false, false),
  ('TM-LA-CATORCE', 'Estación La Catorce', 'troncal_murillo', 'transmetro', 10.95503, -74.7964, true, false, false, false, false, false, false),
  ('TM-LA-VEINTIUNA', 'Estación La Veintiuna', 'troncal_murillo', 'transmetro', 10.96055, -74.79372, true, false, false, false, false, false, false),
  ('TM-ATLANTICO', 'Estación Atlántico', 'troncal_murillo', 'transmetro', 10.96883, -74.79027, true, false, false, false, false, false, false),
  ('TM-CHIQUINQUIRA', 'Estación Chiquinquirá', 'troncal_murillo', 'transmetro', 10.97731, -74.78781, true, false, false, false, false, false, false),
  ('TM-LA-ARENOSA', 'Estación La Arenosa', 'troncal_murillo', 'transmetro', 10.9822, -74.78644, true, false, false, false, false, false, false),
  ('TM-PORTAL-BARRANQUILLITA', 'Portal de Barranquillita Nelson Pinedo', 'centro', 'transmetro', 10.98564, -74.77149, false, false, false, false, false, false, false),
  ('TM-PARQUE-CULTURAL', 'Estación Parque Cultural del Caribe', 'centro', 'transmetro', 10.98591, -74.77831, true, false, false, false, false, false, false),
  ('TM-BARRIO-ABAJO', 'Estación Barrio Abajo', 'barrio_abajo', 'transmetro', 10.98706, -74.78407, true, false, false, false, false, false, false),
  ('TM-LA-CATEDRAL', 'Estación La Catedral', 'centro', 'transmetro', 10.98842, -74.78869, true, false, false, false, false, false, false),
  ('TM-ESTHERCITA-FORERO', 'Estación Esthercita Forero', 'barrio_abajo', 'transmetro', 10.9927, -74.80266, true, false, false, false, false, false, false),
  ('TM-JOE-ARROYO', 'Estación de Retorno Joe Arroyo', 'barrio_abajo', 'transmetro', 10.9947, -74.80777, false, false, false, false, false, false, false)
on conflict (code) do update set
  name = excluded.name, zone = excluded.zone, stop_type = excluded.stop_type,
  latitude = excluded.latitude, longitude = excluded.longitude,
  is_accessible = excluded.is_accessible, is_simulated = false;

-- Public agenda events. They need the organizer account "Agenda pública AMB"
-- (created with the admin API, is_verified_organizer = true); skipped if it does not exist.

insert into public.events (title, description, category, starts_at, ends_at, place_id, location_text, is_free, price_cop, organizer_id, organizer_name, organizer_verified, status, moderation_status)
select 'Caravana de Navidad Coca-Cola 2026 en Barranquilla', 'Caravana navideña de camiones iluminados que recorre Barranquilla desde las 6:00 p. m. La ruta anunciada pasa por Rebolo, el Gran Malecón del Río, la Aleta del Tiburón y la Ventana al Mundo; los puntos exactos de salida y llegada se publican tres días antes.

Fuente: https://www.elheraldo.co/sociedad/2026/11/18/coca-cola-anuncio-recorrido-de-su-caravana-navidena-por-barranquilla-y-otras-tres-ciudades/ (publicada 2026-11-18), consultada el 2026-11-27.', 'community', '2026-12-04T18:00:00-05:00', null,
  (select id from public.places where slug = 'gran-malecon'), 'Recorrido por Rebolo, Gran Malecón del Río, Aleta del Tiburón y Ventana al Mundo (salida y llegada exactas se anuncian tres días antes)', true, null,
  o.id, 'QUILLART · Agenda pública', true, 'published', 'published'
from public.profiles o
where o.display_name = 'Agenda pública AMB' and o.is_verified_organizer
  and not exists (select 1 from public.events x where x.organizer_id = o.id and x.title = 'Caravana de Navidad Coca-Cola 2026 en Barranquilla');

insert into public.events (title, description, category, starts_at, ends_at, place_id, location_text, is_free, price_cop, organizer_id, organizer_name, organizer_verified, status, moderation_status)
select 'Camilo – Tour 2026 en Barranquilla', 'Concierto del cantante Camilo dentro de su gira 2026. Apertura de puertas a las 5:00 p. m.; boletería en TuBoleta desde $157.000 más cargo de servicio (gradería).

Fuente: https://tuboleta.com/es/eventos/camilo-tour-2026-barranquilla, consultada el 2026-11-27.', 'music', '2026-12-05T20:00:00-05:00', null,
  (select id from public.places where slug = 'centro-de-eventos-puerta-de-oro'), 'Centro de Eventos Puerta de Oro', false, 157000,
  o.id, 'QUILLART · Agenda pública', true, 'published', 'published'
from public.profiles o
where o.display_name = 'Agenda pública AMB' and o.is_verified_organizer
  and not exists (select 1 from public.events x where x.organizer_id = o.id and x.title = 'Camilo – Tour 2026 en Barranquilla');

insert into public.events (title, description, category, starts_at, ends_at, place_id, location_text, is_free, price_cop, organizer_id, organizer_name, organizer_verified, status, moderation_status)
select 'Gran Parada de la Luz 2026', 'Desfile navideño de la Fundación Pan y Panela, de unas tres horas, que sale de la Carrera 44 con Calle 70 y termina en los alrededores del Teatro Amira de la Rosa pasando por la Plaza de la Paz. Los palcos en la Plaza de la Paz y la Catedral piden una donación de $70.000 por puesto.

Fuente: https://www.elheraldo.co/sociedad/2026/11/25/la-gran-parada-de-la-luz-iluminara-barranquilla-el-proximo-8-de-diciembre/ (publicada 2026-11-25), consultada el 2026-11-27.', 'culture', '2026-12-08T17:30:00-05:00', null,
  (select id from public.places where slug = 'plaza-de-la-paz'), 'Desde la Carrera 44 con Calle 70 hasta la Calle 53, Plaza de la Paz y alrededores del Teatro Amira de la Rosa', true, null,
  o.id, 'QUILLART · Agenda pública', true, 'published', 'published'
from public.profiles o
where o.display_name = 'Agenda pública AMB' and o.is_verified_organizer
  and not exists (select 1 from public.events x where x.organizer_id = o.id and x.title = 'Gran Parada de la Luz 2026');

insert into public.events (title, description, category, starts_at, ends_at, place_id, location_text, is_free, price_cop, organizer_id, organizer_name, organizer_verified, status, moderation_status)
select 'The Last Dance: despedida de Teófilo Gutiérrez', 'Partido de despedida del futbolista Teófilo Gutiérrez. Apertura de puertas a las 2:00 p. m.; boletería desde $102.500.

Fuente: https://colombiamove.com/eventos/the-last-dance-despedida-de-teofilo-gutierrez-719f2565, consultada el 2026-11-27.', 'sport', '2026-12-19T17:00:00-05:00', null,
  (select id from public.places where slug = 'estadio-metropolitano'), 'Estadio Metropolitano Roberto Meléndez', false, 102500,
  o.id, 'QUILLART · Agenda pública', true, 'published', 'published'
from public.profiles o
where o.display_name = 'Agenda pública AMB' and o.is_verified_organizer
  and not exists (select 1 from public.events x where x.organizer_id = o.id and x.title = 'The Last Dance: despedida de Teófilo Gutiérrez');

insert into public.events (title, description, category, starts_at, ends_at, place_id, location_text, is_free, price_cop, organizer_id, organizer_name, organizer_verified, status, moderation_status)
select 'El Cascanueces – International Ballet Company', 'Función navideña de ballet basada en El Cascanueces. Apertura de puertas a las 4:00 p. m.; edad mínima 4 años; boletería desde $145.500 (balcón).

Fuente: https://colombiamove.com/eventos/el-cascanueces-en-barranquilla-international-ballet-company-7cdd3aaf, consultada el 2026-11-27.', 'culture', '2026-12-19T17:00:00-05:00', null,
  (select id from public.places where slug = 'teatro-jose-consuegra-higgins'), 'Teatro José Consuegra Higgins', false, 145500,
  o.id, 'QUILLART · Agenda pública', true, 'published', 'published'
from public.profiles o
where o.display_name = 'Agenda pública AMB' and o.is_verified_organizer
  and not exists (select 1 from public.events x where x.organizer_id = o.id and x.title = 'El Cascanueces – International Ballet Company');
