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
  while (cur.getDay() !== Number(wochentag)) cur.setDate(cur.getDate() + 1);
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

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}
function formatDateShort(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// Termin verschwindet 120 Minuten nach Kursbeginn
function isVisible(iso, uhrzeit) {
  const now = new Date();
  const todayISO = toISO(now);
  if (iso > todayISO) return true;
  if (iso < todayISO) return false;
  const [h, m] = uhrzeit.split(":").map(Number);
  const kursStart = new Date(); kursStart.setHours(h, m, 0, 0);
  const kursEnde = new Date(kursStart.getTime() + 120 * 60000);
  return now < kursEnde;
}

// Abstimmung möglich bis 30 Min vor Kursbeginn
function isChangeable(iso, uhrzeit) {
  if (!iso) return false;
  const now = new Date();
  const todayISO = toISO(now);
  if (iso > todayISO) return true;
  if (iso < todayISO) return false;
  const [h, m] = uhrzeit.split(":").map(Number);
  const kursTime = new Date(); kursTime.setHours(h, m, 0, 0);
  return now < new Date(kursTime.getTime() - 30 * 60000);
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const C = {
  mauve: "#8B6464", bg: "#E8D5D0", text: "#3D2B2B", accent: "#C4A0A0",
  warm: "#c4896e", warmDark: "#a06848", warmLight: "rgba(196,137,110,0.12)",
  card: "rgba(255,255,255,0.85)", border: "rgba(180,130,110,0.2)",
};

const S = {
  app: {
    minHeight: "100vh",
    background: `linear-gradient(135deg, #f5ede8 0%, #fdf8f5 50%, #ede8e3 100%)`,
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    color: C.text,
  },
  header: {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${C.border}`,
    padding: "14px 20px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logo: { height: 46, width: "auto", objectFit: "contain", display: "block" },
  page: { maxWidth: 480, margin: "0 auto", padding: "24px 18px 60px" },
  card: {
    background: C.card, borderRadius: 20, padding: "24px 22px",
    boxShadow: "0 4px 24px rgba(120,70,50,0.08)", border: `1px solid ${C.border}`,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
    color: C.warm, marginBottom: 6, fontWeight: 600,
  },
  terminDate: { fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.1, marginBottom: 4 },
  terminTime: { fontSize: 15, color: "#9c6b55", marginBottom: 6 },
  notizBadge: {
    display: "inline-block", background: "rgba(196,137,110,0.1)",
    border: `1px solid rgba(196,137,110,0.25)`, borderRadius: 10,
    padding: "5px 12px", fontSize: 13, color: "#7a5040",
    fontStyle: "italic", marginBottom: 16,
  },
  cutoffNote: {
    fontSize: 12, color: C.warm, fontStyle: "italic",
    background: "rgba(180,130,110,0.08)", borderRadius: 10,
    padding: "8px 12px", marginBottom: 16,
  },
  tabsRow: {
    display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
    marginBottom: 18, scrollbarWidth: "none",
  },
  tab: (active) => ({
    padding: "7px 14px", borderRadius: 20, fontSize: 13,
    fontWeight: active ? 700 : 500, whiteSpace: "nowrap",
    border: active ? `2px solid ${C.warm}` : `1.5px solid rgba(180,130,110,0.25)`,
    background: active ? C.warmLight : "rgba(255,255,255,0.6)",
    color: active ? C.warmDark : "#9c6b55",
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
  }),
  responseGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  responseBtn: (active, color) => ({
    borderRadius: 14, padding: "16px 10px",
    border: active ? `2px solid ${color}` : `2px solid rgba(180,130,110,0.15)`,
    background: active ? `${color}18` : "rgba(255,255,255,0.6)",
    cursor: "pointer", transition: "all 0.18s",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
    boxShadow: active ? `0 4px 14px ${color}28` : "none",
    transform: active ? "scale(1.03)" : "scale(1)",
  }),
  responseBtnEmoji: { fontSize: 30, lineHeight: 1 },
  responseBtnLabel: (active, color) => ({
    fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? color : "#9c6b55", letterSpacing: "0.02em",
  }),
  konfirmBox: {
    background: "rgba(140,200,140,0.1)", border: "1px solid rgba(100,180,100,0.28)",
    borderRadius: 13, padding: "14px 18px", textAlign: "center", marginTop: 18,
  },
  statsCard: {
    background: "rgba(255,255,255,0.55)", borderRadius: 14, padding: 18,
    border: `1px solid rgba(180,130,110,0.12)`, marginTop: 10,
  },
  statRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "7px 0", borderBottom: `1px solid rgba(180,130,110,0.08)`,
  },
  statLeft: { display: "flex", alignItems: "center", gap: 10 },

  // Admin
  label: { fontSize: 13, color: "#7a5a4e", marginBottom: 5, display: "block" },
  input: {
    width: "100%", padding: "9px 13px", borderRadius: 10,
    border: `1.5px solid rgba(180,130,110,0.25)`, background: "rgba(255,255,255,0.85)",
    fontSize: 15, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  select: {
    width: "100%", padding: "9px 13px", borderRadius: 10,
    border: `1.5px solid rgba(180,130,110,0.25)`, background: "rgba(255,255,255,0.85)",
    fontSize: 15, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  },
  primaryBtn: {
    width: "100%", padding: 13, borderRadius: 13,
    background: `linear-gradient(135deg, ${C.warm}, ${C.warmDark})`,
    color: "white", border: "none", fontSize: 15,
    fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer",
    fontFamily: "inherit", marginTop: 8,
  },
  dangerBtn: {
    padding: "5px 12px", borderRadius: 9,
    background: "rgba(200,80,60,0.09)", color: "#c05040",
    border: "1px solid rgba(200,80,60,0.2)", fontSize: 12,
    cursor: "pointer", fontFamily: "inherit",
  },
  secondaryBtn: {
    padding: "5px 12px", borderRadius: 9,
    background: C.warmLight, color: C.warmDark,
    border: `1px solid rgba(180,130,110,0.25)`, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit",
  },
  linkBox: {
    background: "rgba(180,130,110,0.07)", borderRadius: 11,
    padding: "10px 14px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: 8, marginTop: 10,
  },
  linkText: { fontSize: 12, color: "#7a5a4e", wordBreak: "break-all", flex: 1 },
  copyBtn: {
    padding: "5px 13px", borderRadius: 8, background: C.warmLight,
    color: "#9c6b55", border: `1px solid rgba(180,130,110,0.25)`,
    fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
  },
  gruppeCard: (active) => ({
    background: active ? "rgba(180,130,110,0.09)" : "rgba(255,255,255,0.5)",
    borderRadius: 13, padding: "13px 15px", marginBottom: 8,
    border: active ? `1.5px solid rgba(180,130,110,0.35)` : `1px solid rgba(180,130,110,0.15)`,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }),
  terminListItem: (removed) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 8, padding: "6px 10px", borderRadius: 8, marginBottom: 4,
    background: removed ? "rgba(200,80,60,0.05)" : "rgba(255,255,255,0.5)",
    border: removed ? "1px solid rgba(200,80,60,0.15)" : `1px solid rgba(180,130,110,0.1)`,
    opacity: removed ? 0.6 : 1,
  }),
};

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const gruppeId = params.get("gruppe");
  const adminMode = params.get("admin") === "1";

  const [gruppen, setGruppen] = useState(null);
  const [votes, setVotes] = useState({});
  const [removedDates, setRemovedDates] = useState({});
  const [notizen, setNotizen] = useState({}); // { gruppeId_iso: "Bemerkungstext" }
  const [loading, setLoading] = useState(true);
  const [myVotes, setMyVotes] = useState({});
  const [selectedTermin, setSelectedTermin] = useState(null);
  const [copied, setCopied] = useState(null);
  const [saved, setSaved] = useState(false);

  // Admin form
  const [newName, setNewName] = useState("");
  const [newWochentag, setNewWochentag] = useState(1);
  const [newUhrzeit, setNewUhrzeit] = useState("09:30");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newBaby, setNewBaby] = useState(false);
  const [editTermine, setEditTermine] = useState(null);
  const [editNotizKey, setEditNotizKey] = useState(null);
  const [notizDraft, setNotizDraft] = useState("");

  useEffect(() => {
    (async () => {
      const g  = await sget("bbb_gruppen_v2");
      const v  = await sget("bbb_votes_v2");
      const rm = await sget("bbb_removed_v2");
      const n  = await sget("bbb_notizen_v2");
      setGruppen(g || {});
      setVotes(v || {});
      setRemovedDates(rm || {});
      setNotizen(n || {});

      if (gruppeId) {
        const stored = {};
        const gruppe = (g || {})[gruppeId];
        if (gruppe) {
          for (const date of gruppe.dates) {
            const val = localStorage.getItem(`myvote_${gruppeId}_${date}`);
            if (val) stored[date] = val;
          }
        }
        setMyVotes(stored);
      }
      setLoading(false);
    })();
  }, []);

  // Ersten sichtbaren Termin vorauswählen
  useEffect(() => {
    if (!gruppen || !gruppeId) return;
    const gruppe = gruppen[gruppeId];
    if (!gruppe) return;
    const activeRemoved = removedDates[gruppeId] || [];
    const visible = gruppe.dates.filter(d => !activeRemoved.includes(d) && isVisible(d, gruppe.uhrzeit));
    if (visible.length > 0 && !selectedTermin) setSelectedTermin(visible[0]);
  }, [gruppen, removedDates]);

  const saveGruppen = async (g) => { setGruppen(g); await sset("bbb_gruppen_v2", g); };
  const saveVotes   = async (v) => { setVotes(v);   await sset("bbb_votes_v2", v); };
  const saveRemoved = async (r) => { setRemovedDates(r); await sset("bbb_removed_v2", r); };
  const saveNotizen = async (n) => { setNotizen(n); await sset("bbb_notizen_v2", n); };

  const addGruppe = async () => {
    if (!newName || !newStart || !newEnd) return;
    const id = newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now();
    const dates = computeDates(Number(newWochentag), newStart, newEnd);
    const g = { ...gruppen, [id]: { name: newName, wochentag: Number(newWochentag), uhrzeit: newUhrzeit, start: newStart, end: newEnd, baby: newBaby, dates } };
    await saveGruppen(g);
    setNewName(""); setNewStart(""); setNewEnd(""); setNewBaby(false);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const deleteGruppe = async (id) => {
    const g = { ...gruppen }; delete g[id];
    await saveGruppen(g);
  };

  const toggleRemoved = async (gid, date) => {
    const cur = removedDates[gid] || [];
    const updated = cur.includes(date) ? cur.filter(d => d !== date) : [...cur, date];
    await saveRemoved({ ...removedDates, [gid]: updated });
  };

  const saveNotiz = async (gid, date) => {
    const key = `${gid}_${date}`;
    const n = { ...notizen, [key]: notizDraft };
    await saveNotizen(n);
    setEditNotizKey(null);
    setNotizDraft("");
  };

  const deleteNotiz = async (gid, date) => {
    const key = `${gid}_${date}`;
    const n = { ...notizen };
    delete n[key];
    await saveNotizen(n);
  };

  const handleVote = async (termin, option, gruppe) => {
    if (!gruppeId || !isChangeable(termin, gruppe.uhrzeit)) return;
    const voteKey = `${gruppeId}_${termin}`;
    const curVotes = votes[voteKey] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
    const prev = myVotes[termin];
    const updated = { ...curVotes };
    if (prev) updated[prev] = Math.max(0, (updated[prev] || 0) - 1);
    const newMyVotes = { ...myVotes };
    if (prev !== option) {
      updated[option] = (updated[option] || 0) + 1;
      newMyVotes[termin] = option;
      localStorage.setItem(`myvote_${gruppeId}_${termin}`, option);
      if (option === "kommt_nicht") {
        setTimeout(() => window.open("https://bauch-baby-beckenboden-absage.netlify.app/", "_blank"), 800);
      }
    } else {
      delete newMyVotes[termin];
      localStorage.removeItem(`myvote_${gruppeId}_${termin}`);
    }
    setMyVotes(newMyVotes);
    await saveVotes({ ...votes, [voteKey]: updated });
  };

  const getLink = (id) => `${window.location.origin}${window.location.pathname}?gruppe=${id}`;
  const copyLink = (id) => {
    navigator.clipboard.writeText(getLink(id));
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const fonts = <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />;

  if (loading) return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {fonts}
      <div style={{ fontSize: 18, color: "#9c6b55", fontStyle: "italic" }}>Lädt …</div>
    </div>
  );

  // ── TEILNEHMERINNEN-ANSICHT ───────────────────────────────────────────────
  if (gruppeId && !adminMode) {
    const gruppe = gruppen?.[gruppeId];
    if (!gruppe) return (
      <div style={S.app}>{fonts}<div style={S.page}>
        <div style={S.card}><p style={{ color: "#c05040" }}>Diese Gruppe wurde nicht gefunden.</p></div>
      </div></div>
    );

    const activeRemoved = removedDates[gruppeId] || [];
    const visibleDates = gruppe.dates.filter(d => !activeRemoved.includes(d) && isVisible(d, gruppe.uhrzeit));

    if (visibleDates.length === 0) return (
      <div style={S.app}>{fonts}
        <div style={S.header}>
          <img src="https://bauch-baby-beckenbodencom-a6xk9yzmhk.live-website.com/wp-content/uploads/2026/05/cropped-2026-05-06.jpg" alt="BBB" style={S.logo} />
        </div>
        <div style={S.page}>
          <div style={S.card}>
            <p style={{ color: "#9c6b55", textAlign: "center", fontStyle: "italic" }}>
              Aktuell sind keine weiteren Termine geplant. 🌸
            </p>
          </div>
        </div>
      </div>
    );

    const termin = selectedTermin && visibleDates.includes(selectedTermin) ? selectedTermin : visibleDates[0];
    const changeable = isChangeable(termin, gruppe.uhrzeit);
    const voteKey = `${gruppeId}_${termin}`;
    const curVotes = votes[voteKey] || { kommt: 0, kommt_nicht: 0, online: 0, kinderwagen: 0 };
    const total = (curVotes.kommt || 0) + (curVotes.online || 0) + (curVotes.kinderwagen || 0);
    const myVote = myVotes[termin];
    const notiz = notizen[`${gruppeId}_${termin}`];

    const options = [
      { key: "kommt",       emoji: "✅", label: "Ich komme",       color: "#5a9e6e" },
      { key: "kommt_nicht", emoji: "😖", label: "Komme nicht",     color: "#c05040" },
      { key: "online",      emoji: "💻", label: "Online dabei",    color: "#5a7ec0" },
      ...(gruppe.baby ? [{ key: "kinderwagen", emoji: "🛒", label: "Mit Kinderwagen", color: "#c08040" }] : []),
    ];

    return (
      <div style={S.app}>{fonts}
        <div style={S.header}>
          <img src="https://bauch-baby-beckenbodencom-a6xk9yzmhk.live-website.com/wp-content/uploads/2026/05/cropped-2026-05-06.jpg" alt="BBB" style={S.logo} />
          <span style={{ fontSize: 13, color: "#b8927a", fontStyle: "italic" }}>{gruppe.name}</span>
        </div>
        <div style={S.page}>

          {/* Termin-Tabs */}
          {visibleDates.length > 1 && (
            <div style={S.tabsRow}>
              {visibleDates.map(d => (
                <button key={d} style={S.tab(d === termin)} onClick={() => setSelectedTermin(d)}>
                  {formatDateShort(d)}
                  {myVotes[d] && <span style={{ marginLeft: 5 }}>{options.find(o => o.key === myVotes[d])?.emoji}</span>}
                </button>
              ))}
            </div>
          )}

          <div style={S.card}>
            <div style={S.sectionLabel}>Kursstunde</div>
            <div style={S.terminDate}>{formatDate(termin)}</div>
            <div style={S.terminTime}>🕐 {gruppe.uhrzeit} Uhr</div>

            {/* Bemerkung / Notiz */}
            {notiz && <div style={S.notizBadge}>📌 {notiz}</div>}

            {!changeable && (
              <div style={S.cutoffNote}>⏰ Anmeldeschluss erreicht – keine Änderungen mehr möglich.</div>
            )}
            {changeable && myVote && (
              <div style={{ ...S.cutoffNote, background: "rgba(90,158,110,0.07)" }}>
                ✏️ Du kannst deine Antwort noch bis 30 Min vor Kurs ändern.
              </div>
            )}

            <div style={S.responseGrid}>
              {options.map(opt => (
                <button key={opt.key}
                  style={S.responseBtn(myVote === opt.key, opt.color)}
                  onClick={() => changeable && handleVote(termin, opt.key, gruppe)}
                  disabled={!changeable}
                >
                  <span style={S.responseBtnEmoji}>{opt.emoji}</span>
                  <span style={S.responseBtnLabel(myVote === opt.key, opt.color)}>{opt.label}</span>
                </button>
              ))}
            </div>

            {myVote && (
              <div style={S.konfirmBox}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#3a6b3a" }}>
                  {options.find(o => o.key === myVote)?.emoji} Danke für deine Rückmeldung!
                </div>
                <div style={{ fontSize: 13, color: "#5a8a5a", marginTop: 3 }}>Die Karo freut sich 🌸</div>
              </div>
            )}
          </div>

          <div style={S.statsCard}>
            <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Anmeldungen für diesen Termin</div>
            {[
              { key: "kommt",       emoji: "✅", label: "Kommen" },
              { key: "online",      emoji: "💻", label: "Online" },
              ...(gruppe.baby ? [{ key: "kinderwagen", emoji: "🛒", label: "Mit Kinderwagen" }] : []),
              { key: "kommt_nicht", emoji: "😖", label: "Kommen nicht" },
            ].map((s, i, arr) => (
              <div key={s.key} style={{ ...S.statRow, borderBottom: i === arr.length - 1 ? "none" : undefined }}>
                <div style={S.statLeft}>
                  <span style={{ fontSize: 18 }}>{s.emoji}</span>
                  <span style={{ fontSize: 15, color: "#5a3a2e" }}>{s.label}</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#9c6b55" }}>{curVotes[s.key] || 0}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid rgba(180,130,110,0.15)`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#9c6b55" }}>Gesamt vor Ort</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.warm }}>{total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN-ANSICHT ─────────────────────────────────────────────────────────
  return (
    <div style={S.app}>{fonts}
      <div style={S.header}>
        <img src="https://bauch-baby-beckenbodencom-a6xk9yzmhk.live-website.com/wp-content/uploads/2026/05/cropped-2026-05-06.jpg" alt="BBB" style={S.logo} />
        <span style={{ fontSize: 11, color: "#b8927a", letterSpacing: "0.12em" }}>ADMIN</span>
      </div>
      <div style={S.page}>

        {/* Neue Gruppe anlegen */}
        <div style={S.card}>
          <div style={S.sectionLabel}>✦ Neue Kursgruppe anlegen</div>
          <div style={{ marginBottom: 11 }}>
            <label style={S.label}>Kursname</label>
            <input style={S.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. Montag Mamafit" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 11 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 11 }}>
            <div>
              <label style={S.label}>Startdatum</label>
              <input style={S.input} type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Enddatum</label>
              <input style={S.input} type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
            <input type="checkbox" id="baby" checked={newBaby} onChange={e => setNewBaby(e.target.checked)} style={{ width: 17, height: 17, accentColor: C.warm }} />
            <label htmlFor="baby" style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>🛒 Baby-Kurs (Kinderwagen-Option anzeigen)</label>
          </div>
          <button style={S.primaryBtn} onClick={addGruppe}>
            {saved ? "✓ Gespeichert!" : "Kursgruppe anlegen"}
          </button>
        </div>

        {/* Bestehende Gruppen */}
        {Object.keys(gruppen || {}).length > 0 && (
          <div style={S.card}>
            <div style={S.sectionLabel}>✦ Deine Kursgruppen</div>
            {Object.entries(gruppen).map(([id, g]) => {
              const activeRemoved = removedDates[id] || [];
              const isEditing = editTermine === id;
              return (
                <div key={id} style={{ marginBottom: 14 }}>
                  <div style={S.gruppeCard(isEditing)}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: "#9c6b55", marginTop: 2 }}>
                        {WOCHENTAGE[g.wochentag]} · {g.uhrzeit} Uhr · {g.dates.length - activeRemoved.length} Termine{g.baby ? " · 🛒" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button style={S.secondaryBtn} onClick={() => setEditTermine(isEditing ? null : id)}>
                        {isEditing ? "Schließen" : "Termine"}
                      </button>
                      <button style={S.dangerBtn} onClick={() => deleteGruppe(id)}>Löschen</button>
                    </div>
                  </div>

                  {/* Teilnehmer-Link */}
                  <div style={S.linkBox}>
                    <span style={S.linkText}>{getLink(id)}</span>
                    <button style={S.copyBtn} onClick={() => copyLink(id)}>
                      {copied === id ? "✓ Kopiert" : "Kopieren"}
                    </button>
                  </div>

                  {/* Termine + Notizen bearbeiten */}
                  {isEditing && (
                    <div style={{ background: "rgba(180,130,110,0.05)", borderRadius: 11, padding: 14, marginTop: 10 }}>
                      <div style={{ ...S.sectionLabel, marginBottom: 10 }}>Termine verwalten</div>
                      {g.dates.map(date => {
                        const isRemoved = activeRemoved.includes(date);
                        const notizKey = `${id}_${date}`;
                        const hasNotiz = !!notizen[notizKey];
                        const isEditingNotiz = editNotizKey === notizKey;

                        return (
                          <div key={date}>
                            <div style={S.terminListItem(isRemoved)}>
                              <span style={{ fontSize: 13, color: isRemoved ? "#c05040" : C.text, textDecoration: isRemoved ? "line-through" : "none", flex: 1 }}>
                                {formatDate(date)}
                              </span>
                              <div style={{ display: "flex", gap: 5 }}>
                                {!isRemoved && (
                                  <button
                                    style={{ ...S.secondaryBtn, fontSize: 11 }}
                                    onClick={() => {
                                      setEditNotizKey(isEditingNotiz ? null : notizKey);
                                      setNotizDraft(notizen[notizKey] || "");
                                    }}
                                  >
                                    {hasNotiz ? "📌" : "＋ Notiz"}
                                  </button>
                                )}
                                <button style={{ ...S.dangerBtn, fontSize: 11 }} onClick={() => toggleRemoved(id, date)}>
                                  {isRemoved ? "↩" : "✕"}
                                </button>
                              </div>
                            </div>

                            {/* Notiz-Editor */}
                            {isEditingNotiz && (
                              <div style={{ padding: "8px 10px 10px", background: "rgba(196,137,110,0.06)", borderRadius: "0 0 10px 10px", marginBottom: 4, border: `1px solid rgba(196,137,110,0.15)`, borderTop: "none" }}>
                                <input
                                  style={{ ...S.input, fontSize: 13, marginBottom: 6 }}
                                  value={notizDraft}
                                  onChange={e => setNotizDraft(e.target.value)}
                                  placeholder="z.B. Letzte Stunde 🎉 · Heute mit Atemübungen"
                                  autoFocus
                                />
                                <div style={{ display: "flex", gap: 7 }}>
                                  <button style={{ ...S.primaryBtn, width: "auto", flex: 1, padding: "7px 0", fontSize: 13, marginTop: 0 }} onClick={() => saveNotiz(id, date)}>
                                    Speichern
                                  </button>
                                  {hasNotiz && (
                                    <button style={{ ...S.dangerBtn, fontSize: 12 }} onClick={() => { deleteNotiz(id, date); setEditNotizKey(null); }}>
                                      Löschen
                                    </button>
                                  )}
                                  <button style={{ ...S.secondaryBtn, fontSize: 12 }} onClick={() => setEditNotizKey(null)}>
                                    Abbrechen
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Notiz-Vorschau */}
                            {!isEditingNotiz && hasNotiz && (
                              <div style={{ fontSize: 12, color: "#7a5040", fontStyle: "italic", padding: "3px 10px 6px", opacity: 0.85 }}>
                                📌 {notizen[notizKey]}
                              </div>
                            )}
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

        <div style={{ textAlign: "center", fontSize: 11, color: "#b8927a", fontStyle: "italic", marginTop: 4 }}>
          Admin: {window.location.origin}{window.location.pathname}?admin=1
        </div>
      </div>
    </div>
  );
}
