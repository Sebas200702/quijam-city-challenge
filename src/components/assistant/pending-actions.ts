// Which waiting actions may be cancelled or abandoned. An action the person
// already confirmed is running: it may have happened, so only its real result
// may settle it, never a "declined" placeholder.

export function canDropPending(running: boolean): boolean {
	return !running;
}

/**
 * Splits waiting actions into the ones to drop (as declined) and the ones to
 * keep. With `ids`, only those calls are candidates to drop.
 */
export function partitionPending<T extends { id: string }>(
	calls: readonly T[],
	running: ReadonlySet<string>,
	ids?: readonly string[],
): { kept: T[]; dropped: T[] } {
	const kept: T[] = [];
	const dropped: T[] = [];
	for (const call of calls) {
		const candidate = !ids || ids.includes(call.id);
		if (candidate && canDropPending(running.has(call.id))) dropped.push(call);
		else kept.push(call);
	}
	return { kept, dropped };
}
