import { Component, type ReactNode } from "react";

interface MapErrorBoundaryProps {
	/** What to show when the map throws: never a blank screen (rule 9). */
	fallback: ReactNode;
	children: ReactNode;
}

interface MapErrorBoundaryState {
	failed: boolean;
}

/** Catches a crash in the corridor map so the shell, the menu and the Guide keep working. */
export class MapErrorBoundary extends Component<
	MapErrorBoundaryProps,
	MapErrorBoundaryState
> {
	state: MapErrorBoundaryState = { failed: false };

	static getDerivedStateFromError(): MapErrorBoundaryState {
		return { failed: true };
	}

	componentDidCatch(error: unknown) {
		console.error("Corridor map failed", error);
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
