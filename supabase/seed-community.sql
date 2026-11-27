-- Community seed: public spaces and natural areas of Barranquilla, plus a
-- starter agenda published by the platform team so the agenda is not empty on
-- day one. Same content as src/lib/community/places-catalog.ts and
-- starter-content.ts. Idempotent: safe to re-run in the Supabase SQL Editor.

insert into public.places (
  slug, name, kind, neighborhood, description, address,
  latitude, longitude, is_accessible, is_free, opening_hours
) values
  ('cienaga-de-mallorquin', 'Ecoparque Ciénaga de Mallorquín', 'nature', 'Las Flores',
   'Manglar, senderos sobre pilotes y miradores de aves junto a la desembocadura del río Magdalena. Ideal para caminatas al amanecer y avistamiento de aves.',
   'Corregimiento La Playa, vía a Las Flores', 11.0405, -74.8535, true, true, 'Martes a domingo, 6:00 a. m. – 5:00 p. m.'),
  ('gran-malecon', 'Gran Malecón del Río', 'waterfront', 'Riomar',
   'Más de cinco kilómetros a orillas del Magdalena con ciclorruta, zonas verdes, juegos y comida. El punto de encuentro de la ciudad al atardecer.',
   'Avenida del Río (Vía 40)', 11.0075, -74.7815, true, true, 'Todos los días, 5:00 a. m. – 11:00 p. m.'),
  ('bocas-de-ceniza', 'Bocas de Ceniza y Tajamar', 'nature', 'Las Flores',
   'El lugar donde el río Magdalena se encuentra con el mar Caribe. Se recorre en el tren turístico o a pie sobre el tajamar.',
   'Final del barrio Las Flores', 11.1065, -74.852, false, false, 'Todos los días, 7:00 a. m. – 5:00 p. m.'),
  ('isla-salamanca', 'Vía Parque Isla de Salamanca', 'nature', 'Sitionuevo (Magdalena)',
   'Área protegida de manglares y ciénagas al otro lado del puente Pumarejo. Hogar de cientos de especies de aves migratorias y residentes.',
   'Kilómetro 10, vía Barranquilla – Ciénaga', 11.0215, -74.66, false, false, 'Todos los días, 8:00 a. m. – 4:00 p. m.'),
  ('parque-washington', 'Parque Washington', 'park', 'El Prado',
   'Parque arborizado y tranquilo, con caminos para trotar, zona de mascotas y espacio para picnic bajo los árboles.',
   'Calle 79 con Carrera 52', 11.0058, -74.8082, true, true, 'Todos los días, 5:00 a. m. – 10:00 p. m.'),
  ('zoologico-barranquilla', 'Zoológico de Barranquilla', 'nature', 'El Recreo',
   'Centro de conservación de fauna del Caribe colombiano, con programas de educación ambiental para familias y colegios.',
   'Calle 77 # 68-40', 11.0068, -74.8158, true, false, 'Martes a domingo, 9:00 a. m. – 5:00 p. m.'),
  ('parque-cultural-del-caribe', 'Parque Cultural del Caribe', 'culture', 'Centro',
   'Plaza abierta y Museo del Caribe: exposiciones, conciertos y talleres sobre la cultura de la región.',
   'Calle 36 # 46-66', 10.9866, -74.782, true, true, 'Martes a domingo, 9:00 a. m. – 6:00 p. m.'),
  ('casa-del-carnaval', 'Casa del Carnaval', 'culture', 'Barrio Abajo',
   'Sede del Carnaval de Barranquilla, patrimonio de la humanidad. Talleres de danza, música de millo y tambora durante todo el año.',
   'Carrera 54 # 49B-39', 10.9928, -74.784, true, true, 'Lunes a sábado, 8:00 a. m. – 6:00 p. m.'),
  ('paseo-bolivar', 'Paseo Bolívar', 'heritage', 'Centro',
   'El corazón histórico de la ciudad: comercio, edificios republicanos y la estatua del Libertador. Punto de partida de los recorridos a pie por el centro.',
   'Paseo Bolívar entre Carreras 38 y 45', 10.9835, -74.779, true, true, null),
  ('plaza-de-la-paz', 'Plaza de la Paz', 'heritage', 'Centro',
   'Gran plaza frente a la Catedral Metropolitana, escenario de conciertos, ferias y encuentros ciudadanos.',
   'Carrera 45 con Calle 53', 10.9878, -74.7889, true, true, null),
  ('estadio-metropolitano', 'Estadio Metropolitano Roberto Meléndez', 'sport', 'Ciudadela 20 de Julio',
   'Casa de la Selección Colombia y del Junior. Sus alrededores tienen canchas y espacios para actividad física.',
   'Avenida Circunvalar con Calle 45', 10.9269, -74.8006, true, false, null),
  ('muelle-puerto-colombia', 'Muelle de Puerto Colombia', 'waterfront', 'Puerto Colombia',
   'Muelle histórico restaurado frente al mar, a 20 minutos de Barranquilla. Playa, atardeceres y pescado frito.',
   'Malecón de Puerto Colombia', 11.0003, -74.955, true, true, 'Todos los días, 6:00 a. m. – 9:00 p. m.')
