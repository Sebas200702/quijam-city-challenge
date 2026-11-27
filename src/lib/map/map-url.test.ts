import { afterEach, describe, expect, it, vi } from "vitest";
import { focusMap, onMapFocus } from "./map-focus";
import { mapHref, parseMapUrl } from "./map-url";

describe("map URL contract", () => {
	it("reads a place, an event, a business and a camera", () => {
		expect(
			parseMapUrl(
				"?lugar=gran-malecon&evento=ev_12&negocio=BIZ-CAFE-PAZ&lat=10.9835&lng=-74.779&zoom=17",
			),
		).toEqual({
			lugar: "gran-malecon",
			evento: "ev_12",
			negocio: "BIZ-CAFE-PAZ",
			camera: { lat: 10.9835, lng: -74.779, zoom: 17 },
		});
	});

	it("drops points outside the metro area and odd values", () => {
		expect(parseMapUrl("?lat=11.0215&lng=-74.66")).toEqual({});
		expect(parseMapUrl("?lugar=<script>&lat=abc&lng=-74.8")).toEqual({});
		expect(parseMapUrl("?lat=10.9835&lng=-74.779&zoom=40")).toEqual({
			camera: { lat: 10.9835, lng: -74.779, zoom: 19 },
		});
	});

	it("builds links that read back the same", () => {
		expect(mapHref()).toBe("/mapa");
		expect(mapHref({ lugar: "muelle-puerto-colombia" })).toBe(
			"/mapa?lugar=muelle-puerto-colombia",
		);
		const href = mapHref({
			evento: "abc",
			camera: { lat: 10.98351234, lng: -74.779, zoom: 16 },
		});
		expect(href).toBe("/mapa?evento=abc&lat=10.98351&lng=-74.77900&zoom=16");
		expect(parseMapUrl(href.split("?")[1])).toEqual({
			evento: "abc",
			camera: { lat: 10.98351, lng: -74.779, zoom: 16 },
		});
		expect(mapHref({ camera: { lat: 11.0215, lng: -74.66 } })).toBe("/mapa");
	});
});

describe("focusMap", () => {
	const stops: (() => void)[] = [];
	afterEach(() => {
		for (const stop of stops.splice(0)) stop();
	});

	it("refuses points outside the metro area", () => {
		const listener = vi.fn();
		stops.push(onMapFocus(listener));
		expect(focusMap({ lat: 11.0215, lng: -74.66 })).toBe(false);
		expect(listener).not.toHaveBeenCalled();
	});

	it("tells the map on screen", () => {
		const listener = vi.fn();
		stops.push(onMapFocus(listener));
		expect(focusMap({ lat: 10.9835, lng: -74.779, zoom: 16 })).toBe(true);
		expect(listener).toHaveBeenCalledWith({
			lat: 10.9835,
			lng: -74.779,
			zoom: 16,
		});
	});

	it("keeps the last request until a map mounts", () => {
		focusMap({ lat: 10.9835, lng: -74.779 });
		const listener = vi.fn();
		stops.push(onMapFocus(listener));
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
