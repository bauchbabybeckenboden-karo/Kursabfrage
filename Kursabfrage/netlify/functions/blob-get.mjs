// netlify/functions/blob-get.mjs
// Liest einen Wert aus dem Netlify Blob Store und gibt ihn als JSON zurück.

import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return new Response("key fehlt", { status: 400 });

  try {
    const store = getStore("bbb-shared");
    const val = await store.get(key);
    if (val === null) return new Response(null, { status: 404 });
    return new Response(val, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
};

export const config = { path: "/.netlify/functions/blob-get" };
