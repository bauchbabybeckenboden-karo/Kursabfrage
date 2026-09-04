// Ziel im Repo: netlify/functions/notify-kursmeldung.mjs (NEUE Datei)
//
// ERSETZT notify-online.mjs: die alte Datei bitte aus dem Repo löschen,
// diese hier deckt jetzt ALLE Rückmeldungen ab (kommt, kommt nicht, online,
// mit Kinderwagen) – nicht mehr nur "online". Format/Optik ist bewusst
// identisch zur "Kursmeldung"-Mail aus dem Absage-Tool (netlify/functions/absage.js
// dort), nur die Meldung selbst ist jetzt nicht mehr auf Absage/Online-Teilnahme
// begrenzt, sondern zeigt den tatsächlich gewählten Status (z.B. "Online dabei
// (Zoom)" statt fälschlich "Abgesagt").
//
// Umgebungsvariablen (in Netlify UI setzen, dieselbe wie bei der Abend-Mail):
//   RESEND_API_KEY   → dein Resend API-Key (re_xxxx...)
//
// WICHTIG: Muss auf GENAU DIESER Netlify-Seite gesetzt sein (Site Settings →
// Environment Variables) – siehe Hinweis dazu im Chat (bisher kam über diese
// Kursabfrage-Seite noch nie eine Mail an, vermutlich weil der Key hier fehlt
// oder die Seite unter einem anderen Netlify-Account läuft).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AN  = "kontakt@bauch-baby-beckenboden.com";
const VON = "Kursapp <kontakt@bauch-baby-beckenboden.com>";

// Farbe je nach Meldung, gleiche Optik wie beim Absage-Tool
function farbeFuer(meldung) {
  if (meldung === "Online dabei (Zoom)") return "#4a6a9a";
  if (meldung === "Kann leider nicht teilnehmen") return "#7a3f3a";
  return "#4a7a5a"; // Vor Ort dabei / Vor Ort mit Kinderwagen
}

export default async (req) => {
  if (req.method !== "POST") return new Response("POST erwartet", { status: 405 });

  if (!RESEND_API_KEY) {
    console.error("notify-kursmeldung: RESEND_API_KEY fehlt in den Umgebungsvariablen dieser Netlify-Seite.");
    return new Response("RESEND_API_KEY fehlt", { status: 500 });
  }

  try {
    const { name, email, kursart, meldung, termin, uhrzeit } = await req.json();

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #2a1a1a;">
        <h2 style="color: #7a3f3a; margin-bottom: 4px;">📬 Neue Kursmeldung</h2>
        <p style="color: #8a7060; font-size: 13px; margin-bottom: 24px;">eingegangen über die Kursapp</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 10px 14px; background: #f8f4f0; font-weight: 600; width: 40%;">Name</td>
            <td style="padding: 10px 14px; background: #f8f4f0;">${name || ""}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-top: 1px solid #e2d8d0; font-weight: 600;">E-Mail</td>
            <td style="padding: 10px 14px; border-top: 1px solid #e2d8d0;">
              <a href="mailto:${email || ""}" style="color: #7a3f3a;">${email || ""}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-top: 1px solid #e2d8d0; font-weight: 600;">Kurs</td>
            <td style="padding: 10px 14px; border-top: 1px solid #e2d8d0;">${kursart || ""}</td>
          </tr>
          <tr>
            <td style="padding: 8px 14px; border-top: 1px solid #e2d8d0; font-weight: 600;">
              ${termin || ""}${uhrzeit ? " · " + uhrzeit + " Uhr" : ""}
            </td>
            <td style="padding: 8px 14px; border-top: 1px solid #e2d8d0;">
              <span style="color: ${farbeFuer(meldung)}; font-weight: 600;">${meldung || ""}</span>
            </td>
          </tr>
        </table>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: VON,
        to: [AN],
        subject: `Kursmeldung von ${name || "?"} – ${kursart || "Kurs"} (${meldung || "?"})`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend Fehler (notify-kursmeldung):", err);
      return new Response("Fehler beim Senden", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("Fehler notify-kursmeldung:", e);
    return new Response(e.message, { status: 500 });
  }
};

export const config = { path: "/.netlify/functions/notify-kursmeldung" };
