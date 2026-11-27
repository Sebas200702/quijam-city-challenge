// Ley 1581 de 2012: the person can download everything we keep about them and
// delete their account. Deleting removes what they wrote and their
// registrations; their upcoming events are cancelled.

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorNote } from "./community-ui";
import { useStore } from "./use-community";

const CONFIRM_WORD = "ELIMINAR";

export function MyDataPanel() {
	const store = useStore();
	const [busy, setBusy] = useState<"export" | "delete" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [typed, setTyped] = useState("");

	async function download() {
		setBusy("export");
		setError(null);
		try {
			const data = await store.exportMyData();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `quillart-mis-datos-${data.exportedAt.slice(0, 10)}.json`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No pudimos preparar tus datos.",
			);
		} finally {
			setBusy(null);
		}
	}

	async function remove() {
		setBusy("delete");
		setError(null);
		try {
			await store.deleteAccount();
			window.location.assign("/");
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No pudimos eliminar tu cuenta.",
			);
			setBusy(null);
		}
	}

	return (
		<section aria-labelledby="my-data-title" className="q-card gap-4 px-5 py-5">
			<div>
				<h2 id="my-data-title" className="q-h3">
					Tus datos
				</h2>
				<p className="q-p q-muted mt-1">
					Según la Ley 1581 de 2012 puedes conocer y borrar lo que guardamos de
					ti.
				</p>
			</div>
			{error && <ErrorNote message={error} />}
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					className="q-btn q-btn--secondary"
					onClick={() => void download()}
					disabled={busy !== null}
					aria-busy={busy === "export"}
				>
					<Download size={18} aria-hidden="true" />
					{busy === "export" ? "Preparando…" : "Descargar mis datos"}
				</button>
				{!confirming && (
					<button
						type="button"
						className="q-btn q-btn--ghost text-[var(--red-text)]!"
						onClick={() => setConfirming(true)}
						disabled={busy !== null}
					>
						<Trash2 size={18} aria-hidden="true" />
						Eliminar mi cuenta
					</button>
				)}
			</div>
			{confirming && (
				<form
					className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--red-soft)] p-4"
					onSubmit={(submitEvent) => {
						submitEvent.preventDefault();
						if (typed.trim().toUpperCase() === CONFIRM_WORD) void remove();
					}}
				>
					<p className="q-p text-[var(--red-text)]">
						Se borrarán tus conversaciones, respuestas, reportes e
						inscripciones, y se cancelarán los eventos que organizas. No se
						puede deshacer.
					</p>
					<label htmlFor="confirm-delete" className="q-eyebrow">
						Escribe {CONFIRM_WORD} para confirmar
					</label>
					<input
						id="confirm-delete"
						value={typed}
						onChange={(changeEvent) => setTyped(changeEvent.target.value)}
						autoComplete="off"
						className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)]"
					/>
					<div className="flex flex-wrap gap-2">
						<button
							type="submit"
							className="q-btn q-btn--alert"
							disabled={
								typed.trim().toUpperCase() !== CONFIRM_WORD || busy !== null
							}
							aria-busy={busy === "delete"}
						>
							{busy === "delete" ? "Eliminando…" : "Eliminar definitivamente"}
						</button>
						<button
							type="button"
							className="q-btn q-btn--secondary"
							onClick={() => {
								setConfirming(false);
								setTyped("");
							}}
						>
							Cancelar
						</button>
					</div>
				</form>
			)}
		</section>
	);
}
