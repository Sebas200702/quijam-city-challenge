import type { CityEvent } from "./city-events-types";

const CHANNEL = "city-events";
const BROADCAST_EVENT = "city-event";

const EVENT_TYPES = new Set<CityEvent["type"]>([
	"aguacero",
	"malecon_saturado",
	"cobro_abusivo",
	"modo_ciudad",
	"tiempo",
	"reiniciar",
]);

/** Light check: messages come from other devices, so their shape is not trusted. */
export function isCityEvent(value: unknown): value is CityEvent {
	if (typeof value !== "object" || value === null) return false;
	const { type } = value as { type?: unknown };
	if (!EVENT_TYPES.has(type as CityEvent["type"])) return false;
	if (type === "aguacero") {
		const { zoneIds, startsInMin } = value as {
			zoneIds?: unknown;
			startsInMin?: unknown;
		};
		return (
			Array.isArray(zoneIds) &&
			zoneIds.every((id) => typeof id === "string") &&
			typeof startsInMin === "number"
		);
	}
	return true;
}

function supabaseConfigured(): boolean {
	return Boolean(
		import.meta.env.PUBLIC_SUPABASE_URL &&
			import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	);
}

function localChannel(): BroadcastChannel | null {
	return typeof BroadcastChannel === "undefined"
		? null
		: new BroadcastChannel(CHANNEL);
}

/**
 * Listens to `city-events`: Supabase Realtime broadcast between devices, plus a
 * browser BroadcastChannel between tabs of the same device, which keeps the demo
 * working without internet. Returns a function that stops listening.
 */
export function subscribeCityEvents(
	onEvent: (event: CityEvent) => void,
): () => void {
	const local = localChannel();
	local?.addEventListener("message", (message) => {
		if (isCityEvent(message.data)) onEvent(message.data);
	});

	let stopRemote = () => {};
	let cancelled = false;
	if (supabaseConfigured()) {
		void import("../supabase").then(({ supabase }) => {
			if (cancelled) return;
			const channel = supabase
				.channel(CHANNEL)
				.on("broadcast", { event: BROADCAST_EVENT }, ({ payload }) => {
					if (isCityEvent(payload)) onEvent(payload);
				})
				.subscribe();
			stopRemote = () => void supabase.removeChannel(channel);
		});
	}

	return () => {
		cancelled = true;
		local?.close();
		stopRemote();
	};
}

/** Sends an event to the other tabs and, when Supabase is configured, to every device. */
export async function publishCityEvent(event: CityEvent): Promise<void> {
	const local = localChannel();
	local?.postMessage(event);
	local?.close();
	if (!supabaseConfigured()) return;
	const { supabase } = await import("../supabase");
	await supabase
		.channel(CHANNEL)
		.send({ type: "broadcast", event: BROADCAST_EVENT, payload: event });
}
