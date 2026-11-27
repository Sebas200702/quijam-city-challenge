import {
	Accessibility,
	Bus,
	Check,
	CircleDashed,
	Droplets,
	Footprints,
	HandCoins,
	Info,
	type LucideIcon,
	MapPin,
	MessageCircle,
	Route,
	ShieldCheck,
	Store,
	Tag,
	TriangleAlert,
	Waves,
	WifiOff,
	X,
} from "lucide-react";
import {
	type SelectionDetail,
	STOP_TYPE_LABELS,
	ZONE_LABELS,
} from "../../lib/corridor/corridor-selection";
import type {
	BusinessCategory,
	CorridorDataSource,
	StatusTone,
	StopType,
} from "../../lib/corridor/corridor-types";
import {
	CATEGORY_LABELS_EN,
	MAP_COPY,
	type MapCopy,
	type MapLang,
	SERVICE_HINTS,
	STOP_TYPE_LABELS_EN,
	ZONE_LABELS_EN,
} from "./map-chrome-copy";
import "./map-chrome.css";
import { CorridorArt, HostPairArt, OfflineArt } from "./map-illustrations";
import {
	CATEGORY_ICONS,
	SERVICE_ICONS,
	SERVICE_TONES,
	ServiceTag,
	STOP_TYPE_ICONS,
	serviceLabel,
} from "./service-icon";

const BADGE_CLASS: Record<StatusTone, string> = {
	green: "q-badge--optimal",
	gold: "q-badge--high",
	red: "q-badge--alert",
	neutral: "q-badge--neutral",
};

const BAND_CLASS: Record<StatusTone, string> = {
	green: "q-band--green",
	gold: "q-band--gold",
	red: "q-band--red",
	neutral: "q-band--gold",
};

/** Spanish labels from corridor-selection, read back to pick icons and English copy. */
const CATEGORY_BY_LABEL: Record<string, BusinessCategory> = {
	"Comida popular": "food_popular",
	Artesanías: "crafts",
	Cultura: "culture",
	"Evento ambiental": "eco_event",
	Café: "coffee",
};
const STOP_TYPE_BY_LABEL = Object.fromEntries(
	Object.entries(STOP_TYPE_LABELS).map(([key, label]) => [label, key]),
) as Record<string, StopType>;
const ZONE_EN_BY_LABEL = Object.fromEntries(
	Object.entries(ZONE_LABELS).map(([key, label]) => [
		label,
		ZONE_LABELS_EN[key as keyof typeof ZONE_LABELS_EN],
	]),
) as Record<string, string>;

const FACT_LABELS_EN: Record<string, string> = {
	Tipo: "Type",
	Zona: "Area",
	Categoría: "Category",
	Radio: "Radius",
};

const STATUS_LABELS_EN: Record<string, string> = {
	Accesible: "Accessible",
	"Acceso limitado": "Limited access",
	"Alerta activa": "Active alert",
	"Riesgo bajo": "Low risk",
	"Riesgo moderado": "Moderate risk",
	"Riesgo alto": "High risk",
	"Riesgo crítico": "Critical risk",
};

/** Icon and translated value of each fact the selection describes. */
function describeFact(
	fact: { label: string; value: string },
	lang: MapLang,
): { Icon: LucideIcon; label: string; value: string } {
	const en = lang === "en";
	const label = en ? (FACT_LABELS_EN[fact.label] ?? fact.label) : fact.label;
	const stopType = STOP_TYPE_BY_LABEL[fact.value];
	const category = CATEGORY_BY_LABEL[fact.value];
	if (fact.label === "Tipo" && stopType) {
		return {
			Icon: STOP_TYPE_ICONS[stopType],
			label,
			value: en ? STOP_TYPE_LABELS_EN[stopType] : fact.value,
		};
	}
	if (fact.label === "Categoría" && category) {
		return {
			Icon: CATEGORY_ICONS[category],
			label,
			value: en ? CATEGORY_LABELS_EN[category] : fact.value,
		};
	}
	if (fact.label === "Zona") {
		return {
			Icon: MapPin,
			label,
			value: en ? (ZONE_EN_BY_LABEL[fact.value] ?? fact.value) : fact.value,
		};
	}
	if (fact.label === "Radio")
		return { Icon: CircleDashed, label, value: fact.value };
	return { Icon: Tag, label, value: fact.value };
}

