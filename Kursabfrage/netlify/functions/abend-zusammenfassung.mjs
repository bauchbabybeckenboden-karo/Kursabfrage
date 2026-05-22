// netlify/functions/abend-zusammenfassung.mjs
//
// Läuft täglich um 20:00 Uhr (Europe/Berlin).
// Prüft ob morgen ein Kurs stattfindet – wenn ja, sendet eine
// Zusammenfassung der aktuellen Anmeldungen per Resend.
//
// Umgebungsvariablen (in Netlify UI setzen):
//   RESEND_API_KEY   → dein Resend API-Key (re_xxxx...)
//   BLOB_TOKEN       → Netlify Blob Store Token (auto-gesetzt von Netlify)

import { schedule } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AN            = "kontakt@bauch-baby-beckenboden.com";
const VON           = "Kursapp <kontakt@bauch-baby-beckenboden.com>";

// ── Hilfsfunktionen (gleiche Logik wie im Frontend) ───────────────────────
function getEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toISO(d) { return d.toISOString().split("T")[0]; }
function hessianHolidays(year) {
  const e = getEaster(year);
  return new Set([
    `${year}-01-01`, toISO(addDays(e, -2)), toISO(e), toISO(addDays(e, 1)),
    `${year}-05-01`, toISO(addDays(e, 39)), toISO(addDays(e, 49)),
    toISO(addDays(e, 50)), toISO(addDays(e, 60)),
    `${year}-10-03`, `${year}-12-25`, `${year}-12-26`,
  ]);
}
function formatDateDE(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

// ── Daten aus Netlify Blob Store lesen ────────────────────────────────────
async function readBlob(key) {
  try {
    const store = getStore("bbb-shared");
    const val = await store.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

// ── Morgen-ISO berechnen (Berlin-Zeit) ───────────────────────────────────
function getTomorrowISO() {
  const now = new Date();
  // UTC+1/+2 je nach Sommer-/Winterzeit – einfache Näherung über de-DE
  const berlinStr = now.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const [day, month, year] = berlinStr.split(".").map(Number);
  const berlin = new Date(year, month - 1, day);
  berlin.setDate(berlin.getDate() + 1);
  return toISO(berlin);
}

// ── E-Mail HTML ───────────────────────────────────────────────────────────
function buildHtml(kurse) {
  const rows = kurse.map(({ gruppe, termin, votes }) => {
    const total = (votes.kommt || 0) + (votes.online || 0) + (votes.kinderwagen || 0);
    return `
      <div style="background:#fdf8f5;border-radius:16px;padding:20px 24px;margin-bottom:16px;border:1px solid #e8d5c8;">
        <div style="font-size:18px;font-weight:700;color:#2d1f1a;margin-bottom:4px;">${gruppe.name}</div>
        <div style="font-size:14px;color:#9c6b55;margin-bottom:16px;">${formatDateDE(termin)} · ${gruppe.uhrzeit} Uhr</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;font-size:15px;color:#5a3a2e;">✅ Kommen vor Ort</td>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;text-align:right;font-size:20px;font-weight:700;color:#5a9e6e;">${votes.kommt || 0}</td>
          </tr>
          ${gruppe.baby ? `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;font-size:15px;color:#5a3a2e;">🛒 Mit Kinderwagen</td>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;text-align:right;font-size:20px;font-weight:700;color:#c08040;">${votes.kinderwagen || 0}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;font-size:15px;color:#5a3a2e;">💻 Online dabei</td>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;text-align:right;font-size:20px;font-weight:700;color:#5a7ec0;">${votes.online || 0}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;font-size:15px;color:#5a3a2e;">😖 Kommen nicht</td>
            <td style="padding:8px 0;border-bottom:1px solid #ede0d8;text-align:right;font-size:20px;font-weight:700;color:#c05040;">${votes.kommt_nicht || 0}</td>
          </tr>
          <tr>
            <td style="padding:10px 0 0;font-size:15px;font-weight:600;color:#2d1f1a;">Gesamt vor Ort</td>
            <td style="padding:10px 0 0;text-align:right;font-size:22px;font-weight:700;color:#c4896e;">${total}</td>
          </tr>
        </table>
      </div>`;
  }).join("");

  return `
    <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(120,70,50,0.08);">
      <div style="background:linear-gradient(135deg,#c4896e,#a06848);padding:28px 32px;">
        <div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">Abend-Zusammenfassung</div>
        <div style="font-size:26px;font-weight:700;color:#fff;">Kurse morgen früh 🌸</div>
      </div>
      <div style="padding:28px 32px;">
        ${rows}
        <div style="margin-top:20px;font-size:13px;color:#b8927a;font-style:italic;text-align:center;">
          Automatisch gesendet von deiner Kursapp · Bauch Baby Beckenboden
        </div>
      </div>
    </div>`;
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────
const handler = async () => {
  try {
    const tomorrow = getTomorrowISO();
    const tomorrowDay = new Date(tomorrow + "T12:00:00").getDay(); // 0=So

    const gruppen     = await readBlob("bbb_gruppen_v2") || {};
    const votes       = await readBlob("bbb_votes_v2")   || {};
    const removedData = await readBlob("bbb_removed_v2") || {};

    // Alle Kursgruppen finden, die morgen Kurs haben
    const kurse = [];
    for (const [id, gruppe] of Object.entries(gruppen)) {
      if (gruppe.wochentag !== tomorrowDay) continue;

      const removed = removedData[id] || [];
      const hatTermin = gruppe.dates.includes(tomorrow) && !removed.includes(tomorrow);
      if (!hatTermin) continue;

      const voteKey = `${id}_${tomorrow}`;
      const v = votes[voteKey] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
      kurse.push({ gruppe, termin: tomorrow, votes: v });
    }

    // Kein Kurs morgen → kein E-Mail
    if (kurse.length === 0) {
      console.log("Kein Kurs morgen – kein E-Mail gesendet.");
      return { statusCode: 200, body: "Kein Kurs morgen." };
    }

    const morgenDE = formatDateDE(tomorrow);

    // E-Mail über Resend senden
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: VON,
        to:   [AN],
        subject: `🌸 Morgen: ${kurse.map(k => k.gruppe.name).join(" & ")} – ${morgenDE}`,
        html: buildHtml(kurse),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend Fehler:", err);
      return { statusCode: 500, body: `Resend Fehler: ${err}` };
    }

    console.log(`E-Mail gesendet für ${kurse.length} Kurs(e) am ${tomorrow}`);
    return { statusCode: 200, body: "E-Mail gesendet." };

  } catch (err) {
    console.error("Fehler:", err);
    return { statusCode: 500, body: err.message };
  }
};

// Jeden Abend um 20:00 Uhr Europe/Berlin = 18:00 UTC (Sommerzeit) / 19:00 UTC (Winterzeit)
// Netlify cron läuft in UTC → 18:00 UTC deckt Sommerzeit ab, für Winterzeit wäre 19:00 nötig.
// Kompromiss: 18:30 UTC = 19:30 oder 20:30 Uhr je nach Jahreszeit.
export const config = {
  schedule: "30 18 * * *",
};

export default schedule("30 18 * * *", handler);
