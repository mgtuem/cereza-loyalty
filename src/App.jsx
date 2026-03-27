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
const font = { ui: "'Source Sans Pro', -apple-system, 'SF Pro Display', sans-serif", display: "'Playfair Display', Georgia, serif" };

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
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&family=Playfair+Display:wght@400;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body,#root{height:100%;width:100%;overflow:hidden;position:fixed;inset:0;background:${t.bg};overscroll-behavior:none;user-select:none;-webkit-user-select:none;transition:background 0.3s;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
  input,textarea{user-select:text;-webkit-user-select:text}
  input::placeholder{color:${t.textLight}}
  ::-webkit-scrollbar{display:none}
  button{-webkit-appearance:none;appearance:none}
  button:active{transform:scale(0.97);opacity:0.85}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px ${t.accent}33}50%{box-shadow:0 0 20px ${t.accent}66}}
  @keyframes scanLine{0%,100%{top:12%}50%{top:82%}}
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
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; },
  play(freq, duration, type = "sine", vol = 0.15) {
    try {
      const c = this.init(); const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + duration);
    } catch (e) { }
  },
  spin() { this.play(440, 0.08); setTimeout(() => this.play(550, 0.08), 80); setTimeout(() => this.play(660, 0.08), 160); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.play(f, 0.2, "sine", 0.12), i * 120)); },
  lose() { this.play(300, 0.3, "triangle", 0.1); setTimeout(() => this.play(250, 0.4, "triangle", 0.08), 200); },
  levelUp() { [523, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => this.play(f, 0.25, "sine", 0.1), i * 150)); },
  scan() { this.play(880, 0.1); setTimeout(() => this.play(1100, 0.15), 100); },
  redeem() { this.play(660, 0.15); setTimeout(() => this.play(880, 0.2), 150); },
  tap() { this.play(800, 0.05, "sine", 0.06); },
  vote() { this.play(500, 0.1); setTimeout(() => this.play(700, 0.12), 80); },
  gift() { [660, 784, 880, 1047].forEach((f, i) => setTimeout(() => this.play(f, 0.15, "sine", 0.08), i * 100)); },
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
    if (!email || !pw) { setErr("bitte alle felder ausfüllen"); return; }
    if (mode === "register" && !username) { setErr("bitte username eingeben"); return; }
    if (mode === "register" && !phone) { setErr("bitte handynummer eingeben"); return; }
    if (mode === "register" && !dsgvo) { setErr("bitte datenschutz akzeptieren"); return; }
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
  const maxFreeSpins = 1; const maxPaidSpins = 2;

  useEffect(() => {
    const init = async () => {
      if (user.id) {
        const fresh = await db.getProfile(user.id);
        if (fresh) { setSpins(fresh.wheel_spun_today ? 1 : 0); setUser(u => ({ ...u, ...fresh })); }
      } else { setSpins(user.wheel_spun_today ? 1 : 0); }
      db.getMissions().then(d => { if (d.length) setMissions(d) });
      db.getWheelPrizes().then(d => { if (d.length) setPrizes(d.map(p => ({ label: p.label, value: p.value, bg: p.color }))) });
      setLoading(false);
    };
    init();
  }, []);

  const canSpin = spins < maxPaidSpins;
  const needsPay = spins >= maxFreeSpins;

  const spin = async () => {
    if (spinning || !canSpin) return;
    // Double-check from DB that user hasn't already spun
    if (user.id) {
      const fresh = await db.getProfile(user.id);
      if (fresh && fresh.wheel_spun_today && spins < 1) { setSpins(1); return; }
    }
    if (needsPay && (user.pts || 0) < 100) { return; }
    setSpinning(true); setResult(null); Sound.spin();
    // Deduct 100 pts for 2nd spin
    if (needsPay) {
      const freshProfile = user.id ? await db.getProfile(user.id) : null;
      const currentPts = freshProfile ? freshProfile.pts : (user.pts || 0);
      if (currentPts < 100) { setSpinning(false); return; }
      const np = currentPts - 100;
      setUser(u => ({ ...u, pts: np }));
      if (user.id) await db.updateProfile(user.id, { pts: np });
    }
    const idx = Math.floor(Math.random() * prizes.length); const seg = 360 / prizes.length;
    setRot(r => r + 360 * 6 + (360 - idx * seg - seg / 2));
    setTimeout(async () => {
      setSpinning(false); const newSpins = spins + 1; setSpins(newSpins);
      const prize = prizes[idx]; setResult(prize); prize.value > 0 ? Sound.win() : Sound.lose();
      // Get fresh pts from DB before adding
      const freshProfile = user.id ? await db.getProfile(user.id) : null;
      const currentPts = freshProfile ? freshProfile.pts : (user.pts || 0);
      if (prize.value > 0) {
        const np = currentPts + prize.value;
        setUser(u => ({ ...u, pts: np, wheel_spun_today: true }));
        if (user.id) await db.updateProfile(user.id, { pts: np, wheel_spun_today: true });
      } else {
        if (user.id) await db.updateProfile(user.id, { wheel_spun_today: true });
        setUser(u => ({ ...u, wheel_spun_today: true }));
      }
    }, 5000);
  };

  // Lighter wheel colors
  const wheelColors = [
    { bg: "#f4a59a" }, { bg: "#e8ddd0" }, { bg: "#f7c8a0" }, { bg: "#d4e8d0" },
    { bg: "#f4a59a" }, { bg: "#e8ddd0" }, { bg: "#f7c8a0" }, { bg: "#d4e8d0" },
  ];

  const sz = 240, cx = sz / 2, cy = sz / 2, r = sz / 2 - 8;
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
              <circle cx={cx} cy={cy} r="28" fill={C.white} stroke={C.orange} strokeWidth="2" />
              <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fill={C.green} fontSize="24" fontWeight="900" fontFamily="Gallica,serif">c</text>
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
        <div style={{ fontSize: "24px", fontFamily: font.display, color: C.text, marginBottom: "24px", marginTop: "4px", fontWeight: "700" }}>punkte sammeln</div>
        <div id="qr-reader" style={{ width: "240px", height: "240px", borderRadius: "16px", overflow: "hidden", background: "#111", border: `2px solid ${scanning ? C.orange : C.border}`, transition: "border 0.3s" }} />
        {!scanning ? <button onClick={startScan} style={{ marginTop: "18px", padding: "13px 36px", background: C.orange, border: "none", borderRadius: "50px", color: C.white, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui }}>📷 kamera starten</button>
          : <button onClick={async () => { if (scannerRef.current) try { await scannerRef.current.stop() } catch (e) { } setScanning(false) }} style={{ marginTop: "18px", padding: "13px 36px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "50px", color: C.textSub, fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: font.ui }}>abbrechen</button>}
        <div style={{ color: C.textLight, fontSize: "11px", marginTop: "12px" }}>scanne den qr-code auf deinem beleg</div>
      </>) : (
        <div style={{ textAlign: "center", animation: "scaleIn 0.4s" }}>
          <div style={{ fontSize: "48px" }}>🎉</div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: C.orange, fontFamily: font.display }}>+{pts} pts</div>
          <div style={{ color: C.textLight, fontSize: "13px", marginTop: "6px" }}>punkte gutgeschrieben!</div>
          <button onClick={() => { setDone(false); setPts(0) }} style={{ marginTop: "18px", padding: "11px 28px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "50px", color: C.text, fontSize: "13px", cursor: "pointer", fontFamily: font.ui }}>nochmal scannen</button>
        </div>
      )}
    </div>
  );
};

