import { useState, useEffect, useRef, useCallback } from "react";
import supabase, { db } from "./supabase";

const isSBReady = () => true;

// ─── Brand Colors ───────────────────────────────────────────────
const C = {
  red: "#C1272D",
  darkRed: "#8B1A1A",
  deepRed: "#2a0808",
  bg: "#C1272D",
  cream: "#F5F0EB",
  sand: "#E8DFD0",
  darkGreen: "#2D4A2D",
  white: "#FFFFFF",
  black: "#1A1A1A",
  grey: "#9A9A9A",
  lightGrey: "#D4D4D4",
  accent: "#D4442A",
};

// ─── Data ───────────────────────────────────────────────────────
const ERAS = [
  { level: 1, name: "Newbie", ptsNeeded: 0 },
  { level: 2, name: "Regular", ptsNeeded: 500 },
  { level: 3, name: "Muse", ptsNeeded: 1200 },
  { level: 4, name: "Insider", ptsNeeded: 2500 },
  { level: 5, name: "Icon", ptsNeeded: 5000 },
];

const FUN_FACTS = [
  "🌶️ Unsere Chili No. 2 reift 40 Tage im Fass.",
  "🍕 Der Teig ruht 72 Stunden für maximalen Crunch.",
  "🍒 Cereza bedeutet Kirsche auf Spanisch.",
  "🧀 Wir nutzen nur Fior di Latte aus Kampanien.",
  "🔥 Unser Ofen erreicht 485°C in 12 Minuten.",
];

const MOCK_USER = {
  name: "Marco", email: "marco@test.de", instagram: "@marco.ffm",
  pts: 1450, level: 3, streak: 3, totalVisits: 24, treatCount: 6, treatGoal: 8,
  wheelSpunToday: false, joinedAt: "2025-11-01", is_abo_member: false,
};

const LEADERBOARD = [
  { rank: 1, name: "Sophia", pts: 3200, level: 4 },
  { rank: 2, name: "Luca", pts: 2800, level: 4 },
  { rank: 3, name: "Marco", pts: 1450, level: 3 },
  { rank: 4, name: "Elena", pts: 1100, level: 3 },
  { rank: 5, name: "Tom", pts: 900, level: 2 },
  { rank: 6, name: "Mia", pts: 780, level: 2 },
  { rank: 7, name: "Felix", pts: 650, level: 2 },
  { rank: 8, name: "Anna", pts: 520, level: 2 },
  { rank: 9, name: "Ben", pts: 410, level: 1 },
  { rank: 10, name: "Lisa", pts: 380, level: 1 },
];

const MISSIONS = [
  { id: 1, title: "Morning Muse", desc: "Besuche uns vor 12:00 Uhr", progress: 1, goal: 2, pts: 150, icon: "☀️" },
  { id: 2, title: "Spicy Lover", desc: "Bestelle Pizza mit Chili Oil", progress: 0, goal: 1, pts: 100, icon: "🌶️" },
  { id: 3, title: "Matcha Ritual", desc: "Bestelle 3 Matcha diese Woche", progress: 2, goal: 3, pts: 120, icon: "🍵" },
  { id: 4, title: "Social Star", desc: "Teile deinen Status auf Insta", progress: 0, goal: 1, pts: 75, icon: "📸" },
];

const SHOP_ITEMS = [
  { id: 1, name: "Gratis Espresso", cost: 300, level: 1, icon: "☕" },
  { id: 2, name: "Gratis Matcha", cost: 600, level: 2, icon: "🍵" },
  { id: 3, name: "Gratis Margherita", cost: 1000, level: 3, icon: "🍕" },
  { id: 4, name: "Chef's Table Dinner", cost: 2500, level: 4, icon: "👨‍🍳" },
  { id: 5, name: "Cereza Merch Pack", cost: 1500, level: 3, icon: "👕" },
  { id: 6, name: "Benenne eine Pizza", cost: 5000, level: 5, icon: "⭐" },
];

const SWIPE_DISHES = [
  { id: 1, name: "Truffle Margherita", desc: "Trüffelcreme · Fior di Latte · frischer Trüffel", votes: 142 },
  { id: 2, name: "Matcha Tiramisu", desc: "Matcha-Mascarpone · Espresso-Sauerteigboden", votes: 89 },
  { id: 3, name: "Pistachio Dream", desc: "Pistaziencreme · Mortadella · Stracciatella", votes: 234 },
  { id: 4, name: "Mango Tango", desc: "Mango-Habanero · Gambas · Limettenzeste", votes: 67 },
];

const WHEEL_PRIZES = [
  { label: "50 PTS", value: 50, bg: C.red }, { label: "Nope", value: 0, bg: C.black },
  { label: "100 PTS", value: 100, bg: C.darkRed }, { label: "25 PTS", value: 25, bg: "#3a1010" },
  { label: "2x PTS", value: -1, bg: C.red }, { label: "Nope", value: 0, bg: C.black },
  { label: "200 PTS", value: 200, bg: C.darkRed }, { label: "75 PTS", value: 75, bg: "#3a1010" },
];

