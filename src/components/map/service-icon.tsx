import {
	Accessibility,
	BadgeCheck,
	Droplet,
	HandCoins,
	type LucideIcon,
	Recycle,
	TreePalm,
	Users,
} from "lucide-react";
import {
	SERVICE_LABELS,
	type ServiceKey,
} from "../../lib/corridor/corridor-geometry";

const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
	accessible: Accessibility,
	shade: TreePalm,
	hydration: Droplet,
	recycling: Recycle,
	hosts: Users,
	verified: BadgeCheck,
	commissionFree: HandCoins,
};

interface ServiceIconProps {
	service: ServiceKey;
	size?: number;
}

/** Icon of a stop or business service, named for screen readers. */
export function ServiceIcon({ service, size = 16 }: ServiceIconProps) {
	const Icon = SERVICE_ICONS[service];
	return (
		<Icon
			size={size}
			strokeWidth={1.75}
			role="img"
			aria-label={SERVICE_LABELS[service]}
		/>
	);
}

/** Icon plus label, as a small pill. */
export function ServiceTag({ service }: { service: ServiceKey }) {
	const Icon = SERVICE_ICONS[service];
	return (
		<li className="corridor-tag">
			<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
			{SERVICE_LABELS[service]}
		</li>
	);
}
