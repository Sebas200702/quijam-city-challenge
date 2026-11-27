import { Copy, ExternalLink, Maximize2, QrCode, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type {
	PresenceConnectionState,
	VisitorPresenceSummary,
} from "../lib/presence/visitor-presence-types";
import { buildJuryQrUrl } from "../lib/presence/visitor-presence-utils";

interface JuryQrPanelProps {
	summary: VisitorPresenceSummary;
	connectionState: PresenceConnectionState;
}

export function JuryQrPanel({ summary, connectionState }: JuryQrPanelProps) {
	const [baseOrigin, setBaseOrigin] = useState("");
	const [originReady, setOriginReady] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [qrError, setQrError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [expanded, setExpanded] = useState(false);

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

	useEffect(() => {
		let cancelled = false;
		setQrError(null);

		if (!targetUrl) {
			setQrDataUrl(null);
			setExpanded(false);
			return;
		}

		void QRCode.toDataURL(targetUrl, {
			width: 320,
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
	}, [targetUrl]);

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

	const statusBadge =
		connectionState === "live"
			? { className: "q-badge--optimal", label: "Presencia en vivo" }
			: connectionState === "offline"
				? { className: "q-badge--alert", label: "Sin conexión" }
				: connectionState === "error"
					? { className: "q-badge--alert", label: "Error de conexión" }
					: { className: "q-badge--neutral", label: "Conectando" };

	return (
		<section
			aria-label="QR del jurado y visitantes conectados"
			className="q-card"
		>
			<div className="q-band q-band--green" aria-hidden="true" />
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">Demo en vivo · Visitantes reales</p>
					<h2 className="q-h2 mt-1">QR del jurado</h2>
				</div>
				<span className={`q-badge ${statusBadge.className}`}>
					{statusBadge.label}
				</span>
			</div>

			<div className="q-card__body">
				<div className="grid items-center gap-6 md:grid-cols-[200px_1fr]">
					<div className="flex flex-col items-center gap-2">
						<div className="flex h-[184px] w-[184px] items-center justify-center rounded-[var(--radius-md)] bg-white p-2 shadow-sm">
							{isInvalidOrigin ? (
								<p className="px-3 text-center text-xs font-semibold text-red-700">
									Dominio inválido
								</p>
							) : qrError ? (
								<p className="px-2 text-center text-xs text-red-700">
									{qrError}
								</p>
							) : qrDataUrl && targetUrl ? (
								<img
									src={qrDataUrl}
									alt={`Código QR para abrir QUILLART visitante en ${targetUrl}`}
									width={168}
									height={168}
									className="h-[168px] w-[168px]"
								/>
							) : (
								<span
									className="q-star q-star--think text-[var(--gold)]"
									aria-hidden="true"
								/>
							)}
						</div>
						<span className="q-sm q-subtle text-center">
							Sin registro · ID anónimo
						</span>
					</div>

					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-4">
							<div className="rounded-[var(--radius-md)] bg-[var(--bg)] px-4 py-3">
								<p className="q-eyebrow flex items-center gap-1.5">
									<Users size={14} strokeWidth={1.75} aria-hidden="true" />
									Conectados ahora
								</p>
								<p className="q-num mt-1 text-3xl font-bold text-[var(--ink)]">
									{summary.connectedCount}
								</p>
							</div>
							<div className="rounded-[var(--radius-md)] bg-[var(--bg)] px-4 py-3">
								<p className="q-eyebrow flex items-center gap-1.5">
									<QrCode size={14} strokeWidth={1.75} aria-hidden="true" />
									Desde el QR
								</p>
								<p className="q-num mt-1 text-3xl font-bold text-[var(--green-text)]">
									{summary.qrCount}
								</p>
							</div>
						</div>

						{summary.connectedCount === 0 && connectionState === "live" ? (
							<p className="q-sm q-muted">
								Aún no hay celulares conectados. Proyecta el QR o abre el mapa
								en otro dispositivo para ver subir el contador al instante.
							</p>
						) : (
							<p className="q-sm q-muted">
								Cada persona entra al mapa en modo visitante sin registro. Solo
								se guarda un identificador anónimo temporal por sesión.
							</p>
						)}

						<div className="space-y-1.5">
							<label htmlFor="jury-qr-origin" className="q-eyebrow block">
								Dominio del QR (ajustable para red local o producción)
							</label>
							<input
								id="jury-qr-origin"
								type="url"
								aria-invalid={isInvalidOrigin}
								value={baseOrigin}
								onChange={(event) => setBaseOrigin(event.target.value)}
								placeholder="https://tu-dominio.com"
								className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-3.5 text-sm text-[var(--ink)]"
							/>
							{isInvalidOrigin && (
								<p role="alert" className="q-sm text-[var(--red-text)]">
									Dominio inválido. Usa una dirección completa con http:// o
									https://.
								</p>
							)}
						</div>

						<div className="q-row">
							<button
								ref={expandButtonRef}
								type="button"
								onClick={() => setExpanded(true)}
								disabled={!targetUrl || !qrDataUrl}
								className="q-btn q-btn--primary q-btn--sm"
							>
								<Maximize2 size={16} strokeWidth={1.75} aria-hidden="true" />
								Proyectar QR
							</button>
							<button
								type="button"
								onClick={() => void handleCopy()}
								disabled={!targetUrl}
								className="q-btn q-btn--secondary q-btn--sm"
							>
								<Copy size={16} strokeWidth={1.75} aria-hidden="true" />
								{copied ? "Enlace copiado" : "Copiar enlace"}
							</button>
							<a
								href="/mapa"
								target="_blank"
								rel="noreferrer"
								className="q-btn q-btn--ghost q-btn--sm"
							>
								<ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
								Probar como visitante
							</a>
						</div>
					</div>
				</div>
			</div>

			{expanded && qrDataUrl && targetUrl && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="QR del jurado en pantalla completa"
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
				>
					<button
						type="button"
						tabIndex={-1}
						aria-label="Cerrar proyección del QR"
						onClick={() => setExpanded(false)}
						className="absolute inset-0 bg-black/80"
					/>
					<div className="q-card relative z-10 w-full max-w-md">
						<div className="q-flag" aria-hidden="true">
							<i />
							<i />
							<i />
						</div>
						<div className="q-card__head">
							<div>
								<p className="q-eyebrow">QUILLART · Modo visitante</p>
								<h3 className="q-h2 mt-1">Escanea y entra sin registro</h3>
							</div>
							<button
								ref={closeButtonRef}
								type="button"
								onClick={() => setExpanded(false)}
								aria-label="Cerrar proyección del QR"
								className="q-btn q-btn--secondary q-btn--icon"
							>
								<X size={20} strokeWidth={1.75} aria-hidden="true" />
							</button>
						</div>
						<div className="q-card__body items-center text-center">
							<div className="rounded-[var(--radius-lg)] bg-white p-4">
								<img
									src={qrDataUrl}
									alt={`Código QR ampliado para ${targetUrl}`}
									width={280}
									height={280}
									className="h-[280px] w-[280px]"
								/>
							</div>
							<p className="q-num text-2xl font-bold text-[var(--green-text)]">
								{summary.connectedCount} visitante(s) conectado(s) ahora
							</p>
							<p className="q-sm q-muted break-all">{targetUrl}</p>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
