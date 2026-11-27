import {
	Camera,
	Check,
	Copy,
	Hand,
	Maximize2,
	MessageCircle,
	QrCode,
	Radio,
	RefreshCw,
	ShieldCheck,
	Smartphone,
	Users,
	WifiOff,
	X,
} from "lucide-react";
import QRCode from "qrcode";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
	PresenceConnectionState,
	VisitorPresenceSummary,
} from "../lib/presence/visitor-presence-types";
import { buildJuryQrUrl } from "../lib/presence/visitor-presence-utils";

interface JuryQrPanelProps {
	summary: VisitorPresenceSummary;
	connectionState: PresenceConnectionState;
}

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

const STEPS = [
	{
		icon: Camera,
		title: "Abre la cámara",
		text: "Apunta al código de la pantalla",
	},
	{
		icon: Smartphone,
		title: "Toca el enlace",
		text: "Abre el mapa del corredor",
	},
	{
		icon: MessageCircle,
		title: "Pregúntale a Quillart AI",
		text: "Por ejemplo: qué hay hoy cerca de mí",
	},
] as const;

const STATUS_BADGE: Record<
	PresenceConnectionState,
	{ className: string; label: string }
> = {
	live: { className: "q-badge--optimal", label: "Presencia en vivo" },
	offline: { className: "q-badge--alert", label: "Sin conexión" },
	error: { className: "q-badge--alert", label: "Error de conexión" },
	loading: { className: "q-badge--neutral", label: "Conectando" },
};

// Token-coloured fills for the inline illustrations (fixed light panel).
const INK = { fill: "var(--on-gold)" };
const WHITE = { fill: "var(--star)" };
const GOLD = { fill: "var(--gold)" };
const WATER = { fill: "var(--line-control)", opacity: 0.45 };
const STROKE = {
	fill: "none",
	stroke: "var(--on-gold)",
	strokeWidth: 2.5,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

function Illus({ width, children }: { width: number; children: ReactNode }) {
	return (
		<div className="q-illus flex-none !px-3 !py-2" aria-hidden="true">
			<svg
				aria-hidden="true"
				viewBox="0 0 180 112"
				width={width}
				height={Math.round((width * 112) / 180)}
				className="block"
				focusable="false"
			>
				{children}
			</svg>
		</div>
	);
}

/** Phone showing a QR code next to a star (decorative). */
function PhoneQrIllustration() {
	return (
		<Illus width={96}>
			<rect style={WHITE} x="64" y="8" width="54" height="96" rx="10" />
			<rect style={STROKE} x="64" y="8" width="54" height="96" rx="10" />
			<rect style={INK} x="76" y="30" width="30" height="30" rx="3" />
			<rect style={WHITE} x="81" y="35" width="8" height="8" />
			<rect style={WHITE} x="93" y="35" width="8" height="8" />
			<rect style={WHITE} x="81" y="47" width="8" height="8" />
			<path
				style={{ ...STROKE, stroke: "var(--gold)", strokeWidth: 4 }}
				d="M70 72 H112"
			/>
			<polygon
				style={GOLD}
				points="150,19 151.8,25.7 157.8,22.2 154.3,28.2 161,30 154.3,31.8 157.8,37.8 151.8,34.3 150,41 148.2,34.3 142.2,37.8 145.7,31.8 139,30 145.7,28.2 142.2,22.2 148.2,25.7"
			/>
			<circle style={GOLD} cx="30" cy="70" r="12" />
		</Illus>
	);
}

/** Antenna crossed out over water (decorative). */
function OfflineIllustration({ width }: { width: number }) {
	return (
		<Illus width={width}>
			<path
				style={STROKE}
				d="M90 40 L72 100 M90 40 L108 100 M78 80 H102 M82 66 H98"
			/>
			<circle style={GOLD} cx="90" cy="36" r="8" />
			<path
				style={STROKE}
				opacity={0.5}
				d="M68 18 A30 30 0 0 0 68 54 M112 18 A30 30 0 0 1 112 54 M56 8 A46 46 0 0 0 56 64 M124 8 A46 46 0 0 1 124 64"
			/>
			<path
				style={{ ...STROKE, stroke: "var(--red)", strokeWidth: 5 }}
				d="M54 12 L126 84"
			/>
			<path style={WATER} d="M0 100 H180 V112 H0 Z" />
		</Illus>
	);
}

/** Folded map with a warning pin (decorative). */
function BrokenMapIllustration() {
	return (
		<Illus width={132}>
			<path
				style={WHITE}
				d="M28 30 L64 18 L98 30 L134 18 V86 L98 98 L64 86 L28 98 Z"
			/>
			<path
				style={{ ...STROKE, strokeWidth: 7.5 }}
				strokeDasharray="2 10"
				d="M44 82 L64 62 L86 70 L112 44"
			/>
			<path
				style={STROKE}
				d="M28 30 L64 18 L98 30 L134 18 V86 L98 98 L64 86 L28 98 Z M64 18 V86 M98 30 V98"
			/>
			<circle style={{ fill: "var(--red)" }} cx="138" cy="28" r="18" />
			<rect style={WHITE} x="135.5" y="16" width="5" height="15" rx="2.5" />
			<circle style={WHITE} cx="138" cy="38" r="3" />
		</Illus>
	);
}

function PresenceNote({
	illustration,
	title,
	text,
}: {
	illustration: ReactNode;
	title: string;
	text: string;
}) {
	return (
		<div
			role="status"
			className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--bg)] p-3"
		>
			{illustration}
			<div className="min-w-0">
				<p className="q-h3">{title}</p>
				<p className="q-sm q-muted m-0">{text}</p>
			</div>
		</div>
	);
}

