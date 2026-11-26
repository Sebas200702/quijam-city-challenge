// Types for the Jev-compatible System One API (Codiv / TypeSafe).
// Reference: https://codiv.ai/docs/api-reference/system-one

export interface ChoiceQuestion {
	type: "choice";
	instructions?: string;
	/** Option id -> description (or null). 1 to 255 options. */
	criteria: Record<string, string | null>;
}

export interface YesNoQuestion {
	type: "noul";
	instructions?: string;
	criteria?: { true: string; false: string };
}

export interface ScoreQuestion {
	type: "score";
	instructions?: string;
	/** 2 to 10 levels, lowest first. */
	criteria: string[];
}

export type Question = ChoiceQuestion | YesNoQuestion | ScoreQuestion;

export type Questions = Record<string, Question>;

/** Anything JSON-serializable. Never send personal data or exact locations. */
export type DecisionState = string | Record<string, unknown> | unknown[];

export interface ChoiceAnswer {
	type: "choice";
	choice: string;
	probabilities: Record<string, number>;
	confidence: number;
}

export interface YesNoAnswer {
	type: "noul";
	/** Probability of yes, 0 to 1. */
	noul: number;
}

export interface ScoreAnswer {
	type: "score";
	/** Expected level, sum of i * p_i. */
	score: number;
	legend: Record<string, string>;
	probabilities: Record<string, number>;
	confidence: number;
}

export type Answer = ChoiceAnswer | YesNoAnswer | ScoreAnswer;

export type DecisionFailureReason =
	| "unauthorized"
	| "rate_limited"
	| "quota_exceeded"
	| "bad_request"
	| "unavailable"
	| "invalid_response"
	| "timeout"
	| "network_error";

export type DecisionResult =
	| {
			ok: true;
			model: string;
			answers: Record<string, Answer>;
			inputTokens: number;
	  }
	| { ok: false; reason: DecisionFailureReason; status?: number };

export interface OpenJevClientOptions {
	apiKey: string;
	/** Default: https://api.codiv.ai */
	baseUrl?: string;
	/** Default: openjev-latest */
	model?: string;
	/** Default: 4000 ms. The caller falls back to the weighted score on failure. */
	timeoutMs?: number;
	fetch?: typeof fetch;
}

export interface OpenJevClient {
	decide(state: DecisionState, questions: Questions): Promise<DecisionResult>;
}
