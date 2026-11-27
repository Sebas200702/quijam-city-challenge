// places text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type PlacesMessages = typeof es;

const en: PlacesMessages = {};
const pt: PlacesMessages = {};
const fr: PlacesMessages = {};

export const places: Record<Language, PlacesMessages> = { es, en, pt, fr };
