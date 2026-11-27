// Requires a verified TOTP second factor (aal2) from accounts with the city role
// before rendering city pages. Visitors, signed-out users and demo mode pass
// straight through: the page keeps handling them. The server enforces the same
// rule (src/lib/security/city-mfa.ts and current_user_role() in the database);
// this gate only lets the operator enroll or verify without leaving the page.

import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, Lock } from "lucide-react";
import {
	type FormEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { useT } from "../../lib/i18n/use-language";
import {
	type GateStep,
	gateStep,
	isCompleteTotpCode,
	normalizeTotpCode,
	TOTP_CODE_LENGTH,
} from "./city-mfa-gate-state";

const INPUT_CLASS =
	"h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[20px] tracking-[0.3em] text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60 aria-[invalid=true]:border-2 aria-[invalid=true]:border-[var(--red)]";

type Enrollment = { factorId: string; qrCode: string; secret: string };

type GateView =
	| { kind: "checking" }
	| { kind: "failed" }
	| { kind: "step"; step: GateStep; factorId: string | null };

function isConfigured(): boolean {
	return Boolean(
		import.meta.env.PUBLIC_SUPABASE_URL &&
			import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	);
}

async function getClient(): Promise<SupabaseClient> {
	const { supabase } = await import("../../lib/supabase");
	return supabase;
}

/** Reads the session, the account's own role and its MFA state. */
async function readGate(
	supabase: SupabaseClient,
): Promise<{ step: GateStep; factorId: string | null }> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) return { step: "open", factorId: null };

	// The account's own row (RLS lets every user read it), not current_user_role():
	// the database reports an aal1 city session as visitor.
	const { data: profile } = await supabase
		.from("user_profiles")
		.select("role")
		.eq("user_id", session.user.id)
		.maybeSingle();
	const role = profile?.role ?? session.user.app_metadata?.role;
	if (role !== "city") return { step: "open", factorId: null };

	const [aal, factors] = await Promise.all([
		supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
		supabase.auth.mfa.listFactors(),
	]);
	if (aal.error) throw aal.error;
	if (factors.error) throw factors.error;
	const verified = factors.data.totp[0] ?? null;
	return {
		step: gateStep({
			configured: true,
			signedIn: true,
			isCity: true,
			currentLevel: aal.data.currentLevel,
			hasVerifiedFactor: verified !== null,
		}),
		factorId: verified?.id ?? null,
	};
}

export function CityMfaGate({ children }: { children: ReactNode }) {
	const t = useT().cityMfa;
	const [view, setView] = useState<GateView>(() =>
		isConfigured()
			? { kind: "checking" }
			: { kind: "step", step: "open", factorId: null },
	);

	const evaluate = useCallback(async () => {
		if (!isConfigured()) return;
		try {
			const result = await readGate(await getClient());
			setView({ kind: "step", ...result });
		} catch {
			setView({ kind: "failed" });
		}
	}, []);

	useEffect(() => {
		if (!isConfigured()) return;
		let unsubscribe: (() => void) | undefined;
		let active = true;
		void evaluate();
		void getClient().then((supabase) => {
			if (!active) return;
			const { data } = supabase.auth.onAuthStateChange((event) => {
				if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
				// Supabase calls must not run inside this callback (auth lock).
				setTimeout(() => void evaluate(), 0);
			});
			unsubscribe = () => data.subscription.unsubscribe();
		});
		return () => {
			active = false;
			unsubscribe?.();
		};
	}, [evaluate]);

	if (view.kind === "step" && view.step === "open") return <>{children}</>;

	if (view.kind === "checking") {
		return (
			<p className="q-p q-muted mx-auto mt-10 max-w-[460px]" role="status">
				{t.checking}
			</p>
		);
	}

	if (view.kind === "failed") {
		return (
			<GateCard title={t.enrollTitle} eyebrow={t.eyebrow}>
				<div role="alert" className="q-alert q-alert--alert">
					<span className="q-alert__icon" aria-hidden="true">
						<AlertCircle size={18} strokeWidth={1.75} />
					</span>
					<div className="q-alert__body">
						<p className="q-alert__text">{t.errorLoad}</p>
					</div>
				</div>
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--block"
					onClick={() => {
						setView({ kind: "checking" });
						void evaluate();
					}}
				>
					{t.retry}
				</button>
			</GateCard>
		);
	}

	return (
		<MfaChallenge
			step={view.step === "enroll" ? "enroll" : "verify"}
			factorId={view.factorId}
			onVerified={() => void evaluate()}
		/>
	);
}

