// Ziel im Repo: netlify/functions/_shared/votes.mjs (NEUE Datei)
//
// Gemeinsame Helfer für das Voting-Datenformat. Wird von notify-online.mjs
// (mittelbar über App.jsx) und abend-zusammenfassung.mjs genutzt, damit beide
// Seiten (Frontend + Functions) dieselbe Vorstellung vom Datenformat haben.
//
// Format pro Termin: { kommt: [...], kommt_nicht: [...], online: [...], kinderwagen: [...] }
// Jeder Eintrag: { id, name, ts }
// Altes Format (nur Zahlen statt Arrays) wird beim Lesen automatisch
// in anonyme Platzhalter-Einträge umgewandelt, damit keine Zählungen verloren gehen.

export const VOTE_KEYS = ["kommt", "kommt_nicht", "online", "kinderwagen"];

export function normalizeVotes(v) {
  const base = { kommt: [], kommt_nicht: [], online: [], kinderwagen: [] };
  if (!v) return base;
  for (const k of VOTE_KEYS) {
    const val = v[k];
    if (Array.isArray(val)) {
      base[k] = val;
    } else if (typeof val === "number" && val > 0) {
      // Altes Zähler-Format (vor der Namenspflicht): als anonyme Einträge übernehmen.
      base[k] = Array.from({ length: val }, (_, i) => ({
        id: `legacy-${k}-${i}`,
        name: null,
        ts: null,
      }));
    }
  }
  return base;
}

export function namesOf(entries) {
  return (entries || []).map((e) => e.name).filter(Boolean);
}
