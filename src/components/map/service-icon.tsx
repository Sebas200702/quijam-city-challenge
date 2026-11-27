import {
	Accessibility,
	BadgeCheck,
	Bus,
	BusFront,
	Coffee,
	Drama,
	Droplet,
	HandCoins,
	Handshake,
	Leaf,
	type LucideIcon,
	Palette,
	QrCode,
	Recycle,
	TreePalm,
	Users,
	UtensilsCrossed,
} from "lucide-react";
import type { ServiceKey } from "../../lib/corridor/corridor-geometry";
import type {
	BusinessCategory,
	StatusTone,
	StopType,
} from "../../lib/corridor/corridor-types";
import { useT } from "../../lib/i18n/use-language";
import "./map-chrome.css";
import "../../styles/life-map-b.css";

export const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
	accessible: Accessibility,
	shade: TreePalm,
	hydration: Droplet,
	recycling: Recycle,
	hosts: Users,
	verified: BadgeCheck,
	commissionFree: HandCoins,
};

/** Colour of each service's icon: green for care and environment, gold for people and trade. */
export const SERVICE_TONES: Record<ServiceKey, StatusTone> = {
	accessible: "green",
	shade: "green",
	hydration: "green",
	recycling: "green",
	hosts: "gold",
	verified: "gold",
	commissionFree: "gold",
};

export const STOP_TYPE_ICONS: Record<StopType, LucideIcon> = {
	transmetro: BusFront,
	bus_stop: Bus,
	qr_point: QrCode,
	host_hub: Handshake,
};

export const CATEGORY_ICONS: Record<BusinessCategory, LucideIcon> = {
	food_popular: UtensilsCrossed,
	crafts: Palette,
	culture: Drama,
	eco_event: Leaf,
	coffee: Coffee,
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
			aria-label={t.map.serviceLabels[service]}
			className={`mc-tone mc-tone--${SERVICE_TONES[service]}`}
		/>
	);
}

/** Icon plus label, as a small pill. */
export function ServiceTag({ service }: { service: ServiceKey }) {
	const t = useT();
	const Icon = SERVICE_ICONS[service];
	return (
		<li
			className={`corridor-tag mc-tag lmb-tag mc-tag--${SERVICE_TONES[service]}`}
		>
			<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
			{t.map.serviceLabels[service]}
		</li>
	);
}
