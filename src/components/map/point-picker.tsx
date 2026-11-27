// "¿Dónde es?": choose the point of a public place on the AMB map (docs/30, U15;
// mockup V12). The pin stays in the centre and the map moves under it; the label says
// which municipality the point falls in, and a point outside the Metropolitan Area
// cannot be used. "Usar mi ubicación" only moves the map: the person's position is
// never stored, only the point they confirm (the place of the event or the report).
// Load it with React.lazy: it brings Leaflet with it.

import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { GeoPoint } from "../../lib/community/community-geo";
import { MUNICIPALITIES, municipalityAt } from "../../lib/geo/amb-boundary";
import { useT } from "../../lib/i18n/use-language";
import { createMetroMap, metroTileLayer } from "./metro-frame";
import "./point-picker.css";

export interface PointPickerProps {
	/** Question above the picker ("¿Dónde es el evento?"). */
	title: string;
	hint?: string;
	value: GeoPoint | null;
	/** Where the map opens when there is no point yet (e.g. the chosen place). */
	initialCenter?: GeoPoint | null;
	/** Extra line under the summary ("Tomamos el punto de …"). */
	note?: string | null;
	onChange: (point: GeoPoint | null) => void;
}

const PICK_ZOOM = 16;
/** Five decimals: about a metre, plenty for a park or a corner. */
const round = (value: number) => Math.round(value * 1e5) / 1e5;

const BARRANQUILLA = MUNICIPALITIES.find((item) => item.key === "barranquilla")
	?.labelAt ?? [10.9878, -74.7889];

export default function PointPicker({
	title,
	hint,
	value,
	initialCenter,
	note,
	onChange,
}: PointPickerProps) {
	const t = useT();
	const headingId = useId();
	const [editing, setEditing] = useState(false);
	const municipality = value
		? municipalityAt(value.latitude, value.longitude)
		: null;

	return (
		<section className="point-picker" aria-labelledby={headingId}>
			<div>
				<h3 id={headingId} className="q-eyebrow">
					{title}
				</h3>
				{hint && <p className="q-sm q-muted mt-1">{hint}</p>}
			</div>
			{editing ? (
				<PickerMap
					start={value ?? initialCenter ?? null}
					onCancel={() => setEditing(false)}
					onPick={(point) => {
						onChange(point);
						setEditing(false);
					}}
				/>
			) : (
				<div className="q-card flex flex-col gap-3 p-4">
					<p className="q-p flex items-center gap-2">
						<MapPin size={18} aria-hidden="true" />
						{value && municipality ? (
							<span className="point-picker__place">
								{t.geo.picker.pointIn(municipality.name)}
							</span>
						) : (
							<span className="q-muted">{t.geo.picker.noPoint}</span>
						)}
					</p>
					{value && note && <p className="q-sm q-muted">{note}</p>}
					<div className="point-picker__actions">
						<button
							type="button"
							className="q-btn q-btn--secondary q-btn--sm"
							onClick={() => setEditing(true)}
						>
							<Crosshair size={16} aria-hidden="true" />
							{value ? t.geo.picker.changePoint : t.geo.picker.choosePoint}
						</button>
						{value && (
							<button
								type="button"
								className="q-btn q-btn--ghost q-btn--sm"
								onClick={() => onChange(null)}
							>
								<X size={16} aria-hidden="true" />
								{t.geo.picker.removePoint}
							</button>
						)}
					</div>
				</div>
			)}
		</section>
	);
}

function PickerMap({
	start,
	onPick,
	onCancel,
}: {
	start: GeoPoint | null;
	onPick: (point: GeoPoint) => void;
	onCancel: () => void;
}) {
	const t = useT();
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<ReturnType<typeof createMetroMap> | null>(null);
	const startRef = useRef(start);
	const [center, setCenter] = useState<GeoPoint>(() =>
		start ? start : { latitude: BARRANQUILLA[0], longitude: BARRANQUILLA[1] },
	);
	const [locating, setLocating] = useState(false);
	const [locationNote, setLocationNote] = useState<string | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const map = createMetroMap(container, {
			zoomControl: true,
			attributionControl: true,
		});
		metroTileLayer({ crossOrigin: true }).addTo(map);
		const first = startRef.current;
		map.setView(
			first ? [first.latitude, first.longitude] : BARRANQUILLA,
			first ? PICK_ZOOM : 13,
			{ animate: false },
		);
		const update = () => {
			const { lat, lng } = map.getCenter();
			setCenter({ latitude: round(lat), longitude: round(lng) });
		};
		update();
		map.on("moveend", update);
		mapRef.current = map;
		return () => {
			mapRef.current = null;
			map.remove();
		};
	}, []);

	const municipality = municipalityAt(center.latitude, center.longitude);

	function centreOnMe() {
		if (!("geolocation" in navigator)) {
			setLocationNote(t.geo.picker.locationFailed);
			return;
		}
		setLocating(true);
		setLocationNote(null);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLocating(false);
				const { latitude, longitude } = position.coords;
				// Only the camera moves; the position itself is never kept.
				if (!municipalityAt(latitude, longitude)) {
					setLocationNote(t.geo.picker.locationOutside);
					return;
				}
				mapRef.current?.setView([latitude, longitude], PICK_ZOOM + 1);
			},
			() => {
				setLocating(false);
				setLocationNote(t.geo.picker.locationFailed);
			},
			{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="point-picker__frame">
				<div
					ref={containerRef}
					className="point-picker__map"
					role="application"
					aria-label={t.geo.picker.mapLabel}
				/>
				<div className="point-picker__hint" aria-hidden="true">
					<span>{t.geo.picker.moveHint}</span>
				</div>
				<div className="point-picker__pin" aria-hidden="true">
					<span className="point-picker__pin-head">
						<MapPin size={20} strokeWidth={2.25} />
					</span>
					<span className="point-picker__pin-tip" />
				</div>
			</div>
			<div className="q-card flex flex-col gap-2 p-4">
				<p
					className={`q-p point-picker__place ${municipality ? "" : "point-picker__place--outside"}`}
					aria-live="polite"
				>
					{municipality
						? t.geo.picker.pointIn(municipality.name)
						: t.geo.picker.outside}
				</p>
				<p className="q-sm q-muted">{t.geo.picker.privacyNote}</p>
				{locationNote && (
					<p className="q-sm" role="status">
						{locationNote}
					</p>
				)}
				<div className="point-picker__actions">
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--sm"
						onClick={centreOnMe}
						disabled={locating}
						aria-busy={locating}
					>
						<Crosshair size={16} aria-hidden="true" />
						{locating ? t.geo.picker.locating : t.geo.picker.useMyLocation}
					</button>
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--sm"
						disabled={!municipality}
						onClick={() => onPick(center)}
					>
						<MapPin size={16} aria-hidden="true" />
						{t.geo.picker.usePoint}
					</button>
					<button
						type="button"
						className="q-btn q-btn--ghost q-btn--sm"
						onClick={onCancel}
					>
						{t.geo.picker.cancel}
					</button>
				</div>
			</div>
		</div>
	);
}
