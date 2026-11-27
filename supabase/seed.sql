-- Simulated 2034 seed data for the pilot corridor:
-- Estadio Metropolitano -> Troncal Murillo -> Centro -> Barrio Abajo -> Gran Malecon.
-- Idempotent: safe to re-run in Supabase SQL Editor. Re-running it also updates the
-- names and texts of rows that already exist (accents fixed on 27 Nov 2026, docs/30 U34).

insert into public.stops (
  code, name, zone, stop_type, latitude, longitude,
  is_accessible, has_qr, has_shade, has_hydration, has_recycling, has_host_duo, is_simulated
) values
  ('STOP-ESTADIO', 'Estadio Metropolitano (Acceso Norte)', 'estadio', 'host_hub', 10.9269, -74.8006, true, true, true, true, true, true, true),
  ('STOP-MURILLO-SUR', 'Estación Joaquín Barrios Polo (Troncal Murillo)', 'troncal_murillo', 'transmetro', 10.9415, -74.7960, true, true, true, false, true, false, true),
  ('STOP-MURILLO-46', 'Estación La Arenosa (Murillo con Cra 46)', 'troncal_murillo', 'transmetro', 10.9765, -74.7876, true, true, true, true, true, true, true),
  ('STOP-CENTRO', 'Paradero Plaza de la Paz (Centro)', 'centro', 'qr_point', 10.9878, -74.7889, true, true, true, true, true, true, true),
  ('STOP-BARRIO-ABAJO', 'Casa del Carnaval (Barrio Abajo)', 'barrio_abajo', 'host_hub', 10.9928, -74.7840, true, true, true, true, true, true, true),
  ('STOP-MALECON-SUR', 'Gran Malecón (Sector Caimán del Río)', 'gran_malecon', 'host_hub', 11.0038, -74.7775, true, true, true, true, true, true, true),
  ('STOP-MALECON-NORTE', 'Gran Malecón (Sector Puerta de Oro)', 'gran_malecon', 'qr_point', 11.0115, -74.7865, true, true, false, true, true, false, true)
on conflict (code) do update set
  name = excluded.name,
  is_accessible = excluded.is_accessible,
  has_shade = excluded.has_shade,
  has_hydration = excluded.has_hydration,
  has_recycling = excluded.has_recycling,
  has_host_duo = excluded.has_host_duo,
  is_simulated = true;

insert into public.flood_zones (
  code, name, zone, latitude, longitude, radius_meters,
  is_channeled, risk_level, alert_active, advisory_es, advisory_en, is_simulated
) values
  ('ARR-MURILLO-46', 'Arroyo Carrera 46 con Murillo', 'troncal_murillo', 10.9752, -74.7879, 180, false, 'high', false,
   'Evitar cruce vehicular y peatonal en lluvia fuerte; usar desvío por Troncal elevada.',
   'Avoid crossing during heavy rain; take the elevated transit detour.', true),
  ('ARR-FELICIDAD', 'Arroyo La Felicidad (Centro)', 'centro', 10.9854, -74.7868, 200, true, 'moderate', false,
   'Tramo canalizado con escorrentía en aguacero intenso; verificar accesibilidad.',
   'Channeled section with surface runoff in heavy rain; verify accessible route.', true),
  ('ARR-BARRIO-ABAJO', 'Arroyo Calle 48 (Borde Barrio Abajo)', 'barrio_abajo', 10.9912, -74.7855, 140, false, 'high', false,
   'Cruce no seguro en aguacero; anfitriones redirigen por carrera 54 accesible.',
   'Unsafe crossing in downpour; hosts redirect along accessible Carrera 54.', true),
  ('ARR-VIA-40', 'Escorrentía Vía 40 acceso Malecón', 'gran_malecon', 11.0052, -74.7808, 160, false, 'moderate', false,
   'Acumulación temporal en acceso peatonal hacia el Malecón.',
   'Temporary water buildup near the Malecon pedestrian access.', true)
