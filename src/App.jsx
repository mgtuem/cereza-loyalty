import { useState, useEffect, useRef } from "react";
import supabase, { db } from "./supabase";
import { requestPushPermission, onForegroundMessage, sendPushToAll } from "./push";

// ─── Themes ────────────────────────────────────────────────────
const themes = {
  light: {
    bg: "#C1272D", surface: "#f0e8d8", surfaceAlt: "#e8dcc8", card: "#ffffff",
    accent: "#e24a28", green: "#2d472a", text: "#111111", textSub: "#555555",
    textLight: "#999999", white: "#ffffff", border: "#e8e8e8", greyBg: "#f5f5f5",
    navBg: "rgba(255,255,255,0.96)", navBorder: "rgba(0,0,0,0.08)",
    authBg: "#C1272D", logoColor: "#ffffff",
  },
  dark: {
    bg: "#0a0a0a", surface: "#1a1a1a", surfaceAlt: "#222222", card: "#1e1e1e",
    accent: "#e24a28", green: "#4CAF50", text: "#f0f0f0", textSub: "#aaaaaa",
    textLight: "#666666", white: "#ffffff", border: "#2a2a2a", greyBg: "#252525",
    navBg: "rgba(18,18,18,0.97)", navBorder: "rgba(255,255,255,0.06)",
    authBg: "#0a0a0a", logoColor: "#e24a28",
  },
  glowRosa: {
    bg: "#f8e8ee", surface: "#fdf2f6", surfaceAlt: "#f9dce6", card: "#ffffff",
    accent: "#d4618c", green: "#2d472a", text: "#3a1a2a", textSub: "#6a4a5a",
    textLight: "#b090a8", white: "#ffffff", border: "#f0d0e0", greyBg: "#fef6f9",
    navBg: "rgba(255,245,250,0.97)", navBorder: "rgba(200,150,170,0.12)",
    authBg: "#f8e8ee", logoColor: "#d4618c",
  },
  glowGruen: {
    bg: "#e8f5e9", surface: "#f1f8f2", surfaceAlt: "#dcedc8", card: "#ffffff",
    accent: "#4CAF50", green: "#2E7D32", text: "#1a3a1a", textSub: "#4a6a4a",
    textLight: "#88a888", white: "#ffffff", border: "#c8e6c9", greyBg: "#f6faf6",
    navBg: "rgba(245,255,245,0.97)", navBorder: "rgba(150,200,150,0.12)",
    authBg: "#e8f5e9", logoColor: "#2E7D32",
  },
};

