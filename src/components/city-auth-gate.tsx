import {
	AlertCircle,
	Lock,
	LogIn,
	LogOut,
	RefreshCw,
	ShieldAlert,
} from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import type { CitySessionInfo } from "../lib/city-dashboard-types";
import { useT } from "../lib/i18n/use-language";
import { CaptchaField } from "./community/captcha-field";
import { useCaptcha } from "./community/use-captcha";

interface CityAuthGateProps {
	session: CitySessionInfo | null;
	onSignIn: (
		email: string,
		password: string,
		captchaToken?: string | null,
	) => Promise<void>;
	onSignOut: () => Promise<void>;
}

interface SignInError {
	title: string;
	text: string;
	/** Raw technical message, shown only inside the collapsed details. */
	detail: string | null;
}

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

const INPUT_CLASS =
	"h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60 aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--red)]";

const LABEL_CLASS = "block text-[13px] font-semibold leading-[18px]";

// Token-coloured fills for the inline illustrations (fixed light panel).
const FILL = {
	ink: { fill: "var(--on-gold)" },
	white: { fill: "var(--star)" },
	gold: { fill: "var(--gold)" },
	green: { fill: "var(--green)" },
	red: { fill: "var(--red)" },
	water: { fill: "var(--line-control)", opacity: 0.45 },
} as const;

