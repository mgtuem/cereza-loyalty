// src/FamTab.jsx
// Fam Community Tab – Vibes, Cinder Results, Visit Mood, Thoughts
import { useState, useEffect, useRef } from "react";
import supabase from "./supabase";

// ─── Shared design tokens (injected via window.C + window.font) ──
// Die Komponente liest C und font aus dem globalen Scope der App.
// Falls du sie standalone verwendest, setze diese vor dem Import.

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|\.[a-z]{2,}\/[^\s]*/gi;

const hasLink = (text) => URL_REGEX.test(text);

// ─── FamTab ──────────────────────────────────────────────────────
export default function FamTab({ user, C, font }) {
  const ST = "env(safe-area-inset-top,0px)";
  const [section, setSection] = useState("vibes"); // vibes | cinder | today | thoughts

  return (
    <div style={{ background: C.beige, minHeight: "100%", paddingBottom: "24px" }}>
      {/* Header */}
      <div style={{
        padding: `calc(${ST} + 18px) 20px 14px`,
        background: C.beige,
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, fontWeight: "600", textTransform: "uppercase" }}>Community</div>
        <div style={{ fontSize: "28px", fontFamily: font.display, color: C.text, fontWeight: "700", marginTop: "2px" }}>The Fam</div>
      </div>

      {/* Section Tabs */}
      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ display: "flex", gap: "4px", background: C.greyBg, borderRadius: "14px", padding: "3px" }}>
          {[
            { id: "vibes", l: "Vibes" },
            { id: "cinder", l: "Cinder" },
            { id: "today", l: "Heute" },
            { id: "thoughts", l: "Gedanken" },
          ].map(s => (
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

      {section === "vibes"    && <VibesSection user={user} C={C} font={font} />}
      {section === "cinder"   && <CinderSection user={user} C={C} font={font} />}
      {section === "today"    && <TodaySection user={user} C={C} font={font} />}
      {section === "thoughts" && <ThoughtsSection user={user} C={C} font={font} />}
    </div>
  );
}

// ─── Vibes Section ───────────────────────────────────────────────
function VibesSection({ user, C, font }) {
  const [vibes, setVibes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
    const ch = supabase.channel("vibes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "vibe_photos" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const upload = async (file) => {
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `vibes/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vibes").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        // Fallback: avatars bucket
        const { error: upErr2 } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
        if (upErr2) { alert("Upload fehlgeschlagen"); setUploading(false); return; }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("vibe_photos").insert({ user_id: user.id, url: urlData.publicUrl, approved: false });
      } else {
        const { data: urlData } = supabase.storage.from("vibes").getPublicUrl(path);
        await supabase.from("vibe_photos").insert({ user_id: user.id, url: urlData.publicUrl, approved: false });
      }
      alert("Hochgeladen! Wird nach Freigabe durch den Admin sichtbar.");
    } catch (e) {
      alert("Fehler: " + e.message);
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Upload Button */}
      <label style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        width: "100%", padding: "13px", background: C.orange, border: "none",
        borderRadius: "14px", color: C.white, fontSize: "14px", fontWeight: "700",
        cursor: "pointer", marginBottom: "14px", boxSizing: "border-box",
        opacity: uploading ? 0.7 : 1,
      }}>
        {uploading ? "Wird hochgeladen..." : "📷 Vibe hochladen"}
        <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} disabled={uploading} />
      </label>

      {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Wird geladen...</div>}
      {!loading && vibes.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>📷</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Noch keine Vibes</div>
          <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px" }}>Lade das erste Bild hoch!</div>
        </div>
      )}

      {/* Masonry-style Grid */}
      <div style={{ columns: "2", columnGap: "8px" }}>
        {vibes.map((v, i) => (
          <div key={v.id} style={{ breakInside: "avoid", marginBottom: "8px", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
            <img
              src={v.url}
              style={{ width: "100%", display: "block", filter: "sepia(0.25) contrast(1.08) saturate(0.95)" }}
              loading="lazy"
            />
            {/* Author Badge */}
            <div style={{
              position: "absolute", bottom: "8px", left: "8px",
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
              borderRadius: "20px", padding: "3px 8px",
              display: "flex", alignItems: "center", gap: "5px",
            }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: C.white, fontWeight: "700" }}>
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

// ─── Cinder Results Section ──────────────────────────────────────
function CinderSection({ user, C, font }) {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myVotes, setMyVotes] = useState({});

  const load = async () => {
    const { data: d } = await supabase
      .from("dishes")
      .select("*, dish_votes(vote, user_id)")
      .eq("active", true)
      .order("id");

    const mapped = (d || []).map(dish => {
      const yes = (dish.dish_votes || []).filter(v => v.vote).length;
      const no = (dish.dish_votes || []).filter(v => !v.vote).length;
      const total = yes + no;
      const myVote = (dish.dish_votes || []).find(v => v.user_id === user?.id);
      return { ...dish, yes, no, total, pct: total ? Math.round((yes / total) * 100) : 0, myVote: myVote?.vote };
    });

    // Sortiert nach Beliebtheit
    mapped.sort((a, b) => b.yes - a.yes);
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
      <div style={{ fontSize: "12px", color: C.textLight, marginBottom: "14px", lineHeight: 1.5 }}>
        Live-Ergebnisse der Community-Votings – welches Gericht kommt auf die Karte?
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Wird geladen...</div>}

      {dishes.map((d, i) => (
        <div key={d.id} style={{
          background: C.card, borderRadius: "18px", padding: "16px",
          border: `1px solid ${i === 0 ? C.orange : C.border}`,
          marginBottom: "10px",
          boxShadow: i === 0 ? `0 4px 20px ${C.orange}22` : "none",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
            <div style={{ fontSize: "22px", flexShrink: 0 }}>{medals[i] || `#${i + 1}`}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>{d.name}</div>
              <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>{d.description}</div>
            </div>
            {d.image_url && (
              <img src={d.image_url} style={{ width: "52px", height: "52px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }} />
            )}
          </div>

          {/* Vote Bar */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: C.green }}>♥ {d.yes} Likes</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: C.orange }}>{d.pct}%</div>
              <div style={{ fontSize: "12px", color: C.textLight }}>✕ {d.no} Nope</div>
            </div>
            <div style={{ height: "8px", background: C.greyBg, borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${d.pct}%`,
                background: i === 0
                  ? `linear-gradient(90deg, ${C.orange}, ${C.green})`
                  : C.orange,
                borderRadius: "4px", transition: "width 0.5s",
              }} />
            </div>
          </div>

          {/* My vote badge */}
          {d.myVote !== undefined && (
            <div style={{ fontSize: "11px", color: C.textLight }}>
              Dein Vote: <span style={{ color: d.myVote ? C.green : C.orange, fontWeight: "600" }}>{d.myVote ? "♥ Liked" : "✕ Gepasst"}</span>
            </div>
          )}
          {d.total === 0 && <div style={{ fontSize: "12px", color: C.textLight }}>Noch keine Votes</div>}
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

// ─── Today / Visit Section ───────────────────────────────────────
function TodaySection({ user, C, font }) {
  const [stats, setStats] = useState({ yes: 0, no: 0, names: [] });
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    const { data } = await supabase
      .from("visit_intentions")
      .select("status, profile:user_id(name, avatar_url)")
      .eq("planned_date", today);

    const yes = (data || []).filter(d => d.status === "planned");
    const no = (data || []).filter(d => d.status === "not");
    setStats({ yes: yes.length, no: no.length, names: yes.map(d => d.profile) });
    setLoading(false);
  };

  const loadMy = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("visit_intentions")
      .select("status")
      .eq("user_id", user.id)
      .eq("planned_date", today)
      .single();
    if (data) setMyStatus(data.status);
  };

  useEffect(() => {
    load();
    loadMy();
    const ch = supabase.channel("today-fam-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "visit_intentions" }, () => { load(); loadMy(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const setVisit = async (status) => {
    setMyStatus(status);
    await supabase.from("visit_intentions").upsert({ user_id: user.id, planned_date: today, status });
    load();
  };

  const total = stats.yes + stats.no;
  const pct = total ? Math.round((stats.yes / total) * 100) : 0;

  // Mood berechnen
  const getMood = () => {
    if (stats.yes >= 8) return { emoji: "🎉", title: "Cereza Party!", sub: `${stats.yes} Leute kommen heute – wird ein Abend!`, color: C.orange };
    if (stats.yes >= 5) return { emoji: "🔥", title: "Voller Laden heute!", sub: `${stats.yes} aus der Family kommen vorbei`, color: C.orange };
    if (stats.yes >= 3) return { emoji: "👋", title: "Wir freuen uns auf euch!", sub: `${stats.yes} Mitglieder kommen heute`, color: C.green };
    if (stats.yes === 2) return { emoji: "🤝", title: "Ein gemütlicher Abend", sub: "Zu zweit macht's auch Spaß", color: C.green };
    if (stats.yes === 1) return { emoji: "☕", title: "Stille Stunde", sub: "Perfekt für dich allein", color: C.textSub };
    if (total === 0) return { emoji: "🌙", title: "Noch keine Votes", sub: "Sei der Erste!", color: C.textLight };
    return { emoji: "🌿", title: "Ruhiger Tag", sub: "Chill-Atmosphäre garantiert", color: C.green };
  };

  const mood = getMood();

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Mood Card */}
      <div style={{
        background: `linear-gradient(135deg, ${mood.color}22, ${C.card})`,
        border: `1.5px solid ${mood.color}44`,
        borderRadius: "20px", padding: "24px 20px",
        marginBottom: "14px", textAlign: "center",
      }}>
        <div style={{ fontSize: "52px", marginBottom: "10px" }}>{mood.emoji}</div>
        <div style={{ fontSize: "22px", fontFamily: font.display, fontWeight: "700", color: C.text }}>{mood.title}</div>
        <div style={{ fontSize: "14px", color: C.textSub, marginTop: "6px" }}>{mood.sub}</div>

        {/* Progress Bar */}
        {total > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ fontSize: "12px", color: C.green, fontWeight: "700" }}>✓ {stats.yes} kommen</div>
              <div style={{ fontSize: "12px", color: C.textLight }}>✕ {stats.no} nicht</div>
            </div>
            <div style={{ height: "10px", background: C.greyBg, borderRadius: "5px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}, ${C.orange})`, borderRadius: "5px", transition: "width 0.6s" }} />
            </div>
            <div style={{ fontSize: "11px", color: C.textLight, marginTop: "6px" }}>{pct}% kommen heute</div>
          </div>
        )}
      </div>

      {/* Dein Vote */}
      <div style={{ background: C.card, borderRadius: "18px", padding: "16px", border: `1px solid ${C.border}`, marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", color: C.text, marginBottom: "12px" }}>Kommst du heute?</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { v: "planned", l: "Ja, ich komme! 🙌", color: C.green },
            { v: "not", l: "Nicht heute 😴", color: C.greyBg },
          ].map(o => (
            <button key={o.v} onClick={() => setVisit(o.v)} style={{
              flex: 1, padding: "12px 8px", borderRadius: "12px", border: "none",
              background: myStatus === o.v ? o.color : C.greyBg,
              color: myStatus === o.v ? (o.v === "not" ? C.text : C.white) : C.textLight,
              fontSize: "13px", fontWeight: "700", transition: "all 0.2s", cursor: "pointer",
            }}>{o.l}</button>
          ))}
        </div>
        {myStatus === "planned" && (
          <div style={{ marginTop: "10px", padding: "10px 14px", background: `${C.green}18`, borderRadius: "12px", fontSize: "13px", color: C.green, fontWeight: "600", textAlign: "center" }}>
            🙌 Wir freuen uns auf dich!
          </div>
        )}
        {myStatus === "not" && (
          <div style={{ marginTop: "10px", padding: "10px 14px", background: C.greyBg, borderRadius: "12px", fontSize: "13px", color: C.textSub, textAlign: "center" }}>
            Schade! Nächstes Mal 🍕
          </div>
        )}
      </div>

      {/* Wer kommt */}
      {stats.names.length > 0 && (
        <div style={{ background: C.card, borderRadius: "18px", padding: "16px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, marginBottom: "12px" }}>
            Kommen heute ({stats.yes})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {stats.names.filter(Boolean).map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", background: C.greyBg, borderRadius: "20px", padding: "5px 10px" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: C.white, fontWeight: "700" }}>
                  {(p?.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: C.text }}>@{p?.name || "User"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Thoughts Section ─────────────────────────────────────────────
function ThoughtsSection({ user, C, font }) {
  const [thoughts, setThoughts] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [myVotes, setMyVotes] = useState(new Set());
  const [err, setErr] = useState("");
  const MAX = 280;

  const load = async () => {
    const { data } = await supabase
      .from("thoughts")
      .select("*, profile:user_id(name, avatar_url)")
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setThoughts(data || []);
    setLoading(false);

    if (user?.id) {
      const { data: votes } = await supabase
        .from("thought_votes")
        .select("thought_id")
        .eq("user_id", user.id);
      setMyVotes(new Set((votes || []).map(v => v.thought_id)));
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("thoughts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "thoughts" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "thought_votes" }, async () => {
        if (user?.id) {
          const { data: votes } = await supabase.from("thought_votes").select("thought_id").eq("user_id", user.id);
          setMyVotes(new Set((votes || []).map(v => v.thought_id)));
        }
      })
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
    if (error) { setErr("Fehler: " + error.message); }
    else { setText(""); load(); }
    setPosting(false);
  };

  const upvote = async (thoughtId) => {
    if (!user?.id) return;
    const already = myVotes.has(thoughtId);

    // Optimistic update
    setThoughts(prev => prev.map(t => t.id === thoughtId
      ? { ...t, upvotes: Math.max(0, (t.upvotes || 0) + (already ? -1 : 1)) }
      : t
    ));
    setMyVotes(prev => {
      const next = new Set(prev);
      already ? next.delete(thoughtId) : next.add(thoughtId);
      return next;
    });

    // DB update via RPC
    await supabase.rpc("toggle_thought_upvote", { p_thought_id: thoughtId, p_user_id: user.id });
  };

  const deleteThought = async (thoughtId) => {
    await supabase.from("thoughts").delete().eq("id", thoughtId).eq("user_id", user.id);
    setThoughts(prev => prev.filter(t => t.id !== thoughtId));
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "Gerade eben";
    if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div style={{ padding: "0 16px" }}>
      {/* Compose Box */}
      <div style={{ background: C.card, borderRadius: "18px", padding: "16px", border: `1px solid ${C.border}`, marginBottom: "14px" }}>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setErr(""); }}
          placeholder="Was denkst du gerade? ✍️"
          maxLength={MAX + 10}
          style={{
            width: "100%", minHeight: "80px", padding: "0", border: "none",
            background: "transparent", fontSize: "15px", color: C.text,
            outline: "none", resize: "none", fontFamily: font.ui, lineHeight: 1.5,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: text.length > MAX ? C.orange : C.textLight }}>
            {text.length}/{MAX}
          </div>
          {err && <div style={{ fontSize: "12px", color: C.orange, fontWeight: "600" }}>{err}</div>}
          <button onClick={post} disabled={posting || !text.trim()} style={{
            padding: "9px 20px", background: text.trim() && !posting ? C.orange : C.greyBg,
            borderRadius: "20px", color: text.trim() && !posting ? C.white : C.textLight,
            fontSize: "13px", fontWeight: "700", border: "none",
            transition: "all 0.2s", cursor: text.trim() ? "pointer" : "not-allowed",
          }}>
            {posting ? "..." : "Posten"}
          </button>
        </div>
        <div style={{ fontSize: "10px", color: C.textLight, marginTop: "6px" }}>
          Keine Links · Respektvoller Umgang
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: "40px", color: C.textLight }}>Wird geladen...</div>}

      {!loading && thoughts.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>💭</div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>Noch keine Gedanken</div>
          <div style={{ fontSize: "13px", color: C.textLight, marginTop: "4px" }}>Teile dein erstes Gedanken!</div>
        </div>
      )}

      {thoughts.map((t, i) => {
        const voted = myVotes.has(t.id);
        const isOwn = t.user_id === user?.id;

        return (
          <div key={t.id} style={{
            background: C.card, borderRadius: "18px", padding: "16px",
            border: `1px solid ${i === 0 && t.upvotes > 0 ? C.orange + "44" : C.border}`,
            marginBottom: "8px", animation: "fadeUp 0.3s ease",
          }}>
            {/* Author */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: C.white, fontWeight: "700", flexShrink: 0 }}>
                {(t.profile?.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>@{t.profile?.name || "user"}</div>
                <div style={{ fontSize: "11px", color: C.textLight }}>{formatTime(t.created_at)}</div>
              </div>
              {i === 0 && t.upvotes > 2 && (
                <div style={{ fontSize: "10px", fontWeight: "700", color: C.orange, background: `${C.orange}18`, padding: "3px 8px", borderRadius: "8px" }}>🔥 Trend</div>
              )}
              {isOwn && (
                <button onClick={() => deleteThought(t.id)} style={{ background: "none", border: "none", color: C.textLight, fontSize: "16px", cursor: "pointer", padding: "4px" }}>✕</button>
              )}
            </div>

            {/* Text */}
            <div style={{ fontSize: "15px", color: C.text, lineHeight: 1.55, marginBottom: "12px", wordBreak: "break-word" }}>
              {t.text}
            </div>

            {/* Upvote */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => upvote(t.id)} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", borderRadius: "20px", border: "none",
                background: voted ? C.orange : C.greyBg,
                color: voted ? C.white : C.textSub,
                fontSize: "13px", fontWeight: "700", cursor: "pointer",
                transition: "all 0.2s", transform: voted ? "scale(1.05)" : "scale(1)",
              }}>
                <span>{voted ? "♥" : "♡"}</span>
                <span>{t.upvotes || 0}</span>
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ height: "8px" }} />
    </div>
  );
}
