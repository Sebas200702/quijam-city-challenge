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
import {
	SERVICE_LABELS,
	type ServiceKey,
} from "../../lib/corridor/corridor-geometry";
import type {
	BusinessCategory,
	StatusTone,
	StopType,
} from "../../lib/corridor/corridor-types";
import { type MapLang, SERVICE_LABELS_EN } from "./map-chrome-copy";
import "./map-chrome.css";

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

export function serviceLabel(service: ServiceKey, lang: MapLang = "es") {
	return lang === "en" ? SERVICE_LABELS_EN[service] : SERVICE_LABELS[service];
}

interface ServiceIconProps {
	service: ServiceKey;
	size?: number;
	lang?: MapLang;
}

/** Icon of a stop or business service, named for screen readers. */
export function ServiceIcon({ service, size = 16, lang }: ServiceIconProps) {
	const Icon = SERVICE_ICONS[service];
	return (
		<Icon
			size={size}
			strokeWidth={1.75}
			role="img"
			aria-label={serviceLabel(service, lang)}
			className={`mc-tone mc-tone--${SERVICE_TONES[service]}`}
		/>
	);
}

/** Icon plus label, as a small pill. */
export function ServiceTag({
	service,
	lang,
}: {
	service: ServiceKey;
	lang?: MapLang;
}) {
	const Icon = SERVICE_ICONS[service];
	return (
		<li className={`corridor-tag mc-tag mc-tag--${SERVICE_TONES[service]}`}>
			<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
			{serviceLabel(service, lang)}
		</li>
	);
}
