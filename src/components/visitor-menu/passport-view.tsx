import {
	BadgeCheck,
	Gift,
	Leaf,
	MapPin,
	ScanQrCode,
	Stamp,
	Store,
} from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import {
	loadPassport,
	savePassport,
} from "../../lib/visitor-menu/passport-source";
import {
	addStamp,
	parseStampCode,
	stampFromCode,
} from "../../lib/visitor-menu/stamp-code";
import type {
	Passport,
	PassportStamp,
} from "../../lib/visitor-menu/visitor-menu-types";
import { StampBookIllustration } from "./illustrations";
import { MenuShell } from "./menu-shell";
import { MenuEmpty, MenuError, MenuLoading, OfflineNote } from "./menu-state";
import { StampScanner } from "./stamp-scanner";
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
	const [scanning, setScanning] = useState(false);
	const [local, setLocal] = useState<Passport | null>(null);
	const [result, setResult] = useState<{
		tone: "safe" | "info" | "alert";
		title: string;
		text: string;
	} | null>(null);
	const onScan = () => {
		setResult(null);
		setScanning(true);
	};

	const stored = state.status === "ready" ? state.data : null;
	const passport = local ?? stored;

	const handleCode = useCallback(
		(raw: string) => {
			const code = parseStampCode(raw);
			const stamp = code ? stampFromCode(code) : null;
			if (!code || !stamp) {
				setResult({
					tone: "alert",
					title: "Ese QR no da sello",
					text: "Escanea el QR de un negocio verificado o de un evento ambiental.",
				});
				return;
			}
			const current = local ?? stored ?? { stamps: [] };
			const next = addStamp(current, stamp);
			setScanning(false);
			if (!next.added) {
				setResult({
					tone: "info",
					title: "Ya tienes este sello",
					text: stamp.name,
				});
				return;
			}
			setLocal(next.passport);
			savePassport(next.passport);
			if (code.kind === "negocio") {
				// Anonymous count for the city's economy indicator; failing offline is fine.
				void fetch("/api/pasaporte-visita", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ businessCode: code.code }),
				}).catch(() => undefined);
			}
			setResult({
				tone: "safe",
				title: "¡Sello nuevo!",
				text: stamp.reward
					? `${stamp.name}. Recompensa: ${stamp.reward}.`
					: stamp.name,
			});
		},
		[local, stored],
	);

	const scanNotice = (
		<>
			{scanning && (
				<StampScanner onCode={handleCode} onClose={() => setScanning(false)} />
			)}
			{result && (
				<div
					className={`q-alert q-alert--${result.tone}`}
					role={result.tone === "alert" ? "alert" : "status"}
				>
					<div className="q-alert__body">
						<p className="q-alert__title">{result.title}</p>
						<p className="q-alert__text">{result.text}</p>
					</div>
				</div>
			)}
		</>
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
	} else if (!passport || passport.stamps.length === 0) {
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
		const stamps = [...passport.stamps].sort((a, b) =>
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

	const count =
		state.status === "ready" ? (passport?.stamps.length ?? 0) : null;

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