// ─── Global CSS ─────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  input::placeholder { color: ${C.grey}; }
  ::-webkit-scrollbar { width: 0; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { transform:scale(0.7); opacity:0; } to { transform:scale(1); opacity:1; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes confetti { 0% { transform:translateY(0) rotate(0); opacity:1; } 100% { transform:translateY(500px) rotate(720deg); opacity:0; } }
  @keyframes glow { 0%,100% { box-shadow: 0 0 8px rgba(193,39,45,0.3); } 50% { box-shadow: 0 0 20px rgba(193,39,45,0.6); } }
  @keyframes scanLine { 0%,100% { top:12%; } 50% { top:82%; } }
  @keyframes swipeL { to { transform:translateX(-120%) rotate(-15deg); opacity:0; } }
  @keyframes swipeR { to { transform:translateX(120%) rotate(15deg); opacity:0; } }
  @keyframes popIn { from { transform:scale(0); } to { transform:scale(1); } }
`;

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: C.cream, borderRadius: "20px", padding: "20px", color: C.black, ...style }}>{children}</div>
);

// ─── Auth ───────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [dsgvo, setDsgvo] = useState(false); const [err, setErr] = useState("");
  const inp = { width: "100%", padding: "14px 18px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: C.cream, fontSize: "15px", outline: "none", fontFamily: "'DM Sans', sans-serif", marginBottom: "10px", boxSizing: "border-box" };
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!email || !pw) { setErr("Bitte alle Felder ausfüllen"); return; }
    if (!isLogin && !dsgvo) { setErr("Bitte Datenschutz akzeptieren"); return; }
    if (!isLogin && !name) { setErr("Bitte Namen eingeben"); return; }
    
    // Fallback to mock if Supabase not configured
    if (!isSBReady()) {
      onLogin({ ...MOCK_USER, name: name || MOCK_USER.name, email });
      return;
    }

    setLoading(true); setErr("");
    try {
      if (isLogin) {
        const { data, error } = await db.signIn(email, pw);
        if (error) { setErr(error.message); setLoading(false); return; }
        const profile = await db.getProfile(data.user.id);
        onLogin(profile || { ...MOCK_USER, id: data.user.id, email });
      } else {
        const { data, error } = await db.signUp(email, pw, name);
        if (error) { setErr(error.message); setLoading(false); return; }
        // Profile auto-created via trigger, fetch it
        const profile = await db.getProfile(data.user.id);
        onLogin(profile || { ...MOCK_USER, id: data.user.id, name, email, pts: 0, level: 1 });
      }
    } catch (e) { setErr("Verbindungsfehler"); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", background: `linear-gradient(180deg, ${C.darkRed} 0%, ${C.bg} 100%)` }}>
      <style>{globalCSS}</style>
      <div style={{ animation: "fadeUp 0.6s ease", marginBottom: "40px", textAlign: "center" }}>
        <div style={{ fontSize: "52px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream, letterSpacing: "3px", lineHeight: 1 }}>CEREZA</div>
        <div style={{ fontSize: "10px", letterSpacing: "5px", color: "rgba(245,240,235,0.5)", textTransform: "uppercase", marginTop: "8px", fontFamily: "'DM Sans', sans-serif" }}>LOYALTY CLUB</div>
      </div>
      <div style={{ width: "100%", maxWidth: "340px", animation: "fadeUp 0.6s ease 0.15s both" }}>
        {!isLogin && <input placeholder="Dein Name" value={name} onChange={e => setName(e.target.value)} style={inp} />}
        <input type="email" placeholder="E-Mail Adresse" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
        <input type="password" placeholder="Passwort" value={pw} onChange={e => setPw(e.target.value)} style={inp} />
        {!isLogin && (
          <div onClick={() => setDsgvo(!dsgvo)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "14px", cursor: "pointer", color: "rgba(245,240,235,0.6)", fontSize: "11px", lineHeight: 1.4 }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px", border: `2px solid ${dsgvo ? C.cream : "rgba(245,240,235,0.3)"}`, background: dsgvo ? C.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "700" }}>{dsgvo && "✓"}</div>
            Ich stimme der Datenschutzerklärung zu und akzeptiere die Verarbeitung meiner Daten gemäß DSGVO.
          </div>
        )}
        {err && <div style={{ color: "#ff6b6b", fontSize: "12px", marginBottom: "10px", textAlign: "center" }}>{err}</div>}
        <button onClick={submit} style={{ width: "100%", padding: "15px", background: C.cream, border: "none", borderRadius: "14px", color: C.black, fontSize: "15px", fontWeight: "700", cursor: "pointer", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" }}>{isLogin ? "EINLOGGEN" : "BEITRETEN"}</button>
        <p style={{ textAlign: "center", marginTop: "18px", color: "rgba(245,240,235,0.5)", fontSize: "13px" }}>
          {isLogin ? "Noch kein Mitglied? " : "Schon dabei? "}
          <span onClick={() => { setIsLogin(!isLogin); setErr(""); }} style={{ color: C.cream, cursor: "pointer", textDecoration: "underline" }}>{isLogin ? "Jetzt beitreten" : "Einloggen"}</span>
        </p>
      </div>
    </div>
  );
};

// ─── Level Up ───────────────────────────────────────────────────
const LevelUpOverlay = ({ level, onClose }) => {
  const era = ERAS[level - 1];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,2,2,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.4s ease" }}>
      {[...Array(25)].map((_, i) => <div key={i} style={{ position: "absolute", width: "6px", height: "6px", background: [C.red, C.cream, "#FFD700", C.sand][i % 4], borderRadius: i % 2 ? "50%" : "0", left: `${Math.random() * 100}%`, top: "-10px", animation: `confetti ${1 + Math.random() * 2}s ease-in forwards`, animationDelay: `${Math.random() * 0.5}s` }} />)}
      <div style={{ fontSize: "64px", animation: "scaleIn 0.6s ease 0.2s both" }}>👑</div>
      <div style={{ fontSize: "48px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream, marginTop: "16px", fontStyle: "italic", animation: "scaleIn 0.6s ease 0.4s both" }}>LEVEL UP!</div>
      <div style={{ fontSize: "12px", letterSpacing: "4px", color: "rgba(245,240,235,0.5)", marginTop: "16px", animation: "fadeUp 0.5s ease 0.6s both" }}>NEW STATUS UNLOCKED</div>
      <div style={{ fontSize: "36px", fontFamily: "'Playfair Display', serif", color: C.cream, marginTop: "8px", animation: "fadeUp 0.5s ease 0.7s both" }}>{era.name}</div>
      <button onClick={onClose} style={{ marginTop: "40px", padding: "16px 48px", background: C.cream, border: "none", borderRadius: "50px", color: C.black, fontSize: "14px", fontWeight: "700", cursor: "pointer", letterSpacing: "2px", fontFamily: "'DM Sans', sans-serif", animation: "fadeUp 0.5s ease 0.9s both" }}>CELEBRATE</button>
      <div onClick={() => { if (navigator.share) navigator.share({ title: "Cereza", text: `Ich bin jetzt ${era.name} bei Cereza! 🍒🍕`, url: "https://cereza-pizza.de" }); }} style={{ marginTop: "14px", color: "rgba(245,240,235,0.4)", fontSize: "12px", cursor: "pointer", animation: "fadeUp 0.5s ease 1s both" }}>📤 Auf Instagram teilen</div>
    </div>
  );
};

// ─── Home ───────────────────────────────────────────────────────
const HomeTab = ({ user, setUser }) => {
  const era = ERAS.find(e => e.level === user.level);
  const next = ERAS.find(e => e.level === user.level + 1);
  const pct = next ? Math.round(((user.pts - era.ptsNeeded) / (next.ptsNeeded - era.ptsNeeded)) * 100) : 100;
  const [fi, setFi] = useState(0);
  useEffect(() => { const t = setInterval(() => setFi(i => (i + 1) % FUN_FACTS.length), 5000); return () => clearInterval(t); }, []);

  return (
    <div style={{ paddingBottom: "100px" }}>
      {/* Red Header */}
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "20px 20px 28px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.25)", borderRadius: "20px", padding: "5px 12px", fontSize: "11px", color: C.cream, fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>🔥 {user.streak} DAY STREAK</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "42px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream, letterSpacing: "2px", lineHeight: 1 }}>CEREZA</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "20px", padding: "6px 14px", color: C.cream, fontSize: "16px", fontWeight: "800" }}>{user.pts} <span style={{ fontSize: "10px", fontWeight: "600", opacity: 0.7 }}>PTS</span></div>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: C.red, fontSize: "18px" }}>★</span></div>
          </div>
        </div>
        <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "8px 14px" }}>
          <span style={{ fontSize: "14px", color: C.cream }}>↩</span>
          <div style={{ color: "rgba(245,240,235,0.8)", fontSize: "12px", overflow: "hidden", whiteSpace: "nowrap", flex: 1 }}>{FUN_FACTS[fi]}</div>
        </div>
      </div>

      <div style={{ padding: "16px", background: C.bg }}>
        {/* MY ERA */}
        <Card style={{ marginBottom: "14px", animation: "fadeUp 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: C.sand, borderRadius: "12px", padding: "4px 10px", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: C.darkGreen, marginBottom: "8px" }}>👑 MY ERA</div>
              <div style={{ fontSize: "38px", fontFamily: "'Playfair Display', serif", fontWeight: "700", color: C.red, lineHeight: 1 }}>{era.name}</div>
              <div style={{ fontSize: "12px", color: C.grey, marginTop: "6px", fontWeight: "600", letterSpacing: "0.5px" }}>NEXT: {next ? `${next.name.toUpperCase()} (${next.ptsNeeded - user.pts} PTS)` : "MAX LEVEL"}</div>
            </div>
            <div style={{ position: "relative", width: "52px", height: "52px" }}>
              <svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke={C.sand} strokeWidth="4" /><circle cx="26" cy="26" r="22" fill="none" stroke={C.red} strokeWidth="4" strokeDasharray={`${pct * 1.38} 138`} strokeLinecap="round" transform="rotate(-90 26 26)" /></svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800", color: C.black }}>{pct}%</div>
            </div>
          </div>
          <div style={{ height: "8px", background: C.sand, borderRadius: "4px", overflow: "hidden", marginTop: "16px" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: "4px", background: C.black, transition: "width 1s ease" }} />
          </div>

          {/* Treat Tracker */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: C.black }}>TREAT TRACKER</div>
              <div style={{ background: C.black, color: C.cream, borderRadius: "10px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>{user.treatCount}/{user.treatGoal}</div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {[...Array(user.treatGoal)].map((_, i) => (
                <div key={i} style={{ flex: 1, height: "40px", borderRadius: "6px", background: i < user.treatCount ? C.red : i === user.treatCount ? `${C.red}40` : C.sand, transition: "all 0.3s" }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button style={{ flex: 1, padding: "14px", background: C.black, border: "none", borderRadius: "14px", color: C.cream, fontSize: "14px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontFamily: "'DM Sans', sans-serif", letterSpacing: "1px" }}>⊞ SCAN</button>
            <button style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(193,39,45,0.1)", border: "none", fontSize: "20px", cursor: "pointer", color: C.red }}>+</button>
          </div>
        </Card>

        {/* Missions */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px", marginBottom: "10px" }}>
            <div style={{ color: C.cream, fontSize: "15px", fontWeight: "700" }}>⊚ Missions</div>
            <div style={{ color: C.grey, fontSize: "12px" }}>Week 13</div>
          </div>
          {MISSIONS.map((m, i) => (
            <Card key={m.id} style={{ marginBottom: "8px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: C.black }}>{m.title}</div>
                <div style={{ fontSize: "11px", color: C.grey, marginTop: "2px" }}>{m.desc}</div>
                {m.progress < m.goal && <div style={{ height: "3px", background: C.sand, borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}><div style={{ height: "100%", width: `${(m.progress / m.goal) * 100}%`, background: "#4CAF50", borderRadius: "2px" }} /></div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: m.progress >= m.goal ? "#4CAF50" : C.red }}>{m.progress}/{m.goal}</div>
                <div style={{ fontSize: "10px", color: C.grey }}>PROGRESS</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Matcha Society Abo */}
        {!user.is_abo_member && (
          <div style={{
            background: "linear-gradient(135deg, #1a3a1a, #2D4A2D)", borderRadius: "20px",
            padding: "22px", marginBottom: "14px", position: "relative", overflow: "hidden",
            border: "1px solid rgba(45,74,45,0.4)", animation: "fadeUp 0.4s ease 0.15s both"
          }}>
            <div style={{ position: "absolute", top: "-20px", right: "-20px", fontSize: "80px", opacity: 0.08 }}>🍵</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "12px", padding: "4px 10px", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: "#8BC34A", marginBottom: "10px" }}>💎 EXKLUSIV</div>
            <div style={{ fontSize: "22px", fontFamily: "'Playfair Display', serif", fontWeight: "700", color: "#C8E6C9", lineHeight: 1.2 }}>Matcha Society</div>
            <div style={{ fontSize: "12px", color: "rgba(200,230,201,0.7)", marginTop: "6px", lineHeight: 1.4 }}>
              2x Matcha/Woche · +50% PTS Boost · Priority Seating · Exklusive Events
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "14px" }}>
              <button style={{
                padding: "12px 24px", background: "#8BC34A", border: "none",
                borderRadius: "12px", color: "#1a3a1a", fontSize: "13px", fontWeight: "800",
                cursor: "pointer", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif"
              }}>ABO STARTEN · 29,99€/Mo</button>
              <div style={{ fontSize: "11px", color: "rgba(200,230,201,0.5)" }}>Stripe · PayPal</div>
            </div>
          </div>
        )}

        {user.is_abo_member && (
          <div style={{
            background: "linear-gradient(135deg, #1a3a1a, #2D4A2D)", borderRadius: "20px",
            padding: "16px 20px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px",
            border: "1px solid rgba(139,195,74,0.3)"
          }}>
            <span style={{ fontSize: "24px" }}>🍵</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#C8E6C9" }}>Matcha Society Aktiv</div>
              <div style={{ fontSize: "11px", color: "rgba(200,230,201,0.5)" }}>+50% PTS · 2x Matcha/Woche</div>
            </div>
            <div style={{ background: "#8BC34A", color: "#1a3a1a", borderRadius: "10px", padding: "3px 10px", fontSize: "10px", fontWeight: "800" }}>MEMBER</div>
          </div>
        )}

        {/* Top 10 */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.black, letterSpacing: "1px" }}>🏆 TOP 10 · MÄRZ</div>
            <div style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "1px", color: C.red, background: "rgba(193,39,45,0.1)", padding: "3px 8px", borderRadius: "8px" }}>LIVE</div>
          </div>
          {LEADERBOARD.slice(0, 5).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.sand}` : "none" }}>
              <div style={{ width: "24px", fontSize: "14px", textAlign: "center", fontWeight: "800", color: i < 3 ? C.red : C.grey }}>{i < 3 ? ["🥇","🥈","🥉"][i] : p.rank}</div>
              <div style={{ flex: 1, fontSize: "14px", fontWeight: p.name === "Marco" ? "700" : "500", color: C.black }}>{p.name} {p.name === "Marco" && <span style={{ color: C.red, fontSize: "11px" }}>(Du)</span>}</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: C.darkGreen }}>{p.pts} PTS</div>
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
  const [spun, setSpun] = useState(user.wheelSpunToday);
  const spin = () => {
    if (spinning || spun) return;
    setSpinning(true); setResult(null);
    const idx = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const seg = 360 / WHEEL_PRIZES.length;
    setRot(r => r + 360 * 5 + (360 - idx * seg - seg / 2));
    setTimeout(() => { setSpinning(false); setSpun(true); setResult(WHEEL_PRIZES[idx]); if (WHEEL_PRIZES[idx].value > 0) setUser(u => ({ ...u, pts: u.pts + WHEEL_PRIZES[idx].value })); }, 4000);
  };
  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: "100px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "24px 20px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(245,240,235,0.6)" }}>DAILY</div>
        <div style={{ fontSize: "28px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream }}>Glücksrad</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px" }}>
        <div style={{ position: "relative", marginBottom: "28px" }}>
          <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", zIndex: 2, fontSize: "20px", color: C.cream }}>▼</div>
          <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" : "none", filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))" }}>
            {WHEEL_PRIZES.map((p, i) => { const seg = 360 / WHEEL_PRIZES.length; const s = (i * seg - 90) * Math.PI / 180; const e = ((i + 1) * seg - 90) * Math.PI / 180; const mid = (s + e) / 2; return (<g key={i}><path d={`M130,130 L${130+115*Math.cos(s)},${130+115*Math.sin(s)} A115,115 0 0,1 ${130+115*Math.cos(e)},${130+115*Math.sin(e)} Z`} fill={p.bg} stroke="rgba(245,240,235,0.1)" strokeWidth="1" /><text x={130+75*Math.cos(mid)} y={130+75*Math.sin(mid)} transform={`rotate(${i*seg+seg/2}, ${130+75*Math.cos(mid)}, ${130+75*Math.sin(mid)})`} textAnchor="middle" dominantBaseline="middle" fill={C.cream} fontSize="10" fontWeight="700">{p.label}</text></g>); })}
            <circle cx="130" cy="130" r="22" fill={C.bg} stroke={C.red} strokeWidth="3" />
            <text x="130" y="133" textAnchor="middle" dominantBaseline="middle" fill={C.cream} fontSize="14" fontWeight="900">C</text>
          </svg>
        </div>
        <button onClick={spin} disabled={spinning || spun} style={{ padding: "14px 48px", background: spun ? C.sand : C.cream, border: "none", borderRadius: "50px", color: spun ? C.grey : C.black, fontSize: "14px", fontWeight: "800", letterSpacing: "2px", cursor: spun ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>{spun ? "MORGEN WIEDER" : spinning ? "..." : "DREHEN"}</button>
        {result && <div style={{ marginTop: "24px", textAlign: "center", animation: "scaleIn 0.4s ease" }}><div style={{ fontSize: "48px" }}>{result.value > 0 ? "🎉" : result.value === -1 ? "⚡" : "😅"}</div><div style={{ color: C.cream, fontSize: "20px", fontWeight: "700", marginTop: "8px" }}>{result.value > 0 ? `+${result.value} PTS!` : result.value === -1 ? "2x PTS heute!" : "Nächstes Mal!"}</div></div>}
      </div>
    </div>
  );
};

