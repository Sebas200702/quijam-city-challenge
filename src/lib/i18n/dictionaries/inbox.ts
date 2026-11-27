// inbox text in the four languages. Spanish is the reference: es, en, pt and fr
// must have the same keys (the compiler and messages.test.ts check it).

import type { Language } from "../languages";

const es = {};

export type InboxMessages = typeof es;

const en: InboxMessages = {};
const pt: InboxMessages = {};
const fr: InboxMessages = {};

export const inbox: Record<Language, InboxMessages> = { es, en, pt, fr };
