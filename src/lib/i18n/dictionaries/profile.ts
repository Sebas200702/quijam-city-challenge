// profile text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type ProfileMessages = typeof es;

const en: ProfileMessages = {};
const pt: ProfileMessages = {};
const fr: ProfileMessages = {};

export const profile: Record<Language, ProfileMessages> = { es, en, pt, fr };