function PresenceBlock({ summary, connectionState }: JuryQrPanelProps) {
	if (connectionState === "offline" || connectionState === "error") {
		return (
			<PresenceNote
				illustration={<OfflineIllustration width={96} />}
				title={
					connectionState === "offline"
						? "Sin conexión en este portátil"
						: "No pudimos conectar el contador"
				}
				text="Los visitantes entran con internet de su celular. El contador vuelve con la red."
			/>
		);
	}
	if (connectionState === "live" && summary.connectedCount === 0) {
		return (
			<PresenceNote
				illustration={<PhoneQrIllustration />}
				title="Aún no hay nadie conectado"
				text="Proyecta el QR a los visitantes. El contador sube solo."
			/>
		);
	}
	const loading = connectionState === "loading";
	return (
		<div
			className="q-kpi bg-[var(--bg)] shadow-none"
			role="status"
			aria-live="polite"
			aria-busy={loading}
		>
			<span className="q-kpi__label">
				<Users size={14} strokeWidth={1.75} aria-hidden="true" />
				Conectados ahora
			</span>
			{loading ? (
				<div className="q-kpi__row items-center">
					<span
						className="q-star q-star--think h-6 w-6 text-[var(--gold)]"
						aria-hidden="true"
					/>
					<span className="q-sm q-muted">Conectando el contador…</span>
				</div>
			) : (
				<div className="q-kpi__row">
					<span className="q-kpi__value">{summary.connectedCount}</span>
					<span className="q-sm flex items-center gap-1.5 font-semibold text-[var(--green-text)]">
						<QrCode size={16} strokeWidth={1.75} aria-hidden="true" />
						{summary.qrCount} entraron con el QR
					</span>
				</div>
			)}
		</div>
	);
}

