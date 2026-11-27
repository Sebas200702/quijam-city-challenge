import { useEffect, useState } from "react";

/** Browser network status; true until the browser says otherwise. */
export function useOnlineStatus(): boolean {
	const [online, setOnline] = useState(() =>
		typeof navigator === "undefined" ? true : navigator.onLine,
	);

	useEffect(() => {
		const goOnline = () => setOnline(true);
		const goOffline = () => setOnline(false);
		window.addEventListener("online", goOnline);
		window.addEventListener("offline", goOffline);
		return () => {
			window.removeEventListener("online", goOnline);
			window.removeEventListener("offline", goOffline);
		};
	}, []);

	return online;
}
