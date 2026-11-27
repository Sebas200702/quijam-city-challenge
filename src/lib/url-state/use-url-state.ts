// React binding for params.ts: state that lives in the query string, so a
// filter can be shared, survives a reload, and the assistant can set it by URL.

import { useCallback, useEffect, useRef, useState } from "react";
import {
	cleanValue,
	parseParams,
	serializeParams,
	type UrlSchema,
	type UrlValues,
} from "./params";

export interface UrlStateOptions {
	/**
	 * "replace" (default) rewrites the current history entry, so typing in a
	 * search box does not fill the back button; "push" adds an entry per change.
	 */
	mode?: "replace" | "push";
}

/** Values of the schema as they are in the current URL (all "" on the server). */
export function readUrlState<S extends UrlSchema>(schema: S): UrlValues<S> {
	return parseParams(
		schema,
		typeof window === "undefined" ? "" : window.location.search,
	);
}

/**
 * Moves to `href` (same page, other query) without reloading: the screens
 * that use `useUrlState` read the new values, and back/forward still works.
 */
export function navigateInPlace(href: string): void {
	if (typeof window === "undefined") return;
	window.history.pushState(window.history.state, "", href);
	window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * State mirrored in the query string. `schema` must be a module constant.
 * The setter takes a patch; unknown parameters in the URL are left alone.
 */
export function useUrlState<S extends UrlSchema>(
	schema: S,
	options: UrlStateOptions = {},
): [UrlValues<S>, (patch: Partial<UrlValues<S>>) => void] {
	const mode = options.mode ?? "replace";
	const [values, setValues] = useState<UrlValues<S>>(() =>
		readUrlState(schema),
	);
	const current = useRef(values);

	// Back/forward and `navigateInPlace` change the URL under us: read it again.
	useEffect(() => {
		const onPop = () => {
			const next = readUrlState(schema);
			current.current = next;
			setValues(next);
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, [schema]);

	const update = useCallback(
		(patch: Partial<UrlValues<S>>) => {
			const next = { ...current.current };
			for (const key of Object.keys(patch) as (keyof S & string)[]) {
				const raw = String(patch[key] ?? "");
				(next as Record<string, string>)[key] = cleanValue(schema[key], raw);
			}
			current.current = next;
			setValues(next);
			const { pathname, search, hash } = window.location;
			const href = `${pathname}${serializeParams(schema, next, search)}${hash}`;
			if (href === `${pathname}${search}${hash}`) return;
			if (mode === "push")
				window.history.pushState(window.history.state, "", href);
			else window.history.replaceState(window.history.state, "", href);
		},
		[schema, mode],
	);

	return [values, update];
}
