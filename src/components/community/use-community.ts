// React hooks over the community store: session, async loads and live updates.

import { useCallback, useEffect, useState } from "react";
import { getCommunityStore } from "../../lib/community/community-store";
import type {
	CommunityStore,
	CommunityTopic,
	Profile,
} from "../../lib/community/community-types";
import { messages } from "../../lib/i18n/messages";
import { getLanguage } from "../../lib/i18n/use-language";

export function useStore(): CommunityStore {
	return getCommunityStore();
}

export interface SessionState {
	profile: Profile | null;
	/** True until the first session check finishes. */
	loading: boolean;
}

export function useSession(): SessionState {
	const store = useStore();
	const [state, setState] = useState<SessionState>({
		profile: null,
		loading: true,
	});
	useEffect(() => {
		let active = true;
		void store.getSession().then((profile) => {
			if (active) setState({ profile, loading: false });
		});
		const unsubscribe = store.onSessionChange((profile) => {
			if (active) setState({ profile, loading: false });
		});
		return () => {
			active = false;
			unsubscribe();
		};
	}, [store]);
	return state;
}

export type LoadState<T> =
	| { status: "loading" }
	| { status: "error"; message: string; retry?: () => void }
	| { status: "ready"; data: T };

/** Messages from the network or the database that mean nothing to people. */
const TECHNICAL_ERROR =
	/fetch|network|load failed|jwt|pgrst|violates|duplicate key|syntax error|unexpected token|timeout|\b[45]\d\d\b/i;

/**
 * A thrown error as a sentence for people: without a connection it says so,
 * and technical messages (network, database) become `fallback`. Messages the
 * app writes itself (validation, moderation, sign-in) pass through.
 */
export function errorText(error: unknown, fallback: string): string {
	if (typeof navigator !== "undefined" && navigator.onLine === false)
		return messages[getLanguage()].shared.ui.offlineText;
	if (!(error instanceof Error) || !error.message) return fallback;
	if (error instanceof TypeError || TECHNICAL_ERROR.test(error.message))
		return fallback;
	return error.message;
}

/**
 * Runs `load` on mount and whenever `deps` change; reloads quietly when one of
 * the `topics` changes elsewhere (Realtime in the cloud, other tabs on device).
 */
export function useLoad<T>(
	load: (store: CommunityStore) => Promise<T>,
	deps: unknown[],
	topics: CommunityTopic[] = [],
): { state: LoadState<T>; reload: () => void } {
	const store = useStore();
	const [state, setState] = useState<LoadState<T>>({ status: "loading" });
	const [version, setVersion] = useState(0);
	const reload = useCallback(() => setVersion((value) => value + 1), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: callers pass their own deps.
	useEffect(() => {
		let active = true;
		load(store)
			.then((data) => active && setState({ status: "ready", data }))
			.catch(
				(error: unknown) =>
					active &&
					setState({
						status: "error",
						message:
							error instanceof Error
								? error.message
								: messages[getLanguage()].shared.ui.loadError,
					}),
			);
		return () => {
			active = false;
		};
	}, [store, version, reload, ...deps]);

	const topicKey = topics.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: topicKey stands for topics.
	useEffect(() => {
		const unsubscribers = topics.map((topic) => store.subscribe(topic, reload));
		return () => {
			for (const unsubscribe of unsubscribers) unsubscribe();
		};
	}, [store, reload, topicKey]);

	return { state, reload };
}

/** Link to the profile page that comes back here after signing in. */
export function signInHref(): string {
	if (typeof window === "undefined") return "/perfil";
	const back = `${window.location.pathname}${window.location.search}`;
	return `/perfil?volver=${encodeURIComponent(back)}`;
}
