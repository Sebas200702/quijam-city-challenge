import { SecondaryMenu } from "../visitor-home/secondary-menu";
import type { NavSection } from "./nav-sections";
import { QuillartLogo } from "./quillart-logo";
import { TopNav } from "./top-nav";
import { WeatherBadge } from "./weather-badge";
import "../../styles/life-shell.css";


interface HomeHeaderProps {
	/** Only shown when it comes from a real weather source; never hard-coded. */
	weatherLabel?: string | null;
	current: NavSection;
	aiHref: string;
}

export function HomeHeader({ weatherLabel, current, aiHref }: HomeHeaderProps) {
	return (
		<header className="ls-topbar">
			<QuillartLogo />
			<TopNav current={current} aiHref={aiHref} />
			{weatherLabel && <WeatherBadge label={weatherLabel} />}
			<SecondaryMenu />
		</header>
	);
}
