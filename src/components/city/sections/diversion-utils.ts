import type {
	CorridorZone,
	FloodZone,
	ZoneVisitorCount,
} from "../../../lib/city-dashboard-types";
import { ZONE_LABELS } from "../../../lib/city-dashboard-utils";
import type {
	CorridorBusiness,
	RouteSegment,
} from "../../../lib/corridor/corridor-types";
import { decide } from "../../../lib/decider/decider";
import type { RouteOption } from "../../../lib/decider/decider-types";
import type {
	ActiveDiversion,
	DiversionProposal,
	DiversionRuleCheck,
} from "./city-sections-types";

/** The zone that saturates on match day and the ones that can receive people (docs/14). */
const FROM_ZONE: CorridorZone = "gran_malecon";
const CANDIDATES: readonly { zone: CorridorZone; segmentCode: string }[] = [
	{ zone: "barrio_abajo", segmentCode: "SEG-MAL-BAR-WALK" },
	{ zone: "centro", segmentCode: "SEG-MAL-CEN-TAXI" },
];
/** A destination stops receiving at 75 % of its threshold (docs/14, rules 1 and 2). */
const RECEIVE_SHARE = 0.75;
/** Zones whose neighbourhood committee sets hours and can pause (docs/14, rules 4 and 5). */
const COMMITTEE_ZONES: readonly CorridorZone[] = ["barrio_abajo"];
/** Proposed agreed hours, still to discuss with the committee (docs/14, rule 4). */
export const DIVERSION_HOURS = { from: 10, to: 20 } as const;

const fmt = new Intl.NumberFormat("es-CO");

export interface DiversionInput {
	zones: readonly ZoneVisitorCount[];
	floodZones: readonly FloodZone[];
	/** Flood zone codes counting down or active from `city-events` (aguacero). */
	blockedFloodCodes: readonly string[];
	/** Hour of the match day (8 to 23), from the `tiempo` event. */
	hour: number;
	segments: readonly RouteSegment[];
	businesses: readonly CorridorBusiness[];
	/** Zones whose committee paused the diversion. */
	pausedZones?: readonly CorridorZone[];
}

interface Candidate {
	zone: CorridorZone;
	option: RouteOption;
	quota: number;
	rules: DiversionRuleCheck[];
	mode: RouteSegment["transport_mode"];
}

function pct(count: ZoneVisitorCount): number {
	return Math.round((count.active_visitors / count.capacity_threshold) * 100);
}

function candidateFor(
	zone: CorridorZone,
	segment: RouteSegment,
	count: ZoneVisitorCount,
	input: DiversionInput,
	alerted: ReadonlySet<string>,
): Candidate {
	const label = ZONE_LABELS[zone];
	const cap = Math.floor(count.capacity_threshold * RECEIVE_SHARE);
	const quota = Math.max(0, cap - count.active_visitors);
	const floodCodes = [
		...new Set([
			...(segment.flood_zone_code ? [segment.flood_zone_code] : []),
			...input.floodZones.filter((f) => f.zone === zone).map((f) => f.code),
		]),
	];
	const floodNames = input.floodZones
		.filter((f) => floodCodes.includes(f.code))
		.map((f) => f.name);
	const flooded = floodCodes.some((code) => alerted.has(code));
	const open = input.businesses.filter(
		(b) => b.zone === zone && b.is_verified && b.is_open,
	).length;
	const committee = COMMITTEE_ZONES.includes(zone);
	const paused = input.pausedZones?.includes(zone) ?? false;
	const inHours =
		input.hour >= DIVERSION_HOURS.from && input.hour < DIVERSION_HOURS.to;

	const rules: DiversionRuleCheck[] = [
		{
			id: "capacity",
			passed: count.active_visitors < cap,
			text: `Capacidad: ${label} al ${pct(count)} %, ${count.active_visitors < cap ? "bajo" : "sobre"} el 75 % de su umbral.`,
		},
		{
			id: "quota",
			passed: quota > 0,
			text: `Cupo: ${fmt.format(cap)} − ${fmt.format(count.active_visitors)} = ${fmt.format(quota)} personas.`,
		},
		{
			id: "threshold",
			passed: true,
			text: committee
				? `Umbral fijado por el comité de barrio: ${fmt.format(count.capacity_threshold)} personas.`
				: `Umbral de la zona: ${fmt.format(count.capacity_threshold)} personas.`,
		},
	];
	if (committee) {
		rules.push(
			{
				id: "hours",
				passed: inHours,
				text: `Horario acordado: ${DIVERSION_HOURS.from}:00 a ${DIVERSION_HOURS.to}:00${inHours ? "" : ` (son las ${input.hour}:00)`}.`,
			},
			{
				id: "pause",
				passed: !paused,
				text: paused ? "El comité pausó el desvío." : "Sin pausa del comité.",
			},
		);
	}
	rules.push(
		{
			id: "arroyo",
			passed: !flooded,
			text:
				floodNames.length === 0
					? "Sin arroyos en el camino."
					: `${floodNames.join(" y ")} ${flooded ? "con alerta" : "sin alerta"}.`,
		},
		{
			id: "places",
			passed: open > 0,
			text: `Destinos: ${open} ${open === 1 ? "negocio verificado abierto" : "negocios verificados abiertos"}.`,
		},
	);

	return {
		zone,
		quota,
		rules,
		mode: segment.transport_mode,
		option: {
			id: zone,
			label,
			durationMinutes: segment.estimated_minutes,
			fareCop: segment.reference_fare_cop,
			crowdLevel: Math.min(1, count.active_visitors / count.capacity_threshold),
			accessible: segment.is_accessible,
			floodZoneIds: floodCodes,
		},
	};
}

