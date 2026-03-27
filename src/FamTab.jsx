// src/FamTab.jsx
import { useState, useEffect } from "react";
import supabase from "./supabase";

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|\b\w+\.(com|de|net|org|io|at|ch)\b/gi;
const hasLink = (text) => URL_REGEX.test(text);

export default function FamTab({ user, C, font }) {
  const ST = "env(safe-area-inset-top,0px)";
  const [section, setSection] = useState("vibes");

  return (
    <div style={{ background: C.beige, minHeight: "100%", paddingBottom: "24px" }}>
      <div style={{ padding: `calc(${ST} + 18px) 20px 14px` }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, fontWeight: "600", textTransform: "uppercase" }}>Community</div>
        <div style={{ fontSize: "28px", fontFamily: font.display, color: C.text, fontWeight: "700", marginTop: "2px" }}>The Fam</div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "flex", gap: "4px", background: C.greyBg, borderRadius: "14px", padding: "3px" }}>
          {[{id:"vibes",l:"Vibes"},{id:"cinder",l:"Cinder"},{id:"today",l:"Heute"},{id:"thoughts",l:"Gedanken"}].map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              flex: 1, padding: "9px 2px", borderRadius: "11px",
              background: section === s.id ? C.card : "transparent",
              color: section === s.id ? C.text : C.textLight,
              fontSize: "11px", fontWeight: section === s.id ? "700" : "500",
              border: "none", transition: "all 0.2s", cursor: "pointer",
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {section === "vibes"    && <VibesSection    user={user} C={C} font={font} />}
      {section === "cinder"   && <CinderSection   user={user} C={C} font={font} />}
      {section === "today"    && <TodaySection    user={user} C={C} font={font} />}
      {section === "thoughts" && <ThoughtsSection user={user} C={C} font={font} />}
    </div>
  );
}

