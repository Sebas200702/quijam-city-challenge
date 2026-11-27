import { describe, expect, it } from "vitest";
import { PLACES } from "../community/places-catalog";
import { CORRIDOR_SEED } from "../corridor/corridor-seed";
import { resolveRouteTarget } from "../map/route-target";
import { OPENABLE_SCREENS } from "./assistant-agents";
import { answer } from "./assistant-server";
import type { AssistantRequest, AssistantToolCall } from "./assistant-types";
import { answerLocally } from "./local-agents";
import type { ScreenContext } from "./screen-context-types";
import {
	OPENABLE_PATHS,
	routeDestination,
	safeOpenPath,
	sanitizeUiAction,
	sanitizeUiActions,
	uiActionHref,
	uiActionsForCalls,
	whenFromDaysAhead,
} from "./ui-actions";

const call = <N extends AssistantToolCall["name"]>(
	name: N,
	args: AssistantToolCall<N>["args"],
	id = "c1",
): AssistantToolCall => ({ id, name, args }) as AssistantToolCall;

describe("sanitizeUiAction (whitelist)", () => {
	it("keeps known actions with valid values", () => {
		expect(
			sanitizeUiAction({
				type: "agenda.filter",
				categoria: "music",
				fecha: "hoy",
				q: "  salsa  ",
			}),
		).toEqual({
			type: "agenda.filter",
			categoria: "music",
			fecha: "hoy",
			q: "salsa",
		});
		expect(
			sanitizeUiAction({
				type: "map.showRoute",
				destino: "estadio",
				navigate: true,
			}),
		).toEqual({ type: "map.showRoute", destino: "estadio", navigate: true });
	});

	it("drops unknown types, unknown values and extra fields", () => {
		expect(sanitizeUiAction({ type: "db.delete", table: "events" })).toBeNull();
		expect(
			sanitizeUiAction({ type: "agenda.filter", categoria: "drugs" }),
		).toBeNull();
		expect(
			sanitizeUiAction({ type: "map.showRoute", destino: "<script>" }),
		).toBeNull();
		// The map resolves place slugs and stop codes beyond the 3 named destinations.
		expect(
			sanitizeUiAction({ type: "map.showRoute", destino: "parque-cultural" }),
		).toEqual({ type: "map.showRoute", destino: "parque-cultural" });
		expect(
			sanitizeUiAction({ type: "places.filter", tipo: "park", onclick: "x" }),
		).toEqual({ type: "places.filter", tipo: "park" });
	});

	it("keeps map actions inside the metro area", () => {
		expect(
			sanitizeUiAction({ type: "map.flyTo", lat: 4.6, lng: -74.08 }),
		).toBeNull();
		expect(
			sanitizeUiAction({
				type: "map.drop",
				pins: [
					{ lat: 11.0, lng: -74.8, label: "Malecón", kind: "place" },
					{ lat: 40.7, lng: -74.0, label: "Lejos", kind: "place" },
					{ lat: 11.0, lng: -74.8, label: "<b>x</b>", kind: "script" },
				],
			}),
		).toEqual({
			type: "map.drop",
			pins: [{ lat: 11.0, lng: -74.8, label: "Malecón", kind: "place" }],
		});
	});

	it("only prefills known form fields with a valid shape", () => {
		expect(
			sanitizeUiAction({
				type: "form.prefill",
				form: "event",
				fields: {
					title: "Limpieza del arroyo",
					date: "sábado",
					startTime: "08:00",
					password: "x",
				},
			}),
		).toEqual({
			type: "form.prefill",
			form: "event",
			fields: { title: "Limpieza del arroyo", startTime: "08:00" },
		});
		// A reply always names its conversation.
		expect(
			sanitizeUiAction({
				type: "form.prefill",
				form: "reply",
				fields: { body: "Hola" },
			}),
		).toBeNull();
	});

	it("opens only the app's own sections", () => {
		expect(safeOpenPath("/agenda?categoria=music")).toBe(
			"/agenda?categoria=music",
		);
		expect(safeOpenPath("//evil.example")).toBeNull();
		expect(safeOpenPath("https://evil.example")).toBeNull();
		expect(safeOpenPath("/api/community/publish")).toBeNull();
		expect(safeOpenPath("/agenda\\..\\api")).toBeNull();
		expect(sanitizeUiAction({ type: "ui.focus", target: "body" })).toBeNull();
	});

	it("opens the city data screen and the detail screens", () => {
		for (const path of [
			"/ciudad",
			"/agenda/nuevo",
			"/agenda/",
			"/lugares/gran-malecon",
			"/foro/abc-123",
		]) {
			expect(safeOpenPath(path)).toBe(path);
		}
		expect(sanitizeUiAction({ type: "ui.open", path: "/ciudad" })).toEqual({
			type: "ui.open",
			path: "/ciudad",
		});
		expect(safeOpenPath("/ciudadela")).toBeNull();
		expect(safeOpenPath("/ciudad/otra")).toBeNull();
		expect(safeOpenPath("/lugares/a/b")).toBeNull();
	});

	it("never opens a role portal: their entry URLs write on load", () => {
		for (const path of [
			"/vendedor",
			"/vendedor/entrar?alta=0123456789abcdef0123456789abcdef0123",
			"/presentador",
			"/presentador/entrar?key=secret",
			"/anfitrion",
			"/moderacion",
		]) {
			expect(safeOpenPath(path)).toBeNull();
			expect(sanitizeUiAction({ type: "ui.open", path })).toBeNull();
		}
	});

	it("passes only each screen's own filter and prefill keys", () => {
		for (const path of [
			"/agenda?q=salsa&categoria=music&fecha=hoy",
			"/lugares?tipo=park",
			"/mapa?destino=estadio",
			"/reportar?monto=8000&vehiculo=taxi",
			"/agenda/nuevo?titulo=Cine&fecha=2026-12-05",
			"/foro?nuevo=1&titulo=Hola",
			"/foro/abc?respuesta=Gracias",
		]) {
			expect(safeOpenPath(path)).toBe(path);
		}
		for (const path of [
			// An in-app redirect after sign-in could lead to a portal entry URL.
			"/perfil?volver=/vendedor/entrar",
			"/perfil?code=abc",
			"/inicio?origen=qr",
			"/agenda?alta=1",
			"/lugares/gran-malecon?key=x",
		]) {
			expect(safeOpenPath(path)).toBeNull();
		}
	});

	it("opens exactly the screens the model is told about", () => {
		for (const path of OPENABLE_SCREENS) expect(safeOpenPath(path)).toBe(path);
		for (const path of OPENABLE_PATHS) {
			expect(OPENABLE_SCREENS as readonly string[]).toContain(path);
		}
	});

	it("keeps whole-app controls only with valid values", () => {
		expect(
			sanitizeUiAction({ type: "app.language", language: "en", fromCall: "c" }),
		).toEqual({ type: "app.language", language: "en", fromCall: "c" });
		expect(
			sanitizeUiAction({ type: "app.language", language: "de" }),
		).toBeNull();
		expect(sanitizeUiAction({ type: "app.language" })).toBeNull();
		expect(sanitizeUiAction({ type: "app.theme", theme: "dark" })).toEqual({
			type: "app.theme",
			theme: "dark",
		});
		expect(sanitizeUiAction({ type: "app.theme", theme: "neon" })).toBeNull();
		// `navigate` and extra fields mean nothing for them.
		expect(
			sanitizeUiAction({ type: "app.back", navigate: true, href: "/x" }),
		).toEqual({ type: "app.back" });
	});

	it("bounds the list and skips non-arrays", () => {
		expect(sanitizeUiActions("nope")).toEqual([]);
		const many = Array.from({ length: 20 }, () => ({
			type: "ui.focus",
			target: "map",
		}));
		expect(sanitizeUiActions(many)).toEqual([]);
		const valid = Array.from({ length: 20 }, () => ({
			type: "ui.focus",
			target: "agenda-results",
		}));
		expect(sanitizeUiActions(valid)).toHaveLength(8);
	});
});

