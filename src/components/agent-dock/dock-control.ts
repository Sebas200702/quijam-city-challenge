// Lets any button on the page open the agent dock (optionally with a question),
// instead of sending the person to /inicio (audit v2, U03 and U04).

export interface DockRequest {
	/** Question to send right away, e.g. "¿Cómo llego a este evento?". */
	ask?: string;
}

type Listener = (request: DockRequest) => void;

const listeners = new Set<Listener>();

/** The dock calls this while it is mounted. */
export function onDockRequest(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Opens the dock; false when the page has no dock (the caller falls back). */
export function openDock(request: DockRequest = {}): boolean {
	if (listeners.size === 0) return false;
	for (const listener of listeners) listener(request);
	return true;
}
