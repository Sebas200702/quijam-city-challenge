// map text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type MapMessages = typeof es;

const en: MapMessages = {};
const pt: MapMessages = {};
const fr: MapMessages = {};

export const map: Record<Language, MapMessages> = { es, en, pt, fr };
