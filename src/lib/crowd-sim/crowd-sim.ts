import type { CityEvent } from "../city-events/city-events-types";
import type { LatLngTuple } from "../corridor/corridor-geometry";
import type {
	CorridorStop,
	CorridorZone,
	FloodZone,
} from "../corridor/corridor-types";

/** Corridor order from the stadium (start of the path) to the Malecon (end). */
export const SIM_ZONES: CorridorZone[] = [
	"estadio",
	"troncal_murillo",
	"centro",
	"barrio_abajo",
	"gran_malecon",
];

export interface ZoneSeed {
	zone: CorridorZone;
	visitors: number;
	capacity: number;
}

export interface CrowdSimOptions {
	path: LatLngTuple[];
	stops: CorridorStop[];
	floodZones: FloodZone[];
	zones: ZoneSeed[];
	agents?: number;
	seed?: number;
}

/** Diverted visitors may fill a zone only up to this share of its threshold (docs/14). */
export const DIVERSION_CAP = 0.75;
/** Agents stop this far before a blocked arroyo. */
const FLOOD_BUFFER_M = 40;
/** Time-lapse: a full corridor trip takes about a minute of demo time. */
const SPEED_MPS = { min: 150, max: 300 };
/** People rest far longer than they travel, so zone counts stay readable. */
const DWELL_S = { min: 25, max: 60 };
/** The Malecon counts as saturated from this share of its threshold (dashboard "Saturado"). */
export const SATURATION_SHARE = 0.85;
/** Chance per second that someone resting at the Malecon follows the diversion. */
const DIVERSION_RATE = 0.15;

