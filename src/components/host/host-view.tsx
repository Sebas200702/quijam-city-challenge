import {
	Accessibility,
	Globe,
	LogIn,
	LogOut,
	MapPin,
	UserCheck,
} from "lucide-react";
import { useState } from "react";
import {
	DEMO_MEETING_POINT_LABEL,
	demoAssignmentEvent,
	hostActionEvent,
	nextHostAction,
} from "../../lib/city-events/host-flow";
import { useCityState } from "../../lib/city-events/use-city-state";
import { languageName } from "../../lib/home-content-language";
import { useT } from "../../lib/i18n/use-language";
import { Loading } from "../community/community-ui";
import { signInHref, useSession, useStore } from "../community/use-community";
import { QuillartLogo } from "../home/quillart-logo";
import { LanguageSheet } from "../visitor-home/language-sheet";
import { useOnlineStatus } from "../visitor-home/use-online-status";
import { useVisitorLanguage } from "../visitor-home/use-visitor-language";
import "../visitor-home/visitor-sheets.css";

/** Header of the host app: logo, language in one tap and sign out. */
function HostHeader({ onSignOut }: { onSignOut: (() => void) | null }) {
	const t = useT().host;
	const { language, detected, copy, choose } = useVisitorLanguage();
	const online = useOnlineStatus();
	const [picking, setPicking] = useState(false);
	return (
		<header className="flex items-center gap-3 px-4 pt-4">
			<a
				href="/"
				className="flex min-w-0 flex-1 text-inherit no-underline"
				aria-label={t.homeLabel}
			>
				<QuillartLogo />
			</a>
			<button
				type="button"
				className="visitor-chip-btn"
				aria-label={copy.changeLanguage(languageName(language))}
				aria-haspopup="dialog"
				onClick={() => setPicking(true)}
			>
				<Globe size={18} strokeWidth={1.75} aria-hidden="true" />
				<span aria-hidden="true">{language.toUpperCase()}</span>
			</button>
			{onSignOut && (
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--sm min-h-11"
					onClick={onSignOut}
				>
					<LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
					{t.signOut}
				</button>
			)}
			{picking && (
				<LanguageSheet
					copy={copy}
					current={language}
					detected={detected}
					online={online}
					onChoose={(next) => {
						choose(next);
						setPicking(false);
					}}
					onClose={() => setPicking(false)}
				/>
			)}
		</header>
	);
}

/**
 * /anfitrion: the host duo's screen. One primary action per step (epic #57, rule 2).
 * Gate: a signed-in account. The `host` role does not exist yet
 * (docs/24-datos-faltantes-ui.md, Anfitrión); when `current_user_role()`
 * accepts it, check it here the way /ciudad checks `city`.
 */
export function HostView() {
	const t = useT().host;
	const store = useStore();
	const session = useSession();
	const signOut = () =>
		void store.signOut().then(() => window.location.assign("/"));
	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
			<HostHeader onSignOut={session.profile ? signOut : null} />
			<main className="flex flex-1 flex-col gap-4 px-4 py-6">
				<div>
					<p className="q-eyebrow">{t.eyebrow}</p>
					<h1 className="q-h1">{t.title}</h1>
				</div>
				{session.loading ? (
					<Loading />
				) : session.profile ? (
					<HostShift />
				) : (
					<section className="q-state">
						<p className="q-state__title">{t.signInTitle}</p>
						<p className="q-state__text">{t.signInText}</p>
						<a
							href={signInHref()}
							className="q-btn q-btn--primary q-btn--block q-state__action"
						>
							<LogIn size={20} strokeWidth={1.75} aria-hidden="true" />
							{t.signIn}
						</a>
					</section>
				)}
			</main>
		</div>
	);
}

function HostShift() {
	const t = useT().host;
	const { state, status, publish } = useCityState();
	const [available, setAvailable] = useState(false);
	const [sending, setSending] = useState(false);
	const assignment = state.hostAssignment;
	const action = nextHostAction(assignment);
	const showDemo =
		typeof window !== "undefined" &&
		new URLSearchParams(window.location.search).has("demo");

	const run = async (event: Parameters<typeof publish>[0]) => {
		setSending(true);
		try {
			await publish(event);
		} finally {
			setSending(false);
		}
	};

	return (
		<>
			{status === "error" && (
				<p className="q-alert q-alert--alert" role="alert">
					{t.offline}
				</p>
			)}

			{!assignment && !available && (
				<section className="q-state">
					<p className="q-state__title">{t.idleTitle}</p>
					<p className="q-state__text">{t.idleText}</p>
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--lg q-btn--block"
						onClick={() => setAvailable(true)}
					>
						<UserCheck size={20} strokeWidth={1.75} aria-hidden="true" />
						{t.available}
					</button>
				</section>
			)}

			{!assignment && available && (
				<section className="q-state" role="status">
					<p className="q-state__title">{t.waitingTitle}</p>
					<p className="q-state__text">{t.waitingText}</p>
					<button
						type="button"
						className="q-btn q-btn--secondary q-btn--block"
						onClick={() => setAvailable(false)}
					>
						{t.unavailable}
					</button>
				</section>
			)}

			{assignment && (
				<section
					className="q-alert q-alert--safe"
					aria-live="assertive"
					aria-label={t.assignment}
				>
					<div className="q-alert__body">
						<p className="q-alert__title">{t.status[assignment.status]}</p>
						<p className="q-alert__text flex items-center gap-2">
							<Accessibility size={18} strokeWidth={1.75} aria-hidden="true" />
							{t.reducedMobility}
						</p>
						<p className="q-alert__text flex items-center gap-2" lang="es">
							<MapPin size={18} strokeWidth={1.75} aria-hidden="true" />
							{DEMO_MEETING_POINT_LABEL}
						</p>
						{assignment.status === "en_camino" && assignment.etaMin && (
							<p className="q-alert__text">{t.eta(assignment.etaMin)}</p>
						)}
					</div>
				</section>
			)}

			{assignment && action && (
				<button
					type="button"
					className="q-btn q-btn--primary q-btn--lg q-btn--block"
					disabled={sending}
					onClick={() => run(hostActionEvent(action, assignment.id))}
				>
					{t.actions[action]}
				</button>
			)}

			{showDemo && !assignment && (
				<button
					type="button"
					className="q-btn q-btn--secondary q-btn--sm"
					onClick={() => run(demoAssignmentEvent(`demo-${Date.now()}`))}
				>
					{t.demo}
				</button>
			)}
		</>
	);
}
