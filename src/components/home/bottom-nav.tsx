import { Compass, House, Ticket } from "lucide-react";

export type NavSection = "home" | "explore" | "ai" | "tickets";

interface BottomNavProps {
	current: NavSection;
	aiHref: string;
}

/** Mobile tab bar (hidden on large screens, where TopNav takes over). */
export function BottomNav({ current, aiHref }: BottomNavProps) {
	const tabClass = (section: NavSection) =>
		`q-tab${current === section ? " is-on" : ""}`;
	const aria = (section: NavSection) =>
		current === section ? ("page" as const) : undefined;

	return (
		<nav aria-label="Secciones" className="sticky bottom-0 z-30 lg:hidden">
			<div className="q-tabs">
				<a className={tabClass("home")} href="/" aria-current={aria("home")}>
					<House
						size={22}
						strokeWidth={current === "home" ? 2 : 1.75}
						aria-hidden="true"
					/>
					Inicio
				</a>
				<a className={tabClass("explore")} href="/mapa">
					<Compass size={22} strokeWidth={1.75} aria-hidden="true" />
					Explorar
				</a>
				<a className={tabClass("ai")} href={aiHref} aria-current={aria("ai")}>
					<span
						className="q-star"
						style={{ width: 22, height: 22 }}
						aria-hidden="true"
					/>
					Quillart AI
				</a>
				<button type="button" className={tabClass("tickets")}>
					<Ticket size={22} strokeWidth={1.75} aria-hidden="true" />
					Entradas
				</button>
			</div>
		</nav>
	);
}
