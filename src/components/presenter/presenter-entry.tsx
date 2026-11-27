import { KeyRound, LogIn } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { fetchPresenterAccess } from "./presenter-access";

const ICON = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;

/** /presentador/entrar: demo key form, or a city account. Accepts ?key= from a private QR. */
export default function PresenterEntry() {
	const [key, setKey] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [demoKeyEnabled, setDemoKeyEnabled] = useState(true);

	const enter = useCallback(async (value: string) => {
		setBusy(true);
		setError(null);
		try {
			const response = await fetch("/api/presentador/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ key: value }),
			});
			const body = (await response.json()) as { error?: string };
			if (!response.ok) throw new Error(body.error ?? "No se pudo entrar.");
			window.location.assign("/presentador");
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "No se pudo entrar.");
			setBusy(false);
		}
	}, []);

	useEffect(() => {
		void fetchPresenterAccess()
			.then(({ access, demoKeyEnabled: enabled }) => {
				if (access) window.location.replace("/presentador");
				setDemoKeyEnabled(enabled);
			})
			.catch(() => {});
		const fromQr = new URLSearchParams(window.location.search).get("key");
		if (fromQr) {
			// Drop the key from the address bar and history before using it.
			window.history.replaceState(null, "", "/presentador/entrar");
			void enter(fromQr);
		}
	}, [enter]);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (key.trim()) void enter(key.trim());
	};

	return (
		<main className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center gap-6 px-4 py-10">
			<div>
				<p className="q-eyebrow">Demo Day</p>
				<h1 className="q-h1 mt-1">Panel de presentador</h1>
				<p className="q-sm q-subtle mt-2">
					Desde aquí se disparan los eventos de la ciudad que ven los celulares
					y el tablero.
				</p>
			</div>

			{demoKeyEnabled && (
				<form className="q-card" onSubmit={submit}>
					<div className="q-card__body space-y-3">
						<label
							htmlFor="presenter-key"
							className="block text-[13px] font-semibold"
						>
							Llave de demo
						</label>
						<input
							id="presenter-key"
							type="password"
							autoComplete="off"
							value={key}
							onChange={(event) => setKey(event.target.value)}
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "presenter-key-error" : undefined}
							className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)]"
						/>
						{error && (
							<p
								id="presenter-key-error"
								role="alert"
								className="q-sm text-[var(--red-text)]"
							>
								{error}
							</p>
						)}
						<button
							type="submit"
							className="q-btn q-btn--primary q-btn--block"
							disabled={busy}
						>
							<KeyRound {...ICON} />
							{busy ? "Entrando…" : "Entrar"}
						</button>
					</div>
				</form>
			)}

			<a href="/ciudad" className="q-btn q-btn--secondary q-btn--block">
				<LogIn {...ICON} />
				Entrar con una cuenta de la ciudad
			</a>
			<p className="q-sm q-subtle">
				Después de entrar en el tablero,{" "}
				<a
					href="/presentador"
					className="inline-flex min-h-11 items-center font-semibold text-[var(--ink)] underline underline-offset-2"
				>
					vuelve a este panel
				</a>
				.
			</p>
		</main>
	);
}
