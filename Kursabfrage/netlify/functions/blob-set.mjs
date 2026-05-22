// netlify/functions/blob-set.mjs
// Schreibt einen Wert in den Netlify Blob Store.

import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") return new Response("POST erwartet", { status: 405 });

  try {
    const { key, value } = await req.json();
    if (!key) return new Response("key fehlt", { status: 400 });

    const store = getStore("bbb-shared");
    await store.set(key, JSON.stringify(value));
    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
};

export const config = { path: "/.netlify/functions/blob-set" };