on conflict (code) do update set
  name = excluded.name,
  risk_level = excluded.risk_level,
  advisory_es = excluded.advisory_es,
  advisory_en = excluded.advisory_en,
  is_simulated = true;

insert into public.route_segments (
  code, origin_stop_id, destination_stop_id, transport_mode,
  distance_km, estimated_minutes, reference_fare_cop, fare_min_cop, fare_max_cop,
  is_green_route, is_accessible, flood_zone_id, is_simulated
) values
  ('SEG-MAL-BAR-WALK',
   (select id from public.stops where code = 'STOP-MALECON-SUR'),
   (select id from public.stops where code = 'STOP-BARRIO-ABAJO'),
   'walk', 1.60, 20, 0, 0, 0, true, true, null, true),
  ('SEG-MAL-CEN-TAXI',
   (select id from public.stops where code = 'STOP-MALECON-SUR'),
   (select id from public.stops where code = 'STOP-CENTRO'),
   'taxi_verified', 2.40, 12, 12000, 10000, 14000, false, true,
   (select id from public.flood_zones where code = 'ARR-VIA-40'), true),
  ('SEG-BAR-CEN-WALK',
   (select id from public.stops where code = 'STOP-BARRIO-ABAJO'),
   (select id from public.stops where code = 'STOP-CENTRO'),
   'walk', 0.90, 11, 0, 0, 0, true, true,
   (select id from public.flood_zones where code = 'ARR-BARRIO-ABAJO'), true),
  ('SEG-CEN-MUR46-BUS',
   (select id from public.stops where code = 'STOP-CENTRO'),
   (select id from public.stops where code = 'STOP-MURILLO-46'),
   'bus', 1.50, 10, 3500, 3500, 3500, true, false,
   (select id from public.flood_zones where code = 'ARR-FELICIDAD'), true),
  ('SEG-MUR46-EST-TM',
   (select id from public.stops where code = 'STOP-MURILLO-46'),
   (select id from public.stops where code = 'STOP-ESTADIO'),
   'transmetro', 5.80, 22, 3500, 3500, 3500, true, true, null, true),
  ('SEG-MAL-EST-TM-GREEN',
   (select id from public.stops where code = 'STOP-MALECON-SUR'),
   (select id from public.stops where code = 'STOP-ESTADIO'),
   'transmetro', 9.40, 38, 3500, 3500, 3500, true, true, null, true),
  ('SEG-MAL-EST-TAXI',
   (select id from public.stops where code = 'STOP-MALECON-SUR'),
   (select id from public.stops where code = 'STOP-ESTADIO'),
   'taxi_verified', 9.80, 28, 24000, 20000, 28000, false, true,
   (select id from public.flood_zones where code = 'ARR-MURILLO-46'), true),
  ('SEG-MURSUR-EST-BIKE',
   (select id from public.stops where code = 'STOP-MURILLO-SUR'),
   (select id from public.stops where code = 'STOP-ESTADIO'),
   'bike', 1.90, 9, 0, 0, 0, true, false, null, true)
on conflict (code) do update set
  reference_fare_cop = excluded.reference_fare_cop,
  fare_min_cop = excluded.fare_min_cop,
  fare_max_cop = excluded.fare_max_cop,
  is_green_route = excluded.is_green_route,
  is_accessible = excluded.is_accessible,
  flood_zone_id = excluded.flood_zone_id,
  is_simulated = true;

