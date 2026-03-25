import { useState, useEffect, useRef } from "react";
import supabase, { db } from "./supabase";

// ─── Brand ──────────────────────────────────────────────────────
const C = { red: "#C1272D", darkRed: "#8B1A1A", bg: "#C1272D", cream: "#F5F0EB", sand: "#E8DFD0", darkGreen: "#2D4A2D", black: "#1A1A1A", grey: "#9A9A9A", white: "#fff" };

const ERAS = [
  { level: 1, name: "Newbie", ptsNeeded: 0 }, { level: 2, name: "Regular", ptsNeeded: 500 },
  { level: 3, name: "Muse", ptsNeeded: 1200 }, { level: 4, name: "Insider", ptsNeeded: 2500 },
  { level: 5, name: "Icon", ptsNeeded: 5000 },
];

const FUN_FACTS = [
  "🌶️ Unsere Chili No. 2 reift 40 Tage im Fass.",
  "🍕 Der Teig ruht 72 Stunden für maximalen Crunch.",
  "🍒 Cereza bedeutet Kirsche auf Spanisch.",
  "🧀 Wir nutzen nur Fior di Latte aus Kampanien.",
  "🔥 Unser Ofen erreicht 485°C in 12 Minuten.",
];

const MOCK_MISSIONS = [
  { id: 1, title: "Morning Muse", description: "Besuche uns vor 12:00 Uhr", progress: 1, goal: 2, pts_reward: 150, icon: "☀️" },
  { id: 2, title: "Spicy Lover", description: "Bestelle Pizza mit Chili Oil", progress: 0, goal: 1, pts_reward: 100, icon: "🌶️" },
  { id: 3, title: "Matcha Ritual", description: "Bestelle 3 Matcha diese Woche", progress: 2, goal: 3, pts_reward: 120, icon: "🍵" },
  { id: 4, title: "Social Star", description: "Teile deinen Status auf Insta", progress: 0, goal: 1, pts_reward: 75, icon: "📸" },
];

const MOCK_SHOP = [
  { id: 1, name: "Gratis Espresso", cost: 300, min_level: 1, icon: "☕" },
  { id: 2, name: "Gratis Matcha", cost: 600, min_level: 2, icon: "🍵" },
  { id: 3, name: "Gratis Margherita", cost: 1000, min_level: 3, icon: "🍕" },
  { id: 4, name: "Chef's Table Dinner", cost: 2500, min_level: 4, icon: "👨‍🍳" },
  { id: 5, name: "Cereza Merch Pack", cost: 1500, min_level: 3, icon: "👕" },
  { id: 6, name: "Benenne eine Pizza", cost: 5000, min_level: 5, icon: "⭐" },
];

const MOCK_DISHES = [
  { id: 1, name: "Truffle Margherita", description: "Trüffelcreme · Fior di Latte · frischer Trüffel", votes: 142 },
  { id: 2, name: "Matcha Tiramisu", description: "Matcha-Mascarpone · Espresso-Sauerteigboden", votes: 89 },
  { id: 3, name: "Pistachio Dream", description: "Pistaziencreme · Mortadella · Stracciatella", votes: 234 },
  { id: 4, name: "Mango Tango", description: "Mango-Habanero · Gambas · Limettenzeste", votes: 67 },
];

const WHEEL_PRIZES = [
  { label: "50 PTS", value: 50, bg: C.red }, { label: "Nope", value: 0, bg: C.black },
  { label: "100 PTS", value: 100, bg: C.darkRed }, { label: "25 PTS", value: 25, bg: "#3a1010" },
  { label: "2x PTS", value: -1, bg: C.red }, { label: "Nope", value: 0, bg: C.black },
  { label: "200 PTS", value: 200, bg: C.darkRed }, { label: "75 PTS", value: 75, bg: "#3a1010" },
];

const MOCK_LB = [
  { rank: 1, name: "Sophia", pts: 3200, level: 4 }, { rank: 2, name: "Luca", pts: 2800, level: 4 },
  { rank: 3, name: "Marco", pts: 1450, level: 3 }, { rank: 4, name: "Elena", pts: 1100, level: 3 },
  { rank: 5, name: "Tom", pts: 900, level: 2 }, { rank: 6, name: "Mia", pts: 780, level: 2 },
  { rank: 7, name: "Felix", pts: 650, level: 2 }, { rank: 8, name: "Anna", pts: 520, level: 2 },
  { rank: 9, name: "Ben", pts: 410, level: 1 }, { rank: 10, name: "Lisa", pts: 380, level: 1 },
];

// ─── CSS ────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  @font-face { font-family: 'Gallica'; src: url('https://fonts.cdnfonts.com/css/galica') format('woff2'); font-display: swap; }
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  html,body,#root { height:100%;width:100%;overflow:hidden;position:fixed;top:0;left:0;right:0;bottom:0;background:${C.bg};overscroll-behavior:none;user-select:none;-webkit-user-select:none; }
  input,textarea { user-select:text;-webkit-user-select:text; }
  input::placeholder { color:${C.grey}; }
  ::-webkit-scrollbar { display:none; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0}to{opacity:1} }
  @keyframes scaleIn { from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1} }
  @keyframes confetti { 0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0} }
  @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(193,39,45,0.3)}50%{box-shadow:0 0 20px rgba(193,39,45,0.6)} }
  @keyframes scanLine { 0%,100%{top:12%}50%{top:82%} }
  @keyframes swipeL { to{transform:translateX(-120%) rotate(-15deg);opacity:0} }
  @keyframes swipeR { to{transform:translateX(120%) rotate(15deg);opacity:0} }
