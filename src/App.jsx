import { useState, useEffect, useRef } from "react";
import supabase, { db } from "./supabase";
import { requestPushPermission, onForegroundMessage, sendPushToAll, sendPushToUser } from "./push";

// ─── Theme System ───────────────────────────────────────────────
const themes = {
  light: {
    bg: "#C1272D", surface: "#e6dcca", surfaceAlt: "#e5d2b5", card: "#ffffff",
    accent: "#e24a28", accentSoft: "#fa8072", green: "#2d472a",
    text: "#111111", textSub: "#463939", textLight: "#999999", textMuted: "#d1d1d1",
    white: "#ffffff", border: "#e3e3e3", greyBg: "#f5f5f5",
    navBg: "rgba(255,255,255,0.97)", navBorder: "rgba(0,0,0,0.12)",
    inputBg: "rgba(255,255,255,0.12)", inputBorder: "rgba(255,255,255,0.2)", inputText: "#ffffff",
    authBg: "#C1272D", logoColor: "#2d472a",
  },
  dark: {
    bg: "#0a0a0a", surface: "#1a1a1a", surfaceAlt: "#222222", card: "#1e1e1e",
    accent: "#e24a28", accentSoft: "#fa8072", green: "#4CAF50",
    text: "#f0f0f0", textSub: "#b0b0b0", textLight: "#666666", textMuted: "#444444",
    white: "#ffffff", border: "#2a2a2a", greyBg: "#252525",
    navBg: "rgba(18,18,18,0.97)", navBorder: "rgba(255,255,255,0.06)",
    inputBg: "rgba(255,255,255,0.06)", inputBorder: "rgba(255,255,255,0.12)", inputText: "#f0f0f0",
    authBg: "#0a0a0a", logoColor: "#e24a28",
  },
  glowRosa: {
    bg: "#f8e8ee", surface: "#fdf2f6", surfaceAlt: "#f9dce6", card: "#ffffff",
    accent: "#d4618c", accentSoft: "#f0a0b8", green: "#2d472a",
    text: "#3a1a2a", textSub: "#6a4a5a", textLight: "#a888a0", textMuted: "#d4b8c8",
    white: "#ffffff", border: "#f0d0e0", greyBg: "#fef6f9",
    navBg: "rgba(255,245,250,0.97)", navBorder: "rgba(200,150,170,0.15)",
    inputBg: "rgba(212,97,140,0.08)", inputBorder: "rgba(212,97,140,0.2)", inputText: "#3a1a2a",
    authBg: "#f8e8ee", logoColor: "#d4618c",
  },
  glowGruen: {
    bg: "#e8f5e9", surface: "#f1f8f2", surfaceAlt: "#dcedc8", card: "#ffffff",
    accent: "#4CAF50", accentSoft: "#81C784", green: "#2E7D32",
    text: "#1a3a1a", textSub: "#4a6a4a", textLight: "#88a888", textMuted: "#b8d0b8",
    white: "#ffffff", border: "#c8e6c9", greyBg: "#f6faf6",
    navBg: "rgba(245,255,245,0.97)", navBorder: "rgba(150,200,150,0.15)",
    inputBg: "rgba(76,175,80,0.08)", inputBorder: "rgba(76,175,80,0.2)", inputText: "#1a3a1a",
    authBg: "#e8f5e9", logoColor: "#2E7D32",
  },
};

const useTheme = () => {
  const [mode, setMode] = useState(() => localStorage.getItem("cereza-theme") || "light");
  const [glowColor, setGlowColor] = useState(() => localStorage.getItem("cereza-glow") || "rosa");
  const [isGlowHour, setIsGlowHour] = useState(false);

  useEffect(() => {
    localStorage.setItem("cereza-theme", mode);
  }, [mode]);
  useEffect(() => {
    localStorage.setItem("cereza-glow", glowColor);
  }, [glowColor]);
  useEffect(() => {
    // Check glow hour every minute
    const check = async () => {
      try { const g = await db.isGlowHourNow(); setIsGlowHour(g); } catch (e) { }
    };
    check(); const t = setInterval(check, 60000); return () => clearInterval(t);
  }, []);

  const activeTheme = isGlowHour ? (glowColor === "rosa" ? "glowRosa" : "glowGruen") : mode;
  const t = themes[activeTheme] || themes.light;
  return { t, mode, setMode, glowColor, setGlowColor, isGlowHour, isDark: mode === "dark" };
};

// Keep C as alias - will be mutated by theme hook
let C = { ...themes.light, beige: themes.light.surface, beigeDark: themes.light.surfaceAlt, orange: themes.light.accent, cream: themes.light.card };
const font = {
  ui: "'Inter', -apple-system, 'SF Pro Display', sans-serif",
  display: "'Playfair Display', Georgia, serif"
};

const applyTheme = (t) => {
  C.bg = t.bg; C.beige = t.surface; C.beigeDark = t.surfaceAlt; C.card = t.card;
  C.orange = t.accent; C.salmon = t.accentSoft; C.green = t.green;
  C.text = t.text; C.textSub = t.textSub; C.textLight = t.textLight; C.textMuted = t.textMuted;
  C.white = t.white; C.border = t.border; C.greyBg = t.greyBg; C.cream = t.card;
};

const ERAS = [
  { level: 1, name: "newbie", ptsNeeded: 0 }, { level: 2, name: "regular", ptsNeeded: 500 },
  { level: 3, name: "muse", ptsNeeded: 1200 }, { level: 4, name: "insider", ptsNeeded: 2500 },
  { level: 5, name: "icon", ptsNeeded: 5000 },
];

const FUN_FACTS = [
  "🌶️ unsere chili no. 2 reift 40 tage im fass.",
  "🍕 der teig ruht 72 stunden für maximalen crunch.",
  "🍒 cereza bedeutet kirsche auf spanisch.",
  "🧀 wir nutzen nur fior di latte aus kampanien.",
  "🔥 unser ofen erreicht 485°c in 12 minuten.",
];

const MOCK_MISSIONS = [
  { id: 1, title: "morning muse", description: "besuche uns vor 12:00 uhr", progress: 1, goal: 2, pts_reward: 150, icon: "☀️" },
  { id: 2, title: "spicy lover", description: "bestelle pizza mit chili oil", progress: 0, goal: 1, pts_reward: 100, icon: "🌶️" },
  { id: 3, title: "matcha ritual", description: "bestelle 3 matcha diese woche", progress: 2, goal: 3, pts_reward: 120, icon: "🍵" },
  { id: 4, title: "social star", description: "teile deinen status auf insta", progress: 0, goal: 1, pts_reward: 75, icon: "📸" },
];

const MOCK_SHOP = [
  { id: 1, name: "gratis espresso", cost: 300, min_level: 1, icon: "☕" },
  { id: 2, name: "gratis matcha", cost: 600, min_level: 2, icon: "🍵" },
  { id: 3, name: "gratis margherita", cost: 1000, min_level: 3, icon: "🍕" },
  { id: 4, name: "chef's table dinner", cost: 2500, min_level: 4, icon: "👨‍🍳" },
  { id: 5, name: "cereza merch pack", cost: 1500, min_level: 3, icon: "👕" },
  { id: 6, name: "benenne eine pizza", cost: 5000, min_level: 5, icon: "⭐" },
];

const MOCK_DISHES = [
  { id: 1, name: "truffle margherita", description: "trüffelcreme | fior di latte | frischer trüffel", votes: 142 },
  { id: 2, name: "matcha tiramisu", description: "matcha-mascarpone | espresso-sauerteigboden", votes: 89 },
  { id: 3, name: "pistachio dream", description: "pistaziencreme | mortadella | stracciatella", votes: 234 },
  { id: 4, name: "mango tango", description: "mango-habanero | gambas | limettenzeste", votes: 67 },
];

const WHEEL_PRIZES = [
  { label: "50 pts", value: 50, bg: C.orange }, { label: "nope", value: 0, bg: C.text },
  { label: "100 pts", value: 100, bg: "#8B1A1A" }, { label: "25 pts", value: 25, bg: C.textSub },
  { label: "2x pts", value: -1, bg: C.orange }, { label: "nope", value: 0, bg: C.text },
  { label: "200 pts", value: 200, bg: "#8B1A1A" }, { label: "75 pts", value: 75, bg: C.textSub },
];

const MOCK_LB = [
  { rank: 1, name: "sophia", pts: 3200 }, { rank: 2, name: "luca", pts: 2800 },
  { rank: 3, name: "marco", pts: 1450 }, { rank: 4, name: "elena", pts: 1100 },
  { rank: 5, name: "tom", pts: 900 }, { rank: 6, name: "mia", pts: 780 },
  { rank: 7, name: "felix", pts: 650 }, { rank: 8, name: "anna", pts: 520 },
  { rank: 9, name: "ben", pts: 410 }, { rank: 10, name: "lisa", pts: 380 },
];

