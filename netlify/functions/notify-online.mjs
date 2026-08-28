// netlify/functions/notify-online.mjs
//
// Sendet Karo sofort eine kurze E-Mail, sobald eine Teilnehmerin
// "Online dabei" für einen Termin auswählt (im Unterschied zur
// abend-zusammenfassung.mjs, die nur einmal täglich zusammenfasst).
//
// Umgebungsvariablen (in Netlify UI setzen, dieselbe wie bei der Abend-Mail):
//   RESEND_API_KEY   → dein Resend API-Key (re_xxxx...)

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AN  = "kontakt@bauch-baby-beckenboden.com";
const VON = "Kursapp <kontakt@bauch-baby-beckenboden.com>";

export default async (req) => {
  if (req.method !== "POST") return new Response("POST erwartet", { status: 405 });

  try {
    const { kursname, termin, uhrzeit } = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: VON,
        to: [AN],
        subject: `💻 Online-Anmeldung${kursname ? ": " + kursname : ""}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(120,70,50,0.08);">
            <div style="background:linear-gradient(135deg,#5a7ec0,#4a6a9a);padding:20px 24px;">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:4px;">Neue Rückmeldung</div>
              <div style="font-size:20px;font-weight:700;color:#fff;">💻 Jemand ist online dabei</div>
            </div>
            <div style="padding:22px 24px;">
              <p style="font-size:16px;font-weight:700;color:#2d1f1a;margin:0 0 4px;">${kursname || "Kurs"}</p>
              <p style="font-size:14px;color:#9c6b55;margin:0;">${termin || ""}${uhrzeit ? " · " + uhrzeit + " Uhr" : ""}</p>
            </div>
          </div>`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend Fehler (notify-online):", err);
      return new Response("Fehler beim Senden", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("Fehler notify-online:", e);
    return new Response(e.message, { status: 500 });
  }
};

export const config = { path: "/.netlify/functions/notify-online" };
