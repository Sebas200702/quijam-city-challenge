import { SecondaryMenu } from "../visitor-home/secondary-menu";
import type { NavSection } from "./nav-sections";
import { QuillartLogo } from "./quillart-logo";
import { ThemeToggle } from "./theme-toggle";
import { TopNav } from "./top-nav";
import { WeatherBadge } from "./weather-badge";

interface HomeHeaderProps {
	/** Only shown when it comes from a real weather source; never hard-coded. */
	weatherLabel?: string | null;
	current: NavSection;
	aiHref: string;
	/** Shows the secondary menu (language + Pasaporte, Jerga, Datos, Idioma). Off by default. */
	menu?: boolean;
}

export function HomeHeader({
	weatherLabel,
	current,
	aiHref,
	menu = false,
}: HomeHeaderProps) {
	return (
		<header className="flex items-center gap-3 lg:gap-6">
			<QuillartLogo />
			<TopNav current={current} aiHref={aiHref} />
			{weatherLabel && <WeatherBadge label={weatherLabel} />}
			<ThemeToggle />
			{menu && <SecondaryMenu />}
		</header>
	);
}
