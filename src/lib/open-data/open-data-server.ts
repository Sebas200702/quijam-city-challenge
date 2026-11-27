import { PLACES } from "../community/places-catalog";
import { buildStarterEvents } from "../community/starter-content";
import { loadCorridorData } from "../corridor/corridor-data";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import {
	buildDatasetEndpoints,
	findOpenDataMeta,
	OPEN_DATA_CATALOG,
	OPEN_DATA_LICENSE,
	OPEN_DATA_LICENSE_URL,
	OPEN_DATA_PORTAL_NAME,
	OPEN_DATA_PRIVACY_NOTE,
	projectPublicRecords,
} from "./open-data-catalog";
import type {
	OpenDataCatalogItem,
	OpenDataCatalogPayload,
	OpenDataDatasetPayload,
	OpenDataRecord,
	OpenDataSlug,
	OpenDataSource,
} from "./open-data-types";

const PREVIEW_ROW_LIMIT = 3;
const SUPABASE_TIMEOUT_MS = 3000;

export interface OpenDataLoadOptions {
	/** Skip Supabase queries and use the local public seed (for offline tests). */
	skipRemote?: boolean;
}

async function withTimeout<T>(
	promise: PromiseLike<T>,
	timeoutMs: number,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			Promise.resolve(promise),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error("Open data query timed out")),
					timeoutMs,
				);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

interface LoadedRows {
	source: OpenDataSource;
	rows: Record<string, unknown>[];
}

interface PlaceRow {
	slug: string;
	name: string;
	kind: string;
	neighborhood: string;
	description: string;
	address: string | null;
	latitude: number;
	longitude: number;
	is_accessible: boolean;
	is_free: boolean;
	opening_hours: string | null;
}

interface PublicEventRow {
	id: string;
	title: string;
	category: string;
	starts_at: string;
	ends_at: string | null;
	location_text: string | null;
	capacity: number | null;
	registered_count: number;
	is_free: boolean;
	price_cop: number | null;
	place: { name: string } | null;
}

async function loadPlacesRows(
	options?: OpenDataLoadOptions,
): Promise<LoadedRows> {
	if (!options?.skipRemote) {
		try {
			const { supabase } = await import("../supabase");
			const res = await withTimeout(
				supabase
					.from("places")
					.select(
						"slug, name, kind, neighborhood, description, address, latitude, longitude, is_accessible, is_free, opening_hours",
					)
					.order("name", { ascending: true })
					.overrideTypes<PlaceRow[], { merge: false }>(),
				SUPABASE_TIMEOUT_MS,
			);
			if (!res.error && res.data && res.data.length > 0) {
				return {
					source: "supabase",
					rows: res.data as unknown as Record<string, unknown>[],
				};
			}
		} catch {
			// Fall back to local public catalog when Supabase is unavailable.
		}
	}

	return {
		source: "reference_seed",
		rows: PLACES.map((place) => ({
			slug: place.slug,
			name: place.name,
			kind: place.kind,
			neighborhood: place.neighborhood,
			description: place.description,
			address: place.address,
			latitude: place.latitude,
			longitude: place.longitude,
			is_accessible: place.isAccessible,
			is_free: place.isFree,
			opening_hours: place.openingHours,
		})),
	};
}

async function loadPublishedEventsRows(
	options?: OpenDataLoadOptions,
): Promise<LoadedRows> {
	if (!options?.skipRemote) {
		try {
			const { supabase } = await import("../supabase");
			// Strictly published & approved events only; never registrations, profiles, or held/removed rows.
			const res = await withTimeout(
				supabase
					.from("events")
					.select(
						"id, title, category, starts_at, ends_at, location_text, capacity, registered_count, is_free, price_cop, place:places(name)",
					)
					.eq("moderation_status", "published")
					.eq("status", "published")
					.order("starts_at", { ascending: true })
					.limit(200)
					.overrideTypes<PublicEventRow[], { merge: false }>(),
				SUPABASE_TIMEOUT_MS,
			);
			if (!res.error && res.data) {
				return {
					source: "supabase",
					rows: res.data.map((row) => ({
						id: row.id,
						title: row.title,
						category: row.category,
						starts_at: row.starts_at,
						ends_at: row.ends_at,
						place_name: row.place?.name ?? null,
						location_text: row.location_text,
						capacity: row.capacity,
						registered_count: row.registered_count,
						is_free: row.is_free,
						price_cop: row.price_cop,
					})),
				};
			}
		} catch {
			// Fall back to starter public agenda when Supabase is unavailable.
		}
	}

	const placeById = new Map(PLACES.map((place) => [place.id, place.name]));
	const placeIdBySlug = (slug: string) =>
		PLACES.find((place) => place.slug === slug)?.id ?? null;
	const starter = buildStarterEvents(new Date(), placeIdBySlug);

	return {
		source: "reference_seed",
		rows: starter
			.filter(
				(event) =>
					event.moderationStatus === "published" &&
					event.status === "published",
			)
			.map((event) => ({
				id: event.id,
				title: event.title,
				category: event.category,
				starts_at: event.startsAt,
				ends_at: event.endsAt,
				place_name: event.placeId
					? (placeById.get(event.placeId) ?? null)
					: null,
				location_text: event.locationText,
				capacity: event.capacity,
				registered_count: event.registeredCount,
				is_free: event.isFree,
				price_cop: event.priceCop,
			})),
	};
}

