// Second batch of REAL places in the Barranquilla Metropolitan Area (docs/32-simulacion.md).
// Same rules as supabase/seed-real/places.json (docs/31): one OpenStreetMap object per place,
// found with Nominatim /search on 2026-11-27 and read back with /lookup; municipality from
// src/lib/geo/amb-boundary.ts; short factual descriptions; no opening hours; is_accessible
// only when OSM says wheelchair=yes. These are real places, NOT simulation data.
//
// Run: bun scripts/sim/places-extra.ts            → resolve + write supabase/seed-real/places-extra.json
//      bun scripts/sim/places-extra.ts --upsert   → also upsert into the places table (service role)

import { readFileSync, writeFileSync } from "node:fs";
import { ambAnchor, isInsideAmb, municipalityAt } from "../../src/lib/geo/amb-boundary";

type Kind = "nature" | "park" | "culture" | "heritage" | "sport" | "waterfront";
interface Def {
	slug: string;
	name: string;
	kind: Kind;
	osm: string;
	isFree: boolean;
	description: string;
}

// `places.kind` has no market or beach: markets go as culture (public markets) or park
// (open-air plazas OSM tags as leisure=park), beaches as waterfront.
export const EXTRA_PLACE_DEFS: Def[] = [
	// ── Barranquilla ──
	{ slug: "malecon-de-rebolo", name: "Malecón de Rebolo", kind: "waterfront", osm: "W1366977718", isFree: true,
		description: "Malecón sobre el río Magdalena en el barrio Rebolo, en el suroriente de Barranquilla." },
	{ slug: "playa-puerto-mocho", name: "Playa Puerto Mocho", kind: "waterfront", osm: "W200888711", isFree: true,
		description: "Playa de Barranquilla sobre el mar Caribe, al norte de la Ciénaga de Mallorquín." },
	{ slug: "plaza-grande-del-rio", name: "Plaza Grande del Río Magdalena", kind: "park", osm: "W404984603", isFree: true,
		description: "Plaza pública del centro, en el conjunto del Parque Cultural del Caribe." },
	{ slug: "plaza-cristobal-colon", name: "Plaza Cristóbal Colón", kind: "heritage", osm: "R9668558", isFree: true,
		description: "Plaza tradicional del barrio Boston, en el centro-norte de Barranquilla." },
	{ slug: "plaza-romelio-martinez", name: "Plaza Romelio Martínez", kind: "park", osm: "W1275831401", isFree: true,
		description: "Plaza junto al estadio Romelio Martínez, en el centro-norte de Barranquilla." },
	{ slug: "plaza-san-roque", name: "Plaza San Roque", kind: "heritage", osm: "W1327878936", isFree: true,
		description: "Plaza del barrio San Roque, frente a la iglesia del mismo nombre." },
	{ slug: "plaza-santa-marta-barranquilla", name: "Plaza Santa Marta", kind: "park", osm: "W138315683", isFree: true,
		description: "Plaza del barrio Simón Bolívar, en el suroriente de Barranquilla." },
	{ slug: "plaza-paloma-de-la-paz", name: "Plaza Paloma de la Paz", kind: "park", osm: "W544601580", isFree: true,
		description: "Plaza pública del barrio Los Andes." },
	{ slug: "parque-los-andes", name: "Parque Los Andes", kind: "park", osm: "W50875358", isFree: true,
		description: "Parque de barrio en Los Andes, con zonas verdes y canchas." },
	{ slug: "parque-las-nieves", name: "Parque Las Nieves", kind: "park", osm: "W998195737", isFree: true,
		description: "Parque del barrio Las Nieves, en el suroriente de Barranquilla." },
	{ slug: "parque-miramar", name: "Parque Miramar", kind: "park", osm: "W1056494561", isFree: true,
		description: "Parque público del noroccidente de Barranquilla." },
	{ slug: "parque-el-golf", name: "Parque El Golf", kind: "park", osm: "W1580842014", isFree: true,
		description: "Parque público del norte de Barranquilla." },
	{ slug: "parque-universal", name: "Parque Universal", kind: "park", osm: "W1182366028", isFree: true,
		description: "Parque de barrio en la localidad Suroriente de Barranquilla." },
	{ slug: "parque-maria-de-la-paz", name: "Parque María de la Paz", kind: "park", osm: "W931605642", isFree: true,
		description: "Parque de barrio en California, en el suroccidente de Barranquilla." },
	{ slug: "mercado-campesino-san-vicente", name: "Mercado Campesino San Vicente", kind: "park", osm: "W1273960396", isFree: true,
		description: "Espacio público del barrio San Vicente señalado en OpenStreetMap como lugar de mercado campesino." },
	{ slug: "mercado-campesino-california", name: "Mercado Campesino Barrio California", kind: "park", osm: "W1273965210", isFree: true,
		description: "Espacio público del barrio California señalado en OpenStreetMap como lugar de mercado campesino." },
	{ slug: "mercado-campesino-santo-domingo", name: "Mercado Campesino Barrio Santo Domingo", kind: "park", osm: "W1273965587", isFree: true,
		description: "Espacio público del barrio Santo Domingo señalado en OpenStreetMap como lugar de mercado campesino." },
	{ slug: "mercado-el-playon", name: "Mercado El Playón", kind: "culture", osm: "W940595332", isFree: true,
		description: "Mercado popular de la zona de Barranquillita, junto al caño del Mercado." },
	{ slug: "museo-a-cielo-abierto-barrio-abajo", name: "Museo a cielo abierto de Barrio Abajo", kind: "culture", osm: "N13714327484", isFree: true,
		description: "Recorrido de murales y piezas en las calles de Barrio Abajo, cuna del Carnaval." },
	{ slug: "concha-acustica-ciudad-jardin", name: "Concha Acústica", kind: "culture", osm: "W556868621", isFree: true,
		description: "Escenario al aire libre en el barrio Ciudad Jardín." },
	{ slug: "centro-cultural-comfamiliar", name: "Centro Cultural Comfamiliar", kind: "culture", osm: "W695758848", isFree: false,
		description: "Centro cultural de la caja de compensación Comfamiliar en El Prado." },
	{ slug: "centro-cultural-villas-de-san-pablo", name: "Centro Cultural Villas de San Pablo", kind: "culture", osm: "W1553039818", isFree: true,
		description: "Centro cultural de la urbanización Villas de San Pablo, en el occidente de Barranquilla." },
	{ slug: "biblioteca-villas-de-san-pablo", name: "Biblioteca Pública de Villas de San Pablo", kind: "culture", osm: "W675079933", isFree: true,
		description: "Biblioteca pública de la urbanización Villas de San Pablo." },
	{ slug: "iglesia-san-roque", name: "Iglesia San Roque", kind: "heritage", osm: "W1262714171", isFree: true,
		description: "Templo tradicional del barrio San Roque, en el centro de Barranquilla." },
	{ slug: "iglesia-san-jose", name: "Iglesia de San José", kind: "heritage", osm: "W860316009", isFree: true,
		description: "Templo del centro de Barranquilla." },
	{ slug: "iglesia-del-carmen", name: "Iglesia Nuestra Señora del Carmen", kind: "heritage", osm: "W1272774448", isFree: true,
		description: "Templo del barrio Boston, en el centro-norte de Barranquilla." },
	{ slug: "iglesia-del-rosario", name: "Iglesia Nuestra Señora del Rosario", kind: "heritage", osm: "W793541297", isFree: true,
		description: "Templo del barrio El Rosario, cerca del centro de Barranquilla." },
	{ slug: "iglesia-torcoroma", name: "Iglesia Nuestra Señora de las Gracias de Torcoroma", kind: "heritage", osm: "W443665273", isFree: true,
		description: "Templo del barrio Granadillo, en el norte de Barranquilla." },
	{ slug: "iglesia-tres-avemarias", name: "Iglesia de las Tres Avemarías", kind: "heritage", osm: "W172448758", isFree: true,
		description: "Templo del barrio Paraíso, en el norte de Barranquilla." },
	{ slug: "coliseo-sugar-baby-rojas", name: "Coliseo Sugar Baby Rojas", kind: "sport", osm: "W695758846", isFree: false,
		description: "Coliseo cubierto del complejo deportivo del barrio Modelo." },
	{ slug: "coliseo-eugenio-bolivar-romero", name: "Coliseo Eugenio Bolívar Romero", kind: "sport", osm: "W1318007064", isFree: false,
		description: "Escenario deportivo cubierto del barrio Modelo." },
	{ slug: "estadio-moderno-julio-torres", name: "Estadio Moderno Julio Torres", kind: "sport", osm: "W138317409", isFree: false,
		description: "Estadio tradicional del barrio Montes, en el suroriente de Barranquilla." },
	// ── Soledad ──
	{ slug: "mercado-publico-soledad", name: "Mercado Público de Soledad", kind: "culture", osm: "W374617038", isFree: true,
		description: "Plaza de mercado del centro de Soledad." },
	{ slug: "parque-villa-estadio-soledad", name: "Parque de Villa Estadio", kind: "park", osm: "W544942071", isFree: true,
		description: "Parque del barrio Villa Estadio, en Soledad." },
	{ slug: "parroquia-divino-nino-soledad", name: "Parroquia Divino Niño", kind: "heritage", osm: "W1058349150", isFree: true,
		description: "Parroquia de la urbanización El Parque, en Soledad." },
	{ slug: "parroquia-medalla-milagrosa-soledad", name: "Parroquia La Medalla Milagrosa", kind: "heritage", osm: "W288360860", isFree: true,
		description: "Parroquia del barrio Manuela Beltrán, en Soledad." },
	{ slug: "parroquia-jesus-nazareno-soledad", name: "Parroquia Jesús Nazareno", kind: "heritage", osm: "W1312656062", isFree: true,
		description: "Parroquia del barrio Costa Hermosa, en Soledad." },
	// ── Malambo ──
	{ slug: "casa-de-la-cultura-malambo", name: "Casa de la Cultura Félix Suárez Barrios", kind: "culture", osm: "W982103427", isFree: true,
		description: "Casa de la cultura de Malambo, en el barrio La Magdalena." },
	{ slug: "estadio-beisbol-humberto-vasquez", name: "Estadio de Béisbol Humberto Vásquez", kind: "sport", osm: "W706300218", isFree: false,
		description: "Estadio de béisbol de Malambo, en Villa Esperanza." },
	{ slug: "parque-san-antonio-malambo", name: "Parque San Antonio", kind: "park", osm: "W1220343779", isFree: true,
		description: "Parque de barrio en Malambo." },
	{ slug: "parque-el-triangulo-malambo", name: "Parque El Triángulo", kind: "park", osm: "W984924739", isFree: true,
		description: "Parque de barrio en El Concorde, Malambo." },
	{ slug: "parque-julio-flores-malambo", name: "Parque Julio Flores", kind: "park", osm: "W768008008", isFree: true,
		description: "Parque de barrio en El Concorde, Malambo." },
	{ slug: "parque-la-luna-malambo", name: "Parque La Luna", kind: "park", osm: "W982286462", isFree: true,
		description: "Parque de barrio en Malambo." },
	{ slug: "iglesia-bellavista-malambo", name: "Iglesia Bellavista", kind: "heritage", osm: "W1267756903", isFree: true,
		description: "Templo del barrio Montecarlo, en Malambo." },
	// ── Galapa ──
	{ slug: "biblioteca-villa-olimpica-galapa", name: "Biblioteca Pública Municipal Villa Olímpica", kind: "culture", osm: "W675651918", isFree: true,
		description: "Biblioteca pública municipal en Villa Olímpica, Galapa." },
	{ slug: "parque-norte-villa-olimpica-galapa", name: "Parque Norte de Villa Olímpica", kind: "park", osm: "W1285818270", isFree: true,
		description: "Parque de la urbanización Villa Olímpica, en Galapa." },
	{ slug: "parque-los-mangales-galapa", name: "Parque Los Mangales", kind: "park", osm: "W1079311771", isFree: true,
		description: "Parque de barrio en La Piragua, Galapa." },
	{ slug: "parque-acueducto-villa-olimpica-galapa", name: "Parque del Acueducto Villa Olímpica", kind: "park", osm: "W1285816874", isFree: true,
		description: "Parque de la urbanización Villa Olímpica, en Galapa." },
	{ slug: "cancha-la-candelaria-galapa", name: "Cancha La Candelaria", kind: "sport", osm: "W524258513", isFree: true,
		description: "Cancha pública cerca del centro de Galapa." },
	// ── Puerto Colombia ──
	{ slug: "casa-de-la-cultura-puerto-colombia", name: "Casa de la Cultura de Puerto Colombia", kind: "culture", osm: "W205300520", isFree: true,
		description: "Casa de la cultura del municipio, en el centro de Puerto Colombia." },
	{ slug: "malecon-puerto-colombia", name: "Malecón de Puerto Colombia", kind: "waterfront", osm: "W800458081", isFree: true,
		description: "Paseo costero del casco urbano de Puerto Colombia, frente al mar Caribe." },
	{ slug: "playa-mangle-puerto-colombia", name: "Playa Mangle", kind: "waterfront", osm: "W1570552728", isFree: true,
		description: "Playa del casco urbano de Puerto Colombia." },
	{ slug: "playa-solinilla", name: "Playa Solinilla", kind: "waterfront", osm: "W1574883899", isFree: true,
		description: "Playa de Puerto Colombia entre Salgar y el corregimiento de La Playa." },
	{ slug: "playas-del-country", name: "Playas del Country", kind: "waterfront", osm: "W1241179750", isFree: true,
		description: "Tramo de playa de Puerto Colombia sobre el mar Caribe." },
	{ slug: "museo-mapuka", name: "Museo Mapuka", kind: "culture", osm: "N9528426715", isFree: false,
		description: "Museo de arqueología y etnografía del Caribe colombiano en el campus de la Universidad del Norte." },
];

