import {
	FileText,
	Gauge,
	LogOut,
	Map as MapIcon,
	Moon,
	Receipt,
	Sun,
	Trophy,
} from "lucide-react";
import type { ConnectionView } from "../../../lib/city-dashboard-utils";
import { ConnectionBadge } from "./connection-badge";

export type ShellTheme = "dark" | "light";

interface CityShellHeaderProps {
	theme: ShellTheme;
	onThemeChange: (theme: ShellTheme) => void;
	/** Signed-in operator; the live controls only show for a city session. */
	operator: { email: string; onSignOut: () => void } | null;
	connection: ConnectionView;
	freshness: string | null;
	/** "Modo Mundial" and friends; hidden until zone counts arrive. */
	modeLabel: string | null;
}

const SECTIONS = [
	{ href: "#mapa", label: "Mapa", Icon: MapIcon },
	{ href: "#indicadores", label: "Indicadores", Icon: Gauge },
	{ href: "#cobros", label: "Cobros", Icon: Receipt },
	{ href: "#informe", label: "Informe", Icon: FileText },
] as const;

/** City dashboard header: logo, sections, city mode and live status. */
export function CityShellHeader({
	theme,
	onThemeChange,
	operator,
	connection,
	freshness,
	modeLabel,
}: CityShellHeaderProps) {
	const nextTheme: ShellTheme = theme === "dark" ? "light" : "dark";

	return (
		<header className="q-header cs-head">
			<a
				href="/ciudad"
				className="q-logo"
				aria-label="QUILLART, lo que la ciudad aprende, ir al inicio"
			>
				<span className="q-logo__tile" aria-hidden="true">
					<span className="q-star h-5 w-5" />
				</span>
				<span className="q-logo__text">
					<span className="q-logo__word">QUILLART</span>
					<span className="q-logo__sub">
						Lo que la ciudad aprende · Barranquilla
					</span>
				</span>
			</a>

			<div className="q-header__center">
				{operator && (
					<nav
						className="cs-nav"
						aria-label="Secciones del tablero de la ciudad"
					>
						<div className="q-seg">
							{SECTIONS.map(({ href, label, Icon }) => (
								<a key={href} className="q-seg__opt" href={href}>
									<Icon size={18} strokeWidth={1.75} aria-hidden="true" />
									{label}
								</a>
							))}
						</div>
					</nav>
				)}
			</div>

			<div className="q-header__end">
				{operator && modeLabel && (
					<span className="q-badge q-badge--neutral">
						<Trophy
							className="cs-badge-icon"
							strokeWidth={1.75}
							aria-hidden="true"
						/>
						{modeLabel}
					</span>
				)}
				{operator && (
					<ConnectionBadge view={connection} freshness={freshness} />
				)}
				<button
					type="button"
					className="q-btn q-btn--ghost q-btn--icon"
					aria-label={
						nextTheme === "dark"
							? "Cambiar a tema oscuro"
							: "Cambiar a tema claro"
					}
					onClick={() => onThemeChange(nextTheme)}
				>
					{theme === "dark" ? (
						<Sun size={20} strokeWidth={1.75} aria-hidden="true" />
					) : (
						<Moon size={20} strokeWidth={1.75} aria-hidden="true" />
					)}
				</button>
				{operator && (
					<button
						type="button"
						className="q-btn q-btn--ghost"
						title={`Salir (${operator.email})`}
						aria-label="Salir"
						onClick={operator.onSignOut}
					>
						<LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
						<span className="cs-signout-label">Salir</span>
					</button>
				)}
			</div>
		</header>
	);
}
