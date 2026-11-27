// The app home: Quillart AI first, with today's events and the sections below
// while the conversation is still empty.

import {
	CalendarDays,
	ChevronRight,
	Map as MapIcon,
	MapPin,
	MessagesSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import {
	formatEventDay,
	formatTime,
} from "../../lib/community/community-labels";
import { Loaded } from "../community/community-ui";
import { useLoad } from "../community/use-community";
import { AssistantChat } from "./assistant-chat";

const STARTERS = [
	"Planes para este fin de semana",
	"Quiero publicar un evento",
	"Lugares de naturaleza cerca",
	"¿Cómo llego al estadio?",
	"Reportar un arroyo o un problema",
	"¿Qué se habla en la comunidad?",
	"Mis inscripciones",
];

const SECTIONS: {
	href: string;
	label: string;
	hint: string;
	icon: ReactNode;
}[] = [
	{
		href: "/agenda",
		label: "Agenda",
		hint: "Eventos y planes",
		icon: <CalendarDays size={20} aria-hidden="true" />,
	},
	{
		href: "/foro",
		label: "Comunidad",
		hint: "Conversaciones",
		icon: <MessagesSquare size={20} aria-hidden="true" />,
	},
	{
		href: "/lugares",
		label: "Lugares",
		hint: "Parques y naturaleza",
		icon: <MapPin size={20} aria-hidden="true" />,
	},
	{
		href: "/mapa",
		label: "Mapa",
		hint: "Rutas y alertas",
		icon: <MapIcon size={20} aria-hidden="true" />,
	},
];

function TodayStrip() {
	const { state } = useLoad(
		async (store) => {
			const [events, places] = await Promise.all([
				store.listEvents({ limit: 3 }),
				store.listPlaces(),
			]);
			const names = new Map(places.map((place) => [place.id, place.name]));
			return events.map((event) => ({
				event,
				place:
					(event.placeId && names.get(event.placeId)) || event.locationText,
			}));
		},
		[],
		["events"],
	);
	return (
		<section aria-labelledby="today-title" className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h2 id="today-title" className="q-h2">
					Hoy en tu ciudad
				</h2>
				<a className="q-sm font-semibold text-[var(--ink)]" href="/agenda">
					Ver agenda
				</a>
			</div>
			<Loaded state={state} loadingLabel="Buscando planes…">
				{(items) =>
					items.length === 0 ? (
						<p className="q-p q-muted">
							Todavía no hay eventos próximos. ¡Publica el primero!
						</p>
					) : (
						<ul className="grid gap-2 lg:grid-cols-3">
							{items.map(({ event, place }) => (
								<li key={event.id} className="min-w-0">
									<a
										href={`/agenda/${encodeURIComponent(event.id)}`}
										className="q-card h-full min-h-11 items-start gap-1.5 px-4 py-3 text-left text-inherit no-underline transition-shadow lg:hover:shadow-[var(--glow-gold)]"
									>
										<span className="q-badge q-badge--event">
											{formatEventDay(event.startsAt)}
										</span>
										<span className="q-h3 line-clamp-2">{event.title}</span>
										<span className="q-sm q-muted flex w-full items-center gap-1">
											<span className="min-w-0 flex-1 truncate">
												{formatTime(event.startsAt)}
												{place ? ` · ${place}` : ""}
											</span>
											<ChevronRight
												size={18}
												aria-hidden="true"
												className="shrink-0 text-[var(--ink-subtle)]"
											/>
										</span>
									</a>
								</li>
							))}
						</ul>
					)
				}
			</Loaded>
		</section>
	);
}

function SectionLinks() {
	return (
		<nav
			aria-label="Secciones"
			className="grid grid-cols-2 gap-2 lg:grid-cols-4"
		>
			{SECTIONS.map((section) => (
				<a
					key={section.href}
					href={section.href}
					className="q-card min-h-11 flex-row! items-center gap-3 px-4 py-3 text-left text-inherit no-underline"
				>
					<span className="text-[var(--gold-text)]">{section.icon}</span>
					<span className="min-w-0">
						<span className="q-h3 block">{section.label}</span>
						<span className="q-sm q-muted block truncate">{section.hint}</span>
					</span>
				</a>
			))}
		</nav>
	);
}

export function AssistantHome() {
	return (
		<AssistantChat
			greeting="¿Qué quieres hacer hoy en Barranquilla?"
			intro="Planes, comunidad, lugares y reportes. Escríbeme o háblame."
			starters={STARTERS}
			emptyState={
				<div className="mt-2 space-y-6">
					<TodayStrip />
					<SectionLinks />
				</div>
			}
		/>
	);
}
