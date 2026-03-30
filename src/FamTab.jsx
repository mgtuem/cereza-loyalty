// src/FamTab.jsx
// Fix #8: Cinder ist jetzt hier drin (nicht mehr eigener Nav-Tab)
// Fix #9: Heute raus (ist im Home Dashboard)
// Fix #10: Vibes und Gedanken sind eine Kategorie "Vibes"

import { useState, useEffect, useRef } from "react";
import supabase, { db } from "./supabase";

// Story-Share Helper: Erzeugt ein Cereza-gebrandetes Story-Bild
const shareAsStory = async (type, content, userName) => {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Hintergrund
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#C1272D"); bg.addColorStop(0.6, "#8B0000"); bg.addColorStop(1, "#1a0000");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Deko
  ctx.globalAlpha = 0.05; ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(200, 400, 300, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(880, 1400, 250, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  // Header
  ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "600 26px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("CEREZA LOYALTY CLUB", W/2, 100);

  if (type === "vibe") {
    // Vibe-Foto laden und zentriert anzeigen
    try {
      const img = new Image(); img.crossOrigin = "anonymous";
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = content.url; });
      const maxH = 1200, maxW = 900;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      // Rahmen
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.roundRect((W-iw)/2-12, 280-12, iw+24, ih+24, 28); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect((W-iw)/2, 280, iw, ih, 20); ctx.clip();
      ctx.drawImage(img, (W-iw)/2, 280, iw, ih);
      ctx.restore();
    } catch(e) {}
    ctx.fillStyle = "#fff"; ctx.font = "700 36px Inter, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`📷 Vibe von @${userName}`, W/2, H - 200);
  } else {
    // Gedanke als Text
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.roundRect(80, 500, W-160, 700, 32); ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "400 120px serif"; ctx.textAlign = "left";
    ctx.fillText("\u201C", 120, 620);
    ctx.textAlign = "right"; ctx.fillText("\u201D", W-120, 1120);

    // Text umbrechen
    ctx.fillStyle = "#fff"; ctx.font = "700 42px Inter, sans-serif"; ctx.textAlign = "center";
    const words = content.text.split(" "); let lines = []; let line = "";
    for (const w of words) {
      if (ctx.measureText(line + w).width > 760) { lines.push(line.trim()); line = w + " "; }
      else line += w + " ";
    }
    if (line.trim()) lines.push(line.trim());
    const lineH = 58, startY = 850 - (lines.length * lineH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W/2, startY + i * lineH));

    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "600 28px Inter, sans-serif";
    ctx.fillText(`💭 @${userName}`, W/2, 1280);
    if (content.upvotes > 0) {
      ctx.fillText(`♥ ${content.upvotes} Likes`, W/2, 1330);
    }
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "600 24px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("cereza-loyalty.vercel.app", W/2, H - 100);
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.font = "500 20px Inter, sans-serif";
  ctx.fillText("Werde Teil der Cereza Fam", W/2, H - 60);

  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
  const file = new File([blob], "cereza-story.png", { type:"image/png" });
  if (navigator.canShare?.({ files:[file] })) {
    await navigator.share({ files:[file], title:"Cereza Story" });
    return true;
  } else {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    return false;
  }
};

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|\b\w+\.(com|de|net|org|io|at|ch)\b/gi;
const hasLink = (text) => URL_REGEX.test(text);

