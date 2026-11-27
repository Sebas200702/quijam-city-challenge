import { useEffect, useMemo } from "react";
import { useT } from "../../lib/i18n/use-language";
import {
	arroyoNotice,
	floodTouchesVisitor,
} from "../../lib/notices/notice-builders";
import type { Notice, VisitorContext } from "../../lib/notices/notice-types";
import { floodNotification } from "../../lib/notifications/flood-notification";
import {
	forgetShownNotifications,
	showAppNotification,
} from "../../lib/notifications/notify";
import { ArroyoBand } from "../notices/arroyo-band";
import { NoticeSlot } from "../notices/notice-slot";
import { NotificationOptIn } from "../notices/notification-opt-in";
import { useNoticeQueue } from "../notices/use-notice-queue";
import type { useFloodCountdown } from "./use-flood-countdown";

type FloodAlert = ReturnType<typeof useFloodCountdown>["alert"];

interface FloodAlertBannerProps {
	alert: FloodAlert;
	/**
	 * The visitor's route and zone. When given, the modal only opens if the
	 * arroyo touches them (docs/20, 3.1); otherwise the zone is only painted
	 * red on the map. Without it, safety wins and the modal opens.
	 */
	visitor?: VisitorContext;
	/** "Cambiar ruta": the Decider already re-planned; show the new route. */
	onChangeRoute?: () => void;
}

/**
 * The only alert allowed to interrupt (epic #57, rule 4): one arroyo at a time,
 * the most urgent. Opens the arroyo modal once per zone; after "Cambiar ruta"
 * or "Entendido" it stays as a red band on the route card until `reiniciar`.
 */
export function FloodAlertBanner({
	alert,
	visitor,
	onChangeRoute,
}: FloodAlertBannerProps) {
	const queue = useNoticeQueue("flood-alert");
	const { push, reset } = queue;
	const relevant = alert ? floodTouchesVisitor(alert.zone, visitor) : false;
	const notice = useMemo(
		() => (alert && relevant ? arroyoNotice(alert, visitor) : null),
		[alert, relevant, visitor],
	);

	useEffect(() => {
		// `reiniciar` clears every countdown: the alert goes away and so does the queue.
		if (!alert) {
			reset();
			forgetShownNotifications();
		} else if (notice) push(notice);
	}, [alert, notice, push, reset]);

	const answered =
		notice !== null && queue.state.seenModals.includes(notice.key);

	// With the app in the background the modal is not seen: the same alert
	// goes out as a system notification (#47), once per stage. A countdown
	// already answered in the modal does not come back; "active now" does.
	const notifyCopy = useT().notifications;
	useEffect(() => {
		if (!alert || !notice || document.visibilityState !== "hidden") return;
		if (alert.status.kind === "countdown" && answered) return;
		void showAppNotification(
			floodNotification(alert.zone, alert.status, notifyCopy),
		);
	}, [alert, notice, answered, notifyCopy]);
	const onAction = (_notice: Notice, actionId: string) => {
		if (actionId === "change-route") onChangeRoute?.();
	};

	return (
		<>
			<NoticeSlot queue={queue} onAction={onAction} />
			{alert && answered && (
				<>
					<ArroyoBand alert={alert} />
					<NotificationOptIn />
				</>
			)}
		</>
	);
}
