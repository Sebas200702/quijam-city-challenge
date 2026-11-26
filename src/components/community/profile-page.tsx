// Profile: sign in or create an account, then the person's registrations,
// events they organize and conversations they started.

import { LogOut, Pencil, ShieldCheck } from "lucide-react";
import {
	type ReactNode,
	type SyntheticEvent,
	useEffect,
	useState,
} from "react";
import { initials } from "../../lib/community/community-labels";
import { validateSignUp } from "../../lib/community/community-rules";
import type { Profile } from "../../lib/community/community-types";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
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
import { ThreadCard } from "./thread-card";
import { useLoad, useSession, useStore } from "./use-community";

/** Only same-site paths: "/agenda/x" yes, "//evil.com" or "https://…" no. */
export function safeReturnPath(raw: string | null): string | null {
	if (!raw) return null;
	if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\"))
		return null;
	return raw;
}

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
	const options = [
		{ value: false, label: "Vivo en Barranquilla" },
		{ value: true, label: "Estoy de visita" },
	];
	return (
		<fieldset className="space-y-1.5">
			<legend className="q-eyebrow mb-1.5 block">¿Vives aquí?</legend>
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
	return (
		<p className="q-sm q-muted">
			Solo tu nombre visible y tu barrio (si lo escribes) son públicos. Tu
			correo no se muestra a nadie. Tratamos tus datos según la Ley 1581 de 2012
			de protección de datos personales.
		</p>
	);
}

function SignInForm() {
	const store = useStore();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await store.signIn(email.trim(), password);
			const back = returnPath();
			if (back) window.location.assign(back);
		} catch (err) {
			setError(errorText(err, "No pudimos entrar. Revisa tus datos."));
			setBusy(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			<Field id="signin-email" label="Correo">
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
			<Field id="signin-password" label="Contraseña">
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
			{error && <ErrorNote message={error} />}
			<SubmitButton busy={busy} label="Entrar" busyLabel="Entrando…" />
		</form>
	);
}

function SignUpForm() {
	const store = useStore();
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [neighborhood, setNeighborhood] = useState("");
	const [isVisitor, setIsVisitor] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

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
		setBusy(true);
		setError(null);
		try {
			const result = await store.signUp(input);
			if (result.needsConfirmation) {
				setConfirmEmail(input.email);
				setBusy(false);
				return;
			}
			const back = returnPath();
			if (back) window.location.assign(back);
		} catch (err) {
			setError(errorText(err, "No pudimos crear tu cuenta. Intenta de nuevo."));
			setBusy(false);
		}
	}

	if (confirmEmail)
		return (
			<p
				role="status"
				className="rounded-[var(--radius-md)] bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green-text)]"
			>
				¡Casi listo! Te enviamos un correo a <strong>{confirmEmail}</strong>.
				Abre el enlace para confirmar tu cuenta y después entra con tu correo y
				contraseña.
			</p>
		);

	return (
		<form onSubmit={handleSubmit} className="space-y-4" noValidate>
			<Field
				id="signup-name"
				label="Nombre visible"
				hint="Así te verán en la agenda y en la comunidad."
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
			<Field id="signup-email" label="Correo">
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
				label="Contraseña"
				hint="Mínimo 8 caracteres."
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
			<Field id="signup-neighborhood" label="Barrio (opcional)">
				<input
					id="signup-neighborhood"
					autoComplete="address-level3"
					maxLength={60}
					placeholder="Ej.: El Prado"
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
			{error && <ErrorNote message={error} />}
			<SubmitButton
				busy={busy}
				label="Crear cuenta"
				busyLabel="Creando tu cuenta…"
			/>
		</form>
	);
}

type AuthTab = "signin" | "signup";

