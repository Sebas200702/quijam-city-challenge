// In-app notification inbox and preference controls in /perfil (#91, #92).
// Lets the person review reminders, cancellations, event changes and moderation
// outcomes, and disable in-app or PWA notifications anytime (epic #57, rule 4).

import {
	AlertTriangle,
	Bell,
	BellOff,
	CalendarClock,
	Check,
	CheckCheck,
	CheckCircle2,
	ExternalLink,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	buildUpcomingEventReminders,
	dismissReminderIds,
	isReminderId,
	mergeUserNotifications,
	NOTIFICATION_KIND_LABELS,
	readDismissedReminders,
	readNotificationPreferences,
	subscribeNotificationPreferences,
	writeNotificationPreferences,
} from "../../lib/notifications/event-notifications";
import type {
	NotificationPreferences,
	UserNotification,
	UserNotificationKind,
} from "../../lib/notifications/event-notifications-types";
import {
	askNotificationPermission,
	notificationPermission,
} from "../../lib/notifications/notify";
import { ErrorNote, Loaded } from "./community-ui";
import { useLoad, useStore } from "./use-community";

function badgeStyle(kind: UserNotificationKind): {
	className: string;
	Icon: typeof Bell;
} {
	switch (kind) {
		case "event_reminder":
			return { className: "q-badge--high", Icon: CalendarClock };
		case "event_cancelled":
			return { className: "q-badge--alert", Icon: XCircle };
		case "event_updated":
			return { className: "q-badge--event", Icon: AlertTriangle };
		case "moderation_approved":
			return { className: "q-badge--optimal", Icon: CheckCircle2 };
		case "moderation_removed":
			return { className: "q-badge--alert", Icon: XCircle };
	}
}

