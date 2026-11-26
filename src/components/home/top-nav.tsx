import { UserRound } from "lucide-react";
import { type NavSection, navLinks } from "./nav-sections";

interface TopNavProps {
	current: NavSection;
	aiHref: string;
}

const linkClass = (active: boolean) =>
	`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold no-underline ${
		active
			? "bg-[var(--line)] text-[var(--ink)]"
			: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
	}`;

/** Desktop navigation (hidden on small screens, where BottomNav takes over). */
export function TopNav({ current, aiHref }: TopNavProps) {
	return (
		<nav aria-label="Secciones" className="hidden items-center gap-1 lg:flex">
			{navLinks(aiHref).map((link) => (
				<a
					key={link.section}
					className={linkClass(current === link.section)}
					href={link.href}
					aria-current={current === link.section ? "page" : undefined}
				>
					{link.label}
				</a>
			))}
			<a
				className={linkClass(current === "profile")}
				href="/perfil"
				aria-current={current === "profile" ? "page" : undefined}
			>
				<UserRound size={18} strokeWidth={1.75} aria-hidden="true" />
				Perfil
			</a>
		</nav>
	);
}
