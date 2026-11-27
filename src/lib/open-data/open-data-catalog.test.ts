import { describe, expect, it } from "vitest";
import {
	buildDatasetEndpoints,
	findOpenDataMeta,
	isOpenDataSlug,
	OPEN_DATA_CATALOG,
	OPEN_DATA_LICENSE,
	parseOpenDataFormat,
	projectPublicRecords,
	serializeToCsv,
} from "./open-data-catalog";
import { loadOpenDataCatalog, loadOpenDataDataset } from "./open-data-server";

const FORBIDDEN_PII_OR_INTERNAL_KEYS = new Set([
	"email",
	"phone",
	"user_id",
	"organizer_id",
	"organizer_name",
	"owner_user_id",
	"author_id",
	"author_name",
	"qr_token",
	"driver_qr_code",
	"moderation_status",
	"moderation_labels",
	"password",
]);

describe("open-data-catalog", () => {
	it("defines 6 public datasets with descriptions, CC BY 4.0 license, and zero PII columns", () => {
		expect(OPEN_DATA_CATALOG.map((d) => d.slug)).toEqual([
			"lugares",
			"eventos",
			"paraderos",
			"tarifas-y-tramos",
			"arroyos",
			"negocios-verificados",
		]);

		for (const dataset of OPEN_DATA_CATALOG) {
			expect(dataset.description.length).toBeGreaterThan(20);
			expect(dataset.license).toBe(OPEN_DATA_LICENSE);
			expect(dataset.privacyNote).toContain("Ley 1581");
			for (const column of dataset.columns) {
				expect(FORBIDDEN_PII_OR_INTERNAL_KEYS.has(column)).toBe(false);
			}
		}

		expect(findOpenDataMeta("lugares")?.origin).toBe("community");
		expect(findOpenDataMeta("eventos")?.origin).toBe("community");
		expect(findOpenDataMeta("paraderos")?.origin).toBe("reference");
		expect(findOpenDataMeta("tarifas-y-tramos")?.origin).toBe("reference");
	});

	it("validates slugs, formats, and endpoint paths", () => {
		expect(isOpenDataSlug("lugares")).toBe(true);
		expect(isOpenDataSlug("eventos")).toBe(true);
		expect(isOpenDataSlug("profiles")).toBe(false);
		expect(isOpenDataSlug("event_registrations")).toBe(false);

		expect(parseOpenDataFormat(null)).toBe("json");
		expect(parseOpenDataFormat("json")).toBe("json");
		expect(parseOpenDataFormat("csv")).toBe("csv");
		expect(parseOpenDataFormat("xml")).toBeNull();

		expect(buildDatasetEndpoints("eventos")).toEqual({
			json: "/api/datos/eventos?format=json",
			csv: "/api/datos/eventos?format=csv",
		});
	});

	it("strips non-allowlisted personal or internal columns during projection", () => {
		const rawRows = [
			{
				id: "ev-1",
				title: "Taller abierto",
				category: "music",
				organizer_id: "user-secret-uuid",
				organizer_name: "Persona Real",
				email: "persona@example.com",
				qr_token: "SECRET-QR",
			},
		];

		const projected = projectPublicRecords(rawRows, [
			"id",
			"title",
			"category",
			"capacity",
		]);

		expect(projected).toEqual([
			{
				id: "ev-1",
				title: "Taller abierto",
				category: "music",
				capacity: null,
			},
		]);
		expect(Object.keys(projected[0] ?? {})).not.toContain("organizer_id");
		expect(Object.keys(projected[0] ?? {})).not.toContain("email");
	});

	it("serializes RFC 4180 CSV, neutralizes formulas, and preserves negative coordinates", () => {
		const csv = serializeToCsv(
			["name", "longitude", "note"],
			[
				{
					name: 'Parque "Central", Norte',
					longitude: -74.7815,
					note: "=HYPERLINK(1)",
				},
				{
					name: "Gran Malecón",
					longitude: -74.7775,
					note: "Línea 1\nLínea 2",
				},
			],
		);

		expect(csv).toBe(
			[
				"name,longitude,note",
				'"Parque ""Central"", Norte",-74.7815,\'=HYPERLINK(1)',
				'Gran Malecón,-74.7775,"Línea 1\nLínea 2"',
				"",
			].join("\r\n"),
		);
	});

	it("loads catalog and individual datasets with only allowlisted public fields", async () => {
		const catalog = await loadOpenDataCatalog({ skipRemote: true });
		expect(catalog.totalDatasets).toBe(OPEN_DATA_CATALOG.length);
		expect(catalog.datasets.every((item) => item.recordCount > 0)).toBe(true);

		const events = await loadOpenDataDataset("eventos", { skipRemote: true });
		expect(events.recordCount).toBeGreaterThan(0);
		for (const row of events.records) {
			expect(Object.keys(row)).toEqual([...events.dataset.columns]);
		}

		const businesses = await loadOpenDataDataset("negocios-verificados", {
			skipRemote: true,
		});
		expect(businesses.recordCount).toBeGreaterThan(0);
		for (const row of businesses.records) {
			expect(row.is_verified).toBe(true);
			expect(Object.keys(row)).not.toContain("qr_token");
			expect(Object.keys(row)).not.toContain("owner_user_id");
		}
	});
});