const useTheme = () => {
  const [mode, setModeRaw] = useState(() => localStorage.getItem("cereza-theme") || "light");
  const [glowColor, setGlowColorRaw] = useState(() => localStorage.getItem("cereza-glow") || "rosa");
  const [isGlowHour, setIsGlowHour] = useState(false);

  const setMode = (m) => { setModeRaw(m); localStorage.setItem("cereza-theme", m); };
  const setGlowColor = (g) => { setGlowColorRaw(g); localStorage.setItem("cereza-glow", g); };

  useEffect(() => {
    const check = async () => {
      try { const g = await db.isGlowHourNow(); setIsGlowHour(g); } catch (e) { }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeTheme = isGlowHour ? (glowColor === "rosa" ? "glowRosa" : "glowGruen") : mode;
  const t = themes[activeTheme] || themes.light;
  return { t, mode, setMode, glowColor, setGlowColor, isGlowHour };
};

// ─── Global color alias (mutated by applyTheme) ─────────────────
let C = { ...themes.light, beige: themes.light.surface, beigeDark: themes.light.surfaceAlt, orange: themes.light.accent, cream: themes.light.card };
const font = { ui: "'Inter',-apple-system,'SF Pro Display',sans-serif", display: "'Playfair Display',Georgia,serif" };

const applyTheme = (t) => {
  C.bg = t.bg; C.beige = t.surface; C.beigeDark = t.surfaceAlt; C.card = t.card;
  C.orange = t.accent; C.green = t.green; C.text = t.text; C.textSub = t.textSub;
  C.textLight = t.textLight; C.white = t.white; C.border = t.border; C.greyBg = t.greyBg; C.cream = t.card;
};

// ─── Static data ────────────────────────────────────────────────
const ERAS = [
  { level: 1, name: "Newbie", ptsNeeded: 0 },
  { level: 2, name: "Regular", ptsNeeded: 500 },
  { level: 3, name: "Muse", ptsNeeded: 1200 },
  { level: 4, name: "Insider", ptsNeeded: 2500 },
  { level: 5, name: "Icon", ptsNeeded: 5000 },
];
const MOCK_MISSIONS = [
  { id: 1, title: "Morning Muse", description: "Besuche uns vor 12 Uhr", progress: 1, goal: 2, pts_reward: 150, icon: "☀" },
  { id: 2, title: "Spicy Lover", description: "Bestelle Pizza mit Chili Oil", progress: 0, goal: 1, pts_reward: 100, icon: "✦" },
  { id: 3, title: "Matcha Ritual", description: "3x Matcha diese Woche", progress: 2, goal: 3, pts_reward: 120, icon: "◈" },
  { id: 4, title: "Social Star", description: "Teile deinen Status auf Instagram", progress: 0, goal: 1, pts_reward: 75, icon: "★" },
];
const MOCK_SHOP = [
  { id: 1, name: "Gratis Espresso", cost: 300, min_level: 1, icon: "◎" },
  { id: 2, name: "Gratis Matcha", cost: 600, min_level: 2, icon: "◈" },
  { id: 3, name: "Gratis Margherita", cost: 1000, min_level: 3, icon: "◉" },
  { id: 4, name: "Chef's Table Dinner", cost: 2500, min_level: 4, icon: "✦" },
  { id: 5, name: "Cereza Merch Pack", cost: 1500, min_level: 3, icon: "▲" },
  { id: 6, name: "Benenne eine Pizza", cost: 5000, min_level: 5, icon: "★" },
];
const MOCK_DISHES = [
  { id: 1, name: "Truffle Margherita", description: "Trüffelcreme · Fior di Latte · Frischer Trüffel", votes: 142 },
  { id: 2, name: "Matcha Tiramisu", description: "Matcha-Mascarpone · Espresso-Sauerteigboden", votes: 89 },
  { id: 3, name: "Pistachio Dream", description: "Pistaziencreme · Mortadella · Stracciatella", votes: 234 },
  { id: 4, name: "Mango Tango", description: "Mango-Habanero · Gambas · Limettenzeste", votes: 67 },
];
const MOCK_LB = [
  { rank: 1, name: "Sophia", pts: 3200 }, { rank: 2, name: "Luca", pts: 2800 }, { rank: 3, name: "Marco", pts: 1450 },
  { rank: 4, name: "Elena", pts: 1100 }, { rank: 5, name: "Tom", pts: 900 },
];
const FUN_FACTS = [
  "Unsere Chili No. 2 reift 40 Tage im Fass.",
  "Der Teig ruht 72 Stunden für maximalen Crunch.",
  "Cereza bedeutet Kirsche auf Spanisch.",
  "Wir nutzen nur Fior di Latte aus Kampanien.",
  "Unser Ofen erreicht 485°C in 12 Minuten.",
];
const WHEEL_PRIZES_DEFAULT = [
  { id: 1, label: "50 XP", value: 50, color: "#fde8e8" },
  { id: 2, label: "Nichts", value: 0, color: "#f5f5f5" },
  { id: 3, label: "100 XP", value: 100, color: "#e8f5e9" },
  { id: 4, label: "25 XP", value: 25, color: "#fef3e2" },
  { id: 5, label: "2× XP", value: -1, color: "#e8eaf6" },
  { id: 6, label: "Nichts", value: 0, color: "#f5f5f5" },
  { id: 7, label: "200 XP", value: 200, color: "#fce4ec" },
  { id: 8, label: "75 XP", value: 75, color: "#e0f7fa" },
];
const WHEEL_TEXT_COLORS = ["#c0392b", "#999999", "#27ae60", "#d35400", "#3949ab", "#999999", "#c2185b", "#00838f"];

// ─── CSS ────────────────────────────────────────────────────────
const getCSS = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body,#root{height:100%;width:100%;overflow:hidden;position:fixed;inset:0;background:${t.bg};overscroll-behavior:none;user-select:none;-webkit-user-select:none;transition:background 0.4s;-webkit-font-smoothing:antialiased;font-family:'Inter',-apple-system,sans-serif}
  input,textarea,select{user-select:text;-webkit-user-select:text;font-family:inherit}
  input::placeholder,textarea::placeholder{color:${t.textLight}}
  ::-webkit-scrollbar{display:none}
  button{-webkit-appearance:none;appearance:none;font-family:inherit;cursor:pointer}
  button:active{transform:scale(0.96);transition:transform 0.1s}
  a{color:inherit;text-decoration:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(0.75);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0}}
`;
const defaultCSS = getCSS(themes.light);

// ─── Sound ──────────────────────────────────────────────────────
const Sound = {
  _ctx: null,
  ctx() { if (!this._ctx) try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } return this._ctx; },
  play(freq, dur, type = "sine", vol = 0.1, delay = 0) {
    try {
      const c = this.ctx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur);
    } catch (e) { }
  },
  tap() { this.play(900, 0.06, "sine", 0.05); },
  scan() { [660, 880, 1100].forEach((f, i) => this.play(f, 0.1, "sine", 0.08, i * 0.08)); },
  spin() { for (let i = 0; i < 5; i++) this.play(300 + i * 60, 0.06, "triangle", 0.05, i * 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.play(f, 0.2, "sine", 0.1, i * 0.1)); },
  lose() { this.play(300, 0.3, "sawtooth", 0.08); },
  levelUp() { [392, 523, 659, 784, 1047].forEach((f, i) => this.play(f, 0.2, "sine", 0.09, i * 0.09)); },
  redeem() { [440, 554, 659].forEach((f, i) => this.play(f, 0.15, "sine", 0.1, i * 0.1)); },
  vote() { this.play(440, 0.08); this.play(660, 0.1, "sine", 0.07, 0.08); },
  gift() { [523, 659, 784, 1047].forEach((f, i) => this.play(f, 0.12, "sine", 0.08, i * 0.07)); },
  error() { this.play(200, 0.15, "sawtooth", 0.1); },
};

// ─── Card Component ─────────────────────────────────────────────
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: C.card, borderRadius: "16px", padding: "16px",
    border: `1px solid ${C.border}`, color: C.text, ...style
  }}>{children}</div>
);

// ─── Icons (SVG) ────────────────────────────────────────────────
const Icon = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  target: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  qr: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" /><rect x="19" y="14" width="2" height="2" /><rect x="14" y="19" width="2" height="2" /><rect x="18" y="18" width="3" height="3" /></svg>,
  heart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  heartFill: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>,
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  gift: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  crown: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M2 20h20v2H2v-2zm2-3l2-8 4 5 2-10 2 10 4-5 2 8H4z" /></svg>,
  camera: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
};

// ─── Level Up Overlay ───────────────────────────────────────────
const LevelUpOverlay = ({ level, onClose }) => {
  const era = ERAS[level - 1] || ERAS[0];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s" }}>
      <style>{defaultCSS}</style>
      {[...Array(16)].map((_, i) => (
        <div key={i} style={{ position: "absolute", width: "8px", height: "8px", background: ["#e24a28", "#f0e8d8", "#FFD700", "#ff8080"][i % 4], borderRadius: i % 2 ? "50%" : "2px", left: `${Math.random() * 100}%`, top: "-10px", animation: `confetti ${1 + Math.random() * 2}s ease-in forwards`, animationDelay: `${Math.random() * 0.5}s` }} />
      ))}
      <div style={{ color: "#FFD700", animation: "scaleIn 0.6s ease 0.2s both" }}>{Icon.crown}</div>
      <div style={{ fontSize: "42px", fontFamily: font.display, color: "#ffffff", marginTop: "12px", fontWeight: "700", animation: "scaleIn 0.6s ease 0.4s both" }}>Level Up!</div>
      <div style={{ fontSize: "11px", letterSpacing: "4px", color: "rgba(255,255,255,0.5)", marginTop: "12px", animation: "fadeUp 0.5s ease 0.6s both" }}>NEUER STATUS FREIGESCHALTET</div>
      <div style={{ fontSize: "30px", fontFamily: font.display, color: "#ffffff", marginTop: "6px", animation: "fadeUp 0.5s ease 0.7s both" }}>{era.name}</div>
      <button onClick={onClose} style={{ marginTop: "36px", padding: "14px 48px", background: "#e24a28", border: "none", borderRadius: "50px", color: "#ffffff", fontSize: "15px", fontWeight: "700", animation: "fadeUp 0.5s ease 0.9s both" }}>
        Feiern
      </button>
    </div>
  );
};

// ─── Auth ───────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email || !pw) { setErr("Bitte alle Felder ausfüllen."); return; }
    if (!isLogin && !username) { setErr("Bitte Username eingeben."); return; }
    if (!isLogin && !dsgvo) { setErr("Bitte Datenschutz akzeptieren."); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await db.signIn(email, pw);
        if (error) { setErr("Falsche E-Mail oder Passwort."); setLoading(false); return; }
        // FIX: Retry für Race-Condition
        let profile = null;
        for (let i = 0; i < 5; i++) {
          profile = await db.getProfile(data.user.id);
          if (profile) break;
          await new Promise(r => setTimeout(r, 600 * (i + 1)));
        }
        onLogin(profile || { id: data.user.id, name: data.user.user_metadata?.name || email.split('@')[0], email, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
      } else {
        const { data, error } = await db.signUp(email, pw, username);
        if (error) { setErr(error.message); setLoading(false); return; }
        if (data.user) {
          await new Promise(r => setTimeout(r, 2000));
          await db.updateProfile(data.user.id, { name: username, phone }).catch(() => { });
          let profile = null;
          for (let i = 0; i < 4; i++) {
            profile = await db.getProfile(data.user.id);
            if (profile) break;
            await new Promise(r => setTimeout(r, 700));
          }
          onLogin(profile || { id: data.user.id, name: username, email, phone, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
        }
      }
    } catch (e) { setErr("Verbindungsfehler: " + e.message); }
    setLoading(false);
  };

  const inp = (ph, val, set, type = "text") => (
    <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
      style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "14px", color: "#ffffff", fontSize: "15px", outline: "none", marginBottom: "10px", boxSizing: "border-box" }} />
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", background: "#C1272D" }}>
      <style>{defaultCSS}</style>
      <div style={{ animation: "fadeUp 0.6s ease", marginBottom: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "52px", fontFamily: font.display, color: "#ffffff", fontWeight: "700", letterSpacing: "1px" }}>cereza</div>
        <div style={{ fontSize: "11px", letterSpacing: "5px", color: "rgba(255,255,255,0.5)", marginTop: "6px" }}>LOYALTY CLUB</div>
      </div>
      <div style={{ width: "100%", maxWidth: "340px", animation: "fadeUp 0.6s ease 0.1s both" }}>
        {!isLogin && inp("Username", username, setUsername)}
        {inp("E-Mail", email, setEmail, "email")}
        {inp("Passwort (min. 6 Zeichen)", pw, setPw, "password")}
        {!isLogin && inp("Handynummer", phone, setPhone, "tel")}
        {!isLogin && (
          <div onClick={() => setDsgvo(!dsgvo)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "14px", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: "12px", lineHeight: 1.5 }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, marginTop: "2px", border: `2px solid ${dsgvo ? "#ffffff" : "rgba(255,255,255,0.4)"}`, background: dsgvo ? "#ffffff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {dsgvo && <div style={{ width: "10px", height: "10px", background: "#e24a28", borderRadius: "2px" }} />}
            </div>
            Ich akzeptiere die Datenschutzerklärung
          </div>
        )}
        {err && <div style={{ color: "#ffcccc", fontSize: "13px", marginBottom: "10px", textAlign: "center" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "15px", background: "rgba(255,255,255,0.95)", border: "none", borderRadius: "14px", color: "#C1272D", fontSize: "16px", fontWeight: "700", opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : isLogin ? "Einloggen" : "Registrieren"}
        </button>
        <p style={{ textAlign: "center", marginTop: "20px", color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
          {isLogin ? "Noch kein Mitglied? " : "Schon dabei? "}
          <span onClick={() => { setIsLogin(!isLogin); setErr(""); }} style={{ color: "rgba(255,255,255,0.9)", cursor: "pointer", textDecoration: "underline" }}>
            {isLogin ? "Jetzt beitreten" : "Einloggen"}
          </span>
        </p>
      </div>
    </div>
  );
};

// ─── Home Tab ───────────────────────────────────────────────────
const HomeTab = ({ user, setUser, setTab }) => {
  const era = ERAS.find(e => e.level === (user.level || 1)) || ERAS[0];
  const next = ERAS.find(e => e.level === (user.level || 1) + 1);
  const pct = next ? Math.min(100, Math.round(((user.pts - era.ptsNeeded) / (next.ptsNeeded - era.ptsNeeded)) * 100)) : 100;
  const [fi, setFi] = useState(0);
  const [lb, setLb] = useState(MOCK_LB);
  const [missions, setMissions] = useState(MOCK_MISSIONS);
  const [facts, setFacts] = useState(FUN_FACTS);
  const [visitStatus, setVisitStatus] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setFi(i => (i + 1) % facts.length), 5000);
    return () => clearInterval(interval);
  }, [facts]);

  useEffect(() => {
    db.getLeaderboard().then(d => { if (d.length) setLb(d); });
    db.getMissions().then(d => { if (d.length) setMissions(d); });
    db.getFunFacts().then(d => { if (d.length) setFacts(d.map(f => f.text)); });
    if (user.id) {
      const today = new Date().toISOString().split('T')[0];
      db.getVisitIntention(user.id, today).then(d => { if (d) setVisitStatus(d.status); }).catch(() => { });
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
    <div style={{ background: C.beige, paddingBottom: "24px", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, fontWeight: "600" }}>WILLKOMMEN ZURÜCK</div>
        <div style={{ fontSize: "26px", fontFamily: font.display, color: C.text, fontWeight: "700", marginTop: "2px" }}>@{user.name || "user"}</div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Status Card */}
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: C.textLight, marginBottom: "4px" }}>DEIN STATUS</div>
              <div style={{ fontSize: "28px", fontFamily: font.display, color: C.orange, fontWeight: "700", lineHeight: 1 }}>{era.name}</div>
              <div style={{ fontSize: "12px", color: C.textLight, marginTop: "6px" }}>
                {next ? `${next.name} in ${next.ptsNeeded - (user.pts || 0)} XP` : "Max Level erreicht"}
              </div>
            </div>
            <div style={{ position: "relative", width: "52px", height: "52px" }}>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="22" fill="none" stroke={C.border} strokeWidth="4" />
                <circle cx="26" cy="26" r="22" fill="none" stroke={C.orange} strokeWidth="4"
                  strokeDasharray={`${pct * 1.38} 138`} strokeLinecap="round" transform="rotate(-90 26 26)" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: C.text }}>{pct}%</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "14px" }}>
            {[{ v: user.pts || 0, l: "XP" }, { v: user.total_visits || 0, l: "Besuche" }, { v: user.streak || 0, l: "Streak" }].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "10px", background: C.greyBg, borderRadius: "12px" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: C.text }}>{s.v}</div>
                <div style={{ fontSize: "10px", color: C.textLight, marginTop: "2px" }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Treat Tracker */}
          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: C.textSub }}>Treat Tracker</div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.orange }}>{user.treat_count || 0}/{user.treat_goal || 8}</div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[...Array(user.treat_goal || 8)].map((_, i) => (
                <div key={i} style={{ flex: 1, height: "6px", borderRadius: "3px", background: i < (user.treat_count || 0) ? C.orange : C.greyBg, transition: "all 0.3s" }} />
              ))}
            </div>
          </div>

          <button onClick={() => setTab("scan")} style={{ width: "100%", marginTop: "14px", padding: "13px", background: C.text, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {Icon.qr} Punkte scannen
          </button>
        </Card>

        {/* Heute kommen? */}
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, marginBottom: "10px" }}>Kommst du heute vorbei?</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[{ v: "planned", l: "Ja, heute" }, { v: "not", l: "Nicht heute" }].map(opt => (
              <button key={opt.v} onClick={() => setVisit(opt.v)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: visitStatus === opt.v ? C.orange : C.greyBg, color: visitStatus === opt.v ? C.white : C.textLight, fontSize: "13px", fontWeight: "600", transition: "all 0.2s" }}>
                {opt.l}
              </button>
            ))}
          </div>
        </Card>

        {/* Fun Fact */}
        <Card style={{ marginBottom: "12px", background: C.orange, border: "none" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.7)", marginBottom: "6px" }}>FUN FACT</div>
          <div style={{ fontSize: "14px", color: "#ffffff", lineHeight: 1.5, fontWeight: "500" }}>{facts[fi]}</div>
        </Card>

        {/* Missions */}
        <div style={{ fontSize: "13px", fontWeight: "700", color: C.textSub, marginBottom: "8px", letterSpacing: "0.5px" }}>Aktive Missionen</div>
        {missions.slice(0, 3).map((m, i) => (
          <Card key={m.id || i} style={{ marginBottom: "8px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>{m.title}</div>
                <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>{m.description}</div>
                <div style={{ height: "4px", background: C.greyBg, borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, ((m.progress || 0) / m.goal) * 100)}%`, background: C.green, borderRadius: "2px" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.orange }}>+{m.pts_reward}</div>
                <div style={{ fontSize: "10px", color: C.textLight }}>{m.progress || 0}/{m.goal}</div>
              </div>
            </div>
          </Card>
        ))}

        {/* Leaderboard */}
        <Card style={{ marginTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>Bestenliste</div>
            <div style={{ fontSize: "10px", fontWeight: "700", color: C.orange, background: "rgba(226,74,40,0.1)", padding: "3px 8px", borderRadius: "6px" }}>Live</div>
          </div>
          {lb.slice(0, 5).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.greyBg}` : "none" }}>
              <div style={{ width: "22px", fontSize: "14px", fontWeight: "800", color: i < 3 ? C.orange : C.textLight, textAlign: "center" }}>
                {i === 0 ? "▲" : i === 1 ? "▲" : i === 2 ? "▲" : p.rank || i + 1}
              </div>
              <div style={{ flex: 1, fontSize: "14px", fontWeight: p.name === user.name ? "700" : "500", color: C.text }}>
                {p.name} {p.name === user.name && <span style={{ fontSize: "10px", color: C.orange }}>(Du)</span>}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: C.green }}>{p.pts} XP</div>
            </div>
          ))}
        </Card>

        {/* Matcha Abo */}
        {!user.is_abo_member && (
          <Card style={{ marginTop: "12px", background: "#2d472a", border: "none" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.6)", marginBottom: "4px" }}>EXKLUSIV</div>
            <div style={{ fontSize: "18px", fontFamily: font.display, color: "#ffffff", fontWeight: "700" }}>Matcha Society</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>29,99 €/Monat · Unbegrenzte Vorteile</div>
            <button onClick={() => { const url = import.meta.env.VITE_MATCHA_ABO_URL; if (url) window.open(url, "_blank"); }} style={{ marginTop: "12px", padding: "11px 24px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: "600" }}>
              Mitglied werden
            </button>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Missions + Wheel Tab ───────────────────────────────────────
const WheelTab = ({ user, setUser }) => {
  const [spinning, setSpinning] = useState(false);
  const [rot, setRot] = useState(0);
  const [result, setResult] = useState(null);
  const [spins, setSpins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState(MOCK_MISSIONS);
  const [prizes, setPrizes] = useState(WHEEL_PRIZES_DEFAULT);
  const maxFreeSpins = 1;
  const maxPaidSpins = 2;

  useEffect(() => {
    const init = async () => {
      if (user.id) {
        const fresh = await db.getProfile(user.id);
        if (fresh) {
          setUser(u => ({ ...u, ...fresh }));
          const today = new Date().toISOString().split('T')[0];
          const lastSpin = fresh.last_spin_date;
          if (lastSpin === today) {
            setSpins(fresh.wheel_spun_today ? 2 : 1);
          } else {
            setSpins(0);
          }
        }
      }
      const dbPrizes = await db.getWheelPrizes();
      if (dbPrizes.length) setPrizes(dbPrizes);
      const dbMissions = await db.getMissions();
      if (dbMissions.length) setMissions(dbMissions);
      setLoading(false);
    };
    init();

    // Realtime prizes
    if (!user.id) return;
    const ch = supabase.channel('wheel-prizes').on('postgres_changes', { event: '*', schema: 'public', table: 'wheel_prizes' }, async () => {
      const p = await db.getWheelPrizes(); if (p.length) setPrizes(p);
    }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const canSpin = spins < maxPaidSpins;
  const needsPay = spins >= maxFreeSpins;

  const spin = async () => {
    if (spinning || !canSpin) return;
    const today = new Date().toISOString().split('T')[0];

    // DB-Check: verhindert Spin nach Reload
    if (user.id) {
      const fresh = await db.getProfile(user.id);
      if (fresh && fresh.last_spin_date === today) {
        const todaySpins = fresh.wheel_spun_today ? 2 : 1;
        if (todaySpins >= maxPaidSpins) { setSpins(2); return; }
        setSpins(todaySpins);
      }
    }

    if (needsPay) {
      const fresh = user.id ? await db.getProfile(user.id) : null;
      const currentPts = fresh ? fresh.pts : (user.pts || 0);
      if (currentPts < 100) return;
      const np = currentPts - 100;
      setUser(u => ({ ...u, pts: np }));
      if (user.id) await db.updateProfile(user.id, { pts: np });
    }

    setSpinning(true); setResult(null); Sound.spin();
    const idx = Math.floor(Math.random() * prizes.length);
    const seg = 360 / prizes.length;
    setRot(r => r + 360 * 7 + (360 - idx * seg - seg / 2));

    setTimeout(async () => {
      setSpinning(false);
      setSpins(s => s + 1);
      const prize = prizes[idx];
      setResult(prize);
      prize.value > 0 ? Sound.win() : Sound.lose();

      const fresh = user.id ? await db.getProfile(user.id) : null;
      const currentPts = fresh ? fresh.pts : (user.pts || 0);
      const updates = { wheel_spun_today: true, last_spin_date: today };
      if (prize.value > 0) {
        updates.pts = currentPts + prize.value;
        setUser(u => ({ ...u, pts: updates.pts, wheel_spun_today: true }));
      } else {
        setUser(u => ({ ...u, wheel_spun_today: true }));
      }
      if (user.id) await db.updateProfile(user.id, updates);
    }, 5200);
  };

  const sz = 280, cx = sz / 2, cy = sz / 2, r = sz / 2 - 12;

  return (
    <div style={{ background: C.beige, paddingBottom: "24px", minHeight: "100%" }}>
      <div style={{ padding: "20px 20px 14px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, fontWeight: "600" }}>TÄGLICH</div>
        <div style={{ fontSize: "26px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>Missionen</div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Missionen */}
        {missions.map((m, i) => (
          <Card key={m.id || i} style={{ marginBottom: "8px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.text }}>{m.title}</div>
                <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>{m.description}</div>
                {m.goal > 1 && (
                  <div style={{ height: "3px", background: C.greyBg, borderRadius: "2px", marginTop: "8px" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, ((m.progress || 0) / m.goal) * 100)}%`, background: C.green, borderRadius: "2px" }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: (m.progress || 0) >= m.goal ? C.green : C.orange, flexShrink: 0 }}>
                {(m.progress || 0) >= m.goal ? "✓" : `+${m.pts_reward}`}
              </div>
            </div>
          </Card>
        ))}

        {/* Glücksrad */}
        <Card style={{ marginTop: "8px", padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: C.textLight, marginBottom: "4px" }}>TÄGLICH</div>
          <div style={{ fontSize: "20px", fontFamily: font.display, color: C.text, fontWeight: "700", marginBottom: "16px" }}>Glücksrad</div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              {/* Pointer */}
              <div style={{ position: "absolute", top: "-2px", left: "50%", transform: "translateX(-50%)", zIndex: 3, width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `16px solid ${C.orange}` }} />
              {/* Glow ring */}
              <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", border: `3px solid ${C.border}`, boxShadow: spinning ? "0 0 24px rgba(226,74,40,0.25)" : "none", transition: "box-shadow 0.5s" }} />

              <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 5.2s cubic-bezier(0.12,0.6,0.12,1)" : "none", display: "block" }}>
                {prizes.map((p, i) => {
                  const seg = 360 / prizes.length;
                  const s = (i * seg - 90) * Math.PI / 180;
                  const e = ((i + 1) * seg - 90) * Math.PI / 180;
                  const mid = (s + e) / 2;
                  return (
                    <g key={i}>
                      <path d={`M${cx},${cy} L${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A${r},${r} 0 0,1 ${cx + r * Math.cos(e)},${cy + r * Math.sin(e)} Z`}
                        fill={p.color || WHEEL_PRIZES_DEFAULT[i % WHEEL_PRIZES_DEFAULT.length]?.color || "#f5f5f5"}
                        stroke="#ffffff" strokeWidth="2" />
                      <text
                        x={cx + (r * 0.65) * Math.cos(mid)} y={cy + (r * 0.65) * Math.sin(mid)}
                        transform={`rotate(${i * seg + seg / 2},${cx + (r * 0.65) * Math.cos(mid)},${cy + (r * 0.65) * Math.sin(mid)})`}
                        textAnchor="middle" dominantBaseline="middle"
                        fill={WHEEL_TEXT_COLORS[i % WHEEL_TEXT_COLORS.length]}
                        fontSize="11" fontWeight="700" fontFamily={font.ui}>{p.label}</text>
                    </g>
                  );
                })}
                <circle cx={cx} cy={cy} r="32" fill="white" stroke={C.orange} strokeWidth="2.5"
                  style={{ filter: "drop-shadow(0 2px 8px rgba(226,74,40,0.3))" }} />
                <text x={cx} y={cy + 11} textAnchor="middle" dominantBaseline="middle"
                  fill={C.orange} fontSize="30" fontWeight="900" fontFamily="Playfair Display,serif">c</text>
              </svg>
            </div>

            <button onClick={spin} disabled={spinning || !canSpin || (needsPay && (user.pts || 0) < 100)}
              style={{ marginTop: "16px", padding: "13px 44px", border: "none", borderRadius: "50px", fontSize: "14px", fontWeight: "700", background: !canSpin ? C.greyBg : C.orange, color: !canSpin ? C.textLight : C.white, cursor: !canSpin ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
              {!canSpin ? "Fertig für heute" : spinning ? "Dreht..." : needsPay ? "Nochmal (100 XP)" : "Drehen"}
            </button>
            <div style={{ fontSize: "11px", color: C.textLight, marginTop: "6px" }}>{spins}/{maxPaidSpins} Spins heute</div>

            {result && (
              <Card style={{ marginTop: "12px", padding: "14px", textAlign: "center", animation: "scaleIn 0.4s", maxWidth: "200px" }}>
                <div style={{ fontSize: "14px", fontWeight: "800", color: result.value > 0 ? C.orange : C.text }}>
                  {result.value > 0 ? `+${result.value} XP!` : result.value === -1 ? "2× XP heute!" : "Kein Glück"}
                </div>
              </Card>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Scan Tab ───────────────────────────────────────────────────
const ScanTab = ({ user, setUser }) => {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [pts, setPts] = useState(0);
  const scannerRef = useRef(null);

  const awardPts = async (p) => {
    setPts(p); Sound.scan();
    const fresh = user.id ? await db.getProfile(user.id) : null;
    const currentPts = fresh ? (fresh.pts || 0) : (user.pts || 0);
    const currentVisits = fresh ? (fresh.total_visits || 0) : (user.total_visits || 0);
    const currentTreat = fresh ? (fresh.treat_count || 0) : (user.treat_count || 0);
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
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 200, height: 200 } },
        async () => { await scanner.stop(); setScanning(false); await awardPts(Math.floor(Math.random() * 100) + 50); },
        () => { }
      );
    } catch (e) {
      setScanning(false);
      await awardPts(Math.floor(Math.random() * 100) + 50);
    }
  };

  useEffect(() => () => { if (scannerRef.current) try { scannerRef.current.stop(); } catch (e) { } }, []);

  return (
    <div style={{ background: C.beige, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", minHeight: "100%" }}>
      {!done ? (
        <>
          <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, fontWeight: "600", marginBottom: "6px" }}>QR CODE</div>
          <div style={{ fontSize: "26px", fontFamily: font.display, color: C.text, fontWeight: "700", marginBottom: "28px" }}>Punkte sammeln</div>
          <div id="qr-reader" style={{ width: "240px", height: "240px", borderRadius: "20px", overflow: "hidden", background: "#111", border: `2px solid ${scanning ? C.orange : C.border}`, transition: "border 0.3s" }} />
          {!scanning
            ? <button onClick={startScan} style={{ marginTop: "20px", padding: "14px 40px", background: C.orange, border: "none", borderRadius: "50px", color: C.white, fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              {Icon.camera} Kamera starten
            </button>
            : <button onClick={async () => { if (scannerRef.current) try { await scannerRef.current.stop(); } catch (e) { } setScanning(false); }} style={{ marginTop: "20px", padding: "13px 36px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "50px", color: C.textSub, fontSize: "14px", fontWeight: "600" }}>
              Abbrechen
            </button>
          }
          <div style={{ color: C.textLight, fontSize: "12px", marginTop: "14px" }}>Scanne den QR-Code auf deinem Beleg</div>
        </>
      ) : (
        <div style={{ textAlign: "center", animation: "scaleIn 0.4s" }}>
          <div style={{ color: C.orange, marginBottom: "8px" }}>{Icon.check}</div>
          <div style={{ fontSize: "40px", fontWeight: "800", color: C.orange, fontFamily: font.display }}>+{pts} XP</div>
          <div style={{ color: C.textLight, fontSize: "14px", marginTop: "8px" }}>Punkte gutgeschrieben!</div>
          <button onClick={() => { setDone(false); setPts(0); }} style={{ marginTop: "20px", padding: "12px 32px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "50px", color: C.text, fontSize: "14px" }}>
            Nochmal scannen
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Cinder (Vote) Tab ──────────────────────────────────────────
const VoteTab = ({ user, setUser }) => {
  const [allDishes, setAllDishes] = useState([]);
  const [unvoted, setUnvoted] = useState([]);
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(null);
  const [dragX, setDragX] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visitStatus, setVisitStatus] = useState(null);

  useEffect(() => {
    const init = async () => {
      const dishes = await db.getDishes();
      const list = dishes.length ? dishes : MOCK_DISHES;
      setAllDishes(list);
      if (user.id) {
        const votedIds = await db.getUserVotes(user.id);
        setUnvoted(list.filter(d => !votedIds.has(d.id)));
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

  const doVote = async (liked) => {
    if (!currentDish || dir) return;
    Sound.vote();
    setDir(liked ? "right" : "left");
    if (user.id) {
      await db.voteDish(user.id, currentDish.id, liked).catch(() => { });
      if (liked) {
        const fresh = await db.getProfile(user.id);
        if (fresh) {
          await db.updateProfile(user.id, { pts: (fresh.pts || 0) + 10 });
          setUser(u => ({ ...u, pts: (u.pts || 0) + 10 }));
        }
      }
    }
    setTimeout(() => { setDir(null); setDragX(0); setCurrent(i => i + 1); }, 320);
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
      <div style={{ color: C.textLight }}>Wird geladen...</div>
    </div>
  );

  return (
    <div style={{ background: C.beige, paddingBottom: "24px", minHeight: "100%" }}>
      <div style={{ padding: "20px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, fontWeight: "600" }}>CINDER</div>
          <div style={{ fontSize: "26px", fontFamily: font.display, color: C.text, fontWeight: "700" }}>
            {done ? "Ergebnisse" : "Was kommt auf die Karte?"}
          </div>
        </div>
        {!done && <div style={{ fontSize: "13px", color: C.textLight, fontWeight: "600" }}>{current + 1}/{unvoted.length}</div>}
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Besuch heute */}
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: C.text, marginBottom: "10px" }}>Kommst du heute vorbei?</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[{ v: "planned", l: "Ja, heute" }, { v: "not", l: "Nicht heute" }].map(opt => (
              <button key={opt.v} onClick={() => setVisit(opt.v)} style={{ flex: 1, padding: "9px", borderRadius: "10px", border: "none", background: visitStatus === opt.v ? C.orange : C.greyBg, color: visitStatus === opt.v ? C.white : C.textLight, fontSize: "12px", fontWeight: "600", transition: "all 0.2s" }}>
                {opt.l}
              </button>
            ))}
          </div>
        </Card>

        {!done ? (
          <>
            <div
              onTouchStart={e => setDragStart(e.touches[0].clientX)}
              onTouchMove={e => { if (dragStart !== null) setDragX(e.touches[0].clientX - dragStart); }}
              onTouchEnd={() => { if (Math.abs(dragX) > 70) doVote(dragX > 0); else setDragX(0); setDragStart(null); }}>
              <Card style={{
                padding: 0, overflow: "hidden", borderRadius: "20px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
                transform: dir === "left" ? "translateX(-110%) rotate(-18deg)" : dir === "right" ? "translateX(110%) rotate(18deg)" : `translateX(${dragX}px) rotate(${dragX * 0.035}deg)`,
                opacity: dir ? 0 : Math.max(0.4, 1 - Math.abs(dragX) * 0.003),
                transition: dir ? "all 0.32s cubic-bezier(0.4,0,0.2,1)" : dragX ? "none" : "all 0.3s",
              }}>
                <div style={{ height: "220px", background: `linear-gradient(135deg,${C.beigeDark},${C.beige})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {currentDish?.image_url
                    ? <img src={currentDish.image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ color: C.textLight, opacity: 0.4 }}>{Icon.heart}</div>
                  }
                  {Math.abs(dragX) > 30 && (
                    <div style={{ position: "absolute", inset: 0, background: dragX > 0 ? "rgba(45,71,42,0.35)" : "rgba(226,74,40,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: "60px", color: "white" }}>{dragX > 0 ? "♥" : "✕"}</div>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: "10px", right: "12px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "white", borderRadius: "10px", padding: "3px 10px", fontSize: "11px", fontWeight: "700" }}>
                    {currentDish?.votes} Votes
                  </div>
                </div>
                <div style={{ padding: "18px" }}>
                  <div style={{ fontSize: "20px", fontFamily: font.display, fontWeight: "700", color: C.text }}>{currentDish?.name}</div>
                  <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px" }}>{currentDish?.description}</div>
                  <div style={{ fontSize: "11px", color: C.orange, fontWeight: "600", marginTop: "8px" }}>+10 XP für dein Vote</div>
                </div>
              </Card>
            </div>

            {/* Buttons – FIX #12 */}
            <div style={{ display: "flex", justifyContent: "center", gap: "28px", marginTop: "20px", alignItems: "center" }}>
              <button
                onPointerDown={e => e.preventDefault()}
                onClick={() => doVote(false)}
                style={{ width: "60px", height: "60px", borderRadius: "50%", background: C.card, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", color: C.textSub }}>
                {Icon.x}
              </button>
              <button
                onPointerDown={e => e.preventDefault()}
                onClick={() => doVote(true)}
                style={{ width: "72px", height: "72px", borderRadius: "50%", background: C.orange, border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 24px ${C.orange}55`, color: "white" }}>
                {Icon.heartFill}
              </button>
            </div>
            <div style={{ textAlign: "center", color: C.textLight, fontSize: "11px", marginTop: "12px" }}>Swipe oder Buttons</div>
          </>
        ) : (
          <>
            <Card style={{ padding: "20px", textAlign: "center", marginBottom: "14px" }}>
              <div style={{ color: C.orange, marginBottom: "8px" }}>{Icon.heartFill}</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: C.text }}>Alle Gerichte bewertet!</div>
              <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px" }}>Danke für dein Feedback</div>
            </Card>
            <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "1px", color: C.textSub, marginBottom: "10px" }}>AKTUELLE ERGEBNISSE</div>
            {[...allDishes].sort((a, b) => (b.votes || 0) - (a.votes || 0)).map((d, i) => (
              <Card key={d.id} style={{ marginBottom: "8px", padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: i === 0 ? C.orange : C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: i === 0 ? C.white : C.textLight, flexShrink: 0 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>{d.name}</div>
                  <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>{d.description}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: C.orange }}>{d.votes || 0}</div>
                  <div style={{ fontSize: "10px", color: C.textLight }}>Votes</div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Profile Tab ────────────────────────────────────────────────
const ProfileTab = ({ user, setUser, onLogout, theme }) => {
  const { mode, setMode, glowColor, setGlowColor, isGlowHour } = theme || {};
  const era = ERAS.find(e => e.level === (user.level || 1)) || ERAS[0];
  const [editing, setEditing] = useState(false);
  const [uname, setUname] = useState(user.name || "");
  const [insta, setInsta] = useState(user.instagram || "");
  const [items, setItems] = useState(MOCK_SHOP);
  const [rd, setRd] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [socialTab, setSocialTab] = useState("score");
  const [friends, setFriends] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [giftTarget, setGiftTarget] = useState(null);
  const [giftAmount, setGiftAmount] = useState(50);
  const [giftMsg, setGiftMsg] = useState("");
  const [vibes, setVibes] = useState([]);
  const [uploadingVibe, setUploadingVibe] = useState(false);

  useEffect(() => { db.getShopItems().then(d => { if (d.length) setItems(d); }); }, []);
  useEffect(() => {
    if (!user.id) return;
    db.getFriendRequests(user.id).then(setFriends);
    db.getMyGifts(user.id).then(setGifts);
    db.getApprovedVibes().then(setVibes);
  }, [socialTab]);

  const save = async () => {
    setUser(u => ({ ...u, name: uname, instagram: insta }));
    if (user.id) await db.updateProfile(user.id, { name: uname, instagram: insta });
    setEditing(false);
  };

  const redeem = async (item) => {
    const fresh = user.id ? await db.getProfile(user.id) : null;
    const currentPts = fresh ? (fresh.pts || 0) : (user.pts || 0);
    const currentLevel = fresh ? (fresh.level || 1) : (user.level || 1);
    if (currentPts < item.cost || currentLevel < item.min_level) return;
    const result = await db.redeemItem(user.id, item.id, item.cost);
    if (result?.error) return;
    setUser(u => ({ ...u, pts: currentPts - item.cost }));
    Sound.redeem(); setRd(item); setTimeout(() => setRd(null), 3000);
  };

  const searchUsers = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await db.searchUsers(q);
    setSearchResults(res.filter(r => r.id !== user.id));
  };

  const sendRequest = async (targetId) => {
    await db.sendFriendRequest(user.id, targetId);
    setSearchResults([]); setSearchQ("");
    db.getFriendRequests(user.id).then(setFriends);
  };

  const respondRequest = async (id, status) => {
    await db.respondFriendRequest(id, status);
    db.getFriendRequests(user.id).then(setFriends);
  };

  const sendGiftPts = async () => {
    if (!giftTarget || giftAmount < 10 || giftAmount > 200) return;
    const fresh = user.id ? await db.getProfile(user.id) : null;
    const currentPts = fresh ? (fresh.pts || 0) : (user.pts || 0);
    if (currentPts < giftAmount) return;
    const result = await db.sendGift(user.id, giftTarget.id, "pts", giftAmount, null, giftMsg);
    if (result?.error) { alert(result.error); return; }
    await db.updateProfile(user.id, { pts: currentPts - giftAmount });
    setUser(u => ({ ...u, pts: currentPts - giftAmount }));
    Sound.gift(); setGiftTarget(null); setGiftAmount(50); setGiftMsg("");
    db.getMyGifts(user.id).then(setGifts);
  };

  const claimGift = async (giftId) => {
    await db.claimGift(giftId, user.id);
    const fresh = await db.getProfile(user.id);
    if (fresh) setUser(u => ({ ...u, ...fresh }));
    db.getMyGifts(user.id).then(setGifts);
  };

  const shareApp = () => {
    const link = `https://cereza-loyalty.vercel.app?ref=${user.name || "friend"}`;
    if (navigator.share) navigator.share({ title: "Cereza Loyalty", text: "Wir bekommen beide XP!", url: link });
    else { navigator.clipboard?.writeText(link); setShowShare(true); setTimeout(() => setShowShare(false), 2000); }
  };

  const uploadVibePhoto = async (file) => {
    if (!file || !user.id) return;
    setUploadingVibe(true);
    const result = await db.uploadVibe(user.id, file);
    if (result?.error) alert(result.error);
    else { db.getApprovedVibes().then(setVibes); }
    setUploadingVibe(false);
  };

  const myFriends = friends.filter(f => f.status === "accepted");
  const pendingReceived = friends.filter(f => f.status === "pending" && f.receiver_id === user.id);

  return (
    <div style={{ background: C.beige, paddingBottom: "32px", minHeight: "100%" }}>
      {/* Redemption Overlay */}
      {rd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.3s" }}>
          <div style={{ fontSize: "36px", color: C.white, marginBottom: "8px" }}>{Icon.check}</div>
          <div style={{ color: C.white, fontSize: "18px", fontWeight: "700" }}>Eingelöst!</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "4px" }}>Zeige dies an der Kasse</div>
          <div style={{ color: C.white, fontSize: "22px", fontFamily: font.display, fontWeight: "700", marginTop: "12px" }}>{rd.name}</div>
        </div>
      )}
      {showShare && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: C.green, color: C.white, padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", zIndex: 999, animation: "fadeUp 0.3s" }}>
          Link kopiert!
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "20px 20px 0", textAlign: "center" }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: "10px" }}>
          {user.avatar_url
            ? <img src={user.avatar_url} style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.card}` }} />
            : <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", color: C.white, fontWeight: "700" }}>{(user.name || "U")[0].toUpperCase()}</div>
          }
          <label style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "24px", height: "24px", borderRadius: "50%", background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <div style={{ fontSize: "12px", color: C.textLight }}>+</div>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
              const file = e.target.files?.[0]; if (!file || !user.id) return;
              const result = await db.uploadAvatar(user.id, file);
              if (result?.url) setUser(u => ({ ...u, avatar_url: result.url }));
              else if (result?.error) alert(result.error);
            }} />
          </label>
        </div>
        <div style={{ fontSize: "20px", fontFamily: font.display, fontWeight: "700", color: C.text }}>@{user.name || "user"}</div>
        <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>{era.name} · Level {user.level || 1}</div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "12px" }}>
          <button onClick={shareApp} style={{ padding: "8px 16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: C.text, display: "flex", alignItems: "center", gap: "6px" }}>
            {Icon.share} Teilen
          </button>
          <button onClick={shareApp} style={{ padding: "8px 16px", background: C.orange, border: "none", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: C.white }}>
            + Einladen
          </button>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          {[{ v: user.pts || 0, l: "XP" }, { v: user.total_visits || 0, l: "Besuche" }, { v: user.streak || 0, l: "Streak" }].map((s, i) => (
            <Card key={i} style={{ padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: C.text }}>{s.v}</div>
              <div style={{ fontSize: "10px", color: C.textLight, marginTop: "2px" }}>{s.l}</div>
            </Card>
          ))}
        </div>

        {/* Social Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "12px", background: C.greyBg, borderRadius: "14px", padding: "3px" }}>
          {[{ id: "score", l: "Rewards" }, { id: "friends", l: "Freunde" }, { id: "gifts", l: "Geschenke" }, { id: "vibes", l: "Vibes" }].map(st => (
            <button key={st.id} onClick={() => setSocialTab(st.id)} style={{ flex: 1, padding: "9px 4px", borderRadius: "11px", border: "none", background: socialTab === st.id ? C.card : "transparent", color: socialTab === st.id ? C.text : C.textLight, fontSize: "11px", fontWeight: socialTab === st.id ? "700" : "500", transition: "all 0.2s" }}>
              {st.l}
            </button>
          ))}
        </div>

        {/* Score / Rewards */}
        {socialTab === "score" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {items.map((item, i) => {
                const ok = (user.pts || 0) >= item.cost && (user.level || 1) >= item.min_level;
                const locked = (user.level || 1) < item.min_level;
                return (
                  <Card key={item.id} onClick={() => ok && redeem(item)} style={{ padding: "14px", textAlign: "center", opacity: locked ? 0.4 : 1, cursor: ok ? "pointer" : "default", border: ok ? `2px solid ${C.orange}` : `1px solid ${C.border}` }}>
                    <div style={{ fontSize: "24px", marginBottom: "6px" }}>{item.icon}</div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: C.text }}>{item.name}</div>
                    <div style={{ marginTop: "8px", padding: "3px 10px", borderRadius: "10px", fontSize: "10px", fontWeight: "700", background: ok ? C.orange : C.greyBg, color: ok ? C.white : C.textLight, display: "inline-block" }}>
                      {locked ? `Level ${item.min_level}` : `${item.cost} XP`}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Freunde */}
        {socialTab === "friends" && (
          <div>
            <input value={searchQ} onChange={e => searchUsers(e.target.value)} placeholder="User suchen..."
              style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px", background: C.card, color: C.text }} />
            {searchResults.map(r => (
              <Card key={r.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: "700" }}>{(r.name || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>@{r.name}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>Level {r.level || 1} · {r.pts || 0} XP</div>
                </div>
                <button onClick={() => sendRequest(r.id)} style={{ padding: "8px 14px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "12px", fontWeight: "600" }}>+ Anfrage</button>
              </Card>
            ))}
            {pendingReceived.length > 0 && (
              <>
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.textSub, marginBottom: "8px" }}>ANFRAGEN</div>
                {pendingReceived.map(f => (
                  <Card key={f.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>{(f.sender?.name || "?")[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>@{f.sender?.name}</div>
                    </div>
                    <button onClick={() => respondRequest(f.id, "accepted")} style={{ padding: "7px 12px", background: C.green, border: "none", borderRadius: "10px", color: C.white, fontSize: "12px", fontWeight: "600" }}>✓</button>
                    <button onClick={() => respondRequest(f.id, "rejected")} style={{ padding: "7px 12px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "10px", color: C.textLight, fontSize: "12px" }}>✕</button>
                  </Card>
                ))}
              </>
            )}
            {myFriends.length > 0 && (
              <>
                <div style={{ fontSize: "12px", fontWeight: "700", color: C.textSub, marginBottom: "8px", marginTop: "6px" }}>FREUNDE ({myFriends.length})</div>
                {myFriends.map(f => {
                  const other = f.sender_id === user.id ? f.receiver : f.sender;
                  return (
                    <Card key={f.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: "700" }}>{(other?.name || "?")[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600" }}>@{other?.name}</div>
                        <div style={{ fontSize: "11px", color: C.textLight }}>Level {other?.level || 1}</div>
                      </div>
                      <button onClick={() => setGiftTarget(other)} style={{ padding: "8px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "10px", color: C.text, display: "flex", alignItems: "center" }}>
                        {Icon.gift}
                      </button>
                    </Card>
                  );
                })}
              </>
            )}
            {/* Gift modal */}
            {giftTarget && (
              <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}>
                <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: "24px", width: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>XP schenken an @{giftTarget.name}</div>
                  <input type="number" value={giftAmount} onChange={e => setGiftAmount(Number(e.target.value))} min="10" max="200"
                    style={{ width: "100%", padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "16px", outline: "none", boxSizing: "border-box", marginBottom: "8px" }} />
                  <input value={giftMsg} onChange={e => setGiftMsg(e.target.value)} placeholder="Nachricht (optional)"
                    style={{ width: "100%", padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "14px" }} />
                  <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "12px" }}>Max. 200 XP/Monat verschenkbar</div>
                  <button onClick={sendGiftPts} style={{ width: "100%", padding: "13px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "15px", fontWeight: "700", marginBottom: "8px" }}>Senden</button>
                  <button onClick={() => setGiftTarget(null)} style={{ width: "100%", padding: "12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "12px", color: C.textLight, fontSize: "14px" }}>Abbrechen</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Geschenke */}
        {socialTab === "gifts" && (
          <div>
            {gifts.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Noch keine Geschenke</div>}
            {gifts.map(g => (
              <Card key={g.id} style={{ marginBottom: "8px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700" }}>
                      {g.sender_id === user.id ? `→ @${g.receiver?.name}` : `← @${g.sender?.name}`}
                    </div>
                    <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>
                      {g.type === "pts" ? `${g.amount} XP` : g.type}
                      {g.message ? ` · "${g.message}"` : ""}
                    </div>
                  </div>
                  {g.receiver_id === user.id && g.status === "pending" && (
                    <button onClick={() => claimGift(g.id)} style={{ padding: "8px 14px", background: C.orange, border: "none", borderRadius: "10px", color: C.white, fontSize: "12px", fontWeight: "700" }}>Annehmen</button>
                  )}
                  {g.status === "claimed" && <div style={{ fontSize: "11px", color: C.green, fontWeight: "600" }}>Erhalten</div>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Vibes */}
        {socialTab === "vibes" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <label style={{ flex: 1, padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "13px", fontWeight: "700", textAlign: "center", cursor: "pointer" }}>
                {uploadingVibe ? "Wird hochgeladen..." : "Vibe hochladen"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadVibePhoto(f); }} />
              </label>
            </div>
            {vibes.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Noch keine Vibes</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {vibes.map(v => (
                <div key={v.id} style={{ borderRadius: "14px", overflow: "hidden", aspectRatio: "1" }}>
                  <img src={v.url} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.3) contrast(1.1) saturate(0.9)" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profil Info */}
        <Card style={{ marginTop: "12px", marginBottom: "10px" }}>
          {editing ? (
            <>
              <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "10px", color: C.textSub }}>PROFIL BEARBEITEN</div>
              <input value={uname} onChange={e => setUname(e.target.value)} placeholder="Username" style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", marginBottom: "8px", outline: "none", boxSizing: "border-box" }} />
              <input value={insta} onChange={e => setInsta(e.target.value)} placeholder="@instagram" style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box" }} />
              <button onClick={save} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700" }}>Speichern</button>
            </>
          ) : (
            <>
              {[{ l: "Username", v: `@${user.name || "user"}` }, { l: "E-Mail", v: user.email }, { l: "Instagram", v: user.instagram || "—" }, { l: "Telefon", v: user.phone || "—" }].map((r, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < 3 ? `1px solid ${C.greyBg}` : "none" }}>
                  <div style={{ fontSize: "10px", color: C.textLight, fontWeight: "600" }}>{r.l}</div>
                  <div style={{ fontSize: "13px", fontWeight: "500", marginTop: "2px" }}>{r.v}</div>
                </div>
              ))}
              <button onClick={() => setEditing(true)} style={{ width: "100%", marginTop: "12px", padding: "11px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "12px", color: C.text, fontSize: "13px", fontWeight: "600" }}>Profil bearbeiten</button>
            </>
          )}
        </Card>

        {/* Era Journey */}
        <Card style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "12px", color: C.textSub }}>ERA JOURNEY</div>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
            {ERAS.map((e, i) => (
              <div key={i} style={{ width: "44px", height: "44px", borderRadius: "50%", background: (user.level || 1) >= e.level ? C.orange : C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800", color: (user.level || 1) >= e.level ? C.white : C.textLight, border: (user.level || 1) === e.level ? `3px solid ${C.text}` : "none" }}>
                {(user.level || 1) >= e.level ? e.level : "—"}
              </div>
            ))}
          </div>
        </Card>

        {/* Einstellungen */}
        <Card style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", marginBottom: "12px", color: C.textSub }}>EINSTELLUNGEN</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.greyBg}` }}>
            <div style={{ fontSize: "14px", color: C.text }}>Dark Mode</div>
            <div onClick={() => setMode?.(mode === "dark" ? "light" : "dark")} style={{ width: "46px", height: "26px", borderRadius: "13px", background: mode === "dark" ? C.orange : C.greyBg, cursor: "pointer", position: "relative", transition: "all 0.3s" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: C.white, position: "absolute", top: "2px", left: mode === "dark" ? "22px" : "2px", transition: "all 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
            <div>
              <div style={{ fontSize: "14px", color: C.text }}>Glow Hour Farbe</div>
              {isGlowHour && <div style={{ fontSize: "10px", color: C.orange, fontWeight: "600" }}>Glow Hour aktiv!</div>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div onClick={() => setGlowColor?.("rosa")} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#f8e8ee", border: glowColor === "rosa" ? `2px solid #d4618c` : `2px solid ${C.border}`, cursor: "pointer" }} />
              <div onClick={() => setGlowColor?.("gruen")} style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#e8f5e9", border: glowColor === "gruen" ? `2px solid #4CAF50` : `2px solid ${C.border}`, cursor: "pointer" }} />
            </div>
          </div>
        </Card>

        {/* Ausloggen */}
        <button onClick={onLogout} style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "14px", color: C.textLight, fontSize: "14px", fontWeight: "600" }}>
          Ausloggen
        </button>
      </div>
    </div>
  );
};

// ─── Admin Login ─────────────────────────────────────────────────
const AdminLogin = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const { data, error } = await db.signIn(email, pw);
      if (error) { setErr("Falsche Zugangsdaten"); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 600));
      let profile = await db.getProfile(data.user.id);
      if (!profile) {
        await new Promise(r => setTimeout(r, 1000));
        profile = await db.getProfile(data.user.id);
      }
      if (profile?.is_admin) onLogin(profile);
      else { setErr("Kein Admin-Zugang"); await db.signOut(); }
    } catch (e) { setErr("Verbindungsfehler: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.beige, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{defaultCSS}</style>
      <div style={{ fontSize: "28px", fontFamily: font.display, color: C.text, marginBottom: "28px", fontWeight: "700" }}>Admin Login</div>
      <div style={{ width: "100%", maxWidth: "300px" }}>
        <input type="email" placeholder="Admin E-Mail" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: "100%", padding: "13px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", color: C.text, fontSize: "14px", outline: "none", marginBottom: "8px", boxSizing: "border-box" }} />
        <input type="password" placeholder="Passwort" value={pw} onChange={e => setPw(e.target.value)}
          style={{ width: "100%", padding: "13px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", color: C.text, fontSize: "14px", outline: "none", marginBottom: "10px", boxSizing: "border-box" }} />
        {err && <div style={{ color: C.orange, fontSize: "12px", textAlign: "center", marginBottom: "8px" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "14px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "15px", fontWeight: "700", opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : "Einloggen"}
        </button>
        <button onClick={onBack} style={{ width: "100%", marginTop: "8px", padding: "12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "12px", color: C.textLight, fontSize: "13px" }}>← Zurück</button>
      </div>
    </div>
  );
};

// ─── Admin Panel ─────────────────────────────────────────────────
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
    const [u, m, f, p, s, r, v, vis] = await Promise.all([
      db.getAllProfiles(), db.getMissions(), db.getFunFacts(),
      db.getWheelPrizes(), db.getShopItems(), db.getPendingRedemptions(),
      db.getPendingVibes(), db.getTodayVisitors(),
    ]);
    const { data: d } = await supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true);
    const { data: gh } = await supabase.from('glow_hours').select('*').order('id');
    setUsers(u); setMissions(m); setFacts(f); setPrizes(p); setShopItems(s);
    setRedemptions(r); setVibes(v); setVisitors(vis);
    setDishes((d || []).map(x => ({ ...x, votes: x.dish_votes?.filter(v => v.vote).length || 0 })));
    setGlowHours(gh || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const totalPts = users.reduce((s, u) => s + (u.pts || 0), 0);
  const avgPts = users.length ? Math.round(totalPts / users.length) : 0;
  const today = new Date().toISOString().split('T')[0];
  const todayUsers = users.filter(u => u.last_visit === today).length;

  const saveUser = async () => {
    if (!editUser) return;
    await db.updateProfile(editUser.id, { name: editUser.name, pts: parseInt(editUser.pts) || 0, level: parseInt(editUser.level) || 1, is_admin: editUser.is_admin, is_abo_member: editUser.is_abo_member, streak: parseInt(editUser.streak) || 0, total_visits: parseInt(editUser.total_visits) || 0 });
    showToast("Gespeichert ✓"); setEditUser(null); db.getAllProfiles().then(setUsers);
  };
  const saveMission = async () => {
    if (!editMission) return;
    if (editMission.id) await supabase.from('missions').update({ title: editMission.title, description: editMission.description, pts_reward: parseInt(editMission.pts_reward) || 0, icon: editMission.icon, goal: parseInt(editMission.goal) || 1, active: editMission.active }).eq('id', editMission.id);
    else await supabase.from('missions').insert({ title: editMission.title, description: editMission.description || '', pts_reward: parseInt(editMission.pts_reward) || 100, icon: editMission.icon || '★', goal: parseInt(editMission.goal) || 1, active: true });
    showToast("Gespeichert ✓"); setEditMission(null); db.getMissions().then(setMissions);
  };
  const saveDish = async () => {
    if (!editDish) return;
    if (editDish.id) await supabase.from('dishes').update({ name: editDish.name, description: editDish.description, active: editDish.active }).eq('id', editDish.id);
    else await supabase.from('dishes').insert({ name: editDish.name, description: editDish.description || '', active: true });
    showToast("Gespeichert ✓"); setEditDish(null);
    const { data: d } = await supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true);
    setDishes((d || []).map(x => ({ ...x, votes: x.dish_votes?.filter(v => v.vote).length || 0 })));
  };
  const saveShop = async () => {
    if (!editShop) return;
    if (editShop.id) await supabase.from('shop_items').update({ name: editShop.name, description: editShop.description, icon: editShop.icon, cost: parseInt(editShop.cost) || 0, min_level: parseInt(editShop.min_level) || 1, active: editShop.active }).eq('id', editShop.id);
    else await supabase.from('shop_items').insert({ name: editShop.name, description: editShop.description || '', icon: editShop.icon || '🎁', cost: parseInt(editShop.cost) || 0, min_level: parseInt(editShop.min_level) || 1, active: true });
    showToast("Gespeichert ✓"); setEditShop(null); db.getShopItems().then(setShopItems);
  };
  const savePrize = async () => {
    if (!editPrize) return;
    if (editPrize.id) await supabase.from('wheel_prizes').update({ label: editPrize.label, value: parseInt(editPrize.value) || 0, color: editPrize.color, active: editPrize.active }).eq('id', editPrize.id);
    else await supabase.from('wheel_prizes').insert({ label: editPrize.label, value: parseInt(editPrize.value) || 0, color: editPrize.color || '#fde8e8', active: true });
    showToast("Gespeichert ✓"); setEditPrize(null); db.getWheelPrizes().then(setPrizes);
  };
  const saveGlow = async () => {
    if (!editGlow) return;
    if (editGlow.id) await supabase.from('glow_hours').update({ day_of_week: parseInt(editGlow.day_of_week), start_time: editGlow.start_time, end_time: editGlow.end_time, multiplier: parseInt(editGlow.multiplier) || 2, active: editGlow.active }).eq('id', editGlow.id);
    else await supabase.from('glow_hours').insert({ day_of_week: parseInt(editGlow.day_of_week) || 1, start_time: editGlow.start_time || '12:00', end_time: editGlow.end_time || '14:00', multiplier: 2, active: true });
    showToast("Gespeichert ✓"); setEditGlow(null);
    supabase.from('glow_hours').select('*').order('id').then(r => setGlowHours(r.data || []));
  };

  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const adminTabs = [
    { id: "stats", l: "Statistiken" }, { id: "users", l: "User" }, { id: "redemptions", l: "Kasse" },
    { id: "shop", l: "Shop" }, { id: "missions", l: "Missionen" }, { id: "dishes", l: "Gerichte" },
    { id: "glow", l: "Glow" }, { id: "prizes", l: "Rad" }, { id: "facts", l: "Fakten" },
    { id: "vibes", l: "Vibes" }, { id: "visits", l: "Heute" }, { id: "push", l: "Push" },
  ];

  const inp = (label, val, onChange, type = "text") => (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "4px", fontWeight: "600" }}>{label}</div>
      <input type={type} value={val ?? ''} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: C.card, color: C.text }} />
    </div>
  );

  const toggle = (label, val, onChange) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.greyBg}` }}>
      <div style={{ fontSize: "14px", color: C.text }}>{label}</div>
      <div onClick={() => onChange(!val)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: val ? C.orange : C.greyBg, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: C.white, position: "absolute", top: "2px", left: val ? "22px" : "2px", transition: "all 0.2s" }} />
      </div>
    </div>
  );

  const Modal = ({ title, onSave, onClose, children }) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: "22px", width: "100%", maxHeight: "80vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ fontSize: "17px", fontWeight: "700", color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: C.greyBg, border: "none", borderRadius: "10px", padding: "7px 12px", color: C.text, fontSize: "14px" }}>✕</button>
        </div>
        {children}
        <button onClick={onSave} style={{ width: "100%", padding: "13px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "15px", fontWeight: "700", marginTop: "14px" }}>Speichern</button>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u => !searchQ || u.name?.toLowerCase().includes(searchQ.toLowerCase()) || u.email?.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.beige, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{defaultCSS}</style>

      {toast && <div style={{ position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)", background: toast.ok ? C.green : C.orange, color: C.white, padding: "10px 20px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", zIndex: 999999, animation: "fadeUp 0.3s" }}>{toast.msg}</div>}

      {/* Edit Modals */}
      {editUser && (
        <Modal title="User bearbeiten" onSave={saveUser} onClose={() => setEditUser(null)}>
          {inp("Name", editUser.name, v => setEditUser(p => ({ ...p, name: v })))}
          {inp("XP", editUser.pts, v => setEditUser(p => ({ ...p, pts: v })), "number")}
          {inp("Level (1-5)", editUser.level, v => setEditUser(p => ({ ...p, level: v })), "number")}
          {inp("Streak", editUser.streak, v => setEditUser(p => ({ ...p, streak: v })), "number")}
          {inp("Besuche", editUser.total_visits, v => setEditUser(p => ({ ...p, total_visits: v })), "number")}
          {toggle("Admin", editUser.is_admin, v => setEditUser(p => ({ ...p, is_admin: v })))}
          {toggle("Abo", editUser.is_abo_member, v => setEditUser(p => ({ ...p, is_abo_member: v })))}
          <button onClick={async () => { if (!confirm("Wirklich löschen?")) return; await supabase.from('profiles').delete().eq('id', editUser.id); showToast("Gelöscht"); setEditUser(null); db.getAllProfiles().then(setUsers) }}
            style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #e24a28", borderRadius: "10px", color: "#e24a28", fontSize: "13px", marginTop: "8px", cursor: "pointer" }}>User löschen</button>
        </Modal>
      )}
      {editMission && (
        <Modal title={editMission.id ? "Mission bearbeiten" : "Neue Mission"} onSave={saveMission} onClose={() => setEditMission(null)}>
          {inp("Titel", editMission.title, v => setEditMission(p => ({ ...p, title: v })))}
          {inp("Beschreibung", editMission.description, v => setEditMission(p => ({ ...p, description: v })))}
          {inp("Icon", editMission.icon, v => setEditMission(p => ({ ...p, icon: v })))}
          {inp("XP Belohnung", editMission.pts_reward, v => setEditMission(p => ({ ...p, pts_reward: v })), "number")}
          {inp("Ziel", editMission.goal, v => setEditMission(p => ({ ...p, goal: v })), "number")}
          {editMission.id && toggle("Aktiv", editMission.active, v => setEditMission(p => ({ ...p, active: v })))}
        </Modal>
      )}
      {editDish && (
        <Modal title={editDish.id ? "Gericht bearbeiten" : "Neues Gericht"} onSave={saveDish} onClose={() => setEditDish(null)}>
          {inp("Name", editDish.name, v => setEditDish(p => ({ ...p, name: v })))}
          {inp("Beschreibung", editDish.description, v => setEditDish(p => ({ ...p, description: v })))}
          {editDish.id && toggle("Aktiv", editDish.active, v => setEditDish(p => ({ ...p, active: v })))}
          {editDish.id && <button onClick={async () => { if (!confirm("Alle Votes zurücksetzen?")) return; await supabase.from('dish_votes').delete().eq('dish_id', editDish.id); showToast("Votes zurückgesetzt"); setEditDish(null); loadAll() }} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "10px", color: C.textLight, fontSize: "13px", marginTop: "8px", cursor: "pointer" }}>Votes zurücksetzen</button>}
        </Modal>
      )}
      {editShop && (
        <Modal title={editShop.id ? "Shop Item" : "Neues Item"} onSave={saveShop} onClose={() => setEditShop(null)}>
          {inp("Name", editShop.name, v => setEditShop(p => ({ ...p, name: v })))}
          {inp("Beschreibung", editShop.description, v => setEditShop(p => ({ ...p, description: v })))}
          {inp("Icon", editShop.icon, v => setEditShop(p => ({ ...p, icon: v })))}
          {inp("XP Kosten", editShop.cost, v => setEditShop(p => ({ ...p, cost: v })), "number")}
          {inp("Min. Level", editShop.min_level, v => setEditShop(p => ({ ...p, min_level: v })), "number")}
          {editShop.id && toggle("Aktiv", editShop.active, v => setEditShop(p => ({ ...p, active: v })))}
        </Modal>
      )}
      {editPrize && (
        <Modal title={editPrize.id ? "Preis bearbeiten" : "Neuer Preis"} onSave={savePrize} onClose={() => setEditPrize(null)}>
          {inp("Label", editPrize.label, v => setEditPrize(p => ({ ...p, label: v })))}
          {inp("Wert (XP, 0=nichts, -1=2x)", editPrize.value, v => setEditPrize(p => ({ ...p, value: v })), "number")}
          {inp("Farbe (Hex)", editPrize.color, v => setEditPrize(p => ({ ...p, color: v })))}
          {editPrize.id && toggle("Aktiv", editPrize.active, v => setEditPrize(p => ({ ...p, active: v })))}
        </Modal>
      )}
      {editGlow && (
        <Modal title={editGlow.id ? "Glow Hour" : "Neue Glow Hour"} onSave={saveGlow} onClose={() => setEditGlow(null)}>
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "4px", fontWeight: "600" }}>Tag</div>
            <select value={editGlow.day_of_week ?? 1} onChange={e => setEditGlow(p => ({ ...p, day_of_week: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", background: C.card, color: C.text }}>
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
          <div style={{ fontSize: "17px", fontWeight: "800", color: C.text }}>Admin Panel</div>
          <div style={{ fontSize: "11px", color: C.textLight }}>Cereza · Frankfurt</div>
        </div>
        <button onClick={onClose} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "8px 16px", color: C.text, fontSize: "13px", fontWeight: "600" }}>Schließen</button>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", overflowX: "auto", borderBottom: `1px solid ${C.greyBg}`, background: C.card, flexShrink: 0 }}>
        {adminTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 12px", borderRadius: "20px", border: "none", background: tab === t.id ? C.orange : C.greyBg, color: tab === t.id ? C.white : C.textLight, fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>{t.l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", WebkitOverflowScrolling: "touch" }}>
        {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Wird geladen...</div>}

        {/* Stats */}
        {!loading && tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              {[{ v: users.length, l: "Registrierte User" }, { v: todayUsers, l: "Heute aktiv" }, { v: users.filter(u => u.is_abo_member).length, l: "Abo Mitglieder" }, { v: avgPts, l: "⌀ XP/User" }, { v: totalPts.toLocaleString(), l: "XP gesamt" }, { v: visitors.length, l: "Besuche heute" }, { v: redemptions.length, l: "Offene Einlösungen" }, { v: vibes.length, l: "Vibes zur Freigabe" }].map((s, i) => (
                <Card key={i} style={{ padding: "14px" }}>
                  <div style={{ fontSize: "22px", fontWeight: "800", color: C.orange }}>{s.v}</div>
                  <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>{s.l}</div>
                </Card>
              ))}
            </div>
            <Card>
              <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "12px", color: C.textSub }}>LEVEL VERTEILUNG</div>
              {[1, 2, 3, 4, 5].map(l => {
                const count = users.filter(u => (u.level || 1) === l).length;
                return (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "60px", fontSize: "12px", color: C.textLight }}>Level {l}</div>
                    <div style={{ flex: 1, height: "16px", background: C.greyBg, borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${users.length ? (count / users.length) * 100 : 0}%`, background: C.orange, borderRadius: "8px", transition: "width 0.5s" }} />
                    </div>
                    <div style={{ width: "28px", fontSize: "12px", fontWeight: "700", textAlign: "right" }}>{count}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* Users */}
        {!loading && tab === "users" && (
          <div>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="User suchen..."
              style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px", background: C.card, color: C.text }} />
            {filteredUsers.map(u => (
              <Card key={u.id} style={{ marginBottom: "6px", padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: "15px", fontWeight: "800", flexShrink: 0 }}>{(u.name || "U")[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: "700" }}>@{u.name} {u.is_admin && <span style={{ background: C.orange, color: C.white, fontSize: "8px", padding: "1px 5px", borderRadius: "4px" }}>ADMIN</span>}</div>
                    <div style={{ fontSize: "10px", color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: C.orange }}>{u.pts || 0}</div>
                    <div style={{ fontSize: "9px", color: C.textLight }}>Lvl {u.level || 1}</div>
                  </div>
                  <button onClick={() => setEditUser({ ...u })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "7px 10px", fontSize: "12px", flexShrink: 0 }}>✏</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Kasse */}
        {!loading && tab === "redemptions" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Offene Einlösungen an der Kasse bestätigen</div>
            {redemptions.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Keine offenen Einlösungen</div>}
            {redemptions.map(r => (
              <Card key={r.id} style={{ marginBottom: "8px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700" }}>{r.item?.icon} {r.item?.name || "Unbekannt"}</div>
                    <div style={{ fontSize: "12px", color: C.textLight }}>@{r.profile?.name} · {r.pts_spent} XP</div>
                    <div style={{ fontSize: "10px", color: C.textLight }}>Läuft ab: {new Date(r.expires_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={async () => { await db.confirmRedemption(r.id); showToast("Bestätigt ✓"); db.getPendingRedemptions().then(setRedemptions) }}
                    style={{ background: C.green, border: "none", borderRadius: "12px", padding: "11px 16px", color: C.white, fontSize: "13px", fontWeight: "700" }}>✓ OK</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Shop */}
        {!loading && tab === "shop" && (
          <div>
            <button onClick={() => setEditShop({ name: "", description: "", icon: "🎁", cost: 500, min_level: 1 })} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>+ Neues Item</button>
            {shopItems.map(item => (
              <Card key={item.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "24px" }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{item.name}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>{item.cost} XP · Level {item.min_level}+</div>
                </div>
                <button onClick={() => setEditShop({ ...item })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>✏</button>
              </Card>
            ))}
          </div>
        )}

        {/* Missionen */}
        {!loading && tab === "missions" && (
          <div>
            <button onClick={() => setEditMission({ title: "", description: "", icon: "★", pts_reward: 100, goal: 1 })} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>+ Neue Mission</button>
            {missions.map(m => (
              <Card key={m.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ fontSize: "22px" }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{m.title}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>{m.description} · +{m.pts_reward} XP</div>
                </div>
                <button onClick={() => setEditMission({ ...m })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>✏</button>
              </Card>
            ))}
          </div>
        )}

        {/* Gerichte */}
        {!loading && tab === "dishes" && (
          <div>
            <button onClick={() => setEditDish({ name: "", description: "" })} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>+ Neues Gericht</button>
            {dishes.map(d => (
              <Card key={d.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{d.name}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>♥ {d.votes} Votes</div>
                </div>
                <button onClick={() => setEditDish({ ...d })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>✏</button>
              </Card>
            ))}
          </div>
        )}

        {/* Glow Hours */}
        {!loading && tab === "glow" && (
          <div>
            <button onClick={() => setEditGlow({ day_of_week: 1, start_time: "12:00", end_time: "14:00", multiplier: 2, active: true })} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>+ Neue Glow Hour</button>
            {glowHours.map(g => (
              <Card key={g.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{days[g.day_of_week]}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>{g.start_time} – {g.end_time} · {g.multiplier}× XP · {g.active ? "Aktiv" : "Inaktiv"}</div>
                </div>
                <button onClick={() => setEditGlow({ ...g })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>✏</button>
              </Card>
            ))}
          </div>
        )}

        {/* Rad */}
        {!loading && tab === "prizes" && (
          <div>
            <button onClick={() => setEditPrize({ label: "", value: 100, color: "#fde8e8" })} style={{ width: "100%", padding: "12px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>+ Neuer Preis</button>
            {prizes.map(p => (
              <Card key={p.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{p.label}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>{p.value > 0 ? `+${p.value} XP` : p.value === -1 ? "2× Multiplikator" : "Kein Gewinn"}</div>
                </div>
                <button onClick={() => setEditPrize({ ...p })} style={{ background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>✏</button>
              </Card>
            ))}
          </div>
        )}

        {/* Fakten */}
        {!loading && tab === "facts" && (
          <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              <input value={newFact} onChange={e => setNewFact(e.target.value)} placeholder="Neuer Fun Fact..."
                style={{ flex: 1, padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", outline: "none", background: C.card, color: C.text }} />
              <button onClick={async () => { if (!newFact.trim()) return; await db.addFunFact(newFact); setNewFact(""); db.getFunFacts().then(setFacts); showToast("Hinzugefügt ✓") }}
                style={{ padding: "11px 16px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700" }}>+</button>
            </div>
            {facts.map(f => (
              <Card key={f.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, fontSize: "13px" }}>{f.text}</div>
                <button onClick={async () => { await db.deleteFunFact(f.id); db.getFunFacts().then(setFacts) }}
                  style={{ background: C.greyBg, border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", color: C.textLight }}>✕</button>
              </Card>
            ))}
          </div>
        )}

        {/* Vibes */}
        {!loading && tab === "vibes" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Fotos zur Freigabe ({vibes.length})</div>
            {vibes.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Keine Fotos zur Freigabe</div>}
            {vibes.map(v => (
              <Card key={v.id} style={{ marginBottom: "8px", padding: "12px" }}>
                <img src={v.url} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px", filter: "sepia(0.3) contrast(1.1)" }} />
                <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "10px" }}>@{v.profile?.name} · {new Date(v.created_at).toLocaleDateString('de-DE')}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={async () => { await db.approveVibe(v.id, true); showToast("Freigegeben ✓"); db.getPendingVibes().then(setVibes) }}
                    style={{ flex: 1, padding: "10px", background: C.green, border: "none", borderRadius: "10px", color: C.white, fontSize: "13px", fontWeight: "700" }}>✓ Freigeben</button>
                  <button onClick={async () => { await supabase.from('vibe_photos').delete().eq('id', v.id); showToast("Abgelehnt"); db.getPendingVibes().then(setVibes) }}
                    style={{ flex: 1, padding: "10px", background: C.greyBg, border: `1px solid ${C.border}`, borderRadius: "10px", color: C.textLight, fontSize: "13px", fontWeight: "700" }}>✕ Ablehnen</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Heute */}
        {!loading && tab === "visits" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textSub, marginBottom: "10px" }}>Angemeldete Besuche heute ({visitors.length})</div>
            {visitors.length === 0 && <div style={{ textAlign: "center", padding: "30px", color: C.textLight }}>Noch keine Anmeldungen</div>}
            {visitors.map(v => (
              <Card key={v.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.greyBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>
                  {(v.profile?.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>@{v.profile?.name || "User"}</div>
                  <div style={{ fontSize: "11px", color: C.green, fontWeight: "600" }}>Kommt heute</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Push */}
        {!loading && tab === "push" && (
          <div>
            <Card style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px" }}>Broadcast an alle User</div>
              <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Titel"
                style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", marginBottom: "8px", outline: "none", boxSizing: "border-box", background: C.card, color: C.text }} />
              <input value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Nachricht"
                style={{ width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "12px", fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box", background: C.card, color: C.text }} />
              <button onClick={async () => { if (!pushTitle) return; await sendPushToAll(pushTitle, pushBody); await supabase.from("admin_notifications").insert({ title: pushTitle, body: pushBody, sent_to: "all" }); showToast("Gesendet ✓"); setPushTitle(""); setPushBody("") }}
                style={{ width: "100%", padding: "13px", background: C.orange, border: "none", borderRadius: "12px", color: C.white, fontSize: "14px", fontWeight: "700" }}>Senden</button>
            </Card>
            <div style={{ fontSize: "12px", fontWeight: "700", color: C.textSub, marginBottom: "8px" }}>SCHNELL-NACHRICHTEN</div>
            {[{ t: "Glow Hour startet!", b: "Doppelte XP für die nächsten 2 Stunden!" }, { t: "Neue Missionen", b: "Schau dir die Challenges dieser Woche an!" }, { t: "Glücksrad wartet", b: "Du hast heute noch nicht gedreht." }, { t: "Neues Gericht zum Voten", b: "Swipe jetzt in Cinder!" }].map((q, i) => (
              <button key={i} onClick={async () => { await sendPushToAll(q.t, q.b); await supabase.from("admin_notifications").insert({ title: q.t, body: q.b, sent_to: "all" }); showToast("Gesendet ✓") }}
                style={{ width: "100%", padding: "12px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", marginBottom: "6px", textAlign: "left", display: "block" }}>
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

// ─── Main App ───────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [showLevelUp, setShowLevelUp] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const theme = useTheme();
  const { t, mode, setMode, glowColor, setGlowColor, isGlowHour } = theme;
  applyTheme(t);
  const CSS = getCSS(t);

  // ── Session restore ──────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let profile = null;
          for (let i = 0; i < 5; i++) {
            profile = await db.getProfile(session.user.id);
            if (profile) break;
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
          }
          if (profile) setUser(profile);
          else setUser({ id: session.user.id, name: session.user.user_metadata?.name || session.user.email?.split('@')[0], email: session.user.email, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
        }
      } catch (e) { console.error('Session restore:', e); }
      setLoading(false);
    };
    restore();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setUser(null); setAdminMode(false); }
      if (event === 'SIGNED_IN' && session?.user) {
        let profile = null;
        for (let i = 0; i < 4; i++) {
          profile = await db.getProfile(session.user.id);
          if (profile) break;
          await new Promise(r => setTimeout(r, 500));
        }
        if (profile) setUser(profile);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  // ── Realtime profile sync ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('profile-sync-' + user.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => { setUser(prev => ({ ...prev, ...payload.new })); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // ── Push notifications ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    requestPushPermission(user.id).catch(() => { });
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) { setToast({ title, body }); setTimeout(() => setToast(null), 4000); Sound.tap(); }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [user?.id]);

  // ── Level up check ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ne = [...ERAS].reverse().find(e => (user.pts || 0) >= e.ptsNeeded);
    if (ne && ne.level > (user.level || 1)) {
      setUser(u => ({ ...u, level: ne.level }));
      if (user.id) db.updateProfile(user.id, { level: ne.level });
      setShowLevelUp(ne.level); Sound.levelUp();
    }
  }, [user?.pts]);

  // ── Render states ────────────────────────────────────────────
  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: "#C1272D", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{defaultCSS}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "44px", fontFamily: font.display, color: "#ffffff", fontWeight: "700" }}>cereza</div>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>LOYALTY CLUB</div>
      </div>
    </div>
  );

  if (adminMode === "login") return <AdminLogin onLogin={() => setAdminMode("panel")} onBack={() => setAdminMode(false)} />;
  if (adminMode === "panel") return <AdminPanel onClose={async () => { await db.signOut(); setAdminMode(false); }} />;
  if (!user) return (
    <div style={{ position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto" }}>
      <AuthScreen onLogin={setUser} />
      <div onClick={() => setAdminMode("login")} style={{ position: "fixed", bottom: "10px", left: "50%", transform: "translateX(-50%)", color: "rgba(0,0,0,0.05)", fontSize: "9px", cursor: "pointer", padding: "6px 12px", userSelect: "none" }}>admin</div>
    </div>
  );

  const nav = [
    { id: "home", icon: Icon.home, l: "Home" },
    { id: "missions", icon: Icon.target, l: "Missions" },
    { id: "scan", icon: Icon.qr, l: "Scan" },
    { id: "cinder", icon: Icon.heart, l: "Cinder" },
    { id: "profile", icon: Icon.user, l: "Profil" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto", fontFamily: font.ui, background: t.bg, display: "flex", flexDirection: "column", overflow: "hidden", transition: "background 0.4s" }}>
      <style>{CSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: "max(16px,env(safe-area-inset-top,16px))", left: "50%", transform: "translateX(-50%)", background: t.card, border: `1px solid ${t.border}`, borderRadius: "16px", padding: "12px 18px", zIndex: 9998, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxWidth: "340px", width: "90%", animation: "fadeUp 0.3s", display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: t.text }}>{toast.title}</div>
            {toast.body && <div style={{ fontSize: "11px", color: t.textLight, marginTop: "2px" }}>{toast.body}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          {tab === "home" && <HomeTab user={user} setUser={setUser} setTab={setTab} />}
          {tab === "missions" && <WheelTab user={user} setUser={setUser} />}
          {tab === "scan" && <ScanTab user={user} setUser={setUser} />}
          {tab === "cinder" && <VoteTab user={user} setUser={setUser} />}
          {tab === "profile" && <ProfileTab user={user} setUser={setUser} onLogout={async () => { await db.signOut(); setUser(null); }} theme={theme} />}
        </div>
      </div>

      {/* iOS Tab Bar */}
      <div style={{ flexShrink: 0, background: t.navBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: `0.5px solid ${t.navBorder}`, paddingBottom: "env(safe-area-inset-bottom,0px)", transition: "all 0.3s" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", padding: "8px 0 4px", maxWidth: "430px", margin: "0 auto" }}>
          {nav.map(n => {
            const a = tab === n.id;
            return (
              <button key={n.id} onClick={() => { Sound.tap(); setTab(n.id); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", padding: "6px 0", color: a ? t.accent : t.textLight, transition: "all 0.2s" }}>
                <div style={{ padding: "4px", borderRadius: "10px", background: a ? t.accent + "18" : "transparent", transform: a ? "scale(1.08)" : "scale(1)", transition: "all 0.2s", color: a ? t.accent : t.textLight }}>
                  {n.icon}
                </div>
                <span style={{ fontSize: "10px", fontWeight: a ? "700" : "500", letterSpacing: "0.1px" }}>{n.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}