describe("uiActionHref", () => {
	it("makes every screen addressable by URL", () => {
		expect(
			uiActionHref({
				type: "agenda.filter",
				categoria: "nature",
				fecha: "finde",
			}),
		).toBe("/agenda?categoria=nature&fecha=finde");
		expect(uiActionHref({ type: "places.filter", tipo: "park" })).toBe(
			"/lugares?tipo=park",
		);
		expect(uiActionHref({ type: "map.showRoute", destino: "centro" })).toBe(
			"/mapa?destino=centro",
		);
		expect(
			uiActionHref({
				type: "form.prefill",
				form: "overcharge",
				fields: { amount: "20000", vehicle: "taxi" },
			}),
		).toBe("/reportar?monto=20000&vehiculo=taxi");
		expect(
			uiActionHref({ type: "ui.focus", target: "event-actions" }),
		).toBeNull();
		// Whole-app controls apply on any screen.
		expect(uiActionHref({ type: "app.language", language: "fr" })).toBeNull();
		expect(uiActionHref({ type: "app.theme", theme: "dark" })).toBeNull();
		expect(uiActionHref({ type: "app.back" })).toBeNull();
	});

	it("follows the shared URL contracts of the other screens", () => {
		// /mapa?lugar= or ?lat=&lng=&zoom= (metro-area map, map-url.ts).
		expect(
			uiActionHref({
				type: "map.flyTo",
				lat: 11.0075,
				lng: -74.7815,
				zoom: 16,
				lugar: "gran-malecon",
			}),
		).toBe("/mapa?lugar=gran-malecon");
		expect(
			uiActionHref({
				type: "map.flyTo",
				lat: 11.0075,
				lng: -74.7815,
				zoom: 16,
			}),
		).toBe("/mapa?lat=11.00750&lng=-74.78150&zoom=16");
		// /agenda/nuevo?titulo=&fecha=&hora=&lugar=&costo=&cupos=&descripcion=
		expect(
			uiActionHref({
				type: "form.prefill",
				form: "event",
				fields: {
					title: "Limpieza",
					date: "2026-11-28",
					startTime: "08:00",
					place: "gran-malecon",
					price: "0",
					capacity: "40",
				},
			}),
		).toBe(
			"/agenda/nuevo?titulo=Limpieza&fecha=2026-11-28&hora=08%3A00&lugar=gran-malecon&costo=0&cupos=40",
		);
		// /reportar?segment=&monto=&vehiculo=&codigo=&notas=
		expect(
			uiActionHref({
				type: "form.prefill",
				form: "overcharge",
				fields: { amount: "20000", driverCode: "TX-12", notes: "De noche" },
			}),
		).toBe("/reportar?monto=20000&codigo=TX-12&notas=De+noche");
	});
});