/** Big icon of the selected point: stop type, business category or arroyo. */
function heroIcon(detail: SelectionDetail): LucideIcon {
	if (detail.kind === "floodZone") return Waves;
	const kindFact = detail.facts.find(
		(fact) => fact.label === "Tipo" || fact.label === "Categoría",
	);
	const stopType = kindFact && STOP_TYPE_BY_LABEL[kindFact.value];
	if (stopType) return STOP_TYPE_ICONS[stopType];
	const category = kindFact && CATEGORY_BY_LABEL[kindFact.value];
	if (category) return CATEGORY_ICONS[category];
	return detail.kind === "stop" ? Bus : Store;
}

interface StatusView {
	Icon: LucideIcon;
	label: string;
	badge: string;
	tone: StatusTone;
}

/** The status as word plus glyph, never colour alone. */
function statusView(
	detail: SelectionDetail,
	copy: MapCopy,
	lang: MapLang,
): StatusView {
	const { tone, label } = detail.status;
	const word =
		lang === "en" ? (STATUS_LABELS_EN[label] ?? label) : (label as string);
	if (detail.kind === "business") {
		const open = tone !== "neutral";
		return open
			? {
					Icon: Check,
					label: copy.open,
					badge: BADGE_CLASS.green,
					tone: "green",
				}
			: { Icon: X, label: copy.closed, badge: BADGE_CLASS.neutral, tone };
	}
	if (detail.kind === "floodZone") {
		const Icon = tone === "green" ? ShieldCheck : TriangleAlert;
		return { Icon, label: word, badge: BADGE_CLASS[tone], tone };
	}
	const Icon = tone === "green" ? Accessibility : Info;
	return { Icon, label: word, badge: BADGE_CLASS[tone], tone };
}

/** Wording of the card's single primary action. */
function primaryAction(
	detail: SelectionDetail,
	status: StatusView,
	copy: MapCopy,
): { Icon: LucideIcon; label: string } {
	if (detail.kind === "floodZone")
		return { Icon: Route, label: copy.safeRoute };
	if (detail.kind === "business" && status.tone === "neutral") {
		return { Icon: MessageCircle, label: copy.askGuide };
	}
	return { Icon: Footprints, label: copy.getThere };
}

interface DetailCardProps {
	detail: SelectionDetail | null;
	source: CorridorDataSource;
	onClose: () => void;
	onOpenGuide: () => void;
	/** Copy language. Defaults to Spanish. */
	lang?: MapLang;
}

/**
 * QUILLART card (q-card) for the selected point: status as word plus glyph,
 * verified badge, services and host pair, and one primary action. With nothing
 * selected it shows the brand empty state with a corridor illustration.
 */
