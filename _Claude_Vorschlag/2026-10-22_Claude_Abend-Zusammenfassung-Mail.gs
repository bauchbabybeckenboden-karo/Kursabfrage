// 2026-10-22_Claude_Abend-Zusammenfassung-Mail.gs
//
// Neues eigenständiges Apps-Script-Projekt (Web-App).
// Empfängt die Abend-Zusammenfassung von der Netlify-Funktion und
// verschickt sie per Gmail an kontakt@bauch-baby-beckenboden.com.
//
// EINRICHTUNG:
// 1. script.google.com > Neues Projekt > Name "Abend-Zusammenfassung-Mail"
// 2. Diesen Code einfügen (Standard-Code ersetzen), speichern
// 3. Zahnrad (Projekteinstellungen) > Skript-Eigenschaften > hinzufügen:
//    Name: ABEND_TOKEN   Wert: ein langer Zufallstext (z. B. 40+ Zeichen)
// 4. Bereitstellen > Neue Bereitstellung > Typ: Web-App
//    Ausführen als: Ich | Zugriff: Jeder
// 5. Die Web-App-URL (endet auf /exec) und denselben Token in Netlify
//    als Umgebungsvariablen eintragen: APPS_SCRIPT_URL und ABEND_TOKEN

const AN_MAIL = "kontakt@bauch-baby-beckenboden.com";

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const token = PropertiesService.getScriptProperties().getProperty("ABEND_TOKEN");

    if (!token || data.token !== token) {
      return jsonOut({ ok: false, error: "unauthorized" });
    }
    if (!data.subject || !data.html) {
      return jsonOut({ ok: false, error: "missing subject or html" });
    }

    GmailApp.sendEmail(AN_MAIL, String(data.subject), "Bitte die HTML-Ansicht öffnen.", {
      htmlBody: String(data.html),
      name: "Kursapp"
    });

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