`;

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.cream, borderRadius: "20px", padding: "20px", color: C.black, ...style }}>{children}</div>
);

const gallica = "'Gallica', 'Playfair Display', Georgia, serif";
const dm = "'DM Sans', -apple-system, sans-serif";

// ─── Auth ───────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [username, setUsername] = useState(""); const [phone, setPhone] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const inp = (ph, val, set, type = "text") => (
    <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
      style={{ width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: C.cream, fontSize: "15px", outline: "none", fontFamily: dm, marginBottom: "10px", boxSizing: "border-box" }} />
  );

  const submit = async () => {
    setErr("");
    if (!email || !pw) { setErr("Bitte alle Felder ausfüllen"); return; }
    if (mode === "register") {
      if (!username) { setErr("Bitte Username eingeben"); return; }
      if (!phone) { setErr("Bitte Handynummer eingeben"); return; }
      if (!dsgvo) { setErr("Bitte Datenschutz akzeptieren"); return; }
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await db.signIn(email, pw);
        if (error) { setErr(error.message === "Invalid login credentials" ? "Falsche E-Mail oder Passwort" : error.message); setLoading(false); return; }
        const profile = await db.getProfile(data.user.id);
        if (profile) onLogin(profile);
        else setErr("Profil nicht gefunden");
      } else {
        const { data, error } = await db.signUp(email, pw, username);
        if (error) { setErr(error.message); setLoading(false); return; }
        // Update profile with phone + username
        if (data.user) {
          setTimeout(async () => {
            await db.updateProfile(data.user.id, { name: username, phone });
          }, 1000);
        }
        setConfirmSent(true);
      }
    } catch (e) { setErr("Verbindungsfehler"); }
    setLoading(false);
  };

  if (confirmSent) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: `linear-gradient(180deg, ${C.darkRed}, #0a0303)`, textAlign: "center" }}>
      <style>{CSS}</style>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📧</div>
      <div style={{ fontSize: "22px", fontFamily: gallica, color: C.cream, marginBottom: "12px" }}>Check deine E-Mails!</div>
      <div style={{ color: "rgba(245,240,235,0.6)", fontSize: "14px", lineHeight: 1.5, maxWidth: "300px" }}>
        Wir haben dir eine Bestätigungs-Mail an <strong style={{ color: C.cream }}>{email}</strong> geschickt. Klicke auf den Link und logge dich danach ein.
      </div>
      <button onClick={() => { setConfirmSent(false); setMode("login"); }} style={{ marginTop: "24px", padding: "14px 32px", background: C.cream, border: "none", borderRadius: "14px", color: C.black, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: dm }}>ZUM LOGIN</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: `linear-gradient(180deg, ${C.darkRed}, #0a0303)` }}>
      <style>{CSS}</style>
      <div style={{ animation: "fadeUp 0.6s ease", marginBottom: "36px", textAlign: "center" }}>
        <div style={{ fontSize: "52px", fontFamily: gallica, color: C.cream, letterSpacing: "3px" }}>CEREZA</div>
        <div style={{ fontSize: "10px", letterSpacing: "5px", color: "rgba(245,240,235,0.5)", fontFamily: dm, marginTop: "6px" }}>LOYALTY CLUB</div>
      </div>
      <div style={{ width: "100%", maxWidth: "340px", animation: "fadeUp 0.6s ease 0.15s both" }}>
        {mode === "register" && inp("Username", username, setUsername)}
        {inp("E-Mail Adresse", email, setEmail, "email")}
        {inp("Passwort", pw, setPw, "password")}
        {mode === "register" && inp("Handynummer", phone, setPhone, "tel")}
        {mode === "register" && (
          <div onClick={() => setDsgvo(!dsgvo)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "14px", cursor: "pointer", color: "rgba(245,240,235,0.6)", fontSize: "11px", lineHeight: 1.4 }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px", border: `2px solid ${dsgvo ? C.cream : "rgba(245,240,235,0.3)"}`, background: dsgvo ? C.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{dsgvo && "✓"}</div>
            Ich stimme der Datenschutzerklärung zu und akzeptiere die Verarbeitung meiner Daten gemäß DSGVO.
          </div>
        )}
        {err && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "10px", textAlign: "center" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "15px", background: C.cream, border: "none", borderRadius: "14px", color: C.black, fontSize: "15px", fontWeight: "700", cursor: loading ? "wait" : "pointer", fontFamily: dm, opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : mode === "login" ? "EINLOGGEN" : "REGISTRIEREN"}
        </button>
        <p style={{ textAlign: "center", marginTop: "18px", color: "rgba(245,240,235,0.5)", fontSize: "13px" }}>
          {mode === "login" ? "Noch kein Mitglied? " : "Schon dabei? "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }} style={{ color: C.cream, cursor: "pointer", textDecoration: "underline" }}>
            {mode === "login" ? "Jetzt beitreten" : "Einloggen"}
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,2,2,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s" }}>
      {[...Array(25)].map((_, i) => <div key={i} style={{ position: "absolute", width: "6px", height: "6px", background: [C.red, C.cream, "#FFD700", C.sand][i % 4], borderRadius: i % 2 ? "50%" : "0", left: `${Math.random()*100}%`, top: "-10px", animation: `confetti ${1+Math.random()*2}s ease-in forwards`, animationDelay: `${Math.random()*0.5}s` }} />)}
      <div style={{ fontSize: "64px", animation: "scaleIn 0.6s ease 0.2s both" }}>👑</div>
      <div style={{ fontSize: "44px", fontFamily: gallica, color: C.cream, marginTop: "16px", animation: "scaleIn 0.6s ease 0.4s both" }}>LEVEL UP!</div>
      <div style={{ fontSize: "12px", letterSpacing: "4px", color: "rgba(245,240,235,0.5)", marginTop: "16px", animation: "fadeUp 0.5s ease 0.6s both" }}>NEW STATUS UNLOCKED</div>
      <div style={{ fontSize: "36px", fontFamily: gallica, color: C.cream, marginTop: "8px", animation: "fadeUp 0.5s ease 0.7s both" }}>{era.name}</div>
      <button onClick={onClose} style={{ marginTop: "40px", padding: "16px 48px", background: C.cream, border: "none", borderRadius: "50px", color: C.black, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: dm, animation: "fadeUp 0.5s ease 0.9s both" }}>CELEBRATE</button>
      <div onClick={() => { if (navigator.share) navigator.share({ title: "Cereza", text: `Ich bin jetzt ${era.name} bei Cereza! 🍒🍕`, url: "https://cereza-pizza.de" }); }} style={{ marginTop: "14px", color: "rgba(245,240,235,0.4)", fontSize: "12px", cursor: "pointer", animation: "fadeUp 0.5s ease 1s both" }}>📤 Auf Instagram teilen</div>
    </div>
  );
};

