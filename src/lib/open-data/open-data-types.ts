export type OpenDataSlug =
	| "lugares"
	| "eventos"
	| "paraderos"
	| "tarifas-y-tramos"
	| "arroyos"
	| "negocios-verificados";

/** Distinguishes real citizen/city records from corridor reference seed data (rule 9). */
export type OpenDataOrigin = "community" | "reference";

export type OpenDataDimension =
	| "territorio"
	| "sostenibilidad"
	| "ciudad_inteligente"
	| "ciudadania"
	| "economia";

export type OpenDataSource = "supabase" | "reference_seed";

export type OpenDataFormat = "json" | "csv";

export type OpenDataCell = string | number | boolean | null;

export type OpenDataRecord = Record<string, OpenDataCell>;

export interface OpenDataDatasetMeta {
	slug: OpenDataSlug;
	title: string;
	description: string;
	origin: OpenDataOrigin;
	dimension: OpenDataDimension;
	license: string;
	licenseUrl: string;
	privacyNote: string;
	/** Strict allowlist of public fields published in JSON and CSV. */
	columns: readonly string[];
}

export interface OpenDataCatalogItem extends OpenDataDatasetMeta {
	recordCount: number;
	source: OpenDataSource;
	endpoints: {
		json: string;
		csv: string;
	};
	/** Small preview sample rendered in the portal UI (never includes PII). */
	previewRows: OpenDataRecord[];
}

export interface OpenDataCatalogPayload {
	portal: string;
	license: string;
	licenseUrl: string;
	privacy: string;
	generatedAt: string;
	totalDatasets: number;
	datasets: OpenDataCatalogItem[];
}

export interface OpenDataDatasetPayload {
	dataset: OpenDataDatasetMeta;
	source: OpenDataSource;
	generatedAt: string;
	recordCount: number;
	records: OpenDataRecord[];
}
