// Profile: sign in or create an account, then the person's registrations,
// events they organize and conversations they started.

import { LogOut, Pencil, ShieldCheck } from "lucide-react";
import {
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useState,
} from "react";
import { isOAuthReturn } from "../../lib/auth/google-auth";
import { GOOGLE_AUTH_ENABLED } from "../../lib/auth/google-sign-in";
import { initials } from "../../lib/community/community-labels";
import { validateSignUp } from "../../lib/community/community-rules";
import type { Profile } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import { AppealsPanel } from "./appeals-panel";
import { CommunityShell } from "./community-shell";
import {
	EmptyState,
	ErrorNote,
	Field,
	inputClass,
	Loaded,
	Loading,
	PageTitle,
} from "./community-ui";
import { EventCard } from "./event-card";
import { GoogleSignInButton } from "./google-sign-in-button";
import { MyDataPanel } from "./my-data-panel";
import { ThreadCard } from "./thread-card";
import { TurnstileWidget } from "./turnstile-widget";
import { useCaptcha } from "./use-captcha";
import { useLoad, useSession, useStore } from "./use-community";

/** Only same-site paths: "/agenda/x" yes, "//evil.com" or "https://…" no. */
export function safeReturnPath(raw: string | null): string | null {
	if (!raw) return null;
	if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\"))
		return null;
	return raw;
}

/** Read at load, before supabase-js removes the OAuth tokens from the URL. */
const OPENED_BY_OAUTH =
	typeof window !== "undefined" && isOAuthReturn(window.location.hash);

function returnPath(): string | null {
	if (typeof window === "undefined") return null;
	return safeReturnPath(
		new URLSearchParams(window.location.search).get("volver"),
	);
}

