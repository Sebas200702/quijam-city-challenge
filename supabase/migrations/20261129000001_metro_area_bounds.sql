-- Coordinates of corridor points: from the pilot box to the Barranquilla Metropolitan Area.
-- The old box (10.85–11.10, -74.90 to -74.70) left out Puerto Colombia (-74.955) and the
-- south of Soledad and Malambo. The new box is the one around the five municipalities
-- (Barranquilla, Soledad, Malambo, Puerto Colombia, Galapa), from the OpenStreetMap
-- boundaries in src/lib/geo/amb-boundary-data.ts, rounded outwards (docs/30, U09).
-- The app still checks the exact outline (isInsideAmb) before drawing a point.
-- Places keep their wider box (10.80–11.15, -75.00 to -74.60): the catalog lists a few
-- natural areas just outside the AMB, shown without a pin (docs/24).
-- Every seeded point fits both boxes, so the new checks validate at once.

alter table public.stops
  drop constraint if exists stops_latitude_check,
  drop constraint if exists stops_longitude_check,
  add constraint stops_latitude_check check (latitude between 10.81 and 11.11),
  add constraint stops_longitude_check check (longitude between -74.99 and -74.72);

alter table public.flood_zones
  drop constraint if exists flood_zones_latitude_check,
  drop constraint if exists flood_zones_longitude_check,
  add constraint flood_zones_latitude_check check (latitude between 10.81 and 11.11),
  add constraint flood_zones_longitude_check check (longitude between -74.99 and -74.72);

alter table public.businesses
  drop constraint if exists businesses_latitude_check,
  drop constraint if exists businesses_longitude_check,
  add constraint businesses_latitude_check check (latitude between 10.81 and 11.11),
  add constraint businesses_longitude_check check (longitude between -74.99 and -74.72);
