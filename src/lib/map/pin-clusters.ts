// Groups map pins that would overlap on screen (docs/30, U32). Pure: it works on
// screen pixels, so it is the same at every zoom and needs no map library.
// Greedy and stable: items are taken in their given order; each free item starts a
// group and pulls in every free item within `radius` pixels of it. Fine for the few
// hundred pins the map holds.

export interface ClusterItem {
	key: string;
	/** Screen position in pixels. */
	x: number;
	y: number;
	/** Layer the pin belongs to ("stops", "places"…), counted per group. */
	group: string;
}

export interface PinCluster {
	keys: string[];
	/** Centre of the members, in pixels. */
	x: number;
	y: number;
	/** How many members each layer has. */
	groups: Record<string, number>;
}

/**
 * Clusters items closer than `radius` pixels. Items whose key is in `keep` (the
 * selected pin) always stay alone, so the selection never disappears into a group.
 */
export function clusterPins(
	items: readonly ClusterItem[],
	radius: number,
	keep: ReadonlySet<string> = new Set(),
): PinCluster[] {
	const taken = new Set<string>();
	const clusters: PinCluster[] = [];
	const limit = radius * radius;
	const single = (item: ClusterItem): PinCluster => ({
		keys: [item.key],
		x: item.x,
		y: item.y,
		groups: { [item.group]: 1 },
	});
	for (const item of items) {
		if (!keep.has(item.key)) continue;
		taken.add(item.key);
		clusters.push(single(item));
	}
	for (const seed of items) {
		if (taken.has(seed.key)) continue;
		taken.add(seed.key);
		const members = [seed];
		for (const other of items) {
			if (taken.has(other.key)) continue;
			const dx = other.x - seed.x;
			const dy = other.y - seed.y;
			if (dx * dx + dy * dy <= limit) {
				taken.add(other.key);
				members.push(other);
			}
		}
		if (members.length === 1) {
			clusters.push(single(seed));
			continue;
		}
		const groups: Record<string, number> = {};
		let x = 0;
		let y = 0;
		for (const member of members) {
			groups[member.group] = (groups[member.group] ?? 0) + 1;
			x += member.x;
			y += member.y;
		}
		clusters.push({
			keys: members.map((member) => member.key),
			x: x / members.length,
			y: y / members.length,
			groups,
		});
	}
	return clusters;
}
