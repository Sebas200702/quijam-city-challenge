import type { Notice } from "../../lib/notices/notice-types";
import { ArroyoModal } from "./arroyo-modal";
import { NoticeCard } from "./notice-card";
import type { NoticeQueue } from "./use-notice-queue";
import "./notices.css";

interface NoticeSlotProps {
	/** From `useNoticeQueue()`. */
	queue: Pick<NoticeQueue, "visible" | "dismiss">;
	/**
	 * Runs a notice action ("change-route", "see-barrio-abajo"…). The notice is
	 * closed right after, so the handler only navigates or focuses.
	 */
	onAction?: (notice: Notice, actionId: string) => void;
}

/**
 * The one notice slot above "Tu siguiente paso" (docs/26, 3.3). Discreet
 * notices live in a persistent role="status" region so screen readers hear
 * them; the arroyo modal takes the same slot as an alertdialog.
 */
export function NoticeSlot({ queue, onAction }: NoticeSlotProps) {
	const { visible, dismiss } = queue;
	const act = (notice: Notice, actionId: string) => {
		onAction?.(notice, actionId);
		dismiss(notice.key);
	};
	const close = (notice: Notice) => dismiss(notice.key);
	const discreet = visible?.form === "discreet" ? visible : null;
	return (
		<>
			<div className="q-notice-slot" role="status" aria-live="polite">
				{discreet && (
					<NoticeCard
						key={discreet.key}
						notice={discreet}
						onAction={act}
						onDismiss={close}
					/>
				)}
			</div>
			{visible?.form === "modal" && (
				<ArroyoModal
					key={visible.key}
					notice={visible}
					onAction={act}
					onDismiss={close}
				/>
			)}
		</>
	);
}