function GateCard({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: string;
	children: ReactNode;
}) {
	const titleId = useId();
	const headingRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => headingRef.current?.focus(), []);
	return (
		<section
			className="q-card mx-auto mt-6 w-full max-w-[460px] sm:mt-10"
			aria-labelledby={titleId}
		>
			<div className="q-card__head items-center">
				<Lock size={28} strokeWidth={1.75} aria-hidden="true" />
				<div className="min-w-0 flex-1">
					<p className="q-eyebrow">{eyebrow}</p>
					<h1 id={titleId} ref={headingRef} tabIndex={-1} className="q-h1 mt-1">
						{title}
					</h1>
				</div>
			</div>
			<div className="q-card__body space-y-4">{children}</div>
		</section>
	);
}

function MfaChallenge({
	step,
	factorId,
	onVerified,
}: {
	step: "enroll" | "verify";
	factorId: string | null;
	onVerified: () => void;
}) {
	const t = useT().cityMfa;
	const codeId = useId();
	const hintId = useId();
	const errorId = useId();
	const codeRef = useRef<HTMLInputElement>(null);
	const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const targetFactor = step === "verify" ? factorId : enrollment?.factorId;

	async function startEnroll() {
		setBusy(true);
		setError(null);
		try {
			const supabase = await getClient();
			// An abandoned enrollment leaves an unverified factor behind; clear it first.
			const { data: listed } = await supabase.auth.mfa.listFactors();
			for (const factor of listed?.all ?? []) {
				if (factor.factor_type === "totp" && factor.status === "unverified") {
					await supabase.auth.mfa.unenroll({ factorId: factor.id });
				}
			}
			const { data, error: enrollError } = await supabase.auth.mfa.enroll({
				factorType: "totp",
			});
			if (enrollError || !data) throw enrollError;
			setEnrollment({
				factorId: data.id,
				qrCode: data.totp.qr_code,
				secret: data.totp.secret,
			});
			setTimeout(() => codeRef.current?.focus(), 0);
		} catch {
			setError(t.errorEnroll);
		} finally {
			setBusy(false);
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!targetFactor) return;
		if (!isCompleteTotpCode(code)) {
			setError(t.errorIncomplete);
			codeRef.current?.focus();
			return;
		}
		setBusy(true);
		setError(null);
		const supabase = await getClient();
		const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
			factorId: targetFactor,
			code,
		});
		setBusy(false);
		if (verifyError) {
			setError(t.errorInvalid);
			setCode("");
			codeRef.current?.focus();
			return;
		}
		onVerified();
	}

	async function signOut() {
		const supabase = await getClient();
		await supabase.auth.signOut();
	}

	const showCodeForm = step === "verify" || enrollment !== null;

	return (
		<GateCard
			eyebrow={t.eyebrow}
			title={step === "enroll" ? t.enrollTitle : t.verifyTitle}
		>
			<p className="q-p q-sm q-muted">
				{step === "enroll" ? t.enrollIntro : t.verifyIntro}
			</p>

			{step === "enroll" && !enrollment && (
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--block"
					onClick={() => void startEnroll()}
					disabled={busy}
					aria-busy={busy}
				>
					{t.startEnroll}
				</button>
			)}

			{enrollment && (
				<div className="space-y-2">
					<p className="q-p q-sm">{t.enrollStepScan}</p>
					<img
						src={enrollment.qrCode}
						alt={t.qrAlt}
						width={180}
						height={180}
						className="mx-auto rounded-[var(--radius-md)] bg-white p-2"
					/>
					<p className="q-sm">
						<span className="block font-semibold">{t.secretLabel}</span>
						<code className="break-all select-all">{enrollment.secret}</code>
					</p>
				</div>
			)}

			{showCodeForm && (
				<form onSubmit={handleSubmit} className="space-y-3" noValidate>
					<div className="space-y-1.5">
						<label
							htmlFor={codeId}
							className="block text-[13px] font-semibold leading-[18px]"
						>
							{t.codeLabel}
						</label>
						<input
							ref={codeRef}
							id={codeId}
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							pattern="[0-9]*"
							maxLength={TOTP_CODE_LENGTH}
							required
							value={code}
							disabled={busy}
							aria-invalid={error !== null}
							aria-describedby={error ? `${hintId} ${errorId}` : hintId}
							onChange={(event) =>
								setCode(normalizeTotpCode(event.target.value))
							}
							className={INPUT_CLASS}
						/>
						<p id={hintId} className="q-sm q-muted">
							{t.codeHint}
						</p>
					</div>
					<button
						type="submit"
						disabled={busy}
						aria-busy={busy}
						className="q-btn q-btn--primary q-btn--block"
					>
						{busy ? t.submitting : t.submit}
					</button>
				</form>
			)}

			{error && (
				<div id={errorId} role="alert" className="q-alert q-alert--alert">
					<span className="q-alert__icon" aria-hidden="true">
						<AlertCircle size={18} strokeWidth={1.75} />
					</span>
					<div className="q-alert__body">
						<p className="q-alert__text">{error}</p>
					</div>
				</div>
			)}

			<button
				type="button"
				className="q-btn q-btn--secondary q-btn--block"
				onClick={() => void signOut()}
			>
				{t.signOut}
			</button>
		</GateCard>
	);
}
