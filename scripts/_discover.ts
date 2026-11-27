import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { municipalityAt } from "../src/lib/geo/amb-boundary";
const CACHE = "C:/Users/Santi/orca/workspaces/quijam-city-challenge/qa-live/ingest/nom-cache.json";
const cache: Record<string, any> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
let last = 0;
async function nom(q: string, limit = 10, extra = "&viewbox=-75.00,11.12,-74.70,10.80&bounded=1") {
	const key = `${q}|${limit}|${extra}`;
	if (cache[key]) return cache[key];
	const wait = 1100 - (Date.now() - last);
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	last = Date.now();
	const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&countrycodes=co&limit=${limit}&q=${encodeURIComponent(q)}${extra}`;
	const res = await fetch(url, { headers: { "User-Agent": "amb-places-loader/1.0", "Accept-Language": "es" } });
	if (!res.ok) throw new Error(`${res.status} ${q}`);
	const data = await res.json();
	cache[key] = data;
	writeFileSync(CACHE, JSON.stringify(cache));
	return data;
}
const existing = new Set(JSON.parse(readFileSync("supabase/seed-real/places.json", "utf8")).map((p: any) => p.source?.osm?.split("/").slice(-2).join("/")));
for (const q of process.argv.slice(2)) {
	const r = await nom(q);
	console.log(`## ${q}`);
	for (const x of r) {
		const m = municipalityAt(+x.lat, +x.lon);
		const id = `${x.osm_type}/${x.osm_id}`;
		console.log(`  ${existing.has(id) ? "DUP " : ""}${x.category}/${x.type} | ${x.name} | ${(+x.lat).toFixed(5)},${(+x.lon).toFixed(5)} | ${x.osm_type[0].toUpperCase()}${x.osm_id} | ${m?.key ?? "OUT"} | ${x.address?.neighbourhood ?? x.address?.suburb ?? ""}`);
	}
}