export function NotificationsPanel() {
	const store = useStore();
	const [prefs, setPrefs] = useState<NotificationPreferences>(
		readNotificationPreferences,
	);
	const [permission, setPermission] = useState(notificationPermission);
	const [dismissed, setDismissed] = useState<Set<string>>(
		readDismissedReminders,
	);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => subscribeNotificationPreferences(setPrefs), []);

	const { state, reload } = useLoad(
		async (s) => {
			const [stored, regIds] = await Promise.all([
				s.listNotifications(),
				s.myRegistrations(),
			]);
			const registeredEvents =
				regIds.length > 0
					? await s.listEvents({ ids: regIds, includePast: false })
					: [];
			const reminders = buildUpcomingEventReminders(registeredEvents, regIds);
			return { stored, reminders };
		},
		[],
		["notifications", "events"],
	);

	const notices: UserNotification[] = useMemo(() => {
		if (state.status !== "ready") return [];
		return mergeUserNotifications(
			state.data.stored,
			state.data.reminders,
			dismissed,
		);
	}, [state, dismissed]);

	const unreadCount = notices.filter((item) => item.readAt === null).length;

	function updatePrefs(patch: Partial<NotificationPreferences>) {
		const next = { ...prefs, ...patch };
		setPrefs(next);
		writeNotificationPreferences(next);
	}

	async function handleToggleWebPush(enable: boolean) {
		if (!enable) {
			updatePrefs({ webPushEnabled: false });
			return;
		}
		if (permission === "default") {
			const nextPerm = await askNotificationPermission();
			setPermission(nextPerm);
			if (nextPerm !== "granted") {
				updatePrefs({ webPushEnabled: false });
				return;
			}
		}
		updatePrefs({ webPushEnabled: true });
	}

	async function markOneRead(notice: UserNotification) {
		setBusyId(notice.id);
		setError(null);
		try {
			if (isReminderId(notice.id)) {
				setDismissed(dismissReminderIds([notice.id]));
			} else {
				await store.markNotificationRead(notice.id);
				reload();
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "No pudimos actualizar el aviso.",
			);
		} finally {
			setBusyId(null);
		}
	}

	async function markAllRead() {
		setBusyId("__all");
		setError(null);
		try {
			const reminderIds = notices
				.filter((item) => isReminderId(item.id) && item.readAt === null)
				.map((item) => item.id);
			if (reminderIds.length > 0) {
				setDismissed(dismissReminderIds(reminderIds));
			}
			await store.markAllNotificationsRead();
			reload();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "No pudimos marcar los avisos como leídos.",
			);
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section
			id="mis-avisos"
			className="q-card space-y-4 p-5"
			aria-labelledby="notifications-panel-title"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p className="q-eyebrow flex items-center gap-1.5">
						<Bell size={14} strokeWidth={1.75} aria-hidden="true" />
						Recordatorios y avisos
					</p>
					<h2 id="notifications-panel-title" className="q-h2 mt-1">
						Mis notificaciones
					</h2>
				</div>
				{unreadCount > 0 && (
					<div className="flex flex-wrap items-center gap-2">
						<span className="q-badge q-badge--high">
							{unreadCount} sin leer
						</span>
						<button
							type="button"
							disabled={busyId === "__all"}
							onClick={() => void markAllRead()}
							className="q-btn q-btn--ghost q-btn--sm min-h-11"
						>
							<CheckCheck size={16} strokeWidth={1.75} aria-hidden="true" />
							Marcar todo leído
						</button>
					</div>
				)}
			</div>

			{/* Non-intrusive preference controls */}
			<div className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--bg)] p-4 sm:grid-cols-2">
				<div className="space-y-2">
					<p className="q-sm font-semibold text-[var(--ink)]">
						Avisos dentro de la app
					</p>
					<p className="q-sm q-muted">
						Tarjetas discretas para recordatorios, cambios o cancelaciones.
					</p>
					<div className="q-seg w-full">
						<button
							type="button"
							aria-pressed={prefs.inAppEnabled}
							onClick={() => updatePrefs({ inAppEnabled: true })}
							className={`q-seg__opt min-h-11 flex-1 ${
								prefs.inAppEnabled ? "is-on" : ""
							}`}
						>
							Activados
						</button>
						<button
							type="button"
							aria-pressed={!prefs.inAppEnabled}
							onClick={() => updatePrefs({ inAppEnabled: false })}
							className={`q-seg__opt min-h-11 flex-1 ${
								!prefs.inAppEnabled ? "is-on" : ""
							}`}
						>
							Desactivados
						</button>
					</div>
				</div>

				<div className="space-y-2">
					<p className="q-sm font-semibold text-[var(--ink)]">
						Notificaciones web (PWA)
					</p>
					<p className="q-sm q-muted">
						{permission === "unsupported"
							? "Este navegador no admite notificaciones del sistema."
							: permission === "denied"
								? "Bloqueadas en el navegador. Actívalas desde la configuración del sitio."
								: "Avisos silenciosos del sistema; solo las alertas de arroyo interrumpen."}
					</p>
					{permission !== "unsupported" && permission !== "denied" && (
						<div className="q-seg w-full">
							<button
								type="button"
								aria-pressed={prefs.webPushEnabled && permission === "granted"}
								onClick={() => void handleToggleWebPush(true)}
								className={`q-seg__opt min-h-11 flex-1 ${
									prefs.webPushEnabled && permission === "granted"
										? "is-on"
										: ""
								}`}
							>
								{permission === "granted" ? "Activadas" : "Activar"}
							</button>
							<button
								type="button"
								aria-pressed={!prefs.webPushEnabled || permission !== "granted"}
								onClick={() => void handleToggleWebPush(false)}
								className={`q-seg__opt min-h-11 flex-1 ${
									!prefs.webPushEnabled || permission !== "granted"
										? "is-on"
										: ""
								}`}
							>
								Desactivadas
							</button>
						</div>
					)}
				</div>
			</div>

			{!prefs.inAppEnabled && (
				<p
					role="status"
					className="q-sm q-muted flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3.5 py-2.5"
				>
					<BellOff size={16} strokeWidth={1.75} aria-hidden="true" />
					Los avisos dentro de la app están desactivados. Puedes reactivarlos
					aquí cuando quieras.
				</p>
			)}

			{error && <ErrorNote message={error} />}

			<Loaded state={state} loadingLabel="Cargando avisos…">
				{() =>
					notices.length === 0 ? (
						<p className="q-sm q-muted rounded-[var(--radius-md)] bg-[var(--bg)] px-4 py-5 text-center">
							No tienes avisos pendientes. Aquí verás recordatorios el día antes
							de tus eventos, cambios de fecha o lugar, cancelaciones y el
							estado de tus publicaciones en revisión.
						</p>
					) : (
						<ul className="space-y-2.5">
							{notices.map((notice) => {
								const { className, Icon } = badgeStyle(notice.kind);
								const unread = notice.readAt === null;
								return (
									<li
										key={notice.id}
										className={`rounded-[var(--radius-md)] border p-3.5 ${
											unread
												? "border-[var(--gold)] bg-[var(--surface-raised)]"
												: "border-[var(--line)] bg-[var(--bg)] opacity-80"
										}`}
									>
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="min-w-0 flex-1 space-y-1">
												<div className="flex flex-wrap items-center gap-2">
													<span className={`q-badge ${className}`}>
														<Icon
															size={12}
															strokeWidth={2}
															aria-hidden="true"
														/>
														{NOTIFICATION_KIND_LABELS[notice.kind]}
													</span>
													{unread && (
														<span className="q-sm font-semibold text-[var(--gold-text)]">
															Nuevo
														</span>
													)}
												</div>
												<p className="q-p font-semibold text-[var(--ink)]">
													{notice.title}
												</p>
												<p className="q-sm q-muted">{notice.body}</p>
											</div>
											<div className="flex flex-wrap items-center gap-1.5">
												<a
													href={notice.href}
													className="q-btn q-btn--secondary q-btn--sm min-h-11"
												>
													Ver
													<ExternalLink
														size={14}
														strokeWidth={1.75}
														aria-hidden="true"
													/>
												</a>
												{unread && (
													<button
														type="button"
														disabled={busyId === notice.id}
														onClick={() => void markOneRead(notice)}
														className="q-btn q-btn--ghost q-btn--sm min-h-11"
														aria-label={`Marcar como leído: ${notice.title}`}
													>
														<Check
															size={16}
															strokeWidth={1.75}
															aria-hidden="true"
														/>
														Listo
													</button>
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)
				}
			</Loaded>
		</section>
	);
}
