import { useState, useEffect } from "react";

// ─── Hessische Feiertage ─────────────────────────────────────────────────────
function getEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
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

function computeDates(wochentag, startStr, endStr) {
  const termine = [];
  const end = new Date(endStr);
  const cur = new Date(startStr);
  while (cur.getDay() !== wochentag) cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    const iso = toISO(cur);
    if (!hessianHolidays(cur.getFullYear()).has(iso)) termine.push(iso);
    cur.setDate(cur.getDate() + 7);
  }
  return termine;
}

// ─── Storage ─────────────────────────────────────────────────────────────────
async function sget(key) {
  try {
    const r = await fetch(`/.netlify/functions/blob-get?key=${encodeURIComponent(key)}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function sset(key, val) {
  try {
    await fetch(`/.netlify/functions/blob-set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: val }),
    });
  } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const WOCHENTAGE = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const WOCHENTAGE_SHORT = ["So","Mo","Di","Mi","Do","Fr","Sa"];

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

function getCurrentTermin(dates, uhrzeit) {
  const now = new Date();
  const todayISO = toISO(now);
  const [h, m] = uhrzeit.split(":").map(Number);
  for (const iso of dates) {
    if (iso < todayISO) continue;
    if (iso === todayISO) {
      const kursTime = new Date(); kursTime.setHours(h, m, 0, 0);
      const cutoff = new Date(kursTime.getTime() - 30 * 60000);
      if (now < cutoff) return iso; // noch änderbar
      if (now < kursTime) return iso; // nicht mehr änderbar aber noch heute
    }
    return iso;
  }
  return dates[dates.length - 1] ?? null;
}

