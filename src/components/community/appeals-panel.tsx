// Content of the signed-in person that the city removed, with the option to ask
// for a second review once (issue #126). Hidden when there is nothing removed.

import { useState } from "react";
import type { RemovedContentItem } from "../../lib/community/community-types";
import { useT } from "../../lib/i18n/use-language";
import {
	APPEAL_MAX_LENGTH,
	canAppeal,
} from "../../lib/moderation/appeal-rules";
import { ErrorNote } from "./community-ui";
import { useLoad, useStore } from "./use-community";

export function AppealsPanel() {
	const t = useT();
	const a = t.profile.appeals;
	const store = useStore();
	const { state, reload } = useLoad(
		(current) => current.listMyRemoved(),
		[],
		["events", "forum"],
	);
	const [openKey, setOpenKey] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (state.status !== "ready" || state.data.length === 0) return null;

	async function send(item: RemovedContentItem) {
		setBusy(true);
		setError(null);
		try {
			await store.appeal(item.kind, item.id, message);
			setOpenKey(null);
			setMessage("");
			reload();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : a.failed);
		} finally {
			setBusy(false);
		}
	}

	return (
		<section aria-labelledby="appeals-title" className="q-card gap-4 px-5 py-5">
			<div>
				<h2 id="appeals-title" className="q-h3">
					{a.title}
				</h2>
				<p className="q-p q-muted mt-1">{a.intro}</p>
			</div>
			{error && <ErrorNote message={error} />}
			<ul className="flex flex-col gap-3">
				{state.data.map((item) => {
					const key = `${item.kind}:${item.id}`;
					const editing = openKey === key;
					return (
						<li key={key} className="flex flex-col gap-2">
							<span className="q-eyebrow">{a.kinds[item.kind]}</span>
							<p className="q-p break-words">{item.title}</p>
							{item.appealStatus && (
								<p className="q-sm q-muted" role="status">
									{a[item.appealStatus]}
								</p>
							)}
							{canAppeal("removed", item.appealStatus) && !editing && (
								<button
									type="button"
									className="q-btn q-btn--secondary self-start"
									onClick={() => {
										setOpenKey(key);
										setError(null);
									}}
								>
									{a.appeal}
								</button>
							)}
							{editing && (
								<form
									className="flex flex-col gap-2"
									onSubmit={(submitEvent) => {
										submitEvent.preventDefault();
										void send(item);
									}}
								>
									<label htmlFor={`appeal-${key}`} className="q-eyebrow">
										{a.reasonLabel}
									</label>
									<textarea
										id={`appeal-${key}`}
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										maxLength={APPEAL_MAX_LENGTH}
										rows={4}
										className="w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] p-3 text-[15px] text-[var(--ink)]"
									/>
									<div className="flex gap-2">
										<button
											type="submit"
											className="q-btn q-btn--primary"
											disabled={busy}
										>
											{busy ? a.sending : a.send}
										</button>
										<button
											type="button"
											className="q-btn q-btn--ghost"
											onClick={() => setOpenKey(null)}
										>
											{a.cancel}
										</button>
									</div>
								</form>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
