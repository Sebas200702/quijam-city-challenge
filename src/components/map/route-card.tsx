import {
	Accessibility,
	Bike,
	Bus,
	CarTaxiFront,
	Clock,
	Flag,
	Footprints,
	Leaf,
	type LucideIcon,
	MapPin,
	MessageCircle,
	Navigation,
	RotateCw,
	Ticket,
	TramFront,
	WifiOff,
	X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { CorridorStop } from "../../lib/corridor/corridor-types";
import type { MapMessages } from "../../lib/i18n/dictionaries/map";
import { useT } from "../../lib/i18n/use-language";
import type { PlanResponse } from "../../lib/routing/plan-route";
import type { Itinerary, TransportMode } from "../../lib/routing/routing-types";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import {
	confidenceLabel,
	isRecalculated,
	type RouteQuery,
	routeWhy,
	useOnline,
} from "./use-route-plan";

/** Fare in pesos, formatted for the chosen language. */
const makeFare = (t: MapMessages) => {
	const formatter = new Intl.NumberFormat(t.locale, {
		maximumFractionDigits: 0,
	});
	return (cop: number) => (cop === 0 ? t.free : `$${formatter.format(cop)}`);
};
/** "Estadio Metropolitano (Acceso Norte)" -> "Estadio Metropolitano". */
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "");

const MODES: Record<TransportMode, { icon: LucideIcon; tile: string }> = {
	transmetro: { icon: TramFront, tile: "q-tile--gold" },
	bus: { icon: Bus, tile: "q-tile--gold" },
	taxi_verified: { icon: CarTaxiFront, tile: "q-tile--gold" },
	walk: { icon: Footprints, tile: "" },
	bike: { icon: Bike, tile: "q-tile--green" },
};

const STROKE = 1.75;

interface RouteCardProps {
	stops: CorridorStop[];
	query: RouteQuery;
	onQueryChange: (query: RouteQuery) => void;
	plan: PlanResponse | null;
	loading: boolean;
	error: string | null;
	/** The one interrupting alert (flood), shown on top of the card. */
	alert?: ReactNode;
	/** Opens the Guide. On wide screens the panel has its own button, so this one hides there. */
	onOpenGuide: () => void;
	/** Starts guidance on the chosen route. When set it becomes the primary action. */
	onStart?: () => void;
	/** Dismisses the route sheet (and its line on the map). */
	onClose?: () => void;
}

/** Small decorative illustration for a state block. */
function StateArt({ src }: { src: string }) {
	return (
		<span className="q-illus" style={{ padding: 8 }} aria-hidden="true">
			<img src={src} alt="" style={{ height: 88, width: "auto" }} />
		</span>
	);
}

/** Minutes since the shown plan arrived, for the offline note. */
function usePlanAge(plan: PlanResponse | null): number {
	const [receivedAt, setReceivedAt] = useState(() => Date.now());
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (plan) setReceivedAt(Date.now());
	}, [plan]);
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(timer);
	}, []);
	return Math.max(0, Math.round((now - receivedAt) / 60_000));
}

function StateBlock({
	kind,
	title,
	text,
	glyph,
	children,
}: {
	kind: "loading" | "empty" | "error" | "offline";
	title: string;
	text: string;
	glyph: ReactNode;
	children?: ReactNode;
}) {
	return (
		<div
			className={`q-state q-state--${kind}`}
			role={kind === "error" ? "alert" : "status"}
			style={{ minHeight: 0, padding: "16px 8px" }}
		>
			{glyph}
			<p className="q-state__title">{title}</p>
			<p className="q-state__text">{text}</p>
			{children ? <div className="q-state__action">{children}</div> : null}
		</div>
	);
}