function isChangeable(iso, uhrzeit) {
  if (!iso) return false;
  const now = new Date();
  const todayISO = toISO(now);
  if (iso > todayISO) return true;
  if (iso < todayISO) return false;
  const [h, m] = uhrzeit.split(":").map(Number);
  const kursTime = new Date(); kursTime.setHours(h, m, 0, 0);
  const cutoff = new Date(kursTime.getTime() - 30 * 60000);
  return now < cutoff;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5ede8 0%, #fdf8f5 50%, #ede8e3 100%)",
    fontFamily: "'Cormorant Garamond', 'Georgia', serif",
    color: "#2d1f1a",
  },
  header: {
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(180,130,110,0.2)",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    height: "48px",
    width: "auto",
    display: "block",
    objectFit: "contain",
  },
  adminBtn: {
    fontSize: "11px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#b8927a",
    background: "none",
    border: "1px solid rgba(180,130,110,0.3)",
    borderRadius: "20px",
    padding: "5px 14px",
    cursor: "pointer",
  },
  page: { maxWidth: 480, margin: "0 auto", padding: "24px 20px 60px" },
  card: {
    background: "rgba(255,255,255,0.85)",
    borderRadius: "20px",
    padding: "28px 24px",
    boxShadow: "0 4px 24px rgba(120,70,50,0.08)",
    border: "1px solid rgba(180,130,110,0.15)",
    marginBottom: "20px",
  },
  terminLabel: {
    fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase",
    color: "#b8927a", marginBottom: "6px",
  },
  terminDate: {
    fontSize: "28px", fontWeight: 700, color: "#2d1f1a", lineHeight: 1.1,
    marginBottom: "4px",
  },
  terminTime: { fontSize: "16px", color: "#9c6b55", marginBottom: "20px" },
  cutoffNote: {
    fontSize: "12px", color: "#b8927a", fontStyle: "italic",
    background: "rgba(180,130,110,0.08)", borderRadius: "10px",
    padding: "8px 12px", marginBottom: "20px",
  },
  responseGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  responseBtn: (active, color) => ({
    borderRadius: "16px",
    padding: "18px 12px",
    border: active ? `2px solid ${color}` : "2px solid rgba(180,130,110,0.15)",
    background: active ? `${color}18` : "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
    boxShadow: active ? `0 4px 16px ${color}30` : "none",
    transform: active ? "scale(1.03)" : "scale(1)",
  }),
  responseBtnEmoji: { fontSize: "32px", lineHeight: 1 },
  responseBtnLabel: (active, color) => ({
    fontSize: "13px", fontWeight: active ? 700 : 500,
    color: active ? color : "#9c6b55", letterSpacing: "0.03em",
  }),
  statsCard: {
    background: "rgba(255,255,255,0.6)",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid rgba(180,130,110,0.12)",
  },
  statsTitle: {
    fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase",
    color: "#b8927a", marginBottom: "14px",
  },
  statRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 0", borderBottom: "1px solid rgba(180,130,110,0.08)",
  },
  statLeft: { display: "flex", alignItems: "center", gap: "10px" },
  statEmoji: { fontSize: "20px" },
  statLabel: { fontSize: "15px", color: "#5a3a2e" },
  statCount: { fontSize: "22px", fontWeight: 700, color: "#9c6b55" },
  konfirmBox: {
    background: "rgba(140,200,140,0.12)",
    border: "1px solid rgba(100,180,100,0.3)",
    borderRadius: "14px", padding: "16px 20px", textAlign: "center",
    marginTop: "20px",
  },
  konfirmText: { fontSize: "15px", color: "#3a6b3a", fontWeight: 600 },
  konfirmSub: { fontSize: "13px", color: "#5a8a5a", marginTop: "4px" },

  // Admin styles
  adminCard: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: "20px", padding: "28px 24px",
    boxShadow: "0 4px 24px rgba(120,70,50,0.1)",
    border: "1px solid rgba(180,130,110,0.2)",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase",
    color: "#b8927a", marginBottom: "16px", fontWeight: 600,
  },
  label: { fontSize: "13px", color: "#7a5a4e", marginBottom: "5px", display: "block" },
  input: {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1.5px solid rgba(180,130,110,0.25)", background: "rgba(255,255,255,0.8)",
    fontSize: "15px", color: "#2d1f1a", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  },
  select: {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1.5px solid rgba(180,130,110,0.25)", background: "rgba(255,255,255,0.8)",
    fontSize: "15px", color: "#2d1f1a", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  },
  checkRow: { display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" },
  checkLabel: { fontSize: "14px", color: "#5a3a2e" },
  primaryBtn: {
    width: "100%", padding: "14px", borderRadius: "14px",
    background: "linear-gradient(135deg, #c4896e, #a06848)",
    color: "white", border: "none", fontSize: "15px",
    fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer",
    fontFamily: "inherit", marginTop: "8px",
  },
  dangerBtn: {
    padding: "6px 14px", borderRadius: "10px",
    background: "rgba(200,80,60,0.1)", color: "#c05040",
    border: "1px solid rgba(200,80,60,0.2)", fontSize: "12px",
    cursor: "pointer", fontFamily: "inherit",
  },
  gruppeCard: (active) => ({
    background: active ? "rgba(180,130,110,0.1)" : "rgba(255,255,255,0.5)",
    borderRadius: "14px", padding: "14px 16px", marginBottom: "10px",
    border: active ? "1.5px solid rgba(180,130,110,0.35)" : "1px solid rgba(180,130,110,0.15)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }),
  gruppeInfo: {},
  gruppeName: { fontSize: "16px", fontWeight: 600, color: "#2d1f1a" },
  gruppeDetails: { fontSize: "12px", color: "#9c6b55", marginTop: "2px" },
  terminListItem: (removed) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "7px 10px", borderRadius: "8px", marginBottom: "4px",
    background: removed ? "rgba(200,80,60,0.06)" : "rgba(255,255,255,0.5)",
    border: removed ? "1px solid rgba(200,80,60,0.15)" : "1px solid rgba(180,130,110,0.1)",
    opacity: removed ? 0.6 : 1,
  }),
  terminDateSmall: (removed) => ({
    fontSize: "14px", color: removed ? "#c05040" : "#2d1f1a",
    textDecoration: removed ? "line-through" : "none",
  }),
  linkBox: {
    background: "rgba(180,130,110,0.08)", borderRadius: "12px",
    padding: "12px 16px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: "10px", marginTop: "12px",
  },
  linkText: { fontSize: "12px", color: "#7a5a4e", wordBreak: "break-all", flex: 1 },
  copyBtn: {
    padding: "6px 14px", borderRadius: "8px",
    background: "rgba(180,130,110,0.15)", color: "#9c6b55",
    border: "1px solid rgba(180,130,110,0.25)", fontSize: "12px",
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
  },
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const gruppeId = params.get("gruppe");
  const adminMode = params.get("admin") === "1";

  const [gruppen, setGruppen] = useState(null);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState(null);
  const [copied, setCopied] = useState(null);
  const [saved, setSaved] = useState(false);

  // Admin form state
  const [newName, setNewName] = useState("");
  const [newWochentag, setNewWochentag] = useState(1);
  const [newUhrzeit, setNewUhrzeit] = useState("09:30");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newBaby, setNewBaby] = useState(false);
  const [editTermine, setEditTermine] = useState(null); // gruppeId being edited
  const [removedDates, setRemovedDates] = useState({});

  useEffect(() => {
    (async () => {
      const g = await sget("bbb_gruppen_v2");
      const v = await sget("bbb_votes_v2");
      const rm = await sget("bbb_removed_v2");
      setGruppen(g || {});
      setVotes(v || {});
      setRemovedDates(rm || {});
      // Restore my vote from localStorage
      if (gruppeId) {
        const terminKey = `myvote_${gruppeId}`;
        setMyVote(localStorage.getItem(terminKey) || null);
      }
      setLoading(false);
    })();
  }, []);

  const saveGruppen = async (g) => { setGruppen(g); await sset("bbb_gruppen_v2", g); };
  const saveVotes = async (v) => { setVotes(v); await sset("bbb_votes_v2", v); };
  const saveRemoved = async (r) => { setRemovedDates(r); await sset("bbb_removed_v2", r); };

  const addGruppe = async () => {
    if (!newName || !newStart || !newEnd) return;
    const id = newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
    const dates = computeDates(Number(newWochentag), newStart, newEnd);
    const g = {
      ...gruppen,
      [id]: { name: newName, wochentag: Number(newWochentag), uhrzeit: newUhrzeit, start: newStart, end: newEnd, baby: newBaby, dates },
    };
    await saveGruppen(g);
    setNewName(""); setNewStart(""); setNewEnd(""); setNewBaby(false);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const deleteGruppe = async (id) => {
    const g = { ...gruppen }; delete g[id];
    const v = { ...votes }; Object.keys(v).filter(k => k.startsWith(id)).forEach(k => delete v[k]);
    await saveGruppen(g); await saveVotes(v);
  };

  const toggleRemoved = async (gid, date) => {
    const key = gid;
    const cur = removedDates[key] || [];
    const updated = cur.includes(date) ? cur.filter(d => d !== date) : [...cur, date];
    const r = { ...removedDates, [key]: updated };
    await saveRemoved(r);
  };

  const handleVote = async (option) => {
    if (!gruppeId || !gruppen?.[gruppeId]) return;
    const gruppe = gruppen[gruppeId];
    const activeRemoved = removedDates[gruppeId] || [];
    const availDates = gruppe.dates.filter(d => !activeRemoved.includes(d));
    const termin = getCurrentTermin(availDates, gruppe.uhrzeit);
    if (!termin) return;
    if (!isChangeable(termin, gruppe.uhrzeit)) return;

    const voteKey = `${gruppeId}_${termin}`;
    const curVotes = votes[voteKey] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
    const prev = myVote;

    // Undo previous
    const updated = { ...curVotes };
    if (prev) updated[prev] = Math.max(0, (updated[prev] || 0) - 1);
    // Add new (toggle off if same)
    if (prev !== option) {
      updated[option] = (updated[option] || 0) + 1;
      setMyVote(option);
      localStorage.setItem(`myvote_${gruppeId}`, option);
      // Weiterleitung bei Absage
      if (option === "kommt_nicht") {
        setTimeout(() => {
          window.open("https://bauch-baby-beckenboden-absage.netlify.app/", "_blank");
        }, 800);
      }
    } else {
      setMyVote(null);
      localStorage.removeItem(`myvote_${gruppeId}`);
    }

    const v = { ...votes, [voteKey]: updated };
    await saveVotes(v);
  };

  const getLink = (id) => `${window.location.origin}${window.location.pathname}?gruppe=${id}`;

  const copyLink = (id) => {
    navigator.clipboard.writeText(getLink(id));
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontSize: "18px", color: "#9c6b55", fontStyle: "italic" }}>Lädt …</div>
    </div>
  );

  // ── TEILNEHMERINNEN-ANSICHT ──────────────────────────────────────────────
  if (gruppeId && !adminMode) {
    const gruppe = gruppen?.[gruppeId];
    if (!gruppe) return (
      <div style={S.app}><div style={S.page}>
        <div style={S.card}><p style={{ color: "#c05040", fontSize: "16px" }}>Diese Gruppe wurde nicht gefunden.</p></div>
      </div></div>
    );

    const activeRemoved = removedDates[gruppeId] || [];
    const availDates = gruppe.dates.filter(d => !activeRemoved.includes(d));
    const termin = getCurrentTermin(availDates, gruppe.uhrzeit);
    const changeable = isChangeable(termin, gruppe.uhrzeit);
    const voteKey = `${gruppeId}_${termin}`;
    const curVotes = votes[voteKey] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
    const total = curVotes.kommt + curVotes.online + curVotes.kinderwagen;

    const options = [
      { key: "kommt", emoji: "✅", label: "Ich komme", color: "#5a9e6e" },
      { key: "kommt_nicht", emoji: "😖", label: "Komme nicht", color: "#c05040" },
      { key: "online", emoji: "💻", label: "Online dabei", color: "#5a7ec0" },
      ...(gruppe.baby ? [{ key: "kinderwagen", emoji: "🛒", label: "Mit Kinderwagen", color: "#c08040" }] : []),
    ];

    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        <div style={S.header}>
          <img src="https://bauch-baby-beckenbodencom-a6xk9yzmhk.live-website.com/wp-content/uploads/2026/05/cropped-2026-05-06.jpg" alt="Bauch Baby Beckenboden" style={S.logo} />
        </div>
        <div style={S.page}>
          <div style={S.card}>
            <div style={S.terminLabel}>Nächste Kursstunde</div>
            <div style={S.terminDate}>{termin ? formatDate(termin) : "—"}</div>
            <div style={S.terminTime}>🕐 {gruppe.uhrzeit} Uhr · {gruppe.name}</div>

            {!changeable && termin && (
              <div style={S.cutoffNote}>⏰ Anmeldeschluss erreicht – keine Änderungen mehr möglich.</div>
            )}
            {changeable && myVote && (
              <div style={{ ...S.cutoffNote, background: "rgba(90,158,110,0.08)", borderColor: "rgba(90,158,110,0.2)" }}>
                ✏️ Du kannst deine Antwort noch bis 30 Min vor Kurs ändern.
              </div>
            )}

            <div style={S.responseGrid}>
              {options.map(opt => (
                <button
                  key={opt.key}
                  style={S.responseBtn(myVote === opt.key, opt.color)}
                  onClick={() => changeable && handleVote(opt.key)}
                  disabled={!changeable}
                >
                  <span style={S.responseBtnEmoji}>{opt.emoji}</span>
                  <span style={S.responseBtnLabel(myVote === opt.key, opt.color)}>{opt.label}</span>
                </button>
              ))}
            </div>

            {myVote && (
              <div style={S.konfirmBox}>
                <div style={S.konfirmText}>
                  {options.find(o => o.key === myVote)?.emoji} Danke für deine Rückmeldung!
                </div>
                <div style={S.konfirmSub}>Die Karo freut sich 🌸</div>
              </div>
            )}
          </div>

          <div style={S.statsCard}>
            <div style={S.statsTitle}>Aktuelle Anmeldungen</div>
            {[
              { key: "kommt", emoji: "✅", label: "Kommen" },
              { key: "online", emoji: "💻", label: "Online" },
              ...(gruppe.baby ? [{ key: "kinderwagen", emoji: "🛒", label: "Mit Kinderwagen" }] : []),
              { key: "kommt_nicht", emoji: "😖", label: "Kommen nicht" },
            ].map((s, i, arr) => (
              <div key={s.key} style={{ ...S.statRow, borderBottom: i === arr.length - 1 ? "none" : undefined }}>
                <div style={S.statLeft}>
                  <span style={S.statEmoji}>{s.emoji}</span>
                  <span style={S.statLabel}>{s.label}</span>
                </div>
                <span style={S.statCount}>{curVotes[s.key] || 0}</span>
              </div>
            ))}
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(180,130,110,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", color: "#9c6b55" }}>Gesamt vor Ort</span>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#c4896e" }}>{total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN-ANSICHT ────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      <div style={S.header}>
        <img src="https://bauch-baby-beckenbodencom-a6xk9yzmhk.live-website.com/wp-content/uploads/2026/05/cropped-2026-05-06.jpg" alt="Bauch Baby Beckenboden" style={S.logo} />
        <span style={{ fontSize: "12px", color: "#b8927a", letterSpacing: "0.1em" }}>ADMIN</span>
      </div>
      <div style={S.page}>

        {/* Neue Gruppe anlegen */}
        <div style={S.adminCard}>
          <div style={S.sectionTitle}>✦ Neue Kursgruppe anlegen</div>

          <div style={{ marginBottom: "12px" }}>
            <label style={S.label}>Kursname</label>
            <input style={S.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Montag Yoga" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={S.label}>Wochentag</label>
              <select style={S.select} value={newWochentag} onChange={e => setNewWochentag(e.target.value)}>
                {WOCHENTAGE.map((w, i) => <option key={i} value={i}>{w}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Uhrzeit</label>
              <input style={S.input} type="time" value={newUhrzeit} onChange={e => setNewUhrzeit(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={S.label}>Startdatum</label>
              <input style={S.input} type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Enddatum</label>
              <input style={S.input} type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
          </div>
          <div style={S.checkRow}>
            <input type="checkbox" id="baby" checked={newBaby} onChange={e => setNewBaby(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#c4896e" }} />
            <label htmlFor="baby" style={S.checkLabel}>🛒 Baby-Kurs (Kinderwagen-Option anzeigen)</label>
          </div>

          <button style={S.primaryBtn} onClick={addGruppe}>
            {saved ? "✓ Gespeichert!" : "Kursgruppe anlegen"}
          </button>
        </div>

        {/* Bestehende Gruppen */}
        {Object.keys(gruppen || {}).length > 0 && (
          <div style={S.adminCard}>
            <div style={S.sectionTitle}>✦ Deine Kursgruppen</div>
            {Object.entries(gruppen).map(([id, g]) => {
              const activeRemoved = removedDates[id] || [];
              const isEditing = editTermine === id;
              return (
                <div key={id}>
                  <div style={S.gruppeCard(isEditing)}>
                    <div style={S.gruppeInfo}>
                      <div style={S.gruppeName}>{g.name}</div>
                      <div style={S.gruppeDetails}>
                        {WOCHENTAGE[g.wochentag]} · {g.uhrzeit} Uhr · {g.dates.length - activeRemoved.length} Termine
                        {g.baby ? " · 🛒" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={S.copyBtn} onClick={() => setEditTermine(isEditing ? null : id)}>
                        {isEditing ? "Schließen" : "Termine"}
                      </button>
                      <button style={S.dangerBtn} onClick={() => deleteGruppe(id)}>Löschen</button>
                    </div>
                  </div>

                  {/* Link */}
                  <div style={S.linkBox}>
                    <span style={S.linkText}>{getLink(id)}</span>
                    <button style={S.copyBtn} onClick={() => copyLink(id)}>
                      {copied === id ? "✓ Kopiert" : "Kopieren"}
                    </button>
                  </div>

                  {/* Termine bearbeiten */}
                  {isEditing && (
                    <div style={{ background: "rgba(180,130,110,0.05)", borderRadius: "12px", padding: "14px", marginTop: "10px", marginBottom: "8px" }}>
                      <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#b8927a", marginBottom: "10px" }}>
                        Termine — Kreuz = kein Kurs
                      </div>
                      {g.dates.map(date => {
                        const isRemoved = activeRemoved.includes(date);
                        const feiertage = hessianHolidays(new Date(date).getFullYear());
                        return (
                          <div key={date} style={S.terminListItem(isRemoved)}>
                            <span style={S.terminDateSmall(isRemoved)}>{formatDate(date)}</span>
                            <button
                              style={{ ...S.dangerBtn, padding: "3px 10px", fontSize: "13px" }}
                              onClick={() => toggleRemoved(id, date)}
                            >
                              {isRemoved ? "↩ wieder" : "✕"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "12px", color: "#b8927a", fontStyle: "italic", marginTop: "8px" }}>
          Admin-Bereich: {window.location.origin}{window.location.pathname}?admin=1
        </div>
      </div>
    </div>
  );
}
