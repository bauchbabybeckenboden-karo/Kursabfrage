// netlify/functions/abend-zusammenfassung.mjs
//
// Läuft alle 5 Minuten an Mo, Do und Fr (Netlify-Zeitplan in UTC, siehe unten).
// Im Code wird auf Berliner Zeit geprüft: Verschickt wird nur, wenn ein Kurs
// heute 5 bis 15 Minuten vor Kursbeginn steht. Pro Kurs und Tag nur eine Mail.
// Versand über das Apps-Script-Web-App (Gmail), kein Resend mehr.
//
// Umgebungsvariablen (in Netlify UI setzen):
//   APPS_SCRIPT_URL  → Web-App-URL aus Apps Script (endet auf /exec)
//   ABEND_TOKEN      → derselbe Wert wie die Skript-Eigenschaft ABEND_TOKEN

import { getStore } from "@netlify/blobs";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const ABEND_TOKEN     = process.env.ABEND_TOKEN;

const FENSTER_VON  = 5;  // Minuten vor Kursbeginn (frühester Versand)
const FENSTER_BIS  = 15; // Minuten vor Kursbeginn (spätester Versand)
const BLOB_STORE   = "bbb-shared";
const GESENDET_KEY = "abend_gesendet_v1";

// ── Berliner Zeit ─────────────────────────────────────────────────────────
function berlinJetzt() {
  const teile = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const t = (typ) => teile.find((p) => p.type === typ).value;
  const iso = `${t("year")}-${t("month")}-${t("day")}`;
  return {
    iso,
    minuten: Number(t("hour")) * 60 + Number(t("minute")),
    wochentag: new Date(iso + "T12:00:00").getDay(),
  };
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
function formatDateDE(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

async function readJson(store, key) {
  try {
    const val = await store.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error(`Blob ${key} konnte nicht gelesen werden:`, err);
    return null;
  }
}

// ── E-Mail HTML (nur Emojis aus der Basic Multilingual Plane) ─────────────
function buildHtml(kurs) {
  const { gruppe, termin, votes, notiz, minutenBisKurs } = kurs;
  const total = (votes.kommt || 0) + (votes.kinderwagen || 0);
  return `
    <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(120,70,50,0.08);">
      <div style="background:linear-gradient(135deg,#C4A0A0,#8B6464);padding:28px 32px;">
        <div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">Zusammenfassung vor Kursbeginn</div>
        <div style="font-size:26px;font-weight:700;color:#fff;">Kurs in ca. ${minutenBisKurs} Min ✨</div>
      </div>
      <div style="padding:28px 32px;">
        <div style="background:#fdf8f5;border-radius:16px;padding:20px 24px;border:1px solid #e8d5c8;">
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
        </div>
        <div style="margin-top:20px;font-size:13px;color:#b8927a;font-style:italic;text-align:center;">
          Automatisch gesendet von deiner Kursapp · Bauch Baby Beckenboden
        </div>
      </div>
    </div>`;
}

// ── Versand über Apps-Script-Web-App ──────────────────────────────────────
async function sendeZuApps(subject, html) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: ABEND_TOKEN, subject, html }),
    redirect: "follow",
  });
  const text = await res.text();
  let antwort = null;
  try { antwort = JSON.parse(text); } catch { /* keine JSON-Antwort */ }
  if (!res.ok || !antwort || antwort.ok !== true) {
    console.error("Apps-Script-Fehler:", res.status, text.slice(0, 500));
    return false;
  }
  return true;
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────
const handler = async () => {
  try {
    if (!APPS_SCRIPT_URL || !ABEND_TOKEN) {
      console.error("FEHLER: APPS_SCRIPT_URL oder ABEND_TOKEN fehlt in den Netlify-Umgebungsvariablen.");
      return;
    }

    const jetzt = berlinJetzt();
    const store = getStore(BLOB_STORE);

    const gruppen     = await readJson(store, "bbb_gruppen_v2") || {};
    const votes       = await readJson(store, "bbb_votes_v2")   || {};
    const removedData = await readJson(store, "bbb_removed_v2") || {};
    const notizenData = await readJson(store, "bbb_notizen_v2") || {};
    const gesendet    = await readJson(store, GESENDET_KEY)     || {};

    // Alte Einträge von anderen Tagen entfernen
    for (const key of Object.keys(gesendet)) {
      if (!key.endsWith(`_${jetzt.iso}`)) delete gesendet[key];
    }

    let geaendert = false;

    for (const [id, gruppe] of Object.entries(gruppen)) {
      if (!gruppe.uhrzeit || gruppe.wochentag !== jetzt.wochentag) continue;

      const [h, m] = gruppe.uhrzeit.split(":").map(Number);
      const minutenBisKurs = h * 60 + m - jetzt.minuten;
      if (minutenBisKurs < FENSTER_VON || minutenBisKurs > FENSTER_BIS) continue;

      const removed = removedData[id] || [];
      const hatTermin = (gruppe.dates || []).includes(jetzt.iso) && !removed.includes(jetzt.iso);
      if (!hatTermin) continue;

      const key = `${id}_${jetzt.iso}`;
      if (gesendet[key]) continue;

      const v = votes[key] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
      const notiz = notizenData[key] || null;
      const kurs = { gruppe, termin: jetzt.iso, votes: v, notiz, minutenBisKurs };

      const subject = `✨ Heute in ${minutenBisKurs} Min: ${gruppe.name}`;
      const ok = await sendeZuApps(subject, buildHtml(kurs));
      if (ok) {
        gesendet[key] = Date.now();
        geaendert = true;
        console.log(`Mail gesendet: ${gruppe.name} am ${jetzt.iso}`);
      }
    }

    if (geaendert) {
      await store.set(GESENDET_KEY, JSON.stringify(gesendet));
    } else {
      console.log(`Kein Kurs im Versandfenster (${jetzt.iso}, ${Math.floor(jetzt.minuten / 60)}:${String(jetzt.minuten % 60).padStart(2, "0")} Uhr Berlin).`);
    }

  } catch (err) {
    console.error("Fehler:", err);
  }
};

// ── Zeitplan (Netlify rechnet in UTC) ─────────────────────────────────────
// Alle 5 Minuten, 6 bis 17 Uhr UTC (= 8 bis 19 Uhr Berlin im Sommer), nur Mo, Do, Fr.
// Die genaue Auswahl der Kurse passiert im Code auf Basis der Berliner Zeit.
export const config = {
  schedule: "*/5 6-17 * * 1,4,5",
};

export default handler;
