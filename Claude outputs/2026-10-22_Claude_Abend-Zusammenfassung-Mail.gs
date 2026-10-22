// 2026-10-22_Claude_Zusammenfassung-Mail.gs
//
// Komplett in Google Apps Script. Ersetzt die alte Version (Web-App ist nicht mehr nötig).
// Liest die Anmeldungen aus der Kursabfrage (blob-get), prüft die Berliner Zeit und
// verschickt die Zusammenfassung per Gmail, wenn ein Kurs 5 bis 15 Min vor Start liegt.
//
// EINRICHTUNG:
// 1. Neues Projekt in script.google.com, Name "Zusammenfassung-Mail"
// 2. Diesen Code einfügen (Standard-Code ersetzen), speichern
// 3. Trigger (Uhr-Symbol links) > Trigger hinzufügen:
//    Funktion: alle5Minuten | Ereignisquelle: Zeitgesteuert | Typ: Minuten-Timer | alle 5 Minuten
// 4. Einmal "alle5Minuten" manuell ausführen und Berechtigungen bestätigen

const ZS_BLOB = "https://bauch-baby-beckenboden-kursabfrage.netlify.app/.netlify/functions/blob-get?key=";
const ZS_AN = "kontakt@bauch-baby-beckenboden.com";
const ZS_VON = 5;   // Minuten vor Kursbeginn (frühester Versand)
const ZS_BIS = 15;  // Minuten vor Kursbeginn (spätester Versand)
const ZS_ERLAUBT = [1, 4, 5]; // Mo, Do, Fr (0 = So)

const ZS_WOCHEN = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const ZS_MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function alle5Minuten() {
  const jetzt = zsBerlinJetzt();
  if (ZS_ERLAUBT.indexOf(jetzt.wochentag) === -1) return;

  const gruppen = zsLade("bbb_gruppen_v2");
  const votes = zsLade("bbb_votes_v2");
  const removedData = zsLade("bbb_removed_v2");
  const notizenData = zsLade("bbb_notizen_v2");

  const props = PropertiesService.getScriptProperties();
  let gesendet = {};
  try { gesendet = JSON.parse(props.getProperty("gesendet") || "{}"); } catch (e) { gesendet = {}; }
  // Einträge von anderen Tagen entfernen
  Object.keys(gesendet).forEach(function (key) {
    if (key.indexOf("_" + jetzt.iso) === -1) delete gesendet[key];
  });

  let geaendert = false;

  Object.keys(gruppen).forEach(function (id) {
    const gruppe = gruppen[id];
    if (!gruppe.uhrzeit || gruppe.wochentag !== jetzt.wochentag) return;

    const teile = gruppe.uhrzeit.split(":").map(Number);
    const minutenBisKurs = teile[0] * 60 + teile[1] - jetzt.minuten;
    if (minutenBisKurs < ZS_VON || minutenBisKurs > ZS_BIS) return;

    const removed = (removedData && removedData[id]) || [];
    const hatTermin = (gruppe.dates || []).indexOf(jetzt.iso) !== -1 && removed.indexOf(jetzt.iso) === -1;
    if (!hatTermin) return;

    const key = id + "_" + jetzt.iso;
    if (gesendet[key]) return;

    const v = (votes && votes[key]) || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
    const notiz = (notizenData && notizenData[key]) || null;

    const subject = "✨ Heute in " + minutenBisKurs + " Min: " + gruppe.name;
    GmailApp.sendEmail(ZS_AN, subject, "Bitte die HTML-Ansicht öffnen.", {
      htmlBody: zsBuildHtml(gruppe, jetzt.iso, v, notiz, minutenBisKurs),
      name: "Kursapp"
    });

    gesendet[key] = new Date().getTime();
    geaendert = true;
  });

  if (geaendert) props.setProperty("gesendet", JSON.stringify(gesendet));
}