// ─── CSS ────────────────────────────────────────────────────────
const getCSS = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body,#root{
    height:100%;width:100%;
    overflow:hidden;position:fixed;inset:0;
    background:${t.bg};
    overscroll-behavior:none;
    -webkit-overscroll-behavior:none;
    user-select:none;-webkit-user-select:none;
    transition:background 0.4s;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    font-family:'Inter',-apple-system,'SF Pro Display',sans-serif;
  }
  input,textarea{user-select:text;-webkit-user-select:text}
  input::placeholder{color:${t.textLight}}
  ::-webkit-scrollbar{display:none}
  button{-webkit-appearance:none;appearance:none;font-family:inherit}
  button:active{transform:scale(0.96);transition:transform 0.1s}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(0.72);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px ${t.accent}44}50%{box-shadow:0 0 24px ${t.accent}88}}
  @keyframes scanLine{0%,100%{top:12%}50%{top:82%}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  .tab-content{height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}
`;

const Card = ({ children, style, onClick, t: thm }) => {
  const bg = thm ? thm.card : C.card || "#ffffff";
  const border = thm ? thm.border : C.border || "#e3e3e3";
  return <div onClick={onClick} style={{ background: bg, borderRadius: "16px", padding: "18px", color: C.text || "#111", border: `1px solid ${border}`, transition: "all 0.3s", ...style }}>{children}</div>;
};

// Default CSS for components outside theme context
const defaultCSS = getCSS(themes.light);

// ─── Sound System (Web Audio API) ───────────────────────────────
const Sound = {
  ctx: null,
  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
    }
    return this.ctx;
  },
  play(freq, duration, type = "sine", vol = 0.12, delay = 0) {
    try {
      const c = this.init(); if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime + delay);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + delay);
      o.stop(c.currentTime + delay + duration);
    } catch (e) { }
  },
  // Tab-Wechsel
  tap() { this.play(1000, 0.06, "sine", 0.05); },
  // Scan erfolgreich
  scan() {
    this.play(660, 0.08, "sine", 0.1);
    this.play(880, 0.12, "sine", 0.1, 0.09);
    this.play(1100, 0.15, "sine", 0.08, 0.18);
  },
  // Glücksrad drehen
  spin() {
    for (let i = 0; i < 6; i++) {
      this.play(300 + i * 80, 0.06, "triangle", 0.06, i * 0.07);
    }
  },
  // Gewinn
  win() {
    [523, 659, 784, 880, 1047].forEach((f, i) =>
      this.play(f, 0.2, "sine", 0.1, i * 0.1)
    );
  },
  // Kein Gewinn
  lose() {
    this.play(330, 0.15, "sawtooth", 0.08);
    this.play(280, 0.25, "sawtooth", 0.06, 0.15);
  },
  // Level Up
  levelUp() {
    [392, 523, 659, 784, 1047, 1318].forEach((f, i) =>
      this.play(f, 0.18, "sine", 0.09, i * 0.08)
    );
  },
  // Einlösen
  redeem() {
    this.play(440, 0.1, "sine", 0.1);
    this.play(554, 0.1, "sine", 0.1, 0.1);
    this.play(659, 0.2, "sine", 0.1, 0.2);
  },
  // Vote / Swipe
  vote() {
    this.play(440, 0.08, "sine", 0.08);
    this.play(554, 0.1, "sine", 0.07, 0.07);
  },
  // Geschenk senden
  gift() {
    [523, 659, 784, 880, 1047].forEach((f, i) =>
      this.play(f, 0.12, "sine", 0.08, i * 0.07)
    );
  },
  // Fehler
  error() {
    this.play(200, 0.1, "sawtooth", 0.1);
    this.play(160, 0.15, "sawtooth", 0.08, 0.1);
  },
  // Freund hinzugefügt
  friend() {
    this.play(440, 0.1, "sine", 0.1);
    this.play(660, 0.15, "sine", 0.1, 0.12);
  },
};

// ─── Auth ───────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [username, setUsername] = useState(""); const [phone, setPhone] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);

  const inp = (ph, val, set, type = "text") => (
    <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
      style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", color: C.white, fontSize: "15px", outline: "none", fontFamily: font.ui, marginBottom: "10px", boxSizing: "border-box" }} />
  );

  const submit = async () => {
    setErr("");
    if (!email || !pw) { setErr("Bitte alle Felder ausfüllen"); return; }
    if (mode === "register" && !username) { setErr("Bitte Username eingeben"); return; }
    if (mode === "register" && !phone) { setErr("Bitte Handynummer eingeben"); return; }
    if (mode === "register" && !dsgvo) { setErr("Bitte Datenschutz akzeptieren"); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await db.signIn(email, pw);
        if (error) { setErr("falsche e-mail oder passwort"); setLoading(false); return; }
        const profile = await db.getProfile(data.user.id);
        if (profile) { onLogin(profile); }
        else {
          // Fallback: create profile from auth data
          onLogin({ id: data.user.id, name: data.user.user_metadata?.name || email.split('@')[0], email, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
        }
      } else {
        const { data, error } = await db.signUp(email, pw, username);
        if (error) { setErr(error.message); setLoading(false); return; }
        if (data.user) {
          // Wait for trigger to create profile
          await new Promise(r => setTimeout(r, 2000));
          // Try update with extra fields
          await db.updateProfile(data.user.id, { name: username, phone }).catch(() => { });
          // Always login directly - build profile from known data
          const profile = await db.getProfile(data.user.id).catch(() => null);
          onLogin(profile || { id: data.user.id, name: username, email, phone, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
        }
      }
    } catch (e) { setErr("verbindungsfehler: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: C.bg, fontFamily: font.ui }}>
      <style>{defaultCSS}</style>
      <div style={{ animation: "fadeUp 0.6s ease", marginBottom: "36px", textAlign: "center" }}>
        <div style={{ fontSize: "56px", fontFamily: font.display, color: C.green, letterSpacing: "2px", fontWeight: "700" }}>cereza</div>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>loyalty club</div>
      </div>
      <div style={{ width: "100%", maxWidth: "340px", animation: "fadeUp 0.6s ease 0.1s both" }}>
        {mode === "register" && inp("username", username, setUsername)}
        {inp("e-mail adresse", email, setEmail, "email")}
        {inp("passwort (min. 6 zeichen)", pw, setPw, "password")}
        {mode === "register" && inp("handynummer", phone, setPhone, "tel")}
        {mode === "register" && (
          <div onClick={() => setDsgvo(!dsgvo)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "14px", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "11px", lineHeight: 1.4 }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px", border: `2px solid ${dsgvo ? C.orange : C.border}`, background: dsgvo ? C.orange : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "11px", fontWeight: "700" }}>{dsgvo && "✓"}</div>
            ich stimme der datenschutzerklärung zu und akzeptiere die verarbeitung meiner daten gemäß dsgvo.
          </div>
        )}
        {err && <div style={{ color: "#ffcccc", fontSize: "12px", marginBottom: "10px", textAlign: "center", lineHeight: 1.4 }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "14px", background: C.cream, border: "none", borderRadius: "12px", color: C.text, fontSize: "15px", fontWeight: "700", cursor: loading ? "wait" : "pointer", fontFamily: font.ui, opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : mode === "login" ? "einloggen" : "registrieren"}
        </button>
        <p style={{ textAlign: "center", marginTop: "18px", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
          {mode === "login" ? "noch kein mitglied? " : "schon dabei? "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr("") }} style={{ color: C.cream, cursor: "pointer", textDecoration: "underline" }}>
            {mode === "login" ? "jetzt beitreten" : "einloggen"}
          </span>
        </p>
      </div>
    </div>
  );
};

// ─── Level Up ───────────────────────────────────────────────────
const LevelUpOverlay = ({ level, onClose }) => {
  const era = ERAS[level - 1];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s", fontFamily: font.ui }}>
      {[...Array(20)].map((_, i) => <div key={i} style={{ position: "absolute", width: "6px", height: "6px", background: [C.orange, C.beige, "#FFD700", C.salmon][i % 4], borderRadius: i % 2 ? "50%" : "0", left: `${Math.random() * 100}%`, top: "-10px", animation: `confetti ${1 + Math.random() * 2}s ease-in forwards`, animationDelay: `${Math.random() * 0.5}s` }} />)}
      <div style={{ fontSize: "56px", animation: "scaleIn 0.6s ease 0.2s both" }}>👑</div>
      <div style={{ fontSize: "42px", fontFamily: font.display, color: C.white, marginTop: "14px", animation: "scaleIn 0.6s ease 0.4s both", fontWeight: "700" }}>level up!</div>
      <div style={{ fontSize: "11px", letterSpacing: "4px", color: "rgba(255,255,255,0.5)", marginTop: "14px", animation: "fadeUp 0.5s ease 0.6s both" }}>new status unlocked</div>
      <div style={{ fontSize: "32px", fontFamily: font.display, color: C.white, marginTop: "6px", animation: "fadeUp 0.5s ease 0.7s both" }}>{era.name}</div>
      <button onClick={onClose} style={{ marginTop: "36px", padding: "14px 44px", background: C.orange, border: "none", borderRadius: "50px", color: C.white, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui, animation: "fadeUp 0.5s ease 0.9s both" }}>celebrate 🎉</button>
    </div>
  );
};

// ─── Home ───────────────────────────────────────────────────────
const HomeTab = ({ user, setUser, setTab }) => {
  const era = ERAS.find(e => e.level === (user.level || 1)) || ERAS[0];
  const next = ERAS.find(e => e.level === (user.level || 1) + 1);
  const pct = next ? Math.min(100, Math.round(((user.pts - era.ptsNeeded) / (next.ptsNeeded - era.ptsNeeded)) * 100)) : 100;
  const [fi, setFi] = useState(0);
  const [lb, setLb] = useState(MOCK_LB);
  const [missions, setMissions] = useState(MOCK_MISSIONS);
  const [facts, setFacts] = useState(FUN_FACTS);
  const [visitStatus, setVisitStatus] = useState(null); // null, planned, not

  useEffect(() => { const t = setInterval(() => setFi(i => (i + 1) % facts.length), 5000); return () => clearInterval(t); }, [facts]);
  useEffect(() => {
    db.getLeaderboard().then(d => { if (d.length) setLb(d) });
    db.getMissions().then(d => { if (d.length) setMissions(d) });
    db.getFunFacts().then(d => { if (d.length) setFacts(d.map(f => f.text)) });
    if (user.id) {
      const today = new Date().toISOString().split('T')[0];
      db.getVisitIntention(user.id, today).then(d => { if (d) setVisitStatus(d.status) }).catch(() => { });
    }
  }, []);

  const setVisit = async (status) => {
    setVisitStatus(status);
    if (user.id) {
      const today = new Date().toISOString().split('T')[0];
      await db.setVisitIntention(user.id, today, status);
    }
  };

  return (
    <div style={{ paddingBottom: "16px", background: C.beige, minHeight: "100%", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 20px", background: C.beige }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(226,74,40,0.1)", borderRadius: "16px", padding: "4px 10px", fontSize: "11px", color: C.orange, fontWeight: "700", fontFamily: font.ui }}>🔥 {user.streak || 0} week streak</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: C.white, borderRadius: "20px", padding: "5px 14px", fontSize: "15px", fontWeight: "700", fontFamily: font.ui, border: `1px solid ${C.border}` }}>{user.pts || 0} <span style={{ fontSize: "10px", color: C.textLight }}>pts</span></div>
          </div>
        </div>
        <div style={{ fontSize: "52px", fontFamily: font.display, color: C.green, letterSpacing: "2px", fontWeight: "700", lineHeight: 1 }}>cereza</div>
        {/* Fun Fact */}
        <div style={{ marginTop: "14px", background: C.white, borderRadius: "10px", padding: "10px 14px", border: `1px solid ${C.border}`, fontSize: "12px", color: C.textSub, fontFamily: font.ui }}>
          {facts[fi] || "..."}
        </div>
        {/* Visit Intention */}
        {visitStatus === null && (
          <div style={{ marginTop: "10px", background: C.white, borderRadius: "12px", padding: "12px 14px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, fontSize: "13px", fontWeight: "600", color: C.text }}>Kommst du heute?</div>
            <button onClick={() => setVisit("planned")} style={{ padding: "6px 14px", background: C.orange, border: "none", borderRadius: "8px", color: C.white, fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>Ja</button>
            <button onClick={() => setVisit("cancelled")} style={{ padding: "6px 14px", background: C.greyBg, border: "none", borderRadius: "8px", color: C.textLight, fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>Nein</button>
          </div>
        )}
        {visitStatus === "planned" && (
          <div style={{ marginTop: "10px", background: "rgba(76,175,80,0.1)", borderRadius: "12px", padding: "10px 14px", border: "1px solid rgba(76,175,80,0.2)", fontSize: "12px", color: C.green, fontWeight: "600", textAlign: "center" }}>
            Bis später! Wir freuen uns auf dich ♥
          </div>
        )}
      </div>

      <div style={{ padding: "12px 14px", background: C.beige }}>
        {/* MY ERA */}
        <Card style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", background: C.beige, borderRadius: "10px", padding: "3px 10px", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: C.green, marginBottom: "6px" }}>👑 my era</div>
              <div style={{ fontSize: "34px", fontFamily: font.display, color: C.orange, lineHeight: 1, fontWeight: "700" }}>{era.name}</div>
              <div style={{ fontSize: "11px", color: C.textLight, marginTop: "6px", fontWeight: "600" }}>next: {next ? `${next.name} (${next.ptsNeeded - user.pts} pts)` : "max level"}</div>
            </div>
            <div style={{ position: "relative", width: "48px", height: "48px" }}>
              <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke={C.border} strokeWidth="3.5" /><circle cx="24" cy="24" r="20" fill="none" stroke={C.orange} strokeWidth="3.5" strokeDasharray={`${pct * 1.26} 126`} strokeLinecap="round" transform="rotate(-90 24 24)" /></svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: C.text }}>{pct}%</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: "6px", background: C.greyBg, borderRadius: "3px", overflow: "hidden", marginTop: "14px" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: "3px", background: C.orange, transition: "width 1s" }} />
          </div>
          {/* Treat Tracker */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: C.textSub }}>treat tracker</div>
              <div style={{ background: C.text, color: C.white, borderRadius: "8px", padding: "2px 7px", fontSize: "10px", fontWeight: "700" }}>{user.treat_count || 0}/{user.treat_goal || 8}</div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[...Array(user.treat_goal || 8)].map((_, i) => <div key={i} style={{ flex: 1, height: "32px", borderRadius: "5px", background: i < (user.treat_count || 0) ? C.orange : C.greyBg, transition: "all 0.3s" }} />)}
            </div>
          </div>
          {/* Scan */}
          <button onClick={() => setTab("scan")} style={{ width: "100%", marginTop: "14px", padding: "13px", background: C.text, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>📷 scan</button>
        </Card>

        {/* Matcha Society */}
        {!user.is_abo_member ? (
          <div style={{ background: C.green, borderRadius: "16px", padding: "18px", marginBottom: "10px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-20px", right: "-16px", fontSize: "70px", opacity: 0.06 }}>🍵</div>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: "#8BC34A", marginBottom: "6px" }}>💎 matcha society</div>
            <div style={{ fontSize: "18px", fontFamily: font.display, color: "#C8E6C9", fontWeight: "700" }}>werde member</div>
            <div style={{ fontSize: "11px", color: "rgba(200,230,201,0.6)", marginTop: "4px", lineHeight: 1.4 }}>2x matcha/woche | +50% pts | priority seating</div>
            <button style={{ marginTop: "10px", padding: "10px 20px", background: "#8BC34A", border: "none", borderRadius: "10px", color: C.green, fontSize: "12px", fontWeight: "800", cursor: "pointer", fontFamily: font.ui }}>abo starten · 29,99€/mo</button>
          </div>
        ) : (
          <div style={{ background: C.green, borderRadius: "12px", padding: "12px 16px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🍵</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "700", color: "#C8E6C9" }}>matcha society aktiv</div></div>
            <div style={{ background: "#8BC34A", color: C.green, borderRadius: "6px", padding: "2px 8px", fontSize: "9px", fontWeight: "800" }}>member</div>
          </div>
        )}

        {/* Missions */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginBottom: "8px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>⊚ missions</div>
            <div style={{ fontSize: "11px", color: C.textLight }}>week {Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 604800000)}</div>
          </div>
          {missions.map((m, i) => (
            <Card key={m.id} style={{ marginBottom: "6px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: C.beige, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>{m.title}</div>
                <div style={{ fontSize: "10px", color: C.textLight, marginTop: "1px" }}>{m.description}</div>
                {(m.progress || 0) < m.goal && <div style={{ height: "3px", background: C.greyBg, borderRadius: "2px", marginTop: "6px" }}><div style={{ height: "100%", width: `${((m.progress || 0) / m.goal) * 100}%`, background: C.green, borderRadius: "2px" }} /></div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: (m.progress || 0) >= m.goal ? C.green : C.orange }}>{m.progress || 0}/{m.goal}</div>
                <div style={{ fontSize: "9px", color: C.textLight }}>+{m.pts_reward} pts</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Top 10 */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.5px" }}>🏆 top 10</div>
            <div style={{ fontSize: "9px", fontWeight: "700", color: C.orange, background: "rgba(226,74,40,0.08)", padding: "2px 7px", borderRadius: "6px" }}>live</div>
          </div>
          {lb.slice(0, 5).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: i < 4 ? `1px solid ${C.greyBg}` : "none" }}>
              <div style={{ width: "20px", fontSize: "12px", textAlign: "center", fontWeight: "800", color: i < 3 ? C.orange : C.textLight }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : p.rank}</div>
              <div style={{ flex: 1, fontSize: "13px", fontWeight: p.name === user.name ? "700" : "400", color: C.text }}>@{p.name} {p.name === user.name && <span style={{ color: C.orange, fontSize: "10px" }}>(du)</span>}</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: C.green }}>{p.pts} pts</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ─── Missions + Wheel Tab ────────────────────────────────────────
const WheelTab = ({ user, setUser }) => {
  const [spinning, setSpinning] = useState(false); const [rot, setRot] = useState(0); const [result, setResult] = useState(null);
  const [spins, setSpins] = useState(0); const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState(MOCK_MISSIONS);
  const [prizes, setPrizes] = useState(WHEEL_PRIZES);
  const maxFreeSpins = 1;
  const maxPaidSpins = 2; // Max 2x total, 2. Spin kostet 100 XP

  useEffect(() => {
    const init = async () => {
      // Immer frische Daten aus DB holen
      if (user.id) {
        const fresh = await db.getProfile(user.id)
        if (fresh) {
          setUser(u => ({ ...u, ...fresh }))
          // FIX #9: Spin-Status aus DB lesen, nicht aus lokalem State
          const lastSpin = fresh.last_spin_date
          const today = new Date().toISOString().split('T')[0]
          if (lastSpin === today) {
            setSpins(fresh.wheel_spun_today ? 2 : 1) // war schon mind. 1x gedreht
          } else {
            // Neuer Tag: Reset
            setSpins(0)
            if (fresh.wheel_spun_today) {
              await db.updateProfile(user.id, { wheel_spun_today: false })
            }
          }
        }
      }
      // Prizes aus DB laden (Realtime-kompatibel)
      const dbPrizes = await db.getWheelPrizes()
      if (dbPrizes.length) setPrizes(dbPrizes.map(p => ({ ...p, bg: p.color })))
      db.getMissions().then(d => { if (d.length) setMissions(d) })
      setLoading(false)
    }
    init()

    // Realtime: Prizes sofort aktualisieren wenn Admin sie ändert
    if (!user.id) return
    const channel = supabase
      .channel('wheel-prizes-live')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'wheel_prizes'
      }, async () => {
        const updated = await db.getWheelPrizes()
        if (updated.length) setPrizes(updated.map(p => ({ ...p, bg: p.color })))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const canSpin = spins < maxPaidSpins;
  const needsPay = spins >= maxFreeSpins;

  const spin = async () => {
    if (spinning || !canSpin) return

    const today = new Date().toISOString().split('T')[0]

    // FIX #9: Immer DB prüfen – verhindert Spin nach Reload
    if (user.id) {
      const fresh = await db.getProfile(user.id)
      if (fresh) {
        const lastSpin = fresh.last_spin_date
        if (lastSpin === today) {
          const todaySpins = fresh.wheel_spun_today ? 2 : 1
          if (todaySpins >= 2) { setSpins(2); return }
          setSpins(todaySpins)
        }
      }
    }

    // 100 XP für 2. Spin
    if (needsPay) {
      const fresh = user.id ? await db.getProfile(user.id) : null
      const currentPts = fresh ? fresh.pts : (user.pts || 0)
      if (currentPts < 100) return
      const np = currentPts - 100
      setUser(u => ({ ...u, pts: np }))
      if (user.id) await db.updateProfile(user.id, { pts: np })
    }

    setSpinning(true); setResult(null); Sound.spin()
    const idx = Math.floor(Math.random() * prizes.length)
    const seg = 360 / prizes.length
    setRot(r => r + 360 * 6 + (360 - idx * seg - seg / 2))

    setTimeout(async () => {
      setSpinning(false)
      const newSpins = spins + 1
      setSpins(newSpins)
      const prize = prizes[idx]; setResult(prize)
      prize.value > 0 ? Sound.win() : Sound.lose()

      const fresh = user.id ? await db.getProfile(user.id) : null
      const currentPts = fresh ? fresh.pts : (user.pts || 0)

      const updates = {
        wheel_spun_today: true,
        last_spin_date: today,
      }
      if (prize.value > 0) {
        updates.pts = currentPts + prize.value
        setUser(u => ({ ...u, pts: updates.pts, wheel_spun_today: true }))
      } else {
        setUser(u => ({ ...u, wheel_spun_today: true }))
      }
      if (user.id) await db.updateProfile(user.id, updates)
    }, 5000)
  }

  // Lighter wheel colors
  // Pastell-Farben für das Rad
  const wheelColors = [
    { bg: "#fde8e8", text: "#c0392b" },
    { bg: "#fef3e2", text: "#d35400" },
    { bg: "#e8f5e9", text: "#27ae60" },
    { bg: "#e8eaf6", text: "#3949ab" },
    { bg: "#fce4ec", text: "#c2185b" },
    { bg: "#e0f7fa", text: "#00838f" },
    { bg: "#fff8e1", text: "#f57f17" },
    { bg: "#f3e5f5", text: "#7b1fa2" },
  ];

  const sz = 280, cx = sz / 2, cy = sz / 2, r = sz / 2 - 10;
  return (
    <div style={{ paddingBottom: "16px", background: C.beige, minHeight: "100%" }}>
      {/* Missions Section */}
      <div style={{ padding: "18px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: C.text }}>Missions</div>
          <div style={{ fontSize: "11px", color: C.textLight }}>Week {Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 604800000)}</div>
        </div>
        {missions.map((m, i) => (
          <Card key={m.id} style={{ marginBottom: "6px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: C.beige, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>{m.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>{m.title}</div>
              <div style={{ fontSize: "10px", color: C.textLight, marginTop: "1px" }}>{m.description}</div>
              {(m.progress || 0) < m.goal && <div style={{ height: "3px", background: C.greyBg, borderRadius: "2px", marginTop: "6px" }}><div style={{ height: "100%", width: `${((m.progress || 0) / m.goal) * 100}%`, background: C.green, borderRadius: "2px" }} /></div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: (m.progress || 0) >= m.goal ? C.green : C.orange }}>{m.progress || 0}/{m.goal}</div>
              <div style={{ fontSize: "9px", color: C.textLight }}>+{m.pts_reward} pts</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Wheel Section */}
      <div style={{ padding: "10px 16px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", letterSpacing: "2px", color: C.textLight, marginBottom: "4px" }}>Daily Spin</div>
        <div style={{ fontSize: "20px", fontFamily: font.display, color: C.text, fontWeight: "700", marginBottom: "12px" }}>Glücksrad</div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", padding: "8px" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${C.border}`, boxShadow: spinning ? "0 0 20px rgba(226,74,40,0.3)" : "0 0 8px rgba(0,0,0,0.06)", transition: "box-shadow 0.5s" }} />
            <div style={{ position: "absolute", top: "-2px", left: "50%", transform: "translateX(-50%)", zIndex: 3, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `14px solid ${C.orange}` }} />
            <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 5s cubic-bezier(0.15,0.6,0.15,1)" : "none", display: "block" }}>
              {prizes.map((p, i) => {
                const seg = 360 / prizes.length; const s = (i * seg - 90) * Math.PI / 180, e = ((i + 1) * seg - 90) * Math.PI / 180, mid = (s + e) / 2;
                return (<g key={i}><path d={`M${cx},${cy} L${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A${r},${r} 0 0,1 ${cx + r * Math.cos(e)},${cy + r * Math.sin(e)} Z`} fill={wheelColors[i].bg} stroke={C.white} strokeWidth="2" /><text x={cx + (r * 0.6) * Math.cos(mid)} y={cy + (r * 0.6) * Math.sin(mid)} transform={`rotate(${i * seg + seg / 2},${cx + (r * 0.6) * Math.cos(mid)},${cy + (r * 0.6) * Math.sin(mid)})`} textAnchor="middle" dominantBaseline="middle" fill={C.text} fontSize="10" fontWeight="700">{p.label}</text></g>);
              })}
              <circle cx={cx} cy={cy} r="32" fill="white" stroke={C.orange} strokeWidth="2.5"
                style={{ filter: "drop-shadow(0 2px 8px rgba(226,74,40,0.3))" }} />
              <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle"
                fill={C.orange} fontSize="30" fontWeight="900" fontFamily="Playfair Display,serif"
                style={{ letterSpacing: "-1px" }}>c</text>

            </svg>
          </div>

          <button onClick={spin} disabled={spinning || !canSpin || (needsPay && (user.pts || 0) < 100)} style={{ marginTop: "8px", padding: "12px 40px", border: "none", borderRadius: "50px", fontSize: "13px", fontWeight: "700", fontFamily: font.ui, background: !canSpin ? C.greyBg : C.orange, color: !canSpin ? C.textLight : C.white, cursor: !canSpin ? "not-allowed" : "pointer" }}>
            {!canSpin ? "Fertig für heute" : spinning ? "Dreht..." : needsPay ? `Nochmal drehen (100 pts)` : "Drehen"}
          </button>
          <div style={{ fontSize: "10px", color: C.textLight, marginTop: "6px" }}>{spins}/{maxPaidSpins} Spins heute</div>

          {result && <Card style={{ marginTop: "12px", padding: "14px", textAlign: "center", animation: "scaleIn 0.4s", maxWidth: "220px" }}><div style={{ fontSize: "28px", marginBottom: "4px" }}>{result.value > 0 ? "✨" : result.value === -1 ? "⚡" : "—"}</div><div style={{ fontSize: "15px", fontWeight: "800", color: result.value > 0 ? C.orange : C.text }}>{result.value > 0 ? `+${result.value} pts!` : result.value === -1 ? "2x pts heute!" : "Nächstes Mal!"}</div></Card>}
        </div>
      </div>
    </div>
  );
};