export function DetailCard({
	detail,
	source,
	onClose,
	onOpenGuide,
	lang = "es",
}: DetailCardProps) {
	const copy = MAP_COPY[lang];
	const offline = source === "seed" && (
		<p className="mc-offline-note">
			<OfflineArt className="mc-offline-note__art" />
			<span>{copy.offlineNote}</span>
		</p>
	);

	if (!detail) {
		return (
			<section className="q-card corridor-detail corridor-detail--empty">
				<div className="q-flag" aria-hidden="true">
					<i />
					<i />
					<i />
				</div>
				<div className="q-card__body">
					<CorridorArt className="mc-empty-art" />
					<div className="corridor-detail__intro">
						<h2 className="q-h2">{copy.detailEmptyTitle}</h2>
						<p className="q-sm q-muted">{copy.detailEmptyWhy}</p>
					</div>
					<ul className="mc-hints">
						<li>
							<span className="mc-hint-icon mc-tone--green" aria-hidden="true">
								<Bus size={16} strokeWidth={1.75} />
							</span>
							{copy.detailEmptyHintStops}
						</li>
						<li>
							<span className="mc-hint-icon mc-tone--red" aria-hidden="true">
								<Droplets size={16} strokeWidth={1.75} />
							</span>
							{copy.detailEmptyHintFlood}
						</li>
						<li>
							<span className="mc-hint-icon mc-tone--gold" aria-hidden="true">
								<Store size={16} strokeWidth={1.75} />
							</span>
							{copy.detailEmptyHintBusinesses}
						</li>
					</ul>
					{offline}
				</div>
				<div className="q-card__foot">
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--block"
						onClick={onOpenGuide}
					>
						<MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />
						{copy.askGuide}
					</button>
				</div>
			</section>
		);
	}

	const status = statusView(detail, copy, lang);
	const action = primaryAction(detail, status, copy);
	const Hero = heroIcon(detail);
	const facts = detail.facts.map((fact) => describeFact(fact, lang));
	const isBusiness = detail.kind === "business";
	const verified = isBusiness && detail.services.includes("verified");
	const commissionFree =
		isBusiness && detail.services.includes("commissionFree");
	const stopServices = isBusiness ? [] : detail.services;
	const hasHosts = detail.kind === "stop" && stopServices.includes("hosts");
	const floodActive = detail.kind === "floodZone" && status.tone === "red";
	const closed = isBusiness && status.tone === "neutral";

	return (
		<section
			className="q-card q-card--raised q-card--frame corridor-detail mc-detail"
			aria-live="polite"
			aria-labelledby="corridor-detail-title"
		>
			<div className={`q-band ${BAND_CLASS[detail.status.tone]}`} />
			<div className="q-card__head mc-detail-head">
				<span
					className={`q-tile mc-tile-sm mc-hero mc-hero--${detail.status.tone}`}
					aria-hidden="true"
				>
					<Hero size={22} strokeWidth={1.75} />
				</span>
				<div className="mc-detail-head__text">
					<p className="q-eyebrow">{copy.eyebrow[detail.kind]}</p>
					<h2 id="corridor-detail-title" className="q-h2">
						{detail.title}
					</h2>
				</div>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={copy.close}
					onClick={onClose}
				>
					<X size={20} strokeWidth={1.75} aria-hidden="true" />
				</button>
			</div>

			<div className="q-card__body">
				<div className="q-row mc-badges">
					<span className={`q-badge ${status.badge}`}>
						<status.Icon size={14} strokeWidth={1.75} aria-hidden="true" />
						{status.label}
					</span>
					{verified && (
						<span className="q-badge q-badge--high">
							<span className="q-star mc-badge-star" aria-hidden="true" />
							{copy.verified}
						</span>
					)}
				</div>

				{floodActive && (
					<p className="mc-why mc-why--alert">
						<TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
						{copy.floodActiveWhy}
					</p>
				)}
				{detail.description && (
					<p className="q-p q-muted">{detail.description}</p>
				)}
				{closed && <p className="mc-why">{copy.closedWhy}</p>}

				{(facts.length > 0 || commissionFree) && (
					<dl className="q-dl mc-facts">
						{facts.map(({ Icon, label, value }) => (
							<div key={label}>
								<dt>
									<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
									{label}
								</dt>
								<dd>{value}</dd>
							</div>
						))}
						{commissionFree && (
							<div>
								<dt>
									<HandCoins size={14} strokeWidth={1.75} aria-hidden="true" />
									{copy.commission}
								</dt>
								<dd>{serviceLabel("commissionFree", lang)}</dd>
							</div>
						)}
					</dl>
				)}

				{hasHosts && (
					<div className="mc-hosts">
						<HostPairArt className="mc-hosts__art" />
						<div>
							<p className="mc-hosts__title">{copy.hostsTitle}</p>
							<p className="q-sm q-muted">{copy.hostsWhy}</p>
						</div>
					</div>
				)}

				{stopServices.length > 0 && (
					<>
						<ul className="corridor-detail__tags" aria-label={copy.services}>
							{stopServices.map((service) => (
								<ServiceTag key={service} service={service} lang={lang} />
							))}
						</ul>
						<details className="q-details">
							<summary>{copy.servicesMeaning}</summary>
							<ul className="q-details__body mc-service-hints">
								{stopServices.map((service) => {
									const Icon = SERVICE_ICONS[service];
									return (
										<li key={service}>
											<span
												className={`mc-hint-icon mc-tone--${SERVICE_TONES[service]}`}
												aria-hidden="true"
											>
												<Icon size={16} strokeWidth={1.75} />
											</span>
											<span>
												<strong>{serviceLabel(service, lang)}.</strong>{" "}
												{SERVICE_HINTS[lang][service]}
											</span>
										</li>
									);
								})}
							</ul>
						</details>
					</>
				)}

				{source === "seed" && (
					<p className="mc-offline-line">
						<WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
						{copy.offlineNote}
					</p>
				)}
			</div>

			<div className="q-card__foot">
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--block"
					onClick={onOpenGuide}
				>
					<action.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
					{action.label}
				</button>
			</div>
		</section>
	);
}
