import { useState, useEffect, useRef, useCallback } from "react";
import supabase, { db } from "./supabase";
import FamTab from "./FamTab";
import { UserProfileCard, MissionQRScanner } from "./UserComponents";
import { requestPushPermission, onForegroundMessage, sendPushToAll } from "./push";

// ─── Themes · "The Modern Trattoria Editorial" ──────────────────
const T = {
  light: {
    bg:"#b02605", surface:"#fef9eb", card:"#fffdf5",
    accent:"#b02605", green:"#4a6546",
    text:"#1d1c13", textSub:"#4a4639", textLight:"#8a8475",
    white:"#fffdf5", border:"rgba(74,70,57,0.08)", grey:"#f5f0e0",
    navBg:"rgba(254,249,235,0.88)", navBorder:"rgba(74,70,57,0.06)", name:"Trattoria",
    surfaceLow:"#faf4e2", surfaceHigh:"#f0e8d0",
  },
  beige: {
    bg:"#8b6914", surface:"#fef9eb", card:"#fffdf5",
    accent:"#8b6914", green:"#4a6546",
    text:"#2a1f0e", textSub:"#6b5a3e", textLight:"#a09070",
    white:"#fffdf5", border:"rgba(107,90,62,0.08)", grey:"#f5efe0",
    navBg:"rgba(254,249,235,0.90)", navBorder:"rgba(107,90,62,0.06)", name:"Oro",
    surfaceLow:"#f5efe0", surfaceHigh:"#ebe2cc",
  },
  red: {
    bg:"#7a1a0a", surface:"#fef5f0", card:"#fffaf7",
    accent:"#9b2315", green:"#4a6546",
    text:"#2a0e08", textSub:"#6b3a2e", textLight:"#a07060",
    white:"#fffaf7", border:"rgba(107,58,46,0.08)", grey:"#f9efe8",
    navBg:"rgba(254,245,240,0.90)", navBorder:"rgba(107,58,46,0.06)", name:"Vino",
    surfaceLow:"#f9efe8", surfaceHigh:"#f0e2d8",
  },
  rosa: {
    bg:"#a83279", surface:"#fef5fa", card:"#fffafc",
    accent:"#a83279", green:"#4a6546",
    text:"#1f0a14", textSub:"#6b2145", textLight:"#be87a8",
    white:"#fffafc", border:"rgba(168,50,121,0.06)", grey:"#fdf2f8",
    navBg:"rgba(254,245,250,0.90)", navBorder:"rgba(168,50,121,0.06)", name:"Rosa",
    surfaceLow:"#fdf2f8", surfaceHigh:"#f5e0ed",
  },
  gruen: {
    bg:"#2d5a28", surface:"#f5faf0", card:"#fafdf7",
    accent:"#4a6546", green:"#2d5a28",
    text:"#0a1f08", textSub:"#2d4528", textLight:"#6a9a64",
    white:"#fafdf7", border:"rgba(45,90,40,0.06)", grey:"#eff5ea",
    navBg:"rgba(245,250,240,0.90)", navBorder:"rgba(45,90,40,0.06)", name:"Basilico",
    surfaceLow:"#eff5ea", surfaceHigh:"#e0ebd8",
  },
};

const useTheme = () => {
  const [mode, setModeRaw] = useState(() => localStorage.getItem("cz-mode") || "light");
  const [glow, setGlowRaw]  = useState(() => localStorage.getItem("cz-glow")  || "rosa");
  const [isGlow, setIsGlow] = useState(false);
  const setMode = m => { setModeRaw(m); localStorage.setItem("cz-mode", m); };
  const setGlow = g => { setGlowRaw(g); localStorage.setItem("cz-glow", g); };
  useEffect(() => {
    const check = async () => { try { setIsGlow(await db.isGlowHourNow()); } catch {} };
    check(); const iv = setInterval(check, 60000); return () => clearInterval(iv);
  }, []);
  const key = isGlow ? glow : mode;
  return { t: T[key] || T.light, mode, setMode, glow, setGlow, isGlow };
};

// Global theme alias – mutated on every render
let C = { ...T.light, beige: T.light.surface, orange: T.light.accent };
const applyTheme = t => {
  C.bg=t.bg; C.beige=t.surface; C.card=t.card; C.orange=t.accent; C.green=t.green;
  C.text=t.text; C.textSub=t.textSub; C.textLight=t.textLight;
  C.white=t.white; C.border=t.border; C.greyBg=t.grey;
  C.surfaceLow=t.surfaceLow||t.grey; C.surfaceHigh=t.surfaceHigh||t.grey;
};
// Typography: Editorial serif + functional sans
const font = { ui:"'Plus Jakarta Sans',-apple-system,sans-serif", display:"'Gallica','Playfair Display',Georgia,serif" };

// Canvas helper for rounded rectangles
const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath(); ctx.fill();
};

// ─── Static data ─────────────────────────────────────────────────
const ERAS = [
  {level:1,name:"Newbie",pts:0},{level:2,name:"Regular",pts:500},
  {level:3,name:"Muse",pts:1200},{level:4,name:"Insider",pts:2500},{level:5,name:"Icon",pts:5000},
];
const MOCK_MISSIONS = [
  {id:1,title:"Morning Muse",description:"Vor 12 Uhr besuchen",goal:2,pts_reward:150,icon:"☀"},
  {id:2,title:"Spicy Lover",description:"Pizza mit Chili Oil",goal:1,pts_reward:100,icon:"✦"},
  {id:3,title:"Matcha Ritual",description:"3× Matcha diese Woche",goal:3,pts_reward:120,icon:"◈"},
];
const MOCK_DISHES = [
  {id:1,name:"Truffle Margherita",description:"Trüffelcreme · Fior di Latte",votes:142},
  {id:2,name:"Matcha Tiramisu",description:"Matcha-Mascarpone · Espresso",votes:89},
  {id:3,name:"Pistachio Dream",description:"Pistaziencreme · Mortadella",votes:234},
];
const MOCK_SHOP = [
  {id:1,name:"Gratis Espresso",cost:300,min_level:1,icon:"◎"},
  {id:2,name:"Gratis Matcha",cost:600,min_level:2,icon:"◈"},
  {id:3,name:"Gratis Margherita",cost:1000,min_level:3,icon:"◉"},
  {id:4,name:"Chef's Table",cost:2500,min_level:4,icon:"✦"},
];
const MOCK_LB = [
  {rank:1,name:"Sophia",pts:3200},{rank:2,name:"Luca",pts:2800},
  {rank:3,name:"Marco",pts:1450},{rank:4,name:"Elena",pts:1100},{rank:5,name:"Tom",pts:900},
];
const WHEEL_DEFAULT = [
  {id:1,label:"50 XP", value:50, color:"#fde8e8"},{id:2,label:"Nichts",value:0, color:"#f5f5f5"},
  {id:3,label:"100 XP",value:100,color:"#e8f5e9"},{id:4,label:"25 XP", value:25, color:"#fef3e2"},
  {id:5,label:"2× XP", value:-1, color:"#e8eaf6"},{id:6,label:"Nichts",value:0, color:"#f5f5f5"},
  {id:7,label:"200 XP",value:200,color:"#fce4ec"},{id:8,label:"75 XP", value:75, color:"#e0f7fa"},
];
const WHEEL_TC = ["#c0392b","#999","#27ae60","#d35400","#3949ab","#999","#c2185b","#00838f"];
const FUN_FACTS_DEF = [
  "Unsere Chili No. 2 reift 40 Tage im Fass.",
  "Der Teig ruht 72 Stunden für maximalen Crunch.",
  "Cereza bedeutet Kirsche auf Spanisch.",
  "Fior di Latte kommt frisch aus Kampanien.",
  "Unser Ofen erreicht 485°C in 12 Minuten.",
];

// ─── CSS · Culinary Editorial ────────────────────────────────────
const getCSS = t => `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body{height:100%;width:100%;overflow:hidden;position:fixed;inset:0;overscroll-behavior:none;-webkit-font-smoothing:antialiased;font-family:'Plus Jakarta Sans','Inter',-apple-system,sans-serif}
  #root{height:100%;width:100%;overflow:hidden;position:fixed;inset:0;background:${t.surface};overscroll-behavior:none}
  input,textarea,select{user-select:text;-webkit-user-select:text;font-family:inherit;font-size:16px;border-radius:14px;border:none;background:${t.grey}}
  input:focus,textarea:focus,select:focus{outline:none;box-shadow:0 0 0 2px ${t.accent}33}
  ::-webkit-scrollbar{display:none}
  button{-webkit-appearance:none;appearance:none;font-family:inherit;cursor:pointer;border:none;outline:none;transition:all 0.2s ease}
  button:active{opacity:0.8;transform:scale(0.97)}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(600px) rotate(720deg);opacity:0}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
`;
const defaultCSS = getCSS(T.light);

// ─── Safe areas ───────────────────────────────────────────────────
const ST = "env(safe-area-inset-top,0px)";
const SB = "env(safe-area-inset-bottom,0px)";

// ─── Sound ───────────────────────────────────────────────────────
const Sound = {
  _c:null,
  ctx(){ if(!this._c) try{this._c=new(window.AudioContext||window.webkitAudioContext)()}catch(e){} return this._c; },
  p(f,d,t="sine",v=0.09,dl=0){
    try{
      const c=this.ctx();if(!c)return;
      const o=c.createOscillator(),g=c.createGain();
      o.type=t;o.frequency.value=f;
      g.gain.setValueAtTime(0,c.currentTime+dl);
      g.gain.linearRampToValueAtTime(v,c.currentTime+dl+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dl+d);
      o.connect(g);g.connect(c.destination);
      o.start(c.currentTime+dl);o.stop(c.currentTime+dl+d);
    }catch(e){}
  },
  tap()   { this.p(900,0.05,"sine",0.04); },
  scan()  { [660,880,1100].forEach((f,i)=>this.p(f,0.1,"sine",0.07,i*0.08)); },
  spin()  { for(let i=0;i<5;i++) this.p(300+i*55,0.06,"triangle",0.04,i*0.07); },
  win()   { [523,659,784,1047].forEach((f,i)=>this.p(f,0.18,"sine",0.09,i*0.1)); },
  lose()  { this.p(280,0.3,"sawtooth",0.07); },
  lvl()   { [392,523,659,784,1047].forEach((f,i)=>this.p(f,0.2,"sine",0.08,i*0.09)); },
  redeem(){ [440,554,659].forEach((f,i)=>this.p(f,0.14,"sine",0.09,i*0.1)); },
  vote()  { this.p(440,0.08); this.p(660,0.1,"sine",0.07,0.08); },
  gift()  { [523,659,784,1047].forEach((f,i)=>this.p(f,0.11,"sine",0.07,i*0.07)); },
  notify(){ this.p(660,0.12); this.p(880,0.15,"sine",0.08,0.13); },
};

// ─── Icons ───────────────────────────────────────────────────────
const I = {
  home:     <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  target:   <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  qr:       <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 17h4v4M14 17v4"/></svg>,
  heart:    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  heartFill:<svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  user:     <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  x:        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  share:    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  gift:     <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
  cam:      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  edit:     <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  img:      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  fam:      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:     <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};

// ─── Card ─────────────────────────────────────────────────────────
// Editorial Card — No borders, tonal layering only
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background:C.card, borderRadius:"20px", padding:"20px", border:"none", boxShadow:`0 2px 20px rgba(29,28,19,0.04)`, ...style }}>
    {children}
  </div>
);

// ─── Level Up Overlay ─────────────────────────────────────────────
const LevelUpOverlay = ({ level, onClose }) => {
  const era = ERAS[level-1] || ERAS[0];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.93)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.4s" }}>
      <style>{defaultCSS}</style>
      {[...Array(16)].map((_,i) => (
        <div key={i} style={{ position:"absolute",width:"8px",height:"8px",background:["#e24a28","#f0e8d8","#ffd700","#ff8080"][i%4],borderRadius:i%2?"50%":"2px",left:`${Math.random()*100}%`,top:"-10px",animation:`confetti ${1+Math.random()*2}s ease-in forwards`,animationDelay:`${Math.random()*0.5}s` }}/>
      ))}
      <div style={{ fontSize:"48px",marginBottom:"8px" }}>👑</div>
      <div style={{ fontSize:"40px",fontFamily:font.display,color:"#fff",fontWeight:"700",animation:"scaleIn 0.5s ease 0.3s both" }}>Level Up!</div>
      <div style={{ fontSize:"11px",letterSpacing:"4px",color:"rgba(255,255,255,0.45)",marginTop:"12px" }}>NEUER STATUS</div>
      <div style={{ fontSize:"28px",fontFamily:font.display,color:"#fff",marginTop:"4px" }}>{era.name}</div>
      <button onClick={onClose} style={{ marginTop:"36px",padding:"14px 48px",background:"#e24a28",borderRadius:"50px",color:"#fff",fontSize:"15px",fontWeight:"700" }}>Feiern</button>
    </div>
  );
};

