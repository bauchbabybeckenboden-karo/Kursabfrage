// netlify/functions/abend-zusammenfassung.mjs
//
// Läuft täglich um 18:30 UTC (= 20:30 Uhr Sommerzeit / 19:30 Uhr Winterzeit).
// Prüft ob morgen ein Kurs stattfindet. Wenn ja, schickt sie die aktuelle
// Zusammenfassung an das Apps-Script-Web-App (Versand per Gmail, ohne Resend).
//
// Umgebungsvariablen (in Netlify UI setzen):
//   APPS_SCRIPT_URL  → Web-App-URL aus Apps Script (endet auf /exec)
//   ABEND_TOKEN      → derselbe Wert wie die Skript-Eigenschaft ABEND_TOKEN

import { getStore } from "@netlify/blobs";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const ABEND_TOKEN     = process.env.ABEND_TOKEN;

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
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
function formatDateDE(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

// ── Blob Store lesen ──────────────────────────────────────────────────────
async function readBlob(key) {
  try {
    const store = getStore("bbb-shared");
    const val = await store.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error(`Blob ${key} konnte nicht gelesen werden:`, err);
    return null;
  }
}

// ── Morgen-ISO (Berlin-Zeit) ──────────────────────────────────────────────
function getTomorrowISO() {
  const now = new Date();
  const berlinStr = now.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const [day, month, year] = berlinStr.split(".").map(Number);
  const berlin = new Date(year, month - 1, day);
  berlin.setDate(berlin.getDate() + 1);
  return toISO(berlin);
}

// ── E-Mail HTML (nur Emojis aus der Basic Multilingual Plane) ─────────────
function buildHtml(kurse) {
  const rows = kurse.map(({ gruppe, termin, votes, notiz }) => {
    const total = (votes.kommt || 0) + (votes.kinderwagen || 0);
    return `
      <div style="background:#fdf8f5;border-radius:16px;padding:20px 24px;margin-bottom:16px;border:1px solid #e8d5c8;">
        <div style="font-size:18px;font-weight:700;color:#3D2B2B;margin-bottom:4px;">${gruppe.name}</div>
        <div style="font-size:14px;color:#8B6464;margin-bottom:${notiz ? "8px" : "16px"};">${formatDateDE(termin)} · ${gruppe.uhrzeit} Uhr</div>
        ${notiz ? `<div style="font-size:13px;color:#8B6464;font-style:italic;background:rgba(196,137,110,0.1);border-radius:8px;padding:6px 12px;margin-bottom:14px;">Notiz: ${notiz}</div>` : ""}
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;font-size:15px;color:#3D2B2B;">✅ Kommen vor Ort</td>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;text-align:right;font-size:20px;font-weight:700;color:#5a9e6e;">${votes.kommt || 0}</td>
          </tr>
          ${gruppe.baby ? `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;font-size:15px;color:#3D2B2B;">Mit Kinderwagen</td>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;text-align:right;font-size:20px;font-weight:700;color:#C4A0A0;">${votes.kinderwagen || 0}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;font-size:15px;color:#3D2B2B;">Online dabei</td>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;text-align:right;font-size:20px;font-weight:700;color:#5a7ec0;">${votes.online || 0}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;font-size:15px;color:#3D2B2B;">Kommen nicht</td>
            <td style="padding:8px 0;border-bottom:1px solid #F6EBE8;text-align:right;font-size:20px;font-weight:700;color:#c05040;">${votes.kommt_nicht || 0}</td>
          </tr>
          <tr>
            <td style="padding:10px 0 0;font-size:15px;font-weight:600;color:#3D2B2B;">Gesamt vor Ort</td>
            <td style="padding:10px 0 0;text-align:right;font-size:22px;font-weight:700;color:#C4A0A0;">${total}</td>
          </tr>
        </table>
      </div>`;
  }).join("");

  return `
    <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(120,70,50,0.08);">
      <div style="background:linear-gradient(135deg,#C4A0A0,#8B6464);padding:28px 32px;">
        <div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">Abend-Zusammenfassung</div>
        <div style="font-size:26px;font-weight:700;color:#fff;">Kurse morgen früh ✨</div>
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
    if (!APPS_SCRIPT_URL || !ABEND_TOKEN) {
      console.error("FEHLER: APPS_SCRIPT_URL oder ABEND_TOKEN fehlt in den Netlify-Umgebungsvariablen.");
      return;
    }

    const tomorrow    = getTomorrowISO();
    const tomorrowDay = new Date(tomorrow + "T12:00:00").getDay();
    console.log(`Prüfe Kurse für ${tomorrow} (Wochentag ${tomorrowDay})`);

    const gruppen     = await readBlob("bbb_gruppen_v2") || {};
    const votes       = await readBlob("bbb_votes_v2")   || {};
    const removedData = await readBlob("bbb_removed_v2") || {};
    const notizenData = await readBlob("bbb_notizen_v2") || {};
    console.log(`Gruppen gefunden: ${Object.keys(gruppen).length}`);

    const kurse = [];
    for (const [id, gruppe] of Object.entries(gruppen)) {
      if (gruppe.wochentag !== tomorrowDay) continue;
      const removed   = removedData[id] || [];
      const hatTermin = (gruppe.dates || []).includes(tomorrow) && !removed.includes(tomorrow);
      if (!hatTermin) continue;
      const voteKey = `${id}_${tomorrow}`;
      const v = votes[voteKey] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
      const notiz = notizenData[`${id}_${tomorrow}`] || null;
      kurse.push({ gruppe, termin: tomorrow, votes: v, notiz });
    }

    if (kurse.length === 0) {
      console.log(`Kein Kurs am ${tomorrow} – keine Mail gesendet.`);
      return;
    }

    const subject = `✨ Morgen: ${kurse.map(k => k.gruppe.name).join(" & ")} – ${formatDateDE(tomorrow)}`;

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: ABEND_TOKEN, subject, html: buildHtml(kurse) }),
      redirect: "follow",
    });

    const text = await res.text();
    let antwort = null;
    try { antwort = JSON.parse(text); } catch { /* keine JSON-Antwort */ }

    if (!res.ok || !antwort || antwort.ok !== true) {
      console.error("Apps-Script-Fehler:", res.status, text.slice(0, 500));
      return;
    }

    console.log(`Mail gesendet für ${kurse.length} Kurs(e) am ${tomorrow}`);

  } catch (err) {
    console.error("Fehler:", err);
  }
};

// ── Export (Netlify Functions v2 Format) ──────────────────────────────────
export const config = {
  schedule: "30 18 * * *",
};

export default handler;