export function JuryQrPanel({ summary, connectionState }: JuryQrPanelProps) {
	const [baseOrigin, setBaseOrigin] = useState("");
	const [originReady, setOriginReady] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [qrError, setQrError] = useState<string | null>(null);
	const [retryKey, setRetryKey] = useState(0);
	const [copied, setCopied] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [domainOpen, setDomainOpen] = useState(false);

	const copiedTimerRef = useRef<number | null>(null);
	const expandButtonRef = useRef<HTMLButtonElement | null>(null);
	const closeButtonRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		setBaseOrigin(window.location.origin);
		setOriginReady(true);
	}, []);

	useEffect(() => {
		return () => {
			if (copiedTimerRef.current !== null) {
				window.clearTimeout(copiedTimerRef.current);
			}
		};
	}, []);

	const targetUrl = buildJuryQrUrl(baseOrigin);
	const isInvalidOrigin = originReady && targetUrl === null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: retryKey forces a new attempt.
	useEffect(() => {
		let cancelled = false;
		setQrError(null);

		if (!targetUrl) {
			setQrDataUrl(null);
			setExpanded(false);
			return;
		}

		void QRCode.toDataURL(targetUrl, {
			width: 640,
			margin: 2,
			errorCorrectionLevel: "M",
			color: {
				dark: "#0B131E",
				light: "#FFFFFF",
			},
		})
			.then((dataUrl) => {
				if (!cancelled) {
					setQrDataUrl(dataUrl);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setQrDataUrl(null);
					setQrError("No se pudo generar el código QR.");
				}
			});

		return () => {
			cancelled = true;
		};
	}, [targetUrl, retryKey]);

	useEffect(() => {
		if (isInvalidOrigin) {
			setDomainOpen(true);
		}
	}, [isInvalidOrigin]);

	useEffect(() => {
		if (!expanded) {
			return;
		}
		closeButtonRef.current?.focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setExpanded(false);
			} else if (event.key === "Tab") {
				// Keep focus trapped on the single interactive control in the dialog.
				event.preventDefault();
				closeButtonRef.current?.focus();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			expandButtonRef.current?.focus();
		};
	}, [expanded]);

	async function handleCopy() {
		if (!targetUrl) {
			return;
		}
		try {
			await navigator.clipboard.writeText(targetUrl);
			setCopied(true);
			if (copiedTimerRef.current !== null) {
				window.clearTimeout(copiedTimerRef.current);
			}
			copiedTimerRef.current = window.setTimeout(() => {
				setCopied(false);
				copiedTimerRef.current = null;
			}, 2000);
		} catch {
			setCopied(false);
		}
	}

	const statusBadge = STATUS_BADGE[connectionState];
	const qrReady = Boolean(qrDataUrl && targetUrl);

	let qrFrame: ReactNode;
	if (isInvalidOrigin) {
		qrFrame = (
			<div className="q-state q-state--error !min-h-0 !p-0" role="alert">
				<BrokenMapIllustration />
				<p className="q-state__title">El dominio del QR no sirve</p>
				<p className="q-state__text">
					Usa una dirección completa con http:// o https://.
				</p>
			</div>
		);
	} else if (qrError) {
		qrFrame = (
			<div className="q-state q-state--error !min-h-0 !p-0" role="alert">
				<BrokenMapIllustration />
				<p className="q-state__title">No pudimos crear el QR</p>
				<p className="q-state__text">
					Inténtalo otra vez. Mientras tanto, abre la app del visitante desde
					este portátil.
				</p>
				<button
					type="button"
					onClick={() => setRetryKey((key) => key + 1)}
					className="q-btn q-btn--primary q-state__action"
				>
					<RefreshCw {...ICON} />
					Reintentar
				</button>
			</div>
		);
	} else if (qrReady && qrDataUrl && targetUrl) {
		qrFrame = (
			<div className="rounded-[var(--radius-lg)] bg-white p-2 shadow-[var(--shadow-modal)]">
				<img
					src={qrDataUrl}
					alt={`Código QR para abrir QUILLART visitante en ${targetUrl}`}
					width={240}
					height={240}
					className="block h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]"
				/>
			</div>
		);
	} else {
		qrFrame = (
			<div className="q-state q-state--loading !min-h-0 !p-0" role="status">
				<span className="q-state__glyph">
					<span className="q-star q-star--think" aria-hidden="true" />
				</span>
				<p className="q-state__title">Creando el QR</p>
				<p className="q-state__text">Un momento.</p>
			</div>
		);
	}

	return (
		<section
			aria-labelledby="jury-qr-title"
			className="q-card lc-shape--corner"
		>
			<div className="q-band q-band--green" aria-hidden="true" />
			<div className="q-card__head flex-wrap">
				<div>
					<p className="l-eyebrow l-eyebrow--sunk lc-eb">
						<Hand
							size={14}
							strokeWidth={1.75}
							className="text-[var(--gold-text)]"
							aria-hidden="true"
						/>
						En vivo · Visitantes conectados
					</p>
					<h2 id="jury-qr-title" className="l-h2 lc-h2">
						QR de bienvenida
					</h2>
				</div>
				<span className={`q-badge ${statusBadge.className}`}>
					{connectionState === "live" ? (
						<Radio size={14} strokeWidth={1.75} aria-hidden="true" />
					) : connectionState === "loading" ? null : (
						<WifiOff size={14} strokeWidth={1.75} aria-hidden="true" />
					)}
					{statusBadge.label}
				</span>
			</div>

			<div className="q-card__body">
				<div className="grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
					<div className="flex flex-col items-center gap-3">
						<div className="flex min-h-[236px] w-full items-center justify-center sm:min-h-[256px] lg:w-[272px]">
							{qrFrame}
						</div>
						<span className="q-sm q-subtle flex items-center gap-1.5">
							<ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
							Sin cuenta · ID anónimo
						</span>
					</div>

					<div className="flex min-w-0 flex-col gap-4">
						<div>
							<h3 className="q-h2">Escanea y entra como visitante</h3>
							<p className="q-p q-sm q-muted mt-1">
								Entra sin cuenta. La app usa el idioma de tu celular y lo
								cambias en un toque.
							</p>
						</div>

						<ol className="grid gap-2 sm:grid-cols-3" aria-label="Pasos">
							{STEPS.map(({ icon: StepIcon, title, text }) => (
								<li
									key={title}
									className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--bg)] px-3 py-2.5"
								>
									<span
										className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--surface-raised)] text-[var(--gold-text)]"
										aria-hidden="true"
									>
										<StepIcon size={18} strokeWidth={1.75} />
									</span>
									<span className="flex min-w-0 flex-col">
										<b className="text-sm">{title}</b>
										<span className="text-xs text-[var(--ink-muted)]">
											{text}
										</span>
									</span>
								</li>
							))}
						</ol>

						<PresenceBlock
							summary={summary}
							connectionState={connectionState}
						/>

						<div className="q-row">
							<button
								ref={expandButtonRef}
								type="button"
								onClick={() => setExpanded(true)}
								disabled={!qrReady}
								className="q-btn q-btn--secondary"
							>
								<Maximize2 {...ICON} />
								Proyectar QR
							</button>
							<button
								type="button"
								onClick={() => void handleCopy()}
								disabled={!targetUrl}
								className="q-btn q-btn--secondary"
							>
								{copied ? <Check {...ICON} /> : <Copy {...ICON} />}
								{copied ? "Enlace copiado" : "Copiar enlace"}
							</button>
							<a
								href="/mapa"
								target="_blank"
								rel="noreferrer"
								className="q-btn q-btn--ghost"
							>
								<Smartphone {...ICON} />
								Probar como visitante
							</a>
						</div>
						<p className="q-sr" role="status">
							{copied ? "Enlace copiado" : ""}
						</p>

						<details
							className="q-details"
							open={domainOpen}
							onToggle={(event) => setDomainOpen(event.currentTarget.open)}
						>
							<summary>Cambiar el dominio del QR</summary>
							<div className="q-details__body">
								<p className="m-0">
									Úsalo si los visitantes entran por la red local o por el
									dominio de producción. Solo se guarda un identificador anónimo
									temporal por sesión.
								</p>
								<label
									htmlFor="jury-qr-origin"
									className="text-[13px] font-semibold text-[var(--ink)]"
								>
									Dominio del QR
								</label>
								<input
									id="jury-qr-origin"
									type="url"
									aria-invalid={isInvalidOrigin}
									aria-describedby={
										isInvalidOrigin ? "jury-qr-origin-error" : undefined
									}
									value={baseOrigin}
									onChange={(event) => setBaseOrigin(event.target.value)}
									placeholder="https://tu-dominio.com"
									className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--red)]"
								/>
								{isInvalidOrigin && (
									<p
										id="jury-qr-origin-error"
										className="m-0 font-semibold text-[var(--red-text)]"
									>
										Dominio inválido. Usa una dirección completa con http:// o
										https://.
									</p>
								)}
							</div>
						</details>
					</div>
				</div>
			</div>

			{expanded && qrDataUrl && targetUrl && (
				<div
					role="dialog"
					aria-modal="true"
					aria-labelledby="jury-qr-dialog-title"
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
				>
					<button
						type="button"
						tabIndex={-1}
						aria-label="Cerrar proyección del QR"
						onClick={() => setExpanded(false)}
						className="absolute inset-0 bg-black/80"
					/>
					<div className="q-card relative z-10 w-full max-w-xl">
						<div className="q-flag" aria-hidden="true">
							<i />
							<i />
							<i />
						</div>
						<div className="q-card__head">
							<div>
								<p className="q-eyebrow">QUILLART · QR de bienvenida</p>
								<h3 id="jury-qr-dialog-title" className="q-h1 mt-1">
									Escanea y entra como visitante
								</h3>
							</div>
							<button
								ref={closeButtonRef}
								type="button"
								onClick={() => setExpanded(false)}
								aria-label="Cerrar proyección del QR"
								className="q-btn q-btn--secondary q-btn--icon flex-none"
							>
								<X {...ICON} />
							</button>
						</div>
						<div className="q-card__body items-center text-center">
							<div className="rounded-[var(--radius-lg)] bg-white p-3 shadow-[var(--shadow-modal)]">
								<img
									src={qrDataUrl}
									alt={`Código QR ampliado para ${targetUrl}`}
									width={480}
									height={480}
									className="block h-auto"
									style={{ width: "min(56vh, 480px, calc(100vw - 112px))" }}
								/>
							</div>
							<p className="q-num flex items-center gap-2 text-2xl font-bold text-[var(--green-text)]">
								<Users size={24} strokeWidth={1.75} aria-hidden="true" />
								{summary.connectedCount} conectados ahora
							</p>
							<p className="q-sm q-muted break-all">{targetUrl}</p>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
