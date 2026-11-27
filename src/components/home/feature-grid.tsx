import { FeatureTile } from "./feature-tile";
import "../../styles/life-shell.css";


export interface FeatureItem {
	id: string;
	title: string;
	subtitle: string;
	illustration: string;
	href?: string;
}

interface FeatureGridProps {
	items: FeatureItem[];
}

export function FeatureGrid({ items }: FeatureGridProps) {
	return (
		<div className="ls-features grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
			{items.map((item) => (
				<FeatureTile
					key={item.id}
					title={item.title}
					subtitle={item.subtitle}
					illustration={item.illustration}
					href={item.href}
				/>
			))}
		</div>
	);
}