on conflict (slug) do update set
  name = excluded.name,
  kind = excluded.kind,
  neighborhood = excluded.neighborhood,
  description = excluded.description,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_accessible = excluded.is_accessible,
  is_free = excluded.is_free,
  opening_hours = excluded.opening_hours;

-- Starter agenda (relative to the day the seed runs, Barranquilla time).
with starter (title, description, category, place_slug, in_days, start_time, end_time, capacity) as (
  values
    ('Avistamiento de aves al amanecer',
     'Caminata guiada por los senderos del manglar para reconocer garzas, pelícanos y aves migratorias. Lleva gorra, agua y binoculares si tienes. Punto de encuentro: entrada principal del ecoparque.',
     'nature', 'cienaga-de-mallorquin', 2, time '06:00', time '08:30', 25),
    ('Jornada de limpieza del Gran Malecón',
     'Voluntariado para recoger residuos en la orilla del río y separar el material reciclable. Entregamos guantes y bolsas. Apta para familias.',
     'volunteer', 'gran-malecon', 3, time '07:00', time '10:00', 60),
    ('Taller abierto de millo y tambora',
     'Aprende los ritmos básicos del Carnaval con maestros de Barrio Abajo. No necesitas experiencia ni instrumento: la casa los presta.',
     'music', 'casa-del-carnaval', 4, time '16:00', time '18:00', 30),
    ('Recorrido a pie por el Centro Histórico',
     'Dos horas caminando entre el Paseo Bolívar, el antiguo edificio de la Aduana y los almacenes republicanos, con historias de la ciudad contadas por vecinos.',
     'culture', 'paseo-bolivar', 5, time '08:00', time '10:00', 20),
    ('Picnic vecinal y juegos tradicionales',
     'Trae algo para compartir y conoce a tus vecinos. Habrá bola de trapo, chequita y lectura de cuentos para los más pequeños.',
     'community', 'parque-washington', 6, time '15:00', time '18:00', null::integer),
    ('Carrera recreativa 5K por el río',
     'Recorrido de 5 km ida y vuelta por el Gran Malecón, a tu ritmo: corriendo o caminando. Hidratación en la meta.',
     'sport', 'gran-malecon', 9, time '06:00', time '08:00', 300)
),
dated as (
  select s.*, ((now() at time zone 'America/Bogota')::date + s.in_days) as day
  from starter s
)
insert into public.events (
  title, description, category, starts_at, ends_at, place_id, capacity, is_free, organizer_name
)
select
  d.title, d.description, d.category,
  (d.day + d.start_time) at time zone 'America/Bogota',
  (d.day + d.end_time) at time zone 'America/Bogota',
  p.id, d.capacity, true, 'Agenda QUILLART'
from dated d
join public.places p on p.slug = d.place_slug
where not exists (
  select 1 from public.events e
  where e.title = d.title and e.organizer_id is null and e.starts_at > now()
);

insert into public.forum_threads (title, body, category, author_name)
select
  'Bienvenida: preséntate y cuéntanos de tu barrio',
  'Este es el espacio para conectar entre vecinos y con quienes nos visitan. Cuéntanos quién eres, de qué barrio vienes y qué lugar de Barranquilla le recomendarías a alguien que llega por primera vez.',
  'general', 'Agenda QUILLART'
where not exists (
  select 1 from public.forum_threads where title = 'Bienvenida: preséntate y cuéntanos de tu barrio'
);
