// Shared types for the community layer: places, events, registrations and forum.

import type {
	ContentKind,
	ModerationLabel,
	ModerationSource,
	ModerationStatus,
	TriagePriority,
} from "../moderation/moderation-types";

/** Moderation state every piece of user content carries. */
export interface Moderated {
	moderationStatus: ModerationStatus;
	triagePriority: TriagePriority;
}

export type PlaceKind =
	| "nature"
	| "park"
	| "culture"
	| "heritage"
	| "sport"
	| "waterfront";

export interface Place {
	id: string;
	slug: string;
	name: string;
	kind: PlaceKind;
	neighborhood: string;
	description: string;
	address: string | null;
	latitude: number;
	longitude: number;
	isAccessible: boolean;
	isFree: boolean;
	openingHours: string | null;
}

export type EventCategory =
	| "culture"
	| "sport"
	| "nature"
	| "volunteer"
	| "food"
	| "music"
	| "learning"
	| "community";

export type EventStatus = "published" | "cancelled";

export interface CommunityEvent extends Moderated {
	id: string;
	title: string;
	description: string;
	category: EventCategory;
	/** ISO timestamp. */
	startsAt: string;
	endsAt: string | null;
	placeId: string | null;
	locationText: string | null;
	capacity: number | null;
	registeredCount: number;
	isFree: boolean;
	priceCop: number | null;
	organizerId: string | null;
	organizerName: string;
	/** The city verified this organizer (badge; paid events skip the extra review). */
	organizerVerified: boolean;
	status: EventStatus;
	createdAt: string;
}

export interface NewEventInput {
	title: string;
	description: string;
	category: EventCategory;
	startsAt: string;
	endsAt: string | null;
	placeId: string | null;
	locationText: string | null;
	capacity: number | null;
	isFree: boolean;
	priceCop: number | null;
}

export interface EventQuery {
	category?: EventCategory;
	placeId?: string;
	organizerId?: string;
	ids?: string[];
	includePast?: boolean;
	search?: string;
	limit?: number;
}

export type ForumCategory =
	| "general"
	| "mobility"
	| "nature"
	| "safety"
	| "culture"
	| "visitors"
	| "neighborhood";

export interface ForumThread extends Moderated {
	id: string;
	title: string;
	body: string;
	category: ForumCategory;
	placeId: string | null;
	eventId: string | null;
	authorId: string | null;
	authorName: string;
	replyCount: number;
	lastActivityAt: string;
	/** The city confirmed this citizen report; until then it shows "sin confirmar". */
	cityVerified: boolean;
	createdAt: string;
}

export interface NewThreadInput {
	title: string;
	body: string;
	category: ForumCategory;
	placeId: string | null;
	eventId: string | null;
}

export interface ThreadQuery {
	category?: ForumCategory;
	placeId?: string;
	eventId?: string;
	authorId?: string;
	limit?: number;
}

export interface ForumPost extends Moderated {
	id: string;
	threadId: string;
	body: string;
	authorId: string | null;
	authorName: string;
	createdAt: string;
}

export interface Profile {
	id: string;
	displayName: string;
	neighborhood: string | null;
	isVisitor: boolean;
	email: string | null;
	/** Set by the city only; shown as a badge on the person's events. */
	isVerifiedOrganizer: boolean;
}

export interface SignUpInput {
	email: string;
	password: string;
	displayName: string;
	neighborhood: string | null;
	isVisitor: boolean;
}

export interface ProfilePatch {
	displayName: string;
	neighborhood: string | null;
	isVisitor: boolean;
}

export interface SignUpResult {
	profile: Profile | null;
	/** True when the account exists but the e-mail must be confirmed first. */
	needsConfirmation: boolean;
}

/** What happened to something a person tried to publish. */
export interface PublishResult<T> {
	outcome: "published" | "held" | "rejected";
	/** Spanish, shown to the author. */
	message: string;
	priority: TriagePriority;
	record: T | null;
}

/** approve/remove held content, resolve a city follow-up, verify a citizen report. */
export type ModerationAction = "approve" | "remove" | "resolve" | "verify";

/** Why a person reports someone else's content. */
export type ReportReason =
	| "spam"
	| "scam"
	| "offensive"
	| "misinformation"
	| "impersonation"
	| "other";

/** Everything the platform keeps about the signed-in person (Ley 1581: acceso). */
export interface MyDataExport {
	exportedAt: string;
	profile: Profile;
	registrations: CommunityEvent[];
	organizedEvents: CommunityEvent[];
	threads: ForumThread[];
	posts: ForumPost[];
	reports: {
		kind: ContentKind;
		contentId: string;
		reason: ReportReason;
		createdAt: string;
	}[];
}

/** One item in the city moderation queue: held content or a report to follow up. */
export interface ModerationQueueItem {
	kind: ContentKind;
	id: string;
	title: string;
	body: string;
	authorName: string;
	createdAt: string;
	status: ModerationStatus;
	labels: ModerationLabel[];
	source: ModerationSource | "moderator";
	priority: TriagePriority;
	/** Distinct people who reported it. */
	communityReports: number;
	/** Thread of a reply, to link to it. */
	threadId: string | null;
}

/** Where the data lives: the shared cloud database, or this device only. */
export type StoreMode = "cloud" | "device";

export type CommunityTopic = "events" | "forum";

export interface CommunityStore {
	readonly mode: StoreMode;
	getSession(): Promise<Profile | null>;
	onSessionChange(listener: (profile: Profile | null) => void): () => void;
	signUp(input: SignUpInput): Promise<SignUpResult>;
	signIn(email: string, password: string): Promise<Profile>;
	signOut(): Promise<void>;
	updateProfile(patch: ProfilePatch): Promise<Profile>;

	listPlaces(): Promise<Place[]>;
	getPlace(slug: string): Promise<Place | null>;

	listEvents(query?: EventQuery): Promise<CommunityEvent[]>;
	getEvent(id: string): Promise<CommunityEvent | null>;
	createEvent(input: NewEventInput): Promise<PublishResult<CommunityEvent>>;
	cancelEvent(id: string): Promise<void>;
	/** Ids of the events the signed-in person registered for. */
	myRegistrations(): Promise<string[]>;
	register(eventId: string): Promise<void>;
	unregister(eventId: string): Promise<void>;

	listThreads(query?: ThreadQuery): Promise<ForumThread[]>;
	getThread(id: string): Promise<ForumThread | null>;
	createThread(input: NewThreadInput): Promise<PublishResult<ForumThread>>;
	listPosts(threadId: string): Promise<ForumPost[]>;
	createPost(threadId: string, body: string): Promise<PublishResult<ForumPost>>;

	/** True when the signed-in person can open the moderation queue. */
	canModerate(): Promise<boolean>;
	listModerationQueue(): Promise<ModerationQueueItem[]>;
	moderate(
		kind: ContentKind,
		id: string,
		action: ModerationAction,
	): Promise<void>;

	/** Flags someone else's content; enough distinct reports hold it for review. */
	reportContent(
		kind: ContentKind,
		id: string,
		reason: ReportReason,
	): Promise<void>;
	/** Ley 1581: the person can download and delete their data. */
	exportMyData(): Promise<MyDataExport>;
	deleteAccount(): Promise<void>;

	/** Calls the listener whenever someone else changes the topic. */
	subscribe(topic: CommunityTopic, listener: () => void): () => void;
}