// ── Berliner Zeit ─────────────────────────────────────────────────────────
function zsBerlinJetzt() {
  const jetzt = new Date();
  const iso = Utilities.formatDate(jetzt, "Europe/Berlin", "yyyy-MM-dd");
  const hm = Utilities.formatDate(jetzt, "Europe/Berlin", "HH:mm").split(":").map(Number);
  return {
    iso: iso,
    minuten: hm[0] * 60 + hm[1],
    wochentag: new Date(iso + "T12:00:00").getDay()
  };
}

// ── Daten aus der Kursabfrage ─────────────────────────────────────────────
function zsLade(key) {
  try {
    const res = UrlFetchApp.fetch(ZS_BLOB + key, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return {};
    return JSON.parse(res.getContentText()) || {};
  } catch (e) {
    console.error("Blob " + key + " nicht lesbar: " + e);
    return {};
  }
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
function zsDatumDE(iso) {
  const d = new Date(iso + "T12:00:00");
  return ZS_WOCHEN[d.getDay()] + ", " + d.getDate() + ". " + ZS_MONATE[d.getMonth()] + " " + d.getFullYear();
}

// ── E-Mail HTML (nur Emojis aus der Basic Multilingual Plane) ─────────────
function zsBuildHtml(gruppe, termin, votes, notiz, minutenBisKurs) {
  const total = (votes.kommt || 0) + (votes.kinderwagen || 0);
  return '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;">' +
    '<div style="background:linear-gradient(135deg,#C4A0A0,#8B6464);padding:28px 32px;">' +
    '<div style="font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:6px;">Zusammenfassung vor Kursbeginn</div>' +
    '<div style="font-size:26px;font-weight:700;color:#fff;">Kurs in ca. ' + minutenBisKurs + ' Min ✨</div></div>' +
    '<div style="padding:28px 32px;">' +
    '<div style="background:#fdf8f5;border-radius:16px;padding:20px 24px;border:1px solid #e8d5c8;">' +
    '<div style="font-size:18px;font-weight:700;color:#3D2B2B;margin-bottom:4px;">' + gruppe.name + '</div>' +
    '<div style="font-size:14px;color:#8B6464;margin-bottom:' + (notiz ? "8px" : "16px") + ';">' + zsDatumDE(termin) + ' · ' + gruppe.uhrzeit + ' Uhr</div>' +
    (notiz ? '<div style="font-size:13px;color:#8B6464;font-style:italic;background:rgba(196,137,110,0.1);border-radius:8px;padding:6px 12px;margin-bottom:14px;">Notiz: ' + notiz + '</div>' : '') +
    '<table style="width:100%;border-collapse:collapse;">' +
    zsZeile('✅ Kommen vor Ort', votes.kommt || 0, '#5a9e6e') +
    (gruppe.baby ? zsZeile('Mit Kinderwagen', votes.kinderwagen || 0, '#C4A0A0') : '') +
    zsZeile('Online dabei', votes.online || 0, '#5a7ec0') +
    zsZeile('Kommen nicht', votes.kommt_nicht || 0, '#c05040') +
    '<tr><td style="padding:10px 0 0;font-size:15px;font-weight:600;color:#3D2B2B;">Gesamt vor Ort</td>' +
    '<td style="padding:10px 0 0;text-align:right;font-size:22px;font-weight:700;color:#C4A0A0;">' + total + '</td></tr>' +
    '</table></div>' +
    '<div style="margin-top:20px;font-size:13px;color:#b8927a;font-style:italic;text-align:center;">Automatisch gesendet von deiner Kursapp · Bauch Baby Beckenboden</div>' +
    '</div></div>';
}

function zsZeile(label, wert, farbe) {
  return '<tr><td style="padding:8px 0;border-bottom:1px solid #F6EBE8;font-size:15px;color:#3D2B2B;">' + label + '</td>' +
    '<td style="padding:8px 0;border-bottom:1px solid #F6EBE8;text-align:right;font-size:20px;font-weight:700;color:' + farbe + ';">' + wert + '</td></tr>';
}