function firstFailure(candidate: Candidate): string | null {
	return candidate.rules.find((rule) => !rule.passed)?.text ?? null;
}

/**
 * The Decider's proposal to invite people from a saturated Gran Malecón to a nearby
 * zone (docs/14). Every hard rule must pass for a destination to be considered; the
 * Decider (weighted score) picks among the rest. Null when the Malecón is not
 * saturated or no destination is safe and has room.
 */
export function buildDiversionProposal(
	input: DiversionInput,
): DiversionProposal | null {
	const byZone = new Map(input.zones.map((count) => [count.zone, count]));
	const from = byZone.get(FROM_ZONE);
	if (!from || from.active_visitors < from.capacity_threshold) return null;

	const alerted = new Set([
		...input.blockedFloodCodes,
		...input.floodZones.filter((f) => f.alert_active).map((f) => f.code),
	]);
	const candidates = CANDIDATES.flatMap(({ zone, segmentCode }) => {
		const count = byZone.get(zone);
		const segment = input.segments.find((s) => s.code === segmentCode);
		return count && segment
			? [candidateFor(zone, segment, count, input, alerted)]
			: [];
	});
	const eligible = candidates.filter((c) => firstFailure(c) === null);
	const decision = decide(
		{ activeFloodZoneIds: [...alerted], accessibleMode: false },
		eligible.map((c) => c.option),
	);
	const chosen = eligible.find((c) => c.option.id === decision.option?.id);
	if (!chosen) return null;

	const fromLabel = ZONE_LABELS[FROM_ZONE];
	const toLabel = ZONE_LABELS[chosen.zone];
	const minutes = chosen.option.durationMinutes;
	const how = chosen.mode === "walk" ? "a pie" : "en taxi verificado";
	const fromPctNow = pct(from);
	const fromPctAfter = Math.round(
		(Math.max(0, from.active_visitors - chosen.quota) /
			from.capacity_threshold) *
			100,
	);
	return {
		id: `desvio-${chosen.zone}`,
		fromLabel,
		toLabel,
		why: `El ${fromLabel} está al ${fromPctNow} % y ${toLabel} tiene cupo para ${fmt.format(chosen.quota)} personas a ${minutes} min ${how}.`,
		fromPctNow,
		fromPctAfter,
		quota: chosen.quota,
		walkMinutes: minutes,
		confidence: decision.confidence,
		chosenBy: "weighted",
		rules: chosen.rules,
		alternatives: [
			`${toLabel} (elegida).`,
			...candidates
				.filter((c) => c !== chosen)
				.map((c) => {
					const failure = firstFailure(c);
					return failure
						? `${c.option.label}: no cumple. ${failure}`
						: `${c.option.label}: cupo de ${fmt.format(c.quota)}, el Decisor la puntuó más baja.`;
				}),
			`No desviar: el ${fromLabel} seguiría saturado.`,
		],
	};
}

/** What the city sees while a diversion runs, from live zone counts. */
export interface AppliedDiversion {
	proposal: DiversionProposal;
	/** Destination zone and its visitors when the city applied it. */
	toZone: CorridorZone;
	toVisitorsAtStart: number;
	since: string;
}

export function toActiveDiversion(
	applied: AppliedDiversion,
	zones: readonly ZoneVisitorCount[],
	committeePaused: boolean,
): ActiveDiversion {
	const { proposal } = applied;
	const from = zones.find((count) => count.zone === FROM_ZONE);
	const to = zones.find((count) => count.zone === applied.toZone);
	const arrived = to
		? Math.min(
				proposal.quota,
				Math.max(0, to.active_visitors - applied.toVisitorsAtStart),
			)
		: 0;
	return {
		id: proposal.id,
		fromLabel: proposal.fromLabel,
		toLabel: proposal.toLabel,
		since: applied.since,
		arrived,
		quota: proposal.quota,
		fromPctBefore: proposal.fromPctNow,
		fromPctNow: from ? pct(from) : proposal.fromPctNow,
		committeePaused,
	};
}

/** The destination zone of a proposal built by `buildDiversionProposal`. */
export function proposalZone(proposal: DiversionProposal): CorridorZone {
	return proposal.id.replace(/^desvio-/, "") as CorridorZone;
}
