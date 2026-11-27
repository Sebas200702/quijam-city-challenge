// Pure formatting of city data for the model and the local wrap-ups: fares per
// transport mode and program indicators, with amounts kept exact.

import type { OpenDataRecord } from "../open-data/open-data-types";

export const MODE_LABELS: Record<string, string> = {
	transmetro: "Transmetro",
	bus: "bus",
	taxi_verified: "taxi",
};

export interface ModeFare {
	mode: string;
	fare_min_cop: number;
	fare_max_cop: number;
}

function cop(value: number): string {
	return `$${new Intl.NumberFormat("es-CO").format(value)}`;
}

/** Lowest and highest fare per paid mode, in the order modes first appear. */
export function faresByMode(records: readonly OpenDataRecord[]): ModeFare[] {
	const fares = new Map<string, ModeFare>();
	for (const record of records) {
		const mode = String(record.transport_mode ?? "");
		const label = MODE_LABELS[mode];
		const min = Number(record.fare_min_cop ?? record.reference_fare_cop);
		const max = Number(record.fare_max_cop ?? record.reference_fare_cop);
		if (!label || !Number.isFinite(min) || !Number.isFinite(max) || max <= 0)
			continue;
		const current = fares.get(label);
		fares.set(label, {
			mode: label,
			fare_min_cop: Math.min(current?.fare_min_cop ?? min, min),
			fare_max_cop: Math.max(current?.fare_max_cop ?? max, max),
		});
	}
	return [...fares.values()];
}

/** "Transmetro: $3.500; taxi: $12.000 – $28.000". */
export function formatFares(fares: readonly ModeFare[]): string {
	return fares
		.map(
			(fare) =>
				`${fare.mode}: ${
					fare.fare_min_cop === fare.fare_max_cop
						? cop(fare.fare_min_cop)
						: `${cop(fare.fare_min_cop)} – ${cop(fare.fare_max_cop)}`
				}`,
		)
		.join("; ");
}

/** "Territorio: 80 % (Meta: 90 %)", one per indicator. */
export function formatIndicators(
	indicators: readonly { dimension: string; current: string; target: string }[],
): string {
	return indicators
		.map((item) => `${item.dimension}: ${item.current} (${item.target})`)
		.join("; ");
}