function errorText(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

function SubmitButton({
	busy,
	label,
	busyLabel,
}: {
	busy: boolean;
	label: string;
	busyLabel: string;
}) {
	return (
		<button
			type="submit"
			disabled={busy}
			aria-busy={busy}
			className="q-btn q-btn--primary q-btn--block mt-2"
		>
			{busy && <span className="q-star q-star--think" aria-hidden="true" />}
			{busy ? busyLabel : label}
		</button>
	);
}

function ResidencyField({
	name,
	isVisitor,
	onChange,
}: {
	name: string;
	isVisitor: boolean;
	onChange: (isVisitor: boolean) => void;
}) {
	const t = useT();
	const options = [
		{ value: false, label: t.profile.residencyLive },
		{ value: true, label: t.profile.residencyVisit },
	];
	return (
		<fieldset className="space-y-1.5">
			<legend className="q-eyebrow mb-1.5 block">
				{t.profile.residencyLegend}
			</legend>
			<div className="q-seg flex w-full">
				{options.map((option) => (
					<label
						key={option.label}
						className={`q-seg__opt min-h-11! flex-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)] ${isVisitor === option.value ? "is-on" : ""}`}
					>
						<input
							type="radio"
							name={name}
							className="sr-only"
							checked={isVisitor === option.value}
							onChange={() => onChange(option.value)}
						/>
						{option.label}
					</label>
				))}
			</div>
		</fieldset>
	);
}

function PrivacyNote() {
	const t = useT();
	return <p className="q-sm q-muted">{t.profile.privacyNote}</p>;
}

/** The Turnstile widget, only when a site key is configured. */
function CaptchaField({ captcha }: { captcha: ReturnType<typeof useCaptcha> }) {
	if (!captcha.enabled) return null;
	return (
		<TurnstileWidget
			siteKey={captcha.siteKey}
			onToken={captcha.setToken}
			resetSignal={captcha.resetSignal}
		/>
	);
}

function SignInForm() {
	const t = useT();
	const store = useStore();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const captcha = useCaptcha();

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (captcha.missing) {
			setError(t.profile.captchaRequired);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await store.signIn(email.trim(), password, captcha.token);
			const back = returnPath();
			if (back) window.location.assign(back);
		} catch (err) {
			setError(errorText(err, t.profile.signInFailed));
			setBusy(false);
		} finally {
			captcha.reset();
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			<Field id="signin-email" label={t.profile.email}>
				<input
					id="signin-email"
					type="email"
					required
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<Field id="signin-password" label={t.profile.password}>
				<input
					id="signin-password"
					type="password"
					required
					autoComplete="current-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<CaptchaField captcha={captcha} />
			{error && <ErrorNote message={error} />}
			<SubmitButton
				busy={busy}
				label={t.profile.signIn}
				busyLabel={t.profile.signingIn}
			/>
		</form>
	);
}

function SignUpForm() {
	const t = useT();
	const store = useStore();
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [neighborhood, setNeighborhood] = useState("");
	const [isVisitor, setIsVisitor] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
	const captcha = useCaptcha();

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		const input = {
			displayName: displayName.trim(),
			email: email.trim(),
			password,
			neighborhood: neighborhood.trim() || null,
			isVisitor,
		};
		const invalid = validateSignUp(input);
		if (invalid) {
			setError(invalid);
			return;
		}
		if (captcha.missing) {
			setError(t.profile.captchaRequired);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const result = await store.signUp({
				...input,
				captchaToken: captcha.token,
			});
			if (result.needsConfirmation) {
				setConfirmEmail(input.email);
				setBusy(false);
				return;
			}
			const back = returnPath();
			if (back) window.location.assign(back);
		} catch (err) {
			setError(errorText(err, t.profile.signUpFailed));
			setBusy(false);
		} finally {
			captcha.reset();
		}
	}

	if (confirmEmail)
		return (
			<p
				role="status"
				className="rounded-[var(--radius-md)] bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green-text)]"
			>
				{t.profile.almostDone} <strong>{confirmEmail}</strong>.{" "}
				{t.profile.almostDoneRest}
			</p>
		);

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			<Field
				id="signup-name"
				label={t.profile.displayName}
				hint={t.profile.displayNameHint}
			>
				<input
					id="signup-name"
					required
					autoComplete="nickname"
					maxLength={60}
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<Field id="signup-email" label={t.profile.email}>
				<input
					id="signup-email"
					type="email"
					required
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<Field
				id="signup-password"
				label={t.profile.password}
				hint={t.profile.passwordHint}
			>
				<input
					id="signup-password"
					type="password"
					required
					minLength={8}
					autoComplete="new-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<Field id="signup-neighborhood" label={t.profile.neighborhood}>
				<input
					id="signup-neighborhood"
					autoComplete="address-level3"
					maxLength={60}
					placeholder={t.profile.neighborhoodPlaceholder}
					value={neighborhood}
					onChange={(event) => setNeighborhood(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<ResidencyField
				name="signup-residency"
				isVisitor={isVisitor}
				onChange={setIsVisitor}
			/>
			<PrivacyNote />
			<CaptchaField captcha={captcha} />
			{error && <ErrorNote message={error} />}
			<SubmitButton
				busy={busy}
				label={t.profile.signUp}
				busyLabel={t.profile.signingUp}
			/>
		</form>
	);
}

type AuthTab = "signin" | "signup";

function AuthPanel() {
	const t = useT();
	const [tab, setTab] = useState<AuthTab>("signin");
	const tabs: { value: AuthTab; label: string }[] = [
		{ value: "signin", label: t.profile.signIn },
		{ value: "signup", label: t.profile.signUp },
	];
	return (
		<>
			<PageTitle
				eyebrow={t.profile.authEyebrow}
				title={t.profile.authTitle}
				illustration="/illustrations/secure-login.svg"
			>
				{t.profile.authIntro}
			</PageTitle>
			<section className="q-card mx-auto w-full max-w-md gap-5 p-5">
				{GOOGLE_AUTH_ENABLED && (
					<>
						<GoogleSignInButton returnPath={returnPath()} />
						<p className="q-sm q-muted text-center">{t.profile.emailDivider}</p>
					</>
				)}
				<div
					role="tablist"
					aria-label={t.profile.accountLabel}
					className="q-seg flex w-full"
				>
					{tabs.map((option) => (
						<button
							key={option.value}
							type="button"
							role="tab"
							id={`tab-${option.value}`}
							aria-selected={tab === option.value}
							aria-controls={`panel-${option.value}`}
							onClick={() => setTab(option.value)}
							className={`q-seg__opt min-h-11! flex-1 ${tab === option.value ? "is-on" : ""}`}
						>
							{option.label}
						</button>
					))}
				</div>
				<div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
					{tab === "signin" ? <SignInForm /> : <SignUpForm />}
				</div>
			</section>
		</>
	);
}

function EditProfileForm({
	profile,
	onDone,
}: {
	profile: Profile;
	onDone: () => void;
}) {
	const t = useT();
	const store = useStore();
	const [displayName, setDisplayName] = useState(profile.displayName);
	const [neighborhood, setNeighborhood] = useState(profile.neighborhood ?? "");
	const [isVisitor, setIsVisitor] = useState(profile.isVisitor);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (displayName.trim().length < 2) {
			setError(t.profile.nameTooShort);
			return;
		}
		setBusy(true);
		setError(null);
		try {
			await store.updateProfile({
				displayName: displayName.trim(),
				neighborhood: neighborhood.trim() || null,
				isVisitor,
			});
			onDone();
		} catch (err) {
			setError(errorText(err, t.profile.saveFailed));
			setBusy(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="q-card gap-4 p-5"
			aria-labelledby="edit-profile-title"
			noValidate
		>
			<h2 id="edit-profile-title" className="q-h3">
				{t.profile.editProfile}
			</h2>
			<Field id="edit-name" label={t.profile.displayName}>
				<input
					id="edit-name"
					required
					maxLength={60}
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<Field id="edit-neighborhood" label={t.profile.neighborhood}>
				<input
					id="edit-neighborhood"
					maxLength={60}
					value={neighborhood}
					onChange={(event) => setNeighborhood(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<ResidencyField
				name="edit-residency"
				isVisitor={isVisitor}
				onChange={setIsVisitor}
			/>
			<PrivacyNote />
			{error && <ErrorNote message={error} />}
			<div className="flex flex-wrap gap-2">
				<button
					type="submit"
					disabled={busy}
					aria-busy={busy}
					className="q-btn q-btn--primary"
				>
					{busy ? t.profile.saving : t.profile.saveChanges}
				</button>
				<button
					type="button"
					onClick={onDone}
					className="q-btn q-btn--ghost"
					disabled={busy}
				>
					{t.profile.cancel}
				</button>
			</div>
		</form>
	);
}

function Section({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section aria-labelledby={id} className="space-y-3">
			<h2 id={id} className="q-h2">
				{title}
			</h2>
			{children}
		</section>
	);
}

function SignedInView({ profile }: { profile: Profile }) {
	const t = useT();
	const store = useStore();
	const [editing, setEditing] = useState(false);
	const [saved, setSaved] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	const { state: eventsState } = useLoad(
		async (s) => {
			const [places, ids] = await Promise.all([
				s.listPlaces(),
				s.myRegistrations(),
			]);
			const [registered, organized] = await Promise.all([
				ids.length > 0 ? s.listEvents({ ids }) : Promise.resolve([]),
				s.listEvents({ organizerId: profile.id, includePast: true }),
			]);
			const placeNames = new Map(places.map((place) => [place.id, place.name]));
			return { registered, organized, placeNames };
		},
		[profile.id],
		["events"],
	);
	const { state: threadsState } = useLoad(
		(s) => s.listThreads({ authorId: profile.id }),
		[profile.id],
		["forum"],
	);
	const { state: moderatorState } = useLoad(
		(s) => s.canModerate(),
		[profile.id],
	);

	useEffect(() => {
		if (!saved) return;
		const timer = window.setTimeout(() => setSaved(false), 4000);
		return () => window.clearTimeout(timer);
	}, [saved]);

	async function handleSignOut() {
		setSigningOut(true);
		try {
			await store.signOut();
		} finally {
			setSigningOut(false);
		}
	}

	const residency = profile.isVisitor
		? t.profile.visitorIn
		: t.profile.residentIn;

	return (
		<>
			<section className="flex flex-wrap items-center gap-4">
				<span
					className="q-avatar h-16! w-16! rounded-[20px]! text-xl font-semibold"
					aria-hidden="true"
				>
					{initials(profile.displayName) || "?"}
				</span>
				<div className="min-w-0 flex-1">
					<p className="q-eyebrow">{t.profile.yourProfile}</p>
					<h1 className="q-h1 mt-1 break-words">
						{t.profile.hello(profile.displayName)}
					</h1>
					<p className="q-p q-muted mt-1">
						{profile.neighborhood
							? `${profile.neighborhood} · ${residency}`
							: residency}
					</p>
				</div>
			</section>

			<div className="flex flex-wrap gap-2">
				{!editing && (
					<button
						type="button"
						onClick={() => {
							setSaved(false);
							setEditing(true);
						}}
						className="q-btn q-btn--secondary q-btn--sm min-h-11!"
					>
						<Pencil size={16} aria-hidden="true" />
						{t.profile.editProfile}
					</button>
				)}
				<AskQuillartButton prompt={t.profile.askPrompt} />
				{moderatorState.status === "ready" && moderatorState.data && (
					<a
						href="/moderacion"
						className="q-btn q-btn--secondary q-btn--sm min-h-11!"
					>
						<ShieldCheck size={16} aria-hidden="true" />
						{t.profile.moderation}
					</a>
				)}
			</div>

			{saved && (
				<p
					role="status"
					className="rounded-[var(--radius-md)] bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green-text)]"
				>
					{t.profile.saved}
				</p>
			)}
			{editing && (
				<EditProfileForm
					profile={profile}
					onDone={() => {
						setEditing(false);
						setSaved(true);
					}}
				/>
			)}

			<Section id="my-registrations" title={t.profile.myRegistrations}>
				<Loaded
					state={eventsState}
					loadingLabel={t.profile.loadingRegistrations}
				>
					{({ registered, placeNames }) =>
						registered.length === 0 ? (
							<EmptyState
								title={t.profile.noRegistrations}
								illustration="/illustrations/events-calendar.svg"
								action={
									<a href="/agenda" className="q-btn q-btn--primary">
										{t.profile.viewAgenda}
									</a>
								}
							>
								{t.profile.noRegistrationsText}
							</EmptyState>
						) : (
							<ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
								{registered.map((event) => (
									<li key={event.id} className="grid">
										<EventCard
											event={event}
											placeName={
												event.placeId ? placeNames.get(event.placeId) : null
											}
											registered
										/>
									</li>
								))}
							</ul>
						)
					}
				</Loaded>
			</Section>

			<Section id="my-events" title={t.profile.myEvents}>
				<Loaded state={eventsState} loadingLabel={t.profile.loadingEvents}>
					{({ organized, placeNames }) =>
						organized.length === 0 ? (
							<EmptyState
								title={t.profile.noEvents}
								illustration="/illustrations/publish-post.svg"
								action={
									<a href="/agenda/nuevo" className="q-btn q-btn--primary">
										{t.profile.organizeEvent}
									</a>
								}
							>
								{t.profile.noEventsText}
							</EmptyState>
						) : (
							<ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
								{organized.map((event) => (
									<li key={event.id} className="grid">
										<EventCard
											event={event}
											placeName={
												event.placeId ? placeNames.get(event.placeId) : null
											}
										/>
									</li>
								))}
							</ul>
						)
					}
				</Loaded>
			</Section>

			<Section id="my-threads" title={t.profile.myThreads}>
				<Loaded state={threadsState} loadingLabel={t.profile.loadingThreads}>
					{(threads) =>
						threads.length === 0 ? (
							<EmptyState
								title={t.profile.noThreads}
								illustration="/illustrations/share-opinion.svg"
								action={
									<a href="/foro" className="q-btn q-btn--primary">
										{t.profile.goCommunity}
									</a>
								}
							>
								{t.profile.noThreadsText}
							</EmptyState>
						) : (
							<ul className="space-y-3">
								{threads.map((thread) => (
									<li key={thread.id}>
										<ThreadCard thread={thread} />
									</li>
								))}
							</ul>
						)
					}
				</Loaded>
			</Section>

			<AppealsPanel />

			<MyDataPanel />

			<div>
				<button
					type="button"
					onClick={() => void handleSignOut()}
					disabled={signingOut}
					aria-busy={signingOut}
					className="q-btn q-btn--ghost"
				>
					<LogOut size={18} aria-hidden="true" />
					{signingOut ? t.profile.signingOut : t.profile.signOut}
				</button>
			</div>
		</>
	);
}

export function ProfilePage({ aiHref }: { aiHref?: string }) {
	const t = useT();
	const { profile, loading } = useSession();
	// Back from Google with a session: return where the person was, like the email form.
	useEffect(() => {
		if (!profile || !OPENED_BY_OAUTH) return;
		const back = returnPath();
		if (back) window.location.assign(back);
	}, [profile]);
	return (
		<CommunityShell current="profile" aiHref={aiHref}>
			{loading ? (
				<Loading label={t.profile.checkingSession} />
			) : profile ? (
				<SignedInView key={profile.id} profile={profile} />
			) : (
				<AuthPanel />
			)}
		</CommunityShell>
	);
}
