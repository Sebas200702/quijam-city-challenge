import { Route } from "lucide-react";
import { useT } from "../../lib/i18n/use-language";
import { Illustration } from "./illustration";
import "../../styles/life-shell.css";

interface MatchCardProps {
	timeLabel: string;
	title: string;
	venue: string;
	illustration: string;
	routeHref?: string;
}

/** Card for the match of the day, with a LIVE badge and a route shortcut. */
export function MatchCard({
	timeLabel,
	title,
	venue,
	illustration,
	routeHref,
}: MatchCardProps) {
	const t = useT();
	const routeIcon = <Route size={20} strokeWidth={1.75} aria-hidden="true" />;

	return (
		<article className="q-card ls-match" aria-label={t.shared.match.ariaLabel}>
			<span
				className="l-geo l-geo--ring l-geo--gold -top-3 right-16"
				aria-hidden="true"
			/>
			<span
				className="l-geo l-geo--diamond l-geo--green bottom-2 right-[38%] max-lg:hidden"
				aria-hidden="true"
			/>
			<div className="ls-match__body flex items-center gap-3.5 py-3.5 pr-4 pl-3.5">
				<Illustration src={illustration} imageClassName="h-[84px]! lg:h-36!" />
				<div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
					<span className="q-badge q-badge--live">
						<span className="q-dot" aria-hidden="true" />
						{timeLabel}
					</span>
					<h2 className="q-h3" style={{ fontSize: 17 }}>
						{title}
					</h2>
					<span className="q-sm q-muted">{venue}</span>
				</div>
				{routeHref ? (
					<a
						className="q-btn q-btn--primary q-btn--icon"
						href={routeHref}
						aria-label={t.shared.match.directions}
					>
						{routeIcon}
					</a>
				) : (
					<button
						type="button"
						className="q-btn q-btn--primary q-btn--icon"
						aria-label={t.shared.match.directions}
					>
						{routeIcon}
					</button>
				)}
			</div>
		</article>
	);
}