// ─── Vote ───────────────────────────────────────────────────────
const VoteTab = ({ user }) => {
  const [idx, setIdx] = useState(0); const [dir, setDir] = useState(null); const [dishes, setDishes] = useState([]); const [ts, setTs] = useState(null); const [off, setOff] = useState(0); const [loading, setLoading] = useState(true);
  useEffect(() => {
    const init = async () => {
      let allDishes = await db.getDishes();
      if (!allDishes.length) allDishes = MOCK_DISHES;
      // Load user's existing votes to filter out already voted dishes
      if (user.id) {
        const { data: myVotes } = await supabase.from("dish_votes").select("dish_id").eq("user_id", user.id);
        const votedIds = new Set((myVotes || []).map(v => v.dish_id));
        const unvoted = allDishes.filter(d => !votedIds.has(d.id));
        setDishes(allDishes); // keep all for results
        setIdx(allDishes.length - unvoted.length); // skip to first unvoted
        if (unvoted.length === 0) setIdx(allDishes.length); // all voted
      } else { setDishes(allDishes); }
      setLoading(false);
    };
    init();
  }, []);
  const swipe = async d => {
    Sound.vote();
    setDir(d);
    if (d === "right") {
      setDishes(p => p.map((x, i) => i === idx ? { ...x, votes: x.votes + 1 } : x));
      if (user.id) await supabase.from("dish_votes").upsert({ user_id: user.id, dish_id: dishes[idx].id, vote: true }).catch(() => { });
    } else {
      // Also record "skip" vote to prevent re-voting
      if (user.id) await supabase.from("dish_votes").upsert({ user_id: user.id, dish_id: dishes[idx].id, vote: false }).catch(() => { });
    }
    setTimeout(() => { setDir(null); setOff(0); setIdx(i => i + 1) }, 300);
  };
  const dish = dishes[idx];
  return (
    <div style={{ background: C.beige, paddingBottom: "16px", minHeight: "100%" }}>
      <div style={{ padding: "18px 20px 16px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: C.textLight }}>cinder</div>
        <div style={{ fontSize: "24px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>Nächste Pizza?</div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        {loading ? <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Lädt...</div> : dish ? (<>
          <div onTouchStart={e => setTs(e.touches[0].clientX)} onTouchMove={e => { if (ts !== null) setOff(e.touches[0].clientX - ts) }} onTouchEnd={() => { if (Math.abs(off) > 80) swipe(off > 0 ? "right" : "left"); else { setOff(0); setTs(null) } }}>
            <Card style={{ padding: 0, overflow: "hidden", maxWidth: "340px", margin: "0 auto", transform: dir === "left" ? "translateX(-120%) rotate(-15deg)" : dir === "right" ? "translateX(120%) rotate(15deg)" : `translateX(${off}px) rotate(${off * 0.04}deg)`, opacity: dir ? 0 : 1 - Math.abs(off) * 0.002, transition: dir ? "all 0.3s" : "none" }}>
              <div style={{ height: "170px", background: `linear-gradient(135deg, ${C.beigeDark}, ${C.beige})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", position: "relative" }}>
                {dish.image_url ? <img src={dish.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "48px", color: C.textLight }}>?</span>}
                <div style={{ position: "absolute", bottom: "8px", right: "10px", background: C.text, color: C.white, borderRadius: "12px", padding: "3px 9px", fontSize: "11px", fontWeight: "700" }}>{dish.votes} votes</div>
              </div>
              <div style={{ padding: "14px" }}><div style={{ fontSize: "18px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>{dish.name}</div><div style={{ fontSize: "12px", color: C.textLight, marginTop: "3px" }}>{dish.description}</div></div>
            </Card>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px" }}>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); swipe("left") }} style={{ width: "52px", height: "52px", borderRadius: "50%", background: C.white, border: `2px solid ${C.border}`, color: C.textSub, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); swipe("right") }} style={{ width: "52px", height: "52px", borderRadius: "50%", background: C.orange, border: "none", color: C.white, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(226,74,40,0.3)" }}>♥</button>
          </div>
          <div style={{ textAlign: "center", color: C.textLight, fontSize: "10px", marginTop: "8px" }}>← swipe oder buttons →</div>
        </>) : (
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <div style={{ fontSize: "36px" }}>🍕</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: C.text, marginTop: "8px" }}>alle gevotet!</div>
            <div style={{ marginTop: "16px" }}>
              {[...dishes].sort((a, b) => b.votes - a.votes).map((d, i) => (
                <Card key={d.id} style={{ marginBottom: "5px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: i === 0 ? C.orange : C.textLight, width: "18px" }}>#{i + 1}</div>
                  <div style={{ flex: 1, fontSize: "12px", fontWeight: "600" }}>{d.name}</div>
                  <div style={{ background: i === 0 ? C.orange : C.greyBg, color: i === 0 ? C.white : C.text, borderRadius: "8px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>♥ {d.votes}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
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
        <div style={{ fontSize: "12px", color: C.textLight, marginTop: "4px" }}>guthaben: <strong style={{ color: C.text }}>{user.pts || 0} pts</strong></div>
      </div>
      {rd && <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.3s" }}><div style={{ fontSize: "48px" }}>{rd.icon}</div><div style={{ color: C.white, fontSize: "18px", fontWeight: "700", marginTop: "10px" }}>eingelöst!</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginTop: "4px" }}>zeige dies an der kasse</div></div>}
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

// ─── Admin ──────────────────────────────────────────────────────
const AdminPanel = ({ onClose }) => {
  const [tab, setTab] = useState("users"); const [users, setUsers] = useState([]); const [missions, setMissions] = useState([]); const [dishes, setDishes] = useState([]);
  const [facts, setFacts] = useState([]); const [prizes, setPrizes] = useState([]); const [newFact, setNewFact] = useState(""); const [visitors, setVisitors] = useState([]);
  const [pushTitle, setPushTitle] = useState(""); const [pushBody, setPushBody] = useState(""); const [pushSent, setPushSent] = useState(false);
  const tabs = [{ id: "users", l: "user" }, { id: "points", l: "punkte" }, { id: "missions", l: "missionen" }, { id: "glow", l: "glow" }, { id: "dishes", l: "gerichte" }, { id: "facts", l: "fakten" }, { id: "prizes", l: "rad" }, { id: "visits", l: "heute" }, { id: "push", l: "push" }, { id: "abo", l: "abos" }];
  useEffect(() => {
    db.getAllProfiles().then(d => setUsers(d));
    db.getMissions().then(d => setMissions(d.length ? d : MOCK_MISSIONS));
    db.getDishes().then(d => setDishes(d.length ? d : MOCK_DISHES));
    db.getFunFacts().then(d => setFacts(d));
    db.getWheelPrizes().then(d => setPrizes(d));
    db.getTodayVisitors().then(d => setVisitors(d));
  }, []);
  const addPts = async (uid, amt) => { const u = users.find(x => x.id === uid); if (!u) return; await db.updateProfile(uid, { pts: (u.pts || 0) + amt }); setUsers(p => p.map(x => x.id === uid ? { ...x, pts: (x.pts || 0) + amt } : x)); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.beige, overflow: "auto", fontFamily: font.ui }}>
      <style>{defaultCSS}</style>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.beige, zIndex: 10 }}>
        <div><div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>admin panel</div><div style={{ fontSize: "10px", color: C.textLight }}>cereza pizza · frankfurt</div></div>
        <button onClick={onClose} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "6px 12px", color: C.text, cursor: "pointer", fontSize: "12px" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", overflowX: "auto", borderBottom: `1px solid ${C.greyBg}` }}>
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "6px 10px", borderRadius: "12px", border: "none", background: tab === t.id ? C.orange : "transparent", color: tab === t.id ? C.white : C.textLight, fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", fontFamily: font.ui }}>{t.l}</button>)}
      </div>
      <div style={{ padding: "10px" }}>
        {tab === "users" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
            {[{ v: users.length, l: "user" }, { v: users.filter(u => u.last_visit === new Date().toISOString().split('T')[0]).length, l: "heute" }, { v: users.length ? Math.round(users.filter(u => (u.total_visits || 0) > 1).length / users.length * 100) + "%" : "—", l: "retention" }].map((s, i) => <Card key={i} style={{ padding: "10px", textAlign: "center" }}><div style={{ fontSize: "17px", fontWeight: "800", color: C.orange }}>{s.v}</div><div style={{ fontSize: "9px", color: C.textLight }}>{s.l}</div></Card>)}
          </div>
          {users.map((u, i) => <Card key={i} style={{ marginBottom: "5px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "11px", fontWeight: "800" }}>{u.level || 1}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "700" }}>@{u.name}</div><div style={{ fontSize: "9px", color: C.textLight }}>{u.email} · {u.last_visit || "—"}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: "12px", fontWeight: "700", color: C.orange }}>{u.pts || 0}</div><div style={{ fontSize: "8px", color: C.textLight }}>{u.total_visits || 0} besuche</div></div>
            <button onClick={() => addPts(u.id, 100)} style={{ background: C.beige, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "4px 6px", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}>+100</button>
          </Card>)}
        </>)}
        {tab === "points" && ERAS.map((e, i) => <Card key={i} style={{ marginBottom: "5px", padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "26px", height: "26px", borderRadius: "50%", background: C.orange, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>{e.level}</div><div style={{ flex: 1 }}><div style={{ fontWeight: "700", fontSize: "13px" }}>{e.name}</div><div style={{ fontSize: "10px", color: C.textLight }}>{e.ptsNeeded} pts</div></div></Card>)}
        {tab === "missions" && missions.map(m => <Card key={m.id} style={{ marginBottom: "5px", padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "18px" }}>{m.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "700" }}>{m.title}</div><div style={{ fontSize: "9px", color: C.textLight }}>{m.description}</div></div><div style={{ color: C.orange, fontSize: "11px", fontWeight: "700" }}>+{m.pts_reward}</div></Card>)}
        {tab === "glow" && ["montag 12:00–14:00", "mittwoch 18:00–20:00", "freitag 12:00–14:00"].map((d, i) => <Card key={i} style={{ marginBottom: "5px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: "700", fontSize: "13px" }}>{d.split(" ")[0]}</div><div style={{ color: C.textLight, fontSize: "11px" }}>{d.split(" ")[1]}</div></div><span style={{ fontSize: "11px", color: C.orange, fontWeight: "700" }}>2x pts</span></Card>)}
        {tab === "dishes" && dishes.map(d => <Card key={d.id} style={{ marginBottom: "5px", padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "22px" }}>🍕</span><div style={{ flex: 1 }}><div style={{ fontWeight: "700", fontSize: "12px" }}>{d.name}</div><div style={{ fontSize: "9px", color: C.textLight }}>{d.description}</div></div><div style={{ background: C.orange, color: C.white, borderRadius: "8px", padding: "2px 7px", fontSize: "10px", fontWeight: "700" }}>♥ {d.votes}</div></Card>)}
        {tab === "facts" && (<>
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            <input value={newFact} onChange={e => setNewFact(e.target.value)} placeholder="Neuer Fun Fact..." style={{ flex: 1, padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "12px", outline: "none", boxSizing: "border-box", fontFamily: font.ui }} />
            <button onClick={async () => { if (!newFact) return; await db.addFunFact(newFact); setNewFact(""); db.getFunFacts().then(setFacts) }} style={{ padding: "10px 14px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>+</button>
          </div>
          {facts.map(f => <Card key={f.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, fontSize: "12px" }}>{f.text}</div>
            <button onClick={async () => { await db.deleteFunFact(f.id); db.getFunFacts().then(setFacts) }} style={{ background: C.greyBg, border: "none", borderRadius: "6px", padding: "4px 8px", fontSize: "10px", color: C.textLight, cursor: "pointer" }}>X</button>
          </Card>)}
        </>)}
        {tab === "prizes" && (<>
          <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "8px" }}>Glücksrad Preise bearbeiten</div>
          {prizes.map(p => <Card key={p.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: p.color }} />
            <div style={{ flex: 1, fontSize: "12px", fontWeight: "600" }}>{p.label}</div>
            <div style={{ fontSize: "11px", color: C.textLight }}>{p.value} pts</div>
          </Card>)}
        </>)}
        {tab === "visits" && (<>
          <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "8px" }}>Geplante Besuche heute ({visitors.length})</div>
          {visitors.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: C.textLight, fontSize: "12px" }}>Noch keine Anmeldungen</div>}
          {visitors.map(v => <Card key={v.id} style={{ marginBottom: "4px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, fontSize: "12px", fontWeight: "600" }}>@{v.profile?.name || "User"}</div>
            <div style={{ fontSize: "10px", color: C.green, fontWeight: "600" }}>Kommt heute</div>
          </Card>)}
        </>)}
        {tab === "push" && (<>
          <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Push Notification an alle User senden</div>
          <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Titel (z.B. Glow Hour startet!)" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", marginBottom: "6px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
          <input value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Nachricht (z.B. Doppelte Punkte bis 14 Uhr!)" style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "13px", marginBottom: "10px", outline: "none", boxSizing: "border-box", fontFamily: font.ui, background: C.card, color: C.text }} />
          <button onClick={async () => {
            if (!pushTitle) return;
            const count = await sendPushToAll(pushTitle, pushBody);
            await supabase.from("admin_notifications").insert({ title: pushTitle, body: pushBody, sent_to: "all" });
            setPushSent(true); setPushTitle(""); setPushBody("");
            setTimeout(() => setPushSent(false), 3000);
          }} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: font.ui }}>
            An alle senden
          </button>
          {pushSent && <div style={{ textAlign: "center", padding: "10px", color: C.green, fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>Gesendet!</div>}
          <div style={{ fontSize: "11px", color: C.textSub, marginTop: "16px", marginBottom: "8px" }}>Schnell-Nachrichten</div>
          {[
            { t: "Glow Hour startet!", b: "Doppelte Punkte für die nächsten 2 Stunden!" },
            { t: "Neue Missionen verfügbar", b: "Schau dir die Challenges dieser Woche an!" },
            { t: "Glücksrad wartet!", b: "Du hast heute noch nicht gedreht." },
            { t: "Neues Gericht zum Voten", b: "Swipe jetzt in Cinder!" },
          ].map((q, i) => (
            <button key={i} onClick={async () => { await sendPushToAll(q.t, q.b); await supabase.from("admin_notifications").insert({ title: q.t, body: q.b, sent_to: "all" }); setPushSent(true); setTimeout(() => setPushSent(false), 2000) }} style={{ width: "100%", padding: "10px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", marginBottom: "4px", textAlign: "left", cursor: "pointer", fontFamily: font.ui }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: C.text }}>{q.t}</div>
              <div style={{ fontSize: "10px", color: C.textLight }}>{q.b}</div>
            </button>
          ))}
        </>)}
        {tab === "abo" && <Card><div style={{ fontSize: "16px", fontFamily: font.display, color: C.green, marginBottom: "8px", fontWeight: "700" }}>matcha society</div>{[{ l: "preis", v: "29,99€/mo" }, { l: "members", v: "—" }, { l: "zahlung", v: "stripe + paypal" }].map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < 2 ? `1px solid ${C.greyBg}` : "none", fontSize: "12px" }}><span style={{ color: C.textLight }}>{r.l}</span><span style={{ fontWeight: "700" }}>{r.v}</span></div>)}</Card>}
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
    // Try restore session
    const restore = async () => {
      try {
        const { data: { session } } = await db.getSession();
        if (session?.user) {
          const p = await db.getProfile(session.user.id);
          if (p) { setUser(p); }
          else {
            // Profile missing but session exists - create fallback profile from session
            console.warn('Session exists but profile missing, using session data');
            setUser({ id: session.user.id, name: session.user.user_metadata?.name || session.user.email?.split('@')[0], email: session.user.email, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
          }
        }
      } catch (e) { console.error('Session restore error:', e); }
      setLoading(false);
    };
    restore();

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); }
    });
    return () => subscription?.unsubscribe();
  }, []);
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

  const nav = [{ id: "home", icon: "⌂", l: "home" }, { id: "missions", icon: "◎", l: "missions" }, { id: "scan", icon: "⊞", l: "scan" }, { id: "cinder", icon: "♡", l: "cinder" }, { id: "profile", icon: "○", l: "profil" }];

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto", fontFamily: font.ui, background: t.bg, display: "flex", flexDirection: "column", overflow: "hidden", transition: "background 0.3s" }}>
      <style>{CSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}
      {toast && <div style={{ position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)", background: t.card, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "12px 18px", zIndex: 9998, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", maxWidth: "340px", width: "90%", animation: "fadeUp 0.3s", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
        <div><div style={{ fontSize: "13px", fontWeight: "700", color: t.text }}>{toast.title}</div>{toast.body && <div style={{ fontSize: "11px", color: t.textLight, marginTop: "2px" }}>{toast.body}</div>}</div>
      </div>}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {tab === "home" && <HomeTab user={user} setUser={setUser} setTab={setTab} />}
        {tab === "missions" && <WheelTab user={user} setUser={setUser} />}
        {tab === "scan" && <ScanTab user={user} setUser={setUser} />}
        {tab === "cinder" && <VoteTab user={user} />}
        {tab === "profile" && <ProfileTab user={user} setUser={setUser} onLogout={async () => { await db.signOut(); setUser(null) }} theme={theme} />}
      </div>
      {/* Tab Bar */}
      <div style={{ flexShrink: 0, background: t.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: `0.5px solid ${t.navBorder}`, paddingBottom: "env(safe-area-inset-bottom, 8px)", transition: "all 0.3s" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", alignItems: "end", padding: "8px 0 3px", maxWidth: "400px", margin: "0 auto" }}>
          {nav.map(n => {
            const a = tab === n.id;
            return <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
              <div style={{ fontSize: "20px", lineHeight: "1", opacity: a ? 1 : 0.3, transition: "all 0.2s", color: a ? t.accent : t.textLight, fontWeight: a ? "700" : "400" }}>{n.icon}</div>
              <span style={{ fontSize: "9px", fontWeight: a ? "700" : "400", color: a ? t.accent : t.textLight, transition: "all 0.2s", letterSpacing: "0.3px" }}>{n.l}</span>
            </button>;
          })}
        </div>
      </div>
    </div>
  );
}