export default function FamTab({ user, C, font }) {
  const ST = "env(safe-area-inset-top,0px)";
  const [section, setSection] = useState("vibes");

  // Tabs: Vibes (Fotos+Gedanken), Cinder (Voting), Ergebnisse
  const TABS = [
    { id:"vibes",      l:"Vibes"    },
    { id:"cinder",     l:"Cinder"   },
    { id:"ergebnisse", l:"Ergebnisse"},
  ];

  return (
    <div style={{ background:C.beige, minHeight:"100%", paddingBottom:"24px" }}>
      <div style={{ padding:`calc(${ST} + 18px) 20px 14px` }}>
        <div style={{ fontSize:"11px",letterSpacing:"3px",color:C.textLight,fontWeight:"600",textTransform:"uppercase" }}>Community</div>
        <div style={{ fontSize:"28px",fontFamily:font.display,color:C.text,fontWeight:"700",marginTop:"2px" }}>The Fam</div>
      </div>

      {/* Tabs */}
      <div style={{ padding:"0 16px 14px" }}>
        <div style={{ display:"flex",gap:"4px",background:C.greyBg,borderRadius:"14px",padding:"3px" }}>
          {TABS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              flex:1, padding:"9px 2px", borderRadius:"11px",
              background:section===s.id ? C.card : "transparent",
              color:section===s.id ? C.text : C.textLight,
              fontSize:"11px", fontWeight:section===s.id?"700":"500",
              border:"none", transition:"all 0.2s", cursor:"pointer",
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {section==="vibes"      && <VibesSection      user={user} C={C} font={font}/>}
      {section==="cinder"     && <CinderVoteSection user={user} C={C} font={font}/>}
      {section==="ergebnisse" && <CinderResults     user={user} C={C} font={font}/>}
    </div>
  );
}

// ─── Vibes (Fotos + Gedanken) ─────────────────────────────────────
// Fix #10: Vibes und Gedanken sind eine Kategorie
function VibesSection({ user, C, font }) {
  const [subTab, setSubTab] = useState("fotos");
  return (
    <div style={{ padding:"0 16px" }}>
      {/* Sub-Tabs */}
      <div style={{ display:"flex",gap:"6px",marginBottom:"14px" }}>
        {[{id:"fotos",l:"📷 Fotos"},{id:"gedanken",l:"💭 Gedanken"}].map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            padding:"8px 16px", borderRadius:"20px",
            background:subTab===s.id ? C.orange : C.greyBg,
            color:subTab===s.id ? C.white : C.textLight,
            fontSize:"13px", fontWeight:"600", border:"none", cursor:"pointer", transition:"all 0.2s",
          }}>{s.l}</button>
        ))}
      </div>
      {subTab==="fotos"    && <FotosSection    user={user} C={C} font={font}/>}
      {subTab==="gedanken" && <ThoughtsSection user={user} C={C} font={font}/>}
    </div>
  );
}

