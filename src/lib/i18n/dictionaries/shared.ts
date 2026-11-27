// shared text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type SharedMessages = typeof es;

const en: SharedMessages = {};
const pt: SharedMessages = {};
const fr: SharedMessages = {};

export const shared: Record<Language, SharedMessages> = { es, en, pt, fr };
