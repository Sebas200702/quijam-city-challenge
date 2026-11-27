import { useEffect, useMemo } from "react";
import {
	arroyoNotice,
	floodTouchesVisitor,
} from "../../lib/notices/notice-builders";
import type { Notice, VisitorContext } from "../../lib/notices/notice-types";
import { ArroyoBand } from "../notices/arroyo-band";
import { NoticeSlot } from "../notices/notice-slot";
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
		if (!alert) reset();
		else if (notice) push(notice);
	}, [alert, notice, push, reset]);

	const answered =
		notice !== null && queue.state.seenModals.includes(notice.key);
	const onAction = (_notice: Notice, actionId: string) => {
		if (actionId === "change-route") onChangeRoute?.();
	};

	return (
		<>
			<NoticeSlot queue={queue} onAction={onAction} />
			{alert && answered && <ArroyoBand alert={alert} />}
		</>
	);
}