// ─── Fotos ────────────────────────────────────────────────────────
function FotosSection({ user, C, font }) {
  const [vibes,     setVibes]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err,       setErr]       = useState("");

  const load = async () => {
    const { data } = await supabase.from("vibe_photos")
      .select("*, profile:user_id(name, avatar_url)")
      .eq("approved", true)
      .order("created_at", { ascending:false });
    setVibes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("vibes-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"vibe_photos" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const upload = async (file) => {
    if (!file || !user?.id) { setErr("Bitte einloggen"); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("Bild zu groß (max 10MB)"); return; }
    setErr(""); setUploading(true);
    try {
      const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `vibes/${user.id}_${Date.now()}.${ext}`;
      const { error:upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert:false, contentType:file.type||'image/jpeg' });
      if (upErr) { setErr("Upload fehlgeschlagen: " + upErr.message); setUploading(false); return; }
      const { data:urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = urlData.publicUrl + '?t=' + Date.now();
      const { error:dbErr } = await supabase.from('vibe_photos').insert({ user_id:user.id, url, approved:false });
      if (dbErr) { setErr("Fehler: " + dbErr.message); }
      else { setErr(""); alert("Hochgeladen! Wird nach Admin-Freigabe sichtbar."); }
    } catch(e) { setErr("Fehler: " + e.message); }
    setUploading(false);
  };

  return (
    <div>
      <label style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",width:"100%",padding:"13px",background:uploading?C.greyBg:C.orange,borderRadius:"14px",color:uploading?C.textLight:C.white,fontSize:"14px",fontWeight:"700",cursor:uploading?"not-allowed":"pointer",marginBottom:err?"8px":"14px",boxSizing:"border-box" }}>
        {uploading ? "Wird hochgeladen..." : "📷 Vibe hochladen"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{ display:"none" }}
          disabled={uploading}
          onChange={e => { const f=e.target.files?.[0]; if(f) upload(f); e.target.value=''; }}/>
      </label>
      {err && <div style={{ color:C.orange,fontSize:"13px",marginBottom:"12px",textAlign:"center" }}>{err}</div>}
      {loading && <div style={{ textAlign:"center",padding:"40px",color:C.textLight }}>Laden...</div>}
      {!loading && vibes.length===0 && (
        <div style={{ textAlign:"center",padding:"48px" }}>
          <div style={{ fontSize:"40px",marginBottom:"10px" }}>📷</div>
          <div style={{ fontSize:"15px",fontWeight:"700",color:C.text }}>Noch keine Vibes</div>
          <div style={{ fontSize:"13px",color:C.textLight,marginTop:"4px" }}>Lade das erste Bild hoch!</div>
        </div>
      )}
      <div style={{ columns:"2",columnGap:"8px" }}>
        {vibes.map(v => (
          <div key={v.id} style={{ breakInside:"avoid",marginBottom:"8px",borderRadius:"16px",overflow:"hidden",position:"relative" }}>
            <img src={v.url} style={{ width:"100%",display:"block",filter:"sepia(0.2) contrast(1.06) saturate(0.95)" }} loading="lazy"/>
            <div style={{ position:"absolute",bottom:"8px",left:"8px",right:"8px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",borderRadius:"20px",padding:"3px 9px",display:"flex",alignItems:"center",gap:"5px" }}>
                <div style={{ width:"16px",height:"16px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",color:"#fff",fontWeight:"700" }}>
                  {(v.profile?.name||"?")[0].toUpperCase()}
                </div>
                <div style={{ fontSize:"10px",color:"#fff",fontWeight:"600" }}>@{v.profile?.name||"anon"}</div>
              </div>
              <button onClick={async(e) => { e.stopPropagation(); await shareAsStory("vibe", v, user?.name||"user"); }}
                style={{ background:"rgba(0,0,0,0.55)",backdropFilter:"blur(8px)",borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",border:"none",color:"#fff",fontSize:"12px",cursor:"pointer" }}>↗</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cinder – Swipe Voting ────────────────────────────────────────
// Fix #8: Cinder ist jetzt hier im Fam Tab
function CinderVoteSection({ user, C, font }) {
  const [dishes,    setDishes]    = useState([]);
  const [unvoted,   setUnvoted]   = useState([]);
  const [cur,       setCur]       = useState(0);
  const [dir,       setDir]       = useState(null);
  const [dragX,     setDragX]     = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [voting,    setVoting]    = useState(false);
  const [showPropose, setShowPropose] = useState(false);
  const [propName,    setPropName]    = useState("");
  const [propDesc,    setPropDesc]    = useState("");
  const [proposing,   setProposing]   = useState(false);
  const MIN_LEVEL_PROPOSE = 5;

  const canPropose = (user?.level || 1) >= MIN_LEVEL_PROPOSE;

  const submitProposal = async () => {
    if (!propName.trim() || proposing || !user?.id) return;
    setProposing(true);
    const { error } = await supabase.from("dish_proposals").insert({
      user_id: user.id, name: propName.trim(), description: propDesc.trim()
    });
    if (!error) {
      setPropName(""); setPropDesc(""); setShowPropose(false);
      alert("Vorschlag eingereicht! Admin prüft ihn.");
    }
    setProposing(false);
  };

  useEffect(() => {
    setDir(null); setDragX(0); setCur(0);
    const init = async () => {
      const data = await db.getDishes();
      setDishes(data);
      if (user?.id) {
        const voted = await db.getUserVotes(user.id);
        setUnvoted(data.filter(d => !voted.has(d.id)));
      } else {
        setUnvoted(data);
      }
      setLoading(false);
    };
    init();
  }, []);

  const dish = unvoted[cur];
  const done = cur >= unvoted.length;

  const doVote = async (liked) => {
    if (!dish || dir || voting) return;
    setVoting(true);
    setDir(liked ? "right" : "left");
    if (user?.id) {
      try {
        await db.voteDish(user.id, dish.id, liked);
        if (liked) await db.addPts(user.id, 10);
      } catch (e) { console.error('voteDish error:', e.message); }
    }
    setTimeout(() => { setDir(null); setDragX(0); setCur(i => i+1); setVoting(false); }, 320);
  };

  const cardTransform = dir==="left" ? "translateX(-110%) rotate(-18deg)"
    : dir==="right" ? "translateX(110%) rotate(18deg)"
    : `translateX(${dragX}px) rotate(${dragX*0.035}deg)`;

  if (loading) return <div style={{ textAlign:"center",padding:"40px",color:C.textLight }}>Laden...</div>;

  return (
    <div style={{ padding:"0 16px" }}>
      {!done ? (
        <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
            <div style={{ fontSize:"14px",fontWeight:"700",color:C.text }}>Was kommt auf die Karte?</div>
            <div style={{ fontSize:"13px",color:C.textLight }}>{cur+1}/{unvoted.length}</div>
          </div>
          <div
            onTouchStart={e  => setDragStart(e.touches[0].clientX)}
            onTouchMove={e   => { if(dragStart!==null) setDragX(e.touches[0].clientX-dragStart); }}
            onTouchEnd={()   => { if(Math.abs(dragX)>70) doVote(dragX>0); else setDragX(0); setDragStart(null); }}>
            <div style={{ background:C.card,borderRadius:"20px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.09)",transform:cardTransform,transition:dir?"all 0.32s cubic-bezier(0.4,0,0.2,1)":"none",border:`1px solid ${C.border}` }}>
              <div style={{ height:"220px",background:`linear-gradient(135deg,${C.beige},${C.greyBg})`,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center" }}>
                {dish?.image_url
                  ? <img src={dish.image_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  : <div style={{ opacity:0.25,fontSize:"48px" }}>🍕</div>
                }
                {Math.abs(dragX)>30 && (
                  <div style={{ position:"absolute",inset:0,background:dragX>0?"rgba(45,71,42,0.35)":"rgba(226,74,40,0.35)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <div style={{ fontSize:"64px",color:"white" }}>{dragX>0?"♥":"✕"}</div>
                  </div>
                )}
                <div style={{ position:"absolute",bottom:"10px",right:"12px",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",color:"white",borderRadius:"10px",padding:"3px 10px",fontSize:"12px",fontWeight:"700" }}>
                  {dish?.votes} Votes
                </div>
              </div>
              <div style={{ padding:"16px" }}>
                <div style={{ fontSize:"18px",fontFamily:font.display,fontWeight:"700",color:C.text }}>{dish?.name}</div>
                <div style={{ fontSize:"13px",color:C.textLight,marginTop:"4px",lineHeight:1.5 }}>{dish?.description}</div>
                <div style={{ fontSize:"12px",color:C.orange,fontWeight:"600",marginTop:"8px" }}>+10 CP für deinen Vote</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex",justifyContent:"center",gap:"28px",marginTop:"20px",alignItems:"center" }}>
            <button onClick={() => doVote(false)} style={{ width:"60px",height:"60px",borderRadius:"50%",background:C.card,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",color:C.textSub,boxShadow:"0 4px 16px rgba(0,0,0,0.07)" }}>✕</button>
            <button onClick={() => doVote(true)}  style={{ width:"72px",height:"72px",borderRadius:"50%",background:C.orange,border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",color:"white",boxShadow:`0 6px 24px ${C.orange}55` }}>♥</button>
          </div>
          <div style={{ textAlign:"center",color:C.textLight,fontSize:"11px",marginTop:"12px" }}>Swipe oder Buttons</div>
        </>
      ) : (
        <div style={{ textAlign:"center",padding:"32px 16px" }}>
          <div style={{ fontSize:"40px",marginBottom:"12px" }}>🎉</div>
          <div style={{ fontSize:"18px",fontWeight:"700",color:C.text }}>Alle Gerichte bewertet!</div>
          <div style={{ fontSize:"13px",color:C.textLight,marginTop:"6px" }}>Schau dir die Ergebnisse an</div>
        </div>
      )}

      {/* Gericht vorschlagen — ab Level 5 */}
      {canPropose && (
        <div style={{ marginTop:"16px" }}>
          {!showPropose ? (
            <button onClick={() => setShowPropose(true)}
              style={{ width:"100%",padding:"13px",background:`${C.orange}12`,border:`1px solid ${C.orange}33`,borderRadius:"14px",color:C.orange,fontSize:"14px",fontWeight:"700" }}>
              💡 Gericht vorschlagen
            </button>
          ) : (
            <div style={{ background:C.card,borderRadius:"18px",padding:"16px",border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:"14px",fontWeight:"700",color:C.text,marginBottom:"12px" }}>Gericht vorschlagen</div>
              <input value={propName} onChange={e => setPropName(e.target.value)} placeholder="Name des Gerichts"
                style={{ width:"100%",padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:"12px",fontSize:"15px",outline:"none",boxSizing:"border-box",marginBottom:"8px",background:C.card,color:C.text }}/>
              <input value={propDesc} onChange={e => setPropDesc(e.target.value)} placeholder="Beschreibung (optional)"
                style={{ width:"100%",padding:"12px 14px",border:`1px solid ${C.border}`,borderRadius:"12px",fontSize:"15px",outline:"none",boxSizing:"border-box",marginBottom:"12px",background:C.card,color:C.text }}/>
              <div style={{ display:"flex",gap:"8px" }}>
                <button onClick={submitProposal} disabled={proposing||!propName.trim()}
                  style={{ flex:1,padding:"12px",background:propName.trim()?C.orange:C.greyBg,borderRadius:"12px",color:propName.trim()?C.white:C.textLight,fontSize:"14px",fontWeight:"700" }}>
                  {proposing ? "..." : "Einreichen"}
                </button>
                <button onClick={() => setShowPropose(false)}
                  style={{ padding:"12px 16px",background:C.greyBg,borderRadius:"12px",color:C.textLight,fontSize:"14px" }}>
                  ✕
                </button>
              </div>
              <div style={{ fontSize:"11px",color:C.textLight,marginTop:"8px" }}>Admin prüft deinen Vorschlag</div>
            </div>
          )}
        </div>
      )}
      {!canPropose && (
        <div style={{ marginTop:"12px",textAlign:"center",fontSize:"12px",color:C.textLight }}>
          Ab Level {MIN_LEVEL_PROPOSE} kannst du Gerichte vorschlagen
        </div>
      )}
    </div>
  );
}

// ─── Cinder Ergebnisse ────────────────────────────────────────────
function CinderResults({ user, C, font }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("dishes")
      .select("*, dish_votes(vote, user_id)")
      .eq("active", true)
      .order("id");
    const mapped = (data || []).map(d => {
      const yes = (d.dish_votes||[]).filter(v => v.vote).length;
      const no  = (d.dish_votes||[]).filter(v => !v.vote).length;
      const total = yes + no;
      return { ...d, yes, no, total, pct:total?Math.round((yes/total)*100):0 };
    }).sort((a,b) => b.yes - a.yes);
    setDishes(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("cinder-results-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"dish_votes" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const medals = ["🥇","🥈","🥉"];

  if (loading) return <div style={{ textAlign:"center",padding:"40px",color:C.textLight }}>Laden...</div>;

  return (
    <div style={{ padding:"0 16px" }}>
      <div style={{ fontSize:"13px",color:C.textLight,marginBottom:"14px" }}>Live-Ergebnisse – welches Gericht kommt auf die Karte?</div>
      {dishes.map((d,i) => (
        <div key={d.id} style={{ background:C.card,borderRadius:"18px",padding:"16px",border:`1px solid ${i===0?C.orange:C.border}`,marginBottom:"10px",boxShadow:i===0?`0 4px 20px ${C.orange}22`:"none" }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"12px" }}>
            <div style={{ fontSize:"22px",flexShrink:0 }}>{medals[i]||`#${i+1}`}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:"15px",fontWeight:"700",color:C.text }}>{d.name}</div>
              <div style={{ fontSize:"12px",color:C.textLight,marginTop:"2px" }}>{d.description}</div>
            </div>
            {d.image_url && <img src={d.image_url} style={{ width:"50px",height:"50px",borderRadius:"12px",objectFit:"cover",flexShrink:0 }}/>}
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"6px" }}>
            <div style={{ fontSize:"12px",fontWeight:"700",color:C.green }}>♥ {d.yes}</div>
            <div style={{ fontSize:"12px",fontWeight:"700",color:C.orange }}>{d.pct}%</div>
            <div style={{ fontSize:"12px",color:C.textLight }}>✕ {d.no}</div>
          </div>
          <div style={{ height:"8px",background:C.greyBg,borderRadius:"4px",overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${d.pct}%`,background:i===0?`linear-gradient(90deg,${C.orange},${C.green})`:C.orange,borderRadius:"4px",transition:"width 0.5s" }}/>
          </div>
        </div>
      ))}
      {dishes.length===0 && (
        <div style={{ textAlign:"center",padding:"40px" }}>
          <div style={{ fontSize:"36px" }}>🍕</div>
          <div style={{ fontSize:"15px",fontWeight:"700",color:C.text,marginTop:"8px" }}>Noch keine Gerichte</div>
        </div>
      )}
    </div>
  );
}

// ─── Gedanken ─────────────────────────────────────────────────────
function ThoughtsSection({ user, C, font }) {
  const [thoughts, setThoughts] = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);
  const [myVotes,  setMyVotes]  = useState(new Set());
  const [err,      setErr]      = useState("");
  const MAX = 280;

  const load = async () => {
    const { data } = await supabase.from("thoughts")
      .select("*, profile:user_id(name, avatar_url)")
      .order("upvotes", { ascending:false })
      .order("created_at", { ascending:false })
      .limit(50);
    setThoughts(data || []);
    setLoading(false);
    if (user?.id) {
      const { data:votes } = await supabase.from("thought_votes").select("thought_id").eq("user_id", user.id);
      setMyVotes(new Set((votes||[]).map(v => v.thought_id)));
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("thoughts-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"thoughts" }, load)
      .on("postgres_changes", { event:"*", schema:"public", table:"thought_votes" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const post = async () => {
    setErr("");
    if (!text.trim() || text.trim().length < 2) { setErr("Bitte etwas schreiben."); return; }
    if (hasLink(text)) { setErr("Keine Links erlaubt 🚫"); return; }
    if (text.length > MAX) { setErr(`Max. ${MAX} Zeichen.`); return; }
    if (!user?.id) { setErr("Bitte einloggen."); return; }
    setPosting(true);
    const { error } = await supabase.from("thoughts").insert({ user_id:user.id, text:text.trim(), upvotes:0 });
    if (error) setErr("Fehler: " + error.message);
    else {
      setText(""); load();
      // +10 CP fürs Posten
      await db.addPts(user.id, 10);
    }
    setPosting(false);
  };

  const upvote = async (id) => {
    if (!user?.id) return;
    const already = myVotes.has(id);
    setThoughts(prev => prev.map(t => t.id===id ? { ...t, upvotes:Math.max(0,(t.upvotes||0)+(already?-1:1)) } : t));
    setMyVotes(prev => { const n=new Set(prev); already?n.delete(id):n.add(id); return n; });
    await supabase.rpc("toggle_thought_upvote", { p_thought_id:id, p_user_id:user.id });
  };

  const del = async (id) => {
    await supabase.from("thoughts").delete().eq("id", id).eq("user_id", user.id);
    setThoughts(prev => prev.filter(t => t.id!==id));
  };

  const fmt = ts => {
    const diff = Math.floor((Date.now()-new Date(ts))/1000);
    if (diff < 60) return "Gerade eben";
    if (diff < 3600) return `vor ${Math.floor(diff/60)}m`;
    if (diff < 86400) return `vor ${Math.floor(diff/3600)}h`;
    return new Date(ts).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit" });
  };

  return (
    <div>
      {/* Compose */}
      <div style={{ background:C.card,borderRadius:"18px",padding:"16px",border:`1px solid ${C.border}`,marginBottom:"14px" }}>
        <textarea value={text} onChange={e => { setText(e.target.value); setErr(""); }}
          placeholder="Was denkst du gerade? ✍️" maxLength={MAX+10}
          style={{ width:"100%",minHeight:"72px",padding:"0",border:"none",background:"transparent",fontSize:"15px",color:C.text,outline:"none",resize:"none",fontFamily:font.ui,lineHeight:1.5,boxSizing:"border-box" }}/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"8px" }}>
          <div style={{ fontSize:"11px",color:text.length>MAX?C.orange:C.textLight }}>{text.length}/{MAX}</div>
          {err && <div style={{ fontSize:"12px",color:C.orange,fontWeight:"600" }}>{err}</div>}
          <button onClick={post} disabled={posting||!text.trim()} style={{ padding:"9px 20px",background:text.trim()&&!posting?C.orange:C.greyBg,borderRadius:"20px",color:text.trim()&&!posting?C.white:C.textLight,fontSize:"13px",fontWeight:"700",border:"none",transition:"all 0.2s" }}>
            {posting?"...":"Posten"}
          </button>
        </div>
        <div style={{ fontSize:"10px",color:C.textLight,marginTop:"6px" }}>Keine Links · Respektvoller Umgang</div>
      </div>

      {loading && <div style={{ textAlign:"center",padding:"40px",color:C.textLight }}>Laden...</div>}
      {!loading && thoughts.length===0 && (
        <div style={{ textAlign:"center",padding:"40px" }}>
          <div style={{ fontSize:"36px",marginBottom:"8px" }}>💭</div>
          <div style={{ fontSize:"15px",fontWeight:"700",color:C.text }}>Noch keine Gedanken</div>
        </div>
      )}

      {thoughts.map((t,i) => {
        const voted = myVotes.has(t.id);
        const isOwn = t.user_id===user?.id;
        return (
          <div key={t.id} style={{ background:C.card,borderRadius:"18px",padding:"16px",border:`1px solid ${i===0&&t.upvotes>0?C.orange+"44":C.border}`,marginBottom:"8px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px" }}>
              <div style={{ width:"34px",height:"34px",borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",color:C.white,fontWeight:"700",flexShrink:0 }}>
                {(t.profile?.name||"?")[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"13px",fontWeight:"700",color:C.text }}>@{t.profile?.name||"user"}</div>
                <div style={{ fontSize:"11px",color:C.textLight }}>{fmt(t.created_at)}</div>
              </div>
              {i===0&&t.upvotes>2&&<div style={{ fontSize:"10px",fontWeight:"700",color:C.orange,background:`${C.orange}18`,padding:"3px 8px",borderRadius:"8px" }}>🔥 Trend</div>}
              {isOwn&&<button onClick={() => del(t.id)} style={{ background:"none",border:"none",color:C.textLight,fontSize:"16px",cursor:"pointer",padding:"4px" }}>✕</button>}
            </div>
            <div style={{ fontSize:"15px",color:C.text,lineHeight:1.55,marginBottom:"12px",wordBreak:"break-word" }}>{t.text}</div>
            <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
              <button onClick={() => upvote(t.id)} style={{ display:"flex",alignItems:"center",gap:"6px",padding:"8px 16px",borderRadius:"20px",border:"none",background:voted?C.orange:C.greyBg,color:voted?C.white:C.textSub,fontSize:"13px",fontWeight:"700",cursor:"pointer",transition:"all 0.2s" }}>
                <span>{voted?"♥":"♡"}</span><span>{t.upvotes||0}</span>
              </button>
              <button onClick={async() => { await shareAsStory("thought", t, t.profile?.name||"user"); }}
                style={{ display:"flex",alignItems:"center",gap:"5px",padding:"8px 14px",borderRadius:"20px",border:"none",background:C.greyBg,color:C.textSub,fontSize:"12px",fontWeight:"600",cursor:"pointer" }}>
                ↗ Story
              </button>
            </div>
          </div>
        );
      })}
      <div style={{ height:"8px" }}/>
    </div>
  );
}
