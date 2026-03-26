import { useState, useEffect, useRef } from "react";
import supabase, { db } from "./supabase";

// ─── Brand System (Cereza Design Guide) ─────────────────────────
const C = {
  beige: "#e6dcca", beigeDark: "#e5d2b5", greyBg: "#f5f5f5",
  orange: "#e24a28", salmon: "#fa8072", green: "#2d472a",
  text: "#111111", textSub: "#463939", textLight: "#999999", textMuted: "#d1d1d1",
  white: "#ffffff", border: "#e3e3e3",
};
const font = { ui: "'Aileron', 'Source Sans Pro', 'Helvetica Neue', sans-serif", display: "'Gallica', Georgia, serif" };

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
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap');
  @font-face { font-family: 'Aileron'; src: url('https://fonts.cdnfonts.com/css/aileron'); font-display: swap; }
  @font-face { font-family: 'Gallica'; src: url('https://fonts.cdnfonts.com/css/galica'); font-display: swap; }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body,#root{height:100%;width:100%;overflow:hidden;position:fixed;inset:0;background:${C.beige};overscroll-behavior:none;user-select:none;-webkit-user-select:none}
  input,textarea{user-select:text;-webkit-user-select:text}
  input::placeholder{color:${C.textLight}}
  ::-webkit-scrollbar{display:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(226,74,40,0.2)}50%{box-shadow:0 0 20px rgba(226,74,40,0.5)}}
  @keyframes scanLine{0%,100%{top:12%}50%{top:82%}}
