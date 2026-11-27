import {
	Bus,
	Droplets,
	type LucideIcon,
	Moon,
	Search,
	Store,
	Sun,
} from "lucide-react";
import { useId, useState } from "react";
import type { StatusTone } from "../../lib/corridor/corridor-types";
import { useT } from "../../lib/i18n/use-language";
import type { LayerKey } from "./map-layers";

const LAYER_TOGGLES: {
	key: LayerKey;
	label: "stops" | "floodZones" | "businesses";
	tone: StatusTone;
	Icon: LucideIcon;
}[] = [
	{ key: "stops", label: "stops", tone: "green", Icon: Bus },
	{ key: "floodZones", label: "floodZones", tone: "red", Icon: Droplets },
	{ key: "businesses", label: "businesses", tone: "gold", Icon: Store },
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
}

/** QUILLART search bar (q-search) and layer chips (q-chip) over the map. */
export function MapHeader({
	pointNames,
	onSearch,
	theme,
	onToggleTheme,
	visible,
	counts,
	onToggle,
}: MapHeaderProps) {
	const t = useT();
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
				className="q-search"
				aria-label={t.map.header.searchForm}
				onSubmit={submit}
			>
				<span className="q-logo__tile corridor-search__logo" aria-hidden="true">
					<span className="q-star" />
				</span>
				<label htmlFor={`${listId}-input`} className="q-sr">
					{t.map.header.searchLabel}
				</label>
				<input
					id={`${listId}-input`}
					type="search"
					list={listId}
					placeholder={t.map.header.placeholder}
					autoComplete="off"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<datalist id={listId}>
					{pointNames.map((name) => (
						<option key={name} value={name} />
					))}
				</datalist>
				<button type="submit" className="q-btn q-btn--ghost q-btn--icon">
					<Search size={20} strokeWidth={1.75} aria-hidden="true" />
					<span className="q-sr">{t.map.header.search}</span>
				</button>
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={
						theme === "light" ? t.map.header.useDark : t.map.header.useLight
					}
					onClick={onToggleTheme}
				>
					{theme === "light" ? (
						<Moon size={20} strokeWidth={1.75} aria-hidden="true" />
					) : (
						<Sun size={20} strokeWidth={1.75} aria-hidden="true" />
					)}
				</button>
			</form>

			<p className="corridor-search-miss" role="status">
				{missed ? t.map.header.notFound(missed) : ""}
			</p>

			<fieldset className="corridor-chips">
				<legend className="q-sr">{t.map.header.layers}</legend>
				{LAYER_TOGGLES.map(({ key, label, tone, Icon }) => (
					<button
						key={key}
						type="button"
						className={`q-chip corridor-chip corridor-chip--${tone}`}
						aria-pressed={visible[key]}
						onClick={() => onToggle(key)}
					>
						<Icon size={18} strokeWidth={1.75} aria-hidden="true" />
						{t.map.header[label]}
						<span className="corridor-chip__count">{counts[key]}</span>
					</button>
				))}
			</fieldset>
		</>
	);
}
