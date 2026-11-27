import type { SupabaseClient } from "@supabase/supabase-js";
import { BadgeCheck, LogIn, UserPlus } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { useT } from "../../lib/i18n/use-language";
import { isClaimCode } from "../../lib/vendor/vendor-logic";
import {
	claimBusiness,
	currentUserId,
	signIn,
	signUp,
	vendorClient,
} from "../../lib/vendor/vendor-service";
import { CaptchaField } from "../community/captcha-field";
import { ConsentNote } from "../community/consent-note";
import { useCaptcha } from "../community/use-captcha";
import "../../styles/life-roles.css";

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;
const CODE_KEY = "quillart-vendor-claim";
const INPUT =
	"h-12 w-full rounded-full border border-[var(--line-control)] bg-[var(--bg)] px-5 text-[15px] text-[var(--ink)]";

function savedCode(): string | null {
	try {
		return sessionStorage.getItem(CODE_KEY);
	} catch {
		return null;
	}
}

function saveCode(code: string | null) {
	try {
		if (code) sessionStorage.setItem(CODE_KEY, code);
		else sessionStorage.removeItem(CODE_KEY);
	} catch {
		// Private mode: the code only lives in memory for this visit.
	}
}

/** Claims the business if there is a code, then goes to the portal. */
async function finish(
	supabase: SupabaseClient,
	claim: string | null,
	onNotice: (text: string) => void,
) {
	if (claim) {
		const business = await claimBusiness(supabase, claim);
		saveCode(null);
		onNotice(`Listo: ${business} quedó a tu nombre.`);
	}
	window.location.assign("/vendedor");
}

/**
 * /vendedor/entrar: sign in or create an account, and claim the business with
 * the city's QR (?alta=<code>). The code is moved out of the address bar.
 */
export default function VendorEntry() {
	const [client, setClient] = useState<SupabaseClient | null | undefined>(
		undefined,
	);
	const [code, setCode] = useState<string | null>(null);
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const captcha = useCaptcha();
	const t = useT();

	useEffect(() => {
		const fromQr = new URLSearchParams(window.location.search).get("alta");
		if (fromQr) {
			window.history.replaceState(null, "", "/vendedor/entrar");
			if (isClaimCode(fromQr)) saveCode(fromQr);
		}
		const claim = isClaimCode(fromQr) ? fromQr : savedCode();
		setCode(claim);
		if (fromQr && !isClaimCode(fromQr))
			setError("El código del QR no es válido. Pide uno nuevo a la ciudad.");
		void vendorClient().then(async (supabase) => {
			setClient(supabase);
			if (supabase && (await currentUserId(supabase))) {
				setBusy(true);
				await finish(supabase, claim, setNotice).catch((reason: unknown) => {
					setError(reason instanceof Error ? reason.message : String(reason));
					setBusy(false);
				});
			}
		});
	}, []);

	const submit = async (event: SyntheticEvent) => {
		event.preventDefault();
		if (!client) return;
		if (captcha.missing) {
			setError(t.profile.captchaRequired);
			return;
		}
		setBusy(true);
		setError(null);
		const token = captcha.token;
		captcha.reset();
		try {
			if (mode === "signin") {
				await signIn(client, email, password, token);
			} else if (!(await signUp(client, email, password, name, token))) {
				setNotice(
					"Te enviamos un correo para confirmar la cuenta. Ábrelo y vuelve aquí.",
				);
				setBusy(false);
				return;
			}
			await finish(client, code, setNotice);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
			setBusy(false);
		}
	};

	return (
		<main className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
			<div className="r-canvas l-rise">
				<span
					className="l-geo l-geo--ring l-geo--green r-g1"
					aria-hidden="true"
				/>
				<span className="l-geo l-geo--half r-g2" aria-hidden="true" />
				<span
					className="l-geo l-geo--plus l-geo--ink r-g3"
					aria-hidden="true"
				/>
				<p className="l-eyebrow">
					<span className="q-star" aria-hidden="true" />
					Portal del vendedor
				</p>
				<h1 className="l-h2 r-title">
					{code ? "Da de alta tu negocio" : "Entra a tu negocio"}
				</h1>
				<p className="q-sm text-[var(--ink-muted)]">
					{code
						? "Escaneaste el código que te dio la ciudad. Entra o crea tu cuenta y tu negocio quedará a tu nombre, con el sello de negocio verificado."
						: "Marca tu negocio abierto, pon tus precios y mira cuántas visitas recibes. Sin comisión."}
				</p>
			</div>

			{code && (
				<p className="q-badge q-badge--optimal l-rise self-start">
					<BadgeCheck size={16} strokeWidth={1.75} aria-hidden="true" /> Código
					de alta listo
				</p>
			)}

			{client === null ? (
				<p
					role="alert"
					className="q-card q-card__body r-shape-bubble text-[var(--red-text)]"
				>
					El portal necesita la conexión con la base de datos de la ciudad, que
					no está configurada aquí.
				</p>
			) : (
				<form
					className="q-card r-shape-corner l-rise"
					style={{ ["--i" as string]: 1 }}
					onSubmit={(event) => void submit(event)}
					aria-busy={busy}
				>
					<div className="q-card__body space-y-3 pt-6 lg:pt-7">
						<div className="q-seg" role="tablist" aria-label="Cuenta">
							<button
								type="button"
								role="tab"
								aria-selected={mode === "signin"}
								className={`q-seg__opt ${mode === "signin" ? "is-on" : ""}`}
								onClick={() => setMode("signin")}
							>
								Ya tengo cuenta
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={mode === "signup"}
								className={`q-seg__opt ${mode === "signup" ? "is-on" : ""}`}
								onClick={() => setMode("signup")}
							>
								Crear cuenta
							</button>
						</div>
						{mode === "signup" && (
							<label className="block space-y-1">
								<span className="text-[13px] font-semibold">Tu nombre</span>
								<input
									className={INPUT}
									required
									maxLength={60}
									autoComplete="name"
									value={name}
									onChange={(event) => setName(event.target.value)}
								/>
							</label>
						)}
						<label className="block space-y-1">
							<span className="text-[13px] font-semibold">Correo</span>
							<input
								className={INPUT}
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</label>
						<label className="block space-y-1">
							<span className="text-[13px] font-semibold">Contraseña</span>
							<input
								className={INPUT}
								type="password"
								required
								minLength={8}
								autoComplete={
									mode === "signin" ? "current-password" : "new-password"
								}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</label>
						<CaptchaField captcha={captcha} />
						{error && (
							<p role="alert" className="q-sm text-[var(--red-text)]">
								{error}
							</p>
						)}
						{notice && (
							<p role="status" className="q-sm">
								{notice}
							</p>
						)}
						{mode === "signup" && <ConsentNote id="vendor-signup-consent" />}
						<button
							type="submit"
							className="q-btn q-btn--primary q-btn--block l-cta"
							disabled={busy || client === undefined}
							aria-describedby={
								mode === "signup" ? "vendor-signup-consent" : undefined
							}
						>
							{mode === "signin" ? <LogIn {...ICON} /> : <UserPlus {...ICON} />}
							{busy
								? "Un momento…"
								: mode === "signin"
									? "Entrar"
									: "Crear cuenta"}
						</button>
					</div>
				</form>
			)}
		</main>
	);
}