// ─── Scan ───────────────────────────────────────────────────────
const ScanTab = ({ user, setUser }) => {
  const [scanning, setScanning] = useState(false); const [done, setDone] = useState(false); const [pts, setPts] = useState(0); const scannerRef = useRef(null);
  const awardPts = async (p) => {
    setPts(p); Sound.scan();
    // Always get fresh data from DB
    const fresh = user.id ? await db.getProfile(user.id) : null;
    const currentPts = fresh ? fresh.pts : (user.pts || 0);
    const currentVisits = fresh ? fresh.total_visits : (user.total_visits || 0);
    const currentTreat = fresh ? fresh.treat_count : (user.treat_count || 0);
    const np = currentPts + p;
    const nv = currentVisits + 1;
    const nt = Math.min(currentTreat + 1, user.treat_goal || 8);
    setUser(u => ({ ...u, pts: np, total_visits: nv, treat_count: nt }));
    if (user.id) {
      await db.updateProfile(user.id, { pts: np, total_visits: nv, treat_count: nt, last_visit: new Date().toISOString().split('T')[0] });
      await supabase.from("scan_log").insert({ user_id: user.id, pts_earned: p, was_glow_hour: false });
    }
    setDone(true);
  };
  const startScan = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode"); const scanner = new Html5Qrcode("qr-reader"); scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 200, height: 200 } },
        async () => { await scanner.stop(); setScanning(false); await awardPts(Math.floor(Math.random() * 100) + 50); }, () => { });
    } catch (e) {
      setScanning(false); await awardPts(Math.floor(Math.random() * 100) + 50);
    }
  };
  useEffect(() => () => { if (scannerRef.current) try { scannerRef.current.stop() } catch (e) { } }, []);
  return (
    <div style={{ background: C.beige, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px", minHeight: "100%" }}>
      {!done ? (<>
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: C.textLight }}>qr code</div>
        <div style={{ fontSize: "24px", fontFamily: font.display, color: C.text, marginBottom: "24px", marginTop: "4px", fontWeight: "700" }}>Punkte sammeln</div>
        <div id="qr-reader" style={{ width: "240px", height: "240px", borderRadius: "16px", overflow: "hidden", background: "#111", border: `2px solid ${scanning ? C.orange : C.border}`, transition: "border 0.3s" }} />
        {!scanning ? <button onClick={startScan} style={{ marginTop: "18px", padding: "13px 36px", background: C.orange, border: "none", borderRadius: "50px", color: C.white, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui }}>📷 Kamera starten</button>
          : <button onClick={async () => { if (scannerRef.current) try { await scannerRef.current.stop() } catch (e) { } setScanning(false) }} style={{ marginTop: "18px", padding: "13px 36px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "50px", color: C.textSub, fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: font.ui }}>abbrechen</button>}
        <div style={{ color: C.textLight, fontSize: "11px", marginTop: "12px" }}>scanne den qr-code auf deinem beleg</div>
      </>) : (
        <div style={{ textAlign: "center", animation: "scaleIn 0.4s" }}>
          <div style={{ fontSize: "48px" }}>🎉</div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: C.orange, fontFamily: font.display }}>+{pts} pts</div>
          <div style={{ color: C.textLight, fontSize: "13px", marginTop: "6px" }}>Punkte gutgeschrieben!</div>
          <button onClick={() => { setDone(false); setPts(0) }} style={{ marginTop: "18px", padding: "11px 28px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "50px", color: C.text, fontSize: "13px", cursor: "pointer", fontFamily: font.ui }}>Nochmal scannen</button>
        </div>
      )}
    </div>
  );
};

// ─── Vote ───────────────────────────────────────────────────────
const VoteTab = ({ user, setUser }) => {
  const [allDishes, setAllDishes] = useState([]);
  const [unvoted, setUnvoted] = useState([]);
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [visitStatus, setVisitStatus] = useState(null);

  useEffect(() => {
    const init = async () => {
      const dishes = await db.getDishes();
      const list = dishes.length ? dishes : MOCK_DISHES;
      setAllDishes(list);

      if (user.id) {
        const votedIds = await db.getUserVotes(user.id);
        const notVoted = list.filter(d => !votedIds.has(d.id));
        setUnvoted(notVoted);
        // Visit intention
        const today = new Date().toISOString().split('T')[0];
        db.getVisitIntention(user.id, today).then(d => { if (d) setVisitStatus(d.status); }).catch(() => { });
      } else {
        setUnvoted(list);
      }
      setLoading(false);
    };
    init();
  }, []);

  const currentDish = unvoted[current];
  const done = current >= unvoted.length;

  // FIX #12: swipe-Funktion die BEIDE Buttons (Herz + X) korrekt behandelt
  const doVote = async (liked) => {
    if (!currentDish || dir) return;
    Sound.vote();

    const voteDir = liked ? "right" : "left";
    setDir(voteDir);

    // DB-Vote speichern
    if (user.id) {
      await db.voteDish(user.id, currentDish.id, liked).catch(() => { });
      // XP für Voting
      if (liked) {
        const fresh = await db.getProfile(user.id);
        if (fresh) {
          await db.updateProfile(user.id, { pts: (fresh.pts || 0) + 10 });
          setUser(u => ({ ...u, pts: (u.pts || 0) + 10 }));
        }
      }
    }

    // Karte weganimieren, dann weiter
    setTimeout(() => {
      setDir(null);
      setDragX(0);
      setCurrent(i => i + 1);
    }, 320);
  };

  // Touch-Swipe
  const onTouchStart = (e) => setDragStart(e.touches[0].clientX);
  const onTouchMove = (e) => {
    if (dragStart === null) return;
    setDragX(e.touches[0].clientX - dragStart);
  };
  const onTouchEnd = () => {
    if (Math.abs(dragX) > 70) {
      doVote(dragX > 0);
    } else {
      setDragX(0);
    }
    setDragStart(null);
  };

  const setVisit = async (status) => {
    setVisitStatus(status);
    if (user.id) {
      const today = new Date().toISOString().split('T')[0];
      await db.setVisitIntention(user.id, today, status);
    }
  };

  if (loading) return (
    <div style={{ background: C.beige, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.textLight, fontSize: "14px" }}>Wird geladen...</div>
    </div>
  );

  return (
    <div style={{ background: C.beige, minHeight: "100%", paddingBottom: "20px" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "11px", letterSpacing: "2px", color: C.textLight, fontWeight: "600", textTransform: "uppercase" }}>Cinder</div>
          <div style={{ fontSize: "26px", fontFamily: font.display, color: C.text, fontWeight: "700", lineHeight: 1.1 }}>
            {done ? "Ergebnisse" : "Was kommt auf die Karte?"}
          </div>
        </div>
        {!done && (
          <div style={{ fontSize: "12px", color: C.textLight, fontWeight: "600" }}>
            {current + 1} / {unvoted.length}
          </div>
        )}
      </div>

      {/* Besuch heute? – FIX #13 */}
      {!done && (
        <div style={{ margin: "0 16px 14px", background: C.card, borderRadius: "16px", padding: "14px 16px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: C.text, marginBottom: "10px" }}>
            Kommst du heute vorbei?
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { v: "planned", l: "Ja, heute" },
              { v: "not", l: "Nicht heute" },
            ].map(opt => (
              <button key={opt.v} onClick={() => setVisit(opt.v)}
                style={{
                  flex: 1, padding: "9px", borderRadius: "10px", border: "none",
                  background: visitStatus === opt.v ? C.orange : C.greyBg,
                  color: visitStatus === opt.v ? C.white : C.textLight,
                  fontSize: "12px", fontWeight: "600", cursor: "pointer",
                  transition: "all 0.2s"
                }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card Stack */}
      {!done ? (
        <div style={{ padding: "0 16px" }}>
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              transform: dir === "left"
                ? "translateX(-110%) rotate(-18deg)"
                : dir === "right"
                  ? "translateX(110%) rotate(18deg)"
                  : `translateX(${dragX}px) rotate(${dragX * 0.035}deg)`,
              opacity: dir ? 0 : Math.max(0.3, 1 - Math.abs(dragX) * 0.003),
              transition: dir ? "all 0.32s cubic-bezier(0.4,0,0.2,1)" : dragX ? "none" : "all 0.3s",
              willChange: "transform",
            }}>
            <Card style={{ padding: 0, overflow: "hidden", borderRadius: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
              {/* Image area */}
              <div style={{
                height: "220px",
                background: `linear-gradient(135deg, ${C.beigeDark} 0%, ${C.beige} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden"
              }}>
                {currentDish?.image_url
                  ? <img src={currentDish.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 12s1-2 4-2 4 2 4 2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  )
                }

                {/* Like/Dislike overlay when dragging */}
                {Math.abs(dragX) > 30 && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: dragX > 0 ? "rgba(45,71,42,0.3)" : "rgba(226,74,40,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "48px", fontWeight: "900", color: "white"
                  }}>
                    {dragX > 0 ? "♥" : "✕"}
                  </div>
                )}

                {/* Vote count */}
                <div style={{
                  position: "absolute", bottom: "10px", right: "12px",
                  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                  color: "white", borderRadius: "10px", padding: "3px 10px",
                  fontSize: "11px", fontWeight: "700"
                }}>
                  {currentDish?.votes} Votes
                </div>
              </div>

              <div style={{ padding: "18px" }}>
                <div style={{ fontSize: "20px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>
                  {currentDish?.name}
                </div>
                <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px", lineHeight: 1.4 }}>
                  {currentDish?.description}
                </div>
                <div style={{ fontSize: "11px", color: C.orange, fontWeight: "600", marginTop: "8px" }}>
                  +10 XP für dein Vote
                </div>
              </div>
            </Card>
          </div>

          {/* Action Buttons – FIX #12 */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "20px", alignItems: "center" }}>
            {/* Skip */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); Sound.tap(); doVote(false); }}
              style={{
                width: "60px", height: "60px", borderRadius: "50%",
                background: C.card, border: `2px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                transition: "all 0.15s"
              }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textSub} strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Love */}
            <button
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); Sound.win(); doVote(true); }}
              style={{
                width: "72px", height: "72px", borderRadius: "50%",
                background: C.orange, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                boxShadow: `0 6px 24px ${C.orange}55`,
                transition: "all 0.15s"
              }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
          <div style={{ textAlign: "center", color: C.textLight, fontSize: "11px", marginTop: "12px", fontWeight: "500" }}>
            Swipe oder Buttons nutzen
          </div>
        </div>
      ) : (
        /* Ergebnisse */
        <div style={{ padding: "0 16px" }}>
          <Card style={{ padding: "20px", textAlign: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill={C.orange} stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: C.text }}>Alle Gerichte bewertet!</div>
            <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px" }}>Danke für dein Feedback</div>
          </Card>

          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "1px", color: C.textSub, marginBottom: "10px", textTransform: "uppercase" }}>
            Aktuelle Ergebnisse
          </div>
          {[...allDishes].sort((a, b) => (b.votes || 0) - (a.votes || 0)).map((d, i) => (
            <Card key={d.id} style={{ marginBottom: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                background: i === 0 ? C.orange : C.greyBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "800", color: i === 0 ? C.white : C.textLight
              }}>
                #{i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "600", color: C.text }}>{d.name}</div>
                <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>{d.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: "800", color: C.orange }}>{d.votes || 0}</div>
                <div style={{ fontSize: "10px", color: C.textLight }}>Votes</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Score ───────────────────────────────────────────────────────
const ScoreTab = ({ user, setUser }) => {
  const [items, setItems] = useState(MOCK_SHOP); const [rd, setRd] = useState(null);
  useEffect(() => { db.getShopItems().then(d => { if (d.length) setItems(d) }); }, []);
  const redeem = async item => {
    if ((user.pts || 0) < item.cost || (user.level || 1) < item.min_level) return;
    const np = (user.pts || 0) - item.cost; setUser(u => ({ ...u, pts: np }));
    if (user.id) { await db.updateProfile(user.id, { pts: np }); await supabase.from("redemptions").insert({ user_id: user.id, item_id: item.id }); }
    Sound.redeem(); setRd(item); setTimeout(() => setRd(null), 2500);
  };
  return (
    <div style={{ background: C.beige, paddingBottom: "16px", background: C.beige, minHeight: "100%" }}>
      <div style={{ padding: "18px 20px 16px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: C.textLight }}>rewards</div>
        <div style={{ fontSize: "24px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>score</div>
        <div style={{ fontSize: "12px", color: C.textLight, marginTop: "4px" }}>Guthaben: <strong style={{ color: C.text }}>{user.pts || 0} pts</strong></div>
      </div>
      {rd && <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.3s" }}><div style={{ fontSize: "48px" }}>{rd.icon}</div><div style={{ color: C.white, fontSize: "18px", fontWeight: "700", marginTop: "10px" }}>Eingelöst!</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginTop: "4px" }}>Zeige dies an der kasse</div></div>}
      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {items.map((item, i) => {
          const ok = (user.pts || 0) >= item.cost && (user.level || 1) >= item.min_level; const locked = (user.level || 1) < item.min_level;
          return <Card key={item.id} onClick={() => ok && redeem(item)} style={{ padding: "14px 10px", textAlign: "center", opacity: locked ? 0.4 : 1, cursor: ok ? "pointer" : "default", border: ok ? `2px solid ${C.orange}` : `1px solid ${C.border}`, animation: `fadeUp 0.3s ease ${i * 0.04}s both` }}>
            <div style={{ fontSize: "26px", marginBottom: "5px" }}>{item.icon}</div>
            <div style={{ fontSize: "12px", fontWeight: "700" }}>{item.name}</div>
            <div style={{ marginTop: "8px", display: "inline-block", padding: "3px 10px", borderRadius: "12px", fontSize: "10px", fontWeight: "700", background: ok ? C.orange : C.greyBg, color: ok ? C.white : locked ? C.textLight : C.text }}>{locked ? `🔒 lvl ${item.min_level}` : `${item.cost} pts`}</div>
          </Card>;
        })}
      </div>
    </div>
  );
};

// ─── Profile (includes Score + Share + Invite) ──────────────────
const ProfileTab = ({ user, setUser, onLogout, theme }) => {
  const { mode, setMode, glowColor, setGlowColor, isGlowHour } = theme || { mode: "light", setMode: () => { }, glowColor: "rosa", setGlowColor: () => { }, isGlowHour: false };
  const era = ERAS.find(e => e.level === (user.level || 1)) || ERAS[0];
  const [editing, setEditing] = useState(false); const [insta, setInsta] = useState(user.instagram || ""); const [uname, setUname] = useState(user.name || "");
  const [items, setItems] = useState(MOCK_SHOP); const [rd, setRd] = useState(null); const [showShare, setShowShare] = useState(false);
  const save = async () => { setUser(u => ({ ...u, name: uname, instagram: insta })); if (user.id) await db.updateProfile(user.id, { name: uname, instagram: insta }); setEditing(false); };
  useEffect(() => { db.getShopItems().then(d => { if (d.length) setItems(d) }); }, []);
  const redeem = async item => {
    // Always fetch fresh pts from DB
    const fresh = user.id ? await db.getProfile(user.id) : null;
    const currentPts = fresh ? fresh.pts : (user.pts || 0);
    const currentLevel = fresh ? fresh.level : (user.level || 1);
    if (currentPts < item.cost || currentLevel < item.min_level) return;
    const np = currentPts - item.cost;
    setUser(u => ({ ...u, pts: np }));
    if (user.id) {
      await db.updateProfile(user.id, { pts: np });
      await supabase.from("redemptions").insert({ user_id: user.id, item_id: item.id });
    }
    Sound.redeem(); setRd(item); setTimeout(() => setRd(null), 2500);
  };
  const canvasRef = useRef(null);
  const [socialTab, setSocialTab] = useState("score"); // score | friends | gifts
  const [friends, setFriends] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [giftTarget, setGiftTarget] = useState(null);
  const [giftAmount, setGiftAmount] = useState(50);
  const [giftMsg, setGiftMsg] = useState("");

  useEffect(() => {
    if (user.id) {
      db.getFriendRequests(user.id).then(setFriends);
      db.getMyGifts(user.id).then(setGifts);
    }
  }, [socialTab]);

  const generateStoryCard = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, "#C1272D"); grad.addColorStop(0.5, "#8B1A1A"); grad.addColorStop(1, "#C1272D");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1920);
    // Decorative circles
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(200, 400, 300, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(880, 1500, 250, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Logo
    ctx.fillStyle = "#2d472a"; ctx.font = "bold 120px Playfair Display, Georgia, serif";
    ctx.textAlign = "center"; ctx.fillText("cereza", 540, 500);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "400 28px Source Sans Pro, sans-serif";
    ctx.fillText("LOYALTY CLUB", 540, 560);
    // User info card
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath();
    ctx.roundRect(140, 700, 800, 500, 40); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2; ctx.stroke();
    // Avatar circle
    ctx.fillStyle = "#e24a28"; ctx.beginPath(); ctx.arc(540, 820, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 48px Playfair Display, serif";
    ctx.fillText((user.name || "U")[0].toUpperCase(), 540, 838);
    // Name
    ctx.fillStyle = "#fff"; ctx.font = "bold 48px Source Sans Pro, sans-serif";
    ctx.fillText(`@${user.name || "user"}`, 540, 940);
    // Era + Level
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "400 32px Source Sans Pro, sans-serif";
    ctx.fillText(`${era.name} · Level ${user.level || 1}`, 540, 1000);
    // Stats
    ctx.fillStyle = "#fff"; ctx.font = "bold 64px Source Sans Pro, sans-serif";
    ctx.fillText(`${user.pts || 0}`, 540, 1100);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "400 24px Source Sans Pro, sans-serif";
    ctx.fillText("PUNKTE", 540, 1140);
    // Bottom CTA
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "400 24px Source Sans Pro, sans-serif";
    ctx.fillText("cereza-loyalty.vercel.app", 540, 1700);
    ctx.fillText("Werde auch Member!", 540, 1740);
    // Download or share
    canvas.toBlob(async (blob) => {
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], "cereza-card.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Cereza Loyalty", text: `Ich bin ${era.name} bei Cereza!` });
            return;
          }
        } catch (e) { }
      }
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "cereza-story.png"; a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const searchUsers = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const results = await db.searchUsers(q);
    setSearchResults(results.filter(r => r.id !== user.id));
  };

  const sendRequest = async (targetId) => {
    await db.sendFriendRequest(user.id, targetId);
    setSearchResults([]);
    setSearchQ("");
    db.getFriendRequests(user.id).then(setFriends);
  };

  const respondRequest = async (id, status) => {
    await db.respondFriendRequest(id, status);
    db.getFriendRequests(user.id).then(setFriends);
  };

  const sendGiftPts = async () => {
    if (!giftTarget || giftAmount < 10 || giftAmount > 200) return;
    const fresh = user.id ? await db.getProfile(user.id) : null;
    const currentPts = fresh ? fresh.pts : (user.pts || 0);
    if (currentPts < giftAmount) return;
    Sound.gift(); await db.sendGift(user.id, giftTarget.id, "pts", giftAmount, null, giftMsg);
    await db.updateProfile(user.id, { pts: currentPts - giftAmount });
    setUser(u => ({ ...u, pts: currentPts - giftAmount }));
    setGiftTarget(null); setGiftAmount(50); setGiftMsg("");
    db.getMyGifts(user.id).then(setGifts);
  };

  const claimGift = async (giftId) => {
    await db.claimGift(giftId, user.id);
    const fresh = await db.getProfile(user.id);
    if (fresh) setUser(u => ({ ...u, ...fresh }));
    db.getMyGifts(user.id).then(setGifts);
  };

  const myFriends = friends.filter(f => f.status === "accepted");
  const pendingReceived = friends.filter(f => f.status === "pending" && f.receiver_id === user.id);
  const pendingSent = friends.filter(f => f.status === "pending" && f.sender_id === user.id);

  const shareCard = () => generateStoryCard();
  const inviteFriend = () => {
    const link = `https://cereza-loyalty.vercel.app?ref=${user.name || "friend"}`;
    if (navigator.share) { navigator.share({ title: "Cereza Pizza", text: "Tritt dem Cereza Loyalty Club bei! Wir bekommen beide XP:", url: link }); }
    else { navigator.clipboard?.writeText(link); setShowShare(true); setTimeout(() => setShowShare(false), 2000); }
  };
  return (
    <div style={{ background: C.beige, paddingBottom: "16px", minHeight: "100%" }}>
      {rd && <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.3s" }}><div style={{ fontSize: "40px", color: C.white }}>✓</div><div style={{ color: C.white, fontSize: "18px", fontWeight: "700", marginTop: "10px" }}>Eingelöst!</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginTop: "4px" }}>Zeige dies an der Kasse</div></div>}
      {showShare && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: C.green, color: C.white, padding: "10px 20px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", zIndex: 999, animation: "fadeUp 0.3s" }}>Link kopiert!</div>}
      <div style={{ padding: "24px 20px", textAlign: "center" }}>
        {/* Avatar with upload */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "10px" }}>
          {user.avatar_url ? (
            <img src={user.avatar_url} style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.beige}` }} />
          ) : (
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", color: C.white, fontFamily: font.display, fontWeight: "700", border: `3px solid ${C.beige}` }}>{(user.name || "U")[0].toUpperCase()}</div>
          )}
          <label style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "22px", height: "22px", borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "10px" }}>
            +
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file || !user.id) return;
              const url = await db.uploadAvatar(user.id, file);
              if (url) setUser(u => ({ ...u, avatar_url: url }));
            }} />
          </label>
        </div>
        <div style={{ fontSize: "20px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>@{user.name || "user"}</div>
        <div style={{ color: C.textLight, fontSize: "11px", marginTop: "3px" }}>{era.name} · Level {user.level || 1}</div>
        {/* Share + Invite buttons */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "12px", flexWrap: "wrap" }}>
          <button onClick={generateStoryCard} style={{ padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "20px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: font.ui, color: C.text }}>Story Card</button>
          <button onClick={shareCard} style={{ padding: "8px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "20px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: font.ui, color: C.text }}>↗ Teilen</button>
          <button onClick={inviteFriend} style={{ padding: "8px 14px", background: C.orange, border: "none", borderRadius: "20px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: font.ui, color: C.white }}>+ Einladen</button>
        </div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
          {[{ v: user.pts || 0, l: "Punkte" }, { v: user.total_visits || 0, l: "Besuche" }, { v: user.streak || 0, l: "Streak" }].map((s, i) => <Card key={i} style={{ padding: "12px", textAlign: "center" }}><div style={{ fontSize: "17px", fontWeight: "800" }}>{s.v}</div><div style={{ fontSize: "9px", color: C.textLight, marginTop: "2px" }}>{s.l}</div></Card>)}
        </div>

        {/* Social Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "10px", background: C.greyBg, borderRadius: "12px", padding: "3px" }}>
          {[{ id: "score", l: "Score" }, { id: "friends", l: "Freunde" }, { id: "gifts", l: "Geschenke" }].map(st => (
            <button key={st.id} onClick={() => setSocialTab(st.id)} style={{ flex: 1, padding: "8px", borderRadius: "10px", border: "none", background: socialTab === st.id ? C.card : "transparent", color: socialTab === st.id ? C.text : C.textLight, fontSize: "12px", fontWeight: socialTab === st.id ? "700" : "500", cursor: "pointer", fontFamily: font.ui, transition: "all 0.2s" }}>{st.l}</button>
          ))}
        </div>

        {socialTab === "score" && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {items.map((item, i) => {
                const ok = (user.pts || 0) >= item.cost && (user.level || 1) >= item.min_level; const locked = (user.level || 1) < item.min_level;
                return <Card key={item.id} onClick={() => ok && redeem(item)} style={{ padding: "12px 8px", textAlign: "center", opacity: locked ? 0.4 : 1, cursor: ok ? "pointer" : "default", border: ok ? `2px solid ${C.orange}` : `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "22px", marginBottom: "4px" }}>{item.icon}</div>
                  <div style={{ fontSize: "11px", fontWeight: "700" }}>{item.name}</div>
                  <div style={{ marginTop: "6px", display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "9px", fontWeight: "700", background: ok ? C.orange : C.greyBg, color: ok ? C.white : C.textLight }}>{locked ? `Lvl ${item.min_level}` : `${item.cost} pts`}</div>
                </Card>;
              })}
            </div>
          </div>
        )}

        {socialTab === "friends" && (
          <div style={{ marginBottom: "10px" }}>
            {/* Search */}
            <input value={searchQ} onChange={e => searchUsers(e.target.value)} placeholder="User suchen..." style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", marginBottom: "8px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
            {searchResults.map(r => (
              <Card key={r.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "13px", fontWeight: "700" }}>{(r.name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600", color: C.text }}>@{r.name}</div><div style={{ fontSize: "10px", color: C.textLight }}>Level {r.level || 1}</div></div>
                <button onClick={() => sendRequest(r.id)} style={{ padding: "6px 12px", background: C.orange, border: "none", borderRadius: "8px", color: C.white, fontSize: "10px", fontWeight: "700", cursor: "pointer" }}>Anfrage</button>
              </Card>
            ))}
            {/* Pending Received */}
            {pendingReceived.length > 0 && <div style={{ fontSize: "11px", fontWeight: "700", color: C.textSub, marginTop: "8px", marginBottom: "6px" }}>Anfragen an dich</div>}
            {pendingReceived.map(f => (
              <Card key={f.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600", color: C.text }}>@{f.sender?.name}</div></div>
                <button onClick={() => respondRequest(f.id, "accepted")} style={{ padding: "5px 10px", background: C.green, border: "none", borderRadius: "6px", color: C.white, fontSize: "10px", fontWeight: "700", cursor: "pointer" }}>Annehmen</button>
                <button onClick={() => respondRequest(f.id, "rejected")} style={{ padding: "5px 10px", background: C.greyBg, border: "none", borderRadius: "6px", color: C.textLight, fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>Ablehnen</button>
              </Card>
            ))}
            {/* Pending Sent */}
            {pendingSent.length > 0 && <div style={{ fontSize: "11px", fontWeight: "700", color: C.textSub, marginTop: "8px", marginBottom: "6px" }}>Gesendet</div>}
            {pendingSent.map(f => (
              <Card key={f.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600", color: C.text }}>@{f.receiver?.name}</div><div style={{ fontSize: "10px", color: C.textLight }}>Warten auf Antwort...</div></div>
              </Card>
            ))}
            {/* Accepted Friends */}
            {myFriends.length > 0 && <div style={{ fontSize: "11px", fontWeight: "700", color: C.textSub, marginTop: "8px", marginBottom: "6px" }}>Freunde ({myFriends.length})</div>}
            {myFriends.map(f => {
              const friend = f.sender_id === user.id ? f.receiver : f.sender;
              return <Card key={f.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "13px", fontWeight: "700" }}>{(friend?.name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "600", color: C.text }}>@{friend?.name}</div></div>
                <button onClick={() => setGiftTarget(friend)} style={{ padding: "5px 10px", background: C.beige, border: `1px solid ${C.border}`, borderRadius: "6px", color: C.text, fontSize: "10px", fontWeight: "600", cursor: "pointer" }}>Schenken</button>
              </Card>;
            })}
            {myFriends.length === 0 && pendingReceived.length === 0 && searchResults.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: C.textLight, fontSize: "12px" }}>Suche nach Usern um Freunde hinzuzufügen</div>}
          </div>
        )}

        {socialTab === "gifts" && (
          <div style={{ marginBottom: "10px" }}>
            {/* Gift modal */}
            {giftTarget && (
              <Card style={{ marginBottom: "10px", border: `2px solid ${C.orange}` }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.textSub, marginBottom: "8px" }}>Punkte an @{giftTarget.name} senden</div>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  {[25, 50, 100, 200].map(a => (
                    <button key={a} onClick={() => setGiftAmount(a)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: giftAmount === a ? `2px solid ${C.orange}` : `1px solid ${C.border}`, background: giftAmount === a ? "rgba(226,74,40,0.1)" : C.card, color: giftAmount === a ? C.orange : C.text, fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>{a}</button>
                  ))}
                </div>
                <input value={giftMsg} onChange={e => setGiftMsg(e.target.value)} placeholder="Nachricht (optional)" style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "12px", marginBottom: "8px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={sendGiftPts} style={{ flex: 1, padding: "10px", background: C.orange, border: "none", borderRadius: "8px", color: C.white, fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>{giftAmount} pts senden</button>
                  <button onClick={() => setGiftTarget(null)} style={{ padding: "10px 14px", background: C.greyBg, border: "none", borderRadius: "8px", color: C.textLight, fontSize: "12px", cursor: "pointer" }}>X</button>
                </div>
              </Card>
            )}
            {/* Gift history */}
            {gifts.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: C.textLight, fontSize: "12px" }}>Noch keine Geschenke</div>}
            {gifts.map(g => {
              const isSender = g.sender_id === user.id;
              const canClaim = !isSender && g.status === "pending";
              return <Card key={g.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: isSender ? C.salmon : C.green, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "14px", fontWeight: "700" }}>{isSender ? "↑" : "↓"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: C.text }}>{isSender ? `An @${g.receiver?.name}` : `Von @${g.sender?.name}`}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>{g.amount} pts {g.message && `· "${g.message}"`}</div>
                </div>
                {canClaim ? <button onClick={() => claimGift(g.id)} style={{ padding: "5px 10px", background: C.green, border: "none", borderRadius: "6px", color: C.white, fontSize: "10px", fontWeight: "700", cursor: "pointer" }}>Annehmen</button>
                  : <div style={{ fontSize: "10px", color: g.status === "claimed" ? C.green : C.textLight, fontWeight: "600" }}>{g.status === "claimed" ? "Eingelöst" : "Gesendet"}</div>}
              </Card>;
            })}
          </div>
        )}

        {/* Profile Info */}
        <Card style={{ marginBottom: "10px" }}>
          {editing ? (<>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1px", marginBottom: "8px", color: C.textSub }}>Profil bearbeiten</div>
            <input value={uname} onChange={e => setUname(e.target.value)} placeholder="Username" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "14px", marginBottom: "8px", outline: "none", boxSizing: "border-box", fontFamily: font.ui }} />
            <input value={insta} onChange={e => setInsta(e.target.value)} placeholder="@instagram" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "14px", marginBottom: "10px", outline: "none", boxSizing: "border-box", fontFamily: font.ui }} />
            <button onClick={save} style={{ width: "100%", padding: "11px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui }}>Speichern</button>
          </>) : (<>
            {[{ label: "Username", value: `@${user.name || "user"}` }, { label: "E-Mail", value: user.email }, { label: "Instagram", value: user.instagram || "—" }, { label: "Telefon", value: user.phone || "—" }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: i < 3 ? `1px solid ${C.greyBg}` : "none" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: "9px", color: C.textLight }}>{r.label}</div><div style={{ fontSize: "12px", fontWeight: "500" }}>{r.value}</div></div>
              </div>
            ))}
            <button onClick={() => setEditing(true)} style={{ width: "100%", marginTop: "10px", padding: "10px", background: C.beige, border: `1px solid ${C.border}`, borderRadius: "10px", color: C.text, fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: font.ui }}>Profil bearbeiten</button>
          </>)}
        </Card>

        {/* Era Journey */}
        <Card>
          <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "8px", color: C.textSub }}>Era Journey</div>
          <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
            {ERAS.map((e, i) => <div key={i} style={{ width: "42px", height: "42px", borderRadius: "50%", background: (user.level || 1) >= e.level ? C.orange : C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: (user.level || 1) >= e.level ? "13px" : "10px", fontWeight: "800", color: (user.level || 1) >= e.level ? C.white : C.textLight, border: (user.level || 1) === e.level ? `3px solid ${C.text}` : "none" }}>{(user.level || 1) >= e.level ? e.level : "—"}</div>)}
          </div>
        </Card>
        {/* Settings */}
        <Card style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "10px", color: C.textSub }}>Einstellungen</div>
          {/* Dark/Light Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.greyBg}` }}>
            <div style={{ fontSize: "13px", color: C.text }}>Dark Mode</div>
            <div onClick={() => setMode(mode === "dark" ? "light" : "dark")} style={{ width: "44px", height: "24px", borderRadius: "12px", background: mode === "dark" ? C.orange : C.greyBg, cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: C.white, position: "absolute", top: "2px", left: mode === "dark" ? "22px" : "2px", transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
          {/* Glow Hour Color */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <div><div style={{ fontSize: "13px", color: C.text }}>Glow Hour Farbe</div>{isGlowHour && <div style={{ fontSize: "9px", color: C.orange, fontWeight: "700" }}>Glow Hour aktiv!</div>}</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <div onClick={() => setGlowColor("rosa")} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f8e8ee", border: glowColor === "rosa" ? `2px solid #d4618c` : `2px solid ${C.border}`, cursor: "pointer" }} />
              <div onClick={() => setGlowColor("gruen")} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e8f5e9", border: glowColor === "gruen" ? `2px solid #4CAF50` : `2px solid ${C.border}`, cursor: "pointer" }} />
            </div>
          </div>
        </Card>

        <button onClick={onLogout} style={{ width: "100%", marginTop: "12px", padding: "11px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "10px", color: C.textLight, fontSize: "12px", cursor: "pointer", fontFamily: font.ui }}>Ausloggen</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ADMIN PANEL – Kompletter Ersatz
// In App.jsx: Suche nach "const AdminPanel" und ersetze die
// gesamte Funktion bis zur nächsten "const AdminLogin" mit diesem Code
// ═══════════════════════════════════════════════════════════════

const AdminPanel = ({ onClose }) => {
  const [tab, setTab] = useState("stats");
  const [users, setUsers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [facts, setFacts] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [glowHours, setGlowHours] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [vibes, setVibes] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushSent, setPushSent] = useState(false);
  const [toast, setToast] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editMission, setEditMission] = useState(null);
  const [editDish, setEditDish] = useState(null);
  const [editShop, setEditShop] = useState(null);
  const [editPrize, setEditPrize] = useState(null);
  const [editGlow, setEditGlow] = useState(null);
  const [newFact, setNewFact] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500); };

  const loadAll = async () => {
    setLoading(true);
    const [u, m, d, f, p, s, r, v, vis] = await Promise.all([
      db.getAllProfiles(),
      db.getMissions(),
      supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true).then(r => (r.data || []).map(d => ({ ...d, votes: d.dish_votes?.filter(v => v.vote).length || 0 }))),
      db.getFunFacts(),
      db.getWheelPrizes(),
      db.getShopItems(),
      db.getPendingRedemptions(),
      db.getPendingVibes(),
      db.getTodayVisitors(),
    ]);
    setUsers(u); setMissions(m); setDishes(d); setFacts(f); setPrizes(p);
    setShopItems(s); setRedemptions(r); setVibes(v); setVisitors(vis);
    // Glow Hours
    const { data: gh } = await supabase.from('glow_hours').select('*').order('id');
    setGlowHours(gh || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // ── Statistiken ───────────────────────────────────────────────
  const totalPts = users.reduce((s, u) => s + (u.pts || 0), 0);
  const avgPts = users.length ? Math.round(totalPts / users.length) : 0;
  const today = new Date().toISOString().split('T')[0];
  const todayUsers = users.filter(u => u.last_visit === today).length;
  const aboMembers = users.filter(u => u.is_abo_member).length;
  const levelDist = [1, 2, 3, 4, 5].map(l => ({ l, count: users.filter(u => (u.level || 1) === l).length }));

  // ── User bearbeiten ───────────────────────────────────────────
  const saveUser = async () => {
    if (!editUser) return;
    await db.updateProfile(editUser.id, {
      name: editUser.name,
      pts: parseInt(editUser.pts) || 0,
      level: parseInt(editUser.level) || 1,
      is_admin: editUser.is_admin,
      is_abo_member: editUser.is_abo_member,
      streak: parseInt(editUser.streak) || 0,
      total_visits: parseInt(editUser.total_visits) || 0,
    });
    showToast("User gespeichert ✓");
    setEditUser(null);
    db.getAllProfiles().then(setUsers);
  };

  const deleteUser = async (uid) => {
    if (!confirm("User wirklich löschen?")) return;
    await supabase.from('profiles').delete().eq('id', uid);
    showToast("User gelöscht");
    db.getAllProfiles().then(setUsers);
  };

  // ── Mission CRUD ──────────────────────────────────────────────
  const saveMission = async () => {
    if (!editMission) return;
    if (editMission.id) {
      await supabase.from('missions').update({
        title: editMission.title, description: editMission.description,
        pts_reward: parseInt(editMission.pts_reward) || 0,
        icon: editMission.icon, goal: parseInt(editMission.goal) || 1,
        active: editMission.active,
      }).eq('id', editMission.id);
    } else {
      await supabase.from('missions').insert({
        title: editMission.title, description: editMission.description,
        pts_reward: parseInt(editMission.pts_reward) || 0,
        icon: editMission.icon || '⭐', goal: parseInt(editMission.goal) || 1,
        active: true,
      });
    }
    showToast("Mission gespeichert ✓");
    setEditMission(null);
    db.getMissions().then(setMissions);
  };

  // ── Dish CRUD ─────────────────────────────────────────────────
  const saveDish = async () => {
    if (!editDish) return;
    if (editDish.id) {
      await supabase.from('dishes').update({
        name: editDish.name, description: editDish.description,
        active: editDish.active, voting_enabled: editDish.voting_enabled,
      }).eq('id', editDish.id);
    } else {
      await supabase.from('dishes').insert({
        name: editDish.name, description: editDish.description || '',
        active: true, voting_enabled: true,
      });
    }
    showToast("Gericht gespeichert ✓");
    setEditDish(null);
    supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true)
      .then(r => setDishes((r.data || []).map(d => ({ ...d, votes: d.dish_votes?.filter(v => v.vote).length || 0 }))));
  };

  // ── Shop CRUD ─────────────────────────────────────────────────
  const saveShop = async () => {
    if (!editShop) return;
    if (editShop.id) {
      await supabase.from('shop_items').update({
        name: editShop.name, description: editShop.description,
        icon: editShop.icon, cost: parseInt(editShop.cost) || 0,
        min_level: parseInt(editShop.min_level) || 1, active: editShop.active,
      }).eq('id', editShop.id);
    } else {
      await supabase.from('shop_items').insert({
        name: editShop.name, description: editShop.description || '',
        icon: editShop.icon || '🎁', cost: parseInt(editShop.cost) || 0,
        min_level: parseInt(editShop.min_level) || 1, active: true,
      });
    }
    showToast("Shop Item gespeichert ✓");
    setEditShop(null);
    db.getShopItems().then(setShopItems);
  };

  // ── Wheel Prize CRUD ──────────────────────────────────────────
  const savePrize = async () => {
    if (!editPrize) return;
    if (editPrize.id) {
      await supabase.from('wheel_prizes').update({
        label: editPrize.label, value: parseInt(editPrize.value) || 0,
        color: editPrize.color, active: editPrize.active,
      }).eq('id', editPrize.id);
    } else {
      await supabase.from('wheel_prizes').insert({
        label: editPrize.label, value: parseInt(editPrize.value) || 0,
        color: editPrize.color || '#e24a28', active: true,
      });
    }
    showToast("Preis gespeichert ✓");
    setEditPrize(null);
    db.getWheelPrizes().then(setPrizes);
  };

  // ── Glow Hour CRUD ────────────────────────────────────────────
  const saveGlow = async () => {
    if (!editGlow) return;
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    if (editGlow.id) {
      await supabase.from('glow_hours').update({
        day_of_week: parseInt(editGlow.day_of_week),
        start_time: editGlow.start_time, end_time: editGlow.end_time,
        multiplier: parseInt(editGlow.multiplier) || 2, active: editGlow.active,
      }).eq('id', editGlow.id);
    } else {
      await supabase.from('glow_hours').insert({
        day_of_week: parseInt(editGlow.day_of_week) || 1,
        start_time: editGlow.start_time || '12:00',
        end_time: editGlow.end_time || '14:00',
        multiplier: 2, active: true,
      });
    }
    showToast("Glow Hour gespeichert ✓");
    setEditGlow(null);
    supabase.from('glow_hours').select('*').order('id').then(r => setGlowHours(r.data || []));
  };

  const tabs = [
    { id: "stats", l: "📊 Stats" },
    { id: "users", l: "👥 User" },
    { id: "redemptions", l: "🎟️ Kasse" },
    { id: "shop", l: "🛒 Shop" },
    { id: "missions", l: "🎯 Missions" },
    { id: "dishes", l: "🍕 Gerichte" },
    { id: "glow", l: "✨ Glow" },
    { id: "prizes", l: "🎡 Rad" },
    { id: "facts", l: "💡 Fakten" },
    { id: "vibes", l: "📸 Vibes" },
    { id: "visits", l: "📅 Heute" },
    { id: "push", l: "🔔 Push" },
  ];

  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  const inp = (label, val, onChange, type = "text") => (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ fontSize: "10px", color: C.textLight, marginBottom: "3px", fontWeight: "600" }}>{label}</div>
      <input type={type} value={val ?? ''} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
    </div>
  );

  const toggle = (label, val, onChange) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.greyBg}` }}>
      <div style={{ fontSize: "13px", color: C.text }}>{label}</div>
      <div onClick={() => onChange(!val)} style={{ width: "40px", height: "22px", borderRadius: "11px", background: val ? C.orange : C.greyBg, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: C.white, position: "absolute", top: "2px", left: val ? "20px" : "2px", transition: "all 0.2s" }} />
      </div>
    </div>
  );

  const Modal = ({ title, onSave, onClose, children }) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: "20px", width: "100%", maxHeight: "80vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: C.greyBg, border: "none", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", color: C.text }}>✕</button>
        </div>
        {children}
        <button onClick={onSave} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui, marginTop: "12px" }}>Speichern</button>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u =>
    !searchQ || u.name?.toLowerCase().includes(searchQ.toLowerCase()) || u.email?.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.beige, overflow: "hidden", fontFamily: font.ui, display: "flex", flexDirection: "column" }}>
      <style>{defaultCSS}</style>

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", background: toast.ok ? C.green : C.orange, color: C.white, padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", zIndex: 999999, animation: "fadeUp 0.3s" }}>{toast.msg}</div>}

      {/* Edit Modals */}
      {editUser && (
        <Modal title="User bearbeiten" onSave={saveUser} onClose={() => setEditUser(null)}>
          {inp("Name", editUser.name, v => setEditUser(p => ({ ...p, name: v })))}
          {inp("Punkte (XP)", editUser.pts, v => setEditUser(p => ({ ...p, pts: v })), "number")}
          {inp("Level (1-5)", editUser.level, v => setEditUser(p => ({ ...p, level: v })), "number")}
          {inp("Streak", editUser.streak, v => setEditUser(p => ({ ...p, streak: v })), "number")}
          {inp("Besuche gesamt", editUser.total_visits, v => setEditUser(p => ({ ...p, total_visits: v })), "number")}
          {toggle("Admin", editUser.is_admin, v => setEditUser(p => ({ ...p, is_admin: v })))}
          {toggle("Abo Mitglied", editUser.is_abo_member, v => setEditUser(p => ({ ...p, is_abo_member: v })))}
          <button onClick={() => deleteUser(editUser.id)} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid #e24a28`, borderRadius: "10px", color: "#e24a28", fontSize: "13px", cursor: "pointer", marginTop: "8px" }}>User löschen</button>
        </Modal>
      )}

      {editMission && (
        <Modal title={editMission.id ? "Mission bearbeiten" : "Neue Mission"} onSave={saveMission} onClose={() => setEditMission(null)}>
          {inp("Titel", editMission.title, v => setEditMission(p => ({ ...p, title: v })))}
          {inp("Beschreibung", editMission.description, v => setEditMission(p => ({ ...p, description: v })))}
          {inp("Icon (Emoji)", editMission.icon, v => setEditMission(p => ({ ...p, icon: v })))}
          {inp("XP Belohnung", editMission.pts_reward, v => setEditMission(p => ({ ...p, pts_reward: v })), "number")}
          {inp("Ziel (Anzahl)", editMission.goal, v => setEditMission(p => ({ ...p, goal: v })), "number")}
          {editMission.id && toggle("Aktiv", editMission.active, v => setEditMission(p => ({ ...p, active: v })))}
        </Modal>
      )}

      {editDish && (
        <Modal title={editDish.id ? "Gericht bearbeiten" : "Neues Gericht"} onSave={saveDish} onClose={() => setEditDish(null)}>
          {inp("Name", editDish.name, v => setEditDish(p => ({ ...p, name: v })))}
          {inp("Beschreibung", editDish.description, v => setEditDish(p => ({ ...p, description: v })))}
          {editDish.id && toggle("Aktiv", editDish.active, v => setEditDish(p => ({ ...p, active: v })))}
          {editDish.id && toggle("Voting aktiv", editDish.voting_enabled, v => setEditDish(p => ({ ...p, voting_enabled: v })))}
          {editDish.id && <button onClick={async () => { if (!confirm("Alle Votes zurücksetzen?")) return; await supabase.from('dish_votes').delete().eq('dish_id', editDish.id); showToast("Votes zurückgesetzt"); setEditDish(null); loadAll(); }} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "10px", color: C.textLight, fontSize: "12px", cursor: "pointer", marginTop: "8px" }}>Votes zurücksetzen</button>}
        </Modal>
      )}

      {editShop && (
        <Modal title={editShop.id ? "Shop Item bearbeiten" : "Neues Item"} onSave={saveShop} onClose={() => setEditShop(null)}>
          {inp("Name", editShop.name, v => setEditShop(p => ({ ...p, name: v })))}
          {inp("Beschreibung", editShop.description, v => setEditShop(p => ({ ...p, description: v })))}
          {inp("Icon (Emoji)", editShop.icon, v => setEditShop(p => ({ ...p, icon: v })))}
          {inp("Kosten (XP)", editShop.cost, v => setEditShop(p => ({ ...p, cost: v })), "number")}
          {inp("Mindest-Level", editShop.min_level, v => setEditShop(p => ({ ...p, min_level: v })), "number")}
          {editShop.id && toggle("Aktiv", editShop.active, v => setEditShop(p => ({ ...p, active: v })))}
        </Modal>
      )}

      {editPrize && (
        <Modal title={editPrize.id ? "Preis bearbeiten" : "Neuer Preis"} onSave={savePrize} onClose={() => setEditPrize(null)}>
          {inp("Label", editPrize.label, v => setEditPrize(p => ({ ...p, label: v })))}
          {inp("Wert (XP, 0 = nichts, -1 = 2x)", editPrize.value, v => setEditPrize(p => ({ ...p, value: v })), "number")}
          {inp("Farbe (Hex)", editPrize.color, v => setEditPrize(p => ({ ...p, color: v })))}
          {editPrize.id && toggle("Aktiv", editPrize.active, v => setEditPrize(p => ({ ...p, active: v })))}
        </Modal>
      )}

      {editGlow && (
        <Modal title={editGlow.id ? "Glow Hour bearbeiten" : "Neue Glow Hour"} onSave={saveGlow} onClose={() => setEditGlow(null)}>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", color: C.textLight, marginBottom: "3px", fontWeight: "600" }}>Tag</div>
            <select value={editGlow.day_of_week ?? 1} onChange={e => setEditGlow(p => ({ ...p, day_of_week: e.target.value }))}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: font.ui, background: C.card, color: C.text }}>
              {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          {inp("Start (HH:MM)", editGlow.start_time, v => setEditGlow(p => ({ ...p, start_time: v })))}
          {inp("Ende (HH:MM)", editGlow.end_time, v => setEditGlow(p => ({ ...p, end_time: v })))}
          {inp("Multiplikator", editGlow.multiplier, v => setEditGlow(p => ({ ...p, multiplier: v })), "number")}
          {editGlow.id && toggle("Aktiv", editGlow.active, v => setEditGlow(p => ({ ...p, active: v })))}
        </Modal>
      )}

      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, background: C.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: C.text }}>Admin Panel</div>
          <div style={{ fontSize: "10px", color: C.textLight }}>Cereza Pizza · Frankfurt</div>
        </div>
        <button onClick={onClose} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "8px 14px", color: C.text, cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>✕ Schließen</button>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", overflowX: "auto", borderBottom: `1px solid ${C.greyBg}`, background: C.card, flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 12px", borderRadius: "20px", border: "none", background: tab === t.id ? C.orange : C.greyBg, color: tab === t.id ? C.white : C.textLight, fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", fontFamily: font.ui, transition: "all 0.2s" }}>{t.l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", WebkitOverflowScrolling: "touch" }}>
        {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Laden...</div>}

        {/* ── STATISTIKEN ── */}
        {!loading && tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              {[
                { v: users.length, l: "Registrierte User", icon: "👥" },
                { v: todayUsers, l: "Heute aktiv", icon: "🟢" },
                { v: aboMembers, l: "Abo Mitglieder", icon: "💚" },
                { v: avgPts, l: "Ø Punkte/User", icon: "⭐" },
                { v: totalPts.toLocaleString(), l: "Punkte total", icon: "🏆" },
                { v: visitors.length, l: "Besuche heute", icon: "📅" },
                { v: redemptions.length, l: "Offene Einlösungen", icon: "🎟️" },
                { v: vibes.length, l: "Vibes zur Freigabe", icon: "📸" },
              ].map((s, i) => (
                <Card key={i} style={{ padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontSize: "22px" }}>{s.icon}</div>
                  <div><div style={{ fontSize: "18px", fontWeight: "800", color: C.orange }}>{s.v}</div><div style={{ fontSize: "10px", color: C.textLight }}>{s.l}</div></div>
                </Card>
              ))}
            </div>

            {/* Level Verteilung */}
            <Card style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "10px", color: C.textSub }}>Level Verteilung</div>
              {levelDist.map(({ l, count }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ width: "50px", fontSize: "11px", color: C.textLight }}>Level {l}</div>
                  <div style={{ flex: 1, height: "16px", background: C.greyBg, borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${users.length ? (count / users.length) * 100 : 0}%`, background: C.orange, borderRadius: "8px", transition: "width 0.5s" }} />
                  </div>
                  <div style={{ width: "30px", fontSize: "11px", fontWeight: "700", textAlign: "right" }}>{count}</div>
                </div>
              ))}
            </Card>

            {/* Top 5 User */}
            <Card>
              <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "10px", color: C.textSub }}>Top 5 User</div>
              {[...users].sort((a, b) => (b.pts || 0) - (a.pts || 0)).slice(0, 5).map((u, i) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: i < 4 ? `1px solid ${C.greyBg}` : "none" }}>
                  <div style={{ fontSize: "14px" }}>{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</div>
                  <div style={{ flex: 1, fontSize: "12px", fontWeight: "600" }}>@{u.name}</div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: C.orange }}>{u.pts || 0} pts</div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── USER ── */}
        {!loading && tab === "users" && (
          <div>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="🔍 User suchen..." style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text, marginBottom: "10px" }} />
            {filteredUsers.map(u => (
              <Card key={u.id} style={{ marginBottom: "6px", padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "14px", fontWeight: "800", flexShrink: 0 }}>
                    {(u.name || "U")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>@{u.name} {u.is_admin && <span style={{ background: C.orange, color: C.white, fontSize: "8px", padding: "1px 5px", borderRadius: "4px" }}>ADMIN</span>}</div>
                    <div style={{ fontSize: "10px", color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: C.orange }}>{u.pts || 0}</div>
                    <div style={{ fontSize: "9px", color: C.textLight }}>Lvl {u.level || 1}</div>
                  </div>
                  <button onClick={() => setEditUser({ ...u })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer", color: C.text, flexShrink: 0 }}>✏️</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── KASSE / REDEMPTIONS ── */}
        {!loading && tab === "redemptions" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Offene Einlösungen – an der Kasse bestätigen</div>
            {redemptions.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Keine offenen Einlösungen</div>}
            {redemptions.map(r => (
              <Card key={r.id} style={{ marginBottom: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700" }}>{r.item?.icon} {r.item?.name || "Unbekannt"}</div>
                    <div style={{ fontSize: "11px", color: C.textLight }}>@{r.profile?.name} · {r.pts_spent} XP</div>
                    <div style={{ fontSize: "10px", color: C.textLight }}>Läuft ab: {new Date(r.expires_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={async () => { await db.confirmRedemption(r.id, null); showToast("Bestätigt ✓"); db.getPendingRedemptions().then(setRedemptions); }}
                    style={{ background: C.green, border: "none", borderRadius: "10px", padding: "10px 14px", color: C.white, fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>✓ OK</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── SHOP ── */}
        {!loading && tab === "shop" && (
          <div>
            <button onClick={() => setEditShop({ name: "", description: "", icon: "🎁", cost: 500, min_level: 1 })}
              style={{ width: "100%", padding: "11px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" }}>+ Neues Item</button>
            {shopItems.map(item => (
              <Card key={item.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "24px" }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700" }}>{item.name}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>{item.cost} XP · Lvl {item.min_level}+</div>
                </div>
                <button onClick={() => setEditShop({ ...item })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", cursor: "pointer" }}>✏️</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── MISSIONEN ── */}
        {!loading && tab === "missions" && (
          <div>
            <button onClick={() => setEditMission({ title: "", description: "", icon: "⭐", pts_reward: 100, goal: 1 })}
              style={{ width: "100%", padding: "11px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" }}>+ Neue Mission</button>
            {missions.map(m => (
              <Card key={m.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "22px" }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700" }}>{m.title}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>{m.description} · +{m.pts_reward} XP</div>
                </div>
                <button onClick={() => setEditMission({ ...m })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", cursor: "pointer" }}>✏️</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── GERICHTE ── */}
        {!loading && tab === "dishes" && (
          <div>
            <button onClick={() => setEditDish({ name: "", description: "" })}
              style={{ width: "100%", padding: "11px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" }}>+ Neues Gericht</button>
            {dishes.map(d => (
              <Card key={d.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "22px" }}>🍕</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700" }}>{d.name}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>♥ {d.votes} Votes · {d.voting_enabled ? "Voting aktiv" : "Voting aus"}</div>
                </div>
                <button onClick={() => setEditDish({ ...d })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", cursor: "pointer" }}>✏️</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── GLOW HOURS ── */}
        {!loading && tab === "glow" && (
          <div>
            <button onClick={() => setEditGlow({ day_of_week: 1, start_time: "12:00", end_time: "14:00", multiplier: 2, active: true })}
              style={{ width: "100%", padding: "11px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" }}>+ Neue Glow Hour</button>
            {glowHours.map(g => (
              <Card key={g.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "22px" }}>✨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700" }}>{days[g.day_of_week]}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>{g.start_time} – {g.end_time} · {g.multiplier}x XP · {g.active ? "✅ Aktiv" : "❌ Inaktiv"}</div>
                </div>
                <button onClick={() => setEditGlow({ ...g })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", cursor: "pointer" }}>✏️</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── GLÜCKSRAD PREISE ── */}
        {!loading && tab === "prizes" && (
          <div>
            <button onClick={() => setEditPrize({ label: "", value: 100, color: "#e24a28" })}
              style={{ width: "100%", padding: "11px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "10px" }}>+ Neuer Preis</button>
            {prizes.map(p => (
              <Card key={p.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700" }}>{p.label}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>{p.value > 0 ? `+${p.value} XP` : p.value === -1 ? "2x Multiplikator" : "Kein Gewinn"}</div>
                </div>
                <button onClick={() => setEditPrize({ ...p })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", cursor: "pointer" }}>✏️</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── FUN FACTS ── */}
        {!loading && tab === "facts" && (
          <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              <input value={newFact} onChange={e => setNewFact(e.target.value)} placeholder="Neuer Fun Fact..." style={{ flex: 1, padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", outline: "none", fontFamily: font.ui, background: C.card, color: C.text }} />
              <button onClick={async () => { if (!newFact.trim()) return; await db.addFunFact(newFact); setNewFact(""); db.getFunFacts().then(setFacts); showToast("Hinzugefügt ✓"); }}
                style={{ padding: "10px 16px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>+</button>
            </div>
            {facts.map(f => (
              <Card key={f.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, fontSize: "13px" }}>{f.text}</div>
                <button onClick={async () => { await db.deleteFunFact(f.id); db.getFunFacts().then(setFacts); }}
                  style={{ background: C.greyBg, border: "none", borderRadius: "6px", padding: "5px 8px", fontSize: "11px", color: C.textLight, cursor: "pointer" }}>✕</button>
              </Card>
            ))}
          </div>
        )}

        {/* ── VIBE GALLERY ── */}
        {!loading && tab === "vibes" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Fotos zur Freigabe ({vibes.length})</div>
            {vibes.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Keine Fotos zur Freigabe</div>}
            {vibes.map(v => (
              <Card key={v.id} style={{ marginBottom: "8px", padding: "12px" }}>
                <img src={v.url} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px", filter: "sepia(0.3) contrast(1.1)" }} />
                <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "8px" }}>@{v.profile?.name} · {new Date(v.created_at).toLocaleDateString('de-DE')}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={async () => { await db.approveVibe(v.id, true); showToast("Freigegeben ✓"); db.getPendingVibes().then(setVibes); }}
                    style={{ flex: 1, padding: "9px", background: C.green, border: "none", borderRadius: "8px", color: C.white, fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>✓ Freigeben</button>
                  <button onClick={async () => { await supabase.from('vibe_photos').delete().eq('id', v.id); showToast("Gelöscht"); db.getPendingVibes().then(setVibes); }}
                    style={{ flex: 1, padding: "9px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.textLight, fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>✕ Ablehnen</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── HEUTIGE BESUCHE ── */}
        {!loading && tab === "visits" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Angemeldete Besuche heute ({visitors.length})</div>
            {visitors.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Noch keine Anmeldungen</div>}
            {visitors.map(v => (
              <Card key={v.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "22px" }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "700" }}>@{v.profile?.name || "User"}</div>
                  <div style={{ fontSize: "10px", color: C.green, fontWeight: "600" }}>Kommt heute</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── PUSH ── */}
        {!loading && tab === "push" && (
          <div>
            <Card style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: C.textSub, marginBottom: "10px" }}>Broadcast an alle User</div>
              <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Titel (z.B. Glow Hour startet!)"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", marginBottom: "6px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
              <input value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Nachricht..."
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", marginBottom: "10px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
              <button onClick={async () => { if (!pushTitle) return; await sendPushToAll(pushTitle, pushBody); await supabase.from("admin_notifications").insert({ title: pushTitle, body: pushBody, sent_to: "all" }); showToast("Gesendet ✓"); setPushTitle(""); setPushBody(""); }}
                style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>📤 Senden</button>
            </Card>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "8px" }}>Schnell-Nachrichten</div>
            {[
              { t: "🌟 Glow Hour startet!", b: "Doppelte Punkte für die nächsten 2 Stunden!" },
              { t: "🎯 Neue Missionen verfügbar", b: "Schau dir die Challenges dieser Woche an!" },
              { t: "🎡 Glücksrad wartet!", b: "Du hast heute noch nicht gedreht." },
              { t: "🍕 Neues Gericht zum Voten", b: "Swipe jetzt und bestimme unser Menü!" },
              { t: "🎁 Exklusives Angebot", b: "Heute 20% Rabatt für Loyalty Mitglieder!" },
            ].map((q, i) => (
              <button key={i} onClick={async () => { await sendPushToAll(q.t, q.b); await supabase.from("admin_notifications").insert({ title: q.t, body: q.b, sent_to: "all" }); showToast("Gesendet ✓"); }}
                style={{ width: "100%", padding: "10px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", marginBottom: "6px", textAlign: "left", cursor: "pointer", fontFamily: font.ui }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: C.text }}>{q.t}</div>
                <div style={{ fontSize: "11px", color: C.textLight }}>{q.b}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminLogin = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const { data, error } = await db.signIn(email, pw);
      if (error) { setErr("falsche zugangsdaten"); setLoading(false); return }
      // Wait a moment for session to establish, then check profile
      await new Promise(r => setTimeout(r, 500));
      const profile = await db.getProfile(data.user.id);
      console.log('Admin profile check:', profile);
      if (profile && profile.is_admin) { onLogin(profile); }
      else if (!profile) {
        // Profile might not be readable yet, check via RPC or retry
        await new Promise(r => setTimeout(r, 1000));
        const retry = await db.getProfile(data.user.id);
        if (retry?.is_admin) { onLogin(retry); }
        else { setErr("kein admin-zugang oder profil nicht gefunden"); await db.signOut(); }
      }
      else { setErr("kein admin-zugang"); await db.signOut(); }
    } catch (e) { setErr("verbindungsfehler: " + e.message) }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: C.beige, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: font.ui }}>
      <style>{defaultCSS}</style>
      <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "3px", marginBottom: "6px" }}>admin</div>
      <div style={{ fontSize: "24px", fontFamily: font.display, color: C.text, marginBottom: "28px", fontWeight: "700" }}>login</div>
      <div style={{ width: "100%", maxWidth: "300px" }}>
        <input type="email" placeholder="admin e-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", color: C.text, fontSize: "14px", outline: "none", marginBottom: "8px", fontFamily: font.ui, boxSizing: "border-box" }} />
        <input type="password" placeholder="passwort" value={pw} onChange={e => setPw(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", color: C.text, fontSize: "14px", outline: "none", marginBottom: "10px", fontFamily: font.ui, boxSizing: "border-box" }} />
        {err && <div style={{ color: C.orange, fontSize: "11px", textAlign: "center", marginBottom: "8px" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "13px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui, opacity: loading ? 0.7 : 1 }}>{loading ? "..." : "einloggen"}</button>
        <button onClick={onBack} style={{ width: "100%", marginTop: "8px", padding: "11px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "12px", color: C.textLight, fontSize: "12px", cursor: "pointer", fontFamily: font.ui }}>← zurück</button>
      </div>
    </div>
  );
};

// ─── Main ───────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null); const [tab, setTab] = useState("home"); const [showLevelUp, setShowLevelUp] = useState(null);
  const [adminMode, setAdminMode] = useState(false); const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const { t, mode, setMode, glowColor, setGlowColor, isGlowHour } = theme;

  // Apply theme to global C object so all components get it
  applyTheme(t);
  const CSS = getCSS(t);

  useEffect(() => {
    const restore = async () => {
      try {
        // FIX: getUser() ist zuverlässiger als getSession() allein
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // FIX: Mit Retry – löst "Profil nicht gefunden" nach Reload
          const p = await db.getProfileWithRetry(session.user.id)
          if (p) {
            setUser(p)
          } else {
            // Letzter Fallback aus Session-Daten
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              email: session.user.email,
              pts: 0, level: 1, streak: 0, total_visits: 0,
              treat_count: 0, treat_goal: 8,
              wheel_spun_today: false, is_abo_member: false, is_admin: false
            })
          }
        }
      } catch (e) { console.error('Session restore error:', e) }
      setLoading(false)
    }
    restore()

    // Auth-Änderungen abfangen
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const p = await db.getProfileWithRetry(session.user.id)
        if (p) setUser(p)
      }
      // Token-Refresh: Profil im Hintergrund aktualisieren
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        const p = await db.getProfile(session.user.id)
        if (p) setUser(prev => ({ ...prev, ...p }))
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Realtime: sofort updaten wenn Admin etwas ändert (Punkte, Level, etc.)
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel('profile-live-' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        setUser(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  // Realtime – sofort updaten wenn Admin Punkte/Level ändert
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('profile-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        setUser(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) return; const ne = [...ERAS].reverse().find(e => (user.pts || 0) >= e.ptsNeeded);
    if (ne && ne.level > (user.level || 1)) { setUser(u => ({ ...u, level: ne.level })); if (user.id) db.updateProfile(user.id, { level: ne.level }); setShowLevelUp(ne.level); Sound.levelUp(); }
  }, [user?.pts]);

  // Request push permission when user logs in
  useEffect(() => {
    if (!user?.id) return;
    requestPushPermission(user.id).catch(() => { });
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) { setToast({ title, body }); setTimeout(() => setToast(null), 4000); Sound.tap(); }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [user?.id]);

  if (loading) return <div style={{ position: "fixed", inset: 0, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><style>{CSS}</style><div style={{ textAlign: "center" }}><div style={{ fontSize: "42px", fontFamily: font.display, color: t.logoColor, fontWeight: "700" }}>cereza</div><div style={{ fontSize: "10px", color: t.textLight, letterSpacing: "3px", marginTop: "6px" }}>loading...</div></div></div>;
  if (adminMode === "login") return <AdminLogin onLogin={p => { setAdminMode("panel") }} onBack={() => setAdminMode(false)} />;
  if (adminMode === "panel") return <AdminPanel onClose={async () => { await db.signOut(); setAdminMode(false) }} />;
  if (!user) return <div style={{ position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto" }}><AuthScreen onLogin={setUser} /><div onClick={() => setAdminMode("login")} style={{ position: "fixed", bottom: "8px", left: "50%", transform: "translateX(-50%)", color: "rgba(0,0,0,0.06)", fontSize: "9px", cursor: "pointer", padding: "4px 10px" }}>admin</div></div>;

  const nav = [
    { id: "home", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, l: "Home" },
    { id: "missions", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" /></svg>, l: "Missions" },
    { id: "scan", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" /><line x1="9" y1="5" x2="10" y2="5" /><line x1="9" y1="19" x2="10" y2="19" /><line x1="14" y1="5" x2="15" y2="5" /><line x1="14" y1="19" x2="15" y2="19" /><line x1="5" y1="9" x2="5" y2="10" /><line x1="19" y1="9" x2="19" y2="10" /><line x1="5" y1="14" x2="5" y2="15" /><line x1="19" y1="14" x2="19" y2="15" /></svg>, l: "Scan" },
    { id: "cinder", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>, l: "Cinder" },
    { id: "profile", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>, l: "Profil" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto",
      fontFamily: font.ui, background: t.bg,
      display: "flex", flexDirection: "column", overflow: "hidden",
      transition: "background 0.4s"
    }}>
      <style>{CSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "max(16px, env(safe-area-inset-top, 16px))",
          left: "50%", transform: "translateX(-50%)",
          background: t.card, border: `1px solid ${t.border}`,
          borderRadius: "16px", padding: "12px 18px", zIndex: 9998,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxWidth: "340px", width: "90%",
          animation: "fadeUp 0.3s", display: "flex", gap: "10px", alignItems: "center"
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: t.text }}>{toast.title}</div>
            {toast.body && <div style={{ fontSize: "11px", color: t.textLight, marginTop: "2px" }}>{toast.body}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div className="tab-content" style={{ height: "100%" }}>
          {tab === "home" && <HomeTab user={user} setUser={setUser} setTab={setTab} />}
          {tab === "missions" && <WheelTab user={user} setUser={setUser} />}
          {tab === "scan" && <ScanTab user={user} setUser={setUser} />}
          {tab === "cinder" && <VoteTab user={user} setUser={setUser} />}
          {tab === "profile" && <ProfileTab user={user} setUser={setUser} onLogout={async () => { await db.signOut(); setUser(null) }} theme={theme} />}
        </div>
      </div>

      {/* iOS-Style Tab Bar */}
      <div style={{
        flexShrink: 0,
        background: t.navBg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: `0.5px solid ${t.navBorder}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        transition: "all 0.3s",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5,1fr)",
          padding: "8px 0 4px",
          maxWidth: "430px", margin: "0 auto"
        }}>
          {nav.map(n => {
            const a = tab === n.id;
            return (
              <button key={n.id} onClick={() => { Sound.tap(); setTab(n.id); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "3px", background: "none", border: "none", cursor: "pointer",
                  padding: "6px 0", transition: "all 0.2s",
                  color: a ? t.accent : t.textLight,
                }}>
                {/* Icon container – filled wenn aktiv */}
                <div style={{
                  padding: "4px",
                  borderRadius: "10px",
                  background: a ? t.accent + "15" : "transparent",
                  transition: "all 0.2s",
                  transform: a ? "scale(1.08)" : "scale(1)",
                  color: a ? t.accent : t.textLight,
                }}>
                  {n.icon}
                </div>
                <span style={{
                  fontSize: "10px",
                  fontWeight: a ? "700" : "500",
                  color: a ? t.accent : t.textLight,
                  letterSpacing: "0.1px",
                  transition: "all 0.2s"
                }}>{n.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