// ─── Scan ───────────────────────────────────────────────────────
const ScanTab = ({ user, setUser }) => {
  const [scanning, setScanning] = useState(false); const [done, setDone] = useState(false); const [pts, setPts] = useState(0);
  const scan = () => { setScanning(true); setTimeout(() => { const p = Math.floor(Math.random() * 100) + 50; setPts(p); setUser(u => ({ ...u, pts: u.pts + p, totalVisits: u.totalVisits + 1, treatCount: Math.min(u.treatCount + 1, u.treatGoal) })); setScanning(false); setDone(true); }, 2500); };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      {!done ? (<>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: C.grey }}>QR CODE</div>
        <div style={{ fontSize: "28px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream, marginBottom: "32px", marginTop: "6px" }}>Punkte sammeln</div>
        <div style={{ width: "220px", height: "220px", borderRadius: "20px", border: `2px solid rgba(193,39,45,0.4)`, position: "relative", overflow: "hidden", background: "rgba(193,39,45,0.05)", animation: scanning ? "glow 1.5s ease infinite" : "none" }}>
          {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => <div key={i} style={{ position: "absolute", [y?"bottom":"top"]: "10px", [x?"right":"left"]: "10px", width: "28px", height: "28px", borderTop: !y ? `3px solid ${C.red}` : "none", borderBottom: y ? `3px solid ${C.red}` : "none", borderLeft: !x ? `3px solid ${C.red}` : "none", borderRight: x ? `3px solid ${C.red}` : "none" }} />)}
          {scanning && <div style={{ position: "absolute", left: "10%", right: "10%", height: "2px", background: `linear-gradient(90deg, transparent, ${C.red}, transparent)`, animation: "scanLine 2s ease infinite", boxShadow: `0 0 12px ${C.red}` }} />}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.grey, fontSize: "14px" }}>{scanning ? "Scanne..." : "📷"}</div>
        </div>
        <button onClick={scan} disabled={scanning} style={{ marginTop: "28px", padding: "14px 40px", background: C.cream, border: "none", borderRadius: "50px", color: C.black, fontSize: "14px", fontWeight: "700", letterSpacing: "1px", cursor: scanning ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>{scanning ? "SCANNE..." : "QR CODE SCANNEN"}</button>
        <div style={{ color: C.grey, fontSize: "11px", marginTop: "14px" }}>Scanne den QR-Code auf deinem Beleg</div>
      </>) : (
        <div style={{ textAlign: "center", animation: "scaleIn 0.4s ease" }}>
          <div style={{ fontSize: "56px" }}>🎉</div>
          <div style={{ fontSize: "36px", fontWeight: "900", color: C.cream, fontFamily: "'Playfair Display', serif" }}>+{pts} PTS</div>
          <div style={{ color: C.grey, fontSize: "13px", marginTop: "8px" }}>Punkte gutgeschrieben!</div>
          <button onClick={() => { setDone(false); setPts(0); }} style={{ marginTop: "24px", padding: "12px 32px", background: "rgba(245,240,235,0.1)", border: "1px solid rgba(245,240,235,0.2)", borderRadius: "50px", color: C.cream, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Nochmal scannen</button>
        </div>
      )}
    </div>
  );
};

