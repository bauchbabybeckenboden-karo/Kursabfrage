// Ziel im Repo: netlify/functions/kurs-erinnerung.mjs (NEUE Datei)
//
// ERSETZT abend-zusammenfassung.mjs (bitte aus dem Repo löschen) – statt am
// Vorabend kommt die Mail jetzt 15 Minuten vor Kursbeginn, mit der
// aktuellen Anmeldeliste (inkl. Namen).
//
// Läuft alle 5 Minuten (Netlify erlaubt keine "auf die Minute genau vor X"-
// Schedules, nur feste Cron-Intervalle) und prüft, ob irgendein Kurs in den
// nächsten 10–15 Minuten beginnt. Ein Blob-Eintrag verhindert doppelten
// Versand, falls der Cron im Fenster mehrfach läuft.
//
// Umgebungsvariablen (in Netlify UI setzen):
//   RESEND_API_KEY   → dein Resend API-Key (re_xxxx...)
//
// WICHTIG: Muss auf GENAU DIESER Netlify-Seite gesetzt sein – siehe Hinweis
// im Chat, warum die Abend-Mail bisher nie angekommen ist.

import { getStore } from "@netlify/blobs";
import { normalizeVotes, namesOf } from "./_shared/votes.mjs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AN  = "kontakt@bauch-baby-beckenboden.com";
const VON = "Kursapp <kontakt@bauch-baby-beckenboden.com>";

const VORLAUF_MIN = 15; // Minuten vor Kursbeginn
const FENSTER_MIN = 5;  // Toleranzfenster = Cron-Intervall

function formatDateDE(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}
function toISO(d) { return d.toISOString().split("T")[0]; }

async function readBlob(key) {
  try {
    const store = getStore("bbb-shared");
    const val = await store.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}
async function writeBlob(key, val) {
  try {
    const store = getStore("bbb-shared");
    await store.set(key, JSON.stringify(val));
  } catch (e) { console.error("writeBlob Fehler:", e); }
}

function heuteBerlinISO() {
  const now = new Date();
  const berlinStr = now.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const [day, month, year] = berlinStr.split(".").map(Number);
  return toISO(new Date(year, month - 1, day));
}
function jetztBerlinMinuten() {
  const teile = new Date().toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const [h, m] = teile.split(":").map(Number);
  return h * 60 + m;
}

function namesLine(entries) {
  const names = namesOf(entries);
  return names.length ? names.join(", ") : "– noch keine Namen erfasst –";
}

function buildHtml({ gruppe, termin, votes, notiz }) {
  const total = votes.kommt.length + votes.online.length + votes.kinderwagen.length;
  return `
    <div style="font-family:'Georgia',serif;max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(120,70,50,0.08);">
      <div style="background:linear-gradient(135deg,#c4896e,#a06848);padding:24px 28px;">
        <div style="font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">In ${VORLAUF_MIN} Minuten</div>
        <div style="font-size:22px;font-weight:700;color:#fff;">${gruppe.name} 🌸</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">${formatDateDE(termin)} · ${gruppe.uhrzeit} Uhr</div>
      </div>
      <div style="padding:24px 28px;">
        ${notiz ? `<div style="font-size:13px;color:#7a5040;font-style:italic;background:rgba(196,137,110,0.1);border-radius:8px;padding:8px 12px;margin-bottom:16px;">📌 ${notiz}</div>` : ""}
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:14px;color:#5a3a2e;">✅ Vor Ort</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#5a9e6e;">${votes.kommt.length}</td></tr>
          <tr><td colspan="2" style="padding:0 0 8px;font-size:12px;color:#9c6b55;">${namesLine(votes.kommt)}</td></tr>
          ${gruppe.baby ? `
          <tr><td style="padding:6px 0;font-size:14px;color:#5a3a2e;">🛒 Mit Kinderwagen</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#c08040;">${votes.kinderwagen.length}</td></tr>
          <tr><td colspan="2" style="padding:0 0 8px;font-size:12px;color:#9c6b55;">${namesLine(votes.kinderwagen)}</td></tr>` : ""}
          <tr><td style="padding:6px 0;font-size:14px;color:#5a3a2e;">💻 Online</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#5a7ec0;">${votes.online.length}</td></tr>
          <tr><td colspan="2" style="padding:0 0 8px;font-size:12px;color:#9c6b55;">${namesLine(votes.online)}</td></tr>
          <tr><td style="padding:10px 0 0;font-weight:600;color:#2d1f1a;">Gesamt vor Ort</td><td style="padding:10px 0 0;text-align:right;font-size:18px;font-weight:700;color:#c4896e;">${total}</td></tr>
        </table>
      </div>
    </div>`;
}

const handler = async () => {
  try {
    const heute = heuteBerlinISO();
    const heuteWochentag = new Date(heute + "T12:00:00").getDay();
    const jetzt = jetztBerlinMinuten();

    const gruppen     = await readBlob("bbb_gruppen_v2") || {};
    const votesRaw    = await readBlob("bbb_votes_v2")   || {};
    const removedData = await readBlob("bbb_removed_v2") || {};
    const notizenData = await readBlob("bbb_notizen_v2") || {};
    const gesendet     = await readBlob("bbb_erinnerung_gesendet") || {};

    let neuGesendet = false;

    for (const [id, gruppe] of Object.entries(gruppen)) {
      if (gruppe.wochentag !== heuteWochentag) continue;
      const removed = removedData[id] || [];
      if (!gruppe.dates.includes(heute) || removed.includes(heute)) continue;

      const [h, m] = gruppe.uhrzeit.split(":").map(Number);
      const kursMinuten = h * 60 + m;
      const minutenBisKurs = kursMinuten - jetzt;

      // Fenster: 10–15 Minuten vor Kursbeginn (Cron läuft alle 5 Minuten)
      if (minutenBisKurs > VORLAUF_MIN || minutenBisKurs <= VORLAUF_MIN - FENSTER_MIN) continue;

      const sendKey = `${id}_${heute}`;
      if (gesendet[sendKey]) continue; // schon verschickt

      if (!RESEND_API_KEY) {
        console.error("kurs-erinnerung: RESEND_API_KEY fehlt in den Umgebungsvariablen dieser Netlify-Seite.");
        continue;
      }

      const votes = normalizeVotes(votesRaw[`${id}_${heute}`]);
      const notiz = notizenData[`${id}_${heute}`] || null;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: VON,
          to: [AN],
          subject: `🌸 Gleich: ${gruppe.name} – ${formatDateDE(heute)}`,
          html: buildHtml({ gruppe, termin: heute, votes, notiz }),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Resend Fehler (kurs-erinnerung):", err);
        continue;
      }

      gesendet[sendKey] = true;
      neuGesendet = true;
      console.log(`Erinnerung gesendet für ${gruppe.name} am ${heute}`);
    }

    if (neuGesendet) {
      // Alte Einträge (>3 Tage) aufräumen, damit der Blob nicht unbegrenzt wächst
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 3);
      const cutoffISO = toISO(cutoff);
      for (const key of Object.keys(gesendet)) {
        const datum = key.split("_").pop();
        if (datum < cutoffISO) delete gesendet[key];
      }
      await writeBlob("bbb_erinnerung_gesendet", gesendet);
    }
  } catch (err) {
    console.error("Fehler kurs-erinnerung:", err);
  }
};

export const config = { schedule: "*/5 * * * *" };
export default handler;
