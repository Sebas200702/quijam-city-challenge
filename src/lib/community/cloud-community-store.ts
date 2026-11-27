// Cloud community store: Supabase shared by every resident and visitor.
// Reads go straight to Supabase (RLS hides held content from others).
// Writes of public content go through /api/community/publish, where the
// moderation triage runs before anything is stored.

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAppealMessage } from "../moderation/appeal-rules";
import type { ContentKind } from "../moderation/moderation-types";
import {
	EVENT_COLUMNS,
	PLACE_COLUMNS,
	POST_COLUMNS,
	THREAD_COLUMNS,
	toEvent,
	toPlace,
	toPost,
	toThread,
} from "./community-mappers";
import {
	filterEvents,
	validateEventInput,
	validatePostBody,
	validateProfilePatch,
	validateSignUp,
	validateThreadInput,
} from "./community-rules";
import type {
	AppealStatus,
	CommunityEvent,
	CommunityStore,
	CommunityTopic,
	EventQuery,
	ForumPost,
	ForumThread,
	ModerationAction,
	ModerationQueueItem,
	MyDataExport,
	Profile,
	ProfilePatch,
	PublishResult,
	ReportReason,
	SignUpInput,
	ThreadQuery,
} from "./community-types";

const AUTH_ERRORS: Record<string, string> = {
	"Invalid login credentials": "Correo o contraseña incorrectos.",
	"User already registered": "Ya existe una cuenta con ese correo.",
	"Email not confirmed":
		"Confirma tu correo con el enlace que te enviamos y vuelve a entrar.",
};

function friendly(error: { message: string } | null | undefined): Error {
	const message = error?.message ?? "Algo falló. Intenta de nuevo.";
	return new Error(AUTH_ERRORS[message] ?? message);
}

