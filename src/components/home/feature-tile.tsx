import { Illustration } from "./illustration";

interface FeatureTileProps {
	title: string;
	subtitle: string;
	illustration: string;
	href?: string;
}

/** Entry point to a section: illustration, title and one line of context. */
export function FeatureTile({
	title,
	subtitle,
	illustration,
	href,
}: FeatureTileProps) {
	const content = (
		<>
			<Illustration src={illustration} imageClassName="h-[76px]! lg:h-28!" />
			<b>{title}</b>
			<span>{subtitle}</span>
		</>
	);

	if (href) {
		return (
			<a className="q-feature" href={href}>
				{content}
			</a>
		);
	}
	return (
		<button type="button" className="q-feature">
			{content}
		</button>
	);
}
