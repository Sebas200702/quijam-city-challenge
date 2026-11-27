import type {
	DimensionIndicator,
	IndicatorProgressTone,
	IndicatorStateLabel,
	LiveIndicatorsRawInput,
} from "./live-indicators-types";

export const INDICATOR_TARGETS = {
	accessibleRoutesPct: 100,
	greenRoutesPct: 80,
	openDatasetsCount: 6,
	resolutionRatePct: 80,
	openVerifiedBusinessesPct: 100,
} as const;

const NUMBER_FORMAT = new Intl.NumberFormat("es-CO");

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioPercent(part: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((part / total) * 100);
}

/**
 * Maps progress towards the program target to QUILLART status tone + explicit Spanish label.
 * Never depends on color alone (WCAG 2.2 AA & QUILLART design principles).
 */
export function getIndicatorVisualState(progressPercent: number): {
	tone: IndicatorProgressTone;
	stateLabel: IndicatorStateLabel;
} {
	if (progressPercent >= 80) {
		return { tone: "green", stateLabel: "En meta" };
	}
	if (progressPercent >= 50) {
		return { tone: "gold", stateLabel: "En avance" };
	}
	return { tone: "red", stateLabel: "Por mejorar" };
}

/**
 * Computes the 5 program indicators (one per dimension), explicitly separating
 * real community metrics from corridor pilot reference data (rule 9, epic #79).
 */