`;

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.white, borderRadius: "16px", padding: "18px", color: C.text, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

// ─── Auth ───────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [username, setUsername] = useState(""); const [phone, setPhone] = useState("");
  const [dsgvo, setDsgvo] = useState(false);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);

  const inp = (ph, val, set, type="text") => (
    <input type={type} placeholder={ph} value={val} onChange={e=>set(e.target.value)}
      style={{ width:"100%", padding:"13px 16px", background:C.white, border:`1px solid ${C.border}`, borderRadius:"12px", color:C.text, fontSize:"15px", outline:"none", fontFamily:font.ui, marginBottom:"10px", boxSizing:"border-box" }} />
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
        if (profile) onLogin(profile); else setErr("profil nicht gefunden");
      } else {
        const { data, error } = await db.signUp(email, pw, username);
        if (error) { setErr(error.message); setLoading(false); return; }
        if (data.user) {
          // Wait for trigger to create profile
          await new Promise(r => setTimeout(r, 2000));
          // Try update with extra fields
          await db.updateProfile(data.user.id, { name: username, phone }).catch(() => {});
          // Always login directly - build profile from known data
          const profile = await db.getProfile(data.user.id).catch(() => null);
          onLogin(profile || { id: data.user.id, name: username, email, phone, pts: 0, level: 1, streak: 0, total_visits: 0, treat_count: 0, treat_goal: 8, wheel_spun_today: false, is_abo_member: false, is_admin: false });
        }
      }
    } catch (e) { setErr("verbindungsfehler: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px", background:C.beige, fontFamily:font.ui }}>
      <style>{CSS}</style>
      <div style={{ animation:"fadeUp 0.6s ease", marginBottom:"36px", textAlign:"center" }}>
        <div style={{ fontSize:"56px", fontFamily:font.display, color:C.text, letterSpacing:"2px", fontWeight:"700" }}>cereza</div>
        <div style={{ fontSize:"11px", letterSpacing:"4px", color:C.textLight, marginTop:"6px" }}>loyalty club</div>
      </div>
      <div style={{ width:"100%", maxWidth:"340px", animation:"fadeUp 0.6s ease 0.1s both" }}>
        {mode === "register" && inp("username", username, setUsername)}
        {inp("e-mail adresse", email, setEmail, "email")}
        {inp("passwort (min. 6 zeichen)", pw, setPw, "password")}
        {mode === "register" && inp("handynummer", phone, setPhone, "tel")}
        {mode === "register" && (
          <div onClick={()=>setDsgvo(!dsgvo)} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"14px", cursor:"pointer", color:C.textSub, fontSize:"11px", lineHeight:1.4 }}>
            <div style={{ width:"18px", height:"18px", borderRadius:"4px", flexShrink:0, marginTop:"1px", border:`2px solid ${dsgvo ? C.orange : C.border}`, background:dsgvo ? C.orange : "transparent", display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:"11px", fontWeight:"700" }}>{dsgvo && "✓"}</div>
            ich stimme der datenschutzerklärung zu und akzeptiere die verarbeitung meiner daten gemäß dsgvo.
          </div>
        )}
        {err && <div style={{ color:C.orange, fontSize:"12px", marginBottom:"10px", textAlign:"center", lineHeight:1.4 }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%", padding:"14px", background:C.orange, border:"none", borderRadius:"12px", color:C.white, fontSize:"15px", fontWeight:"700", cursor:loading?"wait":"pointer", fontFamily:font.ui, opacity:loading?0.7:1 }}>
          {loading ? "..." : mode==="login" ? "einloggen" : "registrieren"}
        </button>
        <p style={{ textAlign:"center", marginTop:"18px", color:C.textLight, fontSize:"13px" }}>
          {mode==="login" ? "noch kein mitglied? " : "schon dabei? "}
          <span onClick={()=>{setMode(mode==="login"?"register":"login");setErr("")}} style={{ color:C.orange, cursor:"pointer", textDecoration:"underline" }}>
            {mode==="login" ? "jetzt beitreten" : "einloggen"}
          </span>
        </p>
      </div>
    </div>
  );
};

// ─── Level Up ───────────────────────────────────────────────────
const LevelUpOverlay = ({ level, onClose }) => {
  const era = ERAS[level-1];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:"fadeIn 0.4s", fontFamily:font.ui }}>
      {[...Array(20)].map((_,i)=><div key={i} style={{ position:"absolute", width:"6px", height:"6px", background:[C.orange,C.beige,"#FFD700",C.salmon][i%4], borderRadius:i%2?"50%":"0", left:`${Math.random()*100}%`, top:"-10px", animation:`confetti ${1+Math.random()*2}s ease-in forwards`, animationDelay:`${Math.random()*0.5}s` }} />)}
      <div style={{ fontSize:"56px", animation:"scaleIn 0.6s ease 0.2s both" }}>👑</div>
      <div style={{ fontSize:"42px", fontFamily:font.display, color:C.white, marginTop:"14px", animation:"scaleIn 0.6s ease 0.4s both", fontWeight:"700" }}>level up!</div>
      <div style={{ fontSize:"11px", letterSpacing:"4px", color:"rgba(255,255,255,0.5)", marginTop:"14px", animation:"fadeUp 0.5s ease 0.6s both" }}>new status unlocked</div>
      <div style={{ fontSize:"32px", fontFamily:font.display, color:C.white, marginTop:"6px", animation:"fadeUp 0.5s ease 0.7s both" }}>{era.name}</div>
      <button onClick={onClose} style={{ marginTop:"36px", padding:"14px 44px", background:C.orange, border:"none", borderRadius:"50px", color:C.white, fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:font.ui, animation:"fadeUp 0.5s ease 0.9s both" }}>celebrate 🎉</button>
    </div>
  );
};

// ─── Home ───────────────────────────────────────────────────────
const HomeTab = ({ user, setUser, setTab }) => {
  const era = ERAS.find(e=>e.level===(user.level||1)) || ERAS[0];
  const next = ERAS.find(e=>e.level===(user.level||1)+1);
  const pct = next ? Math.min(100,Math.round(((user.pts-era.ptsNeeded)/(next.ptsNeeded-era.ptsNeeded))*100)) : 100;
  const [fi,setFi] = useState(0);
  const [lb,setLb] = useState(MOCK_LB);

  useEffect(()=>{ const t=setInterval(()=>setFi(i=>(i+1)%FUN_FACTS.length),5000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ db.getLeaderboard().then(d=>{if(d.length)setLb(d)}); },[]);

  return (
    <div style={{ paddingBottom:"16px" }}>
      {/* Header */}
      <div style={{ padding:"18px 18px 20px", background:C.beige }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:"rgba(226,74,40,0.1)", borderRadius:"16px", padding:"4px 10px", fontSize:"11px", color:C.orange, fontWeight:"700", fontFamily:font.ui }}>🔥 {user.streak||0} week streak</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ background:C.white, borderRadius:"20px", padding:"5px 14px", fontSize:"15px", fontWeight:"700", fontFamily:font.ui, border:`1px solid ${C.border}` }}>{user.pts||0} <span style={{ fontSize:"10px", color:C.textLight }}>pts</span></div>
          </div>
        </div>
        <div style={{ fontSize:"52px", fontFamily:font.display, color:C.text, letterSpacing:"2px", fontWeight:"700", lineHeight:1 }}>cereza</div>
        {/* Fun Fact */}
        <div style={{ marginTop:"14px", background:C.white, borderRadius:"10px", padding:"10px 14px", border:`1px solid ${C.border}`, fontSize:"12px", color:C.textSub, fontFamily:font.ui }}>
          {FUN_FACTS[fi]}
        </div>
      </div>

      <div style={{ padding:"12px 14px", background:C.beige }}>
        {/* MY ERA */}
        <Card style={{ marginBottom:"10px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"inline-flex", background:C.beige, borderRadius:"10px", padding:"3px 10px", fontSize:"10px", fontWeight:"700", letterSpacing:"1px", color:C.green, marginBottom:"6px" }}>👑 my era</div>
              <div style={{ fontSize:"34px", fontFamily:font.display, color:C.orange, lineHeight:1, fontWeight:"700" }}>{era.name}</div>
              <div style={{ fontSize:"11px", color:C.textLight, marginTop:"6px", fontWeight:"600" }}>next: {next ? `${next.name} (${next.ptsNeeded-user.pts} pts)` : "max level"}</div>
            </div>
            <div style={{ position:"relative", width:"48px", height:"48px" }}>
              <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke={C.border} strokeWidth="3.5" /><circle cx="24" cy="24" r="20" fill="none" stroke={C.orange} strokeWidth="3.5" strokeDasharray={`${pct*1.26} 126`} strokeLinecap="round" transform="rotate(-90 24 24)" /></svg>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"700", color:C.text }}>{pct}%</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height:"6px", background:C.greyBg, borderRadius:"3px", overflow:"hidden", marginTop:"14px" }}>
            <div style={{ height:"100%", width:`${pct}%`, borderRadius:"3px", background:C.orange, transition:"width 1s" }} />
          </div>
          {/* Treat Tracker */}
          <div style={{ marginTop:"16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
              <div style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"1.5px", color:C.textSub }}>treat tracker</div>
              <div style={{ background:C.text, color:C.white, borderRadius:"8px", padding:"2px 7px", fontSize:"10px", fontWeight:"700" }}>{user.treat_count||0}/{user.treat_goal||8}</div>
            </div>
            <div style={{ display:"flex", gap:"4px" }}>
              {[...Array(user.treat_goal||8)].map((_,i)=><div key={i} style={{ flex:1, height:"32px", borderRadius:"5px", background:i<(user.treat_count||0)?C.orange:C.greyBg, transition:"all 0.3s" }} />)}
            </div>
          </div>
          {/* Scan */}
          <button onClick={()=>setTab("scan")} style={{ width:"100%", marginTop:"14px", padding:"13px", background:C.text, border:"none", borderRadius:"12px", color:C.white, fontSize:"14px", fontWeight:"700", cursor:"pointer", fontFamily:font.ui, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>📷 scan</button>
        </Card>

        {/* Matcha Society */}
        {!user.is_abo_member ? (
          <div style={{ background:C.green, borderRadius:"16px", padding:"18px", marginBottom:"10px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"-20px", right:"-16px", fontSize:"70px", opacity:0.06 }}>🍵</div>
            <div style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"1px", color:"#8BC34A", marginBottom:"6px" }}>💎 matcha society</div>
            <div style={{ fontSize:"18px", fontFamily:font.display, color:"#C8E6C9", fontWeight:"700" }}>werde member</div>
            <div style={{ fontSize:"11px", color:"rgba(200,230,201,0.6)", marginTop:"4px", lineHeight:1.4 }}>2x matcha/woche | +50% pts | priority seating</div>
            <button style={{ marginTop:"10px", padding:"10px 20px", background:"#8BC34A", border:"none", borderRadius:"10px", color:C.green, fontSize:"12px", fontWeight:"800", cursor:"pointer", fontFamily:font.ui }}>abo starten · 29,99€/mo</button>
          </div>
        ) : (
          <div style={{ background:C.green, borderRadius:"12px", padding:"12px 16px", marginBottom:"10px", display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontSize:"20px" }}>🍵</span>
            <div style={{ flex:1 }}><div style={{ fontSize:"12px", fontWeight:"700", color:"#C8E6C9" }}>matcha society aktiv</div></div>
            <div style={{ background:"#8BC34A", color:C.green, borderRadius:"6px", padding:"2px 8px", fontSize:"9px", fontWeight:"800" }}>member</div>
          </div>
        )}

        {/* Missions */}
        <div style={{ marginBottom:"10px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"0 2px", marginBottom:"8px" }}>
            <div style={{ fontSize:"14px", fontWeight:"700", color:C.text }}>⊚ missions</div>
            <div style={{ fontSize:"11px", color:C.textLight }}>week {Math.ceil((Date.now()-new Date(new Date().getFullYear(),0,1))/604800000)}</div>
          </div>
          {MOCK_MISSIONS.map((m,i)=>(
            <Card key={m.id} style={{ marginBottom:"6px", padding:"12px 14px", display:"flex", alignItems:"center", gap:"10px", animation:`fadeUp 0.3s ease ${i*0.05}s both` }}>
              <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:C.beige, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>{m.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>{m.title}</div>
                <div style={{ fontSize:"10px", color:C.textLight, marginTop:"1px" }}>{m.description}</div>
                {(m.progress||0)<m.goal && <div style={{ height:"3px", background:C.greyBg, borderRadius:"2px", marginTop:"6px" }}><div style={{ height:"100%", width:`${((m.progress||0)/m.goal)*100}%`, background:C.green, borderRadius:"2px" }}/></div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"11px", fontWeight:"700", color:(m.progress||0)>=m.goal?C.green:C.orange }}>{m.progress||0}/{m.goal}</div>
                <div style={{ fontSize:"9px", color:C.textLight }}>+{m.pts_reward} pts</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Top 10 */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
            <div style={{ fontSize:"13px", fontWeight:"700", letterSpacing:"0.5px" }}>🏆 top 10</div>
            <div style={{ fontSize:"9px", fontWeight:"700", color:C.orange, background:"rgba(226,74,40,0.08)", padding:"2px 7px", borderRadius:"6px" }}>live</div>
          </div>
          {lb.slice(0,5).map((p,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 0", borderBottom:i<4?`1px solid ${C.greyBg}`:"none" }}>
              <div style={{ width:"20px", fontSize:"12px", textAlign:"center", fontWeight:"800", color:i<3?C.orange:C.textLight }}>{i<3?["🥇","🥈","🥉"][i]:p.rank}</div>
              <div style={{ flex:1, fontSize:"13px", fontWeight:p.name===user.name?"700":"400", color:C.text }}>@{p.name} {p.name===user.name && <span style={{ color:C.orange, fontSize:"10px" }}>(du)</span>}</div>
              <div style={{ fontSize:"12px", fontWeight:"700", color:C.green }}>{p.pts} pts</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ─── Wheel ──────────────────────────────────────────────────────
const WheelTab = ({ user, setUser }) => {
  const [spinning,setSpinning]=useState(false); const [rot,setRot]=useState(0); const [result,setResult]=useState(null); const [spun,setSpun]=useState(user.wheel_spun_today||false);
  const spin = async()=>{
    if(spinning||spun)return; setSpinning(true); setResult(null);
    const idx=Math.floor(Math.random()*WHEEL_PRIZES.length); const seg=360/WHEEL_PRIZES.length;
    setRot(r=>r+360*6+(360-idx*seg-seg/2));
    setTimeout(async()=>{
      setSpinning(false); setSpun(true); const prize=WHEEL_PRIZES[idx]; setResult(prize);
      if(prize.value>0){ const np=(user.pts||0)+prize.value; setUser(u=>({...u,pts:np,wheel_spun_today:true})); if(user.id) await db.updateProfile(user.id,{pts:np,wheel_spun_today:true}); }
      else{ if(user.id) await db.updateProfile(user.id,{wheel_spun_today:true}); setUser(u=>({...u,wheel_spun_today:true})); }
    },5000);
  };
  const sz=260,cx=sz/2,cy=sz/2,r=sz/2-10;
  return (
    <div style={{ paddingBottom:"16px", background:C.beige }}>
      <div style={{ padding:"18px 20px 16px", textAlign:"center" }}>
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:C.textLight }}>daily</div>
        <div style={{ fontSize:"24px", fontFamily:font.display, color:C.text, fontWeight:"700" }}>glücksrad</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 16px" }}>
        <div style={{ position:"relative", padding:"10px" }}>
          <div style={{ position:"absolute",inset:0,borderRadius:"50%",border:`3px solid ${C.border}`,boxShadow:spinning?"0 0 24px rgba(226,74,40,0.4)":"0 0 12px rgba(0,0,0,0.08)",transition:"box-shadow 0.5s" }}/>
          <div style={{ position:"absolute",top:"0",left:"50%",transform:"translateX(-50%)",zIndex:3,width:0,height:0,borderLeft:"9px solid transparent",borderRight:"9px solid transparent",borderTop:`16px solid ${C.orange}`,filter:"drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}/>
          <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform:`rotate(${rot}deg)`,transition:spinning?"transform 5s cubic-bezier(0.15,0.6,0.15,1)":"none",display:"block" }}>
            {WHEEL_PRIZES.map((p,i)=>{ const seg=360/WHEEL_PRIZES.length; const s=(i*seg-90)*Math.PI/180,e=((i+1)*seg-90)*Math.PI/180,mid=(s+e)/2;
              return(<g key={i}><path d={`M${cx},${cy} L${cx+r*Math.cos(s)},${cy+r*Math.sin(s)} A${r},${r} 0 0,1 ${cx+r*Math.cos(e)},${cy+r*Math.sin(e)} Z`} fill={p.bg} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/><text x={cx+(r*0.62)*Math.cos(mid)} y={cy+(r*0.62)*Math.sin(mid)} transform={`rotate(${i*seg+seg/2},${cx+(r*0.62)*Math.cos(mid)},${cy+(r*0.62)*Math.sin(mid)})`} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight="700">{p.label}</text></g>);
            })}
            <circle cx={cx} cy={cy} r="24" fill={C.beige} stroke={C.orange} strokeWidth="3"/><circle cx={cx} cy={cy} r="18" fill={C.orange}/>
            <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="14" fontWeight="900" fontFamily="Gallica,serif">c</text>
          </svg>
        </div>
        <button onClick={spin} disabled={spinning||spun} style={{ marginTop:"8px",padding:"13px 44px",border:"none",borderRadius:"50px",fontSize:"14px",fontWeight:"700",fontFamily:font.ui,background:spun?C.greyBg:C.orange,color:spun?C.textLight:C.white,cursor:spun?"not-allowed":"pointer",boxShadow:!spun?"0 4px 14px rgba(226,74,40,0.3)":"none" }}>
          {spun?"morgen wieder ⏰":spinning?"dreht...":"🍒 drehen"}
        </button>
        {result && <Card style={{ marginTop:"14px",padding:"16px",textAlign:"center",animation:"scaleIn 0.4s",maxWidth:"240px" }}><div style={{fontSize:"32px",marginBottom:"4px"}}>{result.value>0?"🎉":result.value===-1?"⚡":"😅"}</div><div style={{fontSize:"16px",fontWeight:"800",color:result.value>0?C.orange:C.text}}>{result.value>0?`+${result.value} pts!`:result.value===-1?"2x pts heute!":"nächstes mal!"}</div></Card>}
      </div>
    </div>
  );
};

// ─── Scan ───────────────────────────────────────────────────────
const ScanTab = ({ user, setUser }) => {
  const [scanning,setScanning]=useState(false); const [done,setDone]=useState(false); const [pts,setPts]=useState(0); const scannerRef=useRef(null);
  const startScan = async()=>{
    setScanning(true);
    try{
      const{Html5Qrcode}=await import("html5-qrcode"); const scanner=new Html5Qrcode("qr-reader"); scannerRef.current=scanner;
      await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:200,height:200}},
        async()=>{ await scanner.stop(); const p=Math.floor(Math.random()*100)+50; setPts(p); const np=(user.pts||0)+p;
          setUser(u=>({...u,pts:np,total_visits:(u.total_visits||0)+1,treat_count:Math.min((u.treat_count||0)+1,u.treat_goal||8)}));
          if(user.id){ await db.updateProfile(user.id,{pts:np,total_visits:(user.total_visits||0)+1,treat_count:Math.min((user.treat_count||0)+1,user.treat_goal||8)}); }
          setScanning(false); setDone(true);
        },()=>{});
    }catch(e){
      setScanning(false); const p=Math.floor(Math.random()*100)+50; setPts(p); const np=(user.pts||0)+p;
      setUser(u=>({...u,pts:np})); if(user.id) await db.updateProfile(user.id,{pts:np}); setDone(true);
    }
  };
  useEffect(()=>()=>{if(scannerRef.current)try{scannerRef.current.stop()}catch(e){}},[]);
  return (
    <div style={{ background:C.beige, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"30px 20px", minHeight:"75vh" }}>
      {!done?(<>
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:C.textLight }}>qr code</div>
        <div style={{ fontSize:"24px", fontFamily:font.display, color:C.text, marginBottom:"24px", marginTop:"4px", fontWeight:"700" }}>punkte sammeln</div>
        <div id="qr-reader" style={{ width:"240px", height:"240px", borderRadius:"16px", overflow:"hidden", background:"#111", border:`2px solid ${scanning?C.orange:C.border}`, transition:"border 0.3s" }}/>
        {!scanning? <button onClick={startScan} style={{ marginTop:"18px",padding:"13px 36px",background:C.orange,border:"none",borderRadius:"50px",color:C.white,fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:font.ui }}>📷 kamera starten</button>
        : <button onClick={async()=>{if(scannerRef.current)try{await scannerRef.current.stop()}catch(e){}setScanning(false)}} style={{ marginTop:"18px",padding:"13px 36px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"50px",color:C.textSub,fontSize:"14px",fontWeight:"600",cursor:"pointer",fontFamily:font.ui }}>abbrechen</button>}
        <div style={{ color:C.textLight, fontSize:"11px", marginTop:"12px" }}>scanne den qr-code auf deinem beleg</div>
      </>):(
        <div style={{ textAlign:"center", animation:"scaleIn 0.4s" }}>
          <div style={{ fontSize:"48px" }}>🎉</div>
          <div style={{ fontSize:"32px", fontWeight:"700", color:C.orange, fontFamily:font.display }}>+{pts} pts</div>
          <div style={{ color:C.textLight, fontSize:"13px", marginTop:"6px" }}>punkte gutgeschrieben!</div>
          <button onClick={()=>{setDone(false);setPts(0)}} style={{ marginTop:"18px",padding:"11px 28px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"50px",color:C.text,fontSize:"13px",cursor:"pointer",fontFamily:font.ui }}>nochmal scannen</button>
        </div>
      )}
    </div>
  );
};

// ─── Vote ───────────────────────────────────────────────────────
const VoteTab = ({ user }) => {
  const [idx,setIdx]=useState(0); const [dir,setDir]=useState(null); const [dishes,setDishes]=useState(MOCK_DISHES); const [ts,setTs]=useState(null); const [off,setOff]=useState(0);
  const swipe=async d=>{ setDir(d); if(d==="right"){ setDishes(p=>p.map((x,i)=>i===idx?{...x,votes:x.votes+1}:x)); if(user.id) await supabase.from("dish_votes").upsert({user_id:user.id,dish_id:dishes[idx].id,vote:true}).catch(()=>{}); } setTimeout(()=>{setDir(null);setOff(0);setIdx(i=>i+1)},300); };
  const dish=dishes[idx];
  return (
    <div style={{ background:C.beige, paddingBottom:"16px" }}>
      <div style={{ padding:"18px 20px 16px", textAlign:"center" }}>
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:C.textLight }}>community vote</div>
        <div style={{ fontSize:"24px", fontFamily:font.display, color:C.text, fontWeight:"700" }}>nächste pizza?</div>
      </div>
      <div style={{ padding:"10px 14px" }}>
        {dish?(<>
          <div onTouchStart={e=>setTs(e.touches[0].clientX)} onTouchMove={e=>{if(ts!==null)setOff(e.touches[0].clientX-ts)}} onTouchEnd={()=>{if(Math.abs(off)>80)swipe(off>0?"right":"left");else{setOff(0);setTs(null)}}}>
            <Card style={{ padding:0, overflow:"hidden", maxWidth:"340px", margin:"0 auto", transform:dir==="left"?"translateX(-120%) rotate(-15deg)":dir==="right"?"translateX(120%) rotate(15deg)":`translateX(${off}px) rotate(${off*0.04}deg)`, opacity:dir?0:1-Math.abs(off)*0.002, transition:dir?"all 0.3s":"none" }}>
              <div style={{ height:"170px", background:`linear-gradient(135deg, ${C.beigeDark}, ${C.beige})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"60px", position:"relative" }}>🍕
                <div style={{ position:"absolute",bottom:"8px",right:"10px",background:C.text,color:C.white,borderRadius:"12px",padding:"3px 9px",fontSize:"11px",fontWeight:"700" }}>♥ {dish.votes}</div>
                {off>40 && <div style={{position:"absolute",top:"10px",left:"10px",color:C.green,fontSize:"28px",fontWeight:"900",transform:"rotate(-15deg)"}}>like</div>}
                {off<-40 && <div style={{position:"absolute",top:"10px",right:"10px",color:C.orange,fontSize:"28px",fontWeight:"900",transform:"rotate(15deg)"}}>nope</div>}
              </div>
              <div style={{ padding:"14px" }}><div style={{ fontSize:"18px",fontFamily:font.display,color:C.text,fontWeight:"700" }}>{dish.name}</div><div style={{ fontSize:"12px",color:C.textLight,marginTop:"3px" }}>{dish.description}</div></div>
            </Card>
          </div>
          <div style={{ display:"flex",justifyContent:"center",gap:"14px",marginTop:"14px" }}>
            <button onClick={()=>swipe("left")} style={{ width:"48px",height:"48px",borderRadius:"50%",background:C.white,border:`2px solid ${C.border}`,color:C.text,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            <button onClick={()=>swipe("right")} style={{ width:"48px",height:"48px",borderRadius:"50%",background:"rgba(226,74,40,0.1)",border:`2px solid ${C.orange}`,color:C.orange,fontSize:"18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>♥</button>
          </div>
          <div style={{ textAlign:"center",color:C.textLight,fontSize:"10px",marginTop:"8px" }}>← swipe oder buttons →</div>
        </>):(
          <div style={{ textAlign:"center",marginTop:"30px" }}>
            <div style={{ fontSize:"36px" }}>🍕</div>
            <div style={{ fontSize:"16px",fontWeight:"700",color:C.text,marginTop:"8px" }}>alle gevotet!</div>
            <div style={{ marginTop:"16px" }}>
              {[...dishes].sort((a,b)=>b.votes-a.votes).map((d,i)=>(
                <Card key={d.id} style={{ marginBottom:"5px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px" }}>
                  <div style={{ fontSize:"11px",fontWeight:"800",color:i===0?C.orange:C.textLight,width:"18px" }}>#{i+1}</div>
                  <div style={{ flex:1,fontSize:"12px",fontWeight:"600" }}>{d.name}</div>
                  <div style={{ background:i===0?C.orange:C.greyBg,color:i===0?C.white:C.text,borderRadius:"8px",padding:"2px 8px",fontSize:"11px",fontWeight:"700" }}>♥ {d.votes}</div>
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
  const [items,setItems]=useState(MOCK_SHOP); const [rd,setRd]=useState(null);
  useEffect(()=>{db.getShopItems().then(d=>{if(d.length)setItems(d)});},[]);
  const redeem=async item=>{
    if((user.pts||0)<item.cost||(user.level||1)<item.min_level)return;
    const np=(user.pts||0)-item.cost; setUser(u=>({...u,pts:np}));
    if(user.id){ await db.updateProfile(user.id,{pts:np}); await supabase.from("redemptions").insert({user_id:user.id,item_id:item.id}); }
    setRd(item); setTimeout(()=>setRd(null),2500);
  };
  return (
    <div style={{ background:C.beige, paddingBottom:"16px" }}>
      <div style={{ padding:"18px 20px 16px", textAlign:"center" }}>
        <div style={{ fontSize:"10px", letterSpacing:"3px", color:C.textLight }}>rewards</div>
        <div style={{ fontSize:"24px", fontFamily:font.display, color:C.text, fontWeight:"700" }}>score</div>
        <div style={{ fontSize:"12px", color:C.textLight, marginTop:"4px" }}>guthaben: <strong style={{color:C.text}}>{user.pts||0} pts</strong></div>
      </div>
      {rd && <div style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"scaleIn 0.3s" }}><div style={{fontSize:"48px"}}>{rd.icon}</div><div style={{color:C.white,fontSize:"18px",fontWeight:"700",marginTop:"10px"}}>eingelöst!</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:"11px",marginTop:"4px"}}>zeige dies an der kasse</div></div>}
      <div style={{ padding:"10px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
        {items.map((item,i)=>{ const ok=(user.pts||0)>=item.cost&&(user.level||1)>=item.min_level; const locked=(user.level||1)<item.min_level;
          return <Card key={item.id} onClick={()=>ok&&redeem(item)} style={{ padding:"14px 10px",textAlign:"center",opacity:locked?0.4:1,cursor:ok?"pointer":"default",border:ok?`2px solid ${C.orange}`:`1px solid ${C.border}`,animation:`fadeUp 0.3s ease ${i*0.04}s both` }}>
            <div style={{fontSize:"26px",marginBottom:"5px"}}>{item.icon}</div>
            <div style={{fontSize:"12px",fontWeight:"700"}}>{item.name}</div>
            <div style={{ marginTop:"8px",display:"inline-block",padding:"3px 10px",borderRadius:"12px",fontSize:"10px",fontWeight:"700",background:ok?C.orange:C.greyBg,color:ok?C.white:locked?C.textLight:C.text }}>{locked?`🔒 lvl ${item.min_level}`:`${item.cost} pts`}</div>
          </Card>;
        })}
      </div>
    </div>
  );
};

// ─── Profile ────────────────────────────────────────────────────
const ProfileTab = ({ user, setUser, onLogout }) => {
  const era=ERAS.find(e=>e.level===(user.level||1))||ERAS[0];
  const [editing,setEditing]=useState(false); const [insta,setInsta]=useState(user.instagram||""); const [uname,setUname]=useState(user.name||"");
  const save=async()=>{ setUser(u=>({...u,name:uname,instagram:insta})); if(user.id) await db.updateProfile(user.id,{name:uname,instagram:insta}); setEditing(false); };
  return (
    <div style={{ background:C.beige, paddingBottom:"16px" }}>
      <div style={{ padding:"24px 20px", textAlign:"center" }}>
        <div style={{ width:"64px",height:"64px",borderRadius:"50%",margin:"0 auto 10px",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",border:`3px solid ${C.beige}` }}>🍒</div>
        <div style={{ fontSize:"20px", fontFamily:font.display, color:C.text, fontWeight:"700" }}>@{user.name||"user"}</div>
        <div style={{ color:C.textLight, fontSize:"11px", marginTop:"3px" }}>{era.name} · level {user.level||1}</div>
      </div>
      <div style={{ padding:"10px 14px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"10px" }}>
          {[{v:user.pts||0,l:"pts"},{v:user.total_visits||0,l:"besuche"},{v:`${user.streak||0}🔥`,l:"streak"}].map((s,i)=><Card key={i} style={{padding:"12px",textAlign:"center"}}><div style={{fontSize:"17px",fontWeight:"800"}}>{s.v}</div><div style={{fontSize:"9px",color:C.textLight,marginTop:"2px"}}>{s.l}</div></Card>)}
        </div>
        <Card style={{ marginBottom:"10px" }}>
          {editing?(<>
            <div style={{fontSize:"10px",fontWeight:"700",letterSpacing:"1px",marginBottom:"8px",color:C.textSub}}>profil bearbeiten</div>
            <input value={uname} onChange={e=>setUname(e.target.value)} placeholder="username" style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:"10px",fontSize:"14px",marginBottom:"8px",outline:"none",boxSizing:"border-box",fontFamily:font.ui}} />
            <input value={insta} onChange={e=>setInsta(e.target.value)} placeholder="@instagram" style={{width:"100%",padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:"10px",fontSize:"14px",marginBottom:"10px",outline:"none",boxSizing:"border-box",fontFamily:font.ui}} />
            <button onClick={save} style={{width:"100%",padding:"11px",background:C.orange,border:"none",borderRadius:"10px",color:C.white,fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:font.ui}}>speichern</button>
          </>):(<>
            {[{icon:"👤",label:"username",value:`@${user.name||"user"}`},{icon:"📧",label:"e-mail",value:user.email},{icon:"📸",label:"instagram",value:user.instagram||"—"},{icon:"📱",label:"telefon",value:user.phone||"—"},{icon:"🛡️",label:"dsgvo",value:"akzeptiert ✓"}].map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 0",borderBottom:i<4?`1px solid ${C.greyBg}`:"none"}}>
                <span style={{fontSize:"13px"}}>{r.icon}</span><div style={{flex:1}}><div style={{fontSize:"9px",color:C.textLight}}>{r.label}</div><div style={{fontSize:"12px",fontWeight:"500"}}>{r.value}</div></div>
              </div>
            ))}
            <button onClick={()=>setEditing(true)} style={{width:"100%",marginTop:"10px",padding:"10px",background:C.beige,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.text,fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:font.ui}}>✏️ profil bearbeiten</button>
          </>)}
        </Card>
        <Card>
          <div style={{fontSize:"10px",fontWeight:"700",letterSpacing:"1.5px",marginBottom:"8px",color:C.textSub}}>era journey</div>
          <div style={{display:"flex",gap:"5px",justifyContent:"center"}}>
            {ERAS.map((e,i)=><div key={i} style={{width:"42px",height:"42px",borderRadius:"50%",background:(user.level||1)>=e.level?C.orange:C.greyBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:(user.level||1)>=e.level?"13px":"10px",fontWeight:"800",color:(user.level||1)>=e.level?C.white:C.textLight,border:(user.level||1)===e.level?`3px solid ${C.text}`:"none"}}>{(user.level||1)>=e.level?e.level:"🔒"}</div>)}
          </div>
        </Card>
        <button onClick={onLogout} style={{width:"100%",marginTop:"12px",padding:"11px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"10px",color:C.textLight,fontSize:"12px",cursor:"pointer",fontFamily:font.ui}}>ausloggen</button>
      </div>
    </div>
  );
};

// ─── Admin ──────────────────────────────────────────────────────
const AdminPanel = ({ onClose }) => {
  const [tab,setTab]=useState("users"); const [users,setUsers]=useState([]);
  const tabs=[{id:"users",l:"👥 user"},{id:"points",l:"⚙️ punkte"},{id:"missions",l:"🎯 missionen"},{id:"glow",l:"⚡ glow"},{id:"dishes",l:"🍕 gerichte"},{id:"abo",l:"💎 abos"}];
  useEffect(()=>{db.getAllProfiles().then(d=>setUsers(d))},[]);
  const addPts=async(uid,amt)=>{ const u=users.find(x=>x.id===uid); if(!u)return; await db.updateProfile(uid,{pts:(u.pts||0)+amt}); setUsers(p=>p.map(x=>x.id===uid?{...x,pts:(x.pts||0)+amt}:x)); };
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:C.beige,overflow:"auto",fontFamily:font.ui}}>
      <style>{CSS}</style>
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.beige,zIndex:10}}>
        <div><div style={{fontSize:"15px",fontWeight:"700",color:C.text}}>admin panel</div><div style={{fontSize:"10px",color:C.textLight}}>cereza pizza · frankfurt</div></div>
        <button onClick={onClose} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"6px 12px",color:C.text,cursor:"pointer",fontSize:"12px"}}>✕</button>
      </div>
      <div style={{display:"flex",gap:"4px",padding:"8px 10px",overflowX:"auto",borderBottom:`1px solid ${C.greyBg}`}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 10px",borderRadius:"12px",border:"none",background:tab===t.id?C.orange:"transparent",color:tab===t.id?C.white:C.textLight,fontSize:"11px",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap",fontFamily:font.ui}}>{t.l}</button>)}
      </div>
      <div style={{padding:"10px"}}>
        {tab==="users"&&(<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",marginBottom:"10px"}}>
            {[{v:users.length,l:"user"},{v:users.filter(u=>u.last_visit===new Date().toISOString().split('T')[0]).length,l:"heute"},{v:users.length?Math.round(users.filter(u=>(u.total_visits||0)>1).length/users.length*100)+"%":"—",l:"retention"}].map((s,i)=><Card key={i} style={{padding:"10px",textAlign:"center"}}><div style={{fontSize:"17px",fontWeight:"800",color:C.orange}}>{s.v}</div><div style={{fontSize:"9px",color:C.textLight}}>{s.l}</div></Card>)}
          </div>
          {users.map((u,i)=><Card key={i} style={{marginBottom:"5px",padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontSize:"11px",fontWeight:"800"}}>{u.level||1}</div>
            <div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:"700"}}>@{u.name}</div><div style={{fontSize:"9px",color:C.textLight}}>{u.email} · {u.last_visit||"—"}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:"12px",fontWeight:"700",color:C.orange}}>{u.pts||0}</div><div style={{fontSize:"8px",color:C.textLight}}>{u.total_visits||0} besuche</div></div>
            <button onClick={()=>addPts(u.id,100)} style={{background:C.beige,border:`1px solid ${C.border}`,borderRadius:"6px",padding:"4px 6px",fontSize:"9px",fontWeight:"700",cursor:"pointer"}}>+100</button>
          </Card>)}
        </>)}
        {tab==="points"&&ERAS.map((e,i)=><Card key={i} style={{marginBottom:"5px",padding:"10px",display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"26px",height:"26px",borderRadius:"50%",background:C.orange,color:C.white,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"800"}}>{e.level}</div><div style={{flex:1}}><div style={{fontWeight:"700",fontSize:"13px"}}>{e.name}</div><div style={{fontSize:"10px",color:C.textLight}}>{e.ptsNeeded} pts</div></div></Card>)}
        {tab==="missions"&&MOCK_MISSIONS.map(m=><Card key={m.id} style={{marginBottom:"5px",padding:"10px",display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"18px"}}>{m.icon}</span><div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:"700"}}>{m.title}</div><div style={{fontSize:"9px",color:C.textLight}}>{m.description}</div></div><div style={{color:C.orange,fontSize:"11px",fontWeight:"700"}}>+{m.pts_reward}</div></Card>)}
        {tab==="glow"&&["montag 12:00–14:00","mittwoch 18:00–20:00","freitag 12:00–14:00"].map((d,i)=><Card key={i} style={{marginBottom:"5px",padding:"10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:"700",fontSize:"13px"}}>{d.split(" ")[0]}</div><div style={{color:C.textLight,fontSize:"11px"}}>{d.split(" ")[1]}</div></div><span style={{fontSize:"11px",color:C.orange,fontWeight:"700"}}>2x pts</span></Card>)}
        {tab==="dishes"&&MOCK_DISHES.map(d=><Card key={d.id} style={{marginBottom:"5px",padding:"10px",display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"22px"}}>🍕</span><div style={{flex:1}}><div style={{fontWeight:"700",fontSize:"12px"}}>{d.name}</div><div style={{fontSize:"9px",color:C.textLight}}>{d.description}</div></div><div style={{background:C.orange,color:C.white,borderRadius:"8px",padding:"2px 7px",fontSize:"10px",fontWeight:"700"}}>♥ {d.votes}</div></Card>)}
        {tab==="abo"&&<Card><div style={{fontSize:"16px",fontFamily:font.display,color:C.green,marginBottom:"8px",fontWeight:"700"}}>matcha society</div>{[{l:"preis",v:"29,99€/mo"},{l:"members",v:"—"},{l:"zahlung",v:"stripe + paypal"}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<2?`1px solid ${C.greyBg}`:"none",fontSize:"12px"}}><span style={{color:C.textLight}}>{r.l}</span><span style={{fontWeight:"700"}}>{r.v}</span></div>)}</Card>}
      </div>
    </div>
  );
};

