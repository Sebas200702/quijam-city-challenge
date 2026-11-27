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
import { useT } from "../../lib/i18n/use-language";

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
	const t = useT();
	const Icon = SERVICE_ICONS[service];
	return (
		<Icon
			size={size}
			strokeWidth={1.75}
			role="img"
			aria-label={
				t.map.labels[SERVICE_LABELS[service] as keyof typeof t.map.labels]
			}
		/>
	);
}

/** Icon plus label, as a small pill. */
export function ServiceTag({ service }: { service: ServiceKey }) {
	const t = useT();
	const Icon = SERVICE_ICONS[service];
	return (
		<li className="corridor-tag">
			<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
			{t.map.labels[SERVICE_LABELS[service] as keyof typeof t.map.labels]}
		</li>
	);
}