const STROKE = {
	fill: "none",
	stroke: "var(--on-gold)",
	strokeWidth: 2.5,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

/** Turns a Supabase Auth error into plain Spanish with the raw text kept apart. */
function describeSignInError(err: unknown): SignInError {
	const raw = err instanceof Error ? err.message : "";
	if (/invalid login|invalid credentials|credenciales/i.test(raw)) {
		return {
			title: "El correo o la contraseña no coinciden",
			text: "Revísalos e inténtalo otra vez.",
			detail: null,
		};
	}
	if (/fetch|network|timeout|conexi/i.test(raw)) {
		return {
			title: "No pudimos conectar con el servidor",
			text: "Revisa la conexión de este equipo e inténtalo otra vez.",
			detail: raw || null,
		};
	}
	return {
		title: "No pudimos abrir tu sesión",
		text: "Inténtalo otra vez. Si sigue pasando, avisa a quien administra las cuentas de tu entidad.",
		detail: raw || null,
	};
}

function useOnlineStatus(): [boolean, () => void] {
	const [online, setOnline] = useState(true);

	useEffect(() => {
		const update = () => setOnline(navigator.onLine);
		update();
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);

	return [online, () => setOnline(navigator.onLine)];
}

/** Command-centre screen with a route on the corridor (decorative). */
function OperatorIllustration() {
	return (
		<div
			className="q-illus flex-none !p-2.5 sm:!px-3.5"
			style={{ borderRadius: 18 }}
			aria-hidden="true"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 180 112"
				className="block h-[50px] w-20 sm:h-[75px] sm:w-[120px]"
				focusable="false"
			>
				<circle style={FILL.gold} cx="156" cy="20" r="11" />
				<rect style={FILL.white} x="34" y="14" width="112" height="72" rx="8" />
				<path
					style={FILL.water}
					d="M112 14 C102 40 126 60 118 86 L146 86 L146 22 Q146 14 138 14 Z"
				/>
				<path
					style={{ ...STROKE, strokeWidth: 7.5 }}
					d="M54 74 L76 58 L92 50 L112 32"
				/>
				<path
					style={{ ...STROKE, stroke: "var(--gold)", strokeWidth: 4 }}
					d="M54 74 L76 58 L92 50 L112 32"
				/>
				<circle style={FILL.ink} cx="54" cy="74" r="4" />
				<polygon
					style={FILL.green}
					points="112,23 113.4,28.5 118.4,25.6 115.5,30.6 121,32 115.5,33.4 118.4,38.4 113.4,35.5 112,41 110.6,35.5 105.6,38.4 108.5,33.4 103,32 108.5,30.6 105.6,25.6 110.6,28.5"
				/>
				<rect style={STROKE} x="34" y="14" width="112" height="72" rx="8" />
				<rect style={FILL.ink} x="22" y="88" width="136" height="7" rx="3.5" />
				<path style={STROKE} d="M14 104 H40 M140 104 H166" />
			</svg>
		</div>
	);
}

/** Antenna crossed out over water (decorative). */
function OfflineIllustration() {
	return (
		<div className="q-illus !px-3.5 !py-2.5" aria-hidden="true">
			<svg
				aria-hidden="true"
				viewBox="0 0 180 112"
				width="150"
				height="94"
				className="block"
				focusable="false"
			>
				<path
					style={STROKE}
					d="M90 40 L72 100 M90 40 L108 100 M78 80 H102 M82 66 H98"
				/>
				<circle style={FILL.gold} cx="90" cy="36" r="8" />
				<path
					style={STROKE}
					opacity={0.5}
					d="M68 18 A30 30 0 0 0 68 54 M112 18 A30 30 0 0 1 112 54 M56 8 A46 46 0 0 0 56 64 M124 8 A46 46 0 0 1 124 64"
				/>
				<path
					style={{ ...STROKE, stroke: "var(--red)", strokeWidth: 5 }}
					d="M54 12 L126 84"
				/>
				<path style={FILL.water} d="M0 100 H180 V112 H0 Z" />
			</svg>
		</div>
	);
}

function WrongRoleCard({
	session,
	onSignOut,
}: {
	session: CitySessionInfo;
	onSignOut: () => Promise<void>;
}) {
	return (
		<section
			className="q-card mx-auto mt-6 w-full max-w-[460px] sm:mt-10"
			aria-labelledby="city-auth-role-title"
		>
			<div className="q-band q-band--gold" aria-hidden="true" />
			<div className="q-card__head items-center">
				<span
					className="grid h-12 w-12 flex-none place-items-center rounded-full bg-[var(--gold-soft)] text-[var(--gold-text)]"
					aria-hidden="true"
				>
					<ShieldAlert size={24} strokeWidth={1.75} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="q-eyebrow">QUILLART · Lo que la ciudad aprende</p>
					<h1 id="city-auth-role-title" className="q-h2 mt-1">
						Esta cuenta no abre el tablero de la ciudad
					</h1>
				</div>
			</div>
			<div className="q-card__body">
				<p className="q-p q-muted">
					Entraste como{" "}
					<strong className="break-all text-[var(--ink)]">
						{session.email}
					</strong>
					. Sal y entra con tu cuenta de operador de la ciudad.
				</p>
				<details className="q-details">
					<summary>Por qué no puedo entrar</summary>
					<div className="q-details__body">
						<p className="m-0">
							El tablero de la ciudad solo se abre con cuentas de operador de la
							ciudad, y esta no lo es. Pide ese permiso a quien administra las
							cuentas de tu entidad.
						</p>
					</div>
				</details>
			</div>
			<div className="q-card__foot">
				<button
					type="button"
					onClick={() => void onSignOut()}
					className="q-btn q-btn--primary q-btn--block"
				>
					<LogOut {...ICON} />
					Salir y cambiar de cuenta
				</button>
			</div>
		</section>
	);
}

export function CityAuthGate({
	session,
	onSignIn,
	onSignOut,
}: CityAuthGateProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<SignInError | null>(null);
	const [online, recheckOnline] = useOnlineStatus();
	const captcha = useCaptcha();
	const t = useT();

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (captcha.missing) {
			setError({
				title: t.profile.captchaLabel,
				text: t.profile.captchaRequired,
				detail: null,
			});
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			await onSignIn(email.trim(), password, captcha.token);
		} catch (err) {
			setError(describeSignInError(err));
		} finally {
			setSubmitting(false);
			captcha.reset();
		}
	}

	if (session && session.role !== "city") {
		return <WrongRoleCard session={session} onSignOut={onSignOut} />;
	}

	const isEmpty = email === "" && password === "";
	const invalid = error !== null && error.detail === null;

	return (
		<section
			className="q-card mx-auto mt-6 w-full max-w-[460px] sm:mt-10"
			aria-labelledby="city-auth-title"
		>
			<div className="q-flag" aria-hidden="true">
				<i />
				<i />
				<i />
			</div>
			<div className="q-card__head items-center">
				<OperatorIllustration />
				<div className="min-w-0 flex-1">
					<p className="q-eyebrow">QUILLART · Lo que la ciudad aprende</p>
					<h1 id="city-auth-title" className="q-h1 mt-1">
						Acceso de ciudad
					</h1>
					<span className="q-badge q-badge--neutral mt-1.5">
						<Lock size={14} strokeWidth={1.75} aria-hidden="true" />
						Operador
					</span>
				</div>
			</div>

			{online ? (
				<form onSubmit={handleSubmit} className="q-card__body" noValidate>
					<p className="q-p q-sm q-muted">
						Entra con tu cuenta de la ciudad para ver lo que aprende de sus
						visitantes.
						{isEmpty &&
							" Si no tienes una, pídela a quien administra las cuentas de tu entidad."}
					</p>

					<div className="space-y-1.5">
						<label htmlFor="city-email" className={LABEL_CLASS}>
							Correo electrónico
						</label>
						<input
							id="city-email"
							type="email"
							required
							autoComplete="email"
							value={email}
							disabled={submitting}
							aria-invalid={invalid}
							aria-describedby={error ? "city-auth-error" : undefined}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="tu-correo@entidad.gov.co"
							className={INPUT_CLASS}
						/>
					</div>

					<div className="space-y-1.5">
						<label htmlFor="city-password" className={LABEL_CLASS}>
							Contraseña
						</label>
						<input
							id="city-password"
							type="password"
							required
							autoComplete="current-password"
							value={password}
							disabled={submitting}
							aria-invalid={invalid}
							aria-describedby={error ? "city-auth-error" : undefined}
							onChange={(event) => setPassword(event.target.value)}
							className={INPUT_CLASS}
						/>
					</div>

					<CaptchaField captcha={captcha} />

					{error && (
						<div
							id="city-auth-error"
							role="alert"
							className="q-alert q-alert--alert"
						>
							<span className="q-alert__icon" aria-hidden="true">
								<AlertCircle size={18} strokeWidth={1.75} />
							</span>
							<div className="q-alert__body">
								<p className="q-alert__title">{error.title}</p>
								<p className="q-alert__text">{error.text}</p>
								{error.detail && (
									<details className="q-details mt-2">
										<summary>Ver detalle técnico</summary>
										<div className="q-details__body">
											<p className="m-0 break-words">{error.detail}</p>
										</div>
									</details>
								)}
							</div>
						</div>
					)}

					<button
						type="submit"
						disabled={submitting}
						aria-busy={submitting}
						className="q-btn q-btn--primary q-btn--block mt-1"
					>
						{submitting ? (
							<span
								className="q-star q-star--think h-[18px] w-[18px]"
								aria-hidden="true"
							/>
						) : (
							<LogIn {...ICON} />
						)}
						{submitting ? "Verificando acceso…" : "Entrar"}
					</button>
					<p className="q-sr" role="status">
						{submitting ? "Verificando acceso" : ""}
					</p>
				</form>
			) : (
				<div className="q-card__body">
					<div
						className="q-state q-state--offline !min-h-0 !py-2"
						role="status"
					>
						<OfflineIllustration />
						<p className="q-state__title">Sin conexión</p>
						<p className="q-state__text">
							Necesitas internet para entrar. Revisa la conexión de este equipo.
						</p>
						<button
							type="button"
							onClick={recheckOnline}
							className="q-btn q-btn--primary q-state__action"
						>
							<RefreshCw {...ICON} />
							Reintentar
						</button>
					</div>
				</div>
			)}
		</section>
	);
}
