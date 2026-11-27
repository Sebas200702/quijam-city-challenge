import {
	BadgeCheck,
	Gift,
	Leaf,
	MapPin,
	ScanQrCode,
	Stamp,
	Store,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { loadPassport } from "../../lib/visitor-menu/passport-source";
import type { PassportStamp } from "../../lib/visitor-menu/visitor-menu-types";
import { StampBookIllustration } from "./illustrations";
import { MenuShell } from "./menu-shell";
import { MenuEmpty, MenuError, MenuLoading, OfflineNote } from "./menu-state";
import { useMenuData, useOnline } from "./use-menu-data";
import "./visitor-menu.css";

const ICON = { size: 24, strokeWidth: 1.75, "aria-hidden": true } as const;

function StampCard({ stamp }: { stamp: PassportStamp }) {
	const green = stamp.source === "green-event";
	return (
		<li className="vm-stamp">
			<span
				className={`vm-stamp__seal${green ? " vm-stamp__seal--green" : ""}`}
				aria-hidden="true"
			>
				{green ? <Leaf {...ICON} /> : <Store {...ICON} />}
			</span>
			<b>{stamp.name}</b>
			<small>
				{stamp.place} · {green ? "evento ambiental" : "negocio verificado"}
			</small>
			{stamp.reward && (
				<span className="vm-stamp__reward">
					<Gift size={12} strokeWidth={1.75} aria-hidden="true" />
					Recompensa: {stamp.reward}
				</span>
			)}
		</li>
	);
}

/** Plain-language definitions, so the same term means the same thing everywhere. */
function PassportGlossary() {
	return (
		<details className="q-details">
			<summary>¿Qué es un sello?</summary>
			<div className="q-details__body">
				<dl className="vm-terms">
					<div>
						<dt>
							<Stamp size={18} strokeWidth={1.75} aria-hidden="true" />
							Sello
						</dt>
						<dd>
							La marca que ganas al escanear el QR de un negocio o de un evento.
						</dd>
					</div>
					<div>
						<dt>
							<BadgeCheck size={18} strokeWidth={1.75} aria-hidden="true" />
							Negocio verificado
						</dt>
						<dd>
							Un negocio que la ciudad revisó: precios claros y buen trato. Da
							sellos.
						</dd>
					</div>
					<div>
						<dt>
							<Leaf size={18} strokeWidth={1.75} aria-hidden="true" />
							Evento ambiental
						</dt>
						<dd>Una actividad para cuidar la ciudad. Da sello y recompensa.</dd>
					</div>
				</dl>
			</div>
		</details>
	);
}

function ScanButton({
	onScan,
	className,
}: {
	onScan: () => void;
	className: string;
}) {
	return (
		<button type="button" className={className} onClick={onScan}>
			<ScanQrCode size={20} strokeWidth={1.75} aria-hidden="true" />
			Escanear QR
		</button>
	);
}

/** /pasaporte: stamps from verified businesses and green events. Primary action: scan a QR. */
export function PassportView() {
	const online = useOnline();
	const { state, retry } = useMenuData(loadPassport);
	const [scanAsked, setScanAsked] = useState(false);
	const onScan = () => setScanAsked(true);

	// The QR scanner arrives with issue #45; until then, explain what to do instead.
	const scanNotice = scanAsked && (
		<div className="q-alert q-alert--info" role="status">
			<span className="q-alert__icon" aria-hidden="true">
				<ScanQrCode size={18} strokeWidth={1.75} />
			</span>
			<div className="q-alert__body">
				<p className="q-alert__title">El escáner llega pronto</p>
				<p className="q-alert__text">
					Por ahora, busca negocios verificados en el mapa.
				</p>
				<div className="q-alert__actions">
					<a className="q-btn q-btn--secondary q-btn--sm" href="/mapa">
						<MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
						Abrir el mapa
					</a>
				</div>
			</div>
		</div>
	);

	let body: ReactNode;
	if (state.status === "loading") {
		body = (
			<MenuLoading title="Cargando tu pasaporte" text="Tus sellos y eventos." />
		);
	} else if (state.status === "error") {
		body = (
			<MenuError
				title="No pudimos cargar tu pasaporte"
				text="Tus sellos no se pierden. Inténtalo otra vez."
				onRetry={retry}
			/>
		);
	} else if (state.data.stamps.length === 0) {
		body = (
			<>
				<MenuEmpty
					illustration={<StampBookIllustration />}
					title="Aún no tienes sellos"
					text="Escanea el QR de un negocio verificado o de un evento ambiental."
					action={
						<ScanButton
							onScan={onScan}
							className="q-btn q-btn--primary q-state__action"
						/>
					}
				/>
				{scanNotice}
				<PassportGlossary />
			</>
		);
	} else {
		const stamps = [...state.data.stamps].sort((a, b) =>
			b.collectedAt.localeCompare(a.collectedAt),
		);
		body = (
			<>
				<ul className="vm-stamps" aria-label="Sellos">
					{stamps.map((stamp) => (
						<StampCard key={stamp.id} stamp={stamp} />
					))}
					<li className="vm-stamp">
						<span
							className="vm-stamp__seal vm-stamp__seal--todo"
							aria-hidden="true"
						>
							<MapPin {...ICON} />
						</span>
						<b>Por descubrir</b>
						<small>Escanea un QR</small>
					</li>
				</ul>
				<p className="q-sm q-muted q-p">
					Suma un sello cuando escaneas el QR de un negocio verificado. Las
					recompensas son solo para los eventos ambientales.
				</p>
				<PassportGlossary />
				{scanNotice}
				<div className="vm-foot">
					<ScanButton
						onScan={onScan}
						className="q-btn q-btn--primary q-btn--lg q-btn--block"
					/>
				</div>
			</>
		);
	}

	const count = state.status === "ready" ? state.data.stamps.length : null;

	return (
		<MenuShell online={online}>
			<header className="vm-titlerow">
				<div>
					<p className="q-eyebrow">Pasaporte</p>
					<h1 className="q-h1">Tu pasaporte</h1>
					{count !== null && count > 0 && (
						<p className="q-p q-muted">
							<span className="vm-count q-num">{count}</span>{" "}
							{count === 1 ? "sello" : "sellos"} en negocios verificados y
							eventos ambientales
						</p>
					)}
				</div>
				{/* The empty state already shows the stamp book; avoid drawing it twice. */}
				{count !== 0 && (
					<span className="vm-hero vm-hero--lg" aria-hidden="true">
						<StampBookIllustration />
					</span>
				)}
			</header>
			{!online && (
				<OfflineNote>
					Sin conexión: tus sellos están guardados en este celular.
				</OfflineNote>
			)}
			{body}
		</MenuShell>
	);
}
