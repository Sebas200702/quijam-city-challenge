import { useCallback, useEffect, useRef, useState } from "react";
import { useCityState } from "../../lib/city-events/use-city-state";
import {
	clampHour,
	PLAYBACK_TICK_MS,
	playbackStartHour,
	playbackTick,
	reconcileEcho,
	rememberSent,
} from "../../lib/timeline/timeline";

export interface MatchTimeline {
	hour: number;
	playing: boolean;
	/** Moves the slider (pauses playback) and publishes `tiempo`. */
	seek: (hour: number) => void;
	play: () => void;
	pause: () => void;
}

/**
 * The match-day hour shared over `city-events`: this screen publishes `tiempo` when
 * the slider moves or the day plays, and follows the hour other screens send.
 */
export function useMatchTimeline(): MatchTimeline {
	const { state, lastEvent, publish } = useCityState();
	const [hour, setHour] = useState(state.hour);
	const [playing, setPlaying] = useState(false);
	const hourRef = useRef(hour);
	hourRef.current = hour;
	const pendingRef = useRef<number[]>([]);

	// Another screen moved the day (or the presenter reset it): follow it.
	useEffect(() => {
		if (lastEvent?.type === "reiniciar") {
			pendingRef.current = [];
			setPlaying(false);
			setHour(state.hour);
			return;
		}
		if (lastEvent?.type !== "tiempo") return;
		const { pending, apply } = reconcileEcho(pendingRef.current, state.hour);
		pendingRef.current = pending;
		if (apply) setHour(state.hour);
	}, [lastEvent, state.hour]);

	const go = useCallback(
		(next: number) => {
			const value = clampHour(next);
			setHour(value);
			pendingRef.current = rememberSent(pendingRef.current, value);
			// Offline or without Realtime the slider still works on this screen.
			void publish({ type: "tiempo", hour: value }).catch(() => undefined);
		},
		[publish],
	);

	useEffect(() => {
		if (!playing) return;
		const timer = window.setInterval(() => {
			const tick = playbackTick(hourRef.current);
			go(tick.hour);
			if (!tick.playing) setPlaying(false);
		}, PLAYBACK_TICK_MS);
		return () => window.clearInterval(timer);
	}, [playing, go]);

	const seek = useCallback(
		(next: number) => {
			setPlaying(false);
			go(next);
		},
		[go],
	);

	const play = useCallback(() => {
		const start = playbackStartHour(hourRef.current);
		if (start !== hourRef.current) go(start);
		setPlaying(true);
	}, [go]);

	const pause = useCallback(() => setPlaying(false), []);

	return { hour, playing, seek, play, pause };
}