function AuthPanel() {
	const [tab, setTab] = useState<AuthTab>("signin");
	const tabs: { value: AuthTab; label: string }[] = [
		{ value: "signin", label: "Entrar" },
		{ value: "signup", label: "Crear cuenta" },
	];
	return (
		<>
			<PageTitle eyebrow="Tu cuenta" title="Únete a la comunidad">
				Para mirar no necesitas cuenta. Créala para publicar eventos,
				inscribirte o responder en la comunidad.
			</PageTitle>
			<section className="q-card mx-auto w-full max-w-md gap-5 p-5">
				<div role="tablist" aria-label="Cuenta" className="q-seg flex w-full">
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
	const store = useStore();
	const [displayName, setDisplayName] = useState(profile.displayName);
	const [neighborhood, setNeighborhood] = useState(profile.neighborhood ?? "");
	const [isVisitor, setIsVisitor] = useState(profile.isVisitor);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		if (displayName.trim().length < 2) {
			setError("Escribe cómo quieres que te vean (mínimo 2 caracteres).");
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
			setError(errorText(err, "No pudimos guardar los cambios."));
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
				Editar perfil
			</h2>
			<Field id="edit-name" label="Nombre visible">
				<input
					id="edit-name"
					required
					maxLength={60}
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
					className={inputClass}
				/>
			</Field>
			<Field id="edit-neighborhood" label="Barrio (opcional)">
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
					{busy ? "Guardando…" : "Guardar cambios"}
				</button>
				<button
					type="button"
					onClick={onDone}
					className="q-btn q-btn--ghost"
					disabled={busy}
				>
					Cancelar
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
		? "De visita en Barranquilla"
		: "Vive en Barranquilla";

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
					<p className="q-eyebrow">Tu perfil</p>
					<h1 className="q-h1 mt-1 break-words">
						¡Hola, {profile.displayName}!
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
						Editar perfil
					</button>
				)}
				<AskQuillartButton prompt="¿Qué tengo esta semana?" />
				{moderatorState.status === "ready" && moderatorState.data && (
					<a
						href="/moderacion"
						className="q-btn q-btn--secondary q-btn--sm min-h-11!"
					>
						<ShieldCheck size={16} aria-hidden="true" />
						Moderación
					</a>
				)}
			</div>

			{saved && (
				<p
					role="status"
					className="rounded-[var(--radius-md)] bg-[var(--green-soft)] px-4 py-3 text-sm text-[var(--green-text)]"
				>
					Listo, guardamos tus cambios.
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

			<Section id="my-registrations" title="Mis inscripciones">
				<Loaded state={eventsState} loadingLabel="Cargando tus inscripciones…">
					{({ registered, placeNames }) =>
						registered.length === 0 ? (
							<EmptyState
								title="Aún no te has inscrito a nada"
								action={
									<a href="/agenda" className="q-btn q-btn--primary">
										Ver la agenda
									</a>
								}
							>
								Mira la agenda y apúntate a lo que te guste.
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

			<Section id="my-events" title="Eventos que organizo">
				<Loaded state={eventsState} loadingLabel="Cargando tus eventos…">
					{({ organized, placeNames }) =>
						organized.length === 0 ? (
							<EmptyState
								title="Todavía no organizas eventos"
								action={
									<a href="/agenda/nuevo" className="q-btn q-btn--primary">
										Organizar un evento
									</a>
								}
							>
								Una caminata, un taller, una limpieza: arma tu plan y la gente
								se suma.
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

			<Section id="my-threads" title="Mis conversaciones">
				<Loaded
					state={threadsState}
					loadingLabel="Cargando tus conversaciones…"
				>
					{(threads) =>
						threads.length === 0 ? (
							<EmptyState
								title="No has abierto conversaciones"
								action={
									<a href="/foro" className="q-btn q-btn--primary">
										Ir a la comunidad
									</a>
								}
							>
								Pregunta, recomienda o cuenta algo de tu barrio.
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

			<div>
				<button
					type="button"
					onClick={() => void handleSignOut()}
					disabled={signingOut}
					aria-busy={signingOut}
					className="q-btn q-btn--ghost"
				>
					<LogOut size={18} aria-hidden="true" />
					{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
				</button>
			</div>
		</>
	);
}

export function ProfilePage({ aiHref }: { aiHref?: string }) {
	const { profile, loading } = useSession();
	return (
		<CommunityShell current="profile" aiHref={aiHref}>
			{loading ? (
				<Loading label="Revisando tu sesión…" />
			) : profile ? (
				<SignedInView key={profile.id} profile={profile} />
			) : (
				<AuthPanel />
			)}
		</CommunityShell>
	);
}
