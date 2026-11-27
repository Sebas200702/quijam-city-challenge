import { Sun } from "lucide-react";
import "../../styles/life-shell.css";

interface WeatherBadgeProps {
	label: string;
}

export function WeatherBadge({ label }: WeatherBadgeProps) {
	return (
		<span
			className="q-badge q-badge--event ls-weather"
			style={{
				height: 36,
				padding: "0 14px",
				fontSize: 13,
				textTransform: "none",
				letterSpacing: 0,
			}}
		>
			<Sun size={16} strokeWidth={2} aria-hidden="true" />
			{label}
		</span>
	);
}
