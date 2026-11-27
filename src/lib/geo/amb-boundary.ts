// The Barranquilla Metropolitan Area (AMB): Barranquilla, Soledad, Malambo, Puerto
// Colombia and Galapa. Every map in the app shows only this area (docs/30, U09), so
// the outline, its box and "is this point inside?" live here, free of Leaflet.
// Boundaries: © OpenStreetMap contributors (ODbL), see amb-boundary-data.ts.

import {
	AMB_OUTLINE,
	MUNICIPALITY_BOUNDARIES,
	type MunicipalityBoundary,
} from "./amb-boundary-data";

/** [latitude, longitude], the order Leaflet uses. */
export type LatLngPair = [number, number];

export type MunicipalityKey = MunicipalityBoundary["key"];

export interface BoundingBox {
	south: number;
	west: number;
	north: number;
	east: number;
}

export interface Municipality {
	key: MunicipalityKey;
	name: string;
	ring: LatLngPair[];
	/** Where its name goes on the map: the area centroid of its ring. */
	labelAt: LatLngPair;
	bbox: BoundingBox;
}

/** Turns a flat [lat, lng, lat, lng, …] list into pairs. */
export function ringFromFlat(flat: readonly number[]): LatLngPair[] {
	const ring: LatLngPair[] = [];
	for (let i = 0; i + 1 < flat.length; i += 2)
		ring.push([flat[i], flat[i + 1]]);
	return ring;
}

export function bboxOf(ring: readonly LatLngPair[]): BoundingBox {
	let south = Number.POSITIVE_INFINITY;
	let west = Number.POSITIVE_INFINITY;
	let north = Number.NEGATIVE_INFINITY;
	let east = Number.NEGATIVE_INFINITY;
	for (const [lat, lng] of ring) {
		south = Math.min(south, lat);
		north = Math.max(north, lat);
		west = Math.min(west, lng);
		east = Math.max(east, lng);
	}
	return { south, west, north, east };
}

/** Grows a box by a share of its size on every side (0.05 = 5 %). */
export function padBbox(box: BoundingBox, ratio: number): BoundingBox {
	const dLat = (box.north - box.south) * ratio;
	const dLng = (box.east - box.west) * ratio;
	return {
		south: box.south - dLat,
		west: box.west - dLng,
		north: box.north + dLat,
		east: box.east + dLng,
	};
}

export function inBbox(box: BoundingBox, lat: number, lng: number): boolean {
	return (
		lat >= box.south && lat <= box.north && lng >= box.west && lng <= box.east
	);
}

/** Even-odd ray casting; fine at city scale, where lat/lng are close to planar. */
export function pointInRing(
	ring: readonly LatLngPair[],
	lat: number,
	lng: number,
): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [latI, lngI] = ring[i];
		const [latJ, lngJ] = ring[j];
		const crosses =
			latI > lat !== latJ > lat &&
			lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
		if (crosses) inside = !inside;
	}
	return inside;
}

/** Area centroid of a ring (shoelace), a steady spot for a label. */
export function ringCentroid(ring: readonly LatLngPair[]): LatLngPair {
	let area = 0;
	let lat = 0;
	let lng = 0;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [y1, x1] = ring[j];
		const [y2, x2] = ring[i];
		const cross = x1 * y2 - x2 * y1;
		area += cross;
		lng += (x1 + x2) * cross;
		lat += (y1 + y2) * cross;
	}
	if (area === 0) return ring[0] ?? [0, 0];
	return [lat / (3 * area), lng / (3 * area)];
}

/** Outer edge of the five municipalities together. */
export const AMB_RING: readonly LatLngPair[] = ringFromFlat(AMB_OUTLINE);

/** Smallest box around the AMB. */
export const AMB_BBOX: BoundingBox = bboxOf(AMB_RING);

export const MUNICIPALITIES: readonly Municipality[] =
	MUNICIPALITY_BOUNDARIES.map((boundary) => {
		const ring = ringFromFlat(boundary.ring);
		return {
			key: boundary.key,
			name: boundary.name,
			ring,
			labelAt: ringCentroid(ring),
			bbox: bboxOf(ring),
		};
	});

/** True when the point is inside the Metropolitan Area, the only part the maps show. */
export function isInsideAmb(lat: number, lng: number): boolean {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
	return inBbox(AMB_BBOX, lat, lng) && pointInRing(AMB_RING, lat, lng);
}

/**
 * How far a point on the water can sit from the shore and still belong on the map.
 * Piers and lagoons (the Muelle de Puerto Colombia, the Ciénaga de Mallorquín) have
 * their centre on the water, just past the coastline the boundary follows.
 */
export const SHORE_TOLERANCE_M = 600;

/** How far a pin moves past the shore, so it never sits on the mask's edge. */
const SHORE_INSET_M = 40;

const METERS_PER_DEGREE_LAT = 110_574;
const metersPerDegreeLng = (lat: number) =>
	111_320 * Math.cos((lat * Math.PI) / 180);

/** Closest point of the AMB edge and its distance in metres (local flat projection). */
export function nearestEdgePoint(
	lat: number,
	lng: number,
): { at: LatLngPair; meters: number } {
	const kx = metersPerDegreeLng(lat);
	const ky = METERS_PER_DEGREE_LAT;
	const px = lng * kx;
	const py = lat * ky;
	let best = { at: AMB_RING[0], meters: Number.POSITIVE_INFINITY };
	for (let i = 0, j = AMB_RING.length - 1; i < AMB_RING.length; j = i++) {
		const ax = AMB_RING[j][1] * kx;
		const ay = AMB_RING[j][0] * ky;
		const dx = AMB_RING[i][1] * kx - ax;
		const dy = AMB_RING[i][0] * ky - ay;
		const length = dx * dx + dy * dy;
		const t =
			length === 0
				? 0
				: Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
		const qx = ax + t * dx;
		const qy = ay + t * dy;
		const meters = Math.hypot(px - qx, py - qy);
		if (meters < best.meters) best = { at: [qy / ky, qx / kx], meters };
	}
	return best;
}

/**
 * Where a point goes on the AMB map: itself when inside; the nearest shore when it is
 * on the water within SHORE_TOLERANCE_M; null when it is outside the area (it is not
 * drawn, and the screen says so instead of hiding it).
 */
export function ambAnchor(
	lat: number,
	lng: number,
	toleranceMeters = SHORE_TOLERANCE_M,
): LatLngPair | null {
	if (isInsideAmb(lat, lng)) return [lat, lng];
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const edge = nearestEdgePoint(lat, lng);
	if (edge.meters > toleranceMeters || edge.meters === 0) return null;
	// Step past the edge, away from the outside point, so the pin lands inside.
	const step = SHORE_INSET_M / edge.meters;
	const inset: LatLngPair = [
		edge.at[0] + (edge.at[0] - lat) * step,
		edge.at[1] + (edge.at[1] - lng) * step,
	];
	return isInsideAmb(...inset) ? inset : null;
}

/** The municipality the point falls in, or null outside the AMB. */
export function municipalityAt(lat: number, lng: number): Municipality | null {
	if (!isInsideAmb(lat, lng)) return null;
	return (
		MUNICIPALITIES.find(
			(item) => inBbox(item.bbox, lat, lng) && pointInRing(item.ring, lat, lng),
		) ?? null
	);
}