const AdminLogin = ({ onLogin, onBack }) => {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async()=>{
    setErr(""); setLoading(true);
    try{
      const{data,error}=await db.signIn(email,pw);
      if(error){setErr("falsche zugangsdaten");setLoading(false);return}
      const profile=await db.getProfile(data.user.id);
      if(profile?.is_admin) onLogin(profile); else{setErr("kein admin-zugang");await db.signOut()}
    }catch(e){setErr("verbindungsfehler")}
    setLoading(false);
  };
  return (
    <div style={{minHeight:"100vh",background:C.beige,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:font.ui}}>
      <style>{CSS}</style>
      <div style={{fontSize:"11px",color:C.textLight,letterSpacing:"3px",marginBottom:"6px"}}>admin</div>
      <div style={{fontSize:"24px",fontFamily:font.display,color:C.text,marginBottom:"28px",fontWeight:"700"}}>login</div>
      <div style={{width:"100%",maxWidth:"300px"}}>
        <input type="email" placeholder="admin e-mail" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:"12px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.text,fontSize:"14px",outline:"none",marginBottom:"8px",fontFamily:font.ui,boxSizing:"border-box"}} />
        <input type="password" placeholder="passwort" value={pw} onChange={e=>setPw(e.target.value)} style={{width:"100%",padding:"12px 14px",background:C.white,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.text,fontSize:"14px",outline:"none",marginBottom:"10px",fontFamily:font.ui,boxSizing:"border-box"}} />
        {err && <div style={{color:C.orange,fontSize:"11px",textAlign:"center",marginBottom:"8px"}}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{width:"100%",padding:"13px",background:C.orange,border:"none",borderRadius:"12px",color:C.white,fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:font.ui,opacity:loading?0.7:1}}>{loading?"...":"einloggen"}</button>
        <button onClick={onBack} style={{width:"100%",marginTop:"8px",padding:"11px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"12px",color:C.textLight,fontSize:"12px",cursor:"pointer",fontFamily:font.ui}}>← zurück</button>
      </div>
    </div>
  );
};

// ─── Main ───────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null); const [tab,setTab]=useState("home"); const [showLevelUp,setShowLevelUp]=useState(null);
  const [adminMode,setAdminMode]=useState(false); const [loading,setLoading]=useState(true);

  useEffect(()=>{
    db.getSession().then(async({data:{session}})=>{
      if(session?.user){ const p=await db.getProfile(session.user.id); if(p)setUser(p); }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!user)return; const ne=[...ERAS].reverse().find(e=>(user.pts||0)>=e.ptsNeeded);
    if(ne&&ne.level>(user.level||1)){ setUser(u=>({...u,level:ne.level})); if(user.id) db.updateProfile(user.id,{level:ne.level}); setShowLevelUp(ne.level); }
  },[user?.pts]);

  if(loading) return <div style={{position:"fixed",inset:0,background:C.beige,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center"}}><div style={{fontSize:"42px",fontFamily:font.display,color:C.text,fontWeight:"700"}}>cereza</div><div style={{fontSize:"10px",color:C.textLight,letterSpacing:"3px",marginTop:"6px"}}>loading...</div></div></div>;
  if(adminMode==="login") return <AdminLogin onLogin={p=>{setAdminMode("panel")}} onBack={()=>setAdminMode(false)} />;
  if(adminMode==="panel") return <AdminPanel onClose={async()=>{await db.signOut();setAdminMode(false)}} />;
  if(!user) return <div style={{position:"fixed",inset:0,maxWidth:"430px",margin:"0 auto"}}><AuthScreen onLogin={setUser}/><div onClick={()=>setAdminMode("login")} style={{position:"fixed",bottom:"8px",left:"50%",transform:"translateX(-50%)",color:"rgba(0,0,0,0.06)",fontSize:"9px",cursor:"pointer",padding:"4px 10px"}}>admin</div></div>;

  const nav=[{id:"home",icon:"🏠",l:"home"},{id:"wheel",icon:"🎰",l:"daily"},{id:"scan",icon:"📷",l:"scan"},{id:"vote",icon:"🔥",l:"vote"},{id:"score",icon:"🎁",l:"score"},{id:"profile",icon:"👤",l:"profil"}];

  return (
    <div style={{position:"fixed",inset:0,maxWidth:"430px",margin:"0 auto",fontFamily:font.ui,background:C.beige,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{CSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={()=>setShowLevelUp(null)} />}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"}}>
        {tab==="home"&&<HomeTab user={user} setUser={setUser} setTab={setTab}/>}
        {tab==="wheel"&&<WheelTab user={user} setUser={setUser}/>}
        {tab==="scan"&&<ScanTab user={user} setUser={setUser}/>}
        {tab==="vote"&&<VoteTab user={user}/>}
        {tab==="score"&&<ScoreTab user={user} setUser={setUser}/>}
        {tab==="profile"&&<ProfileTab user={user} setUser={setUser} onLogout={async()=>{await db.signOut();setUser(null)}}/>}
      </div>
      <div style={{flexShrink:0,background:C.white,borderTop:`1px solid ${C.border}`,paddingBottom:"env(safe-area-inset-bottom, 6px)"}}>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"6px 2px 2px"}}>
          {nav.map(n=>{const a=tab===n.id; const sc=n.id==="scan";
            return <button key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1px",background:"none",border:"none",cursor:"pointer",padding:"2px 5px",position:"relative"}}>
              {sc?<div style={{width:"42px",height:"42px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",marginTop:"-18px",border:`3px solid ${C.white}`,fontSize:"17px",boxShadow:a?"0 0 12px rgba(226,74,40,0.4)":"none"}}>{n.icon}</div>
              :<span style={{fontSize:"17px",opacity:a?1:0.35,transform:a?"scale(1.1)":"scale(1)",transition:"all 0.15s"}}>{n.icon}</span>}
              <span style={{fontSize:"8px",fontWeight:a?"700":"500",color:a?C.text:C.textLight}}>{n.l}</span>
              {a&&!sc&&<div style={{position:"absolute",top:"-1px",left:"50%",transform:"translateX(-50%)",width:"12px",height:"2px",borderRadius:"1px",background:C.orange}}/>}
            </button>;
          })}
        </div>
      </div>
    </div>
  );
}
