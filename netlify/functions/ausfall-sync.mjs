// netlify/functions/ausfall-sync.mjs (NEUE Datei)
//
// Kopiert die gestrichenen Termine aus dem Blob "bbb_removed_v2" nach
// Supabase, Spalte kurse.ausgefallen_daten. Zuordnung: source_gruppen_key ist
// "<gid>_<startdatum>", daher Abgleich per Praefix (gid + "_").
// Wird von der Kursabfrage nach jedem Streichen/Wiederherstellen aufgerufen.
// Die Funktion liest die Daten selbst aus dem Blob, nimmt also keine Daten
// vom Aufrufer entgegen. Sie ist idempotent.

import { getStore } from "@netlify/blobs";

const SUPA_URL = process.env.SUPABASE_URL || "https://qrfpaebkbwuadllucrvv.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function readBlob(key) {
  try {
    const val = await getStore("bbb-shared").get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export default async () => {
  if (!KEY) {
    return new Response("SUPABASE_SERVICE_ROLE_KEY fehlt", { status: 500 });
  }

  const gruppen = (await readBlob("bbb_gruppen_v2")) || {};
  const removed = (await readBlob("bbb_removed_v2")) || {};

  // Alle Gruppen synchronisieren, auch wenn alle Streichungen zurueckgenommen wurden
  const gids = new Set([...Object.keys(gruppen), ...Object.keys(removed)]);

  const fehler = [];
  for (const gid of gids) {
    const dates = [...(removed[gid] || [])].sort();
    const res = await fetch(
      `${SUPA_URL}/rest/v1/kurse?source_gruppen_key=like.${encodeURIComponent(gid)}_*`,
      {
        method: "PATCH",
        headers: {
          apikey: KEY,
          ...(KEY.startsWith("eyJ") ? { Authorization: `Bearer ${KEY}` } : {}),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ ausgefallen_daten: dates }),
      }
    );
    if (!res.ok) fehler.push({ gid, status: res.status });
  }

  return new Response(
    JSON.stringify({ ok: fehler.length === 0, gruppen: gids.size, fehler }),
    { status: fehler.length === 0 ? 200 : 500, headers: { "Content-Type": "application/json" } }
  );
};

export const config = { path: "/.netlify/functions/ausfall-sync" };