// ─── Auth Screen ──────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [isLogin,setIsLogin] = useState(true);
  const [email,setEmail]     = useState("");
  const [pw,setPw]           = useState("");
  const [name,setName]       = useState("");
  const [phone,setPhone]     = useState("");
  const [dsgvo,setDsgvo]     = useState(false);
  const [err,setErr]         = useState("");
  const [loading,setLoading] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email||!pw)           { setErr("Bitte alle Felder ausfüllen."); return; }
    if (!isLogin&&!name)       { setErr("Bitte Username eingeben."); return; }
    if (!isLogin&&!dsgvo)      { setErr("Bitte Datenschutz akzeptieren."); return; }
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await db.signIn(email, pw);
        if (error) { setErr("Falsche E-Mail oder Passwort."); setLoading(false); return; }
        let p = null;
        for (let i=0; i<5; i++) {
          p = await db.getProfile(data.user.id);
          if (p) break;
          await new Promise(r => setTimeout(r, 600*(i+1)));
        }
        onLogin(p || { id:data.user.id, name:data.user.user_metadata?.name||email.split('@')[0], email, pts:0, level:1, streak:0, total_visits:0, treat_count:0, treat_goal:8, wheel_spun_today:false, is_abo_member:false, is_admin:false });
      } else {
        const { data, error } = await db.signUp(email, pw, name, phone);
        if (error) { setErr(error.message); setLoading(false); return; }
        if (data.user) {
          // Warten bis Trigger das Profil erstellt hat
          let p = null;
          for (let i=0; i<8; i++) {
            await new Promise(r => setTimeout(r, 800));
            p = await db.getProfile(data.user.id);
            if (p) break;
          }
          // Phone manuell updaten falls Trigger es nicht gesetzt hat
          if (p) {
            if (!p.phone && phone) await db.updateProfile(data.user.id, { phone }).catch(() => {});
            p = await db.getProfile(data.user.id) || p;
          }
          onLogin(p || { id:data.user.id, name, email, phone, pts:0, level:1, streak:0, total_visits:0, treat_count:0, treat_goal:8, wheel_spun_today:false, is_abo_member:false, is_admin:false });
        }
      }
    } catch(e) { setErr("Verbindungsfehler."); }
    setLoading(false);
  };

  const inp = (type, val, set, ph) => (
    <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
      style={{ width:"100%",padding:"15px 18px",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:"14px",color:"#fff",fontSize:"16px",outline:"none",marginBottom:"10px",boxSizing:"border-box" }}/>
  );

  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:`calc(${ST} + 40px) 28px calc(${SB} + 40px)`,background:"#C1272D" }}>
      <style>{defaultCSS}</style>
      <div style={{ marginBottom:"44px",textAlign:"center",animation:"fadeUp 0.5s ease" }}>
        <div style={{ fontSize:"56px",fontFamily:font.display,color:"#fff",fontWeight:"700" }}>cereza</div>
        <div style={{ fontSize:"11px",letterSpacing:"5px",color:"rgba(255,255,255,0.45)",marginTop:"6px" }}>LOYALTY CLUB</div>
      </div>
      <div style={{ width:"100%",maxWidth:"340px",animation:"fadeUp 0.5s ease 0.1s both" }}>
        {!isLogin && inp("text",   name,  setName,  "Username")}
        {inp("email",    email, setEmail, "E-Mail")}
        {inp("password", pw,    setPw,    "Passwort (min. 6 Zeichen)")}
        {!isLogin && inp("tel", phone, setPhone, "Handynummer")}
        {!isLogin && (
          <div onClick={() => setDsgvo(!dsgvo)} style={{ display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"16px",cursor:"pointer",color:"rgba(255,255,255,0.65)",fontSize:"13px",lineHeight:1.5 }}>
            <div style={{ width:"20px",height:"20px",borderRadius:"6px",flexShrink:0,marginTop:"1px",border:`2px solid ${dsgvo?"#fff":"rgba(255,255,255,0.4)"}`,background:dsgvo?"#fff":"transparent",display:"flex",alignItems:"center",justifyContent:"center" }}>
              {dsgvo && <div style={{ width:"10px",height:"10px",background:"#e24a28",borderRadius:"2px" }}/>}
            </div>
            Ich akzeptiere die Datenschutzerklärung
          </div>
        )}
        {err && <div style={{ color:"#ffcccc",fontSize:"13px",marginBottom:"12px",textAlign:"center" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%",padding:"16px",background:"rgba(255,255,255,0.95)",borderRadius:"14px",color:"#C1272D",fontSize:"16px",fontWeight:"700",opacity:loading?0.7:1 }}>
          {loading ? "..." : isLogin ? "Einloggen" : "Registrieren"}
        </button>
        <p style={{ textAlign:"center",marginTop:"22px",color:"rgba(255,255,255,0.45)",fontSize:"14px" }}>
          {isLogin ? "Noch kein Mitglied? " : "Schon dabei? "}
          <span onClick={() => { setIsLogin(!isLogin); setErr(""); }} style={{ color:"rgba(255,255,255,0.9)",cursor:"pointer",textDecoration:"underline" }}>
            {isLogin ? "Jetzt beitreten" : "Einloggen"}
          </span>
        </p>
      </div>
    </div>
  );
};

// ─── Onboarding Screen (nur beim ersten Login) ───────────────────
const OnboardingScreen = ({ user, onDone }) => {
  const [step, setStep] = useState(0);
  const [instaTag, setInstaTag] = useState("");
  const steps = [
    { emoji:"\u{1F355}", title:"Willkommen bei Cereza!", sub:"Das Loyalty Club der besten Pizza in Frankfurt.", btn:"Los geht\u2019s" },
    { emoji:"\u{1F4F8}", title:"Dein Instagram", sub:"Hinterlege deinen Instagram-Tag \u2014 er wird als dein Name in der App angezeigt.", btn:"Weiter", hasInput:true },
    { emoji:"\u2B50", title:"Punkte sammeln", sub:"Scanne den QR-Code auf deinem Beleg nach jedem Besuch und sammle XP.", btn:"Weiter" },
    { emoji:"\u{1F3B0}", title:"Rubbellos", sub:"Rubble t\u00e4glich dein Los frei und gewinne Bonus-XP und \u00dcberraschungen.", btn:"Weiter" },
    { emoji:"\u{1F355}", title:"Gerichte w\u00e4hlen", sub:"Swipe in Cinder f\u00fcr Gerichte die auf die Karte kommen sollen.", btn:"Weiter" },
    { emoji:"\u{1F381}", title:"Belohnungen einl\u00f6sen", sub:"Ab 300 XP kannst du Gratis-Getr\u00e4nke, Pizzen und mehr einl\u00f6sen.", btn:"Jetzt starten!" },
  ];
  const s = steps[step];
  const next = async () => {
    // Save Instagram tag if on that step
    if (step === 1 && instaTag.trim() && user?.id) {
      const tag = instaTag.trim().replace(/^@/,"");
      await db.updateProfile(user.id, { instagram: tag, name: tag });
    }
    if (step < steps.length-1) setStep(s => s+1); else onDone();
  };
  return (
    <div style={{ position:"fixed",inset:0,background:"linear-gradient(160deg, #b02605 0%, #8b1e04 60%, #5a1003 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",zIndex:99999 }}>
      <style>{defaultCSS}</style>
      <div style={{ display:"flex",gap:"6px",marginBottom:"48px" }}>
        {steps.map((_,i) => (
          <div key={i} style={{ width:i===step?24:8,height:"8px",borderRadius:"4px",background:i===step?"#fff":"rgba(255,255,255,0.25)",transition:"all 0.3s" }}/>
        ))}
      </div>
      <div style={{ fontSize:"72px",marginBottom:"24px",animation:"scaleIn 0.4s" }}>{s.emoji}</div>
      <div style={{ fontSize:"28px",fontFamily:font.display,color:"#fff",textAlign:"center",marginBottom:"12px",animation:"fadeUp 0.4s" }}>{s.title}</div>
      <div style={{ fontSize:"16px",color:"rgba(255,255,255,0.65)",textAlign:"center",lineHeight:1.6,marginBottom: s.hasInput ? "24px" : "48px",maxWidth:"300px",animation:"fadeUp 0.4s" }}>{s.sub}</div>
      {s.hasInput && (
        <div style={{ marginBottom:"32px",width:"100%",maxWidth:"280px",animation:"fadeUp 0.4s" }}>
          <input value={instaTag} onChange={e => setInstaTag(e.target.value)} placeholder="@dein_instagram"
            style={{ width:"100%",padding:"15px 20px",borderRadius:"50px",border:"2px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"#fff",fontSize:"16px",fontWeight:"600",textAlign:"center",outline:"none",backdropFilter:"blur(8px)",boxSizing:"border-box" }}/>
          <div style={{ fontSize:"12px",color:"rgba(255,255,255,0.35)",marginTop:"8px",textAlign:"center" }}>Optional \u2014 du kannst es sp\u00e4ter im Profil \u00e4ndern</div>
        </div>
      )}
      <button onClick={next}
        style={{ padding:"17px 52px",background:"rgba(254,249,235,0.95)",borderRadius:"50px",color:"#b02605",fontSize:"17px",fontWeight:"800",animation:"fadeUp 0.4s" }}>
        {s.btn}
      </button>
      {step > 0 && (
        <button onClick={onDone} style={{ marginTop:"18px",color:"rgba(255,255,255,0.35)",fontSize:"14px",background:"none",border:"none" }}>
          \u00dcberspringen
        </button>
      )}
    </div>
  );
};
const MissionCard = ({ mission: m, user, setUser }) => {
  const [open,    setOpen]    = useState(false);
  const [started, setStarted] = useState(false);
  const [progress,setProgress]= useState(0);
  const [stamping,setStamping]= useState(false);
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('mission_starts').select('id').eq('user_id',user.id).eq('mission_id',m.id).maybeSingle()
      .then(({ data }) => { if (data) setStarted(true); });
    supabase.from('mission_stamps').select('id',{count:'exact',head:true}).eq('user_id',user.id).eq('mission_id',m.id)
      .then(({ count }) => { setProgress(count || 0); });
  }, [m.id, user?.id]);

  const goal = m.goal || 1;
  const done = progress >= goal;

  const startMission = async e => {
    e.stopPropagation();
    if (!user?.id || started || done) return;
    Sound.tap();
    await supabase.from('mission_starts').upsert({ user_id:user.id, mission_id:m.id }, { onConflict:'user_id,mission_id' });
    setStarted(true);
    setMsg("Mission gestartet!");
    setTimeout(() => setMsg(""), 2000);
  };

  const stamp = async e => {
    e.stopPropagation();
    if (!user?.id || stamping || done) return;
    setStamping(true); setMsg("");
    const { data, error } = await supabase.rpc('stamp_mission', { p_user_id:user.id, p_mission_id:m.id });
    if (error || !data?.ok) {
      setMsg(data?.error || error?.message || "Fehler");
    } else {
      setProgress(data.progress);
      if (data.completed) {
        Sound.win();
        setMsg(`+${m.pts_reward} XP! Mission abgeschlossen! 🎉`);
        setUser(u => ({ ...u, pts:(u.pts||0)+m.pts_reward }));
      } else {
        Sound.tap();
        setMsg(`Stempel ${data.progress}/${data.goal} ✓`);
      }
    }
    setStamping(false);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <Card style={{ marginBottom:"8px", padding:0, overflow:"hidden" }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ padding:"14px", display:"flex", alignItems:"center", gap:"14px", cursor:"pointer" }}>
        <div style={{ width:"40px",height:"40px",borderRadius:"12px",background:done?C.green:started?`${C.orange}22`:C.greyBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0,transition:"background 0.3s" }}>
          {done ? <span style={{ color:C.white,display:"flex" }}>{I.check}</span> : m.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" }}>
            <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>{m.title}</div>
            {started&&!done && <div style={{ fontSize:"9px",fontWeight:"700",background:`${C.orange}18`,color:C.orange,padding:"2px 7px",borderRadius:"8px" }}>Läuft</div>}
            {done         && <div style={{ fontSize:"9px",fontWeight:"700",background:`${C.green}18`, color:C.green, padding:"2px 7px",borderRadius:"8px" }}>✓ Fertig</div>}
          </div>
          <div style={{ fontSize:"12px",color:C.textLight,marginTop:"2px" }}>{m.description}</div>
          {/* Zeitfenster-Info */}
          {m.time_window_start && m.time_window_end && (
            <div style={{ fontSize:"11px",color:C.orange,marginTop:"3px",fontWeight:"600" }}>
              ⏰ {m.time_window_start.slice(0,5)}–{m.time_window_end.slice(0,5)} Uhr (+{m.grace_minutes||35} Min.)
            </div>
          )}
          {m.deadline_day_of_week!=null && (
            <div style={{ fontSize:"11px",color:C.textSub,marginTop:"2px" }}>
              🗓 Bis {["So","Mo","Di","Mi","Do","Fr","Sa"][m.deadline_day_of_week]} diese Woche
            </div>
          )}
          {m.deadline_date && (
            <div style={{ fontSize:"11px",color:C.textSub,marginTop:"2px" }}>
              🗓 Deadline: {new Date(m.deadline_date).toLocaleDateString('de-DE')}
            </div>
          )}
          {m.reset_weekly && (
            <div style={{ fontSize:"11px",color:C.textLight,marginTop:"2px" }}>🔄 Wöchentlich</div>
          )}
          {goal > 1 && (
            <div style={{ height:"4px",background:C.greyBg,borderRadius:"2px",marginTop:"8px",overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${Math.min(100,(progress/goal)*100)}%`,background:done?C.green:C.orange,borderRadius:"2px",transition:"width 0.4s" }}/>
            </div>
          )}
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px",flexShrink:0 }}>
          <div style={{ fontSize:"13px",fontWeight:"700",color:done?C.green:C.orange }}>{done?"✓":`+${m.pts_reward} XP`}</div>
          {goal > 1 && <div style={{ fontSize:"10px",color:C.textLight }}>{progress}/{goal}</div>}
          <div style={{ fontSize:"16px",color:C.textLight,transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.25s" }}>⌄</div>
        </div>
      </div>

      {/* Accordion Body */}
      {open && (
        <div style={{ borderTop:`1px solid ${C.greyBg}`,padding:"14px",background:`${C.greyBg}55` }}>
          {/* Stempelkarte */}
          {goal > 1 && (
            <div style={{ marginBottom:"14px" }}>
              <div style={{ fontSize:"11px",fontWeight:"700",color:C.textSub,marginBottom:"8px",letterSpacing:"0.5px" }}>STEMPELKARTE</div>
              <div style={{ display:"flex",gap:"6px",flexWrap:"wrap" }}>
                {[...Array(goal)].map((_,i) => (
                  <div key={i} style={{ width:"36px",height:"36px",borderRadius:"10px",background:i<progress?C.orange:C.card,border:`2px solid ${i<progress?C.orange:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s" }}>
                    {i<progress ? <span style={{ color:C.white,fontSize:"16px" }}>✓</span> : <span style={{ color:C.textLight,fontSize:"12px",fontWeight:"700" }}>{i+1}</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:"11px",color:C.textLight,marginTop:"8px" }}>Max. 1 Stempel pro Stunde · Admin stempelt via QR-Scanner</div>
            </div>
          )}
          {msg && <div style={{ padding:"10px 14px",background:`${C.orange}18`,borderRadius:"10px",fontSize:"13px",fontWeight:"600",color:C.orange,marginBottom:"12px",textAlign:"center" }}>{msg}</div>}

          {!done && !started && (
            <button onClick={startMission} style={{ width:"100%",padding:"13px",background:C.orange,border:"none",borderRadius:"12px",color:C.white,fontSize:"14px",fontWeight:"700" }}>
              Mission starten →
            </button>
          )}

          {/* QR-Code anzeigen damit Admin scannen kann */}
          {!done && started && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"12px",fontWeight:"700",color:C.textSub,marginBottom:"10px",letterSpacing:"0.5px" }}>MEINEN QR-CODE SCANNEN LASSEN</div>
              <div style={{ background:C.white,borderRadius:"16px",padding:"16px",display:"inline-block",boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:`1px solid ${C.border}` }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`cereza:${user?.id}`)}&bgcolor=ffffff&color=111111&margin=5`}
                  style={{ width:"180px",height:"180px",display:"block",borderRadius:"8px" }}
                  alt="Mein QR-Code"
                />
              </div>
              <div style={{ fontSize:"13px",fontWeight:"600",color:C.text,marginTop:"12px" }}>Zeige diesen Code dem Personal</div>
              <div style={{ fontSize:"11px",color:C.textLight,marginTop:"4px" }}>Der Mitarbeiter scannt ihn und stempelt deine Mission</div>
            </div>
          )}

          {done && <div style={{ textAlign:"center",fontSize:"14px",fontWeight:"700",color:C.green,padding:"8px" }}>Mission abgeschlossen! 🎉</div>}
        </div>
      )}
    </Card>
  );
};

// ─── Bestenliste Card (User-Profile PopUp) ────────────────────────
const BestenlisteCard = ({ lb, user }) => {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const addFriend = async (e, userId) => {
    e.stopPropagation();
    if (!user?.id || userId === user.id || addedIds.has(userId)) return;
    setAddingId(userId);
    const { error } = await db.sendFriendRequest(user.id, userId);
    setAddingId(null);
    if (!error) setAddedIds(s => new Set([...s, userId]));
  };

  return (
    <>
      {selectedUserId && <UserProfileCard userId={selectedUserId} currentUser={user} C={C} font={font} onClose={() => setSelectedUserId(null)}/>}
      <Card style={{ marginTop:"6px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
          <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>Bestenliste</div>
          <div style={{ fontSize:"10px",fontWeight:"700",color:C.orange,background:`${C.orange}18`,padding:"3px 10px",borderRadius:"8px" }}>Live</div>
        </div>
        {lb.slice(0,5).map((p,i) => (
          <div key={i} onClick={() => p.id && setSelectedUserId(p.id)}
            style={{ display:"flex",alignItems:"center",gap:"12px",padding:"9px 0",borderBottom:i<4?`1px solid ${C.greyBg}`:"none",cursor:p.id?"pointer":"default" }}>
            <div style={{ width:"24px",fontSize:"15px",fontWeight:"800",color:i<3?C.orange:C.textLight,textAlign:"center" }}>{i+1}</div>
            <div style={{ flex:1,fontSize:"14px",fontWeight:p.name===user.name?"700":"500",color:C.text }}>
              {p.name}{p.name===user.name && <span style={{ fontSize:"10px",color:C.orange,marginLeft:"4px" }}>(Du)</span>}
            </div>
            <div style={{ fontSize:"13px",fontWeight:"700",color:C.green,marginRight:"8px" }}>{p.pts} XP</div>
            {p.id && p.id !== user?.id && (
              <button onClick={e => addFriend(e, p.id)} disabled={addedIds.has(p.id) || addingId===p.id}
                style={{ padding:"4px 10px",borderRadius:"8px",fontSize:"11px",fontWeight:"700",border:`1px solid ${addedIds.has(p.id)?C.green:C.orange}`,background:addedIds.has(p.id)?`${C.green}15`:"transparent",color:addedIds.has(p.id)?C.green:C.orange,cursor:"pointer",flexShrink:0 }}>
                {addedIds.has(p.id) ? "Gesendet" : addingId===p.id ? "..." : "+"}
              </button>
            )}
          </div>
        ))}
      </Card>
    </>
  );
};

// ─── Home Tab ─────────────────────────────────────────────────────
const HomeTab = ({ user, setUser, setTab }) => {
  const era  = ERAS.find(e => e.level===(user.level||1)) || ERAS[0];
  const next = ERAS.find(e => e.level===(user.level||1)+1);
  const pct  = next ? Math.min(100, Math.round(((user.pts-era.pts)/(next.pts-era.pts))*100)) : 100;
  const [fi,       setFi]            = useState(0);
  const [lb,       setLb]            = useState(MOCK_LB);
  const [missions, setMissions]      = useState(MOCK_MISSIONS);
  const [facts,    setFacts]         = useState(FUN_FACTS_DEF);
  const [visit,    setVisitLocal]    = useState(null);
  const [started,  setStarted]       = useState(new Set());
  const [vibe,     setVibe]          = useState(null);
  const [glowInfo, setGlowInfo]      = useState(null);
  const [glowCountdown, setGlowCountdown] = useState("");

  const computeVibe = (yes, no) => {
    const total = yes + no;
    if (!total) return null;
    const p = yes / total;
    if (yes >= 8) return { emoji:"🎉", text:"Cereza Party heute!",      color:C.orange };
    if (yes >= 5) return { emoji:"🔥", text:"Heute brennt's!",          color:C.orange };
    if (yes >= 3) return { emoji:"👋", text:"Schöner Abend wird's!",    color:C.green  };
    if (yes === 2) return { emoji:"🤝", text:"Gemütliche Runde heute",  color:C.green  };
    if (yes === 1) return { emoji:"☕", text:"Stille Stunde – chill",   color:C.textSub};
    if (p < 0.3 && total >= 3) return { emoji:"🌿", text:"Ruhiger Tag heute", color:C.green };
    return null;
  };

  const loadVibe = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('visit_intentions').select('status').eq('planned_date', today);
    if (data) {
      const yes = data.filter(d => d.status==='planned').length;
      const no  = data.filter(d => d.status==='not').length;
      setVibe(computeVibe(yes, no));
    }
  };

  // Glow Hour Countdown Timer
  useEffect(() => {
    const updateGlow = async () => {
      const info = await db.getNextGlowHour();
      setGlowInfo(info);
    };
    updateGlow();
    const glowIv = setInterval(updateGlow, 60000);
    return () => clearInterval(glowIv);
  }, []);

  useEffect(() => {
    if (!glowInfo) { setGlowCountdown(""); return; }
    if (glowInfo.active) {
      // Countdown bis Ende
      const tick = () => {
        const now = new Date();
        const [h,m] = glowInfo.end_time.split(':').map(Number);
        const end = new Date(now); end.setHours(h,m,0,0);
        const diff = end - now;
        if (diff <= 0) { setGlowCountdown(""); return; }
        const mins = Math.floor(diff/60000);
        const secs = Math.floor((diff%60000)/1000);
        setGlowCountdown(`${mins}:${secs.toString().padStart(2,'0')}`);
      };
      tick();
      const iv = setInterval(tick, 1000);
      return () => clearInterval(iv);
    } else if (glowInfo.ms_until) {
      const tick = () => {
        const diff = glowInfo.ms_until - (Date.now() - startRef);
        if (diff <= 0) { setGlowCountdown(""); return; }
        const hrs = Math.floor(diff/3600000);
        const mins = Math.floor((diff%3600000)/60000);
        setGlowCountdown(`${hrs}h ${mins}m`);
      };
      const startRef = Date.now();
      tick();
      const iv = setInterval(tick, 30000);
      return () => clearInterval(iv);
    }
  }, [glowInfo]);

  useEffect(() => {
    db.getLeaderboard().then(d => { if(d.length) setLb(d); });
    db.getMissions().then(d => { if(d.length) setMissions(d); });
    db.getFunFacts().then(d => { if(d.length) setFacts(d.map(f => f.text)); });
    loadVibe();
    if (user?.id) {
      db.getStartedMissions(user.id).then(setStarted);
      const today = new Date().toISOString().split('T')[0];
      db.getVisitIntention(user.id, today).then(d => { if(d) setVisitLocal(d.status); }).catch(() => {});
    }
    const ch = supabase.channel('home-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'missions'},     () => db.getMissions().then(d => { if(d.length) setMissions(d); }))
      .on('postgres_changes',{event:'*',schema:'public',table:'fun_facts'},    () => db.getFunFacts().then(d => { if(d.length) setFacts(d.map(f => f.text)); }))
      .on('postgres_changes',{event:'*',schema:'public',table:'mission_starts'},() => { if(user?.id) db.getStartedMissions(user.id).then(setStarted); })
      .on('postgres_changes',{event:'*',schema:'public',table:'visit_intentions'}, () => loadVibe())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setFi(i => (i+1) % facts.length), 5000);
    return () => clearInterval(iv);
  }, [facts]);

  const setVisit = async status => {
    setVisitLocal(status);
    if (user?.id) {
      const today = new Date().toISOString().split('T')[0];
      await db.setVisitIntention(user.id, today, status);
      loadVibe();
    }
  };

  const activeMissions = missions.filter(m => started.has(m.id));

  return (
    <div style={{ background:C.beige, paddingBottom:"24px", minHeight:"100%" }}>
      {/* Fun Fact Banner */}
      {facts.length > 0 && (
        <div style={{ background:C.orange, padding:`calc(${ST} + 10px) 20px 10px`, display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ fontSize:"9px",fontWeight:"700",letterSpacing:"2px",color:"rgba(255,255,255,0.6)",flexShrink:0 }}>FACT</div>
          <div style={{ fontSize:"12px",color:"rgba(255,255,255,0.9)",lineHeight:1.4,fontWeight:"500" }}>{facts[fi]}</div>
        </div>
      )}

      <div style={{ padding:"16px 20px 12px" }}>
        <div style={{ fontSize:"12px",letterSpacing:"2px",color:C.textLight,fontWeight:"600",textTransform:"uppercase" }}>Willkommen zurück</div>
        <div style={{ fontSize:"28px",fontFamily:font.display,color:C.text,fontWeight:"700",marginTop:"2px" }}>@{user.instagram || user.name || "user"}</div>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* Status Card */}
        <Card style={{ marginBottom:"12px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"1.5px",color:C.textLight,marginBottom:"4px" }}>DEIN STATUS</div>
              <div style={{ fontSize:"30px",fontFamily:font.display,color:C.orange,fontWeight:"700",lineHeight:1 }}>{era.name}</div>
              <div style={{ fontSize:"12px",color:C.textLight,marginTop:"6px" }}>{next ? `Noch ${next.pts-(user.pts||0)} XP zu ${next.name}` : "Max Level erreicht"}</div>
            </div>
            <div style={{ position:"relative",width:"54px",height:"54px" }}>
              <svg width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r="23" fill="none" stroke={C.border} strokeWidth="4"/>
                <circle cx="27" cy="27" r="23" fill="none" stroke={C.orange} strokeWidth="4" strokeDasharray={`${pct*1.445} 144.5`} strokeLinecap="round" transform="rotate(-90 27 27)"/>
              </svg>
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:C.text }}>{pct}%</div>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginTop:"14px" }}>
            {[{v:user.pts||0,l:"XP"},{v:user.total_visits||0,l:"Besuche"},{v:user.streak||0,l:"Streak"}].map((s,i) => (
              <div key={i} style={{ textAlign:"center",padding:"10px 8px",background:C.greyBg,borderRadius:"12px" }}>
                <div style={{ fontSize:"20px",fontWeight:"800",color:C.text }}>{s.v}</div>
                <div style={{ fontSize:"10px",color:C.textLight,marginTop:"2px",fontWeight:"500" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Treat Tracker */}
          <div style={{ marginTop:"16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"8px" }}>
              <div style={{ fontSize:"12px",fontWeight:"600",color:C.textSub }}>Treat Tracker</div>
              <div style={{ fontSize:"12px",fontWeight:"700",color:C.orange }}>{user.treat_count||0}/{user.treat_goal||8}</div>
            </div>
            <div style={{ display:"flex",gap:"4px" }}>
              {[...Array(user.treat_goal||8)].map((_,i) => (
                <div key={i} style={{ flex:1,height:"6px",borderRadius:"3px",background:i<(user.treat_count||0)?C.orange:C.greyBg,transition:"background 0.3s" }}/>
              ))}
            </div>
          </div>
          <button onClick={() => setTab("scan")} style={{ width:"100%",marginTop:"16px",padding:"14px",background:C.text,borderRadius:"14px",color:C.white,fontSize:"15px",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px" }}>
            {I.qr} Punkte scannen
          </button>

          {/* Story-Share Button */}
          <button onClick={() => {
            // Story-Card generieren
            const canvas = document.createElement("canvas");
            canvas.width = 1080; canvas.height = 1920;
            const ctx = canvas.getContext("2d");
            // Background gradient
            const grad = ctx.createLinearGradient(0,0,1080,1920);
            grad.addColorStop(0, "#b02605"); grad.addColorStop(0.5, "#8b1e04"); grad.addColorStop(1, "#5a1003");
            ctx.fillStyle = grad; ctx.fillRect(0,0,1080,1920);
            // Checkered pattern overlay
            ctx.globalAlpha = 0.06;
            for(let y=0;y<1920;y+=80) for(let x=0;x<1080;x+=80) { if((x/80+y/80)%2===0) { ctx.fillStyle="#fef9eb"; ctx.fillRect(x,y,80,80); } }
            ctx.globalAlpha = 1;
            // Logo text
            ctx.fillStyle = "#fef9eb"; ctx.font = "700 72px Gallica, serif"; ctx.textAlign = "center";
            ctx.fillText("cereza", 540, 500);
            ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif"; ctx.letterSpacing = "6px";
            ctx.fillStyle = "rgba(254,249,235,0.4)";
            ctx.fillText("L O Y A L T Y   C L U B", 540, 540);
            // User card area
            ctx.fillStyle = "rgba(254,249,235,0.1)"; roundRect(ctx, 140, 640, 800, 560, 40);
            ctx.fillStyle = "#fef9eb"; ctx.font = "700 48px Gallica, serif"; ctx.textAlign = "center";
            ctx.fillText("@" + (user.instagram||user.name||"user"), 540, 780);
            ctx.fillStyle = "rgba(254,249,235,0.6)"; ctx.font = "500 28px 'Plus Jakarta Sans', sans-serif";
            ctx.fillText(era.name + " \u00b7 Level " + (user.level||1), 540, 830);
            // Stats
            const stats = [{v:user.pts||0,l:"XP"},{v:user.total_visits||0,l:"Besuche"},{v:user.streak||0,l:"Streak"}];
            stats.forEach((s,i) => {
              const sx = 260 + i*280;
              ctx.fillStyle = "#fef9eb"; ctx.font = "800 52px Gallica, serif";
              ctx.fillText(String(s.v), sx, 960);
              ctx.fillStyle = "rgba(254,249,235,0.45)"; ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
              ctx.fillText(s.l, sx, 1000);
            });
            // Watermark
            ctx.fillStyle = "rgba(254,249,235,0.2)"; ctx.font = "500 18px 'Plus Jakarta Sans', sans-serif";
            ctx.fillText("cereza-loyalty.vercel.app", 540, 1800);
            // Share
            canvas.toBlob(async blob => {
              if (!blob) return;
              const file = new File([blob], "cereza-story.png", {type:"image/png"});
              try {
                if (navigator.canShare?.({files:[file]})) {
                  await navigator.share({files:[file], title:"Mein Cereza Status"});
                } else {
                  navigator.share?.({title:"Cereza Loyalty", text:`Ich bin ${era.name} bei Cereza! ${user.pts||0} XP`, url:"https://cereza-loyalty.vercel.app"});
                }
              } catch { /* cancelled */ }
            }, "image/png");
          }} style={{
            width:"100%",marginTop:"10px",padding:"13px",
            background:C.greyBg,borderRadius:"50px",
            color:C.textSub,fontSize:"14px",fontWeight:"600",
            display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"
          }}>
            {I.share} Story teilen
          </button>
        </Card>

        {/* Glow Hour Countdown */}
        {glowCountdown && (
          <Card style={{ marginBottom:"12px", background: glowInfo?.active ? "linear-gradient(135deg,#db2777,#e24a28)" : C.card, border: glowInfo?.active ? "none" : `1px solid ${C.border}` }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:"10px",fontWeight:"700",letterSpacing:"2px",color:glowInfo?.active?"rgba(255,255,255,0.7)":C.textLight }}>{glowInfo?.active ? "GLOW HOUR AKTIV" : "NÄCHSTE GLOW HOUR"}</div>
                <div style={{ fontSize:"13px",fontWeight:"600",color:glowInfo?.active?"#fff":C.textSub,marginTop:"4px" }}>{glowInfo?.active ? "Doppelte XP jetzt!" : "Doppelte XP bald"}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"28px",fontWeight:"800",fontFamily:"monospace",color:glowInfo?.active?"#fff":C.orange }}>{glowCountdown}</div>
                <div style={{ fontSize:"10px",color:glowInfo?.active?"rgba(255,255,255,0.6)":C.textLight }}>{glowInfo?.active ? "verbleibend" : "bis Start"}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Heute kommen? */}
        <Card style={{ marginBottom:"12px" }}>
          <div style={{ fontSize:"14px",fontWeight:"700",color:C.text,marginBottom:"12px" }}>Kommst du heute vorbei?</div>
          <div style={{ display:"flex",gap:"8px",marginBottom:vibe||visit?"10px":"0" }}>
            {[{v:"planned",l:"Ja, heute"},{v:"not",l:"Nicht heute"}].map(o => (
              <button key={o.v} onClick={() => setVisit(o.v)} style={{ flex:1,padding:"11px",borderRadius:"12px",background:visit===o.v?C.orange:C.greyBg,color:visit===o.v?C.white:C.textLight,fontSize:"14px",fontWeight:"600",transition:"all 0.2s" }}>
                {o.l}
              </button>
            ))}
          </div>
          {vibe && (
            <div style={{ display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:`${vibe.color}12`,borderRadius:"12px",animation:"fadeUp 0.4s" }}>
              <span style={{ fontSize:"22px" }}>{vibe.emoji}</span>
              <div style={{ fontSize:"13px",fontWeight:"700",color:vibe.color }}>{vibe.text}</div>
            </div>
          )}
          {visit==="planned" && (
            <div style={{ marginTop:"8px",padding:"10px 12px",background:`${C.green}12`,borderRadius:"12px",textAlign:"center",fontSize:"13px",fontWeight:"600",color:C.green }}>
              🙌 Wir freuen uns auf dich!
            </div>
          )}
        </Card>

        {/* Gestartete Missionen */}
        {activeMissions.length > 0 && (
          <>
            <div style={{ fontSize:"12px",fontWeight:"700",letterSpacing:"1px",color:C.textSub,marginBottom:"10px",textTransform:"uppercase" }}>Meine Missionen</div>
            {activeMissions.slice(0,3).map((m,i) => (
              <MissionCard key={m.id||i} mission={m} user={user} setUser={setUser}/>
            ))}
          </>
        )}

        {/* Bestenliste */}
        <BestenlisteCard lb={lb} user={user}/>

        {/* Matcha Abo */}
        {!user.is_abo_member && (
          <Card style={{ marginTop:"12px",background:"#2d472a",border:"none" }}>
            <div style={{ fontSize:"10px",fontWeight:"700",letterSpacing:"2px",color:"rgba(255,255,255,0.55)",marginBottom:"4px" }}>EXKLUSIV</div>
            <div style={{ fontSize:"20px",fontFamily:font.display,color:"#fff",fontWeight:"700" }}>Matcha Society</div>
            <div style={{ fontSize:"13px",color:"rgba(255,255,255,0.65)",marginTop:"4px" }}>29,99 €/Monat · Unbegrenzte Vorteile</div>
            <button onClick={() => { const u=import.meta.env.VITE_MATCHA_ABO_URL; if(u) window.open(u,"_blank"); }} style={{ marginTop:"12px",padding:"11px 24px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"12px",color:"#fff",fontSize:"13px",fontWeight:"600" }}>
              Mitglied werden
            </button>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Wheel + Missions Tab ─────────────────────────────────────────
// FIX: rotReady verhindert Dreh-Animation beim ersten Render
const WheelTab = ({ user, setUser }) => {
  const [spinning,  setSpinning]  = useState(false);
  const [rot,       setRot]       = useState(0);
  const [rotReady,  setRotReady]  = useState(false); // NEU: verhindert Dreh beim Mount
  const [result,    setResult]    = useState(null);
  const [spins,     setSpins]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [missions,  setMissions]  = useState(MOCK_MISSIONS);
  const [prizes,    setPrizes]    = useState(WHEEL_DEFAULT);
  const MAX=2; const FREE=1;

  useEffect(() => {
    // Rad auf 0 zurücksetzen beim Mount – KEINE Transition
    setRot(0);
    setRotReady(false);

    const init = async () => {
      if (user?.id) {
        const fresh = await db.getProfile(user.id);
        if (fresh) {
          setUser(u => ({ ...u, ...fresh }));
          const today = new Date().toISOString().split('T')[0];
          setSpins(fresh.last_spin_date===today ? (fresh.wheel_spun_today?2:1) : 0);
        }
      }
      const p = await db.getWheelPrizes(); if(p.length) setPrizes(p);
      const m = await db.getMissions();    if(m.length) setMissions(m);
      setLoading(false);
      // Erst NACH dem Rendern sichtbar machen – verhindert Dreh-Animation
      setTimeout(() => setRotReady(true), 80);
    };
    init();

    if (!user?.id) return;
    const ch = supabase.channel('wheel-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'wheel_prizes'}, async () => { const p=await db.getWheelPrizes(); if(p.length) setPrizes(p); })
      .on('postgres_changes',{event:'*',schema:'public',table:'missions'},     async () => { const m=await db.getMissions();    if(m.length) setMissions(m); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const canSpin  = spins < MAX;
  const needsPay = spins >= FREE;

  const spin = async () => {
    if (spinning || !canSpin) return;
    const today = new Date().toISOString().split('T')[0];
    if (user?.id) {
      const fresh = await db.getProfile(user.id);
      if (fresh && fresh.last_spin_date===today && (fresh.wheel_spun_today?2:1)>=MAX) { setSpins(2); return; }
    }
    if (needsPay) {
      const fresh = user?.id ? await db.getProfile(user.id) : null;
      const cur = fresh ? (fresh.pts||0) : (user.pts||0);
      if (cur < 100) return;
      setUser(u => ({ ...u, pts:cur-100 }));
      if (user?.id) await db.updateProfile(user.id, { pts:cur-100 });
    }
    setSpinning(true); setResult(null); Sound.spin();
    const idx = Math.floor(Math.random() * prizes.length);
    const seg = 360 / prizes.length;
    setRot(r => r + 360*7 + (360 - idx*seg - seg/2));
    setTimeout(async () => {
      setSpinning(false); setSpins(s => s+1);
      const prize = prizes[idx]; setResult(prize);
      prize.value > 0 ? Sound.win() : Sound.lose();
      const fresh = user?.id ? await db.getProfile(user.id) : null;
      const cur   = fresh ? (fresh.pts||0) : (user.pts||0);
      const today2 = new Date().toISOString().split('T')[0];
      const upd = { wheel_spun_today:true, last_spin_date:today2 };
      if (prize.value > 0) { upd.pts=cur+prize.value; setUser(u => ({ ...u, pts:upd.pts, wheel_spun_today:true })); }
      else setUser(u => ({ ...u, wheel_spun_today:true }));
      if (user?.id) await db.updateProfile(user.id, upd);
    }, 5200);
  };

  const sz=280, cx=sz/2, cy=sz/2, r=sz/2-12;

  return (
    <div style={{ background:C.beige, paddingBottom:"24px", minHeight:"100%" }}>
      <div style={{ padding:`calc(${ST} + 20px) 20px 14px` }}>
        <div style={{ fontSize:"12px",letterSpacing:"2px",color:C.textLight,fontWeight:"600",textTransform:"uppercase" }}>Täglich</div>
        <div style={{ fontSize:"28px",fontFamily:font.display,color:C.text,fontWeight:"700" }}>Glücksrad & Missionen</div>
      </div>
      <div style={{ padding:"0 16px" }}>
        {/* Glücksrad */}
        <Card style={{ marginBottom:"16px", padding:"20px", textAlign:"center" }}>
          <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",color:C.textLight,marginBottom:"4px" }}>TÄGLICH</div>
          <div style={{ fontSize:"20px",fontFamily:font.display,color:C.text,fontWeight:"700",marginBottom:"18px" }}>Glücksrad</div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute",top:"-3px",left:"50%",transform:"translateX(-50%)",zIndex:3,width:0,height:0,borderLeft:"9px solid transparent",borderRight:"9px solid transparent",borderTop:`16px solid ${C.orange}` }}/>
              <div style={{ position:"absolute",inset:"-5px",borderRadius:"50%",border:`3px solid ${C.border}`,boxShadow:spinning?"0 0 28px rgba(226,74,40,0.25)":"none",transition:"box-shadow 0.5s",pointerEvents:"none" }}/>
              {/* FIX: opacity:0 bis rotReady, transition nur beim Spinning */}
              <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}
                style={{
                  transform:`rotate(${rot}deg)`,
                  transition: spinning ? "transform 5.2s cubic-bezier(0.1,0.6,0.1,1)" : "none",
                  display:"block",
                  opacity: rotReady ? 1 : 0,
                }}>
                {prizes.map((p,i) => {
                  const seg=360/prizes.length, s=(i*seg-90)*Math.PI/180, e=((i+1)*seg-90)*Math.PI/180, mid=(s+e)/2;
                  return (
                    <g key={i}>
                      <path d={`M${cx},${cy} L${cx+r*Math.cos(s)},${cy+r*Math.sin(s)} A${r},${r} 0 0,1 ${cx+r*Math.cos(e)},${cy+r*Math.sin(e)} Z`} fill={p.color||"#f5f5f5"} stroke="#fff" strokeWidth="2"/>
                      <text x={cx+(r*0.65)*Math.cos(mid)} y={cy+(r*0.65)*Math.sin(mid)} transform={`rotate(${i*seg+seg/2},${cx+(r*0.65)*Math.cos(mid)},${cy+(r*0.65)*Math.sin(mid)})`} textAnchor="middle" dominantBaseline="middle" fill={WHEEL_TC[i%WHEEL_TC.length]} fontSize="11" fontWeight="700" fontFamily={font.ui}>{p.label}</text>
                    </g>
                  );
                })}
                <circle cx={cx} cy={cy} r="32" fill="white" stroke={C.orange} strokeWidth="2.5" style={{ filter:"drop-shadow(0 2px 8px rgba(226,74,40,0.3))" }}/>
                <text x={cx} y={cy+11} textAnchor="middle" dominantBaseline="middle" fill={C.orange} fontSize="30" fontWeight="900" fontFamily="Playfair Display,serif">c</text>
              </svg>
            </div>
            <button onClick={spin} disabled={spinning||!canSpin||(needsPay&&(user.pts||0)<100)}
              style={{ marginTop:"18px",padding:"14px 48px",borderRadius:"50px",fontSize:"15px",fontWeight:"700",background:!canSpin?C.greyBg:C.orange,color:!canSpin?C.textLight:C.white,transition:"all 0.2s" }}>
              {!canSpin?"Fertig für heute":spinning?"Dreht...":needsPay?"Nochmal (100 XP)":"Drehen"}
            </button>
            <div style={{ fontSize:"11px",color:C.textLight,marginTop:"6px" }}>{spins}/{MAX} Spins heute</div>
            {result && (
              <Card style={{ marginTop:"12px",padding:"14px",animation:"scaleIn 0.4s",maxWidth:"200px" }}>
                <div style={{ fontSize:"15px",fontWeight:"800",color:result.value>0?C.orange:C.text }}>
                  {result.value>0?`+${result.value} XP!`:result.value===-1?"2× XP heute!":"Kein Glück"}
                </div>
              </Card>
            )}
          </div>
        </Card>

        {/* Missionen */}
        <div style={{ fontSize:"12px",fontWeight:"700",letterSpacing:"1px",color:C.textSub,marginBottom:"10px",textTransform:"uppercase" }}>Missionen</div>
        {missions.map((m,i) => <MissionCard key={m.id||i} mission={m} user={user} setUser={setUser}/>)}
      </div>
    </div>
  );
};

// ─── Scan Tab ─────────────────────────────────────────────────────
// Scannt QR-Codes von Belegen. Format: cereza:PTS:TOKEN
// Token wird im Admin Panel → QR-Gen generiert
// cereza:USER_ID QR-Codes (User-QR) werden ABGELEHNT

const QR_SECRET = "czlyl2024";

const validateBelegQR = (text) => {
  text = (text||"").trim();
  if (!text.startsWith("cereza:")) return null;
  const parts = text.split(":");
  // Format cereza:PTS:TOKEN – Beleg-QR
  if (parts.length === 3) {
    const pts = parseInt(parts[1]);
    const token = parts[2];
    if (isNaN(pts) || pts <= 0 || pts > 999999) return null;
    const expected = btoa(`${pts}:${QR_SECRET}`).replace(/=/g,"").substring(0,8);
    if (token === expected) return pts;
    return null;
  }
  // UUID-Format = User-QR → ablehnen
  const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (parts.length === 2 && uuidRx.test(parts[1])) return null;
  return null;
};

const ScanTab = ({ user, setUser }) => {
  const [scanning, setScanning] = useState(false);
  const [done,     setDone]     = useState(false);
  const [pts,      setPts]      = useState(0);
  const [err,      setErr]      = useState("");
  const [streak,   setStreak]   = useState(0);
  const [treatDone,setTreatDone]= useState(false);
  const scannerRef = useRef(null);

  const award = async p => {
    setPts(p); Sound.scan();
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0];
    const fresh = user?.id ? await db.getProfile(user.id) : null;
    const np  = (fresh?.pts||user.pts||0) + p;
    const nv  = (fresh?.total_visits||user.total_visits||0) + 1;
    const lv  = fresh?.last_visit || null;
    const ns  = lv===yesterday ? (fresh?.streak||0)+1 : lv===today ? (fresh?.streak||0) : 1;
    const tg  = fresh?.treat_goal || 8;
    const tc  = (fresh?.treat_count||0) + 1;
    const nt  = tc >= tg ? 0 : tc;
    const won = tc >= tg;
    setStreak(ns); setTreatDone(won);
    setUser(u => ({ ...u, pts:np, total_visits:nv, treat_count:nt, streak:ns }));
    if (user?.id) {
      await db.updateProfile(user.id, { pts:np, total_visits:nv, treat_count:nt, streak:ns, last_visit:today });
      await supabase.from("scan_log").insert({ user_id:user.id, pts_earned:p, was_glow_hour:false });
    }
    setDone(true);
  };

  const startScan = async () => {
    setScanning(true); setErr("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("qr-reader"); scannerRef.current = s;
      await s.start(
        { facingMode:"environment" },
        { fps:10, qrbox:{ width:220, height:220 } },
        async (text) => {
          await s.stop(); setScanning(false);
          const p = validateBelegQR(text);
          if (p !== null) {
            await award(p);
          } else if (text.includes("cereza:")) {
            setErr("Das ist dein persönlicher QR-Code. Scanne den QR-Code auf deinem Kassenbeleg.");
          } else {
            setErr("Ungültiger QR-Code. Bitte den Cereza-Code vom Beleg scannen.");
          }
        },
        () => {}
      );
    } catch(e) {
      setScanning(false);
      setErr("Kamera konnte nicht gestartet werden.");
    }
  };

  const reset = () => { setDone(false); setPts(0); setErr(""); setStreak(0); setTreatDone(false); };

  useEffect(() => () => { if(scannerRef.current) try { scannerRef.current.stop(); } catch(e) {} }, []);

  return (
    <div style={{ background:C.beige, minHeight:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:`calc(${ST} + 40px) 24px calc(${SB} + 40px)` }}>
      {/* Mein QR-Code Bereich */}
      {!done && !scanning && !err && (
        <div style={{ marginBottom:"28px",textAlign:"center" }}>
          <div style={{ fontSize:"10px",letterSpacing:"2.5px",color:C.textLight,fontWeight:"700",textTransform:"uppercase",marginBottom:"8px" }}>Dein Code</div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:"8px",padding:"10px 20px",background:C.card,borderRadius:"16px",boxShadow:"0 2px 16px rgba(29,28,19,0.05)" }}>
            <span style={{ fontSize:"18px" }}>▣</span>
            <span style={{ fontSize:"14px",fontWeight:"700",color:C.text,fontFamily:"monospace",letterSpacing:"1px" }}>cereza:{(user.id||"").slice(0,8)}</span>
          </div>
          <div style={{ fontSize:"11px",color:C.textLight,marginTop:"6px" }}>Zeige diesen Code an der Kasse</div>
        </div>
      )}

      {!done ? (
        <>
          <div style={{ fontSize:"11px",letterSpacing:"3px",color:C.textLight,fontWeight:"600",marginBottom:"6px",textTransform:"uppercase" }}>Beleg scannen</div>
          <div style={{ fontSize:"28px",fontFamily:font.display,color:C.text,fontWeight:"700",marginBottom:"8px" }}>Punkte sammeln</div>
          <div style={{ fontSize:"13px",color:C.textLight,marginBottom:"24px",textAlign:"center" }}>Scanne den QR-Code auf deinem Kassenbeleg</div>

          <div id="qr-reader" style={{ width:"250px",height:"250px",borderRadius:"20px",overflow:"hidden",background:"#111",border:`2.5px solid ${scanning?C.orange:err?C.orange+"88":C.border}`,transition:"border-color 0.3s",flexShrink:0 }}/>

          {err && (
            <div style={{ marginTop:"16px",padding:"12px 18px",background:`${C.orange}12`,borderRadius:"14px",textAlign:"center",maxWidth:"280px" }}>
              <div style={{ fontSize:"13px",color:C.orange,fontWeight:"600",lineHeight:1.5 }}>{err}</div>
              <button onClick={() => { setErr(""); }} style={{ marginTop:"10px",fontSize:"13px",color:C.orange,background:"none",border:`1px solid ${C.orange}`,borderRadius:"20px",padding:"6px 18px",cursor:"pointer",fontWeight:"600" }}>
                Nochmal versuchen
              </button>
            </div>
          )}

          {!err && (
            scanning
              ? <button onClick={async () => { if(scannerRef.current) try{await scannerRef.current.stop()}catch(e){} setScanning(false); }}
                  style={{ marginTop:"22px",padding:"14px 36px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"50px",color:C.textSub,fontSize:"14px",fontWeight:"600" }}>
                  Abbrechen
                </button>
              : <button onClick={startScan}
                  style={{ marginTop:"22px",padding:"15px 44px",background:C.orange,borderRadius:"50px",color:C.white,fontSize:"15px",fontWeight:"700",display:"flex",alignItems:"center",gap:"10px",border:"none" }}>
                  {I.cam} Kamera starten
                </button>
          )}
        </>
      ) : (
        <div style={{ textAlign:"center", animation:"scaleIn 0.4s", width:"100%", maxWidth:"300px" }}>
          <div style={{ fontSize:"56px",marginBottom:"8px" }}>🎉</div>
          <div style={{ fontSize:"48px",fontWeight:"900",color:C.orange,fontFamily:font.display,lineHeight:1 }}>+{pts}</div>
          <div style={{ fontSize:"20px",fontWeight:"700",color:C.orange,marginBottom:"4px" }}>XP</div>
          <div style={{ color:C.textLight,fontSize:"14px",marginTop:"4px" }}>Punkte gutgeschrieben!</div>

          {streak > 1 && (
            <div style={{ marginTop:"14px",padding:"12px 20px",background:`${C.orange}15`,borderRadius:"14px",display:"inline-flex",alignItems:"center",gap:"8px" }}>
              <span style={{ fontSize:"22px" }}>🔥</span>
              <div>
                <div style={{ fontSize:"15px",fontWeight:"800",color:C.orange }}>{streak} Tage Streak!</div>
                <div style={{ fontSize:"11px",color:C.textLight }}>Weiter so!</div>
              </div>
            </div>
          )}

          {treatDone && (
            <div style={{ marginTop:"12px",padding:"14px 20px",background:`${C.green}15`,borderRadius:"14px",border:`1px solid ${C.green}33` }}>
              <div style={{ fontSize:"22px",marginBottom:"4px" }}>🎁</div>
              <div style={{ fontSize:"15px",fontWeight:"700",color:C.green }}>Gratis-Treat verdient!</div>
              <div style={{ fontSize:"12px",color:C.textLight,marginTop:"2px" }}>Zeige es an der Kasse</div>
            </div>
          )}

          <button onClick={reset} style={{ marginTop:"24px",padding:"14px 40px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"50px",color:C.text,fontSize:"14px",fontWeight:"600" }}>
            Nochmal scannen
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Cinder (Vote) Tab ────────────────────────────────────────────
// FIX: dir und dragX werden beim Mount auf null/0 gesetzt
const VoteTab = ({ user, setUser }) => {
  const [allDishes, setAllDishes] = useState([]);
  const [unvoted,   setUnvoted]   = useState([]);
  const [cur,       setCur]       = useState(0);
  const [dir,       setDir]       = useState(null);  // null beim Mount = keine Transition
  const [dragX,     setDragX]     = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [visit,     setVisitLocal]= useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [sugName, setSugName] = useState("");
  const [sugDesc, setSugDesc] = useState("");
  const [sugSent, setSugSent] = useState(false);

  useEffect(() => {
    // Reset beim Tab-Öffnen
    setDir(null);
    setDragX(0);
    setCur(0);

    const init = async () => {
      const dishes = await db.getDishes();
      const list   = dishes.length ? dishes : MOCK_DISHES;
      setAllDishes(list);
      if (user?.id) {
        const voted = await db.getUserVotes(user.id);
        setUnvoted(list.filter(d => !voted.has(d.id)));
        const today = new Date().toISOString().split('T')[0];
        db.getVisitIntention(user.id, today).then(d => { if(d) setVisitLocal(d.status); }).catch(() => {});
      } else {
        setUnvoted(list);
      }
      setLoading(false);
    };
    init();

    if (!user?.id) return;
    const ch = supabase.channel('cinder-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'dishes'}, async () => {
        const dishes = await db.getDishes(); if(!dishes.length) return;
        setAllDishes(dishes);
        const voted = await db.getUserVotes(user.id);
        setUnvoted(dishes.filter(d => !voted.has(d.id)));
        setCur(0);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const dish = unvoted[cur];
  const done = cur >= unvoted.length;

  const doVote = async liked => {
    if (!dish || dir) return;
    Sound.vote();
    setDir(liked ? "right" : "left");
    if (user?.id) {
      await db.voteDish(user.id, dish.id, liked).catch(() => {});
      if (liked) {
        const fresh = await db.getProfile(user.id);
        if (fresh) { await db.updateProfile(user.id, { pts:(fresh.pts||0)+10 }); setUser(u => ({ ...u, pts:(u.pts||0)+10 })); }
      }
    }
    setTimeout(() => { setDir(null); setDragX(0); setCur(i => i+1); }, 320);
  };

  const setVisit = async status => {
    setVisitLocal(status);
    if (user?.id) { const today=new Date().toISOString().split('T')[0]; await db.setVisitIntention(user.id,today,status); }
  };

  if (loading) return <div style={{ background:C.beige,minHeight:"100%",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ color:C.textLight }}>Wird geladen...</div></div>;

  // FIX: transition ist nur aktiv wenn dir gesetzt oder dragX > 0
  // Bei dir=null UND dragX=0 → "none" → keine ungewollte Animation
  const cardTransform = dir==="left"
    ? "translateX(-110%) rotate(-18deg)"
    : dir==="right"
    ? "translateX(110%) rotate(18deg)"
    : `translateX(${dragX}px) rotate(${dragX*0.035}deg)`;

  const cardTransition = dir ? "all 0.32s cubic-bezier(0.4,0,0.2,1)" : "none";

  return (
    <div style={{ background:C.beige, paddingBottom:"24px", minHeight:"100%" }}>
      <div style={{ padding:`calc(${ST} + 20px) 20px 14px`,display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:"11px",letterSpacing:"3px",color:C.textLight,fontWeight:"600",textTransform:"uppercase" }}>Cinder</div>
          <div style={{ fontSize:"26px",fontFamily:font.display,color:C.text,fontWeight:"700" }}>{done?"Ergebnisse":"Was kommt auf die Karte?"}</div>
        </div>
        {!done && <div style={{ fontSize:"13px",color:C.textLight,fontWeight:"600" }}>{cur+1}/{unvoted.length}</div>}
      </div>

      <div style={{ padding:"0 16px" }}>
        <Card style={{ marginBottom:"12px" }}>
          <div style={{ fontSize:"13px",fontWeight:"600",color:C.text,marginBottom:"10px" }}>Kommst du heute vorbei?</div>
          <div style={{ display:"flex",gap:"8px" }}>
            {[{v:"planned",l:"Ja, heute"},{v:"not",l:"Nicht heute"}].map(o => (
              <button key={o.v} onClick={() => setVisit(o.v)} style={{ flex:1,padding:"10px",borderRadius:"12px",background:visit===o.v?C.orange:C.greyBg,color:visit===o.v?C.white:C.textLight,fontSize:"13px",fontWeight:"600",transition:"all 0.2s" }}>{o.l}</button>
            ))}
          </div>
        </Card>

        {!done ? (
          <>
            {dish && !dish.image_url && user?.is_admin && (
              <div style={{ marginBottom:"8px",padding:"10px 14px",background:`${C.orange}12`,borderRadius:"12px",display:"flex",alignItems:"center",gap:"10px" }}>
                <div style={{ fontSize:"12px",color:C.orange,fontWeight:"600",flex:1 }}>Kein Bild für "{dish.name}"</div>
                <label style={{ padding:"6px 12px",background:C.orange,borderRadius:"8px",color:C.white,fontSize:"12px",fontWeight:"600",cursor:"pointer" }}>
                  {I.img} Hochladen
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
                    const f=e.target.files?.[0]; if(!f||!dish?.id) return;
                    const ext=f.name.split('.').pop();
                    const path=`dishes/${dish.id}.${ext}`;
                    const{error}=await supabase.storage.from('avatars').upload(path,f,{upsert:true,contentType:f.type});
                    if(!error){ const{data:u}=supabase.storage.from('avatars').getPublicUrl(path); await supabase.from('dishes').update({image_url:u.publicUrl+'?t='+Date.now()}).eq('id',dish.id); }
                  }}/>
                </label>
              </div>
            )}

            <div
              onTouchStart={e  => setDragStart(e.touches[0].clientX)}
              onTouchMove={e   => { if(dragStart!==null) setDragX(e.touches[0].clientX - dragStart); }}
              onTouchEnd={()   => { if(Math.abs(dragX)>70) doVote(dragX>0); else setDragX(0); setDragStart(null); }}>
              <Card style={{ padding:0,overflow:"hidden",borderRadius:"20px",boxShadow:"0 8px 32px rgba(0,0,0,0.09)",transform:cardTransform,transition:cardTransition,opacity:dir?0:Math.max(0.4,1-Math.abs(dragX)*0.003) }}>
                <div style={{ height:"240px",background:`linear-gradient(135deg,${C.beige},${C.greyBg})`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden" }}>
                  {dish?.image_url
                    ? <img src={dish.image_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",opacity:0.3 }}><div style={{ color:C.text }}>{I.img}</div><div style={{ fontSize:"12px",color:C.textLight }}>Kein Bild</div></div>
                  }
                  {Math.abs(dragX)>30 && <div style={{ position:"absolute",inset:0,background:dragX>0?"rgba(45,71,42,0.35)":"rgba(226,74,40,0.35)",display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ fontSize:"64px",color:"white" }}>{dragX>0?"♥":"✕"}</div></div>}
                  <div style={{ position:"absolute",bottom:"10px",right:"12px",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",color:"white",borderRadius:"10px",padding:"3px 10px",fontSize:"12px",fontWeight:"700" }}>{dish?.votes} Votes</div>
                </div>
                <div style={{ padding:"18px" }}>
                  <div style={{ fontSize:"20px",fontFamily:font.display,fontWeight:"700",color:C.text }}>{dish?.name}</div>
                  <div style={{ fontSize:"13px",color:C.textLight,marginTop:"4px",lineHeight:1.5 }}>{dish?.description}</div>
                  <div style={{ fontSize:"12px",color:C.orange,fontWeight:"600",marginTop:"8px" }}>+10 XP für deinen Vote</div>
                </div>
              </Card>
            </div>
            <div style={{ display:"flex",justifyContent:"center",gap:"28px",marginTop:"22px",alignItems:"center" }}>
              <button onPointerDown={e => e.preventDefault()} onClick={() => doVote(false)} style={{ width:"62px",height:"62px",borderRadius:"50%",background:C.card,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.07)",color:C.textSub }}>{I.x}</button>
              <button onPointerDown={e => e.preventDefault()} onClick={() => doVote(true)}  style={{ width:"74px",height:"74px",borderRadius:"50%",background:C.orange,border:"none",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 24px ${C.orange}55`,color:"white" }}>{I.heartFill}</button>
            </div>
            <div style={{ textAlign:"center",color:C.textLight,fontSize:"11px",marginTop:"12px" }}>Swipe oder Buttons</div>

            {/* Gericht vorschlagen ab Level 5 */}
            {(user?.level||1) >= 5 && (
              <Card style={{ marginTop:"16px" }}>
                {!showSuggest ? (
                  <button onClick={() => setShowSuggest(true)} style={{ width:"100%",padding:"12px",background:"transparent",border:`1px dashed ${C.orange}`,borderRadius:"12px",color:C.orange,fontSize:"13px",fontWeight:"700",cursor:"pointer" }}>
                    + Gericht vorschlagen
                  </button>
                ) : sugSent ? (
                  <div style={{ textAlign:"center",padding:"12px" }}>
                    <div style={{ fontSize:"24px",marginBottom:"4px" }}>✓</div>
                    <div style={{ fontSize:"14px",fontWeight:"700",color:C.green }}>Vorschlag gesendet!</div>
                    <div style={{ fontSize:"12px",color:C.textLight,marginTop:"4px" }}>Der Admin wird ihn prüfen.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:"12px",fontWeight:"700",letterSpacing:"1px",color:C.textSub,marginBottom:"10px" }}>GERICHT VORSCHLAGEN</div>
                    <input value={sugName} onChange={e=>setSugName(e.target.value)} placeholder="Name des Gerichts" style={{ width:"100%",padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:"12px",fontSize:"15px",marginBottom:"8px",outline:"none",boxSizing:"border-box",background:C.card,color:C.text }}/>
                    <input value={sugDesc} onChange={e=>setSugDesc(e.target.value)} placeholder="Beschreibung (optional)" style={{ width:"100%",padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:"12px",fontSize:"15px",marginBottom:"12px",outline:"none",boxSizing:"border-box",background:C.card,color:C.text }}/>
                    <div style={{ display:"flex",gap:"8px" }}>
                      <button onClick={() => setShowSuggest(false)} style={{ flex:1,padding:"11px",background:C.greyBg,borderRadius:"12px",color:C.textLight,fontSize:"14px",fontWeight:"600" }}>Abbrechen</button>
                      <button onClick={async () => {
                        if (!sugName.trim() || !user?.id) return;
                        await db.suggestDish(user.id, sugName.trim(), sugDesc.trim());
                        setSugSent(true);
                        setTimeout(() => { setShowSuggest(false); setSugSent(false); setSugName(""); setSugDesc(""); }, 2500);
                      }} style={{ flex:1,padding:"11px",background:C.orange,borderRadius:"12px",color:C.white,fontSize:"14px",fontWeight:"700" }}>Senden</button>
                    </div>
                  </>
                )}
              </Card>
            )}
          </>
        ) : (
          <>
            <Card style={{ padding:"20px",textAlign:"center",marginBottom:"14px" }}>
              <div style={{ color:C.orange,marginBottom:"8px" }}>{I.heartFill}</div>
              <div style={{ fontSize:"18px",fontWeight:"700",color:C.text }}>Alle Gerichte bewertet!</div>
              <div style={{ fontSize:"13px",color:C.textLight,marginTop:"4px" }}>Danke für dein Feedback</div>
            </Card>
            <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"1px",color:C.textSub,marginBottom:"10px",textTransform:"uppercase" }}>Aktuelle Ergebnisse</div>
            {[...allDishes].sort((a,b) => (b.votes||0)-(a.votes||0)).map((d,i) => (
              <Card key={d.id} style={{ marginBottom:"8px",padding:"14px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ width:"28px",height:"28px",borderRadius:"8px",background:i===0?C.orange:C.greyBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"800",color:i===0?C.white:C.textLight,flexShrink:0 }}>#{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"14px",fontWeight:"600",color:C.text }}>{d.name}</div>
                  <div style={{ fontSize:"11px",color:C.textLight,marginTop:"2px" }}>{d.description}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"17px",fontWeight:"800",color:C.orange }}>{d.votes||0}</div>
                  <div style={{ fontSize:"10px",color:C.textLight }}>Votes</div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Profile Tab ──────────────────────────────────────────────────
const ProfileTab = ({ user, setUser, onLogout, theme }) => {
  const { mode, setMode, glow, setGlow, isGlow } = theme || {};
  const era = ERAS.find(e => e.level===(user.level||1)) || ERAS[0];
  const [editing,      setEditing]     = useState(false);
  const [uname,        setUname]       = useState(user.name||"");
  const [insta,        setInsta]       = useState(user.instagram||"");
  const [items,        setItems]       = useState(MOCK_SHOP);
  const [rd,           setRd]          = useState(null);
  const [showShare,    setShowShare]   = useState(false);
  const [social,       setSocial]      = useState("score");
  const [friends,      setFriends]     = useState([]);
  const [gifts,        setGifts]       = useState([]);
  const [searchQ,      setSearchQ]     = useState("");
  const [searchRes,    setSearchRes]   = useState([]);
  const [giftTarget,   setGiftTarget]  = useState(null);
  const [giftAmt,      setGiftAmt]     = useState(50);
  const [giftMsg,      setGiftMsg]     = useState("");
  const [vibes,        setVibes]       = useState([]);
  const [pendingCount, setPendingCount]= useState(0);
  const [profilePopup, setProfilePopup]= useState(null);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    const f = await db.getFriendRequests(user.id);
    setFriends(f);
    setPendingCount(f.filter(x => x.status==="pending" && x.receiver_id===user.id).length);
  }, [user?.id]);

  useEffect(() => {
    db.getShopItems().then(d => { if(d.length) setItems(d); });
    db.getApprovedVibes().then(setVibes);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadFriends();
    db.getMyGifts(user.id).then(setGifts);
    db.getApprovedVibes().then(setVibes);
  }, [social]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('friends-rt-' + user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'friendships',filter:`receiver_id=eq.${user.id}`}, () => { Sound.notify(); loadFriends(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  const save = async () => {
    setUser(u => ({ ...u, name:uname, instagram:insta }));
    if (user?.id) await db.updateProfile(user.id, { name:uname, instagram:insta });
    setEditing(false);
  };

  const redeem = async item => {
    const fresh = user?.id ? await db.getProfile(user.id) : null;
    const p = fresh?.pts || (user.pts||0);
    const l = fresh?.level || (user.level||1);
    if (p < item.cost || l < item.min_level) return;
    const res = await db.redeemItem(user.id, item.id, item.cost);
    if (res?.error) return;
    setUser(u => ({ ...u, pts:p-item.cost }));
    Sound.redeem(); setRd(item); setTimeout(() => setRd(null), 3000);
  };

  const searchUsers = async q => {
    setSearchQ(q);
    if (q.length < 2) { setSearchRes([]); return; }
    const r = await db.searchUsers(q);
    setSearchRes(r.filter(x => x.id !== user?.id));
  };

  const sendGiftPts = async () => {
    if (!giftTarget || giftAmt < 10 || giftAmt > 500) return;
    const fresh = user?.id ? await db.getProfile(user.id) : null;
    const cur = fresh?.pts || (user.pts||0);
    if (cur < giftAmt) return;
    const res = await db.sendGift(user.id, giftTarget.id, "pts", giftAmt, null, giftMsg);
    if (res?.error) { alert(res.error); return; }
    await db.updateProfile(user.id, { pts:cur-giftAmt });
    setUser(u => ({ ...u, pts:cur-giftAmt }));
    Sound.gift(); setGiftTarget(null); setGiftAmt(50); setGiftMsg("");
    db.getMyGifts(user.id).then(setGifts);
  };

  const shareApp = () => {
    const link = `https://cereza-loyalty.vercel.app?ref=${user.name||"friend"}`;
    if (navigator.share) navigator.share({ title:"Cereza Loyalty", text:"Wir bekommen beide XP!", url:link });
    else { navigator.clipboard?.writeText(link); setShowShare(true); setTimeout(() => setShowShare(false), 2000); }
  };

  const myFriends   = friends.filter(f => f.status==="accepted");
  const pendingRcv  = friends.filter(f => f.status==="pending" && f.receiver_id===user.id);

  return (
    <div style={{ background:C.beige, paddingBottom:"32px", minHeight:"100%" }}>
      {/* User Profile PopUp */}
      {profilePopup && <UserProfileCard userId={profilePopup} currentUser={user} C={C} font={font} onClose={() => setProfilePopup(null)}/>}

      {/* Redemption Overlay */}
      {rd && (
        <div style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"scaleIn 0.3s" }}>
          <div style={{ color:C.white,marginBottom:"8px" }}>{I.check}</div>
          <div style={{ color:C.white,fontSize:"20px",fontWeight:"700" }}>Eingelöst!</div>
          <div style={{ color:"rgba(255,255,255,0.5)",fontSize:"13px",marginTop:"4px" }}>Zeige dies an der Kasse</div>
          <div style={{ color:C.white,fontSize:"22px",fontFamily:font.display,marginTop:"12px" }}>{rd.name}</div>
        </div>
      )}
      {showShare && <div style={{ position:"fixed",top:"24px",left:"50%",transform:"translateX(-50%)",background:C.green,color:C.white,padding:"11px 22px",borderRadius:"12px",fontSize:"13px",fontWeight:"600",zIndex:999,animation:"fadeUp 0.3s" }}>Link kopiert!</div>}

      {/* Gift Modal */}
      {giftTarget && (
        <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end" }}>
          <div style={{ background:C.card,borderRadius:"24px 24px 0 0",padding:"24px 20px",width:"100%",boxSizing:"border-box",paddingBottom:`calc(24px + ${SB})` }}>
            <div style={{ fontSize:"17px",fontWeight:"700",color:C.text,marginBottom:"16px" }}>XP schenken an @{giftTarget.name}</div>
            <input type="number" value={giftAmt} onChange={e => setGiftAmt(Number(e.target.value))} min="10" max="200" style={{ width:"100%",padding:"13px 16px",border:`1px solid ${C.border}`,borderRadius:"13px",fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"10px",background:C.card,color:C.text }}/>
            <input value={giftMsg} onChange={e => setGiftMsg(e.target.value)} placeholder="Nachricht (optional)" style={{ width:"100%",padding:"13px 16px",border:`1px solid ${C.border}`,borderRadius:"13px",fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"12px",background:C.card,color:C.text }}/>
            <div style={{ fontSize:"12px",color:C.textLight,marginBottom:"14px" }}>Max. 500 XP verschenkbar</div>
            <button onClick={sendGiftPts} style={{ width:"100%",padding:"14px",background:C.orange,borderRadius:"14px",color:C.white,fontSize:"15px",fontWeight:"700",marginBottom:"8px" }}>Senden</button>
            <button onClick={() => setGiftTarget(null)} style={{ width:"100%",padding:"13px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"14px",color:C.textLight,fontSize:"14px" }}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding:`calc(${ST} + 20px) 20px 0`,textAlign:"center" }}>
        <div style={{ position:"relative",display:"inline-block",marginBottom:"12px" }}>
          {user.avatar_url
            ? <img src={user.avatar_url} style={{ width:"76px",height:"76px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.card}` }}/>
            : <div style={{ width:"76px",height:"76px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",color:C.white,fontWeight:"700" }}>{(user.name||"U")[0].toUpperCase()}</div>
          }
          <label style={{ position:"absolute",bottom:"-2px",right:"-2px",width:"26px",height:"26px",borderRadius:"50%",background:C.card,border:`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.textLight }}>
            +<input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
              const f=e.target.files?.[0]; if(!f||!user?.id) return;
              const r=await db.uploadAvatar(user.id,f);
              if(r?.url) setUser(u=>({...u,avatar_url:r.url}));
            }}/>
          </label>
        </div>
        <div style={{ fontSize:"20px",fontFamily:font.display,fontWeight:"700",color:C.text }}>@{user.instagram || user.name || "user"}</div>
        <div style={{ fontSize:"12px",color:C.textLight,marginTop:"2px" }}>{era.name} · Level {user.level||1}</div>

        <div style={{ display:"flex",gap:"8px",justifyContent:"center",marginTop:"12px" }}>
          <button onClick={shareApp} style={{ padding:"9px 18px",background:C.orange,borderRadius:"50px",fontSize:"13px",fontWeight:"700",color:C.white }}>+ Einladen</button>
        </div>
      </div>

      <div style={{ padding:"16px" }}>
        {/* Stats */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"14px" }}>
          {[{v:user.pts||0,l:"XP"},{v:user.total_visits||0,l:"Besuche"},{v:user.streak||0,l:"Streak"}].map((s,i) => (
            <Card key={i} style={{ padding:"12px",textAlign:"center" }}>
              <div style={{ fontSize:"20px",fontWeight:"800",color:C.text }}>{s.v}</div>
              <div style={{ fontSize:"10px",color:C.textLight,marginTop:"2px" }}>{s.l}</div>
            </Card>
          ))}
        </div>

        {/* Social Tabs */}
        <div style={{ display:"flex",gap:"3px",marginBottom:"14px",background:C.greyBg,borderRadius:"14px",padding:"3px" }}>
          {[{id:"score",l:"Rewards"},{id:"friends",l:"Freunde"},{id:"gifts",l:"Geschenke"},{id:"vibes",l:"Vibes"}].map(s => (
            <button key={s.id} onClick={() => setSocial(s.id)} style={{ flex:1,padding:"9px 4px",borderRadius:"11px",background:social===s.id?C.card:"transparent",color:social===s.id?C.text:C.textLight,fontSize:"11px",fontWeight:social===s.id?"700":"500",position:"relative",transition:"all 0.2s" }}>
              {s.l}
              {s.id==="friends" && pendingCount>0 && (
                <span style={{ position:"absolute",top:"4px",right:"4px",width:"16px",height:"16px",borderRadius:"50%",background:C.orange,color:C.white,fontSize:"9px",fontWeight:"800",display:"flex",alignItems:"center",justifyContent:"center" }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Rewards */}
        {social==="score" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px" }}>
            {items.map(item => {
              const ok     = (user.pts||0)>=item.cost && (user.level||1)>=item.min_level;
              const locked = (user.level||1) < item.min_level;
              return (
                <Card key={item.id} onClick={() => ok && redeem(item)} style={{ padding:"14px",textAlign:"center",opacity:locked?0.4:1,cursor:ok?"pointer":"default",border:ok?`2px solid ${C.orange}`:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:"26px",marginBottom:"6px" }}>{item.icon}</div>
                  <div style={{ fontSize:"13px",fontWeight:"700",color:C.text }}>{item.name}</div>
                  <div style={{ marginTop:"8px",padding:"3px 10px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:ok?C.orange:C.greyBg,color:ok?C.white:C.textLight,display:"inline-block" }}>
                    {locked ? `Level ${item.min_level}` : `${item.cost} XP`}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Freunde */}
        {social==="friends" && (
          <div>
            <input value={searchQ} onChange={e => searchUsers(e.target.value)} placeholder="User suchen..."
              style={{ width:"100%",padding:"13px 16px",border:`1px solid ${C.border}`,borderRadius:"14px",fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"10px",background:C.card,color:C.text }}/>

            {searchRes.map(r => (
              <Card key={r.id} style={{ marginBottom:"8px",padding:"13px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div onClick={() => setProfilePopup(r.id)} style={{ width:"38px",height:"38px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontWeight:"700",cursor:"pointer" }}>{(r.name||"?")[0].toUpperCase()}</div>
                <div style={{ flex:1,cursor:"pointer" }} onClick={() => setProfilePopup(r.id)}>
                  <div style={{ fontSize:"14px",fontWeight:"600",color:C.text }}>@{r.name}</div>
                  <div style={{ fontSize:"12px",color:C.textLight }}>Level {r.level||1} · {r.pts||0} XP</div>
                </div>
                <button onClick={async () => { await db.sendFriendRequest(user.id,r.id); setSearchRes([]); setSearchQ(""); loadFriends(); }} style={{ padding:"9px 16px",background:C.orange,borderRadius:"10px",color:C.white,fontSize:"13px",fontWeight:"600" }}>+ Anfrage</button>
              </Card>
            ))}

            {/* Offene Anfragen */}
            {pendingRcv.length > 0 && (
              <>
                <div style={{ fontSize:"11px",fontWeight:"700",color:C.textSub,marginBottom:"8px",textTransform:"uppercase" }}>Anfragen ({pendingRcv.length})</div>
                {pendingRcv.map(f => (
                  <Card key={f.id} style={{ marginBottom:"8px",padding:"13px",display:"flex",alignItems:"center",gap:"12px" }}>
                    <div onClick={() => setProfilePopup(f.sender?.id)} style={{ width:"38px",height:"38px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontWeight:"700",cursor:"pointer" }}>{(f.sender?.name||"?")[0].toUpperCase()}</div>
                    <div style={{ flex:1,cursor:"pointer" }} onClick={() => setProfilePopup(f.sender?.id)}>
                      <div style={{ fontSize:"14px",fontWeight:"600",color:C.text }}>@{f.sender?.name}</div>
                    </div>
                    <button onClick={async () => { await db.respondFriendRequest(f.id,"accepted"); loadFriends(); }} style={{ padding:"8px 14px",background:C.green,borderRadius:"10px",color:C.white,fontSize:"13px",fontWeight:"600" }}>✓</button>
                    <button onClick={async () => { await db.respondFriendRequest(f.id,"rejected"); loadFriends(); }} style={{ padding:"8px 12px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.textLight,fontSize:"13px" }}>✕</button>
                  </Card>
                ))}
              </>
            )}

            {/* Freundesliste */}
            {myFriends.length > 0 && (
              <>
                <div style={{ fontSize:"11px",fontWeight:"700",color:C.textSub,marginBottom:"8px",marginTop:"6px",textTransform:"uppercase" }}>Freunde ({myFriends.length})</div>
                {myFriends.map(f => {
                  const other = f.sender_id===user.id ? f.receiver : f.sender;
                  return (
                    <Card key={f.id} style={{ marginBottom:"8px",padding:"13px",display:"flex",alignItems:"center",gap:"12px" }}>
                      <div onClick={() => setProfilePopup(other?.id)} style={{ width:"38px",height:"38px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontWeight:"700",cursor:"pointer" }}>{(other?.name||"?")[0].toUpperCase()}</div>
                      <div style={{ flex:1,cursor:"pointer" }} onClick={() => setProfilePopup(other?.id)}>
                        <div style={{ fontSize:"14px",fontWeight:"600",color:C.text }}>@{other?.name}</div>
                        <div style={{ fontSize:"12px",color:C.textLight }}>Level {other?.level||1}</div>
                      </div>
                      <button onClick={() => setGiftTarget(other)} style={{ padding:"9px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"10px",color:C.text,display:"flex",alignItems:"center" }}>{I.gift}</button>
                    </Card>
                  );
                })}
              </>
            )}

            {myFriends.length===0 && pendingRcv.length===0 && searchRes.length===0 && searchQ.length<2 && (
              <div style={{ textAlign:"center",padding:"32px",color:C.textLight }}>
                <div style={{ fontSize:"32px",marginBottom:"8px" }}>👥</div>
                <div style={{ fontSize:"15px",fontWeight:"600",color:C.textSub }}>Noch keine Freunde</div>
                <div style={{ fontSize:"13px",marginTop:"4px" }}>Suche nach Usern und schicke Anfragen</div>
              </div>
            )}
          </div>
        )}

        {/* Geschenke */}
        {social==="gifts" && (
          <div>
            {gifts.length===0 && <div style={{ textAlign:"center",padding:"30px",color:C.textLight }}>Noch keine Geschenke</div>}
            {gifts.map(g => (
              <Card key={g.id} style={{ marginBottom:"8px",padding:"14px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>{g.sender_id===user.id?`→ @${g.receiver?.name}`:`← @${g.sender?.name}`}</div>
                    <div style={{ fontSize:"12px",color:C.textLight,marginTop:"2px" }}>{g.type==="pts"?`${g.amount} XP`:g.type}{g.message?` · "${g.message}"`:"" }</div>
                  </div>
                  {g.receiver_id===user.id && g.status==="pending" && (
                    <button onClick={async () => { await db.claimGift(g.id,user.id); const f=await db.getProfile(user.id); if(f) setUser(u=>({...u,...f})); db.getMyGifts(user.id).then(setGifts); }} style={{ padding:"9px 16px",background:C.orange,borderRadius:"10px",color:C.white,fontSize:"13px",fontWeight:"700" }}>Annehmen</button>
                  )}
                  {g.status==="claimed" && <div style={{ fontSize:"11px",color:C.green,fontWeight:"700" }}>Erhalten</div>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Vibes */}
        {social==="vibes" && (
          <div>
            <div style={{ display:"flex",gap:"8px",marginBottom:"12px" }}>
              <label style={{ flex:1,display:"block",padding:"13px",background:C.orange,borderRadius:"14px",color:C.white,fontSize:"14px",fontWeight:"700",textAlign:"center",cursor:"pointer",boxSizing:"border-box" }}>
                {I.cam} Kamera
                <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={async e => {
                  const f=e.target.files?.[0]; if(!f||!user?.id) return;
                  const ext=(f.name.split('.').pop()||'jpg').toLowerCase();
                  const path=`vibes/${user.id}_${Date.now()}.${ext}`;
                  const{error}=await supabase.storage.from('avatars').upload(path,f,{upsert:false,contentType:f.type||'image/jpeg'});
                  if(!error){
                    const{data:u}=supabase.storage.from('avatars').getPublicUrl(path);
                    await supabase.from('vibe_photos').insert({user_id:user.id,url:u.publicUrl+'?t='+Date.now(),approved:false});
                    alert("Hochgeladen! Wartet auf Admin-Freigabe (+50 XP bei Genehmigung)");
                  } else { alert("Upload fehlgeschlagen: "+error.message); }
                }}/>
              </label>
              <label style={{ flex:1,display:"block",padding:"13px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",color:C.text,fontSize:"14px",fontWeight:"700",textAlign:"center",cursor:"pointer",boxSizing:"border-box" }}>
                {I.img} Galerie
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
                  const f=e.target.files?.[0]; if(!f||!user?.id) return;
                  const ext=(f.name.split('.').pop()||'jpg').toLowerCase();
                  const path=`vibes/${user.id}_${Date.now()}.${ext}`;
                  const{error}=await supabase.storage.from('avatars').upload(path,f,{upsert:false,contentType:f.type||'image/jpeg'});
                  if(!error){
                    const{data:u}=supabase.storage.from('avatars').getPublicUrl(path);
                    await supabase.from('vibe_photos').insert({user_id:user.id,url:u.publicUrl+'?t='+Date.now(),approved:false});
                    alert("Hochgeladen! Wartet auf Admin-Freigabe (+50 XP bei Genehmigung)");
                  } else { alert("Upload fehlgeschlagen: "+error.message); }
                }}/>
              </label>
            </div>
            {vibes.length===0 && <div style={{ textAlign:"center",padding:"24px",color:C.textLight }}>Noch keine freigegebenen Vibes</div>}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px" }}>
              {vibes.map(v => (
                <div key={v.id} style={{ borderRadius:"14px",overflow:"hidden",aspectRatio:"1",position:"relative" }}>
                  <img src={v.url} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"sepia(0.3) contrast(1.1) saturate(0.9)" }}/>
                  <button onClick={async () => {
                    if (navigator.share) {
                      try {
                        const res = await fetch(v.url);
                        const blob = await res.blob();
                        const file = new File([blob], 'cereza-vibe.jpg', { type: 'image/jpeg' });
                        await navigator.share({ files: [file], title: 'Cereza Vibe', text: `Mein Vibe bei Cereza! @${user.name} | ${user.pts||0} XP` });
                      } catch { navigator.share({ title: 'Cereza Vibe', text: `Schau mal bei Cereza vorbei!`, url: window.location.origin }).catch(() => {}); }
                    }
                  }} style={{ position:"absolute",bottom:"6px",right:"6px",width:"32px",height:"32px",borderRadius:"50%",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",border:"none",color:"#fff",fontSize:"14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {I.share}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profil bearbeiten */}
        <Card style={{ marginTop:"14px",marginBottom:"10px" }}>
          {editing ? (
            <>
              <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"1px",marginBottom:"12px",color:C.textSub }}>PROFIL BEARBEITEN</div>
              <input value={uname} onChange={e=>setUname(e.target.value)} placeholder="Username" style={{ width:"100%",padding:"13px 16px",border:`1px solid ${C.border}`,borderRadius:"13px",fontSize:"16px",marginBottom:"10px",outline:"none",boxSizing:"border-box",background:C.card,color:C.text }}/>
              <input value={insta} onChange={e=>setInsta(e.target.value)} placeholder="@instagram" style={{ width:"100%",padding:"13px 16px",border:`1px solid ${C.border}`,borderRadius:"13px",fontSize:"16px",marginBottom:"14px",outline:"none",boxSizing:"border-box",background:C.card,color:C.text }}/>
              <button onClick={save} style={{ width:"100%",padding:"13px",background:C.orange,borderRadius:"13px",color:C.white,fontSize:"15px",fontWeight:"700" }}>Speichern</button>
            </>
          ) : (
            <>
              {[{l:"Username",v:`@${user.name||"user"}`},{l:"E-Mail",v:user.email},{l:"Instagram",v:user.instagram||"—"},{l:"Telefon",v:user.phone||"—"}].map((r,i) => (
                <div key={i} style={{ padding:"9px 0",borderBottom:i<3?`1px solid ${C.greyBg}`:"none" }}>
                  <div style={{ fontSize:"10px",color:C.textLight,fontWeight:"600" }}>{r.l}</div>
                  <div style={{ fontSize:"14px",fontWeight:"500",marginTop:"2px",color:C.text }}>{r.v}</div>
                </div>
              ))}
              <button onClick={() => setEditing(true)} style={{ width:"100%",marginTop:"12px",padding:"12px",background:C.greyBg,border:`1px solid ${C.border}`,borderRadius:"13px",color:C.text,fontSize:"14px",fontWeight:"600" }}>Profil bearbeiten</button>
            </>
          )}
        </Card>

        {/* Era Journey */}
        <Card style={{ marginBottom:"10px" }}>
          <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"1.5px",marginBottom:"14px",color:C.textSub }}>ERA JOURNEY</div>
          <div style={{ display:"flex",gap:"6px",justifyContent:"center" }}>
            {ERAS.map((e,i) => (
              <div key={i} style={{ width:"46px",height:"46px",borderRadius:"50%",background:(user.level||1)>=e.level?C.orange:C.greyBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:"800",color:(user.level||1)>=e.level?C.white:C.textLight,border:(user.level||1)===e.level?`3px solid ${C.text}`:"none" }}>
                {(user.level||1)>=e.level?e.level:"—"}
              </div>
            ))}
          </div>
        </Card>

        {/* Einstellungen */}
        <Card style={{ marginBottom:"14px" }}>
          <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"1.5px",marginBottom:"14px",color:C.textSub }}>EINSTELLUNGEN</div>
          <div style={{ marginBottom:"12px" }}>
            <div style={{ fontSize:"13px",color:C.text,fontWeight:"600",marginBottom:"8px" }}>App-Farbe</div>
            <div style={{ display:"flex",gap:"8px" }}>
              {[{k:"light",l:"Standard",bg:"#C1272D"},{k:"beige",l:"Beige",bg:"#e8dcc8"},{k:"red",l:"Rot",bg:"#8B0000"}].map(opt => (
                <button key={opt.k} onClick={() => setMode?.(opt.k)} style={{ flex:1,padding:"10px 6px",borderRadius:"12px",border:mode===opt.k?`2.5px solid ${C.orange}`:`1px solid ${C.border}`,background:opt.bg,cursor:"pointer",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:"4px" }}>
                  <div style={{ width:"20px",height:"20px",borderRadius:"50%",background:"rgba(255,255,255,0.4)",border:"1px solid rgba(255,255,255,0.6)" }}/>
                  <div style={{ fontSize:"10px",fontWeight:"600",color:"rgba(255,255,255,0.9)" }}>{opt.l}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0" }}>
            <div>
              <div style={{ fontSize:"14px",color:C.text }}>Glow Hour Farbe</div>
              {isGlow && <div style={{ fontSize:"11px",color:C.orange,fontWeight:"600" }}>Glow Hour aktiv!</div>}
            </div>
            <div style={{ display:"flex",gap:"8px" }}>
              <div onClick={() => setGlow?.("rosa")}  style={{ width:"30px",height:"30px",borderRadius:"50%",background:"#fce7f3",border:glow==="rosa" ?`2.5px solid #db2777`:`2px solid ${C.border}`,cursor:"pointer" }}/>
              <div onClick={() => setGlow?.("gruen")} style={{ width:"30px",height:"30px",borderRadius:"50%",background:"#dcfce7",border:glow==="gruen"?`2.5px solid #16a34a`:`2px solid ${C.border}`,cursor:"pointer" }}/>
            </div>
          </div>
        </Card>

        <button onClick={onLogout} style={{ width:"100%",padding:"14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"14px",color:C.textLight,fontSize:"15px",fontWeight:"600" }}>
          Ausloggen
        </button>
      </div>
    </div>
  );
};

// ─── Admin Input/Toggle/Modal (stabile Komponenten = kein Fokusverlust) ──
const AdminInput = ({ label, value, onChange, type="text" }) => (
  <div style={{ marginBottom:"12px" }}>
    <div style={{ fontSize:"11px",color:"#999",marginBottom:"5px",fontWeight:"600" }}>{label}</div>
    <input type={type} value={value??''} onChange={e => onChange(e.target.value)}
      style={{ width:"100%",padding:"12px 14px",border:"1px solid #e8e8e8",borderRadius:"12px",fontSize:"16px",outline:"none",boxSizing:"border-box",background:"#fff",color:"#111",fontFamily:"inherit" }}/>
  </div>
);
const AdminToggle = ({ label, value, onChange }) => (
  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f5f5f5" }}>
    <div style={{ fontSize:"15px",color:"#111" }}>{label}</div>
    <div onClick={() => onChange(!value)} style={{ width:"48px",height:"27px",borderRadius:"14px",background:value?"#e24a28":"#f5f5f5",cursor:"pointer",position:"relative",transition:"background 0.25s" }}>
      <div style={{ width:"23px",height:"23px",borderRadius:"50%",background:"#fff",position:"absolute",top:"2px",left:value?"23px":"2px",transition:"left 0.25s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
    </div>
  </div>
);
const AdminModal = ({ title, onSave, onClose, children }) => (
  <div style={{ position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"flex-end" }}>
    <div style={{ background:"#fff",borderRadius:"22px 22px 0 0",padding:"22px 20px",width:"100%",maxHeight:"82vh",overflowY:"auto",boxSizing:"border-box",paddingBottom:`calc(22px + ${SB})` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
        <div style={{ fontSize:"18px",fontWeight:"700",color:"#111" }}>{title}</div>
        <button onClick={onClose} style={{ background:"#f5f5f5",borderRadius:"10px",padding:"8px 14px",color:"#111",fontSize:"14px" }}>✕</button>
      </div>
      {children}
      <button onClick={onSave} style={{ width:"100%",padding:"14px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"16px",fontWeight:"700",marginTop:"16px" }}>Speichern</button>
    </div>
  </div>
);

// ─── Admin Login ──────────────────────────────────────────────────
const AdminLogin = ({ onLogin, onBack }) => {
  const [email,  setEmail]  = useState("");
  const [pw,     setPw]     = useState("");
  const [err,    setErr]    = useState("");
  const [loading,setLoading]= useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const { data, error } = await db.signIn(email, pw);
      if (error) { setErr("Falsche Zugangsdaten"); setLoading(false); return; }
      await new Promise(r => setTimeout(r, 700));
      let p = await db.getProfile(data.user.id);
      if (!p) { await new Promise(r => setTimeout(r, 1000)); p = await db.getProfile(data.user.id); }
      if (p?.is_admin) onLogin(p);
      else { setErr("Kein Admin-Zugang"); await db.signOut(); }
    } catch(e) { setErr("Verbindungsfehler"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh",background:C.beige,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:`calc(${ST} + 32px) 24px calc(${SB} + 32px)` }}>
      <style>{defaultCSS}</style>
      <div style={{ fontSize:"28px",fontFamily:font.display,color:C.text,marginBottom:"28px",fontWeight:"700" }}>Admin Login</div>
      <div style={{ width:"100%",maxWidth:"320px" }}>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin E-Mail" style={{ width:"100%",padding:"14px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",color:C.text,fontSize:"16px",outline:"none",marginBottom:"10px",boxSizing:"border-box" }}/>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Passwort" style={{ width:"100%",padding:"14px 16px",background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px",color:C.text,fontSize:"16px",outline:"none",marginBottom:"12px",boxSizing:"border-box" }}/>
        {err && <div style={{ color:C.orange,fontSize:"13px",textAlign:"center",marginBottom:"10px" }}>{err}</div>}
        <button onClick={submit} disabled={loading} style={{ width:"100%",padding:"15px",background:C.orange,borderRadius:"14px",color:C.white,fontSize:"16px",fontWeight:"700",opacity:loading?0.7:1 }}>{loading?"...":"Einloggen"}</button>
        <button onClick={onBack} style={{ width:"100%",marginTop:"8px",padding:"13px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:"14px",color:C.textLight,fontSize:"14px" }}>← Zurück</button>
      </div>
    </div>
  );
};

// ─── Admin Panel ──────────────────────────────────────────────────
// ─── Suggestions Admin ───────────────────────────────────────────
const SuggestionsAdmin = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { db.getPendingSuggestions().then(d => { setSuggestions(d); setLoading(false); }); }, []);
  if (loading) return <div style={{ textAlign:"center",padding:"20px",color:"#999" }}>Laden...</div>;
  if (!suggestions.length) return <div style={{ textAlign:"center",padding:"30px",color:"#999" }}>Keine offenen Vorschläge</div>;
  return suggestions.map(s => (
    <div key={s.id} style={{ background:"#fff",borderRadius:"14px",padding:"14px",border:"1px solid #e8e8e8",marginBottom:"8px" }}>
      <div style={{ fontSize:"16px",fontWeight:"700",color:"#111" }}>{s.name}</div>
      {s.description && <div style={{ fontSize:"13px",color:"#777",marginTop:"4px" }}>{s.description}</div>}
      <div style={{ fontSize:"11px",color:"#999",marginTop:"6px" }}>von @{s.profile?.name} · {new Date(s.created_at).toLocaleDateString('de-DE')}</div>
      <div style={{ display:"flex",gap:"8px",marginTop:"10px" }}>
        <button onClick={async () => { await db.approveSuggestion(s.id, true); setSuggestions(p => p.filter(x => x.id !== s.id)); }} style={{ flex:1,padding:"10px",background:"#2d472a",borderRadius:"10px",color:"#fff",fontSize:"13px",fontWeight:"700" }}>✓ Annehmen</button>
        <button onClick={async () => { await db.approveSuggestion(s.id, false); setSuggestions(p => p.filter(x => x.id !== s.id)); }} style={{ flex:1,padding:"10px",background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",color:"#999",fontSize:"13px",fontWeight:"700" }}>✕ Ablehnen</button>
      </div>
    </div>
  ));
};

const AdminPanel = ({ onClose }) => {
  // Inline QR Mission Scanner
  const QRMissionInline = () => {
    const [qrMissions, setQrMissions] = useState([]);
    const [qrSelected, setQrSelected] = useState(null);
    const [qrScanning, setQrScanning] = useState(false);
    const [qrScanned,  setQrScanned]  = useState(null);
    const [qrResult,   setQrResult]   = useState(null);
    const [qrStamping, setQrStamping] = useState(false);
    const qrRef = useRef(null);

    useEffect(() => {
      db.getMissions().then(setQrMissions);
      return () => { if(qrRef.current) try { qrRef.current.stop(); } catch(e) {} };
    }, []);

    const startQR = async () => {
      setQrScanning(true); setQrResult(null); setQrScanned(null);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const s = new Html5Qrcode("admin-mission-qr"); qrRef.current = s;
        await s.start({ facingMode:"environment" }, { fps:10, qrbox:{ width:200, height:200 } },
          async text => {
            await s.stop(); setQrScanning(false);
            let uid = text.trim(); if(text.startsWith("cereza:")) uid = text.split(":")[1];
            const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRx.test(uid)) { setQrResult({ ok:false, msg:"Kein gültiger Cereza QR-Code" }); return; }
            const { data:p } = await supabase.from('profiles').select('id,name').eq('id',uid).single();
            if (p) setQrScanned({ id:p.id, name:p.name });
            else setQrResult({ ok:false, msg:"User nicht gefunden" });
          }, () => {}
        );
      } catch(e) { setQrScanning(false); setQrResult({ ok:false, msg:"Kamera-Fehler" }); }
    };

    const doQrStamp = async () => {
      if (!qrScanned || !qrSelected || qrStamping) return;
      setQrStamping(true);
      // Admin-ID aus Session holen
      const { data: { session } } = await supabase.auth.getSession();
      const adminId = session?.user?.id;
      if (!adminId) { setQrResult({ ok:false, msg:"Nicht eingeloggt" }); setQrStamping(false); return; }
      const { data, error } = await supabase.rpc('stamp_mission', {
        p_admin_id:   adminId,
        p_user_id:    qrScanned.id,
        p_mission_id: qrSelected.id,
        p_notes:      null,
      });
      if (error || !data?.ok) setQrResult({ ok:false, msg:data?.error||error?.message||"Fehler" });
      else { setQrResult({ ok:true, msg:data.completed?`✅ Mission abgeschlossen! +${qrSelected.pts_reward} XP`:`✅ Stempel ${data.progress}/${data.goal}` }); setQrScanned(null); }
      setQrStamping(false);
    };

    return (
      <div>
        <div style={{ fontSize:"12px",color:"#999",marginBottom:"10px" }}>User zeigt QR-Code aus Profil → scannen → stempeln</div>
        <div style={{ marginBottom:"14px" }}>
          <div style={{ fontSize:"11px",fontWeight:"700",color:"#999",marginBottom:"8px" }}>MISSION WÄHLEN</div>
          {qrMissions.map(m => (
            <button key={m.id} onClick={() => { setQrSelected(m); setQrScanned(null); setQrResult(null); }}
              style={{ width:"100%",padding:"11px 14px",background:qrSelected?.id===m.id?"#e24a28":"#f5f5f5",border:qrSelected?.id===m.id?"none":"1px solid #e8e8e8",borderRadius:"12px",color:qrSelected?.id===m.id?"#fff":"#111",textAlign:"left",display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px",cursor:"pointer",transition:"all 0.2s" }}>
              <span style={{ fontSize:"16px" }}>{m.icon}</span>
              <div style={{ flex:1 }}><div style={{ fontSize:"13px",fontWeight:"700" }}>{m.title}</div><div style={{ fontSize:"11px",opacity:0.6 }}>{m.goal}× Ziel · +{m.pts_reward} XP</div></div>
              {qrSelected?.id===m.id && <span>✓</span>}
            </button>
          ))}
        </div>
        {qrSelected && !qrScanned && (
          <div style={{ marginBottom:"14px" }}>
            <div id="admin-mission-qr" style={{ width:"100%",maxWidth:"260px",height:"200px",borderRadius:"14px",overflow:"hidden",background:"#000",border:`2px solid ${qrScanning?"#e24a28":"#e8e8e8"}`,margin:"0 auto 10px",display:"block" }}/>
            {!qrScanning
              ? <button onClick={startQR} style={{ width:"100%",padding:"12px",background:"#e24a28",border:"none",borderRadius:"12px",color:"#fff",fontSize:"14px",fontWeight:"700" }}>▣ QR-Code scannen</button>
              : <div style={{ textAlign:"center",color:"#999",fontSize:"13px" }}>Scanne den Code des Users...</div>
            }
          </div>
        )}
        {qrSelected && qrScanned && !qrResult && (
          <div style={{ padding:"16px",background:"#f9f9f9",borderRadius:"14px",border:"1px solid #e8e8e8",marginBottom:"14px" }}>
            <div style={{ fontSize:"13px",color:"#999",marginBottom:"6px" }}>User gescannt:</div>
            <div style={{ fontSize:"17px",fontWeight:"700",color:"#111",marginBottom:"4px" }}>@{qrScanned.name}</div>
            <div style={{ fontSize:"12px",color:"#666",marginBottom:"14px" }}>{qrSelected.icon} {qrSelected.title}</div>
            <div style={{ display:"flex",gap:"8px" }}>
              <button onClick={doQrStamp} disabled={qrStamping} style={{ flex:1,padding:"12px",background:"#e24a28",border:"none",borderRadius:"10px",color:"#fff",fontSize:"14px",fontWeight:"700",opacity:qrStamping?0.7:1 }}>{qrStamping?"...":"✓ Stempel"}</button>
              <button onClick={() => setQrScanned(null)} style={{ padding:"12px 14px",background:"#f0f0f0",border:"1px solid #e8e8e8",borderRadius:"10px",color:"#555",fontSize:"13px" }}>↩</button>
            </div>
          </div>
        )}
        {qrResult && (
          <div style={{ padding:"16px",background:qrResult.ok?"#f0fdf4":"#fff5f5",borderRadius:"14px",border:`1px solid ${qrResult.ok?"#bbf7d0":"#fecaca"}`,textAlign:"center",marginBottom:"14px" }}>
            <div style={{ fontSize:"24px",marginBottom:"6px" }}>{qrResult.ok?"✅":"❌"}</div>
            <div style={{ fontSize:"15px",fontWeight:"700",color:qrResult.ok?"#16a34a":"#dc2626" }}>{qrResult.msg}</div>
            <button onClick={() => { setQrResult(null); setQrScanned(null); }} style={{ marginTop:"10px",padding:"8px 20px",background:"#f0f0f0",border:"none",borderRadius:"20px",color:"#555",fontSize:"13px" }}>Weiter</button>
          </div>
        )}
      </div>
    );
  };

  const [tab,      setTab]      = useState("stats");
  const [users,    setUsers]    = useState([]);
  const [missions, setMissions] = useState([]);
  const [dishes,   setDishes]   = useState([]);
  const [facts,    setFacts]    = useState([]);
  const [prizes,   setPrizes]   = useState([]);
  const [shopItems,setShopItems]= useState([]);
  const [glowHours,setGlowHours]= useState([]);
  const [redemptions,setRedemptions]=useState([]);
  const [vibes,    setVibes]    = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [pushTitle,setPushTitle]= useState("");
  const [pushBody, setPushBody] = useState("");
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [searchQ,  setSearchQ]  = useState("");
  const [editUser,    setEditUser]    = useState(null);
  const [editMission, setEditMission] = useState(null);
  const [editDish,    setEditDish]    = useState(null);
  const [editShop,    setEditShop]    = useState(null);
  const [editPrize,   setEditPrize]   = useState(null);
  const [editGlow,    setEditGlow]    = useState(null);
  const [newFact,  setNewFact]  = useState("");

  const ok2 = (m, good=true) => { setToast({ m, ok:good }); setTimeout(() => setToast(null), 2500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [u,m,f,p,s,r,v,vis] = await Promise.all([
      db.getAllProfiles(), db.getMissions(), db.getFunFacts(),
      db.getWheelPrizes(), db.getShopItems(), db.getPendingRedemptions(),
      db.getPendingVibes(), db.getTodayVisitors(),
    ]);
    const { data:d }  = await supabase.from('dishes').select('*,dish_votes(vote)').eq('active',true);
    const { data:gh } = await supabase.from('glow_hours').select('*').order('id');
    setUsers(u); setMissions(m); setFacts(f); setPrizes(p); setShopItems(s);
    setRedemptions(r); setVibes(v); setVisitors(vis);
    setDishes((d||[]).map(x => ({ ...x, votes:x.dish_votes?.filter(v=>v.vote).length||0 })));
    setGlowHours(gh||[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const today2 = new Date().toISOString().split('T')[0];
  const DAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const filtered = users.filter(u => !searchQ || u.name?.toLowerCase().includes(searchQ.toLowerCase()) || u.email?.toLowerCase().includes(searchQ.toLowerCase()));

  const saveMission = async () => {
    if (!editMission) return;
    const fields = {
      title:                editMission.title||'Neue Mission',
      description:          editMission.description||'',
      pts_reward:           parseInt(editMission.pts_reward)||100,
      icon:                 editMission.icon||'★',
      goal:                 parseInt(editMission.goal)||1,
      active:               editMission.active!==false,
      time_window_start:    editMission.time_window_start||null,
      time_window_end:      editMission.time_window_end||null,
      grace_minutes:        parseInt(editMission.grace_minutes)||35,
      day_of_week:          (editMission.day_of_week!=null&&editMission.day_of_week!=='')?parseInt(editMission.day_of_week):null,
      deadline_date:        editMission.deadline_date||null,
      deadline_day_of_week: (editMission.deadline_day_of_week!=null&&editMission.deadline_day_of_week!=='')?parseInt(editMission.deadline_day_of_week):null,
      reset_weekly:         editMission.reset_weekly||false,
    };
    try {
      if (editMission.id) {
        const { error } = await supabase.from('missions').update(fields).eq('id', editMission.id);
        if (error) { ok2("Fehler: "+error.message, false); return; }
      } else {
        const { error } = await supabase.from('missions').insert(fields);
        if (error) { ok2("Fehler: "+error.message, false); return; }
      }
      ok2("Gespeichert ✓"); setEditMission(null); db.getMissions().then(setMissions);
    } catch(e) { ok2("Fehler: "+e.message, false); }
  };

  const TABS = [
    {id:"stats",l:"Stats"},{id:"users",l:"User"},{id:"redemptions",l:"Kasse"},{id:"qrscan",l:"QR-Scan"},
    {id:"shop",l:"Shop"},{id:"missions",l:"Missionen"},{id:"dishes",l:"Gerichte"},
    {id:"glow",l:"Glow"},{id:"prizes",l:"Rad"},{id:"facts",l:"Fakten"},
    {id:"vibes",l:"Vibes"},{id:"suggestions",l:"Vorschläge"},{id:"visits",l:"Heute"},{id:"push",l:"E-Mail"},{id:"qrgen",l:"QR-Gen"},
  ];

  const stats = [
    {v:users.length,l:"Registrierte User"},{v:users.filter(u=>u.last_visit===today2).length,l:"Heute aktiv"},
    {v:users.filter(u=>u.is_abo_member).length,l:"Abo Mitglieder"},{v:users.length?Math.round(users.reduce((s,u)=>s+(u.pts||0),0)/users.length):0,l:"⌀ XP/User"},
    {v:users.reduce((s,u)=>s+(u.pts||0),0).toLocaleString(),l:"XP gesamt"},{v:visitors.length,l:"Besuche heute"},
    {v:redemptions.length,l:"Offene Einlösungen"},{v:vibes.length,l:"Vibes zur Freigabe"},
  ];

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#f5f5f5",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:font.ui }}>
      <style>{defaultCSS}</style>
      {toast && <div style={{ position:"fixed",top:`calc(${ST} + 12px)`,left:"50%",transform:"translateX(-50%)",background:toast.ok?"#2d472a":"#e24a28",color:"#fff",padding:"10px 22px",borderRadius:"22px",fontSize:"13px",fontWeight:"700",zIndex:999999,animation:"fadeUp 0.3s" }}>{toast.m}</div>}

      {/* Edit Modals */}
      {editUser && (
        <AdminModal title="User bearbeiten" onSave={async()=>{await db.updateProfile(editUser.id,{name:editUser.name,pts:parseInt(editUser.pts)||0,level:parseInt(editUser.level)||1,is_admin:editUser.is_admin,is_abo_member:editUser.is_abo_member,streak:parseInt(editUser.streak)||0,total_visits:parseInt(editUser.total_visits)||0});ok2("Gespeichert ✓");setEditUser(null);db.getAllProfiles().then(setUsers);}} onClose={()=>setEditUser(null)}>
          <AdminInput label="Name" value={editUser.name} onChange={v=>setEditUser(p=>({...p,name:v}))}/>
          <AdminInput label="XP" value={editUser.pts} onChange={v=>setEditUser(p=>({...p,pts:v}))} type="number"/>
          <AdminInput label="Level (1-5)" value={editUser.level} onChange={v=>setEditUser(p=>({...p,level:v}))} type="number"/>
          <AdminInput label="Streak" value={editUser.streak} onChange={v=>setEditUser(p=>({...p,streak:v}))} type="number"/>
          <AdminInput label="Besuche" value={editUser.total_visits} onChange={v=>setEditUser(p=>({...p,total_visits:v}))} type="number"/>
          <AdminToggle label="Admin" value={editUser.is_admin} onChange={v=>setEditUser(p=>({...p,is_admin:v}))}/>
          <AdminToggle label="Abo Mitglied" value={editUser.is_abo_member} onChange={v=>setEditUser(p=>({...p,is_abo_member:v}))}/>
          <button onClick={async()=>{if(!confirm("Wirklich löschen?"))return;await supabase.from('profiles').delete().eq('id',editUser.id);ok2("Gelöscht");setEditUser(null);loadAll();}} style={{width:"100%",padding:"12px",background:"transparent",border:"1px solid #e24a28",borderRadius:"12px",color:"#e24a28",fontSize:"14px",marginTop:"10px"}}>User löschen</button>
        </AdminModal>
      )}
      {editMission && (
        <AdminModal title={editMission.id?"Mission bearbeiten":"Neue Mission"} onSave={saveMission} onClose={()=>setEditMission(null)}>
          <AdminInput label="Titel *" value={editMission.title} onChange={v=>setEditMission(p=>({...p,title:v}))}/>
          <AdminInput label="Beschreibung" value={editMission.description} onChange={v=>setEditMission(p=>({...p,description:v}))}/>
          <AdminInput label="Icon (Emoji)" value={editMission.icon} onChange={v=>setEditMission(p=>({...p,icon:v}))}/>
          <AdminInput label="XP Belohnung" value={editMission.pts_reward} onChange={v=>setEditMission(p=>({...p,pts_reward:v}))} type="number"/>
          <AdminInput label="Ziel (Anzahl Stempel)" value={editMission.goal} onChange={v=>setEditMission(p=>({...p,goal:v}))} type="number"/>

          {/* Zeitfenster */}
          <div style={{fontSize:"11px",fontWeight:"700",color:"#999",margin:"14px 0 8px",letterSpacing:"0.5px"}}>ZEITFENSTER (optional)</div>
          <div style={{display:"flex",gap:"8px"}}>
            <div style={{flex:1}}><AdminInput label="Von (HH:MM)" value={editMission.time_window_start||""} onChange={v=>setEditMission(p=>({...p,time_window_start:v||null}))}/></div>
            <div style={{flex:1}}><AdminInput label="Bis (HH:MM)" value={editMission.time_window_end||""} onChange={v=>setEditMission(p=>({...p,time_window_end:v||null}))}/></div>
          </div>
          <AdminInput label={`Kulanzzeit (Minuten, aktuell: ${editMission.grace_minutes||35})`} value={editMission.grace_minutes||35} onChange={v=>setEditMission(p=>({...p,grace_minutes:parseInt(v)||35}))} type="number"/>

          {/* Wochentag */}
          <div style={{fontSize:"11px",fontWeight:"700",color:"#999",margin:"14px 0 8px",letterSpacing:"0.5px"}}>NUR AN BESTIMMTEM TAG (optional)</div>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"12px"}}>
            {["So","Mo","Di","Mi","Do","Fr","Sa"].map((d,i)=>(
              <button key={i} onClick={()=>setEditMission(p=>({...p,day_of_week:p.day_of_week===i?null:i}))}
                style={{padding:"8px 10px",borderRadius:"8px",background:editMission.day_of_week===i?"#e24a28":"#f5f5f5",border:editMission.day_of_week===i?"none":"1px solid #e8e8e8",color:editMission.day_of_week===i?"#fff":"#666",fontSize:"12px",fontWeight:"600",cursor:"pointer"}}>
                {d}
              </button>
            ))}
          </div>

          {/* Deadline */}
          <div style={{fontSize:"11px",fontWeight:"700",color:"#999",margin:"14px 0 8px",letterSpacing:"0.5px"}}>DEADLINE (optional)</div>
          <AdminInput label="Fixes Datum (z.B. 2024-12-31)" value={editMission.deadline_date||""} onChange={v=>setEditMission(p=>({...p,deadline_date:v||null}))} type="date"/>
          <div style={{fontSize:"11px",color:"#999",marginBottom:"8px"}}>ODER wöchentliche Deadline:</div>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"12px"}}>
            {["So","Mo","Di","Mi","Do","Fr","Sa"].map((d,i)=>(
              <button key={i} onClick={()=>setEditMission(p=>({...p,deadline_day_of_week:p.deadline_day_of_week===i?null:i}))}
                style={{padding:"8px 10px",borderRadius:"8px",background:editMission.deadline_day_of_week===i?"#e24a28":"#f5f5f5",border:editMission.deadline_day_of_week===i?"none":"1px solid #e8e8e8",color:editMission.deadline_day_of_week===i?"#fff":"#666",fontSize:"12px",fontWeight:"600",cursor:"pointer"}}>
                {d}
              </button>
            ))}
          </div>

          <AdminToggle label="Wöchentlicher Reset (Fortschritt startet jede Woche neu)" value={editMission.reset_weekly||false} onChange={v=>setEditMission(p=>({...p,reset_weekly:v}))}/>
          {editMission.id && <AdminToggle label="Aktiv" value={editMission.active!==false} onChange={v=>setEditMission(p=>({...p,active:v}))}/>}

          {/* Vorschau */}
          <div style={{marginTop:"14px",padding:"12px",background:"#f9f9f9",borderRadius:"10px",fontSize:"12px",color:"#666",lineHeight:1.6}}>
            <div style={{fontWeight:"700",color:"#111",marginBottom:"4px"}}>Vorschau:</div>
            {editMission.time_window_start&&editMission.time_window_end&&<div>⏰ Gültig von {editMission.time_window_start} bis {editMission.time_window_end} (+{editMission.grace_minutes||35} Min. Kulanz)</div>}
            {editMission.day_of_week!=null&&<div>📅 Nur am {["So","Mo","Di","Mi","Do","Fr","Sa"][editMission.day_of_week]}</div>}
            {editMission.deadline_date&&<div>🗓 Deadline: {editMission.deadline_date}</div>}
            {editMission.deadline_day_of_week!=null&&<div>🗓 Wöchentlich bis {["So","Mo","Di","Mi","Do","Fr","Sa"][editMission.deadline_day_of_week]}</div>}
            {editMission.reset_weekly&&<div>🔄 Stempelkarte setzt sich jede Woche zurück</div>}
            {editMission.goal>1&&<div>💎 Punkte werden erst nach {editMission.goal} Stempeln gutgeschrieben</div>}
          </div>
        </AdminModal>
      )}
      {editDish && (
        <AdminModal title={editDish.id?"Gericht bearbeiten":"Neues Gericht"} onSave={async()=>{
          if(editDish.id){const{error}=await supabase.from('dishes').update({name:editDish.name,description:editDish.description,active:editDish.active!==false}).eq('id',editDish.id);if(error){ok2("Fehler: "+error.message,false);return;}}
          else{const{error}=await supabase.from('dishes').insert({name:editDish.name,description:editDish.description||'',active:true});if(error){ok2("Fehler: "+error.message,false);return;}}
          ok2("Gespeichert ✓");setEditDish(null);loadAll();
        }} onClose={()=>setEditDish(null)}>
          <AdminInput label="Name" value={editDish.name} onChange={v=>setEditDish(p=>({...p,name:v}))}/>
          <AdminInput label="Beschreibung" value={editDish.description} onChange={v=>setEditDish(p=>({...p,description:v}))}/>
          {editDish.id && <AdminToggle label="Aktiv" value={editDish.active!==false} onChange={v=>setEditDish(p=>({...p,active:v}))}/>}
          {editDish.id && <button onClick={async()=>{if(!confirm("Votes zurücksetzen?"))return;await supabase.from('dish_votes').delete().eq('dish_id',editDish.id);ok2("Votes zurückgesetzt");setEditDish(null);loadAll();}} style={{width:"100%",padding:"11px",background:"transparent",border:"1px solid #e8e8e8",borderRadius:"12px",color:"#999",fontSize:"14px",marginTop:"8px"}}>Votes zurücksetzen</button>}
        </AdminModal>
      )}
      {editShop && (
        <AdminModal title={editShop.id?"Shop Item":"Neues Item"} onSave={async()=>{
          if(editShop.id) await supabase.from('shop_items').update({name:editShop.name,description:editShop.description,icon:editShop.icon,cost:parseInt(editShop.cost)||0,min_level:parseInt(editShop.min_level)||1,active:editShop.active!==false}).eq('id',editShop.id);
          else await supabase.from('shop_items').insert({name:editShop.name,description:editShop.description||'',icon:editShop.icon||'🎁',cost:parseInt(editShop.cost)||0,min_level:parseInt(editShop.min_level)||1,active:true});
          ok2("Gespeichert ✓");setEditShop(null);db.getShopItems().then(setShopItems);
        }} onClose={()=>setEditShop(null)}>
          <AdminInput label="Name" value={editShop.name} onChange={v=>setEditShop(p=>({...p,name:v}))}/>
          <AdminInput label="Beschreibung" value={editShop.description} onChange={v=>setEditShop(p=>({...p,description:v}))}/>
          <AdminInput label="Icon" value={editShop.icon} onChange={v=>setEditShop(p=>({...p,icon:v}))}/>
          <AdminInput label="XP Kosten" value={editShop.cost} onChange={v=>setEditShop(p=>({...p,cost:v}))} type="number"/>
          <AdminInput label="Min. Level" value={editShop.min_level} onChange={v=>setEditShop(p=>({...p,min_level:v}))} type="number"/>
          {editShop.id && <AdminToggle label="Aktiv" value={editShop.active!==false} onChange={v=>setEditShop(p=>({...p,active:v}))}/>}
        </AdminModal>
      )}
      {editPrize && (
        <AdminModal title={editPrize.id?"Preis bearbeiten":"Neuer Preis"} onSave={async()=>{
          if(editPrize.id) await supabase.from('wheel_prizes').update({label:editPrize.label,value:parseInt(editPrize.value)||0,color:editPrize.color,active:editPrize.active!==false}).eq('id',editPrize.id);
          else await supabase.from('wheel_prizes').insert({label:editPrize.label,value:parseInt(editPrize.value)||0,color:editPrize.color||'#fde8e8',active:true});
          ok2("Gespeichert ✓");setEditPrize(null);db.getWheelPrizes().then(setPrizes);
        }} onClose={()=>setEditPrize(null)}>
          <AdminInput label="Label" value={editPrize.label} onChange={v=>setEditPrize(p=>({...p,label:v}))}/>
          <AdminInput label="Wert (XP, 0=nichts, -1=2x)" value={editPrize.value} onChange={v=>setEditPrize(p=>({...p,value:v}))} type="number"/>
          <AdminInput label="Farbe (Hex)" value={editPrize.color} onChange={v=>setEditPrize(p=>({...p,color:v}))}/>
          {editPrize.id && <AdminToggle label="Aktiv" value={editPrize.active!==false} onChange={v=>setEditPrize(p=>({...p,active:v}))}/>}
        </AdminModal>
      )}
      {editGlow && (
        <AdminModal title={editGlow.id?"Glow Hour":"Neue Glow Hour"} onSave={async()=>{
          if(editGlow.id) await supabase.from('glow_hours').update({day_of_week:parseInt(editGlow.day_of_week),start_time:editGlow.start_time,end_time:editGlow.end_time,multiplier:parseInt(editGlow.multiplier)||2,active:editGlow.active!==false}).eq('id',editGlow.id);
          else await supabase.from('glow_hours').insert({day_of_week:parseInt(editGlow.day_of_week)||1,start_time:editGlow.start_time||'12:00',end_time:editGlow.end_time||'14:00',multiplier:2,active:true});
          ok2("Gespeichert ✓");setEditGlow(null);supabase.from('glow_hours').select('*').order('id').then(r=>setGlowHours(r.data||[]));
        }} onClose={()=>setEditGlow(null)}>
          <div style={{marginBottom:"12px"}}>
            <div style={{fontSize:"11px",color:"#999",marginBottom:"5px",fontWeight:"600"}}>Tag</div>
            <select value={editGlow.day_of_week??1} onChange={e=>setEditGlow(p=>({...p,day_of_week:e.target.value}))} style={{width:"100%",padding:"12px 14px",border:"1px solid #e8e8e8",borderRadius:"12px",fontSize:"16px",outline:"none",background:"#fff",color:"#111"}}>
              {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <AdminInput label="Start (HH:MM)" value={editGlow.start_time} onChange={v=>setEditGlow(p=>({...p,start_time:v}))}/>
          <AdminInput label="Ende (HH:MM)" value={editGlow.end_time} onChange={v=>setEditGlow(p=>({...p,end_time:v}))}/>
          <AdminInput label="Multiplikator" value={editGlow.multiplier} onChange={v=>setEditGlow(p=>({...p,multiplier:v}))} type="number"/>
          {editGlow.id && <AdminToggle label="Aktiv" value={editGlow.active!==false} onChange={v=>setEditGlow(p=>({...p,active:v}))}/>}
        </AdminModal>
      )}

      {/* Header */}
      <div style={{ padding:`calc(${ST} + 14px) 16px 10px`,borderBottom:"1px solid #e8e8e8",background:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
        <div><div style={{ fontSize:"18px",fontWeight:"800",color:"#111" }}>Admin Panel</div><div style={{ fontSize:"11px",color:"#999" }}>Cereza · Frankfurt</div></div>
        <button onClick={onClose} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"12px",padding:"9px 18px",color:"#111",fontSize:"14px",fontWeight:"600" }}>Schließen</button>
      </div>

      {/* Tab Bar */}
      <div style={{ display:"flex",gap:"4px",padding:"8px 10px",overflowX:"auto",borderBottom:"1px solid #f0f0f0",background:"#fff",flexShrink:0 }}>
        {TABS.map(t => <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 14px",borderRadius:"20px",background:tab===t.id?"#e24a28":"#f5f5f5",color:tab===t.id?"#fff":"#666",fontSize:"12px",fontWeight:"600",whiteSpace:"nowrap",transition:"all 0.2s" }}>{t.l}</button>)}
      </div>

      {/* Content */}
      <div style={{ flex:1,overflowY:"auto",padding:"12px",WebkitOverflowScrolling:"touch" }}>
        {loading && <div style={{ textAlign:"center",padding:"40px",color:"#999" }}>Wird geladen...</div>}

        {!loading&&tab==="qrscan"&&<div><div style={{ fontSize:"16px",fontWeight:"700",color:"#111",marginBottom:"12px" }}>Mission QR-Scanner</div><QRMissionInline/></div>}

        {!loading&&tab==="stats"&&(
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px" }}>
              {stats.map((s,i)=><div key={i} style={{ background:"#fff",borderRadius:"16px",padding:"14px",border:"1px solid #e8e8e8" }}><div style={{ fontSize:"24px",fontWeight:"800",color:"#e24a28" }}>{s.v}</div><div style={{ fontSize:"11px",color:"#999",marginTop:"2px" }}>{s.l}</div></div>)}
            </div>
            <div style={{ background:"#fff",borderRadius:"16px",padding:"16px",border:"1px solid #e8e8e8" }}>
              <div style={{ fontSize:"12px",fontWeight:"700",marginBottom:"14px",color:"#555" }}>LEVEL VERTEILUNG</div>
              {[1,2,3,4,5].map(l=>{const count=users.filter(u=>(u.level||1)===l).length;return(
                <div key={l} style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px" }}>
                  <div style={{ width:"58px",fontSize:"12px",color:"#999" }}>Level {l}</div>
                  <div style={{ flex:1,height:"16px",background:"#f5f5f5",borderRadius:"8px",overflow:"hidden" }}><div style={{ height:"100%",width:`${users.length?(count/users.length)*100:0}%`,background:"#e24a28",borderRadius:"8px",transition:"width 0.5s" }}/></div>
                  <div style={{ width:"24px",fontSize:"12px",fontWeight:"700",textAlign:"right",color:"#111" }}>{count}</div>
                </div>
              );})}
            </div>
          </div>
        )}

        {!loading&&tab==="users"&&(
          <div>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="User suchen..." style={{ width:"100%",padding:"13px 16px",border:"1px solid #e8e8e8",borderRadius:"14px",fontSize:"16px",outline:"none",boxSizing:"border-box",marginBottom:"10px",background:"#fff",color:"#111" }}/>
            {filtered.map(u=>(
              <div key={u.id} style={{ background:"#fff",borderRadius:"16px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ width:"40px",height:"40px",borderRadius:"50%",background:"#e24a28",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"16px",fontWeight:"800",flexShrink:0 }}>{(u.name||"U")[0].toUpperCase()}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:"14px",fontWeight:"700",color:"#111" }}>@{u.name}{u.is_admin&&<span style={{ background:"#e24a28",color:"#fff",fontSize:"9px",padding:"1px 6px",borderRadius:"4px",marginLeft:"6px" }}>ADMIN</span>}</div>
                  <div style={{ fontSize:"11px",color:"#999",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.email}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}><div style={{ fontSize:"15px",fontWeight:"800",color:"#e24a28" }}>{u.pts||0}</div><div style={{ fontSize:"10px",color:"#999" }}>Lvl {u.level||1}</div></div>
                <button onClick={()=>setEditUser({...u})} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",padding:"8px 12px",color:"#555",flexShrink:0 }}>{I.edit}</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="redemptions"&&(
          <div>
            <div style={{ fontSize:"12px",color:"#999",marginBottom:"10px" }}>Offene Einlösungen bestätigen</div>
            {redemptions.length===0&&<div style={{ textAlign:"center",padding:"30px",color:"#999" }}>Keine offenen Einlösungen</div>}
            {redemptions.map(r=>(
              <div key={r.id} style={{ background:"#fff",borderRadius:"16px",padding:"14px",border:"1px solid #e8e8e8",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>{r.item?.icon} {r.item?.name||"Unbekannt"}</div>
                  <div style={{ fontSize:"12px",color:"#999" }}>@{r.profile?.name} · {r.pts_spent} XP</div>
                </div>
                <button onClick={async()=>{await db.confirmRedemption(r.id);ok2("Bestätigt ✓");db.getPendingRedemptions().then(setRedemptions);}} style={{ background:"#2d472a",borderRadius:"12px",padding:"12px 18px",color:"#fff",fontSize:"14px",fontWeight:"700" }}>✓ OK</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="shop"&&(
          <div>
            <button onClick={()=>setEditShop({name:"",description:"",icon:"🎁",cost:500,min_level:1})} style={{ width:"100%",padding:"13px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"15px",fontWeight:"700",marginBottom:"10px" }}>+ Neues Item</button>
            {shopItems.map(item=>(
              <div key={item.id} style={{ background:"#fff",borderRadius:"16px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ fontSize:"26px" }}>{item.icon}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>{item.name}</div><div style={{ fontSize:"12px",color:"#999" }}>{item.cost} XP · Level {item.min_level}+</div></div>
                <button onClick={()=>setEditShop({...item})} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",padding:"8px 12px",color:"#555" }}>{I.edit}</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="missions"&&(
          <div>
            <button onClick={()=>setEditMission({title:"",description:"",icon:"★",pts_reward:100,goal:1,active:true})} style={{ width:"100%",padding:"13px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"15px",fontWeight:"700",marginBottom:"10px" }}>+ Neue Mission</button>
            {missions.map(m=>(
              <div key={m.id} style={{ background:"#fff",borderRadius:"16px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ fontSize:"22px" }}>{m.icon}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>{m.title}</div><div style={{ fontSize:"12px",color:"#999" }}>{m.description} · +{m.pts_reward} XP · Ziel: {m.goal}×</div></div>
                <button onClick={()=>setEditMission({...m})} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",padding:"8px 12px",color:"#555" }}>{I.edit}</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="dishes"&&(
          <div>
            <button onClick={()=>setEditDish({name:"",description:"",active:true})} style={{ width:"100%",padding:"13px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"15px",fontWeight:"700",marginBottom:"10px" }}>+ Neues Gericht</button>
            {dishes.map(d=>(
              <div key={d.id} style={{ background:"#fff",borderRadius:"16px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                {d.image_url&&<img src={d.image_url} style={{ width:"44px",height:"44px",borderRadius:"10px",objectFit:"cover",flexShrink:0 }}/>}
                <div style={{ flex:1 }}><div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>{d.name}</div><div style={{ fontSize:"12px",color:"#999" }}>♥ {d.votes} Votes</div></div>
                <button onClick={()=>setEditDish({...d})} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",padding:"8px 12px",color:"#555",flexShrink:0 }}>{I.edit}</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="glow"&&(
          <div>
            <button onClick={()=>setEditGlow({day_of_week:1,start_time:"12:00",end_time:"14:00",multiplier:2,active:true})} style={{ width:"100%",padding:"13px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"15px",fontWeight:"700",marginBottom:"10px" }}>+ Neue Glow Hour</button>
            {glowHours.map(g=>(
              <div key={g.id} style={{ background:"#fff",borderRadius:"16px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ flex:1 }}><div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>{DAYS[g.day_of_week]}</div><div style={{ fontSize:"12px",color:"#999" }}>{g.start_time} – {g.end_time} · {g.multiplier}× XP · {g.active?"Aktiv":"Inaktiv"}</div></div>
                <button onClick={()=>setEditGlow({...g})} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",padding:"8px 12px",color:"#555" }}>{I.edit}</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="prizes"&&(
          <div>
            <button onClick={()=>setEditPrize({label:"",value:100,color:"#fde8e8",active:true})} style={{ width:"100%",padding:"13px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"15px",fontWeight:"700",marginBottom:"10px" }}>+ Neuer Preis</button>
            {prizes.map(p=>(
              <div key={p.id} style={{ background:"#fff",borderRadius:"16px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ width:"26px",height:"26px",borderRadius:"8px",background:p.color,flexShrink:0 }}/>
                <div style={{ flex:1 }}><div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>{p.label}</div><div style={{ fontSize:"12px",color:"#999" }}>{p.value>0?`+${p.value} XP`:p.value===-1?"2× XP":"Kein Gewinn"}</div></div>
                <button onClick={()=>setEditPrize({...p})} style={{ background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",padding:"8px 12px",color:"#555" }}>{I.edit}</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="facts"&&(
          <div>
            <div style={{ display:"flex",gap:"8px",marginBottom:"12px" }}>
              <input value={newFact} onChange={e=>setNewFact(e.target.value)} placeholder="Neuer Fun Fact..." style={{ flex:1,padding:"13px 16px",border:"1px solid #e8e8e8",borderRadius:"14px",fontSize:"16px",outline:"none",background:"#fff",color:"#111" }}/>
              <button onClick={async()=>{if(!newFact.trim())return;await db.addFunFact(newFact);setNewFact("");db.getFunFacts().then(setFacts);ok2("Hinzugefügt ✓");}} style={{ padding:"13px 18px",background:"#e24a28",borderRadius:"14px",color:"#fff",fontSize:"16px",fontWeight:"700" }}>+</button>
            </div>
            {facts.map(f=>(
              <div key={f.id} style={{ background:"#fff",borderRadius:"14px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"10px" }}>
                <div style={{ flex:1,fontSize:"14px",color:"#111" }}>{f.text}</div>
                <button onClick={async()=>{await db.deleteFunFact(f.id);db.getFunFacts().then(setFacts);}} style={{ background:"#f5f5f5",borderRadius:"8px",padding:"6px 12px",fontSize:"14px",color:"#999" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="vibes"&&(
          <div>
            <div style={{ fontSize:"12px",color:"#999",marginBottom:"10px" }}>Fotos zur Freigabe ({vibes.length})</div>
            {vibes.length===0&&<div style={{ textAlign:"center",padding:"30px",color:"#999" }}>Keine Fotos zur Freigabe</div>}
            {vibes.map(v=>(
              <div key={v.id} style={{ background:"#fff",borderRadius:"16px",padding:"12px",border:"1px solid #e8e8e8",marginBottom:"8px" }}>
                <img src={v.url} style={{ width:"100%",borderRadius:"10px",marginBottom:"8px",filter:"sepia(0.3) contrast(1.1)" }}/>
                <div style={{ fontSize:"12px",color:"#999",marginBottom:"10px" }}>@{v.profile?.name} · {new Date(v.created_at).toLocaleDateString('de-DE')}</div>
                <div style={{ display:"flex",gap:"8px" }}>
                  <button onClick={async()=>{await db.approveVibe(v.id,true);if(v.user_id){await db.addPts(v.user_id,50);}ok2("Freigegeben + 50 XP ✓");db.getPendingVibes().then(setVibes);}} style={{ flex:1,padding:"11px",background:"#2d472a",borderRadius:"12px",color:"#fff",fontSize:"14px",fontWeight:"700" }}>✓ Freigeben (+50 XP)</button>
                  <button onClick={async()=>{await supabase.from('vibe_photos').delete().eq('id',v.id);ok2("Abgelehnt");db.getPendingVibes().then(setVibes);}} style={{ flex:1,padding:"11px",background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"12px",color:"#999",fontSize:"14px",fontWeight:"700" }}>✕ Ablehnen</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="suggestions"&&(
          <div>
            <div style={{ fontSize:"12px",color:"#999",marginBottom:"10px" }}>Gericht-Vorschläge von Usern</div>
            <SuggestionsAdmin />
          </div>
        )}

        {!loading&&tab==="visits"&&(
          <div>
            <div style={{ fontSize:"12px",color:"#999",marginBottom:"10px" }}>Angemeldete Besuche heute ({visitors.length})</div>
            {visitors.length===0&&<div style={{ textAlign:"center",padding:"30px",color:"#999" }}>Noch keine Anmeldungen</div>}
            {visitors.map(v=>(
              <div key={v.id} style={{ background:"#fff",borderRadius:"14px",padding:"13px",border:"1px solid #e8e8e8",marginBottom:"6px",display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ width:"38px",height:"38px",borderRadius:"50%",background:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"700",fontSize:"16px" }}>{(v.profile?.name||"?")[0].toUpperCase()}</div>
                <div style={{ flex:1 }}><div style={{ fontSize:"15px",fontWeight:"700",color:"#111" }}>@{v.profile?.name||"User"}</div><div style={{ fontSize:"12px",color:"#2d472a",fontWeight:"600" }}>Kommt heute</div></div>
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="push"&&(
          <div>
            <div style={{ background:C.card,borderRadius:"20px",padding:"20px",marginBottom:"12px",boxShadow:"0 2px 20px rgba(29,28,19,0.04)" }}>
              <div style={{ fontSize:"14px",fontWeight:"700",color:C.text,marginBottom:"4px" }}>E-Mail an alle User</div>
              <div style={{ fontSize:"12px",color:C.textLight,marginBottom:"14px" }}>Benachrichtigung per E-Mail versenden</div>
              <input value={pushTitle} onChange={e=>setPushTitle(e.target.value)} placeholder="Betreff" style={{ width:"100%",padding:"14px 16px",background:C.surfaceLow||C.greyBg,borderRadius:"14px",fontSize:"15px",outline:"none",boxSizing:"border-box",marginBottom:"10px",border:"none",color:C.text }}/>
              <textarea value={pushBody} onChange={e=>setPushBody(e.target.value)} placeholder="Nachricht..." rows={3} style={{ width:"100%",padding:"14px 16px",background:C.surfaceLow||C.greyBg,borderRadius:"14px",fontSize:"15px",outline:"none",boxSizing:"border-box",marginBottom:"14px",border:"none",color:C.text,resize:"none",fontFamily:"inherit" }}/>
              <button onClick={async()=>{
                if(!pushTitle)return;
                try{
                  const{data:{session}}=await supabase.auth.getSession();
                  if(!session)return ok2("Nicht eingeloggt");
                  const res=await fetch("https://lmspocokowitbbtixugs.supabase.co/functions/v1/send-email",{
                    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},
                    body:JSON.stringify({title:pushTitle,body:pushBody,to:"all"})
                  });
                  const data=await res.json();
                  if(data.ok){ok2(`E-Mail an ${data.sent} User gesendet ✓`);setPushTitle("");setPushBody("");}
                  else ok2("Fehler: "+(data.error||"unbekannt"));
                }catch(e){ok2("Fehler: "+e.message);}
              }} style={{ width:"100%",padding:"14px",background:C.orange,borderRadius:"50px",color:"#fff",fontSize:"15px",fontWeight:"700" }}>E-Mail senden</button>
            </div>
            <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"1px",color:C.textLight,marginBottom:"10px" }}>SCHNELL-VORLAGEN</div>
            {[{t:"Glow Hour startet!",b:"Doppelte XP jetzt! Komm vorbei und sammle doppelt."},{t:"Neue Missionen",b:"Neue Challenges warten auf dich. Schau sie dir an!"},{t:"Neues Gericht",b:"Swipe jetzt in Cinder und bewerte das neue Gericht!"}].map((q,i)=>(
              <button key={i} onClick={async()=>{
                try{
                  const{data:{session}}=await supabase.auth.getSession();
                  if(!session)return;
                  await fetch("https://lmspocokowitbbtixugs.supabase.co/functions/v1/send-email",{
                    method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},
                    body:JSON.stringify({title:q.t,body:q.b,to:"all"})
                  });
                  ok2("E-Mail gesendet ✓");
                }catch{}
              }} style={{ width:"100%",padding:"14px 18px",background:C.card,borderRadius:"16px",marginBottom:"8px",textAlign:"left",display:"block",boxShadow:"0 2px 12px rgba(29,28,19,0.03)" }}>
                <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>{q.t}</div>
                <div style={{ fontSize:"12px",color:C.textLight,marginTop:"2px" }}>{q.b}</div>
              </button>
            ))}
          </div>
        )}

        {!loading&&tab==="qrgen"&&<QRGenInline/>}
      </div>
    </div>
  );
};

// ─── QR Generator Komponente ─────────────────────────────────────
const QRGenInline = () => {
  const QR_SECRET_ADMIN = "czlyl2024";
  const [pts,    setPts]    = useState(100);
  const [label,  setLabel]  = useState("");
  const [qrData, setQrData] = useState("");
  const [qrUrl,  setQrUrl]  = useState("");

  const generate = () => {
    const p = parseInt(pts);
    if (!p || p <= 0) return;
    const token = btoa(`${p}:${QR_SECRET_ADMIN}`).replace(/=/g,"").substring(0,8);
    const code = `cereza:${p}:${token}`;
    setQrData(code);
    // QR-Code via Google Charts API
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=111111&margin=10`);
  };

  const PRESETS = [
    {l:"Kleiner Besuch",v:50},{l:"Normaler Besuch",v:100},{l:"Großer Besuch",v:150},
    {l:"Bonus",v:200},{l:"Special Event",v:500},{l:"VIP",v:1000},
  ];

  return (
    <div>
      <div style={{ fontSize:"13px",color:"#999",marginBottom:"14px",lineHeight:1.5 }}>
        Generiere QR-Codes mit beliebigen XP-Werten. Diese Codes werden auf Belege gedruckt und von Kunden gescannt.
      </div>

      {/* Presets */}
      <div style={{ marginBottom:"14px" }}>
        <div style={{ fontSize:"11px",fontWeight:"700",color:"#999",marginBottom:"8px" }}>SCHNELLAUSWAHL</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px" }}>
          {PRESETS.map(p => (
            <button key={p.v} onClick={() => { setPts(p.v); setLabel(p.l); }}
              style={{ padding:"10px 6px",background:pts===p.v?"#e24a28":"#f5f5f5",border:pts===p.v?"none":"1px solid #e8e8e8",borderRadius:"10px",color:pts===p.v?"#fff":"#111",fontSize:"12px",fontWeight:"600",cursor:"pointer",transition:"all 0.2s" }}>
              <div>{p.l}</div>
              <div style={{ fontSize:"11px",opacity:0.7,marginTop:"2px" }}>{p.v} XP</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div style={{ background:"#fff",borderRadius:"16px",padding:"16px",border:"1px solid #e8e8e8",marginBottom:"14px" }}>
        <AdminInput label="XP Wert (beliebig)" value={pts} onChange={v => setPts(v)} type="number"/>
        <AdminInput label="Beschriftung (optional)" value={label} onChange={setLabel}/>
        <button onClick={generate} style={{ width:"100%",padding:"13px",background:"#e24a28",borderRadius:"12px",color:"#fff",fontSize:"15px",fontWeight:"700" }}>
          QR-Code generieren
        </button>
      </div>

      {/* Generierter QR */}
      {qrData && (
        <div style={{ background:"#fff",borderRadius:"16px",padding:"20px",border:"1px solid #e8e8e8",textAlign:"center" }}>
          <img src={qrUrl} style={{ width:"220px",height:"220px",borderRadius:"12px",margin:"0 auto",display:"block" }} alt="QR Code"/>
          <div style={{ fontSize:"18px",fontWeight:"800",color:"#e24a28",marginTop:"14px" }}>{pts} XP</div>
          {label && <div style={{ fontSize:"13px",color:"#999",marginTop:"4px" }}>{label}</div>}
          <div style={{ fontSize:"11px",color:"#ccc",marginTop:"8px",fontFamily:"monospace" }}>{qrData}</div>
          <div style={{ display:"flex",gap:"8px",marginTop:"14px" }}>
            <button onClick={() => { navigator.clipboard?.writeText(qrData); }} style={{ flex:1,padding:"11px",background:"#f5f5f5",border:"1px solid #e8e8e8",borderRadius:"10px",color:"#111",fontSize:"13px",fontWeight:"600" }}>
              Code kopieren
            </button>
            <a href={qrUrl} download={`cereza-qr-${pts}xp.png`} style={{ flex:1,padding:"11px",background:"#e24a28",borderRadius:"10px",color:"#fff",fontSize:"13px",fontWeight:"600",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center" }}>
              Bild laden
            </a>
          </div>
          <div style={{ fontSize:"11px",color:"#999",marginTop:"12px",lineHeight:1.5 }}>
            Drucke diesen QR-Code auf Belege · Kunden scannen ihn in der App
          </div>
        </div>
      )}
    </div>
  );
};
export default function App() {
  const [user,        setUser]       = useState(null);
  const [tab,         setTab]        = useState("home");
  const [showLevelUp, setShowLevelUp]= useState(null);
  const [adminMode,   setAdminMode]  = useState(false);
  const [loading,     setLoading]    = useState(true);
  const [toast,       setToast]      = useState(null);
  const [showOnboard, setShowOnboard]= useState(false); // Onboarding
  const theme = useTheme();
  const { t, mode, setMode, glow, setGlow, isGlow } = theme;
  applyTheme(t);
  const CSS = getCSS(t);

  // ── Session restore ────────────────────────────────────────────
  useEffect(() => {
    const fallback = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event==='SIGNED_OUT' || event==='USER_DELETED') {
        setUser(null); setAdminMode(false); setLoading(false); clearTimeout(fallback);
      }
      if ((event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED') && session?.user) {
        try {
          let p = null;
          for (let i=0; i<3; i++) {
            try { p = await Promise.race([db.getProfile(session.user.id), new Promise((_,rej) => setTimeout(() => rej(), 1500))]); } catch(e) {}
            if (p) break;
            if (i<2) await new Promise(r => setTimeout(r, 400));
          }
          if (p) {
            setUser(p);
            // Onboarding beim ersten Login zeigen
            if (event==='SIGNED_IN' && !p.onboarded) {
              setShowOnboard(true);
              db.updateProfile(p.id, { onboarded:true }).catch(()=>{});
            }
          }
          else setUser({ id:session.user.id, name:session.user.user_metadata?.name||session.user.email?.split('@')[0], email:session.user.email, pts:0, level:1, streak:0, total_visits:0, treat_count:0, treat_goal:8, wheel_spun_today:false, is_abo_member:false, is_admin:false });
        } catch(e) { console.error('Profile load:', e); }
        setLoading(false); clearTimeout(fallback);
      }
      if (event==='INITIAL_SESSION' && !session) {
        setLoading(false); clearTimeout(fallback);
      }
    });
    return () => { subscription?.unsubscribe(); clearTimeout(fallback); };
  }, []);

  // ── Realtime profile sync ──────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('profile-sync-' + user.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${user.id}`}, payload => { setUser(prev => ({ ...prev, ...payload.new })); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // ── Freund-Benachrichtigungen (Realtime) ──────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('friend-notif-' + user.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'friendships',filter:`sender_id=eq.${user.id}`}, payload => {
        if (payload.new?.status==='accepted') {
          setToast({ title:"Freundschaft angenommen! 🎉", body:`Ihr seid jetzt Freunde` });
          setTimeout(() => setToast(null), 4000);
          Sound.notify();
        }
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'friendships',filter:`receiver_id=eq.${user.id}`}, () => {
        setToast({ title:"Neue Freundschaftsanfrage! 👋", body:"Schau in deinem Profil nach" });
        setTimeout(() => setToast(null), 4000);
        Sound.notify();
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  // ── Push notifications ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    requestPushPermission(user.id).catch(() => {});
    const unsub = onForegroundMessage(payload => {
      const { title, body } = payload.notification || {};
      if (title) { setToast({ title, body }); setTimeout(() => setToast(null), 4000); Sound.tap(); }
    });
    return () => { if (typeof unsub==='function') unsub(); };
  }, [user?.id]);

  // ── Level up ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ne = [...ERAS].reverse().find(e => (user.pts||0) >= e.pts);
    if (ne && ne.level > (user.level||1)) {
      setUser(u => ({ ...u, level:ne.level }));
      if (user?.id) db.updateProfile(user.id, { level:ne.level });
      setShowLevelUp(ne.level); Sound.lvl();
    }
  }, [user?.pts]);

  // ── Loading screen ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ position:"fixed",inset:0,background:"#C1272D",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <style>{defaultCSS}</style>
      <div style={{ textAlign:"center",animation:"fadeUp 0.5s ease" }}>
        <div style={{ fontSize:"52px",fontFamily:font.display,color:"#fff",fontWeight:"700" }}>cereza</div>
        <div style={{ fontSize:"11px",letterSpacing:"5px",color:"rgba(255,255,255,0.4)",marginTop:"8px" }}>LOYALTY CLUB</div>
      </div>
    </div>
  );

  if (adminMode==="login") return <AdminLogin onLogin={() => setAdminMode("panel")} onBack={() => setAdminMode(false)}/>;
  if (adminMode==="panel") return <AdminPanel onClose={async () => { await db.signOut(); setAdminMode(false); }}/>;
  if (!user) return (
    <div style={{ position:"fixed",inset:0,maxWidth:"430px",margin:"0 auto" }}>
      <AuthScreen onLogin={setUser}/>
      <div onClick={() => setAdminMode("login")} style={{ position:"fixed",bottom:`calc(${SB} + 10px)`,left:"50%",transform:"translateX(-50%)",color:"rgba(0,0,0,0.04)",fontSize:"9px",cursor:"pointer",padding:"8px 16px",userSelect:"none" }}>admin</div>
    </div>
  );

  // Onboarding beim ersten Login
  if (showOnboard) return <OnboardingScreen user={user} onDone={() => setShowOnboard(false)}/>;

  const NAV = [
    {id:"home",     icon:I.home,   l:"Home"},
    {id:"missions", icon:I.target, l:"Missions"},
    {id:"scan",     icon:I.qr,     l:"Scan"},
    {id:"fam",      icon:I.fam,    l:"Fam"},
    {id:"profile",  icon:I.user,   l:"Profil"},
  ];

  return (
    <div style={{ position:"fixed",inset:0,maxWidth:"430px",margin:"0 auto",fontFamily:font.ui,background:t.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <style>{CSS}</style>
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)}/>}
      {toast && (
        <div style={{ position:"fixed",top:`calc(${ST} + 16px)`,left:"50%",transform:"translateX(-50%)",background:t.card,border:`1px solid ${t.border}`,borderRadius:"16px",padding:"12px 18px",zIndex:9998,boxShadow:"0 8px 32px rgba(0,0,0,0.14)",maxWidth:"340px",width:"90%",animation:"fadeUp 0.3s",display:"flex",gap:"10px",alignItems:"center" }}>
          <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:t.accent,flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:"13px",fontWeight:"600",color:t.text }}>{toast.title}</div>
            {toast.body && <div style={{ fontSize:"11px",color:t.textLight,marginTop:"2px" }}>{toast.body}</div>}
          </div>
        </div>
      )}

      {/* Content – kein overscroll */}
      <div style={{ flex:1,overflow:"hidden",minHeight:0 }}>
        <div style={{ height:"100%",overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",overscrollBehavior:"none" }}>
          {tab==="home"     && <HomeTab    user={user} setUser={setUser} setTab={setTab}/>}
          {tab==="missions" && <WheelTab   user={user} setUser={setUser}/>}
          {tab==="scan"     && <ScanTab    user={user} setUser={setUser}/>}
          {tab==="fam"      && <FamTab     user={user} C={C} font={font}/>}
          {tab==="profile"  && <ProfileTab user={user} setUser={setUser} onLogout={async () => { await db.signOut(); setUser(null); }} theme={theme}/>}
        </div>
      </div>

      {/* Tab Bar – immer am untersten Displayrand */}
      <div style={{
        flexShrink:0,
        background:t.navBg,
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        borderTop:`0.5px solid ${t.navBorder}`,
        paddingBottom:`env(safe-area-inset-bottom, 0px)`,
      }}>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${NAV.length},1fr)`, padding:"8px 0 4px", maxWidth:"430px", margin:"0 auto" }}>
          {NAV.map(n => {
            const a = tab === n.id;
            return (
              <button key={n.id} onClick={() => { Sound.tap(); setTab(n.id); }}
                style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",background:"none",padding:"6px 0",color:a?t.accent:t.textLight,border:"none",outline:"none" }}>
                <div style={{ padding:"4px 10px",borderRadius:"12px",background:a?t.accent+"1a":"transparent",transform:a?"scale(1.08)":"scale(1)",transition:"all 0.2s",color:a?t.accent:t.textLight }}>{n.icon}</div>
                <span style={{ fontSize:"10px",fontWeight:a?"700":"500",lineHeight:1 }}>{n.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
