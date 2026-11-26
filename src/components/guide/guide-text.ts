// Interface labels around the Guide's answer, in the visitor's language.
// The Guide itself answers in five languages; the cards around it use Spanish
// for Spanish speakers and English for everyone else.

import type { TransportMode } from "../../lib/corridor/corridor-types";
import type { GuideLanguage } from "../../lib/guide/guide-local";

export interface GuideText {
	greenRoute: string;
	noGreenRoute: string;
	referenceFare: string;
	free: string;
	minutes: (value: number) => string;
	fairTaxi: string;
	floodBlocked: string;
	showOnMap: string;
	reportOvercharge: string;
	modes: Record<TransportMode, string>;
	report: {
		title: string;
		vehicle: string;
		vehicles: Record<"taxi" | "bus" | "informal" | "other", string>;
		charged: string;
		driverCode: string;
		notes: string;
		optional: string;
		send: string;
		sending: string;
		cancel: string;
		close: string;
		saved: (percent: number | null) => string;
		savedOffline: string;
		failed: string;
		privacy: string;
	};
}

const ES: GuideText = {
	greenRoute: "Ruta verde",
	noGreenRoute: "Sin ruta verde directa",
	referenceFare: "Tarifa de referencia",
	free: "Gratis",
	minutes: (value) => `${value} min`,
	fairTaxi: "Taxi verificado, tarifa justa",
	floodBlocked: "Evitamos un tramo con alerta de arroyo.",
	showOnMap: "Ver en el mapa",
	reportOvercharge: "Reportar cobro abusivo",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Taxi verificado",
		walk: "A pie",
		bike: "Bici",
	},
	report: {
		title: "Reportar cobro abusivo",
		vehicle: "¿En qué ibas?",
		vehicles: { taxi: "Taxi", bus: "Bus", informal: "Informal", other: "Otro" },
		charged: "¿Cuánto te cobraron? (COP)",
		driverCode: "Código QR del conductor",
		notes: "¿Qué pasó?",
		optional: "opcional",
		send: "Enviar reporte",
		sending: "Enviando…",
		cancel: "Cancelar",
		close: "Cerrar",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Reporte enviado. Te cobraron ${percent} % más que la tarifa de referencia; la ciudad ya lo ve.`
				: "Reporte enviado. La ciudad ya lo ve.",
		savedOffline: "No pudimos enviarlo ahora. Lo guardamos en este teléfono.",
		failed:
			"No pudimos enviar el reporte. Revisa los datos e intenta de nuevo.",
		privacy: "No pedimos tu nombre ni tu ubicación.",
	},
};

const EN: GuideText = {
	greenRoute: "Green route",
	noGreenRoute: "No direct green route",
	referenceFare: "Reference fare",
	free: "Free",
	minutes: (value) => `${value} min`,
	fairTaxi: "Verified taxi, fair fare",
	floodBlocked: "We avoided a leg with a flood alert.",
	showOnMap: "Show on map",
	reportOvercharge: "Report an overcharge",
	modes: {
		transmetro: "Transmetro",
		bus: "Bus",
		taxi_verified: "Verified taxi",
		walk: "On foot",
		bike: "Bike",
	},
	report: {
		title: "Report an overcharge",
		vehicle: "What were you riding?",
		vehicles: {
			taxi: "Taxi",
			bus: "Bus",
			informal: "Informal",
			other: "Other",
		},
		charged: "How much did they charge? (COP)",
		driverCode: "Driver's QR code",
		notes: "What happened?",
		optional: "optional",
		send: "Send report",
		sending: "Sending…",
		cancel: "Cancel",
		close: "Close",
		saved: (percent) =>
			percent !== null && percent > 0
				? `Report sent. You were charged ${percent}% above the reference fare; the city can see it now.`
				: "Report sent. The city can see it now.",
		savedOffline: "We could not send it now. It is saved on this phone.",
		failed: "We could not send the report. Check the details and try again.",
		privacy: "We never ask for your name or location.",
	},
};

export function guideText(language: GuideLanguage): GuideText {
	return language === "es" ? ES : EN;
}
