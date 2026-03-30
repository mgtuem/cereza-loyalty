import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lmspocokowitbbtixugs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtc3BvY29rb3dpdGJidGl4dWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTY1NjcsImV4cCI6MjA5MDAzMjU2N30.8tZUt5a7dwexQUv91zeaTjsAmNfBVhU5gOMU1e5XjG4'
)

export default supabase

export const db = {
  // ─── Auth ─────────────────────────────────────────────────────
  signUp: async (email, password, name, phone) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone: phone||'' } }
    })
    return { data, error }
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),

  // ─── Profile ──────────────────────────────────────────────────
  getProfile: async (uid) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (error) console.error('getProfile error:', error.message)
    return data
  },
  updateProfile: async (uid, updates) => {
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', uid).select().single()
    if (error) console.error('updateProfile error:', error.message)
    return data
  },
  addPts: async (uid, pts) => {
    // Atomar: RPC wenn vorhanden, sonst fetch+update mit Concurrency-Check
    const profile = await db.getProfile(uid)
    if (!profile) return null
    const oldPts = profile.pts || 0
    const { data, error } = await supabase.from('profiles')
      .update({ pts: oldPts + pts })
      .eq('id', uid)
      .eq('pts', oldPts) // Optimistic locking: nur wenn pts sich nicht geändert hat
      .select().single()
    if (error) {
      // Retry einmal bei Concurrency-Konflikt
      const fresh = await db.getProfile(uid)
      if (!fresh) return null
      return db.updateProfile(uid, { pts: (fresh.pts || 0) + pts })
    }
    return data
  },

  // ─── Leaderboard ──────────────────────────────────────────────
  getLeaderboard: async () => {
    const { data } = await supabase.from('monthly_leaderboard').select('*').limit(10)
    return data || []
  },

  // ─── Missions ─────────────────────────────────────────────────
  getMissions: async () => {
    const { data, error } = await supabase.from('missions').select('*').eq('active', true).order('id', { ascending: false })
    if (error) console.error('getMissions error:', error.message)
    return data || []
  },

  // Stempelt eine Mission für einen User (Admin-geschützt durch RLS + rate limit)
  // Gibt { ok, progress, goal, completed } zurück
  stampMission: async (userId, missionId) => {
    try {
      // Prüfen ob Mission existiert
      const { data: mission } = await supabase.from('missions').select('*').eq('id', missionId).single()
      if (!mission) return { ok: false, error: 'Mission nicht gefunden' }

      // Bisherige Stempel zählen
      const { count } = await supabase
        .from('mission_stamps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('mission_id', missionId)

      const current = count || 0
      if (current >= mission.goal) return { ok: false, error: 'Mission bereits abgeschlossen', completed: true, progress: current, goal: mission.goal }

      // Letzten Stempel prüfen – max 1 pro Stunde (Anti-Cheat)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from('mission_stamps')
        .select('created_at')
        .eq('user_id', userId)
        .eq('mission_id', missionId)
        .gte('created_at', oneHourAgo)
        .limit(1)

      if (recent && recent.length > 0) {
        return { ok: false, error: 'Bitte warte 1 Stunde zwischen Stempeln', progress: current, goal: mission.goal }
      }

      // Stempel eintragen
      const { error: stampError } = await supabase.from('mission_stamps').insert({ user_id: userId, mission_id: missionId })
      if (stampError) return { ok: false, error: stampError.message }

      const newProgress = current + 1
      const completed = newProgress >= mission.goal

      // Bei Abschluss: XP gutschreiben
      if (completed) {
        const profile = await db.getProfile(userId)
        if (profile) {
          await db.updateProfile(userId, { pts: (profile.pts || 0) + mission.pts_reward })
        }
        // mission_starts als completed markieren
        await supabase.from('mission_starts').update({ completed: true, completed_at: new Date().toISOString() })
          .eq('user_id', userId).eq('mission_id', missionId)
      }

      return { ok: true, progress: newProgress, goal: mission.goal, completed, pts_reward: mission.pts_reward }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  // Fortschritt für alle Missionen eines Users laden
  getUserMissionProgress: async (uid) => {
    const { data } = await supabase
      .from('mission_stamps')
      .select('mission_id')
      .eq('user_id', uid)
    const counts = {}
    for (const row of data || []) {
      counts[row.mission_id] = (counts[row.mission_id] || 0) + 1
    }
    return counts // { missionId: count }
  },

  // Mission starten (user drückt "Starten")
  startMission: async (uid, missionId) => {
    const { error } = await supabase.from('mission_starts').upsert(
      { user_id: uid, mission_id: missionId },
      { onConflict: 'user_id,mission_id' }
    )
    return !error
  },

  getStartedMissions: async (uid) => {
    const { data } = await supabase.from('mission_starts').select('mission_id').eq('user_id', uid)
    return new Set((data || []).map(r => r.mission_id))
  },

  // ─── Shop ─────────────────────────────────────────────────────
  getShopItems: async () => {
    const { data } = await supabase.from('shop_items').select('*').eq('active', true).order('cost')
    return data || []
  },
  redeemItem: async (uid, itemId, cost) => {
    // Erst Punkte prüfen und atomar abziehen (optimistic locking)
    const profile = await db.getProfile(uid)
    if (!profile) return { error: 'Profil nicht gefunden' }
    if ((profile.pts || 0) < cost) return { error: 'Nicht genügend XP' }
    const { error: ptsErr } = await supabase.from('profiles')
      .update({ pts: (profile.pts || 0) - cost })
      .eq('id', uid)
      .eq('pts', profile.pts) // Optimistic lock
    if (ptsErr) return { error: 'Punkte konnten nicht abgezogen werden, bitte erneut versuchen' }
    // Dann Einlösung erstellen
    const { error } = await supabase.from('redemptions').insert({ user_id: uid, item_id: itemId })
    if (error) {
      // Rollback: Punkte zurückgeben
      await supabase.from('profiles').update({ pts: profile.pts }).eq('id', uid)
      return { error: error.message }
    }
    return { ok: true }
  },
  getPendingRedemptions: async () => {
    const { data } = await supabase.from('redemptions')
      .select('*, item:item_id(name, icon), profile:user_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return data || []
  },
  confirmRedemption: async (id) => {
    await supabase.from('redemptions').update({ status: 'confirmed' }).eq('id', id)
  },

  // ─── Dishes / Cinder ──────────────────────────────────────────
  getDishes: async () => {
    const { data, error } = await supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true)
    if (error) console.error('getDishes error:', error.message)
    return (data || []).map(d => ({ ...d, votes: d.dish_votes?.filter(v => v.vote).length || 0 }))
  },
  voteDish: async (uid, dishId, vote) => {
    await supabase.from('dish_votes').upsert({ user_id: uid, dish_id: dishId, vote })
  },
  getUserVotes: async (uid) => {
    const { data } = await supabase.from('dish_votes').select('dish_id').eq('user_id', uid)
    return new Set((data || []).map(v => v.dish_id))
  },

  // ─── Scan ─────────────────────────────────────────────────────
  validateBelegQR: async (pts, token) => {
    try {
      const { data, error } = await supabase.rpc('validate_beleg_qr', { p_pts: pts, p_token: token })
      if (error) { console.error('QR validation error:', error.message); return false }
      return data === true
    } catch (e) {
      console.error('QR validation error:', e.message)
      return false
    }
  },
  logScan: async (uid, pts, isGlow) => {
    await supabase.from('scan_log').insert({ user_id: uid, pts_earned: pts, was_glow_hour: isGlow })
    return db.addPts(uid, pts)
  },

  // ─── Glow Hours ───────────────────────────────────────────────
  isGlowHourNow: async () => {
    const now = new Date()
    const day = now.getDay()
    const time = now.toTimeString().slice(0, 5)
    const { data } = await supabase.from('glow_hours').select('*').eq('day_of_week', day).eq('active', true)
    return (data || []).some(g => time >= g.start_time && time <= g.end_time)
  },

  // Nächste Glow Hour (für Countdown)
  getNextGlowHour: async () => {
    const now = new Date()
    const day = now.getDay()
    const time = now.toTimeString().slice(0, 5)
    // Alle aktiven Glow Hours laden
    const { data } = await supabase.from('glow_hours').select('*').eq('active', true)
    if (!data || !data.length) return null
    // Aktuell aktive Glow Hour?
    const active = data.find(g => g.day_of_week === day && time >= g.start_time && time <= g.end_time)
    if (active) return { active: true, end_time: active.end_time, day_of_week: active.day_of_week }
    // Nächste Glow Hour finden
    let best = null, bestDiff = Infinity
    for (const g of data) {
      let diffDays = g.day_of_week - day
      if (diffDays < 0) diffDays += 7
      const [h, m] = g.start_time.split(':').map(Number)
      const target = new Date(now)
      target.setDate(target.getDate() + diffDays)
      target.setHours(h, m, 0, 0)
      if (target <= now) { target.setDate(target.getDate() + 7) }
      const diff = target - now
      if (diff < bestDiff) { bestDiff = diff; best = { active: false, start_time: g.start_time, end_time: g.end_time, day_of_week: g.day_of_week, ms_until: diff } }
    }
    return best
  },

  // ─── Cinder Suggestions ──────────────────────────────────────
  suggestDish: async (uid, name, description) => {
    const { data, error } = await supabase.from('dish_suggestions').insert({ user_id: uid, name, description, status: 'pending' })
    return { data, error }
  },
  getPendingSuggestions: async () => {
    const { data } = await supabase.from('dish_suggestions')
      .select('*, profile:user_id(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return data || []
  },
  approveSuggestion: async (id, approved) => {
    return supabase.from('dish_suggestions').update({ status: approved ? 'approved' : 'rejected' }).eq('id', id)
  },

  // ─── Fun Facts ────────────────────────────────────────────────
  getFunFacts: async () => {
    const { data } = await supabase.from('fun_facts').select('*').eq('active', true).order('id')
    return data || []
  },
  addFunFact: async (text) => supabase.from('fun_facts').insert({ text }),
  deleteFunFact: async (id) => supabase.from('fun_facts').update({ active: false }).eq('id', id),

  // ─── Wheel Prizes ─────────────────────────────────────────────
  getWheelPrizes: async () => {
    const { data } = await supabase.from('wheel_prizes').select('*').eq('active', true).order('id')
    return data || []
  },

  // ─── Visit Intentions ─────────────────────────────────────────
  setVisitIntention: async (uid, date, status) => {
    return supabase.from('visit_intentions').upsert({ user_id: uid, planned_date: date, status })
  },
  getVisitIntention: async (uid, date) => {
    const { data } = await supabase.from('visit_intentions').select('*').eq('user_id', uid).eq('planned_date', date).single()
    return data
  },
  getTodayVisitors: async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('visit_intentions').select('*, profile:user_id(name)').eq('planned_date', today).eq('status', 'planned')
    return data || []
  },
  getTodayStats: async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('visit_intentions').select('status').eq('planned_date', today)
    const yes = (data || []).filter(d => d.status === 'planned').length
    const no = (data || []).filter(d => d.status === 'not').length
    return { yes, no }
  },

  // ─── Avatar Upload ────────────────────────────────────────────
  uploadAvatar: async (uid, file) => {
    // Validierung: Dateityp und Größe
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
      return { error: 'Nur Bilder erlaubt (JPG, PNG, WebP)' }
    }
    if (file.size > 5 * 1024 * 1024) return { error: 'Bild zu groß (max 5MB)' }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${uid}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
    if (error) { console.error('Avatar upload error:', error); return { error: error.message } }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    await db.updateProfile(uid, { avatar_url: url })
    return { url }
  },

  // ─── Vibe Photos ──────────────────────────────────────────────
  uploadVibe: async (uid, file) => {
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${uid}_${Date.now()}.${ext}`

      // Erst avatars bucket versuchen (existiert sicher), dann vibes
      let uploadError = null
      let bucket = 'avatars'
      let path = `vibes/${filename}`

      const { error: e1 } = await supabase.storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type })
      uploadError = e1

      if (e1) {
        // Fallback: vibes bucket
        bucket = 'vibes'
        path = filename
        const { error: e2 } = await supabase.storage.from('vibes').upload(path, file, { upsert: false, contentType: file.type })
        uploadError = e2
      }

      if (uploadError) {
        console.error('Vibe upload error:', uploadError)
        return { error: uploadError.message }
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()

      // In vibe_photos Tabelle speichern
      const { error: dbError } = await supabase.from('vibe_photos').insert({
        user_id: uid,
        url,
        approved: false,
      })

      if (dbError) return { error: dbError.message }
      return { ok: true, url }
    } catch (e) {
      return { error: e.message }
    }
  },

  getApprovedVibes: async () => {
    const { data } = await supabase.from('vibe_photos')
      .select('*, profile:user_id(name, avatar_url)')
      .eq('approved', true)
      .order('created_at', { ascending: false })
    return data || []
  },
  getPendingVibes: async () => {
    const { data } = await supabase.from('vibe_photos')
      .select('*, profile:user_id(name)')
      .eq('approved', false)
      .order('created_at', { ascending: false })
    return data || []
  },
  approveVibe: async (id, approved) => {
    return supabase.from('vibe_photos').update({ approved }).eq('id', id)
  },

  // ─── Friendships ──────────────────────────────────────────────
  sendFriendRequest: async (senderId, receiverId) => {
    const { data, error } = await supabase.from('friendships').insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
    return { data, error }
  },
  getFriendRequests: async (uid) => {
    const { data } = await supabase.from('friendships')
      .select('*, sender:sender_id(id, name, level, pts, avatar_url), receiver:receiver_id(id, name, level, pts, avatar_url)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    return data || []
  },
  respondFriendRequest: async (id, status) => {
    await supabase.from('friendships').update({ status }).eq('id', id)
  },
  searchUsers: async (query) => {
    const { data } = await supabase.from('profiles').select('id, name, level, pts, avatar_url').ilike('name', `%${query}%`).limit(10)
    return data || []
  },

  // ─── Gifts ────────────────────────────────────────────────────
  sendGift: async (senderId, receiverId, type, amount, itemId, message) => {
    // Self-Gift verhindern
    if (senderId === receiverId) return { data: null, error: { message: 'Du kannst dir nicht selbst schenken' } }
    if (!amount || amount < 10 || amount > 500) return { data: null, error: { message: 'Ungültiger Betrag (10-500)' } }
    // Punkte des Senders prüfen und atomar abziehen
    const profile = await db.getProfile(senderId)
    if (!profile || (profile.pts || 0) < amount) return { data: null, error: { message: 'Nicht genügend XP' } }
    // Erst Punkte abziehen, dann Gift erstellen
    const { error: updateErr } = await supabase.from('profiles').update({ pts: (profile.pts || 0) - amount }).eq('id', senderId).eq('pts', profile.pts)
    if (updateErr) return { data: null, error: { message: 'Punkte konnten nicht abgezogen werden' } }
    const { data, error } = await supabase.from('gifts').insert({ sender_id: senderId, receiver_id: receiverId, type, amount: amount || 0, item_id: itemId || null, message: message || '' })
    if (error) {
      // Rollback: Punkte zurückgeben
      await supabase.from('profiles').update({ pts: (profile.pts || 0) }).eq('id', senderId)
      return { data: null, error }
    }
    return { data, error: null }
  },
  getMyGifts: async (uid) => {
    const { data } = await supabase.from('gifts')
      .select('*, sender:sender_id(name), receiver:receiver_id(name)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    return data || []
  },
  claimGift: async (giftId, receiverId) => {
    // Atomarer Claim: nur wenn Status noch 'pending' ist (verhindert Doppel-Claim)
    const { data: updated, error: claimErr } = await supabase.from('gifts')
      .update({ status: 'claimed' })
      .eq('id', giftId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .select()
      .single()
    if (claimErr || !updated) return null
    if (updated.type === 'pts' && updated.amount > 0) {
      await db.addPts(receiverId, updated.amount)
    }
    return updated
  },

  // ─── Admin Links ─────────────────────────────────────────────
  getLinks: async () => {
    const { data } = await supabase.from('admin_links').select('*').eq('active', true).order('sort_order').order('id')
    return data || []
  },
  getAllLinks: async () => {
    const { data } = await supabase.from('admin_links').select('*').order('sort_order').order('id')
    return data || []
  },
  addLink: async (link) => {
    const { data, error } = await supabase.from('admin_links').insert(link).select().single()
    return { data, error }
  },
  updateLink: async (id, updates) => {
    const { data, error } = await supabase.from('admin_links').update(updates).eq('id', id).select().single()
    return { data, error }
  },
  deleteLink: async (id) => {
    await supabase.from('admin_links').delete().eq('id', id)
  },

  // ─── Admin ────────────────────────────────────────────────────
  getAllProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').order('pts', { ascending: false })
    return data || []
  },
}
