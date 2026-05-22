# Bauch Baby Beckenboden – Kursapp

## Setup in 5 Schritten

### 1. GitHub Repository anlegen
- Neues Repo auf github.com erstellen (z.B. `bbb-kursapp`)
- Alle Dateien aus diesem ZIP hochladen (einfach per Drag & Drop auf GitHub)

### 2. Netlify verbinden
- netlify.com → „Add new site" → „Import an existing project"
- GitHub auswählen → dein Repo wählen
- Build-Einstellungen werden automatisch aus `netlify.toml` gelesen
- „Deploy site" klicken

### 3. Umgebungsvariable setzen
In Netlify: Site Settings → Environment Variables → Add variable:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | Dein Resend API-Key (re_xxxx...) |

### 4. Abend-E-Mail aktivieren
- Netlify erkennt die Scheduled Function automatisch
- Läuft täglich um 18:30 UTC (= 19:30 Uhr Winterzeit / 20:30 Uhr Sommerzeit)
- E-Mail kommt nur, wenn morgen tatsächlich ein Kurs stattfindet
- Empfänger: kontakt@bauch-baby-beckenboden.com

> **Hinweis Sommerzeit:** Netlify Scheduled Functions laufen in UTC.
> 18:30 UTC = 20:30 Uhr MESZ (Sommerzeit) oder 19:30 Uhr MEZ (Winterzeit).
> Wenn du immer genau 20:00 Uhr möchtest, wäre 19:00 UTC besser für den Winter –
> du kannst das in `netlify/functions/abend-zusammenfassung.mjs` anpassen:
> Zeile `schedule: "30 18 * * *"` → z.B. `"0 19 * * *"` für 20:00 Uhr MEZ.

### 5. Admin-Zugang
Die Admin-Ansicht erreichst du unter:
```
https://deine-netlify-url.netlify.app/?admin=1
```

---

## Projektstruktur

```
├── index.html                          ← HTML-Einstiegspunkt
├── vite.config.js                      ← Build-Konfiguration
├── package.json                        ← React-Abhängigkeiten
├── netlify.toml                        ← Netlify Build + Routing
├── src/
│   ├── main.jsx                        ← React-Einstiegspunkt
│   └── App.jsx                         ← Kursapp (Haupt-Komponente)
└── netlify/
    └── functions/
        ├── package.json                ← Blob + Functions-Abhängigkeiten
        ├── blob-get.mjs                ← Daten lesen (Browser → Blob Store)
        ├── blob-set.mjs                ← Daten schreiben (Browser → Blob Store)
        └── abend-zusammenfassung.mjs   ← Tägliche E-Mail via Resend
```
