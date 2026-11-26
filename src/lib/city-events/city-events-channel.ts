// Client-side transport for `city-events`. Uses Supabase Realtime broadcast when
// configured, so every phone and the dashboard share events. Without Supabase it
// falls back to the browser BroadcastChannel (same browser, other tabs), so the
// demo still works offline on one laptop.

import {
	CITY_EVENT_NAME,
	CITY_EVENTS_CHANNEL,
	type CityEvent,
} from "./city-events-types";

export type ChannelStatus = "connecting" | "live" | "local" | "error";

export interface CityEventsConnection {
	publish(event: CityEvent): Promise<void>;
	close(): void;
}

async function connectSupabase(
	onEvent: (event: CityEvent) => void,
	onStatus: (status: ChannelStatus) => void,
): Promise<CityEventsConnection> {
	const { supabase } = await import("../supabase");
	const channel = supabase.channel(CITY_EVENTS_CHANNEL, {
		config: { broadcast: { self: true } },
	});
	channel
		.on("broadcast", { event: CITY_EVENT_NAME }, ({ payload }) =>
			onEvent(payload as CityEvent),
		)
		.subscribe((status) => {
			if (status === "SUBSCRIBED") onStatus("live");
			else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
				onStatus("error");
		});
	return {
		async publish(event) {
			await channel.send({
				type: "broadcast",
				event: CITY_EVENT_NAME,
				payload: event,
			});
		},
		close() {
			void supabase.removeChannel(channel);
		},
	};
}

function connectLocal(
	onEvent: (event: CityEvent) => void,
	onStatus: (status: ChannelStatus) => void,
): CityEventsConnection {
	const channel = new BroadcastChannel(CITY_EVENTS_CHANNEL);
	channel.onmessage = (message) => onEvent(message.data as CityEvent);
	onStatus("local");
	return {
		async publish(event) {
			channel.postMessage(event);
			onEvent(event);
		},
		close() {
			channel.close();
		},
	};
}

export async function connectCityEvents(
	onEvent: (event: CityEvent) => void,
	onStatus: (status: ChannelStatus) => void,
): Promise<CityEventsConnection> {
	onStatus("connecting");
	try {
		return await connectSupabase(onEvent, onStatus);
	} catch {
		return connectLocal(onEvent, onStatus);
	}
}
