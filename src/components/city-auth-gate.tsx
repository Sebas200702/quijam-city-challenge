import { type SyntheticEvent, useState } from "react";
import type { CitySessionInfo } from "../lib/city-dashboard-types";

interface CityAuthGateProps {
	session: CitySessionInfo | null;
	onSignIn: (email: string, password: string) => Promise<void>;
	onSignOut: () => Promise<void>;
}

export function CityAuthGate({
	session,
	onSignIn,
	onSignOut,
}: CityAuthGateProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await onSignIn(email.trim(), password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
		} finally {
			setSubmitting(false);
		}
	}

	if (session && session.role !== "city") {
		return (
			<section className="q-card mx-auto mt-10 max-w-md">
				<div className="q-band q-band--gold" aria-hidden="true" />
				<div className="q-card__head">
					<div>
						<p className="q-eyebrow">
							Lo que la ciudad aprende · Acceso restringido
						</p>
						<h1 className="q-h2 mt-1">Se requiere rol ciudad</h1>
					</div>
					<span className="q-badge q-badge--high">{session.role}</span>
				</div>
				<div className="q-card__body">
					<p className="q-p q-muted">
						Sesión activa como{" "}
						<strong className="text-[var(--ink)]">{session.email}</strong>. Este
						tablero solo está habilitado para operadores con rol{" "}
						<code className="rounded bg-[var(--line)] px-1.5 py-0.5 text-[var(--ink)]">
							city
						</code>{" "}
						en Supabase Auth.
					</p>
				</div>
				<div className="q-card__foot">
					<button
						type="button"
						onClick={() => void onSignOut()}
						className="q-btn q-btn--secondary q-btn--block"
					>
						Cerrar sesión
					</button>
				</div>
			</section>
		);
	}

	return (
		<section className="q-card mx-auto mt-10 max-w-md">
			<div className="q-flag" aria-hidden="true">
				<i />
				<i />
				<i />
			</div>
			<div className="q-card__head">
				<div>
					<p className="q-eyebrow">QUILLART · Lo que la ciudad aprende</p>
					<h1 className="q-h1 mt-1">Acceso de ciudad</h1>
				</div>
				<span className="q-badge q-badge--neutral">Rol city</span>
			</div>

			<form onSubmit={handleSubmit} className="q-card__body">
				<p className="q-p q-sm q-muted">
					Ingresa con una cuenta de Supabase Auth asignada al rol{" "}
					<code className="rounded bg-[var(--line)] px-1.5 py-0.5 text-[var(--ink)]">
						city
					</code>{" "}
					para ver lo que la ciudad aprende de sus visitantes.
				</p>

				<div className="space-y-1.5">
					<label htmlFor="city-email" className="q-eyebrow block">
						Correo electrónico
					</label>
					<input
						id="city-email"
						type="email"
						required
						autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="ciudad@demo.local"
						className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-subtle)]"
					/>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="city-password" className="q-eyebrow block">
						Contraseña
					</label>
					<input
						id="city-password"
						type="password"
						required
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--line-control)] bg-[var(--bg)] px-4 text-[15px] text-[var(--ink)]"
					/>
				</div>

				{error && (
					<p
						role="alert"
						className="rounded-[var(--radius-md)] bg-[var(--red-soft)] px-4 py-3 text-sm text-[var(--red-text)]"
					>
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={submitting}
					aria-busy={submitting}
					className="q-btn q-btn--primary q-btn--block mt-2"
				>
					{submitting && (
						<span className="q-star q-star--think" aria-hidden="true" />
					)}
					{submitting ? "Verificando acceso..." : "Entrar"}
				</button>
			</form>
		</section>
	);
}
