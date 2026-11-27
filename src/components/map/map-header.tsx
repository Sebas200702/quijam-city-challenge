import {
	Bus,
	Droplets,
	type LucideIcon,
	Moon,
	Search,
	SearchX,
	Store,
	Sun,
	WifiOff,
} from "lucide-react";
import { useId, useState } from "react";
import type {
	CorridorDataSource,
	StatusTone,
} from "../../lib/corridor/corridor-types";
import type { MapMessages } from "../../lib/i18n/dictionaries/map";
import { useT } from "../../lib/i18n/use-language";
import "./map-chrome.css";
import type { LayerKey } from "./map-layers";

const LAYER_TOGGLES: {
	key: LayerKey;
	label: (copy: MapMessages) => string;
	tone: StatusTone;
	Icon: LucideIcon;
}[] = [
	{ key: "stops", label: (c) => c.layerStops, tone: "green", Icon: Bus },
	{
		key: "floodZones",
		label: (c) => c.layerFlood,
		tone: "red",
		Icon: Droplets,
	},
	{
		key: "businesses",
		label: (c) => c.layerBusinesses,
		tone: "gold",
		Icon: Store,
	},
];

export type Theme = "light" | "dark";

interface MapHeaderProps {
	pointNames: string[];
	/** Returns false when nothing matches the query. */
	onSearch: (query: string) => boolean;
	theme: Theme;
	onToggleTheme: () => void;
	visible: Record<LayerKey, boolean>;
	counts: Record<LayerKey, number>;
	onToggle: (key: LayerKey) => void;
	/** "seed" means Supabase is out of reach: shows the offline badge. */
	source?: CorridorDataSource;
	/** The screen's single "datos de referencia" tag for the corridor seed (rule 9). Defaults to true. */
	showReferenceTag?: boolean;
}

/**
 * Compact header over the map, reachable with one thumb: QUILLART search bar
 * (q-search), layer chips (q-chip) and the screen's single "datos de referencia" tag.
 */
export function MapHeader({
	pointNames,
	onSearch,
	theme,
	onToggleTheme,
	visible,
	counts,
	onToggle,
	source,
	showReferenceTag = true,
}: MapHeaderProps) {
	const copy = useT().map;
	const listId = useId();
	const [query, setQuery] = useState("");
	const [missed, setMissed] = useState<string | null>(null);

	const submit = (event: { preventDefault: () => void }) => {
		event.preventDefault();
		setMissed(onSearch(query) ? null : query.trim() || null);
	};

	return (
		<>
			<form
				className="q-search mc-search"
				aria-label={copy.searchForm}
				onSubmit={submit}
			>
				<span className="q-logo__tile corridor-search__logo" aria-hidden="true">
					<span className="q-star" />
				</span>
				<label htmlFor={`${listId}-input`} className="q-sr">
					{copy.searchLabel}
				</label>
				<input
					id={`${listId}-input`}
					type="search"
					list={listId}
					placeholder={copy.searchPlaceholder}
					autoComplete="off"
					enterKeyHint="search"
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						if (missed) setMissed(null);
					}}
				/>
				<datalist id={listId}>
					{pointNames.map((name) => (
						<option key={name} value={name} />
					))}
				</datalist>
				<button type="submit" className="q-btn q-btn--ghost q-btn--icon">
					<Search size={20} strokeWidth={1.75} aria-hidden="true" />
					<span className="q-sr">{copy.searchButton}</span>
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={theme === "light" ? copy.themeToDark : copy.themeToLight}
					onClick={onToggleTheme}
				>
					{theme === "light" ? (
						<Moon size={20} strokeWidth={1.75} aria-hidden="true" />
					) : (
						<Sun size={20} strokeWidth={1.75} aria-hidden="true" />
					)}
				</button>
			</form>

			{/* Always mounted so screen readers hear the miss when it appears. */}
			<div className="mc-miss-region" role="status">
				{missed && (
					<p className="mc-miss">
						<SearchX size={18} strokeWidth={1.75} aria-hidden="true" />
						<span>
							<strong>{copy.searchMiss(missed)}</strong> {copy.searchTry}
						</span>
					</p>
				)}
			</div>

			<fieldset className="corridor-chips">
				<legend className="q-sr">{copy.layers}</legend>
				{LAYER_TOGGLES.map(({ key, label, tone, Icon }) => (
					<button
						key={key}
						type="button"
						className={`q-chip corridor-chip corridor-chip--${tone}`}
						aria-pressed={visible[key]}
						// Named "Paraderos (7)", not "Paraderos7"; the count hides on narrow phones.
						aria-label={`${label(copy)} (${counts[key]})`}
						onClick={() => onToggle(key)}
					>
						<Icon size={18} strokeWidth={1.75} aria-hidden="true" />
						{label(copy)}
						<span className="corridor-chip__count" aria-hidden="true">
							{counts[key]}
						</span>
					</button>
				))}
			</fieldset>

			{(showReferenceTag || source === "seed") && (
				<div className="mc-meta">
					{showReferenceTag && (
						<span className="q-sim-tag">{copy.referenceTag}</span>
					)}
					{source === "seed" && (
						<span className="q-badge q-badge--neutral mc-offline">
							<WifiOff size={14} strokeWidth={1.75} aria-hidden="true" />
							{copy.offline}
						</span>
					)}
				</div>
			)}
		</>
	);
}