describe("uiActionsForCalls (derived on the server)", () => {
	it("turns a search into an agenda filter", () => {
		expect(
			uiActionsForCalls(
				[call("search_events", { category: "nature", days_ahead: 3 })],
				"planes de naturaleza este finde",
			),
		).toEqual([
			{
				type: "agenda.filter",
				fromCall: "c1",
				categoria: "nature",
				fecha: "finde",
			},
		]);
	});

	it("asks to open the map for a route", () => {
		expect(
			uiActionsForCalls([call("plan_route", { destination: "estadio" })], ""),
		).toEqual([
			{
				type: "map.showRoute",
				fromCall: "c1",
				destino: "estadio",
				navigate: true,
			},
		]);
	});

	it("opens the map on the place when the person asks how to get there", () => {
		const actions = uiActionsForCalls(
			[call("get_directions", { place_slug: "gran-malecon" })],
			"llévame al Malecón",
		);
		const fly = actions.find((action) => action.type === "map.flyTo");
		expect(fly).toMatchObject({ lugar: "gran-malecon", navigate: true });
		expect(fly && uiActionHref(fly)).toBe("/mapa?lugar=gran-malecon");
		const place = uiActionsForCalls(
			[call("get_place", { place_slug: "gran-malecon" })],
			"",
		).find((action) => action.type === "map.flyTo");
		expect(place?.navigate).toBeUndefined();
	});

	it("prefills capacity and price of an event draft", () => {
		const [prefill] = uiActionsForCalls(
			[
				call("create_event", {
					title: "Noche de salsa",
					description: "Noche de salsa en el Malecón",
					category: "music",
					starts_at_local: "2026-12-05T20:00",
					capacity: 40,
					price_cop: 15000,
				}),
			],
			"",
		);
		expect(prefill).toMatchObject({
			type: "form.prefill",
			fields: { capacity: "40", price: "15000" },
		});
	});

	it("drops a pin and flies to a catalog place", () => {
		const actions = uiActionsForCalls(
			[call("get_place", { place_slug: "gran-malecon" })],
			"",
		);
		expect(actions.map((action) => action.type)).toEqual([
			"map.drop",
			"map.flyTo",
		]);
	});

	it("mirrors a reply only into the conversation on screen", () => {
		const screen: ScreenContext = {
			route: "/foro/[id]",
			title: "x",
			role: "visitor",
			entity: { kind: "thread", id: "t-1", name: "x" },
		};
		const reply = call("reply_to_thread", { thread_id: "t-1", body: "¡Voy!" });
		expect(uiActionsForCalls([reply], "", screen)).toEqual([
			{
				type: "form.prefill",
				fromCall: "c1",
				form: "reply",
				fields: { body: "¡Voy!" },
				threadId: "t-1",
			},
		]);
		const other = call("reply_to_thread", { thread_id: "t-2", body: "x" });
		expect(uiActionsForCalls([other], "", screen)).toEqual([]);
	});

	it("lets the model filter the agenda on screen, or just open it", () => {
		expect(
			uiActionsForCalls(
				[call("filter_agenda", { category: "music", when: "finde" })],
				"",
			),
		).toEqual([
			{
				type: "agenda.filter",
				fromCall: "c1",
				categoria: "music",
				fecha: "finde",
				navigate: true,
			},
		]);
		expect(
			uiActionsForCalls([call("filter_agenda", { query: "  salsa " })], ""),
		).toEqual([
			{ type: "agenda.filter", fromCall: "c1", q: "salsa", navigate: true },
		]);
		expect(
			uiActionsForCalls([call("filter_agenda", { query: "   " })], ""),
		).toEqual([{ type: "ui.open", fromCall: "c1", path: "/agenda" }]);
	});

	it("lets the model filter the places on screen, or just open them", () => {
		expect(
			uiActionsForCalls([call("filter_places", { kind: "park" })], ""),
		).toEqual([
			{ type: "places.filter", fromCall: "c1", tipo: "park", navigate: true },
		]);
		expect(uiActionsForCalls([call("filter_places", {})], "")).toEqual([
			{ type: "ui.open", fromCall: "c1", path: "/lugares" },
		]);
	});

	it("shows a catalog place on the map, opening it", () => {
		const actions = uiActionsForCalls(
			[call("show_on_map", { place_slug: "gran-malecon" })],
			"",
		);
		expect(actions.map((action) => action.type)).toEqual([
			"map.drop",
			"map.flyTo",
		]);
		expect(actions[1]).toMatchObject({
			zoom: 16,
			lugar: "gran-malecon",
			navigate: true,
		});
		expect(
			uiActionsForCalls([call("show_on_map", { place_slug: "nope" })], ""),
		).toEqual([]);
	});

	it("draws a route to any destination the map resolves", () => {
		expect(
			uiActionsForCalls(
				[call("show_route", { destination: "parque-washington" })],
				"",
			),
		).toEqual([
			{
				type: "map.showRoute",
				fromCall: "c1",
				destino: "parque-washington",
				navigate: true,
			},
		]);
		// A place written by its name becomes its slug.
		expect(
			uiActionsForCalls(
				[call("show_route", { destination: "Gran Malecón del Río" })],
				"",
			),
		).toMatchObject([{ destino: "gran-malecon" }]);
		// Named destinations as people write them become the map's own keys.
		expect(
			uiActionsForCalls([call("show_route", { destination: "Centro" })], ""),
		).toMatchObject([{ destino: "centro" }]);
		expect(
			uiActionsForCalls([call("show_route", { destination: "¿?" })], ""),
		).toEqual([]);
		// The map could not place it: no action, the tool reports the failure.
		expect(
			uiActionsForCalls([call("show_route", { destination: "Atlántida" })], ""),
		).toEqual([]);
	});

	it("normalizes route destinations to keys the map resolves", () => {
		const catalog = {
			stops: CORRIDOR_SEED.stops,
			places: PLACES,
			segments: CORRIDOR_SEED.segments,
		};
		const cases: [string, string][] = [
			["Centro", "centro"],
			["Estadio", "estadio"],
			["Estadio Metropolitano", "estadio"],
			["Barrio Abajo", "barrio_abajo"],
			["barrio-abajo", "barrio_abajo"],
			["al centro", "centro"],
			["stop-centro", "STOP-CENTRO"],
			["STOP-MALECON-NORTE", "STOP-MALECON-NORTE"],
			["el Malecón", "gran-malecon"],
			["Parque Washington", "parque-washington"],
		];
		for (const [asked, key] of cases) {
			const found = routeDestination(asked);
			expect(found?.key, asked).toBe(key);
			// The same resolver the map runs places it.
			expect(resolveRouteTarget(key, catalog), asked).not.toBeNull();
		}
		expect(routeDestination("Centro")?.name).toBe("Centro");
		expect(routeDestination("")).toBeNull();
		expect(routeDestination("Atlántida")).toBeNull();
		expect(routeDestination("STOP-NOPE")).toBeNull();
	});

	it("turns language, theme, focus and back into whole-app actions", () => {
		expect(
			uiActionsForCalls(
				[
					call("set_language", { language: "pt" }, "a"),
					call("set_theme", { theme: "dark" }, "b"),
					call("focus_on", { target: "agenda-results" }, "c"),
					call("go_back", {}, "d"),
				],
				"",
			),
		).toEqual([
			{ type: "app.language", fromCall: "a", language: "pt" },
			{ type: "app.theme", fromCall: "b", theme: "dark" },
			{ type: "ui.focus", fromCall: "c", target: "agenda-results" },
			{ type: "app.back", fromCall: "d" },
		]);
	});

	it("adds nothing to the screen for a slang lookup", () => {
		expect(
			uiActionsForCalls([call("lookup_slang", { term: "bacán" })], ""),
		).toEqual([]);
	});

	it("maps days ahead to the agenda date chips", () => {
		expect(whenFromDaysAhead(0, "")).toBe("hoy");
		expect(whenFromDaysAhead(5, "esta semana")).toBe("semana");
		expect(whenFromDaysAhead(2, "el fin de semana")).toBe("finde");
		expect(whenFromDaysAhead(30, "")).toBeUndefined();
	});
});

