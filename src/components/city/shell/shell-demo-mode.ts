// Reads the dev-only /ciudad?demo[=offline|loading|empty|error] preview flag.

export type ShellDemoMode =
	| "normal"
	| "offline"
	| "loading"
	| "empty"
	| "error";

export function readShellDemoMode(search: string): ShellDemoMode | null {
	const params = new URLSearchParams(search);
	if (!params.has("demo")) return null;
	const value = params.get("demo");
	const modes: ShellDemoMode[] = ["offline", "loading", "empty", "error"];
	return modes.find((mode) => mode === value) ?? "normal";
}