// ─── Vibes ───────────────────────────────────────────────────────
function VibesSection({ user, C, font }) {
  const [vibes, setVibes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("vibe_photos")
      .select("*, profile:user_id(name, avatar_url)")
      .eq("approved", true)
      .order("created_at", { ascending: false });
    setVibes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("vibes-fam-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_photos" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const upload = async (file) => {
    if (!file || !user?.id) { setErr("Bitte einloggen"); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("Bild zu groß (max 10MB)"); return; }
    setErr("");
    setUploading(true);

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = `vibes/${user.id}_${Date.now()}.${ext}`;

      // Upload in avatars bucket (existiert garantiert)
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(safeName, file, { upsert: false, contentType: file.type || 'image/jpeg' });

      if (upErr) {
        console.error('Upload error:', upErr);
        setErr("Upload fehlgeschlagen: " + upErr.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(safeName);
      const url = urlData.publicUrl + '?t=' + Date.now();

      const { error: dbErr } = await supabase.from('vibe_photos').insert({
        user_id: user.id,
        url,
        approved: false,
      });

      if (dbErr) { setErr("Fehler beim Speichern: " + dbErr.message); }
      else { setErr(""); alert("Hochgeladen! Wird nach Admin-Freigabe sichtbar."); }
    } catch (e) {
      setErr("Fehler: " + e.message);
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        width: "100%", padding: "13px", background: uploading ? C.greyBg : C.orange,
        borderRadius: "14px", color: uploading ? C.textLight : C.white,
        fontSize: "14px", fontWeight: "700", cursor: uploading ? "not-allowed" : "pointer",
        marginBottom: err ? "8px" : "14px", boxSizing: "border-box",
      }}>
        {uploading ? "Wird hochgeladen..." : "📷 Vibe hochladen"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{ display: "none" }}
          disabled={uploading}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </label>
      {err && <div style={{ color: C.orange, fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>{err}</div>}

      {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Laden...</div>}
      {!loading && vibes.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>📷</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Noch keine Vibes</div>
          <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px" }}>Lade das erste Bild hoch!</div>
        </div>
      )}

      <div style={{ columns: "2", columnGap: "8px" }}>
        {vibes.map(v => (
          <div key={v.id} style={{ breakInside: "avoid", marginBottom: "8px", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
            <img src={v.url} style={{ width: "100%", display: "block", filter: "sepia(0.2) contrast(1.06) saturate(0.95)" }} loading="lazy" />
            <div style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", borderRadius: "20px", padding: "3px 9px", display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "#fff", fontWeight: "700" }}>
                {(v.profile?.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ fontSize: "10px", color: "#fff", fontWeight: "600" }}>@{v.profile?.name || "anon"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cinder Results ───────────────────────────────────────────────
function CinderSection({ user, C, font }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("dishes")
      .select("*, dish_votes(vote, user_id)")
      .eq("active", true)
      .order("id");
    const mapped = (data || []).map(d => {
      const yes = (d.dish_votes || []).filter(v => v.vote).length;
      const no  = (d.dish_votes || []).filter(v => !v.vote).length;
      const total = yes + no;
      const myVote = (d.dish_votes || []).find(v => v.user_id === user?.id);
      return { ...d, yes, no, total, pct: total ? Math.round((yes / total) * 100) : 0, myVote: myVote?.vote };
    }).sort((a, b) => b.yes - a.yes);
    setDishes(mapped);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("cinder-fam-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "dish_votes" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ fontSize: "13px", color: C.textLight, marginBottom: "14px", lineHeight: 1.5 }}>
        Live-Ergebnisse – welches Gericht kommt auf die Karte?
      </div>
      {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Laden...</div>}
      {dishes.map((d, i) => (
        <div key={d.id} style={{ background: C.card, borderRadius: "18px", padding: "16px", border: `1px solid ${i===0?C.orange:C.border}`, marginBottom: "10px", boxShadow: i===0?`0 4px 20px ${C.orange}22`:"none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
            <div style={{ fontSize: "22px", flexShrink: 0 }}>{medals[i] || `#${i+1}`}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>{d.name}</div>
              <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>{d.description}</div>
            </div>
            {d.image_url && <img src={d.image_url} style={{ width: "50px", height: "50px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }} />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: C.green }}>♥ {d.yes}</div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: C.orange }}>{d.pct}%</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>✕ {d.no}</div>
          </div>
          <div style={{ height: "8px", background: C.greyBg, borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${d.pct}%`, background: i===0?`linear-gradient(90deg,${C.orange},${C.green})`:C.orange, borderRadius: "4px", transition: "width 0.5s" }} />
          </div>
          {d.myVote !== undefined && (
            <div style={{ fontSize: "11px", color: C.textLight, marginTop: "8px" }}>
              Dein Vote: <span style={{ color: d.myVote?C.green:C.orange, fontWeight: "600" }}>{d.myVote?"♥ Liked":"✕ Gepasst"}</span>
            </div>
          )}
        </div>
      ))}
      {!loading && dishes.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "36px" }}>🍕</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginTop: "8px" }}>Noch keine Gerichte</div>
        </div>
      )}
    </div>
  );
}

// ─── Today / Visit ────────────────────────────────────────────────
// #6: Keine Zahlen, nur Vibe/Indicator. Antwort wird für den Tag gespeichert.
function TodaySection({ user, C, font }) {
  const [myStatus, setMyStatus] = useState(null);
  const [vibe, setVibe] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  const computeVibe = (yes, no) => {
    const total = yes + no;
    if (total === 0) return { emoji: "🌙", title: "Noch niemand abgestimmt", sub: "Sei der Erste!", color: C.textLight };
    const pct = yes / total;
    if (yes >= 8) return { emoji: "🎉", title: "Cereza Party!", sub: "Es wird ein voller Abend!", color: C.orange };
    if (yes >= 5) return { emoji: "🔥", title: "Heute brennt's!", sub: "Die Fam kommt zusammen", color: C.orange };
    if (yes >= 3) return { emoji: "👋", title: "Schöner Abend wird's!", sub: "Einige aus der Family kommen", color: C.green };
    if (yes === 2) return { emoji: "🤝", title: "Gemütliche Runde", sub: "Klein aber fein", color: C.green };
    if (yes === 1) return { emoji: "☕", title: "Stille Stunde", sub: "Ruhige Atmosphäre heute", color: C.textSub };
    if (pct < 0.3 && total >= 3) return { emoji: "🌿", title: "Ruhiger Tag", sub: "Chill-Vibe garantiert", color: C.green };
    return { emoji: "✨", title: "Mal sehen...", sub: "Die Stimmung entwickelt sich noch", color: C.textSub };
  };

  const loadAll = async () => {
    // Eigene Antwort
    if (user?.id) {
      const { data } = await supabase.from("visit_intentions")
        .select("status").eq("user_id", user.id).eq("planned_date", today).single();
      if (data) setMyStatus(data.status);
    }
    // Statistik für Vibe (nur Anzahl, keine Namen)
    const { data: stats } = await supabase.from("visit_intentions")
      .select("status").eq("planned_date", today);
    const yes = (stats || []).filter(d => d.status === "planned").length;
    const no  = (stats || []).filter(d => d.status === "not").length;
    setVibe(computeVibe(yes, no));
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase.channel("today-fam-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "visit_intentions" }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const setVisit = async (status) => {
    setMyStatus(status);
    if (user?.id) {
      await supabase.from("visit_intentions").upsert({ user_id: user.id, planned_date: today, status });
      loadAll();
    }
  };

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Vibe Card */}
      {vibe && (
        <div style={{
          background: `linear-gradient(135deg,${vibe.color}18,${C.card})`,
          border: `1.5px solid ${vibe.color}44`,
          borderRadius: "20px", padding: "28px 20px",
          marginBottom: "14px", textAlign: "center",
          animation: "fadeUp 0.4s ease",
        }}>
          <div style={{ fontSize: "56px", marginBottom: "12px" }}>{vibe.emoji}</div>
          <div style={{ fontSize: "22px", fontFamily: font.display, fontWeight: "700", color: C.text }}>{vibe.title}</div>
          <div style={{ fontSize: "14px", color: C.textSub, marginTop: "6px" }}>{vibe.sub}</div>
        </div>
      )}

      {/* Dein Vote */}
      <div style={{ background: C.card, borderRadius: "18px", padding: "18px", border: `1px solid ${C.border}`, marginBottom: "14px" }}>
        <div style={{ fontSize: "15px", fontWeight: "700", color: C.text, marginBottom: "14px" }}>Kommst du heute?</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { v: "planned", l: "Ja, ich komme! 🙌" },
            { v: "not",     l: "Nicht heute 😴" },
          ].map(o => (
            <button key={o.v} onClick={() => setVisit(o.v)} style={{
              flex: 1, padding: "13px 8px", borderRadius: "13px", border: "none",
              background: myStatus === o.v ? C.orange : C.greyBg,
              color: myStatus === o.v ? C.white : C.textLight,
              fontSize: "13px", fontWeight: "700", transition: "all 0.25s", cursor: "pointer",
            }}>{o.l}</button>
          ))}
        </div>

        {/* Feedback nach Abstimmung */}
        {myStatus === "planned" && (
          <div style={{ marginTop: "12px", padding: "12px 16px", background: `${C.green}18`, borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", marginBottom: "4px" }}>🙌</div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: C.green }}>Wir freuen uns auf dich!</div>
            <div style={{ fontSize: "12px", color: C.textSub, marginTop: "3px" }}>Bis heute Abend!</div>
          </div>
        )}
        {myStatus === "not" && (
          <div style={{ marginTop: "12px", padding: "12px 16px", background: C.greyBg, borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", marginBottom: "4px" }}>🌙</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: C.textSub }}>Schade! Nächstes Mal 🍕</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Thoughts ─────────────────────────────────────────────────────
function ThoughtsSection({ user, C, font }) {
  const [thoughts, setThoughts] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [myVotes, setMyVotes] = useState(new Set());
  const [err, setErr] = useState("");
  const MAX = 280;

  const load = async () => {
    const { data } = await supabase.from("thoughts")
      .select("*, profile:user_id(name, avatar_url)")
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setThoughts(data || []);
    setLoading(false);
    if (user?.id) {
      const { data: votes } = await supabase.from("thought_votes").select("thought_id").eq("user_id", user.id);
      setMyVotes(new Set((votes || []).map(v => v.thought_id)));
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("thoughts-fam-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "thoughts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "thought_votes" }, load)
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
    const { error } = await supabase.from("thoughts").insert({ user_id: user.id, text: text.trim(), upvotes: 0 });
    if (error) setErr("Fehler: " + error.message);
    else { setText(""); load(); }
    setPosting(false);
  };

  const upvote = async (id) => {
    if (!user?.id) return;
    const already = myVotes.has(id);
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, upvotes: Math.max(0, (t.upvotes||0) + (already?-1:1)) } : t));
    setMyVotes(prev => { const n=new Set(prev); already?n.delete(id):n.add(id); return n; });
    await supabase.rpc("toggle_thought_upvote", { p_thought_id: id, p_user_id: user.id });
  };

  const del = async (id) => {
    await supabase.from("thoughts").delete().eq("id", id).eq("user_id", user.id);
    setThoughts(prev => prev.filter(t => t.id !== id));
  };

  const fmt = ts => {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return "Gerade eben";
    if (diff < 3600) return `vor ${Math.floor(diff/60)}m`;
    if (diff < 86400) return `vor ${Math.floor(diff/3600)}h`;
    return new Date(ts).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit" });
  };

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Compose */}
      <div style={{ background: C.card, borderRadius: "18px", padding: "16px", border: `1px solid ${C.border}`, marginBottom: "14px" }}>
        <textarea value={text} onChange={e => { setText(e.target.value); setErr(""); }}
          placeholder="Was denkst du gerade? ✍️" maxLength={MAX+10}
          style={{ width:"100%", minHeight:"72px", padding:"0", border:"none", background:"transparent", fontSize:"15px", color:C.text, outline:"none", resize:"none", fontFamily:font.ui, lineHeight:1.5, boxSizing:"border-box" }}
        />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"8px" }}>
          <div style={{ fontSize:"11px", color:text.length>MAX?C.orange:C.textLight }}>{text.length}/{MAX}</div>
          {err && <div style={{ fontSize:"12px", color:C.orange, fontWeight:"600" }}>{err}</div>}
          <button onClick={post} disabled={posting||!text.trim()} style={{ padding:"9px 20px", background:text.trim()&&!posting?C.orange:C.greyBg, borderRadius:"20px", color:text.trim()&&!posting?C.white:C.textLight, fontSize:"13px", fontWeight:"700", border:"none", cursor:text.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
            {posting?"...":"Posten"}
          </button>
        </div>
        <div style={{ fontSize:"10px", color:C.textLight, marginTop:"6px" }}>Keine Links · Respektvoller Umgang</div>
      </div>

      {loading && <div style={{ textAlign:"center", padding:"40px", color:C.textLight }}>Laden...</div>}
      {!loading && thoughts.length===0 && (
        <div style={{ textAlign:"center", padding:"40px" }}>
          <div style={{ fontSize:"36px", marginBottom:"8px" }}>💭</div>
          <div style={{ fontSize:"15px", fontWeight:"700", color:C.text }}>Noch keine Gedanken</div>
          <div style={{ fontSize:"13px", color:C.textLight, marginTop:"4px" }}>Sei der Erste!</div>
        </div>
      )}

      {thoughts.map((t, i) => {
        const voted = myVotes.has(t.id);
        const isOwn = t.user_id === user?.id;
        return (
          <div key={t.id} style={{ background:C.card, borderRadius:"18px", padding:"16px", border:`1px solid ${i===0&&t.upvotes>0?C.orange+"44":C.border}`, marginBottom:"8px", animation:"fadeUp 0.3s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
              <div style={{ width:"34px", height:"34px", borderRadius:"50%", background:C.orange, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:C.white, fontWeight:"700", flexShrink:0 }}>
                {(t.profile?.name||"?")[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"13px", fontWeight:"700", color:C.text }}>@{t.profile?.name||"user"}</div>
                <div style={{ fontSize:"11px", color:C.textLight }}>{fmt(t.created_at)}</div>
              </div>
              {i===0&&t.upvotes>2&&<div style={{ fontSize:"10px", fontWeight:"700", color:C.orange, background:`${C.orange}18`, padding:"3px 8px", borderRadius:"8px" }}>🔥 Trend</div>}
              {isOwn&&<button onClick={()=>del(t.id)} style={{ background:"none", border:"none", color:C.textLight, fontSize:"16px", cursor:"pointer", padding:"4px" }}>✕</button>}
            </div>
            <div style={{ fontSize:"15px", color:C.text, lineHeight:1.55, marginBottom:"12px", wordBreak:"break-word" }}>{t.text}</div>
            <button onClick={()=>upvote(t.id)} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 16px", borderRadius:"20px", border:"none", background:voted?C.orange:C.greyBg, color:voted?C.white:C.textSub, fontSize:"13px", fontWeight:"700", cursor:"pointer", transition:"all 0.2s", transform:voted?"scale(1.04)":"scale(1)" }}>
              <span>{voted?"♥":"♡"}</span><span>{t.upvotes||0}</span>
            </button>
          </div>
        );
      })}
      <div style={{ height:"8px" }} />
    </div>
  );
}
