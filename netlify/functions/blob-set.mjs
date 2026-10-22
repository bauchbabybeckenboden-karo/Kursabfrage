// netlify/functions/blob-set.mjs
// Schreibt einen Wert in den Netlify Blob Store.
// Admin-Daten brauchen den Header "x-admin-token" mit dem Wert von ADMIN_TOKEN.

import { getStore } from "@netlify/blobs";

const GESCHUETZT = ["bbb_gruppen_v2", "bbb_removed_v2", "bbb_notizen_v2"];
const ERLAUBT = [...GESCHUETZT, "bbb_votes_v2"];

export default async (req) => {
  if (req.method !== "POST") return new Response("POST erwartet", { status: 405 });

  try {
    const { key, value } = await req.json();
    if (!ERLAUBT.includes(key)) return new Response("Schluessel nicht erlaubt", { status: 400 });

    if (GESCHUETZT.includes(key)) {
      const erwartet = process.env.ADMIN_TOKEN;
      if (!erwartet || req.headers.get("x-admin-token") !== erwartet) {
        return new Response("Nicht autorisiert", { status: 401 });
      }
    }

    const store = getStore("bbb-shared");
    await store.set(key, JSON.stringify(value));
    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
};

export const config = { path: "/.netlify/functions/blob-set" };