export function createCloudCommunityStore(
	supabase: SupabaseClient,
): CommunityStore {
	async function loadProfile(
		userId: string,
		email: string | null,
	): Promise<Profile | null> {
		const { data } = await supabase
			.from("profiles")
			.select(
				"id, display_name, neighborhood, is_visitor, is_verified_organizer",
			)
			.eq("id", userId)
			.maybeSingle();
		if (!data) return null;
		return {
			id: String(data.id),
			displayName: String(data.display_name),
			neighborhood: (data.neighborhood as string | null) ?? null,
			isVisitor: Boolean(data.is_visitor),
			email,
			isVerifiedOrganizer: Boolean(data.is_verified_organizer),
		};
	}

	async function accessToken(): Promise<string> {
		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;
		if (!token) throw new Error("Inicia sesión para continuar.");
		return token;
	}

	async function callApi<T>(
		path: string,
		init: { method: "GET" | "POST" | "DELETE"; body?: unknown },
	): Promise<T> {
		const response = await fetch(path, {
			method: init.method,
			headers: {
				Authorization: `Bearer ${await accessToken()}`,
				"Content-Type": "application/json",
			},
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
		});
		const payload = (await response.json().catch(() => ({}))) as T & {
			error?: string;
		};
		// 422 carries a moderation result (rejected), not an error.
		if (!response.ok && response.status !== 422) {
			throw new Error(payload.error ?? "Algo falló. Intenta de nuevo.");
		}
		return payload;
	}

	async function currentUserId(): Promise<string | null> {
		const { data } = await supabase.auth.getSession();
		return data.session?.user.id ?? null;
	}

	return {
		mode: "cloud",

		async getSession() {
			const { data } = await supabase.auth.getSession();
			const user = data.session?.user;
			return user ? loadProfile(user.id, user.email ?? null) : null;
		},

		onSessionChange(listener) {
			const { data } = supabase.auth.onAuthStateChange((_event, session) => {
				// Deferred: Supabase forbids awaiting its own calls inside the callback.
				setTimeout(() => {
					const user = session?.user;
					if (!user) return listener(null);
					void loadProfile(user.id, user.email ?? null).then(listener);
				}, 0);
			});
			return () => data.subscription.unsubscribe();
		},

		async signUp(input: SignUpInput) {
			const error = validateSignUp(input);
			if (error) throw new Error(error);
			const { data, error: authError } = await supabase.auth.signUp({
				email: input.email.trim(),
				password: input.password,
				options: {
					data: {
						display_name: input.displayName.trim(),
						neighborhood: input.neighborhood?.trim() || null,
						is_visitor: input.isVisitor,
					},
					emailRedirectTo: `${window.location.origin}/perfil`,
				},
			});
			if (authError) throw friendly(authError);
			if (!data.session || !data.user)
				return { profile: null, needsConfirmation: true };
			return {
				profile: await loadProfile(data.user.id, data.user.email ?? null),
				needsConfirmation: false,
			};
		},

		async signIn(email, password) {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password,
			});
			if (error || !data.user) throw friendly(error);
			const profile = await loadProfile(data.user.id, data.user.email ?? null);
			if (!profile) throw new Error("No encontramos tu perfil.");
			return profile;
		},

		async signOut() {
			await supabase.auth.signOut();
		},

		async updateProfile(patch: ProfilePatch) {
			const userId = await currentUserId();
			if (!userId) throw new Error("Inicia sesión para continuar.");
			const patchError = validateProfilePatch(patch);
			if (patchError) throw new Error(patchError);
			const { error } = await supabase
				.from("profiles")
				.update({
					display_name: patch.displayName.trim(),
					neighborhood: patch.neighborhood?.trim() || null,
					is_visitor: patch.isVisitor,
				})
				.eq("id", userId);
			if (error) throw friendly(error);
			const { data } = await supabase.auth.getUser();
			const profile = await loadProfile(userId, data.user?.email ?? null);
			if (!profile) throw new Error("No encontramos tu perfil.");
			return profile;
		},

		async listPlaces() {
			const { data, error } = await supabase
				.from("places")
				.select(PLACE_COLUMNS)
				.order("name");
			if (error) throw friendly(error);
			return (data ?? []).map(toPlace);
		},

		async getPlace(slug) {
			const { data, error } = await supabase
				.from("places")
				.select(PLACE_COLUMNS)
				.eq("slug", slug)
				.maybeSingle();
			if (error) throw friendly(error);
			return data ? toPlace(data) : null;
		},

		async listEvents(query: EventQuery = {}) {
			let request = supabase
				.from("events")
				.select(EVENT_COLUMNS)
				.neq("moderation_status", "removed")
				.order("starts_at");
			if (!query.includePast)
				request = request.gte(
					"starts_at",
					new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
				);
			if (query.category) request = request.eq("category", query.category);
			if (query.placeId) request = request.eq("place_id", query.placeId);
			if (query.organizerId)
				request = request.eq("organizer_id", query.organizerId);
			if (query.ids) request = request.in("id", query.ids);
			const { data, error } = await request.limit(200);
			if (error) throw friendly(error);
			// Search, the "already ended" cut and the limit are applied in one place.
			return filterEvents((data ?? []).map(toEvent), query);
		},

		async getEvent(id) {
			const { data, error } = await supabase
				.from("events")
				.select(EVENT_COLUMNS)
				.eq("id", id)
				.neq("moderation_status", "removed")
				.maybeSingle();
			if (error) throw friendly(error);
			return data ? toEvent(data) : null;
		},

		async createEvent(input) {
			const error = validateEventInput(input);
			if (error) throw new Error(error);
			return callApi<PublishResult<CommunityEvent>>("/api/community/publish", {
				method: "POST",
				body: { kind: "event", input },
			});
		},

		async cancelEvent(id) {
			const { error } = await supabase
				.from("events")
				.update({ status: "cancelled" })
				.eq("id", id);
			if (error) throw friendly(error);
		},

		async myRegistrations() {
			const userId = await currentUserId();
			if (!userId) return [];
			const { data, error } = await supabase
				.from("event_registrations")
				.select("event_id")
				.eq("user_id", userId);
			if (error) throw friendly(error);
			return (data ?? []).map((row) => String(row.event_id));
		},

		async register(eventId) {
			const userId = await currentUserId();
			if (!userId) throw new Error("Inicia sesión para inscribirte.");
			const { error } = await supabase
				.from("event_registrations")
				.insert({ event_id: eventId, user_id: userId });
			// 23505: already registered, which is what the person wanted anyway.
			if (error && error.code !== "23505") throw friendly(error);
		},

		async myWaitlist() {
			const userId = await currentUserId();
			if (!userId) return [];
			const { data, error } = await supabase
				.from("event_waitlist")
				.select("event_id")
				.eq("user_id", userId);
			// A deployment without the migration simply has no waiting lists yet.
			if (error) return [];
			return (data ?? []).map((row) => String(row.event_id));
		},

		async joinWaitlist(eventId) {
			const userId = await currentUserId();
			if (!userId)
				throw new Error("Inicia sesión para anotarte en la lista de espera.");
			const { error } = await supabase.rpc("join_waitlist", {
				p_event_id: eventId,
			});
			if (error) throw friendly(error);
		},

		async leaveWaitlist(eventId) {
			const userId = await currentUserId();
			if (!userId) throw new Error("Inicia sesión para continuar.");
			const { error } = await supabase
				.from("event_waitlist")
				.delete()
				.eq("event_id", eventId)
				.eq("user_id", userId);
			if (error) throw friendly(error);
		},

		async unregister(eventId) {
			const userId = await currentUserId();
			if (!userId) throw new Error("Inicia sesión para continuar.");
			const { error } = await supabase
				.from("event_registrations")
				.delete()
				.eq("event_id", eventId)
				.eq("user_id", userId);
			if (error) throw friendly(error);
		},

		async listThreads(query: ThreadQuery = {}) {
			let request = supabase
				.from("forum_threads")
				.select(THREAD_COLUMNS)
				.neq("moderation_status", "removed")
				.order("last_activity_at", { ascending: false });
			if (query.category) request = request.eq("category", query.category);
			if (query.placeId) request = request.eq("place_id", query.placeId);
			if (query.eventId) request = request.eq("event_id", query.eventId);
			if (query.authorId) request = request.eq("author_id", query.authorId);
			const { data, error } = await request.limit(query.limit ?? 100);
			if (error) throw friendly(error);
			return (data ?? []).map(toThread);
		},

		async getThread(id) {
			const { data, error } = await supabase
				.from("forum_threads")
				.select(THREAD_COLUMNS)
				.eq("id", id)
				.neq("moderation_status", "removed")
				.maybeSingle();
			if (error) throw friendly(error);
			return data ? toThread(data) : null;
		},

		async createThread(input) {
			const error = validateThreadInput(input);
			if (error) throw new Error(error);
			return callApi<PublishResult<ForumThread>>("/api/community/publish", {
				method: "POST",
				body: { kind: "thread", input },
			});
		},

		async listPosts(threadId) {
			const { data, error } = await supabase
				.from("forum_posts")
				.select(POST_COLUMNS)
				.eq("thread_id", threadId)
				.neq("moderation_status", "removed")
				.order("created_at");
			if (error) throw friendly(error);
			return (data ?? []).map(toPost);
		},

		async createPost(threadId, body) {
			const error = validatePostBody(body);
			if (error) throw new Error(error);
			return callApi<PublishResult<ForumPost>>("/api/community/publish", {
				method: "POST",
				body: { kind: "post", threadId, body },
			});
		},

		async canModerate() {
			const userId = await currentUserId();
			if (!userId) return false;
			const { data } = await supabase
				.from("user_profiles")
				.select("role")
				.eq("user_id", userId)
				.maybeSingle();
			return data?.role === "city";
		},

		async listModerationQueue() {
			const { items } = await callApi<{ items: ModerationQueueItem[] }>(
				"/api/community/moderation",
				{ method: "GET" },
			);
			return items;
		},

		async moderate(kind: ContentKind, id: string, action: ModerationAction) {
			await callApi("/api/community/moderation", {
				method: "POST",
				body: { kind, id, action },
			});
		},

		async listMyRemoved() {
			const userId = await currentUserId();
			if (!userId) return [];
			const [events, threads, posts, appeals] = await Promise.all([
				supabase
					.from("events")
					.select("id, title")
					.eq("organizer_id", userId)
					.eq("moderation_status", "removed"),
				supabase
					.from("forum_threads")
					.select("id, title")
					.eq("author_id", userId)
					.eq("moderation_status", "removed"),
				supabase
					.from("forum_posts")
					.select("id, body")
					.eq("author_id", userId)
					.eq("moderation_status", "removed"),
				supabase
					.from("moderation_appeals")
					.select("kind, content_id, status")
					.eq("appellant_id", userId),
			]);
			const status = new Map(
				(appeals.data ?? []).map((row) => [
					`${row.kind}:${row.content_id}`,
					row.status as AppealStatus,
				]),
			);
			const item = (kind: ContentKind, id: unknown, title: unknown) => ({
				kind,
				id: String(id),
				title: String(title).slice(0, 80),
				appealStatus: status.get(`${kind}:${id}`) ?? null,
			});
			return [
				...(events.data ?? []).map((r) => item("event", r.id, r.title)),
				...(threads.data ?? []).map((r) => item("thread", r.id, r.title)),
				...(posts.data ?? []).map((r) => item("post", r.id, r.body)),
			];
		},

		async appeal(kind, id, message) {
			const check = checkAppealMessage(message);
			if (!check.ok) throw new Error(check.error);
			const { error } = await supabase.rpc("request_appeal", {
				p_kind: kind,
				p_content_id: id,
				p_message: check.message,
			});
			if (error) throw friendly(error);
		},

		async reportContent(kind, id, reason) {
			const userId = await currentUserId();
			if (!userId) throw new Error("Inicia sesión para reportar.");
			const { error } = await supabase.from("content_reports").insert({
				kind,
				content_id: id,
				reporter_id: userId,
				reason,
			});
			// 23505: this person already reported it; nothing else to do.
			if (error && error.code !== "23505") throw friendly(error);
		},

		async exportMyData(): Promise<MyDataExport> {
			const { data: session } = await supabase.auth.getSession();
			const user = session.session?.user;
			if (!user) throw new Error("Inicia sesión para descargar tus datos.");
			const profile = await loadProfile(user.id, user.email ?? null);
			if (!profile) throw new Error("No encontramos tu perfil.");
			const [registrations, organized, threads, posts, reports] =
				await Promise.all([
					supabase
						.from("event_registrations")
						.select(`event:events(${EVENT_COLUMNS})`)
						.eq("user_id", user.id),
					supabase
						.from("events")
						.select(EVENT_COLUMNS)
						.eq("organizer_id", user.id),
					supabase
						.from("forum_threads")
						.select(THREAD_COLUMNS)
						.eq("author_id", user.id),
					supabase
						.from("forum_posts")
						.select(POST_COLUMNS)
						.eq("author_id", user.id),
					supabase
						.from("content_reports")
						.select("kind, content_id, reason, created_at")
						.eq("reporter_id", user.id),
				]);
			const error =
				registrations.error ??
				organized.error ??
				threads.error ??
				posts.error ??
				reports.error;
			if (error) throw friendly(error);
			return {
				exportedAt: new Date().toISOString(),
				profile,
				registrations: (registrations.data ?? []).flatMap((row) => {
					const event = (row as { event: unknown }).event;
					return event && typeof event === "object"
						? [toEvent(event as Record<string, unknown>)]
						: [];
				}),
				organizedEvents: (organized.data ?? []).map(toEvent),
				threads: (threads.data ?? []).map(toThread),
				posts: (posts.data ?? []).map(toPost),
				reports: (reports.data ?? []).map((row) => ({
					kind: row.kind as ContentKind,
					contentId: String(row.content_id),
					reason: row.reason as ReportReason,
					createdAt: String(row.created_at),
				})),
			};
		},

		async deleteAccount() {
			await callApi("/api/community/account", { method: "DELETE" });
			await supabase.auth.signOut();
		},

		subscribe(topic: CommunityTopic, listener) {
			const tables =
				topic === "events" ? ["events"] : ["forum_threads", "forum_posts"];
			const channel = supabase.channel(
				`community-${topic}-${crypto.randomUUID()}`,
			);
			for (const table of tables) {
				channel.on(
					"postgres_changes",
					{ event: "*", schema: "public", table },
					() => listener(),
				);
			}
			channel.subscribe();
			return () => {
				void supabase.removeChannel(channel);
			};
		},
	};
}
