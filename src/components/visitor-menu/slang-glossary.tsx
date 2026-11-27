import { MessageCircle, Quote, Search, X } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import { filterSlang } from "../../lib/visitor-menu/slang-search";
import { loadSlangEntries } from "../../lib/visitor-menu/slang-source";
import type { SlangEntry } from "../../lib/visitor-menu/visitor-menu-types";
import { AskQuillartButton } from "../assistant/ask-quillart-button";
import {
	EmptySearchIllustration,
	SlangBubblesIllustration,
} from "./illustrations";
import { MenuShell } from "./menu-shell";
import { MenuEmpty, MenuError, MenuLoading, OfflineNote } from "./menu-state";
import { useMenuData, useOnline } from "./use-menu-data";
import "./visitor-menu.css";

function SlangCard({ entry }: { entry: SlangEntry }) {
	return (
		<li className="vm-slang">
			<h2 className="vm-slang__term" lang="es">
				<MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />
				{entry.term}
			</h2>
			<p className="q-p">{entry.meaningEs}</p>
			<p className="q-p q-sm vm-slang__en">
				<span className="vm-slang__lang" aria-hidden="true">
					EN
				</span>
				<span lang="en">{entry.meaningEn}</span>
			</p>
			<p className="vm-slang__example">
				<span className="q-muted">Ejemplo: </span>
				<i lang="es">{entry.example}</i>
			</p>
		</li>
	);
}

/** /jerga: searchable costeño slang glossary. Consultation only, no primary action. */
export function SlangGlossary() {
	const online = useOnline();
	const { state, retry } = useMenuData(loadSlangEntries);
	const [query, setQuery] = useState("");
	const inputId = useId();

	const results = useMemo(
		() => (state.status === "ready" ? filterSlang(state.data, query) : []),
		[state, query],
	);

	let body: ReactNode;
	if (state.status === "loading") {
		body = (
			<MenuLoading title="Cargando la jerga" text="Expresiones de la costa." />
		);
	} else if (state.status === "error") {
		body = (
			<MenuError
				title="No pudimos cargar la jerga"
				text="Inténtalo otra vez. Quillart también te explica cualquier palabra."
				onRetry={retry}
			/>
		);
	} else if (results.length === 0) {
		const trimmed = query.trim();
		body = (
			<MenuEmpty
				illustration={<EmptySearchIllustration />}
				title={
					trimmed ? `No encontramos «${trimmed}»` : "Aún no hay expresiones"
				}
				text="Revisa cómo la escribiste o pregúntale a Quillart."
				action={
					<AskQuillartButton
						prompt={`¿Qué significa «${trimmed || "una palabra"}» en Barranquilla?`}
						label="Pregúntale a Quillart"
					/>
				}
			/>
		);
	} else {
		body = (
			<ul className="vm-list" aria-label="Expresiones">
				{results.map((entry) => (
					<SlangCard key={entry.id} entry={entry} />
				))}
			</ul>
		);
	}

	return (
		<MenuShell online={online}>
			<header className="vm-titlerow">
				<div>
					<p className="l-eyebrow">
						<span className="q-star" aria-hidden="true" />
						Jerga
					</p>
					<h1 className="l-h2">Jerga costeña</h1>
					<p className="q-p q-muted">
						Lo que vas a oír en la calle, explicado en español e inglés.
					</p>
				</div>
				<span className="vm-hero" aria-hidden="true">
					<SlangBubblesIllustration />
				</span>
				<span
					className="l-geo l-geo--ring l-geo--gold -top-3 -right-3"
					aria-hidden="true"
				/>
				<span
					className="l-geo l-geo--half l-geo--green right-8 -bottom-1"
					aria-hidden="true"
				/>
				<span
					className="l-geo l-geo--plus top-3 right-[42%] max-sm:hidden"
					aria-hidden="true"
				/>
			</header>
			<search>
				<form className="q-search" onSubmit={(event) => event.preventDefault()}>
					<Search
						size={20}
						strokeWidth={1.75}
						aria-hidden="true"
						className="q-muted"
					/>
					<label className="q-sr" htmlFor={inputId}>
						Buscar una expresión
					</label>
					<input
						id={inputId}
						type="search"
						placeholder="Busca una expresión…"
						autoComplete="off"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						disabled={state.status !== "ready"}
					/>
					{query && (
						<button
							type="button"
							className="q-btn q-btn--ghost q-btn--icon vm-search-clear"
							aria-label="Borrar búsqueda"
							onClick={() => setQuery("")}
						>
							<X size={18} strokeWidth={1.75} aria-hidden="true" />
						</button>
					)}
				</form>
			</search>
			{state.status === "ready" && (
				<p className="q-sm q-muted vm-note" aria-live="polite">
					<Quote size={14} strokeWidth={1.75} aria-hidden="true" />
					{results.length === 1
						? "1 expresión"
						: `${results.length} expresiones`}
				</p>
			)}
			{!online && (
				<OfflineNote>Sin conexión: la jerga funciona igual.</OfflineNote>
			)}
			{body}
		</MenuShell>
	);
}
