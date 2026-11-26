import type { NavSection } from "./bottom-nav";

interface TopNavProps {
	current: NavSection;
	aiHref: string;
}

const linkClass = (active: boolean) =>
	`inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold no-underline ${
		active
			? "bg-[var(--line)] text-[var(--ink)]"
			: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
	}`;

/** Desktop navigation (hidden on small screens, where BottomNav takes over). */
export function TopNav({ current, aiHref }: TopNavProps) {
	return (
		<nav aria-label="Secciones" className="hidden items-center gap-1 lg:flex">
			<a
				className={linkClass(current === "home")}
				href="/"
				aria-current={current === "home" ? "page" : undefined}
			>
				Inicio
			</a>
			<a className={linkClass(current === "explore")} href="/mapa">
				Explorar
			</a>
			<a
				className={linkClass(current === "ai")}
				href={aiHref}
				aria-current={current === "ai" ? "page" : undefined}
			>
				Quillart AI
			</a>
			<button type="button" className={linkClass(current === "tickets")}>
				Entradas
			</button>
		</nav>
	);
}