// ─── Vote ───────────────────────────────────────────────────────
const VoteTab = ({ user }) => {
  const [idx, setIdx] = useState(0); const [dir, setDir] = useState(null); const [dishes, setDishes] = useState(SWIPE_DISHES);
  const swipe = (d) => { setDir(d); if (d === "right") setDishes(prev => prev.map((dish, i) => i === idx ? { ...dish, votes: dish.votes + 1 } : dish)); setTimeout(() => { setDir(null); setIdx(i => i + 1); }, 300); };
  const dish = dishes[idx];
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: "100px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "24px 20px 28px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(245,240,235,0.6)" }}>COMMUNITY VOTE</div>
        <div style={{ fontSize: "28px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream }}>Nächste Pizza?</div>
      </div>
      <div style={{ padding: "20px 16px" }}>
        {dish ? (<>
          <Card style={{ padding: 0, overflow: "hidden", maxWidth: "360px", margin: "0 auto", animation: dir === "left" ? "swipeL 0.3s ease forwards" : dir === "right" ? "swipeR 0.3s ease forwards" : "fadeUp 0.3s ease" }}>
            <div style={{ height: "200px", background: `linear-gradient(135deg, ${C.sand}, ${C.cream})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "72px", position: "relative" }}>🍕<div style={{ position: "absolute", bottom: "10px", right: "12px", background: C.black, color: C.cream, borderRadius: "16px", padding: "3px 10px", fontSize: "11px", fontWeight: "700" }}>♥ {dish.votes}</div></div>
            <div style={{ padding: "18px" }}><div style={{ fontSize: "22px", fontFamily: "'Playfair Display', serif", fontWeight: "700", color: C.black }}>{dish.name}</div><div style={{ fontSize: "13px", color: C.grey, marginTop: "4px" }}>{dish.desc}</div></div>
          </Card>
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" }}>
            <button onClick={() => swipe("left")} style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(245,240,235,0.15)", color: C.cream, fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            <button onClick={() => swipe("right")} style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(193,39,45,0.2)", border: `2px solid ${C.red}`, color: C.red, fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>♥</button>
          </div>
        </>) : (<div style={{ textAlign: "center", marginTop: "60px" }}><div style={{ fontSize: "48px" }}>🍕</div><div style={{ color: C.cream, fontSize: "18px", fontWeight: "700", marginTop: "12px" }}>Alle gevotet!</div></div>)}
        {user.level >= 4 && <div style={{ textAlign: "center", marginTop: "28px" }}><button style={{ padding: "10px 24px", background: "rgba(245,240,235,0.08)", border: "1px solid rgba(245,240,235,0.2)", borderRadius: "50px", color: C.cream, fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✨ Gericht vorschlagen</button></div>}
      </div>
    </div>
  );
};

// ─── Shop ───────────────────────────────────────────────────────
const ShopTab = ({ user, setUser }) => {
  const [rd, setRd] = useState(null);
  const redeem = (item) => { if (user.pts < item.cost || user.level < item.level) return; setUser(u => ({ ...u, pts: u.pts - item.cost })); setRd(item); setTimeout(() => setRd(null), 2500); };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: "100px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "24px 20px 28px", textAlign: "center" }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "rgba(245,240,235,0.6)" }}>POINTS SHOP</div>
        <div style={{ fontSize: "28px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream }}>Einlösen</div>
        <div style={{ color: "rgba(245,240,235,0.6)", fontSize: "13px", marginTop: "6px" }}>Guthaben: <strong style={{ color: C.cream }}>{user.pts} PTS</strong></div>
      </div>
      {rd && <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(10,2,2,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "scaleIn 0.3s ease" }}><div style={{ fontSize: "56px" }}>{rd.icon}</div><div style={{ color: C.cream, fontSize: "22px", fontWeight: "700", marginTop: "12px" }}>Eingelöst!</div><div style={{ color: C.grey, fontSize: "12px", marginTop: "6px" }}>Zeige dies an der Kasse</div></div>}
      <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {SHOP_ITEMS.map((item, i) => { const ok = user.pts >= item.cost && user.level >= item.level; const locked = user.level < item.level; return (
          <Card key={item.id} onClick={() => ok && redeem(item)} style={{ padding: "18px 14px", textAlign: "center", opacity: locked ? 0.45 : 1, cursor: ok ? "pointer" : "default", border: ok ? `2px solid ${C.red}` : "2px solid transparent", animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>{item.icon}</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.black }}>{item.name}</div>
            <div style={{ marginTop: "10px", display: "inline-block", padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: "700", background: ok ? C.red : C.sand, color: ok ? C.cream : locked ? C.grey : C.black }}>{locked ? `🔒 Level ${item.level}` : `${item.cost} PTS`}</div>
          </Card>
        ); })}
      </div>
    </div>
  );
};

// ─── Profile ────────────────────────────────────────────────────
const ProfileTab = ({ user, onLogout }) => {
  const era = ERAS.find(e => e.level === user.level);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: "100px" }}>
      <div style={{ background: `linear-gradient(180deg, ${C.darkRed}, ${C.red})`, padding: "30px 20px 36px", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", margin: "0 auto 12px", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", border: "3px solid rgba(255,255,255,0.3)" }}>🍒</div>
        <div style={{ fontSize: "24px", fontFamily: "'Playfair Display', serif", fontWeight: "700", color: C.cream }}>{user.name}</div>
        <div style={{ color: "rgba(245,240,235,0.6)", fontSize: "12px", marginTop: "4px" }}>{era.name} · Level {user.level}</div>
      </div>
      <div style={{ padding: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          {[{ v: user.pts, l: "PTS" }, { v: user.totalVisits, l: "Besuche" }, { v: `${user.streak}🔥`, l: "Streak" }].map((s, i) => <Card key={i} style={{ padding: "14px", textAlign: "center" }}><div style={{ fontSize: "20px", fontWeight: "800", color: C.black }}>{s.v}</div><div style={{ fontSize: "10px", color: C.grey, marginTop: "2px" }}>{s.l}</div></Card>)}
        </div>
        <Card style={{ marginBottom: "14px" }}>
          {[{ icon: "📧", label: "E-Mail", value: user.email }, { icon: "📸", label: "Instagram", value: user.instagram || "Nicht verknüpft" }, { icon: "🔔", label: "Notifications", value: "Aktiv" }, { icon: "🛡️", label: "DSGVO", value: "Akzeptiert ✓" }].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: i < 3 ? `1px solid ${C.sand}` : "none" }}>
              <span style={{ fontSize: "16px" }}>{r.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: "10px", color: C.grey }}>{r.label}</div><div style={{ fontSize: "13px", color: C.black, fontWeight: "500" }}>{r.value}</div></div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: C.black, marginBottom: "12px" }}>ERA JOURNEY</div>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
            {ERAS.map((e, i) => <div key={i} style={{ width: "48px", height: "48px", borderRadius: "50%", background: user.level >= e.level ? C.red : C.sand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: user.level >= e.level ? "16px" : "12px", fontWeight: "800", color: user.level >= e.level ? C.cream : C.grey, border: user.level === e.level ? `3px solid ${C.black}` : "none" }}>{user.level >= e.level ? e.level : "🔒"}</div>)}
          </div>
        </Card>
        <button onClick={onLogout} style={{ width: "100%", marginTop: "16px", padding: "13px", background: "transparent", border: "1px solid rgba(245,240,235,0.15)", borderRadius: "12px", color: C.grey, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Ausloggen</button>
      </div>
    </div>
  );
};

// ─── Admin ──────────────────────────────────────────────────────
const AdminPanel = ({ onClose }) => {
  const [tab, setTab] = useState("users");
  const tabs = [{ id: "users", l: "👥 User" }, { id: "points", l: "⚙️ Punkte" }, { id: "missions", l: "🎯 Missionen" }, { id: "glow", l: "⚡ Glow" }, { id: "dishes", l: "🍕 Gerichte" }, { id: "abo", l: "💎 Abos" }];
  const users = [{ name: "Sophia", level: 4, pts: 3200, last: "Heute", visits: 47, email: "sophia@mail.de" }, { name: "Luca", level: 4, pts: 2800, last: "Gestern", visits: 38, email: "luca@mail.de" }, { name: "Marco", level: 3, pts: 1450, last: "23.03.", visits: 24, email: "marco@test.de" }, { name: "Elena", level: 3, pts: 1100, last: "22.03.", visits: 21, email: "elena@mail.de" }, { name: "Tom", level: 2, pts: 900, last: "20.03.", visits: 15, email: "tom@mail.de" }];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, overflow: "auto" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(245,240,235,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
        <div><div style={{ color: C.cream, fontSize: "16px", fontWeight: "800" }}>Admin Panel</div><div style={{ color: C.grey, fontSize: "10px" }}>Cereza Pizza · Frankfurt</div></div>
        <button onClick={onClose} style={{ background: "rgba(245,240,235,0.08)", border: "none", borderRadius: "8px", padding: "7px 14px", color: C.cream, cursor: "pointer", fontSize: "12px" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: "4px", padding: "10px 12px", overflowX: "auto", borderBottom: "1px solid rgba(245,240,235,0.05)" }}>
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 12px", borderRadius: "16px", border: "none", background: tab === t.id ? C.red : "transparent", color: tab === t.id ? C.cream : C.grey, fontSize: "11px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>{t.l}</button>)}
      </div>
      <div style={{ padding: "14px" }}>
        {tab === "users" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
            {[{ v: "5", l: "Aktive User" }, { v: "3", l: "Heute da" }, { v: "87%", l: "Retention" }].map((s, i) => <Card key={i} style={{ padding: "12px", textAlign: "center" }}><div style={{ fontSize: "20px", fontWeight: "800", color: C.red }}>{s.v}</div><div style={{ fontSize: "9px", color: C.grey }}>{s.l}</div></Card>)}
          </div>
          {users.map((u, i) => <Card key={i} style={{ marginBottom: "6px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", color: C.cream, fontSize: "13px", fontWeight: "800" }}>{u.level}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "700", color: C.black }}>{u.name}</div><div style={{ fontSize: "10px", color: C.grey }}>{u.email} · {u.last}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: "13px", fontWeight: "700", color: C.red }}>{u.pts} PTS</div><div style={{ fontSize: "9px", color: C.grey }}>{u.visits} Besuche</div></div>
            <button style={{ background: C.sand, border: "none", borderRadius: "6px", padding: "5px 8px", fontSize: "10px", fontWeight: "700", color: C.black, cursor: "pointer" }}>+PTS</button>
          </Card>)}
        </>)}
        {tab === "points" && (<>
          <div style={{ color: C.cream, fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Era System</div>
          {ERAS.map((e, i) => <Card key={i} style={{ marginBottom: "8px", padding: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: C.red, color: C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "800" }}>{e.level}</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: "700", fontSize: "14px", color: C.black }}>{e.name}</div><div style={{ fontSize: "11px", color: C.grey }}>{e.ptsNeeded} PTS</div></div>
            <button style={{ background: C.sand, border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", cursor: "pointer" }}>Bearbeiten</button>
          </Card>)}
        </>)}
        {tab === "missions" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ color: C.cream, fontSize: "14px", fontWeight: "700" }}>Wöchentliche Missionen</div>
            <button style={{ background: C.red, border: "none", borderRadius: "8px", padding: "6px 14px", color: C.cream, fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>+ Neu</button>
          </div>
          {MISSIONS.map(m => <Card key={m.id} style={{ marginBottom: "6px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>{m.icon}</span><div style={{ flex: 1 }}><div style={{ fontSize: "13px", fontWeight: "700", color: C.black }}>{m.title}</div><div style={{ fontSize: "10px", color: C.grey }}>{m.desc}</div></div>
            <div style={{ color: C.red, fontSize: "12px", fontWeight: "700" }}>+{m.pts}</div>
          </Card>)}
        </>)}
        {tab === "glow" && (<>
          <div style={{ color: C.cream, fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>⚡ Glow Hour (3x/Woche)</div>
          {["Montag 12:00–14:00", "Mittwoch 18:00–20:00", "Freitag 12:00–14:00"].map((d, i) => <Card key={i} style={{ marginBottom: "8px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: "700", color: C.black }}>{d.split(" ")[0]}</div><div style={{ color: C.grey, fontSize: "12px" }}>{d.split(" ")[1]}</div></div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "12px", color: C.red, fontWeight: "700" }}>2x PTS</span><button style={{ background: C.sand, border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "10px", cursor: "pointer" }}>Ändern</button></div>
          </Card>)}
        </>)}
        {tab === "dishes" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><div style={{ color: C.cream, fontSize: "14px", fontWeight: "700" }}>Community Voting</div><button style={{ background: C.red, border: "none", borderRadius: "8px", padding: "6px 14px", color: C.cream, fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>+ Neu</button></div>
          {SWIPE_DISHES.map(d => <Card key={d.id} style={{ marginBottom: "6px", padding: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "28px" }}>🍕</div><div style={{ flex: 1 }}><div style={{ fontWeight: "700", fontSize: "13px", color: C.black }}>{d.name}</div><div style={{ fontSize: "10px", color: C.grey }}>{d.desc}</div></div>
            <div style={{ background: C.red, color: C.cream, borderRadius: "12px", padding: "3px 10px", fontSize: "12px", fontWeight: "700" }}>♥ {d.votes}</div>
          </Card>)}
        </>)}
        {tab === "abo" && (<>
          <div style={{ color: C.cream, fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>💎 Matcha Society</div>
          <Card style={{ padding: "20px" }}>
            <div style={{ fontSize: "20px", fontFamily: "'Playfair Display', serif", fontWeight: "700", color: C.red, marginBottom: "12px" }}>Matcha Society</div>
            {[{ l: "Preis/Monat", v: "29,99€" }, { l: "Abonnenten", v: "12" }, { l: "Zahlung", v: "Stripe + PayPal" }, { l: "Enthält", v: "2x Matcha/Woche, +50% PTS" }].map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 3 ? `1px solid ${C.sand}` : "none", fontSize: "13px" }}><span style={{ color: C.grey }}>{r.l}</span><span style={{ fontWeight: "700", color: C.black }}>{r.v}</span></div>)}
          </Card>
        </>)}
      </div>
    </div>
  );
};

const AdminLogin = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const submit = () => { if (email === "Info@cereza.de" && pw === "Cereza123") onLogin(); else setErr("Falsche Zugangsdaten"); };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <style>{globalCSS}</style>
      <div style={{ fontSize: "14px", color: C.grey, letterSpacing: "4px", marginBottom: "8px" }}>ADMIN</div>
      <div style={{ fontSize: "28px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream, marginBottom: "32px" }}>Login</div>
      <div style={{ width: "100%", maxWidth: "320px" }}>
        <input type="email" placeholder="Admin E-Mail" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "13px 16px", background: "rgba(245,240,235,0.06)", border: "1px solid rgba(245,240,235,0.12)", borderRadius: "10px", color: C.cream, fontSize: "14px", outline: "none", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
        <input type="password" placeholder="Passwort" value={pw} onChange={e => setPw(e.target.value)} style={{ width: "100%", padding: "13px 16px", background: "rgba(245,240,235,0.06)", border: "1px solid rgba(245,240,235,0.12)", borderRadius: "10px", color: C.cream, fontSize: "14px", outline: "none", marginBottom: "12px", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
        {err && <div style={{ color: "#ff6b6b", fontSize: "12px", textAlign: "center", marginBottom: "8px" }}>{err}</div>}
        <button onClick={submit} style={{ width: "100%", padding: "14px", background: C.red, border: "none", borderRadius: "12px", color: C.cream, fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>EINLOGGEN</button>
        <button onClick={onBack} style={{ width: "100%", marginTop: "10px", padding: "12px", background: "transparent", border: "1px solid rgba(245,240,235,0.12)", borderRadius: "12px", color: C.grey, fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Zurück</button>
      </div>
    </div>
  );
};

// ─── Main ───────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [showLevelUp, setShowLevelUp] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-restore session on mount
  useEffect(() => {
    if (!isSBReady()) { setLoading(false); return; }
    db.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await db.getProfile(session.user.id);
        if (profile) setUser(profile);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const newEra = [...ERAS].reverse().find(e => user.pts >= e.ptsNeeded);
    if (newEra && newEra.level > user.level) { setUser(u => ({ ...u, level: newEra.level })); setShowLevelUp(newEra.level); }
  }, [user?.pts]);

  if (loading) return (
    <div style={{ maxWidth: "430px", margin: "0 auto", minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{globalCSS}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "42px", fontFamily: "'Playfair Display', serif", fontWeight: "900", color: C.cream, letterSpacing: "2px" }}>CEREZA</div>
        <div style={{ fontSize: "10px", color: C.grey, letterSpacing: "4px", marginTop: "8px" }}>LOADING...</div>
      </div>
    </div>
  );

  if (!user && adminMode === false) return (
    <div style={{ maxWidth: "430px", margin: "0 auto", position: "relative" }}>
      <AuthScreen onLogin={setUser} />
      <div onClick={() => setAdminMode("login")} style={{ position: "fixed", bottom: "12px", left: "50%", transform: "translateX(-50%)", color: "rgba(245,240,235,0.12)", fontSize: "10px", cursor: "pointer", padding: "4px 12px", letterSpacing: "2px" }}>ADMIN</div>
    </div>
  );
  if (adminMode === "login") return <div style={{ maxWidth: "430px", margin: "0 auto" }}><AdminLogin onLogin={() => setAdminMode("panel")} onBack={() => setAdminMode(false)} /></div>;
  if (adminMode === "panel") return <div style={{ maxWidth: "430px", margin: "0 auto" }}><AdminPanel onClose={() => setAdminMode(false)} /></div>;

  const nav = [{ id: "home", icon: "⌂", label: "Home" }, { id: "wheel", icon: "◎", label: "Daily" }, { id: "scan", icon: "⊞", label: "Scan" }, { id: "vote", icon: "♥", label: "Vote" }, { id: "shop", icon: "✦", label: "Shop" }];

  return (
    <div style={{ maxWidth: "430px", margin: "0 auto", fontFamily: "'DM Sans', sans-serif", background: C.bg, minHeight: "100vh" }}>
      <style>{globalCSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}
      {activeTab === "home" && <HomeTab user={user} setUser={setUser} />}
      {activeTab === "wheel" && <WheelTab user={user} setUser={setUser} />}
      {activeTab === "scan" && <ScanTab user={user} setUser={setUser} />}
      {activeTab === "vote" && <VoteTab user={user} />}
      {activeTab === "shop" && <ShopTab user={user} setUser={setUser} />}
      {activeTab === "profile" && <ProfileTab user={user} onLogout={async () => { if (isSBReady()) await db.signOut(); setUser(null); setAdminMode(false); }} />}

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "430px", zIndex: 50, background: `linear-gradient(180deg, transparent 0%, ${C.bg} 30%)`, paddingTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "6px 6px 22px", background: "rgba(26,5,5,0.98)", borderTop: "1px solid rgba(245,240,235,0.06)", borderRadius: "18px 18px 0 0" }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "none", border: "none", cursor: "pointer", opacity: activeTab === n.id ? 1 : 0.35, transition: "opacity 0.2s" }}>
              {n.id === "scan" ? <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: C.red, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-18px", border: `3px solid ${C.bg}`, fontSize: "18px", color: C.cream }}>{n.icon}</div> : <span style={{ fontSize: "18px", color: C.cream }}>{n.icon}</span>}
              <span style={{ fontSize: "9px", color: C.cream, letterSpacing: "0.5px" }}>{n.label}</span>
            </button>
          ))}
          <button onClick={() => setActiveTab("profile")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "none", border: "none", cursor: "pointer", opacity: activeTab === "profile" ? 1 : 0.35 }}>
            <span style={{ fontSize: "18px", color: C.cream }}>○</span>
            <span style={{ fontSize: "9px", color: C.cream }}>Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}
