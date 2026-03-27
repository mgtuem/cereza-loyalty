// src/UserComponents.jsx
// UserProfileCard – PopUp Karte wenn man auf einen User drückt
// MissionQRScanner – Admin scannt QR-Code des Users um Mission zu stempeln

import { useState, useEffect, useRef } from "react";
import supabase, { db } from "./supabase";

const ERAS = [
  {level:1,name:"Newbie",pts:0},{level:2,name:"Regular",pts:500},
  {level:3,name:"Muse",pts:1200},{level:4,name:"Insider",pts:2500},{level:5,name:"Icon",pts:5000},
];

// ─── User Profile Card ────────────────────────────────────────────
export function UserProfileCard({ userId, currentUser, C, font, onClose }) {
  const [profile, setProfile] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [relation, setRelation] = useState(null); // null | 'pending' | 'accepted'
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const era = profile ? (ERAS.find(e => e.level === (profile.level||1)) || ERAS[0]) : null;

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (p) setProfile(p);
      const { count } = await supabase.from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');
      setFriendCount(count || 0);
      if (currentUser?.id && currentUser.id !== userId) {
        const { data: f } = await supabase.from('friendships').select('id,status,sender_id,receiver_id')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`);
        if (f?.length) setRelation(f[0].status);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const follow = async () => {
    if (!currentUser?.id || relation || currentUser.id === userId) return;
    setSending(true);
    const { error } = await supabase.from('friendships').insert({ sender_id: currentUser.id, receiver_id: userId, status: 'pending' });
    if (!error) setRelation('pending');
    setSending(false);
  };

  const SB = "env(safe-area-inset-bottom,0px)";

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"flex-end",animation:"fadeIn 0.2s" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.card,borderRadius:"24px 24px 0 0",padding:"28px 24px",width:"100%",boxSizing:"border-box",paddingBottom:`calc(28px + ${SB})`,animation:"slideUp 0.3s ease" }}
      >
        {/* Drag Handle */}
        <div style={{ width:"40px",height:"4px",borderRadius:"2px",background:C.border,margin:"0 auto 20px" }}/>

        {loading ? (
          <div style={{ textAlign:"center",padding:"32px",color:C.textLight }}>Laden...</div>
        ) : (
          <>
            {/* Avatar + Name */}
            <div style={{ textAlign:"center",marginBottom:"22px" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} style={{ width:"76px",height:"76px",borderRadius:"50%",objectFit:"cover",border:`3px solid ${C.border}`,marginBottom:"10px" }}/>
                : <div style={{ width:"76px",height:"76px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"30px",color:C.white,fontWeight:"700",margin:"0 auto 10px" }}>{(profile?.name||"?")[0].toUpperCase()}</div>
              }
              <div style={{ fontSize:"22px",fontFamily:font.display,fontWeight:"700",color:C.text }}>@{profile?.name||"user"}</div>
              <div style={{ fontSize:"13px",color:C.textLight,marginTop:"4px" }}>{era?.name} · Level {profile?.level||1}</div>
              {profile?.instagram && (
                <div style={{ fontSize:"12px",color:C.orange,marginTop:"3px" }}>@{profile.instagram}</div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"20px" }}>
              {[{v:profile?.pts||0,l:"XP"},{v:profile?.total_visits||0,l:"Besuche"},{v:friendCount,l:"Freunde"}].map((s,i) => (
                <div key={i} style={{ textAlign:"center",padding:"13px 8px",background:C.greyBg,borderRadius:"14px" }}>
                  <div style={{ fontSize:"22px",fontWeight:"800",color:C.text }}>{s.v}</div>
                  <div style={{ fontSize:"11px",color:C.textLight,marginTop:"2px",fontWeight:"500" }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Era Journey */}
            <div style={{ display:"flex",justifyContent:"center",gap:"6px",marginBottom:"22px" }}>
              {ERAS.map((e,i) => (
                <div key={i} style={{ width:"40px",height:"40px",borderRadius:"50%",background:(profile?.level||1)>=e.level?C.orange:C.greyBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"800",color:(profile?.level||1)>=e.level?C.white:C.textLight,border:(profile?.level||1)===e.level?`2.5px solid ${C.text}`:"none" }}>
                  {(profile?.level||1)>=e.level?e.level:"·"}
                </div>
              ))}
            </div>

            {/* Buttons */}
            {currentUser?.id !== userId ? (
              <button onClick={follow} disabled={!!relation || sending} style={{ width:"100%",padding:"15px",background:relation?C.greyBg:C.orange,border:"none",borderRadius:"14px",color:relation?C.textLight:C.white,fontSize:"16px",fontWeight:"700",transition:"all 0.2s",cursor:relation?"default":"pointer" }}>
                {sending ? "..." : relation === 'accepted' ? "✓ Freunde" : relation === 'pending' ? "Anfrage gesendet ✓" : "+ Folgen"}
              </button>
            ) : (
              <div style={{ textAlign:"center",color:C.textLight,fontSize:"14px",padding:"8px" }}>Das bist du 👋</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Mission QR Scanner (Admin only) ─────────────────────────────
export function MissionQRScanner({ onClose, C, font }) {
  const [scanning, setScanning] = useState(false);
  const [missions, setMissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [scanned, setScanned] = useState(null); // { id, name }
  const [result, setResult] = useState(null);
  const [stamping, setStamping] = useState(false);
  const scannerRef = useRef(null);
  const ST = "env(safe-area-inset-top,0px)";

  useEffect(() => {
    db.getMissions().then(setMissions);
    return () => { if (scannerRef.current) try { scannerRef.current.stop(); } catch(e) {} };
  }, []);

  const startScan = async () => {
    setScanning(true); setResult(null); setScanned(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("mission-qr-reader");
      scannerRef.current = s;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (text) => {
          await s.stop(); setScanning(false);
          // Format: "cereza:USER_ID" oder direkt UUID
          let uid = text.trim();
          if (text.startsWith("cereza:")) uid = text.split(":")[1];
          // UUID-Format prüfen
          const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRx.test(uid)) { setResult({ ok:false, msg:"Kein gültiger Cereza QR-Code" }); return; }
          const { data: p } = await supabase.from('profiles').select('id,name').eq('id', uid).single();
          if (p) setScanned({ id: p.id, name: p.name });
          else setResult({ ok:false, msg:"User nicht gefunden" });
        },
        () => {}
      );
    } catch(e) {
      setScanning(false);
      setResult({ ok:false, msg: "Kamera nicht verfügbar" });
    }
  };

  const doStamp = async () => {
    if (!scanned || !selected || stamping) return;
    setStamping(true);
    const { data, error } = await supabase.rpc('stamp_mission', { p_user_id: scanned.id, p_mission_id: selected.id });
    if (error || !data?.ok) {
      setResult({ ok:false, msg: data?.error || error?.message || "Fehler" });
    } else {
      setResult({ ok:true, msg: data.completed ? `✅ Mission abgeschlossen! +${selected.pts_reward} XP` : `✅ Stempel ${data.progress}/${data.goal}` });
      setScanned(null);
    }
    setStamping(false);
  };

  const reset = () => { setResult(null); setScanned(null); };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9998,background:"#0a0a0a",display:"flex",flexDirection:"column",animation:"fadeIn 0.2s" }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ padding:`calc(${ST} + 18px) 20px 14px`,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <div style={{ fontSize:"10px",letterSpacing:"3px",color:"rgba(255,255,255,0.45)",fontWeight:"600" }}>ADMIN</div>
          <div style={{ fontSize:"22px",fontFamily:font.display,color:"#fff",fontWeight:"700",marginTop:"2px" }}>Mission stempeln</div>
        </div>
        <button onClick={onClose} style={{ width:"38px",height:"38px",borderRadius:"50%",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
      </div>

      <div style={{ flex:1,overflowY:"auto",padding:"16px" }}>

        {/* Schritt 1: Mission wählen */}
        <div style={{ marginBottom:"18px" }}>
          <div style={{ fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.45)",letterSpacing:"1px",marginBottom:"10px" }}>1. MISSION WÄHLEN</div>
          {missions.map(m => (
            <button key={m.id} onClick={() => { setSelected(m); setScanned(null); setResult(null); }}
              style={{ width:"100%",padding:"12px 14px",background:selected?.id===m.id?"#e24a28":"rgba(255,255,255,0.07)",border:selected?.id===m.id?"none":"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"#fff",textAlign:"left",display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px",transition:"all 0.2s",cursor:"pointer" }}>
              <span style={{ fontSize:"18px" }}>{m.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"14px",fontWeight:"700" }}>{m.title}</div>
                <div style={{ fontSize:"11px",opacity:0.55,marginTop:"2px" }}>{m.description} · Ziel: {m.goal}×</div>
              </div>
              {selected?.id===m.id && <span style={{ fontSize:"18px" }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Schritt 2: QR scannen */}
        {selected && !scanned && (
          <div style={{ marginBottom:"18px" }}>
            <div style={{ fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.45)",letterSpacing:"1px",marginBottom:"10px" }}>2. USER QR-CODE SCANNEN</div>
            <div id="mission-qr-reader" style={{ width:"100%",maxWidth:"300px",height:"240px",borderRadius:"16px",overflow:"hidden",background:"#000",border:`2px solid ${scanning?"#e24a28":"rgba(255,255,255,0.2)"}`,margin:"0 auto 12px",display:"block",transition:"border 0.3s" }}/>
            {!scanning
              ? <button onClick={startScan} style={{ width:"100%",padding:"14px",background:"#e24a28",border:"none",borderRadius:"12px",color:"#fff",fontSize:"15px",fontWeight:"700" }}>
                  Kamera starten
                </button>
              : <div style={{ textAlign:"center",color:"rgba(255,255,255,0.5)",fontSize:"13px",padding:"8px" }}>Scanne den QR-Code des Users...</div>
            }
          </div>
        )}

        {/* Schritt 3: Bestätigen */}
        {selected && scanned && !result && (
          <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:"16px",padding:"18px",border:"1px solid rgba(255,255,255,0.12)" }}>
            <div style={{ fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.45)",letterSpacing:"1px",marginBottom:"12px" }}>3. BESTÄTIGEN</div>
            <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px" }}>
              <div style={{ width:"44px",height:"44px",borderRadius:"50%",background:"#e24a28",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",color:"#fff",fontWeight:"700",flexShrink:0 }}>
                {scanned.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:"16px",fontWeight:"700",color:"#fff" }}>@{scanned.name}</div>
                <div style={{ fontSize:"12px",color:"rgba(255,255,255,0.5)",marginTop:"2px" }}>{selected.icon} {selected.title}</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:"8px" }}>
              <button onClick={doStamp} disabled={stamping} style={{ flex:1,padding:"14px",background:"#e24a28",border:"none",borderRadius:"12px",color:"#fff",fontSize:"15px",fontWeight:"700",opacity:stamping?0.7:1 }}>
                {stamping ? "..." : "✓ Stempel geben"}
              </button>
              <button onClick={() => setScanned(null)} style={{ padding:"14px 16px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"12px",color:"#fff",fontSize:"14px" }}>
                ↩
              </button>
            </div>
          </div>
        )}

        {/* Ergebnis */}
        {result && (
          <div style={{ padding:"20px",background:result.ok?"rgba(45,120,45,0.3)":"rgba(180,40,40,0.3)",borderRadius:"16px",border:`1px solid ${result.ok?"rgba(74,222,128,0.4)":"rgba(248,113,113,0.4)"}`,textAlign:"center",animation:"fadeIn 0.3s" }}>
            <div style={{ fontSize:"28px",marginBottom:"8px" }}>{result.ok?"✅":"❌"}</div>
            <div style={{ fontSize:"16px",fontWeight:"700",color:"#fff",lineHeight:1.4 }}>{result.msg}</div>
            <button onClick={reset} style={{ marginTop:"14px",padding:"10px 24px",background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"20px",color:"#fff",fontSize:"14px",fontWeight:"600" }}>
              Weiter
            </button>
          </div>
        )}

        {/* User QR-Code anzeigen (für den User selbst) */}
        <div style={{ marginTop:"20px",padding:"14px",background:"rgba(255,255,255,0.05)",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.08)",textAlign:"center" }}>
          <div style={{ fontSize:"11px",color:"rgba(255,255,255,0.4)",marginBottom:"4px" }}>INFO</div>
          <div style={{ fontSize:"12px",color:"rgba(255,255,255,0.55)",lineHeight:1.5 }}>
            User zeigen ihren QR-Code im Profil-Tab.<br/>
            Format: <span style={{ color:"rgba(255,255,255,0.7)",fontFamily:"monospace" }}>cereza:USER_ID</span>
          </div>
        </div>
      </div>
    </div>
  );
}
