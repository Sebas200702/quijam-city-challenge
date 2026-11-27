import { useEffect, useMemo } from "react";
import type { HostAssignment } from "../../lib/city-events/city-events-types";
import { DEMO_MEETING_POINT_LABEL } from "../../lib/city-events/host-flow";
import { hostNotice } from "../../lib/notices/notice-builders";
import { NoticeSlot } from "../notices/notice-slot";
import { useNoticeQueue } from "../notices/use-notice-queue";

/**
 * Discreet notice for the visitor: "Tu anfitrión va en camino" and then
 * "Tu anfitrión llegó". Shows only once the host accepted (rule 3).
 */
export function HostArrivalNotice({
	assignment,
}: {
	assignment: HostAssignment | null;
}) {
	const queue = useNoticeQueue("host-arrival");
	const { push, reset } = queue;
	const notice = useMemo(() => {
		if (
			!assignment ||
			(assignment.status !== "en_camino" && assignment.status !== "llego")
		) {
			return null;
		}
		return hostNotice({
			assignmentId: assignment.id,
			status: assignment.status,
			minutesLeft: assignment.etaMin,
			meetingPoint: DEMO_MEETING_POINT_LABEL,
		});
	}, [assignment]);

	useEffect(() => {
		if (notice) push(notice);
		else reset();
	}, [notice, push, reset]);

	return <NoticeSlot queue={queue} />;
}
