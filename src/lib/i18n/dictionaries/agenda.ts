// agenda text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type AgendaMessages = typeof es;

const en: AgendaMessages = {};
const pt: AgendaMessages = {};
const fr: AgendaMessages = {};

export const agenda: Record<Language, AgendaMessages> = { es, en, pt, fr };