const RETRIEVED = "2026-11-27";
const osmUrl = (id: string) =>
	`https://www.openstreetmap.org/${{ N: "node", W: "way", R: "relation" }[id[0] as "N" | "W" | "R"]}/${id.slice(1)}`;
const round = (n: number) => Math.round(n * 1e5) / 1e5;

async function lookup(ids: string[]) {
	const out = new Map<string, any>();
	for (let i = 0; i < ids.length; i += 40) {
		const url = `https://nominatim.openstreetmap.org/lookup?format=jsonv2&addressdetails=1&extratags=1&osm_ids=${ids.slice(i, i + 40).join(",")}`;
		const res = await fetch(url, { headers: { "User-Agent": "amb-places-loader/1.0", "Accept-Language": "es" } });
		if (!res.ok) throw new Error(`lookup ${res.status}`);
		for (const r of (await res.json()) as any[]) out.set(`${r.osm_type[0].toUpperCase()}${r.osm_id}`, r);
		await new Promise((r) => setTimeout(r, 1200));
	}
	return out;
}

if (import.meta.main) {
	const existing = JSON.parse(readFileSync("supabase/seed-real/places.json", "utf8")) as any[];
	const taken = new Set(existing.map((p) => p.slug));
	const takenOsm = new Set(existing.map((p) => p.source?.osm));
	const all = await lookup(EXTRA_PLACE_DEFS.map((d) => d.osm));
	const places: any[] = [];
	const skipped: string[] = [];
	for (const def of EXTRA_PLACE_DEFS) {
		const r = all.get(def.osm);
		if (taken.has(def.slug) || takenOsm.has(osmUrl(def.osm))) { skipped.push(`${def.slug}: already in places.json`); continue; }
		if (!r) { skipped.push(`${def.slug}: OSM ${def.osm} not returned`); continue; }
		let lat = round(+r.lat), lng = round(+r.lon);
		const anchor = ambAnchor(lat, lng);
		if (!anchor) { skipped.push(`${def.slug}: outside AMB`); continue; }
		const muni = municipalityAt(anchor[0], anchor[1]);
		if (!muni) { skipped.push(`${def.slug}: no municipality`); continue; }
		if (!isInsideAmb(lat, lng)) { lat = round(anchor[0]); lng = round(anchor[1]); }
		const a = r.address ?? {};
		const barrio = a.neighbourhood ?? a.quarter ?? a.suburb ?? null;
		places.push({
			slug: def.slug, name: def.name, kind: def.kind, municipality: muni.key,
			neighborhood: barrio && muni.key === "barranquilla" && !/^Localidad|Perímetro/.test(barrio) ? barrio : muni.name,
			description: def.description,
			address: a.road ? (a.house_number ? `${a.road} # ${a.house_number}` : a.road) : null,
			latitude: lat, longitude: lng,
			is_accessible: r.extratags?.wheelchair === "yes",
			is_free: def.isFree, opening_hours: null,
			source: { osm: osmUrl(def.osm), retrieved: RETRIEVED, license: "ODbL — © OpenStreetMap contributors" },
		});
	}
	writeFileSync("supabase/seed-real/places-extra.json", `${JSON.stringify(places, null, "\t")}\n`);
	const by: Record<string, number> = {};
	for (const p of places) by[p.municipality] = (by[p.municipality] ?? 0) + 1;
	console.log(`places-extra ${places.length}`, by, "skipped:", skipped);
	if (process.argv.includes("--upsert")) {
		const { admin } = await import("./sim-env");
		const { error } = await admin.from("places").upsert(
			places.map(({ municipality: _m, source: _s, ...p }) => p),
			{ onConflict: "slug" },
		);
		if (error) throw error;
		const { count } = await admin.from("places").select("*", { count: "exact", head: true });
		console.log("places in DB:", count);
	}
}