function toOpenDataSource(source: "supabase" | "seed"): OpenDataSource {
	return source === "supabase" ? "supabase" : "reference_seed";
}

async function loadCorridorSafe(
	options?: OpenDataLoadOptions,
): Promise<Awaited<ReturnType<typeof loadCorridorData>>> {
	if (options?.skipRemote) {
		return { data: CORRIDOR_SEED, source: "seed" };
	}
	try {
		return await withTimeout(loadCorridorData(), SUPABASE_TIMEOUT_MS);
	} catch {
		return { data: CORRIDOR_SEED, source: "seed" };
	}
}

async function loadRawRowsForSlug(
	slug: OpenDataSlug,
	options?: OpenDataLoadOptions,
	corridor?: Awaited<ReturnType<typeof loadCorridorData>>,
): Promise<LoadedRows> {
	if (slug === "lugares") {
		return loadPlacesRows(options);
	}
	if (slug === "eventos") {
		return loadPublishedEventsRows(options);
	}

	const loadedCorridor = corridor ?? (await loadCorridorSafe(options));
	const source = toOpenDataSource(loadedCorridor.source);

	switch (slug) {
		case "paraderos":
			return {
				source,
				rows: loadedCorridor.data.stops as unknown as Record<string, unknown>[],
			};
		case "tarifas-y-tramos":
			return {
				source,
				rows: loadedCorridor.data.segments as unknown as Record<
					string,
					unknown
				>[],
			};
		case "arroyos":
			return {
				source,
				rows: loadedCorridor.data.floodZones as unknown as Record<
					string,
					unknown
				>[],
			};
		case "negocios-verificados":
			return {
				source,
				rows: loadedCorridor.data.businesses.filter(
					(business) => business.is_verified,
				) as unknown as Record<string, unknown>[],
			};
	}
}

export async function loadOpenDataDataset(
	slug: OpenDataSlug,
	options?: OpenDataLoadOptions,
): Promise<OpenDataDatasetPayload> {
	const meta = findOpenDataMeta(slug);
	if (!meta) {
		throw new Error(`Unknown open dataset: ${slug}`);
	}
	const { source, rows } = await loadRawRowsForSlug(slug, options);
	const records: OpenDataRecord[] = projectPublicRecords(rows, meta.columns);

	return {
		dataset: meta,
		source,
		generatedAt: new Date().toISOString(),
		recordCount: records.length,
		records,
	};
}

export async function loadOpenDataCatalog(
	options?: OpenDataLoadOptions,
): Promise<OpenDataCatalogPayload> {
	const [places, events, corridor] = await Promise.all([
		loadPlacesRows(options),
		loadPublishedEventsRows(options),
		loadCorridorSafe(options),
	]);

	const preloaded: Record<OpenDataSlug, LoadedRows> = {
		lugares: places,
		eventos: events,
		paraderos: {
			source: toOpenDataSource(corridor.source),
			rows: corridor.data.stops as unknown as Record<string, unknown>[],
		},
		"tarifas-y-tramos": {
			source: toOpenDataSource(corridor.source),
			rows: corridor.data.segments as unknown as Record<string, unknown>[],
		},
		arroyos: {
			source: toOpenDataSource(corridor.source),
			rows: corridor.data.floodZones as unknown as Record<string, unknown>[],
		},
		"negocios-verificados": {
			source: toOpenDataSource(corridor.source),
			rows: corridor.data.businesses.filter(
				(business) => business.is_verified,
			) as unknown as Record<string, unknown>[],
		},
	};

	const datasets: OpenDataCatalogItem[] = OPEN_DATA_CATALOG.map((meta) => {
		const loaded = preloaded[meta.slug];
		const records = projectPublicRecords(loaded.rows, meta.columns);
		return {
			...meta,
			recordCount: records.length,
			source: loaded.source,
			endpoints: buildDatasetEndpoints(meta.slug),
			previewRows: records.slice(0, PREVIEW_ROW_LIMIT),
		};
	});

	return {
		portal: OPEN_DATA_PORTAL_NAME,
		license: OPEN_DATA_LICENSE,
		licenseUrl: OPEN_DATA_LICENSE_URL,
		privacy: OPEN_DATA_PRIVACY_NOTE,
		generatedAt: new Date().toISOString(),
		totalDatasets: datasets.length,
		datasets,
	};
}
