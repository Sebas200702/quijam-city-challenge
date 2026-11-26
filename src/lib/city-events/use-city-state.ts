import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ChannelStatus,
	type CityEventsConnection,
	connectCityEvents,
} from "./city-events-channel";
import type { CityEvent, CityState } from "./city-events-types";
import { INITIAL_CITY_STATE, reduceCityEvent } from "./city-state";

/** Subscribes a React island to `city-events` and keeps the derived city state. */
export function useCityState(): {
	state: CityState;
	status: ChannelStatus;
	lastEvent: CityEvent | null;
	publish: (event: CityEvent) => Promise<void>;
} {
	const [state, setState] = useState<CityState>(INITIAL_CITY_STATE);
	const [status, setStatus] = useState<ChannelStatus>("connecting");
	const [lastEvent, setLastEvent] = useState<CityEvent | null>(null);
	const connection = useRef<CityEventsConnection | null>(null);

	useEffect(() => {
		let closed = false;
		void connectCityEvents((event) => {
			setLastEvent(event);
			setState((current) => reduceCityEvent(current, event));
		}, setStatus).then((conn) => {
			if (closed) conn.close();
			else connection.current = conn;
		});
		return () => {
			closed = true;
			connection.current?.close();
		};
	}, []);

	const publish = useCallback(async (event: CityEvent) => {
		await connection.current?.publish(event);
	}, []);

	return { state, status, lastEvent, publish };
}