/** Small deterministic generator so tests and demos repeat exactly. */
function mulberry32(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function haversine(
	[lat1, lng1]: LatLngTuple,
	[lat2, lng2]: LatLngTuple,
): number {
	const rad = Math.PI / 180;
	const dLat = (lat2 - lat1) * rad;
	const dLng = (lng2 - lng1) * rad;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
	return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/**
 * Crowd simulator on the corridor street path. Agents are points that move
 * along the path (meters from the stadium), rest at zones and pick new
 * destinations. Each agent stands for several visitors. Data is simulated.
 */
export class CrowdSim {
	readonly agentCount: number;
	readonly visitorsPerAgent: number;
	/** Position along the path, meters from the stadium. */
	readonly pos: Float32Array;
	/** Sideways spread from -1 to 1, so dots fill the street instead of a line. */
	readonly spread: Float32Array;
	private readonly target: Float32Array;
	private readonly speed: Float32Array;
	private readonly dwell: Float32Array;
	private readonly targetZone: Uint8Array;
	private readonly path: LatLngTuple[];
	private readonly cumulative: number[];
	private readonly zoneCenter: number[];
	private readonly zoneBounds: number[];
	private readonly capacity: number[];
	private readonly floodZones: FloodZone[];
	private readonly floodAt: Map<string, number>;
	private readonly seedZones: ZoneSeed[];
	/** Where people head when nothing special happens: each zone's share of the seed visitors. */
	private readonly weights: number[];
	private random: () => number;
	private blocked: Array<[number, number]> = [];
	private diverting = false;

	constructor(options: CrowdSimOptions) {
		this.agentCount = options.agents ?? 2000;
		this.path = options.path;
		this.floodZones = options.floodZones;
		this.seedZones = options.zones;
		this.random = mulberry32(options.seed ?? 2034);

		this.cumulative = [0];
		for (let i = 1; i < this.path.length; i++) {
			this.cumulative.push(
				this.cumulative[i - 1] + haversine(this.path[i - 1], this.path[i]),
			);
		}

		// Zone centers from their stops; boundaries halfway between neighbours.
		this.zoneCenter = SIM_ZONES.map((zone) => {
			const at = options.stops
				.filter((stop) => stop.zone === zone)
				.map((stop) => this.project(stop));
			return at.length ? at.reduce((a, b) => a + b, 0) / at.length : 0;
		});
		this.zoneBounds = [0];
		for (let i = 1; i < SIM_ZONES.length; i++) {
			this.zoneBounds.push((this.zoneCenter[i - 1] + this.zoneCenter[i]) / 2);
		}
		this.zoneBounds.push(this.length);
		this.capacity = SIM_ZONES.map(
			(zone) => options.zones.find((seed) => seed.zone === zone)?.capacity ?? 1,
		);
		const seedTotal =
			options.zones.reduce((sum, zone) => sum + zone.visitors, 0) || 1;
		this.weights = SIM_ZONES.map(
			(zone) =>
				(options.zones.find((seed) => seed.zone === zone)?.visitors ?? 0) /
				seedTotal,
		);
		this.floodAt = new Map(
			options.floodZones.map((zone) => [zone.code, this.project(zone)]),
		);

		const totalVisitors = options.zones.reduce(
			(sum, zone) => sum + zone.visitors,
			0,
		);
		this.visitorsPerAgent = Math.max(1, totalVisitors / this.agentCount);
		this.pos = new Float32Array(this.agentCount);
		this.spread = new Float32Array(this.agentCount);
		this.target = new Float32Array(this.agentCount);
		this.speed = new Float32Array(this.agentCount);
		this.dwell = new Float32Array(this.agentCount);
		this.targetZone = new Uint8Array(this.agentCount);
		this.reset();
	}

	get length(): number {
		return this.cumulative[this.cumulative.length - 1];
	}

	/** Distance along the path of the path point nearest to a place. */
	private project(place: { latitude: number; longitude: number }): number {
		let best = 0;
		let bestDistance = Number.POSITIVE_INFINITY;
		this.path.forEach(([lat, lng], index) => {
			const distance =
				(lat - place.latitude) ** 2 + (lng - place.longitude) ** 2;
			if (distance < bestDistance) {
				bestDistance = distance;
				best = index;
			}
		});
		return this.cumulative[best];
	}

	private between(min: number, max: number): number {
		return min + this.random() * (max - min);
	}

	private pointIn(zoneIndex: number): number {
		const low = this.zoneBounds[zoneIndex];
		const high = this.zoneBounds[zoneIndex + 1];
		const margin = (high - low) * 0.15;
		return this.between(low + margin, high - margin);
	}

	zoneOf(meters: number): number {
		for (let i = SIM_ZONES.length - 1; i > 0; i--) {
			if (meters >= this.zoneBounds[i]) return i;
		}
		return 0;
	}

	/** Back to the seed distribution: agents spread by each zone's visitors. */
	reset(): void {
		this.random = mulberry32(2034);
		this.blocked = [];
		this.diverting = false;
		let agent = 0;
		const total =
			this.seedZones.reduce((sum, zone) => sum + zone.visitors, 0) || 1;
		SIM_ZONES.forEach((zone, zoneIndex) => {
			const visitors =
				this.seedZones.find((seed) => seed.zone === zone)?.visitors ?? 0;
			const share = Math.round((visitors / total) * this.agentCount);
			for (let n = 0; n < share && agent < this.agentCount; n++, agent++) {
				this.place(agent, zoneIndex);
			}
		});
		for (; agent < this.agentCount; agent++)
			this.place(agent, SIM_ZONES.length - 1);
	}

	private place(agent: number, zoneIndex: number): void {
		this.pos[agent] = this.pointIn(zoneIndex);
		this.spread[agent] = this.between(-1, 1);
		this.speed[agent] = this.between(SPEED_MPS.min, SPEED_MPS.max);
		this.dwell[agent] = this.between(0, DWELL_S.max);
		this.target[agent] = this.pos[agent];
		this.targetZone[agent] = zoneIndex;
	}

	/** Zone an agent counts toward: where it rests, or where it is walking to. */
	private committedZone(agent: number): number {
		return this.dwell[agent] > 0
			? this.zoneOf(this.pos[agent])
			: this.targetZone[agent];
	}

	/** Agents per zone, resting there or walking there: what each zone is about to hold. */
	private countCommitted(): number[] {
		const counts = SIM_ZONES.map(() => 0);
		for (let i = 0; i < this.agentCount; i++) counts[this.committedZone(i)]++;
		return counts;
	}

	/** Filled once per step and kept current by sendTo, so diversion stays O(n). */
	private committed: number[] = [];

	private capAgents(zoneIndex: number): number {
		return (this.capacity[zoneIndex] * DIVERSION_CAP) / this.visitorsPerAgent;
	}

	/** Where a diverted visitor goes: Barrio Abajo, or Centro once Barrio Abajo is at its cap. */
	private diversionZone(): number | null {
		for (const zone of ["barrio_abajo", "centro"] as const) {
			const index = SIM_ZONES.indexOf(zone);
			if (this.committed[index] < this.capAgents(index)) return index;
		}
		return null;
	}

	/** Diversion runs only after malecon_saturado and while the Malecon is still saturated. */
	private maleconSaturated(): boolean {
		if (!this.diverting) return false;
		const malecon = SIM_ZONES.indexOf("gran_malecon");
		return (
			this.committed[malecon] >=
			this.capAgents(malecon) * (SATURATION_SHARE / DIVERSION_CAP)
		);
	}

	private isProtectedFull(zoneIndex: number): boolean {
		const zone = SIM_ZONES[zoneIndex];
		return (
			(zone === "barrio_abajo" || zone === "centro") &&
			this.committed[zoneIndex] >= this.capAgents(zoneIndex)
		);
	}

	/** Visitors resting in a zone or walking to it. */
	committedVisitors(zone: CorridorZone): number {
		return Math.round(
			this.countCommitted()[SIM_ZONES.indexOf(zone)] * this.visitorsPerAgent,
		);
	}

	private pickZone(): number {
		let roll = this.random();
		for (let i = 0; i < SIM_ZONES.length; i++) {
			roll -= this.weights[i];
			if (roll <= 0) return i;
		}
		return SIM_ZONES.length - 1;
	}

	private sendTo(agent: number, zoneIndex: number): void {
		if (this.committed.length) {
			this.committed[this.committedZone(agent)]--;
			this.committed[zoneIndex]++;
		}
		this.targetZone[agent] = zoneIndex;
		this.target[agent] = this.pointIn(zoneIndex);
		this.dwell[agent] = 0;
	}

	private newDestination(agent: number): void {
		const malecon = SIM_ZONES.indexOf("gran_malecon");
		let zone = this.pickZone();
		if (zone === malecon && this.maleconSaturated()) {
			zone = this.diversionZone() ?? this.zoneOf(this.pos[agent]);
		}
		// While diverting, Barrio Abajo and Centro only take people under their cap.
		if (
			this.diverting &&
			zone !== this.zoneOf(this.pos[agent]) &&
			this.isProtectedFull(zone)
		) {
			zone = this.zoneOf(this.pos[agent]);
		}
		this.sendTo(agent, zone);
	}

	/** Keeps a target out of blocked arroyos: stop before the first one on the way. */
	private safeTarget(from: number, to: number): number {
		let target = to;
		for (const [low, high] of this.blocked) {
			if (from <= low && target > low - FLOOD_BUFFER_M)
				target = Math.min(target, low - FLOOD_BUFFER_M);
			if (from >= high && target < high + FLOOD_BUFFER_M)
				target = Math.max(target, high + FLOOD_BUFFER_M);
		}
		return Math.min(Math.max(target, 0), this.length);
	}

	/**
	 * Arroyos nobody may enter: the city state's activeFloodZoneIds, which
	 * already includes arroyos still counting down.
	 */
	setBlockedFloodZones(codes: readonly string[]): void {
		this.blocked = codes.flatMap((code) => {
			const at = this.floodAt.get(code);
			const radius =
				this.floodZones.find((zone) => zone.code === code)?.radius_meters ?? 0;
			return at === undefined
				? []
				: [[at - radius, at + radius] as [number, number]];
		});
	}

	/** True if the agent is inside a blocked arroyo. Used by tests and to evacuate. */
	inBlockedArroyo(meters: number): boolean {
		return this.blocked.some(([low, high]) => meters > low && meters < high);
	}

	/** Reacts to `malecon_saturado` and `reiniciar`. Floods come through setBlockedFloodZones. */
	applyEvent(event: CityEvent): void {
		if (event.type === "reiniciar") {
			this.reset();
		} else if (event.type === "malecon_saturado") {
			this.saturateMalecon(event.capacityPct);
		}
	}

	/** Fills the Malecon to the reported occupancy, then diversion starts. */
	private saturateMalecon(capacityPct: number): void {
		const malecon = SIM_ZONES.indexOf("gran_malecon");
		const wanted =
			(this.capacity[malecon] * capacityPct) / 100 / this.visitorsPerAgent;
		let missing = Math.round(wanted - this.countCommitted()[malecon]);
		for (let i = 0; i < this.agentCount && missing > 0; i++) {
			if (
				this.zoneOf(this.pos[i]) !== malecon &&
				this.targetZone[i] !== malecon
			) {
				this.place(i, malecon);
				missing--;
			}
		}
		this.diverting = true;
	}

	/** Advances the simulation by `dt` seconds. */
	step(dt: number): void {
		const malecon = SIM_ZONES.indexOf("gran_malecon");
		this.committed = this.diverting ? this.countCommitted() : [];
		for (let i = 0; i < this.agentCount; i++) {
			const pos = this.pos[i];
			if (this.blocked.length && this.inBlockedArroyo(pos)) {
				// Inside an arroyo that just got blocked: leave by the nearest edge.
				const [low, high] = this.blocked.find(
					([a, b]) => pos > a && pos < b,
				) ?? [pos, pos];
				this.target[i] =
					pos - low < high - pos ? low - FLOOD_BUFFER_M : high + FLOOD_BUFFER_M;
				this.dwell[i] = 0;
			} else if (this.dwell[i] > 0) {
				this.dwell[i] -= dt;
				const leaving =
					this.maleconSaturated() &&
					this.zoneOf(pos) === malecon &&
					this.random() < DIVERSION_RATE * dt;
				if (leaving) {
					const zone = this.diversionZone();
					if (zone !== null) this.sendTo(i, zone);
				} else if (this.dwell[i] <= 0) {
					this.newDestination(i);
				}
				continue;
			} else {
				this.target[i] = this.safeTarget(pos, this.target[i]);
			}

			const gap = this.target[i] - pos;
			const move = this.speed[i] * dt;
			if (Math.abs(gap) <= move) {
				this.pos[i] = this.target[i];
				this.dwell[i] = this.between(DWELL_S.min, DWELL_S.max);
			} else {
				this.pos[i] = pos + Math.sign(gap) * move;
			}
		}
	}

	/**
	 * Simulated visitors per zone: people resting there or on their way there.
	 * People only passing through a zone do not count for it.
	 */
	counts(): Record<CorridorZone, number> {
		const agents = this.countCommitted();
		return Object.fromEntries(
			SIM_ZONES.map((zone, index) => [
				zone,
				Math.round(agents[index] * this.visitorsPerAgent),
			]),
		) as Record<CorridorZone, number>;
	}

	/** Writes the agent's [lat, lng] into `out`, with its sideways spread in degrees. */
	latLngOf(agent: number, out: LatLngTuple, spreadDeg = 0.00035): LatLngTuple {
		const meters = this.pos[agent];
		let low = 0;
		let high = this.cumulative.length - 1;
		while (high - low > 1) {
			const mid = (low + high) >> 1;
			if (this.cumulative[mid] <= meters) low = mid;
			else high = mid;
		}
		const span = this.cumulative[high] - this.cumulative[low] || 1;
		const t = Math.min(1, Math.max(0, (meters - this.cumulative[low]) / span));
		const [lat1, lng1] = this.path[low];
		const [lat2, lng2] = this.path[high];
		// Perpendicular to the street segment.
		const dLat = lat2 - lat1;
		const dLng = lng2 - lng1;
		const norm = Math.hypot(dLat, dLng) || 1;
		const side = this.spread[agent] * spreadDeg;
		out[0] = lat1 + dLat * t + (-dLng / norm) * side;
		out[1] = lng1 + dLng * t + (dLat / norm) * side;
		return out;
	}
}
