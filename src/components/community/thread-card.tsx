// Link card for one forum conversation, used in lists across the community screens.

import { MessageCircle } from "lucide-react";
import {
	FORUM_CATEGORY_LABELS,
	formatRelative,
	initials,
} from "../../lib/community/community-labels";
import type { ForumThread } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import { HeldBadge } from "./community-ui";
import { CitizenReportBadge } from "./trust-badges";

export function ThreadCard({ thread }: { thread: ForumThread }) {
	const t = useT();
	const replies = t.forum.card.replies(thread.replyCount);
	return (
		<a
			href={`/foro/${thread.id}`}
			className="q-card block min-h-11 px-5 py-4 text-inherit no-underline transition-shadow lg:hover:shadow-[var(--shadow-card)]"
		>
			<div className="flex flex-wrap items-center gap-2">
				<span className="q-badge q-badge--neutral">
					{FORUM_CATEGORY_LABELS[thread.category]}
				</span>
				{thread.moderationStatus === "held" && <HeldBadge />}
				<CitizenReportBadge thread={thread} />
			</div>
			<h3 className="q-h3 mt-2 break-words">{thread.title}</h3>
			<p className="q-p q-muted mt-1 line-clamp-2 break-words">{thread.body}</p>
			<div className="q-sm q-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
				<span className="flex min-w-0 items-center gap-2">
					<span className="q-avatar text-xs font-semibold" aria-hidden="true">
						{initials(thread.authorName) || "?"}
					</span>
					<span className="truncate text-[var(--ink)]">
						{thread.authorName}
					</span>
				</span>
				<span className="flex items-center gap-1">
					<MessageCircle size={14} aria-hidden="true" />
					{replies}
				</span>
				<span>{formatRelative(thread.lastActivityAt)}</span>
			</div>
		</a>
	);
}
