import {
	FileText,
	Gauge,
	LogOut,
	Map as MapIcon,
	Receipt,
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

/**
 * City dashboard toolbar under the site header: sections, city mode, live status
 * and sign out. The theme switch lives in the site header's secondary menu.
 */
export function CityShellHeader({
	operator,
	connection,
	freshness,
	modeLabel,
}: CityShellHeaderProps) {
	// Nothing to show before the operator signs in: the site header carries the brand.
	if (!operator) return null;

	return (
		<div
			role="toolbar"
			aria-label="Herramientas del tablero"
			className="q-header cs-head"
			style={{ position: "static" }}
		>
			<div
				className="q-header__center"
				style={{ justifyContent: "flex-start" }}
			>
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
		</div>
	);
}
