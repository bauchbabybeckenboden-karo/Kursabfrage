// Ziel im Repo: netlify/functions/kurs-kalender.mjs (NEUE Datei)
//
// Kalender-Feed (.ics) mit allen Kursterminen aus der Kursabfrage-App
// (bezeichnet und numeriert) plus den hessischen Schulferien als
// Ganztagestermine. Erreichbar unter: /kalender.ics
//
// Termine, die in der App entfernt/durchgestrichen sind (z.B. Ferien),
// erscheinen nicht im Kalender und zaehlen nicht bei der Nummerierung.

import { getStore } from "@netlify/blobs";

// Kursdauer in Minuten (fuer alle Kurse gleich) - bei Bedarf anpassen
const DAUER_MIN = 60;

const FERIEN = [
  ["2026-10-05", "2026-10-17", "Herbstferien"],
  ["2026-12-23", "2027-01-12", "Weihnachtsferien"],
  ["2027-03-22", "2027-04-02", "Osterferien"],
  ["2027-06-28", "2027-08-06", "Sommerferien"],
  ["2027-10-04", "2027-10-16", "Herbstferien"],
  ["2027-12-23", "2028-01-11", "Weihnachtsferien"],
  ["2028-04-03", "2028-04-14", "Osterferien"],
  ["2028-07-03", "2028-08-11", "Sommerferien"],
  ["2028-10-09", "2028-10-20", "Herbstferien"],
  ["2028-12-27", "2029-01-12", "Weihnachtsferien"],
  ["2029-03-29", "2029-04-13", "Osterferien"],
  ["2029-07-16", "2029-08-24", "Sommerferien"],
  ["2029-10-15", "2029-10-26", "Herbstferien"],
  ["2029-12-24", "2030-01-11", "Weihnachtsferien"],
  ["2030-04-08", "2030-04-22", "Osterferien"],
  ["2030-07-22", "2030-08-30", "Sommerferien"],
];

const esc = (s) =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

const ymd = (iso) => iso.replace(/-/g, "");

function plusDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function endTime(uhrzeit) {
  const [h, m] = uhrzeit.split(":").map(Number);
  const t = h * 60 + m + DAUER_MIN;
  return (
    String(Math.floor(t / 60) % 24).padStart(2, "0") +
    String(t % 60).padStart(2, "0") +
    "00"
  );
}

async function readBlob(key) {
  try {
    const store = getStore("bbb-shared");
    const val = await store.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export default async () => {
  const gruppen = (await readBlob("bbb_gruppen_v2")) || {};
  const removed = (await readBlob("bbb_removed_v2")) || {};
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BBB Kursabfrage//DE",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:BBB Kurse",
    "X-WR-TIMEZONE:Europe/Berlin",
  ];

  // Kurstermine
  for (const [gid, g] of Object.entries(gruppen)) {
    const skip = new Set(removed[gid] || []);
    const dates = (g.dates || []).filter((d) => !skip.has(d)).sort();
    const uhrzeit = g.uhrzeit || "09:00";
    const [hh, mm] = uhrzeit.split(":");
    dates.forEach((d, i) => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${gid}-${d}@bbb-kursabfrage`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${ymd(d)}T${hh}${mm}00`,
        `DTEND:${ymd(d)}T${endTime(uhrzeit)}`,
        `SUMMARY:${esc(`${g.name} Nr. ${i + 1}/${dates.length}`)}`,
        "LOCATION:Heinrich-Bertelmann-Str. 12\\, Kassel",
        "END:VEVENT"
      );
    });
  }

  // Hessische Schulferien als Ganztagstermine (Enddatum ist exklusiv)
  for (const [start, end, name] of FERIEN) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:ferien-${start}@bbb-kursabfrage`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`,
      `DTEND;VALUE=DATE:${ymd(plusDays(end, 1))}`,
      `SUMMARY:${esc(`Hessen: ${name}`)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
};

export const config = { path: "/kalender.ics" };