// ─── Home ───────────────────────────────────────────────────────
const HomeTab = ({ user, setUser, setTab }) => {
  const era = ERAS.find(e => e.level === user.level) || ERAS[0];
  const next = ERAS.find(e => e.level === user.level + 1);
  const pct = next ? Math.min(100, Math.round(((user.pts - era.ptsNeeded) / (next.ptsNeeded - era.ptsNeeded)) * 100)) : 100;
  const [fi, setFi] = useState(0);
  const [missions, setMissions] = useState(MOCK_MISSIONS);
  const [lb, setLb] = useState(MOCK_LB);

  useEffect(() => { const t = setInterval(() => setFi(i => (i + 1) % FUN_FACTS.length), 5000); return () => clearInterval(t); }, []);
  useEffect(() => {
    db.getLeaderboard().then(d => { if (d.length) setLb(d); });
  }, []);

  return (
    <div style={{ paddingBottom: "20px" }}>
      {/* Red Header */}
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "18px 20px 24px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.25)", borderRadius: "20px", padding: "5px 12px", fontSize: "11px", color: C.cream, fontWeight: "700", letterSpacing: "1px", marginBottom: "10px" }}>🔥 {user.streak || 0} WEEK STREAK</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "46px", fontFamily: gallica, color: C.cream, letterSpacing: "2px", lineHeight: 1 }}>CEREZA</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "20px", padding: "6px 14px", color: C.cream, fontSize: "16px", fontWeight: "800", fontFamily: dm }}>{user.pts || 0} <span style={{ fontSize: "10px", opacity: 0.7 }}>PTS</span></div>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: C.red, fontSize: "22px", fontFamily: gallica, fontWeight: "900" }}>C</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "8px 14px" }}>
          <span style={{ fontSize: "14px", color: C.cream }}>↩</span>
          <div style={{ color: "rgba(245,240,235,0.8)", fontSize: "12px", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>{FUN_FACTS[fi]}</div>
        </div>
      </div>

      <div style={{ padding: "14px", background: C.bg }}>
        {/* MY ERA Card */}
        <Card style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: C.sand, borderRadius: "12px", padding: "4px 10px", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: C.darkGreen, marginBottom: "8px" }}>👑 MY ERA</div>
              <div style={{ fontSize: "36px", fontFamily: gallica, color: C.red, lineHeight: 1 }}>{era.name}</div>
              <div style={{ fontSize: "11px", color: C.grey, marginTop: "6px", fontWeight: "600" }}>NEXT: {next ? `${next.name.toUpperCase()} (${next.ptsNeeded - user.pts} PTS)` : "MAX LEVEL"}</div>
            </div>
            <div style={{ position: "relative", width: "50px", height: "50px" }}>
              <svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="21" fill="none" stroke={C.sand} strokeWidth="4" /><circle cx="25" cy="25" r="21" fill="none" stroke={C.red} strokeWidth="4" strokeDasharray={`${pct*1.32} 132`} strokeLinecap="round" transform="rotate(-90 25 25)" /></svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: C.black }}>{pct}%</div>
            </div>
          </div>
          <div style={{ height: "7px", background: C.sand, borderRadius: "4px", overflow: "hidden", marginTop: "14px" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: "4px", background: C.black, transition: "width 1s" }} />
          </div>
          {/* Treat Tracker */}
          <div style={{ marginTop: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px" }}>TREAT TRACKER</div>
              <div style={{ background: C.black, color: C.cream, borderRadius: "10px", padding: "2px 8px", fontSize: "10px", fontWeight: "700" }}>{user.treat_count||0}/{user.treat_goal||8}</div>
            </div>
            <div style={{ display: "flex", gap: "5px" }}>
              {[...Array(user.treat_goal||8)].map((_, i) => <div key={i} style={{ flex: 1, height: "36px", borderRadius: "6px", background: i < (user.treat_count||0) ? C.red : C.sand }} />)}
            </div>
          </div>
          {/* Scan Button - navigates to scan tab */}
          <button onClick={() => setTab("scan")} style={{ width: "100%", marginTop: "14px", padding: "14px", background: C.black, border: "none", borderRadius: "14px", color: C.cream, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: dm, letterSpacing: "1px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>📷 SCAN</button>
        </Card>

        {/* Matcha Society */}
        {!user.is_abo_member ? (
          <div style={{ background: "linear-gradient(135deg, #1a3a1a, #2D4A2D)", borderRadius: "20px", padding: "20px", marginBottom: "12px", border: "1px solid rgba(45,74,45,0.4)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", fontSize: "80px", opacity: 0.06 }}>🍵</div>
            <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: "#8BC34A", marginBottom: "8px" }}>💎 MATCHA SOCIETY</div>
            <div style={{ fontSize: "20px", fontFamily: gallica, color: "#C8E6C9" }}>Werde Member</div>
            <div style={{ fontSize: "11px", color: "rgba(200,230,201,0.6)", marginTop: "6px", lineHeight: 1.4 }}>2x Matcha/Woche · +50% PTS · Priority Seating</div>
            <button onClick={() => window.open("https://buy.stripe.com/test_placeholder", "_blank")} style={{ marginTop: "12px", padding: "11px 24px", background: "#8BC34A", border: "none", borderRadius: "12px", color: "#1a3a1a", fontSize: "12px", fontWeight: "800", cursor: "pointer", fontFamily: dm }}>ABO STARTEN · 29,99€/Mo</button>
          </div>
        ) : (
          <div style={{ background: "linear-gradient(135deg, #1a3a1a, #2D4A2D)", borderRadius: "16px", padding: "14px 18px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid rgba(139,195,74,0.3)" }}>
            <span style={{ fontSize: "22px" }}>🍵</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "700", color: "#C8E6C9" }}>Matcha Society Aktiv</div><div style={{ fontSize: "10px", color: "rgba(200,230,201,0.5)" }}>+50% PTS · Member</div></div>
            <div style={{ background: "#8BC34A", color: "#1a3a1a", borderRadius: "8px", padding: "3px 8px", fontSize: "9px", fontWeight: "800" }}>MEMBER</div>
          </div>
        )}

        {/* Missions */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginBottom: "8px" }}>
            <div style={{ color: C.cream, fontSize: "14px", fontWeight: "700" }}>⊚ Missions</div>
            <div style={{ color: C.grey, fontSize: "11px" }}>Week {Math.ceil((Date.now() - new Date(new Date().getFullYear(),0,1))/604800000)}</div>
          </div>
          {missions.map((m, i) => (
            <Card key={m.id} style={{ marginBottom: "6px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", animation: `fadeUp 0.3s ease ${i*0.05}s both` }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>{m.title}</div>
                <div style={{ fontSize: "10px", color: C.grey, marginTop: "1px" }}>{m.description}</div>
                {(m.progress||0) < m.goal && <div style={{ height: "3px", background: C.sand, borderRadius: "2px", marginTop: "6px" }}><div style={{ height: "100%", width: `${((m.progress||0)/m.goal)*100}%`, background: "#4CAF50", borderRadius: "2px" }} /></div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: (m.progress||0) >= m.goal ? "#4CAF50" : C.red }}>{m.progress||0}/{m.goal}</div>
                <div style={{ fontSize: "9px", color: C.grey }}>+{m.pts_reward} PTS</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Top 10 */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "1px" }}>🏆 TOP 10 · MÄRZ</div>
            <div style={{ fontSize: "9px", fontWeight: "700", color: C.red, background: "rgba(193,39,45,0.1)", padding: "2px 8px", borderRadius: "8px" }}>LIVE</div>
          </div>
          {lb.slice(0, 5).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: i < 4 ? `1px solid ${C.sand}` : "none" }}>
              <div style={{ width: "22px", fontSize: "13px", textAlign: "center", fontWeight: "800", color: i < 3 ? C.red : C.grey }}>{i < 3 ? ["🥇","🥈","🥉"][i] : p.rank}</div>
              <div style={{ flex: 1, fontSize: "13px", fontWeight: p.name === user.name ? "700" : "500" }}>@{p.name} {p.name === user.name && <span style={{ color: C.red, fontSize: "10px" }}>(Du)</span>}</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: C.darkGreen }}>{p.pts} PTS</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ─── Wheel ──────────────────────────────────────────────────────
