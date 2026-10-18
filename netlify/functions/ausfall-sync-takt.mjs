// netlify/functions/ausfall-sync-takt.mjs (NEUE Datei)
//
// Sicherheitsnetz: laeuft alle 15 Minuten und gleicht gestrichene Termine
// mit Supabase ab, falls der direkte Aufruf nach dem Streichen nicht angekommen ist.

import sync from "./ausfall-sync.mjs";

export default sync;

export const config = { schedule: "*/15 * * * *" };
