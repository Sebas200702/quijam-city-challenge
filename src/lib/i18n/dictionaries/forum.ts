// forum text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type ForumMessages = typeof es;

const en: ForumMessages = {};
const pt: ForumMessages = {};
const fr: ForumMessages = {};

export const forum: Record<Language, ForumMessages> = { es, en, pt, fr };
