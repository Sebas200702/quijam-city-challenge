import { useCallback, useEffect, useState } from "react";

export type MenuDataState<T> =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; data: T };

/**
 * Load page data on the client with loading / error / retry.
 * The loader is one of the `load*` functions in src/lib/visitor-menu.
 */
export function useMenuData<T>(loader: () => Promise<T>) {
	const [state, setState] = useState<MenuDataState<T>>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		// `attempt` re-runs the effect on retry.
		void attempt;
		let cancelled = false;
		setState({ status: "loading" });
		loader().then(
			(data) => {
				if (!cancelled) setState({ status: "ready", data });
			},
			() => {
				if (!cancelled) setState({ status: "error" });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [loader, attempt]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);
	return { state, retry };
}

/** Browser connectivity; true on the server so SSR never renders the offline note. */
export function useOnline(): boolean {
	const [online, setOnline] = useState(true);
	useEffect(() => {
		const update = () => setOnline(navigator.onLine);
		update();
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		return () => {
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
		};
	}, []);
	return online;
}
