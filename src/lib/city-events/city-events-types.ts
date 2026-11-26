// Shared contract of the `city-events` Realtime channel. Defined in the scaling epic (#57).
// Nobody redefines these types: a new event type is added to the epic first.

export type CityEvent =
	| { type: "aguacero"; zoneIds: string[]; startsInMin: number }
	| { type: "malecon_saturado"; capacityPct: number }
	| { type: "cobro_abusivo"; reportId: string }
	| { type: "modo_ciudad"; mode: "mundial" | "carnaval" | "cotidiano" }
	| { type: "tiempo"; hour: number } // 8 a 23, línea de tiempo
	| { type: "reiniciar" };