function Legs({
	route,
	names,
	accessible,
}: {
	route: Itinerary;
	names: Map<string, string>;
	/** Mentions accessible legs only when the visitor asked for them. */
	accessible: boolean;
}) {
	const t = useT().map;
	return (
		<ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={t.legs}>
			{route.legs.map((leg) => {
				const mode = MODES[leg.mode];
				const Icon = mode.icon;
				const to = names.get(leg.destinationStopCode) ?? t.yourDestination;
				const from = names.get(leg.originStopCode) ?? t.yourPoint;
				return (
					<li key={leg.code} className="flex items-center gap-3">
						<span
							className={`q-tile ${mode.tile}`}
							style={{ width: 40, height: 40, borderRadius: 12 }}
							aria-hidden="true"
						>
							<Icon size={20} strokeWidth={STROKE} />
						</span>
						<span className="flex min-w-0 flex-1 flex-col">
							<b className="text-[15px] leading-5">
								{t.legTo(t.modes[leg.mode], to)}
							</b>
							<small className="q-muted text-[13px] leading-[18px]">
								{t.legFrom(
									from,
									leg.distanceKm.toLocaleString(t.locale),
									accessible && leg.isAccessible,
								)}
							</small>
						</span>
						<span className="q-num font-semibold">
							{t.minutesShort(leg.minutes)}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

/** "Tu siguiente paso": one card, one decision, one sentence of why. Details stay folded. */
export function RouteCard({
	stops,
	query,
	onQueryChange,
	plan,
	loading,
	error,
	alert,
	onOpenGuide,
	onStart,
	onClose,
}: RouteCardProps) {
	const t = useT().map;
	const fare = makeFare(t);
	const clock = new Intl.DateTimeFormat(t.locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const reasonLabel = {
		"active-flood": t.reasonFlood,
		"not-accessible": t.reasonNotAccessible,
	} as const;
	const online = useOnline();
	const age = usePlanAge(plan);
	const names = new Map(stops.map((stop) => [stop.code, shortName(stop.name)]));
	const route = plan?.route ?? null;
	const recalculated = isRecalculated(plan);
	const sameStop = query.origin === query.destination;
	const retry = () => onQueryChange({ ...query });
	const paidLeg = route?.legs.find((leg) => leg.fareCop > 0) ?? null;
	const reportHref = paidLeg
		? `/reportar?segment=${encodeURIComponent(paidLeg.code)}`
		: "/reportar";
	const taxi =
		route?.legs.some((leg) => leg.mode === "taxi_verified") === false
			? plan?.alternatives.find((item) => /taxi/i.test(item.label))
			: undefined;
	const MainIcon = route
		? MODES[
				(route.legs.find((leg) => leg.mode !== "walk") ?? route.legs[0]).mode
			].icon
		: Navigation;
	const badge = route
		? route.isGreen && route.accessible
			? t.badgeGreenAccessible
			: route.isGreen
				? t.badgeGreen
				: route.accessible
					? t.badgeAccessible
					: null
		: null;
	const arrival = route
		? clock.format(new Date(Date.now() + route.durationMinutes * 60_000))
		: "";
	const destination = names.get(query.destination) ?? t.yourDestination;

	let body: ReactNode;
	if (sameStop) {
		body = (
			<StateBlock
				kind="empty"
				title={t.sameStopTitle}
				text={t.sameStopText}
				glyph={<StateArt src="/illustrations/undraw-location-search.svg" />}
			/>
		);
	} else if (loading && !plan) {
		body = (
			<StateBlock
				kind="loading"
				title={query.accessibleMode ? t.loadingTitleAccessible : t.loadingTitle}
				text={t.loadingText}
				glyph={
					<span className="q-state__glyph" aria-hidden="true">
						<span className="q-star q-star--think" />
					</span>
				}
			/>
		);
	} else if (error && !plan) {
		body = online ? (
			<StateBlock
				kind="error"
				title={t.errorTitle}
				text={t.errorText}
				glyph={<StateArt src="/illustrations/live-map.svg" />}
			>
				<button
					type="button"
					className="q-btn q-btn--secondary"
					onClick={retry}
				>
					<RotateCw size={18} strokeWidth={STROKE} aria-hidden="true" />
					{t.retry}
				</button>
			</StateBlock>
		) : (
			<StateBlock
				kind="offline"
				title={t.offlineTitle}
				text={t.offlineText}
				glyph={
					<span className="q-state__glyph" aria-hidden="true">
						<WifiOff size={28} strokeWidth={STROKE} />
					</span>
				}
			/>
		);
	} else if (plan && !route) {
		body = (
			<StateBlock
				kind="empty"
				title={query.accessibleMode ? t.noRouteAccessible : t.noRouteSafe}
				text={routeWhy(plan, t)}
				glyph={<StateArt src="/illustrations/walking.svg" />}
			>
				{/* Hands off to the mobility agent in Quillart AI instead of a dead end. */}
				<AskQuillartButton prompt={t.askHowToGet(destination)} />
			</StateBlock>
		);
	} else if (plan && route) {
		body = (
			<div
				className="flex flex-col gap-3"
				aria-busy={loading}
				style={{ opacity: loading ? 0.6 : 1 }}
			>
				<div className="flex items-center gap-3">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h2 className="q-next-step__title" id="route-card-title">
							{t.goTo(destination)}
						</h2>
						<p className="q-next-step__why">{routeWhy(plan, t)}</p>
					</div>
					<span
						className="q-tile q-tile--green"
						style={{ width: 64, height: 64, borderRadius: 20 }}
						aria-hidden="true"
					>
						<MainIcon size={30} strokeWidth={STROKE} />
					</span>
				</div>

				<dl className="q-next-step__facts">
					<div>
						<dt>
							<Clock size={13} strokeWidth={STROKE} aria-hidden="true" />{" "}
							{t.factTime}
						</dt>
						<dd>{t.minutesShort(route.durationMinutes)}</dd>
					</div>
					<div>
						<dt>
							<Ticket size={13} strokeWidth={STROKE} aria-hidden="true" />{" "}
							{t.factFare}
						</dt>
						<dd>{fare(route.fareCop)}</dd>
					</div>
					<div>
						<dt>
							<Flag size={13} strokeWidth={STROKE} aria-hidden="true" />{" "}
							{t.factArrival}
						</dt>
						<dd>{arrival}</dd>
					</div>
				</dl>

				<Legs route={route} names={names} accessible={query.accessibleMode} />

				{taxi ? (
					<p className="q-sm m-0 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--gold-soft)] px-3 py-2">
						<CarTaxiFront
							size={16}
							strokeWidth={STROKE}
							aria-hidden="true"
							className="flex-none text-[var(--gold-text)]"
						/>
						<span>
							{t.taxiBefore(taxi.durationMinutes)}{" "}
							<strong className="q-num">{fare(taxi.fareCop)}</strong>
						</span>
					</p>
				) : null}

				<details className="q-details">
					<summary>{t.details}</summary>
					<div className="q-details__body">
						<dl className="m-0 flex flex-col gap-1.5">
							{plan.chosenBy === "openjev" ? (
								<div className="flex justify-between gap-3">
									<dt>{t.confidence}</dt>
									<dd className="q-num m-0">
										{confidenceLabel(plan.confidence, t)}
									</dd>
								</div>
							) : null}
							<div className="flex justify-between gap-3">
								<dt>{t.howChosen}</dt>
								<dd className="m-0 text-right">
									{plan.chosenBy === "openjev"
										? t.chosenByModel
										: t.chosenByRules}
								</dd>
							</div>
						</dl>
						{plan.discarded.length > 0 ? (
							<ul className="m-0 flex list-none flex-col gap-1 p-0">
								{plan.discarded.map((item) => (
									<li key={item.id}>
										{t.discarded(item.label, reasonLabel[item.reason])}
									</li>
								))}
							</ul>
						) : null}
						{plan.alternatives.length > 0 ? (
							<ul className="m-0 flex list-none flex-col gap-1 p-0">
								{plan.alternatives.map((item) => (
									<li key={item.id}>
										{t.alternative(
											item.label,
											item.durationMinutes,
											fare(item.fareCop),
										)}
									</li>
								))}
							</ul>
						) : null}
						<p className="m-0">{t.source}</p>
					</div>
				</details>

				<a
					href={reportHref}
					className="q-btn q-btn--ghost q-btn--sm min-h-11 justify-start px-3"
				>
					<Flag size={16} strokeWidth={STROKE} aria-hidden="true" />
					{t.reportOvercharge}
				</a>

				{!online ? (
					<p className="q-sm q-muted m-0 flex items-start gap-2">
						<WifiOff size={16} strokeWidth={STROKE} aria-hidden="true" />
						{t.offlineSaved(age)}
					</p>
				) : error ? (
					<p className="q-sm q-muted m-0 flex items-center gap-2">
						{t.updateFailed}
						<button
							type="button"
							className="q-btn q-btn--ghost q-btn--sm"
							onClick={retry}
						>
							<RotateCw size={16} strokeWidth={STROKE} aria-hidden="true" />
							{t.retry}
						</button>
					</p>
				) : null}
			</div>
		);
	}

	return (
		<section
			className="q-next-step corridor-detail route-card"
			aria-labelledby={route ? "route-card-title" : undefined}
			aria-label={route ? undefined : t.nextStep}
		>
			{alert}
			<div className="q-next-step__head flex-wrap">
				<p className="q-next-step__eyebrow whitespace-nowrap">
					<span className="q-star" aria-hidden="true" />
					{recalculated ? t.recalculated : t.nextStep}
				</p>
				{badge ? (
					<span className="q-badge q-badge--optimal">
						{route?.accessible ? (
							<Accessibility
								size={14}
								strokeWidth={STROKE}
								aria-hidden="true"
							/>
						) : (
							<Leaf size={14} strokeWidth={STROKE} aria-hidden="true" />
						)}
						{badge}
					</span>
				) : null}
				{onClose ? (
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--icon route-card__close"
						aria-label={t.closeRoute}
						title={t.closeRoute}
						onClick={onClose}
					>
						<X size={20} strokeWidth={STROKE} aria-hidden="true" />
					</button>
				) : null}
			</div>

			<div className="route-card__fields">
				<label>
					<span className="q-sm q-muted inline-flex items-center gap-1">
						<MapPin size={14} strokeWidth={STROKE} aria-hidden="true" />{" "}
						{t.youAreAt}
					</span>
					<select
						value={query.origin}
						onChange={(event) =>
							onQueryChange({ ...query, origin: event.target.value })
						}
					>
						{stops.map((stop) => (
							<option key={stop.code} value={stop.code}>
								{stop.name}
							</option>
						))}
					</select>
				</label>
				<label>
					<span className="q-sm q-muted inline-flex items-center gap-1">
						<Flag size={14} strokeWidth={STROKE} aria-hidden="true" />{" "}
						{t.youGoTo}
					</span>
					<select
						value={query.destination}
						onChange={(event) =>
							onQueryChange({ ...query, destination: event.target.value })
						}
					>
						{stops.map((stop) => (
							<option key={stop.code} value={stop.code}>
								{stop.name}
							</option>
						))}
					</select>
				</label>
			</div>

			<label className="route-card__toggle">
				<input
					type="checkbox"
					checked={query.accessibleMode}
					onChange={(event) =>
						onQueryChange({ ...query, accessibleMode: event.target.checked })
					}
				/>
				<Accessibility size={18} strokeWidth={STROKE} aria-hidden="true" />
				<span>{t.needAccessible}</span>
			</label>

			{/* Not a live region: a route change would re-read the whole card. Only the
			    one-line decision is announced; state blocks carry their own role. */}
			<div>{body}</div>
			<p className="q-sr" role="status">
				{route && !loading
					? `${t.goTo(destination)}: ${t.minutesShort(route.durationMinutes)}`
					: ""}
			</p>

			{/* Sticky so the action stays in reach while the card scrolls on phones. */}
			<div className="sticky bottom-0 z-[1] -mx-5 -mb-5 flex flex-col gap-2 bg-[var(--surface-raised)] px-5 pt-2 pb-5 empty:hidden">
				{onStart && route ? (
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--block"
						onClick={onStart}
					>
						<Navigation size={20} strokeWidth={STROKE} aria-hidden="true" />
						{query.accessibleMode ? t.startAccessible : t.start}
					</button>
				) : null}
				<div className="route-card__guide">
					<button
						type="button"
						className={`q-btn q-btn--block ${onStart && route ? "q-btn--ghost" : "q-btn--primary"}`}
						onClick={onOpenGuide}
					>
						<MessageCircle size={20} strokeWidth={STROKE} aria-hidden="true" />
						{t.askGuide}
					</button>
				</div>
			</div>
		</section>
	);
}