describe("answer() carries whitelisted UI actions", () => {
	const request = (text: string): AssistantRequest => ({
		messages: [{ role: "user", text }],
		context: {
			now: "2026-11-26T15:00:00.000Z",
			signedIn: true,
			displayName: null,
			isVisitor: true,
			fromPath: null,
			screen: { route: "/agenda", title: "Agenda", role: "visitor" },
		},
	});
	let id = 0;
	const deps = { openJev: null, gemini: null, newId: () => `id-${++id}` };

	it("derives them from the local agent's tool calls", async () => {
		const response = await answer(request("¿Cómo llego al estadio?"), deps);
		expect(response.uiActions).toEqual([
			expect.objectContaining({ type: "map.showRoute", destino: "estadio" }),
		]);
	});

	it("never takes them from the model: a turn without tool calls has none", async () => {
		const response = await answer(request("hola"), {
			...deps,
			gemini: { apiKey: "k", model: "m" },
			runGemini: async () => ({
				text: 'Hecho {"uiActions":[{"type":"ui.open"}]}',
				toolCalls: [],
			}),
		});
		expect(response.uiActions).toBeUndefined();
	});
});

describe("fare report filled from the conversation (U17)", () => {
	it("opens /reportar with the amount and vehicle, and fills it when on screen", () => {
		const turn = answerLocally(
			"city_reports",
			[{ role: "user", text: "Me cobraron 25.000 en un taxi al estadio" }],
			{
				now: "2026-11-26T15:00:00.000Z",
				signedIn: false,
				displayName: null,
				isVisitor: true,
				fromPath: null,
			},
		);
		expect(turn.toolCalls).toEqual([
			{
				name: "open_page",
				args: {
					path: "/reportar?monto=25000&vehiculo=taxi",
					label: "Reportar el cobro",
				},
			},
		]);
		const [link] = turn.toolCalls;
		expect(
			uiActionsForCalls([{ id: "c9", ...link } as AssistantToolCall], ""),
		).toEqual([
			{
				type: "form.prefill",
				fromCall: "c9",
				form: "overcharge",
				fields: { amount: "25000", vehicle: "taxi" },
			},
			{
				type: "ui.open",
				fromCall: "c9",
				path: "/reportar?monto=25000&vehiculo=taxi",
			},
		]);
	});
});