const WheelTab = ({ user, setUser }) => {
  const [spinning, setSpinning] = useState(false);
  const [rot, setRot] = useState(0);
  const [result, setResult] = useState(null);
  const [spun, setSpun] = useState(user.wheel_spun_today || false);

  const spin = async () => {
    if (spinning || spun) return;
    setSpinning(true); setResult(null);
    const idx = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const seg = 360 / WHEEL_PRIZES.length;
    setRot(r => r + 360 * 6 + (360 - idx * seg - seg / 2));
    setTimeout(async () => {
      setSpinning(false); setSpun(true);
      const prize = WHEEL_PRIZES[idx];
      setResult(prize);
      if (prize.value > 0) {
        const newPts = (user.pts || 0) + prize.value;
        setUser(u => ({ ...u, pts: newPts, wheel_spun_today: true }));
        if (user.id) await db.updateProfile(user.id, { pts: newPts, wheel_spun_today: true });
      } else {
        if (user.id) await db.updateProfile(user.id, { wheel_spun_today: true });
        setUser(u => ({ ...u, wheel_spun_today: true }));
      }
    }, 5000);
  };

  const sz = 270, cx = sz/2, cy = sz/2, r = sz/2-12;
  return (
    <div style={{ paddingBottom: "20px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "18px 20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(245,240,235,0.6)" }}>DAILY</div>
        <div style={{ fontSize: "24px", fontFamily: gallica, color: C.cream }}>Glücksrad</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 16px" }}>
        <div style={{ position: "relative", padding: "12px" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(245,240,235,0.12)", boxShadow: spinning ? "0 0 30px rgba(193,39,45,0.5)" : "0 0 15px rgba(0,0,0,0.3)", transition: "box-shadow 0.5s" }} />
          <div style={{ position: "absolute", top: "0", left: "50%", transform: "translateX(-50%)", zIndex: 3, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: `18px solid ${C.cream}`, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
          <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 5s cubic-bezier(0.15,0.6,0.15,1)" : "none", display: "block" }}>
            {WHEEL_PRIZES.map((p, i) => {
              const seg = 360 / WHEEL_PRIZES.length;
              const s = (i*seg-90)*Math.PI/180, e = ((i+1)*seg-90)*Math.PI/180, mid = (s+e)/2;
              return (<g key={i}><path d={`M${cx},${cy} L${cx+r*Math.cos(s)},${cy+r*Math.sin(s)} A${r},${r} 0 0,1 ${cx+r*Math.cos(e)},${cy+r*Math.sin(e)} Z`} fill={p.bg} stroke="rgba(245,240,235,0.08)" strokeWidth="1.5" /><text x={cx+(r*0.6)*Math.cos(mid)} y={cy+(r*0.6)*Math.sin(mid)} transform={`rotate(${i*seg+seg/2}, ${cx+(r*0.6)*Math.cos(mid)}, ${cy+(r*0.6)*Math.sin(mid)})`} textAnchor="middle" dominantBaseline="middle" fill={C.cream} fontSize="11" fontWeight="800" fontFamily="DM Sans">{p.label}</text></g>);
            })}
            <circle cx={cx} cy={cy} r="26" fill="#120404" stroke={C.red} strokeWidth="3" />
            <circle cx={cx} cy={cy} r="20" fill={C.red} />
            <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fill={C.cream} fontSize="16" fontWeight="900" fontFamily="Gallica, serif">C</text>
          </svg>
        </div>
        <button onClick={spin} disabled={spinning || spun} style={{ marginTop: "4px", padding: "14px 48px", border: "none", borderRadius: "50px", fontSize: "14px", fontWeight: "800", letterSpacing: "2px", fontFamily: dm, background: spun ? "rgba(245,240,235,0.1)" : C.cream, color: spun ? C.grey : C.black, cursor: spun ? "not-allowed" : "pointer", boxShadow: !spun ? "0 4px 16px rgba(0,0,0,0.3)" : "none" }}>{spun ? "MORGEN WIEDER ⏰" : spinning ? "DREHT..." : "🍒 DREHEN"}</button>
        {result && <Card style={{ marginTop: "16px", padding: "18px", textAlign: "center", animation: "scaleIn 0.4s", maxWidth: "260px" }}><div style={{ fontSize: "36px", marginBottom: "6px" }}>{result.value > 0 ? "🎉" : result.value === -1 ? "⚡" : "😅"}</div><div style={{ fontSize: "18px", fontWeight: "800", color: result.value > 0 ? C.red : C.black }}>{result.value > 0 ? `+${result.value} PTS!` : result.value === -1 ? "2x PTS heute!" : "Nächstes Mal!"}</div></Card>}
      </div>
    </div>
  );
};

// ─── Scan (Real Camera) ─────────────────────────────────────────
const ScanTab = ({ user, setUser }) => {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [pts, setPts] = useState(0);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const startScan = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (text) => {
          // QR scanned successfully
          await scanner.stop();
          const p = Math.floor(Math.random() * 100) + 50;
          setPts(p);
          const newPts = (user.pts || 0) + p;
          const newVisits = (user.total_visits || 0) + 1;
          const newTreat = Math.min((user.treat_count || 0) + 1, user.treat_goal || 8);
          setUser(u => ({ ...u, pts: newPts, total_visits: newVisits, treat_count: newTreat }));
          if (user.id) {
            await db.updateProfile(user.id, { pts: newPts, total_visits: newVisits, treat_count: newTreat });
            await supabase.from("scan_log").insert({ user_id: user.id, pts_earned: p, was_glow_hour: false });
          }
          setScanning(false); setDone(true);
        },
        () => {} // ignore errors while scanning
      );
    } catch (e) {
      // Fallback: simulate scan if camera fails
      setScanning(false);
      const p = Math.floor(Math.random() * 100) + 50;
      setPts(p);
      const newPts = (user.pts || 0) + p;
      setUser(u => ({ ...u, pts: newPts, total_visits: (u.total_visits||0)+1, treat_count: Math.min((u.treat_count||0)+1, u.treat_goal||8) }));
      if (user.id) await db.updateProfile(user.id, { pts: newPts });
      setDone(true);
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) { try { await scannerRef.current.stop(); } catch(e){} }
    setScanning(false);
  };

  useEffect(() => { return () => { if (scannerRef.current) try { scannerRef.current.stop(); } catch(e){} }; }, []);

  return (
    <div style={{ background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px 20px", minHeight: "80vh" }}>
      {!done ? (<>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: C.cream, opacity: 0.5 }}>QR CODE</div>
        <div style={{ fontSize: "26px", fontFamily: gallica, color: C.cream, marginBottom: "24px", marginTop: "4px" }}>Punkte sammeln</div>
        <div id="qr-reader" ref={containerRef} style={{ width: "260px", height: "260px", borderRadius: "16px", overflow: "hidden", background: "#000", border: `2px solid ${scanning ? C.cream : "rgba(245,240,235,0.2)"}`, transition: "border 0.3s" }} />
        {!scanning ? (
          <button onClick={startScan} style={{ marginTop: "20px", padding: "14px 40px", background: C.cream, border: "none", borderRadius: "50px", color: C.black, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: dm }}>📷 KAMERA STARTEN</button>
        ) : (
          <button onClick={stopScan} style={{ marginTop: "20px", padding: "14px 40px", background: "rgba(245,240,235,0.1)", border: "1px solid rgba(245,240,235,0.2)", borderRadius: "50px", color: C.cream, fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: dm }}>ABBRECHEN</button>
        )}
        <div style={{ color: C.grey, fontSize: "11px", marginTop: "12px" }}>Scanne den QR-Code auf deinem Beleg</div>
      </>) : (
        <div style={{ textAlign: "center", animation: "scaleIn 0.4s" }}>
          <div style={{ fontSize: "56px" }}>🎉</div>
          <div style={{ fontSize: "34px", fontWeight: "900", color: C.cream, fontFamily: gallica }}>+{pts} PTS</div>
          <div style={{ color: C.grey, fontSize: "13px", marginTop: "6px" }}>Punkte gutgeschrieben!</div>
          <button onClick={() => { setDone(false); setPts(0); }} style={{ marginTop: "20px", padding: "12px 32px", background: "rgba(245,240,235,0.1)", border: "1px solid rgba(245,240,235,0.2)", borderRadius: "50px", color: C.cream, fontSize: "13px", cursor: "pointer", fontFamily: dm }}>Nochmal scannen</button>
        </div>
      )}
    </div>
  );
};

// ─── Vote (Touch Swipe) ─────────────────────────────────────────
const VoteTab = ({ user }) => {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(null);
  const [dishes, setDishes] = useState(MOCK_DISHES);
  const [touchStart, setTouchStart] = useState(null);
  const [offset, setOffset] = useState(0);

  const handleSwipe = async (d) => {
    setDir(d);
    if (d === "right") {
      setDishes(prev => prev.map((dish, i) => i === idx ? { ...dish, votes: dish.votes + 1 } : dish));
      if (user.id) await supabase.from("dish_votes").upsert({ user_id: user.id, dish_id: dishes[idx].id, vote: true }).catch(() => {});
    }
    setTimeout(() => { setDir(null); setOffset(0); setIdx(i => i + 1); }, 300);
  };

  const dish = dishes[idx];
  return (
    <div style={{ background: C.bg, paddingBottom: "20px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "18px 20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(245,240,235,0.6)" }}>COMMUNITY VOTE</div>
        <div style={{ fontSize: "24px", fontFamily: gallica, color: C.cream }}>Nächste Pizza?</div>
      </div>
      <div style={{ padding: "16px" }}>
        {dish ? (<>
          <div
            onTouchStart={e => setTouchStart(e.touches[0].clientX)}
            onTouchMove={e => { if (touchStart !== null) setOffset(e.touches[0].clientX - touchStart); }}
            onTouchEnd={() => {
              if (Math.abs(offset) > 80) handleSwipe(offset > 0 ? "right" : "left");
              else { setOffset(0); setTouchStart(null); }
            }}
          >
            <Card style={{
              padding: 0, overflow: "hidden", maxWidth: "340px", margin: "0 auto",
              transform: dir === "left" ? "translateX(-120%) rotate(-15deg)" : dir === "right" ? "translateX(120%) rotate(15deg)" : `translateX(${offset}px) rotate(${offset * 0.05}deg)`,
              opacity: dir ? 0 : 1 - Math.abs(offset) * 0.002,
              transition: dir ? "all 0.3s ease" : "none"
            }}>
              <div style={{ height: "180px", background: `linear-gradient(135deg, ${C.sand}, ${C.cream})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px", position: "relative" }}>
                🍕
                <div style={{ position: "absolute", bottom: "8px", right: "10px", background: C.black, color: C.cream, borderRadius: "14px", padding: "3px 10px", fontSize: "11px", fontWeight: "700" }}>♥ {dish.votes}</div>
                {offset > 40 && <div style={{ position: "absolute", top: "12px", left: "12px", color: "#4CAF50", fontSize: "32px", fontWeight: "900", transform: "rotate(-15deg)" }}>LIKE</div>}
                {offset < -40 && <div style={{ position: "absolute", top: "12px", right: "12px", color: "#ff4444", fontSize: "32px", fontWeight: "900", transform: "rotate(15deg)" }}>NOPE</div>}
              </div>
              <div style={{ padding: "16px" }}><div style={{ fontSize: "20px", fontFamily: gallica, color: C.black }}>{dish.name}</div><div style={{ fontSize: "12px", color: C.grey, marginTop: "4px" }}>{dish.description}</div></div>
            </Card>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "16px" }}>
            <button onClick={() => handleSwipe("left")} style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(245,240,235,0.15)", color: C.cream, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <button onClick={() => handleSwipe("right")} style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(193,39,45,0.2)", border: `2px solid ${C.red}`, color: C.red, fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>♥</button>
          </div>
          <div style={{ textAlign: "center", color: C.grey, fontSize: "11px", marginTop: "10px" }}>← Swipe oder Buttons nutzen →</div>
        </>) : (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            <div style={{ fontSize: "40px" }}>🍕</div>
            <div style={{ color: C.cream, fontSize: "16px", fontWeight: "700", marginTop: "10px" }}>Alle gevotet!</div>
            {/* Show results */}
            <div style={{ marginTop: "20px" }}>
              {dishes.sort((a,b) => b.votes - a.votes).map((d, i) => (
                <Card key={d.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: i === 0 ? C.red : C.grey, width: "20px" }}>#{i+1}</div>
                  <div style={{ flex: 1, fontSize: "13px", fontWeight: "600" }}>{d.name}</div>
                  <div style={{ background: i === 0 ? C.red : C.sand, color: i === 0 ? C.cream : C.black, borderRadius: "10px", padding: "2px 10px", fontSize: "12px", fontWeight: "700" }}>♥ {d.votes}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Score (was Shop) ───────────────────────────────────────────
const ScoreTab = ({ user, setUser }) => {
  const [items, setItems] = useState(MOCK_SHOP);
  const [redeemed, setRedeemed] = useState(null);

  useEffect(() => { db.getShopItems().then(d => { if (d.length) setItems(d); }); }, []);

  const redeem = async (item) => {
    if ((user.pts||0) < item.cost || (user.level||1) < item.min_level) return;
    const newPts = (user.pts||0) - item.cost;
    setUser(u => ({ ...u, pts: newPts }));
    if (user.id) {
      await db.updateProfile(user.id, { pts: newPts });
      await supabase.from("redemptions").insert({ user_id: user.id, item_id: item.id });
    }
    setRedeemed(item);
    setTimeout(() => setRedeemed(null), 2500);
  };

  return (
    <div style={{ background: C.bg, paddingBottom: "20px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "18px 20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(245,240,235,0.6)" }}>REWARDS</div>
        <div style={{ fontSize: "24px", fontFamily: gallica, color: C.cream }}>Score</div>
        <div style={{ color: "rgba(245,240,235,0.6)", fontSize: "12px", marginTop: "4px" }}>Guthaben: <strong style={{ color: C.cream }}>{user.pts||0} PTS</strong></div>
      </div>
      {redeemed && <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(10,2,2,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.3s" }}><div style={{ fontSize: "56px" }}>{redeemed.icon}</div><div style={{ color: C.cream, fontSize: "20px", fontWeight: "700", marginTop: "12px" }}>Eingelöst!</div><div style={{ color: C.grey, fontSize: "12px", marginTop: "6px" }}>Zeige dies an der Kasse</div></div>}
      <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {items.map((item, i) => {
          const ok = (user.pts||0) >= item.cost && (user.level||1) >= item.min_level;
          const locked = (user.level||1) < item.min_level;
          return (
            <Card key={item.id} onClick={() => ok && redeem(item)} style={{ padding: "16px 12px", textAlign: "center", opacity: locked ? 0.45 : 1, cursor: ok ? "pointer" : "default", border: ok ? `2px solid ${C.red}` : "2px solid transparent", animation: `fadeUp 0.3s ease ${i*0.05}s both` }}>
              <div style={{ fontSize: "28px", marginBottom: "6px" }}>{item.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "700" }}>{item.name}</div>
              <div style={{ marginTop: "8px", display: "inline-block", padding: "3px 10px", borderRadius: "14px", fontSize: "11px", fontWeight: "700", background: ok ? C.red : C.sand, color: ok ? C.cream : locked ? C.grey : C.black }}>{locked ? `🔒 Lvl ${item.min_level}` : `${item.cost} PTS`}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ─── Profile ────────────────────────────────────────────────────
const ProfileTab = ({ user, setUser, onLogout }) => {
  const era = ERAS.find(e => e.level === (user.level||1)) || ERAS[0];
  const [editing, setEditing] = useState(false);
  const [insta, setInsta] = useState(user.instagram || "");
  const [uname, setUname] = useState(user.name || "");

  const save = async () => {
    setUser(u => ({ ...u, name: uname, instagram: insta }));
    if (user.id) await db.updateProfile(user.id, { name: uname, instagram: insta });
    setEditing(false);
  };

  return (
    <div style={{ background: C.bg, paddingBottom: "20px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "26px 20px 30px", textAlign: "center" }}>
        <div style={{ width: "68px", height: "68px", borderRadius: "50%", margin: "0 auto 10px", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", border: "3px solid rgba(255,255,255,0.3)" }}>🍒</div>
        <div style={{ fontSize: "22px", fontFamily: gallica, color: C.cream }}>@{user.name || "User"}</div>
        <div style={{ color: "rgba(245,240,235,0.6)", fontSize: "11px", marginTop: "4px" }}>{era.name} · Level {user.level||1}</div>
      </div>
      <div style={{ padding: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          {[{ v: user.pts||0, l: "PTS" }, { v: user.total_visits||0, l: "Besuche" }, { v: `${user.streak||0}🔥`, l: "Streak" }].map((s, i) => <Card key={i} style={{ padding: "12px", textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: "800" }}>{s.v}</div><div style={{ fontSize: "9px", color: C.grey, marginTop: "2px" }}>{s.l}</div></Card>)}
        </div>

        <Card style={{ marginBottom: "12px" }}>
          {editing ? (<>
            <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "10px" }}>PROFIL BEARBEITEN</div>
            <input value={uname} onChange={e => setUname(e.target.value)} placeholder="Username" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.sand}`, borderRadius: "10px", fontSize: "14px", marginBottom: "8px", outline: "none", boxSizing: "border-box", fontFamily: dm }} />
            <input value={insta} onChange={e => setInsta(e.target.value)} placeholder="@instagram" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.sand}`, borderRadius: "10px", fontSize: "14px", marginBottom: "12px", outline: "none", boxSizing: "border-box", fontFamily: dm }} />
            <button onClick={save} style={{ width: "100%", padding: "12px", background: C.red, border: "none", borderRadius: "10px", color: C.cream, fontSize: "13px", fontWeight: "700", cursor: "pointer", fontFamily: dm }}>SPEICHERN</button>
          </>) : (<>
            {[{ icon: "👤", label: "Username", value: `@${user.name || "User"}` }, { icon: "📧", label: "E-Mail", value: user.email }, { icon: "📸", label: "Instagram", value: user.instagram || "Nicht verknüpft" }, { icon: "📱", label: "Telefon", value: user.phone || "—" }, { icon: "🛡️", label: "DSGVO", value: "Akzeptiert ✓" }].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.sand}` : "none" }}>
                <span style={{ fontSize: "14px" }}>{r.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: "9px", color: C.grey }}>{r.label}</div><div style={{ fontSize: "12px", fontWeight: "500" }}>{r.value}</div></div>
              </div>
            ))}
            <button onClick={() => setEditing(true)} style={{ width: "100%", marginTop: "12px", padding: "10px", background: C.sand, border: "none", borderRadius: "10px", color: C.black, fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: dm }}>✏️ Profil bearbeiten</button>
          </>)}
        </Card>

        <Card>
          <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", marginBottom: "10px" }}>ERA JOURNEY</div>
          <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
            {ERAS.map((e, i) => <div key={i} style={{ width: "44px", height: "44px", borderRadius: "50%", background: (user.level||1) >= e.level ? C.red : C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: (user.level||1) >= e.level ? "14px" : "11px", fontWeight: "800", color: (user.level||1) >= e.level ? C.cream : C.grey, border: (user.level||1) === e.level ? `3px solid ${C.black}` : "none" }}>{(user.level||1) >= e.level ? e.level : "🔒"}</div>)}
          </div>
        </Card>

        <button onClick={onLogout} style={{ width: "100%", marginTop: "14px", padding: "12px", background: "transparent", border: "1px solid rgba(245,240,235,0.15)", borderRadius: "12px", color: C.grey, fontSize: "13px", cursor: "pointer", fontFamily: dm }}>Ausloggen</button>
      </div>
    </div>
  );
};