insert into public.businesses (
  code, name, category, zone, stop_id, latitude, longitude,
  is_verified, is_open, commission_free, qr_token, description_es, description_en, is_simulated
) values
  ('BIZ-FRITOS-ROSA', 'Fritos Doña Rosa (Barrio Abajo)', 'food_popular', 'barrio_abajo',
   (select id from public.stops where code = 'STOP-BARRIO-ABAJO'), 10.9931, -74.7836,
   true, true, true, 'QR-BA-FRITOS-01',
   'Arepa de huevo y carimañola tradicional en Barrio Abajo. Negocio verificado sin comisión.',
   'Traditional arepa de huevo and carimanola in Barrio Abajo. Verified zero-commission vendor.', true),
  ('BIZ-MASCARAS-BA', 'Taller de Máscaras del Carnaval', 'crafts', 'barrio_abajo',
   (select id from public.stops where code = 'STOP-BARRIO-ABAJO'), 10.9924, -74.7844,
   true, true, true, 'QR-BA-CRAFTS-02',
   'Artesanos locales con demostración de máscaras tradicionales y sello de visita.',
   'Local artisans showcasing Carnival mask making with visitor stamp.', true),
  ('BIZ-ECO-MALECON', 'Jornada Verde y Reciclaje Malecón', 'eco_event', 'gran_malecon',
   (select id from public.stops where code = 'STOP-MALECON-SUR'), 11.0042, -74.7779,
   true, true, true, 'QR-GM-ECO-03',
   'Actividad ambiental con puntos de hidratación y recompensas por reciclaje.',
   'Environmental event with hydration stations and recycling rewards.', true),
  ('BIZ-CAFE-PAZ', 'Café Popular Plaza de la Paz', 'coffee', 'centro',
   (select id from public.stops where code = 'STOP-CENTRO'), 10.9881, -74.7885,
   true, true, true, 'QR-CE-CAFE-04',
   'Café caribeño y punto de sombra cerca del paradero del Centro.',
   'Caribbean coffee and shaded rest point near the Centro stop.', true),
  ('BIZ-JUGOS-ESTADIO', 'Refresquería La 45 (Estadio)', 'food_popular', 'estadio',
   (select id from public.stops where code = 'STOP-ESTADIO'), 10.9274, -74.8001,
   true, false, true, 'QR-ES-FOOD-05',
   'Jugos naturales y punto de hidratación verificado en acceso al Estadio.',
   'Fresh local juices and verified hydration stop by the Stadium.', true)
on conflict (code) do update set
  name = excluded.name,
  is_open = excluded.is_open,
  is_verified = excluded.is_verified,
  description_es = excluded.description_es,
  description_en = excluded.description_en,
  is_simulated = true;

insert into public.zone_visitor_counts (
  zone, zone_label, active_visitors, capacity_threshold, city_mode, is_simulated
) values
  ('estadio', 'Estadio Metropolitano', 4200, 6000, 'world_cup', true),
  ('troncal_murillo', 'Troncal Murillo', 1850, 3000, 'world_cup', true),
  ('centro', 'Centro Histórico', 1400, 2500, 'world_cup', true),
  ('barrio_abajo', 'Barrio Abajo', 620, 1800, 'world_cup', true),
  ('gran_malecon', 'Gran Malecón', 3100, 3500, 'world_cup', true)
on conflict (zone) do update set
  zone_label = excluded.zone_label,
  active_visitors = excluded.active_visitors,
  capacity_threshold = excluded.capacity_threshold,
  city_mode = excluded.city_mode,
  is_simulated = true;

-- Sample simulated overcharge reports (inserted only if table is empty to keep seed idempotent).
insert into public.overcharge_reports (
  segment_id, zone, transport_mode, charged_fare_cop, reference_fare_cop,
  driver_qr_code, notes, status, is_simulated
)
select
  (select id from public.route_segments where code = 'SEG-MAL-CEN-TAXI'),
  'gran_malecon', 'taxi', 35000, 12000, null,
  'Dato simulado basado en casos reportados de carreras cortas cobradas por encima de la referencia.',
  'open', true
where not exists (select 1 from public.overcharge_reports);

insert into public.overcharge_reports (
  segment_id, zone, transport_mode, charged_fare_cop, reference_fare_cop,
  driver_qr_code, notes, status, is_simulated
)
select
  (select id from public.route_segments where code = 'SEG-MAL-EST-TAXI'),
  'estadio', 'taxi', 55000, 24000, 'DRV-SIM-104',
  'Dato simulado en día de partido.',
  'in_review', true
where (select count(*) from public.overcharge_reports) < 2;
