// One short line for screen readers per turn (U20): "Pensando", then
// "Quillart AI respondió: …" or "preparó una acción". The conversation log
// itself is not a live region, so a new card never re-reads the whole log.

import { useEffect, useRef, useState } from "react";
import type { AssistantMessage } from "../../lib/assistant/assistant-types";
import { useT } from "../../lib/i18n/use-language";

interface AnnouncementInput {
	messages: AssistantMessage[];
	loading: boolean;
	pendingCount: number;
	stopped: boolean;
}

export function useAnswerAnnouncement({
	messages,
	loading,
	pendingCount,
	stopped,
}: AnnouncementInput): string {
	const t = useT();
	const [text, setText] = useState("");
	/** Messages already announced (a restored conversation is not read again). */
	const seen = useRef<number | null>(null);
	const seenPending = useRef(pendingCount);

	useEffect(() => {
		if (seen.current === null) {
			seen.current = messages.length;
			return;
		}
		if (loading) {
			setText(t.chat.thinking);
			return;
		}
		if (stopped) {
			setText(t.dock.stopped);
			seen.current = messages.length;
			return;
		}
		const fresh = messages.slice(seen.current);
		seen.current = messages.length;
		if (pendingCount > seenPending.current) {
			setText(t.dock.actionReady);
		} else {
			const reply = fresh
				.filter((message) => message.role === "assistant")
				.map((message) => message.text.trim())
				.filter(Boolean)
				.join(" ");
			if (reply) setText(t.dock.answered(reply));
		}
		seenPending.current = pendingCount;
	}, [messages, loading, pendingCount, stopped, t]);

	return text;
}