export function computeProgramIndicators(
	input: LiveIndicatorsRawInput,
): DimensionIndicator[] {
	// 1. Territorio: accessible corridor routes + real accessible public spaces
	const totalSegments = input.segments.length;
	const accessibleSegments = input.segments.filter(
		(segment) => segment.is_accessible,
	).length;
	const accessibleRoutesPct = ratioPercent(accessibleSegments, totalSegments);
	const territoryProgress = clampPercent(
		(accessibleRoutesPct / INDICATOR_TARGETS.accessibleRoutesPct) * 100,
	);
	const totalPlaces = input.places.length;
	const accessiblePlaces = input.places.filter(
		(place) => place.is_accessible,
	).length;

	const territorio: DimensionIndicator = {
		dimension: "territorio",
		dimensionLabel: "Territorio",
		title: "Rutas y espacios accesibles",
		currentDisplay: `${accessibleRoutesPct} %`,
		targetDisplay: `Meta: ${INDICATOR_TARGETS.accessibleRoutesPct} %`,
		progressPercent: territoryProgress,
		...getIndicatorVisualState(territoryProgress),
		origin: totalPlaces > 0 ? "mixed" : "reference",
		communityFacts:
			totalPlaces > 0
				? [
						{
							label: "Espacios públicos accesibles",
							value: `${accessiblePlaces} de ${totalPlaces}`,
						},
					]
				: [],
		referenceFacts: [
			{
				label: "Tramos accesibles del corredor",
				value: `${accessibleSegments} de ${totalSegments}`,
			},
		],
	};

	// 2. Sostenibilidad: green mobility share + active arroyo monitoring
	const greenSegments = input.segments.filter(
		(segment) => segment.is_green_route,
	).length;
	const greenRoutesPct = ratioPercent(greenSegments, totalSegments);
	const sustainabilityProgress = clampPercent(
		(greenRoutesPct / INDICATOR_TARGETS.greenRoutesPct) * 100,
	);
	const activeFloodCodes = new Set<string>(
		input.floodZones
			.filter((zone) => zone.alert_active)
			.map((zone) => zone.code),
	);
	for (const code of input.liveEventFloodCodes ?? []) {
		activeFloodCodes.add(code);
	}

	const sostenibilidad: DimensionIndicator = {
		dimension: "sostenibilidad",
		dimensionLabel: "Sostenibilidad",
		title: "Trayectos en modo verde",
		currentDisplay: `${greenRoutesPct} %`,
		targetDisplay: `Meta: ${INDICATOR_TARGETS.greenRoutesPct} %`,
		progressPercent: sustainabilityProgress,
		...getIndicatorVisualState(sustainabilityProgress),
		origin: "reference",
		communityFacts: [],
		referenceFacts: [
			{
				label: "Tramos públicos, a pie o bici",
				value: `${greenSegments} de ${totalSegments}`,
			},
			{
				label: "Arroyos monitoreados",
				value: `${input.floodZones.length} (${activeFloodCodes.size} alerta activa)`,
			},
		],
	};

	// 3. Ciudad inteligente: published open datasets
	const openDatasetsCount = Math.max(0, input.openDatasetsCount);
	const smartCityProgress = clampPercent(
		(openDatasetsCount / INDICATOR_TARGETS.openDatasetsCount) * 100,
	);

	const ciudadInteligente: DimensionIndicator = {
		dimension: "ciudad_inteligente",
		dimensionLabel: "Ciudad inteligente",
		title: "Conjuntos de datos abiertos",
		currentDisplay: `${openDatasetsCount}`,
		targetDisplay: `Meta: ${INDICATOR_TARGETS.openDatasetsCount} conjuntos`,
		progressPercent: smartCityProgress,
		...getIndicatorVisualState(smartCityProgress),
		origin: "community",
		communityFacts: [
			{
				label: "Descarga pública JSON y CSV",
				value: "CC BY 4.0 · /api/datos/",
			},
			{
				label: "Privacidad",
				value: "Sin datos personales",
			},
		],
		referenceFacts: [],
		actionHref: "/datos",
		actionLabel: "Ver portal /datos",
	};

	// 4. Ciudadanía: real community activity & closed city notices + resolved overcharge reports
	const publishedEvents = input.events.filter(
		(event) =>
			event.moderation_status === "published" && event.status === "published",
	);
	const totalRegistrations = publishedEvents.reduce(
		(sum, event) => sum + Math.max(0, event.registered_count),
		0,
	);

	const cityNotices = [
		...input.events,
		...input.forumThreads,
		...input.forumPosts,
	].filter((item) => item.triage_priority !== "none");
	const closedCityNotices = cityNotices.filter(
		(item) => item.city_resolved_at !== null,
	).length;

	const totalOverchargeReports = input.reports.length;
	const resolvedOverchargeReports = input.reports.filter(
		(report) => report.status === "resolved",
	).length;

	const totalTrackedCases = cityNotices.length + totalOverchargeReports;
	const totalClosedCases = closedCityNotices + resolvedOverchargeReports;
	const resolutionRatePct =
		totalTrackedCases > 0
			? ratioPercent(totalClosedCases, totalTrackedCases)
			: 100;
	const citizenshipProgress = clampPercent(
		(resolutionRatePct / INDICATOR_TARGETS.resolutionRatePct) * 100,
	);

	const ciudadania: DimensionIndicator = {
		dimension: "ciudadania",
		dimensionLabel: "Ciudadanía",
		title: "Participación y casos resueltos",
		currentDisplay:
			totalTrackedCases > 0 ? `${resolutionRatePct} %` : "Sin pendientes",
		targetDisplay: `Meta: ${INDICATOR_TARGETS.resolutionRatePct} % resueltos`,
		progressPercent: citizenshipProgress,
		...getIndicatorVisualState(citizenshipProgress),
		origin: totalOverchargeReports > 0 ? "mixed" : "community",
		communityFacts: [
			{
				label: "Eventos publicados",
				value: NUMBER_FORMAT.format(publishedEvents.length),
			},
			{
				label: "Inscripciones en agenda",
				value: NUMBER_FORMAT.format(totalRegistrations),
			},
			{
				label: "Avisos a la ciudad cerrados",
				value: `${closedCityNotices} de ${cityNotices.length}`,
			},
		],
		referenceFacts: [
			{
				label: "Reportes de cobro resueltos",
				value: `${resolvedOverchargeReports} de ${totalOverchargeReports}`,
			},
		],
		actionHref: "/moderacion",
		actionLabel: "Revisar /moderacion",
	};

	// 5. Economía: verified zero-commission popular businesses currently open
	const verifiedBusinesses = input.businesses.filter(
		(business) => business.is_verified,
	);
	const openVerifiedBusinesses = verifiedBusinesses.filter(
		(business) => business.is_open,
	);
	const openBarrioAbajo = openVerifiedBusinesses.filter(
		(business) => business.zone === "barrio_abajo",
	).length;
	const openVerifiedPct = ratioPercent(
		openVerifiedBusinesses.length,
		verifiedBusinesses.length,
	);
	const economyProgress = clampPercent(
		(openVerifiedPct / INDICATOR_TARGETS.openVerifiedBusinessesPct) * 100,
	);

	const economia: DimensionIndicator = {
		dimension: "economia",
		dimensionLabel: "Economía",
		title: "Negocios verificados abiertos",
		currentDisplay: `${openVerifiedBusinesses.length} / ${verifiedBusinesses.length}`,
		targetDisplay: `Meta: ${verifiedBusinesses.length} abiertos (${INDICATOR_TARGETS.openVerifiedBusinessesPct} %)`,
		progressPercent: economyProgress,
		...getIndicatorVisualState(economyProgress),
		origin: "reference",
		communityFacts: [],
		referenceFacts: [
			{
				label: "Verificados sin comisión",
				value: `${verifiedBusinesses.length} comercios`,
			},
			{
				label: "Abiertos en Barrio Abajo",
				value: `${openBarrioAbajo}`,
			},
		],
	};

	return [territorio, sostenibilidad, ciudadInteligente, ciudadania, economia];
}