// ─── Admin ──────────────────────────────────────────────────────
const AdminPanel = ({ onClose }) => {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const tabs = [{ id: "users", l: "👥 User" }, { id: "points", l: "⚙️ Punkte" }, { id: "missions", l: "🎯 Missionen" }, { id: "glow", l: "⚡ Glow" }, { id: "dishes", l: "🍕 Gerichte" }, { id: "abo", l: "💎 Abos" }];

  useEffect(() => { db.getAllProfiles().then(d => setUsers(d)); }, []);

  const addPts = async (uid, amount) => {
    const u = users.find(x => x.id === uid);
    if (!u) return;
    await db.updateProfile(uid, { pts: (u.pts||0) + amount });
    setUsers(prev => prev.map(x => x.id === uid ? { ...x, pts: (x.pts||0) + amount } : x));
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0a0303", overflow: "auto", fontFamily: dm }}>
      <style>{CSS}</style>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(245,240,235,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#0a0303", zIndex: 10 }}>
        <div><div style={{ color: C.cream, fontSize: "15px", fontWeight: "800" }}>Admin Panel</div><div style={{ color: C.grey, fontSize: "10px" }}>Cereza Pizza · Frankfurt</div></div>
        <button onClick={onClose} style={{ background: "rgba(245,240,235,0.08)", border: "none", borderRadius: "8px", padding: "6px 12px", color: C.cream, cursor: "pointer", fontSize: "12px" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: "4px", padding: "8px 10px", overflowX: "auto", borderBottom: "1px solid rgba(245,240,235,0.05)" }}>
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "6px 10px", borderRadius: "14px", border: "none", background: tab === t.id ? C.red : "transparent", color: tab === t.id ? C.cream : C.grey, fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", fontFamily: dm }}>{t.l}</button>)}
      </div>
      <div style={{ padding: "12px" }}>
        {tab === "users" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "12px" }}>
            {[{ v: users.length, l: "User" }, { v: users.filter(u => u.last_visit === new Date().toISOString().split('T')[0]).length, l: "Heute" }, { v: users.length > 0 ? Math.round(users.filter(u => (u.total_visits||0) > 1).length / users.length * 100) + "%" : "—", l: "Retention" }].map((s, i) => <Card key={i} style={{ padding: "10px", textAlign: "center" }}><div style={{ fontSize: "18px", fontWeight: "800", color: C.red }}>{s.v}</div><div style={{ fontSize: "9px", color: C.grey }}>{s.l}</div></Card>)}
          </div>
          {users.map((u, i) => <Card key={i} style={{ marginBottom: "5px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: C.cream, fontSize: "11px", fontWeight: "800" }}>{u.level||1}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "700" }}>@{u.name}</div><div style={{ fontSize: "9px", color: C.grey }}>{u.email} · {u.last_visit || "—"}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: "12px", fontWeight: "700", color: C.red }}>{u.pts||0}</div><div style={{ fontSize: "8px", color: C.grey }}>{u.total_visits||0} Besuche</div></div>
            <button onClick={() => addPts(u.id, 100)} style={{ background: C.sand, border: "none", borderRadius: "6px", padding: "4px 6px", fontSize: "9px", fontWeight: "700", cursor: "pointer" }}>+100</button>
          </Card>)}
        </>)}
        {tab === "points" && (<>{ERAS.map((e, i) => <Card key={i} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: "26px", height: "26px", borderRadius: "50%", background: C.red, color: C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800" }}>{e.level}</div><div style={{ flex: 1 }}><div style={{ fontWeight: "700", fontSize: "13px" }}>{e.name}</div><div style={{ fontSize: "10px", color: C.grey }}>{e.ptsNeeded} PTS</div></div></Card>)}</>)}
        {tab === "missions" && (<>{MOCK_MISSIONS.map(m => <Card key={m.id} style={{ marginBottom: "5px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "20px" }}>{m.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: "12px", fontWeight: "700" }}>{m.title}</div><div style={{ fontSize: "9px", color: C.grey }}>{m.description}</div></div><div style={{ color: C.red, fontSize: "11px", fontWeight: "700" }}>+{m.pts_reward}</div></Card>)}</>)}
        {tab === "glow" && (<>{["Montag 12:00–14:00", "Mittwoch 18:00–20:00", "Freitag 12:00–14:00"].map((d, i) => <Card key={i} style={{ marginBottom: "6px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: "700", fontSize: "13px" }}>{d.split(" ")[0]}</div><div style={{ color: C.grey, fontSize: "11px" }}>{d.split(" ")[1]}</div></div><span style={{ fontSize: "11px", color: C.red, fontWeight: "700" }}>2x PTS</span></Card>)}</>)}
        {tab === "dishes" && (<>{MOCK_DISHES.map(d => <Card key={d.id} style={{ marginBottom: "5px", padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "24px" }}>🍕</span><div style={{ flex: 1 }}><div style={{ fontWeight: "700", fontSize: "12px" }}>{d.name}</div><div style={{ fontSize: "9px", color: C.grey }}>{d.description}</div></div><div style={{ background: C.red, color: C.cream, borderRadius: "10px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>♥ {d.votes}</div></Card>)}</>)}
        {tab === "abo" && (<Card style={{ padding: "18px" }}><div style={{ fontSize: "18px", fontFamily: gallica, color: C.red, marginBottom: "10px" }}>Matcha Society</div>{[{ l: "Preis", v: "29,99€/Mo" }, { l: "Members", v: "—" }, { l: "Zahlung", v: "Stripe + PayPal" }].map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < 2 ? `1px solid ${C.sand}` : "none", fontSize: "12px" }}><span style={{ color: C.grey }}>{r.l}</span><span style={{ fontWeight: "700" }}>{r.v}</span></div>)}</Card>)}
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
      if (error) { setErr("Falsche Zugangsdaten"); setLoading(false); return; }
      const profile = await db.getProfile(data.user.id);
      if (profile?.is_admin) { onLogin(profile); }
      else { setErr("Kein Admin-Zugang"); await db.signOut(); }
    } catch (e) { setErr("Verbindungsfehler"); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: "#0a0303", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: dm }}>
      <style>{CSS}</style>
      <div style={{ fontSize: "12px", color: C.grey, letterSpacing: "4px", marginBottom: "6px" }}>ADMIN</div>
      <div style={{ fontSize: "26px", fontFamily: gallica, color: C.cream, marginBottom: "28px" }}>Login</div>
      <div style={{ width: "100%", maxWidth: "300px" }}>
        <input type="email" placeholder="Admin E-Mail" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: "rgba(245,240,235,0.06)", border: "1px solid rgba(245,240,235,0.12)", borderRadius: "10px", color: C.cream, fontSize: "14px", outline: "none", marginBottom: "8px", fontFamily: dm, boxSizing: "border-box" }} />
        <input type="password" placeholder="Passwort" value={pw} onChange={e => setPw(e.target.value)} style={{ width: "100%", padding: "12px 14px", background: "rgba(245,240,235,0.06)", border: "1px solid rgba(245,240,235,0.12)", borderRadius: "10px", color: C.cream, fontSize: "14px", outline: "none", marginBottom: "10px", fontFamily: dm, boxSizing: "border-box" }} />
        {err && <div style={{ color: "#ff6b6b", fontSize: "11px", textAlign: "center", marginBottom: "8px" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "13px", background: C.red, border: "none", borderRadius: "12px", color: C.cream, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: dm, opacity: loading ? 0.7 : 1 }}>{loading ? "..." : "EINLOGGEN"}</button>
        <button onClick={onBack} style={{ width: "100%", marginTop: "8px", padding: "11px", background: "transparent", border: "1px solid rgba(245,240,235,0.12)", borderRadius: "12px", color: C.grey, fontSize: "12px", cursor: "pointer", fontFamily: dm }}>← Zurück</button>
      </div>
    </div>
  );
};

// ─── Main ───────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [showLevelUp, setShowLevelUp] = useState(null);
  const [adminMode, setAdminMode] = useState(false); // false | "login" | "panel"
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session restore
  useEffect(() => {
    db.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await db.getProfile(session.user.id);
        if (profile) setUser(profile);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Level up check
  useEffect(() => {
    if (!user) return;
    const newEra = [...ERAS].reverse().find(e => (user.pts||0) >= e.ptsNeeded);
    if (newEra && newEra.level > (user.level||1)) {
      const newLevel = newEra.level;
      setUser(u => ({ ...u, level: newLevel }));
      if (user.id) db.updateProfile(user.id, { level: newLevel });
      setShowLevelUp(newLevel);
    }
  }, [user?.pts]);

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: "42px", fontFamily: gallica, color: C.cream }}>CEREZA</div><div style={{ fontSize: "10px", color: C.grey, letterSpacing: "4px", marginTop: "8px" }}>LOADING...</div></div>
    </div>
  );

  if (adminMode === "login") return <AdminLogin onLogin={(p) => { setAdminUser(p); setAdminMode("panel"); }} onBack={() => setAdminMode(false)} />;
  if (adminMode === "panel") return <AdminPanel onClose={async () => { await db.signOut(); setAdminMode(false); setAdminUser(null); }} />;

  if (!user) return (
    <div style={{ position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto" }}>
      <AuthScreen onLogin={setUser} />
      <div onClick={() => setAdminMode("login")} style={{ position: "fixed", bottom: "10px", left: "50%", transform: "translateX(-50%)", color: "rgba(245,240,235,0.08)", fontSize: "9px", cursor: "pointer", padding: "4px 12px" }}>ADMIN</div>
    </div>
  );

  const nav = [
    { id: "home", icon: "🏠", label: "Home" }, { id: "wheel", icon: "🎰", label: "Daily" },
    { id: "scan", icon: "📷", label: "Scan" }, { id: "vote", icon: "🔥", label: "Vote" },
    { id: "score", icon: "🎁", label: "Score" }, { id: "profile", icon: "👤", label: "Profil" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: "430px", margin: "0 auto", fontFamily: dm, background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{CSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        {tab === "home" && <HomeTab user={user} setUser={setUser} setTab={setTab} />}
        {tab === "wheel" && <WheelTab user={user} setUser={setUser} />}
        {tab === "scan" && <ScanTab user={user} setUser={setUser} />}
        {tab === "vote" && <VoteTab user={user} />}
        {tab === "score" && <ScoreTab user={user} setUser={setUser} />}
        {tab === "profile" && <ProfileTab user={user} setUser={setUser} onLogout={async () => { await db.signOut(); setUser(null); }} />}
      </div>
      {/* Nav */}
      <div style={{ flexShrink: 0, background: "#120404", borderTop: "1px solid rgba(245,240,235,0.08)", paddingBottom: "env(safe-area-inset-bottom, 6px)" }}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "7px 2px 3px" }}>
          {nav.map(n => {
            const active = tab === n.id; const isScan = n.id === "scan";
            return (
              <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", position: "relative" }}>
                {isScan ? (
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-20px", border: "3px solid #120404", fontSize: "18px", boxShadow: active ? "0 0 14px rgba(193,39,45,0.5)" : "none" }}>{n.icon}</div>
                ) : (
                  <span style={{ fontSize: "18px", opacity: active ? 1 : 0.35, transform: active ? "scale(1.12)" : "scale(1)", transition: "all 0.15s" }}>{n.icon}</span>
                )}
                <span style={{ fontSize: "8px", fontWeight: active ? "700" : "500", color: active ? C.cream : "rgba(245,240,235,0.3)" }}>{n.label}</span>
                {active && !isScan && <div style={{ position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)", width: "14px", height: "2px", borderRadius: "1px", background: C.red }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
