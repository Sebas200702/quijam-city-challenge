// landing text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type LandingMessages = typeof es;

const en: LandingMessages = {};
const pt: LandingMessages = {};
const fr: LandingMessages = {};

export const landing: Record<Language, LandingMessages> = { es, en, pt, fr };
