import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lmspocokowitbbtixugs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtc3BvY29rb3dpdGJidGl4dWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTY1NjcsImV4cCI6MjA5MDAzMjU2N30.8tZUt5a7dwexQUv91zeaTjsAmNfBVhU5gOMU1e5XjG4'
)

export default supabase

export const db = {
  // ─── Auth ─────────────────────────────────────────────────────
  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
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
    const { data } = await supabase.from('profiles').update(updates).eq('id', uid).select().single()
    return data
  },
  addPts: async (uid, pts) => {
    const profile = await db.getProfile(uid)
    if (!profile) return null
    return db.updateProfile(uid, { pts: (profile.pts || 0) + pts })
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
    const { error } = await supabase.from('redemptions').insert({ user_id: uid, item_id: itemId })
    if (error) return { error }
    const profile = await db.getProfile(uid)
    if (!profile) return { error: 'Profil nicht gefunden' }
    await db.updateProfile(uid, { pts: (profile.pts || 0) - cost })
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
    const ext = file.name.split('.').pop()
    const path = `${uid}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
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
    const { data } = await supabase.from('profiles').select('id, name, email, level, pts, avatar_url').ilike('name', `%${query}%`).limit(10)
    return data || []
  },

  // ─── Gifts ────────────────────────────────────────────────────
  sendGift: async (senderId, receiverId, type, amount, itemId, message) => {
    const { data, error } = await supabase.from('gifts').insert({ sender_id: senderId, receiver_id: receiverId, type, amount: amount || 0, item_id: itemId || null, message: message || '' })
    return { data, error }
  },
  getMyGifts: async (uid) => {
    const { data } = await supabase.from('gifts')
      .select('*, sender:sender_id(name), receiver:receiver_id(name)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    return data || []
  },
  claimGift: async (giftId, receiverId) => {
    const { data: gift } = await supabase.from('gifts').select('*').eq('id', giftId).single()
    if (!gift || gift.receiver_id !== receiverId || gift.status !== 'pending') return null
    await supabase.from('gifts').update({ status: 'claimed' }).eq('id', giftId)
    if (gift.type === 'pts') {
      const profile = await db.getProfile(receiverId)
      if (profile) await db.updateProfile(receiverId, { pts: (profile.pts || 0) + gift.amount })
    }
    return gift
  },

  // ─── Admin ────────────────────────────────────────────────────
  getAllProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').order('pts', { ascending: false })
    return data || []
  },
}
