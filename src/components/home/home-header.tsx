import { LanguageSwitcher } from "./language-switcher";
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
}

export function HomeHeader({ weatherLabel, current, aiHref }: HomeHeaderProps) {
	return (
		<header className="flex items-center gap-3 lg:gap-6">
			<QuillartLogo />
			<TopNav current={current} aiHref={aiHref} />
			{weatherLabel && <WeatherBadge label={weatherLabel} />}
			<LanguageSwitcher />
			<ThemeToggle />
		</header>
	);
}
