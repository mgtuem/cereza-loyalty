import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lmspocokowitbbtixugs.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtc3BvY29rb3dpdGJidGl4dWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTY1NjcsImV4cCI6MjA5MDAzMjU2N30.8tZUt5a7dwexQUv91zeaTjsAmNfBVhU5gOMU1e5XjG4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'cereza-auth',
  },
  realtime: { params: { eventsPerSecond: 10 } },
})

export default supabase

// ─── In-Memory Cache für Admin-Performance ───────────────────────
const _cache = {}
const cached = async (key, ttlMs, fn) => {
  const now = Date.now()
  if (_cache[key] && now - _cache[key].ts < ttlMs) return _cache[key].data
  const data = await fn()
  _cache[key] = { data, ts: now }
  return data
}
const clearCache = (key) => { delete _cache[key] }

export const db = {

  // ── Auth ──────────────────────────────────────────────────────
  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name } }
    })
    return { data, error }
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),

  // ── Profile ───────────────────────────────────────────────────
  getProfile: async (uid) => {
    const { data, error } = await supabase
      .from('profiles').select('*').eq('id', uid).single()
    if (error) console.error('getProfile error:', error.message, error.code)
    return data || null
  },

  // FIX #1+2: Retry löst Race-Condition nach Login/Registrierung
  getProfileWithRetry: async (uid, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      const data = await db.getProfile(uid)
      if (data) return data
      await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
    return null
  },

  updateProfile: async (uid, updates) => {
    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', uid).select().single()
    if (error) console.error('updateProfile error:', error.message)
    clearCache('allProfiles')
    return data
  },

  addPts: async (uid, pts) => {
    const profile = await db.getProfile(uid)
    if (!profile) return null
    return db.updateProfile(uid, { pts: (profile.pts || 0) + pts })
  },

  // ── Leaderboard ───────────────────────────────────────────────
  getLeaderboard: async () => {
    const { data } = await supabase.from('monthly_leaderboard').select('*').limit(10)
    return data || []
  },

  // ── Missions ──────────────────────────────────────────────────
  getMissions: async () => {
    const { data, error } = await supabase
      .from('missions').select('*').eq('active', true).order('id', { ascending: false })
    if (error) console.error('getMissions error:', error.message)
    return data || []
  },
  getUserMissions: async (uid) => {
    const { data } = await supabase
      .from('user_missions').select('*, missions(*)').eq('user_id', uid)
    return data || []
  },

  // ── Shop ──────────────────────────────────────────────────────
  getShopItems: async () => {
    const { data } = await supabase
      .from('shop_items').select('*').eq('active', true).order('cost')
    return data || []
  },

  redeemItem: async (uid, itemId, cost) => {
    const profile = await db.getProfile(uid)
    if (!profile || (profile.pts || 0) < cost) return { error: 'Nicht genug Punkte' }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const { data: redemption, error } = await supabase
      .from('redemptions')
      .insert({ user_id: uid, item_id: itemId, pts_spent: cost, status: 'pending', expires_at: expiresAt })
      .select().single()
    if (error) return { error: error.message }
    const updated = await db.updateProfile(uid, { pts: profile.pts - cost })
    return { updated, redemption }
  },

  confirmRedemption: async (redemptionId) => {
    const { data, error } = await supabase
      .from('redemptions')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', redemptionId).eq('status', 'pending').select().single()
    return { data, error }
  },

  getPendingRedemptions: async () => {
    const { data } = await supabase
      .from('redemptions')
      .select('*, profile:user_id(name, email), item:item_id(name, icon)')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    return data || []
  },

  // ── Dishes – FIX #16: kein voting_enabled Filter ──────────────
  getDishes: async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*, dish_votes(vote)')
      .eq('active', true)
      .order('id', { ascending: false })
    if (error) console.error('getDishes error:', error.message)
    return (data || []).map(d => ({
      ...d,
      votes: d.dish_votes?.filter(v => v.vote === true).length || 0
    }))
  },

  // FIX #22: Insert statt upsert – Unique Constraint verhindert Doppelvoting
  voteDish: async (uid, dishId, vote) => {
    const { data: existing } = await supabase
      .from('dish_votes').select('id').eq('user_id', uid).eq('dish_id', dishId).single()
    if (existing) return { error: 'Bereits abgestimmt' }
    return supabase.from('dish_votes').insert({ user_id: uid, dish_id: dishId, vote })
  },

  getUserVotes: async (uid) => {
    const { data } = await supabase
      .from('dish_votes').select('dish_id').eq('user_id', uid)
    return new Set((data || []).map(v => v.dish_id))
  },

  // ── Scan ──────────────────────────────────────────────────────
  logScan: async (uid, pts, isGlow) => {
    const eightHAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('scan_log').select('id').eq('user_id', uid).gte('created_at', eightHAgo).limit(1)
    if (recent?.length > 0) return { error: 'Bitte 8 Stunden zwischen Scans warten' }
    await supabase.from('scan_log').insert({ user_id: uid, pts_earned: pts, was_glow_hour: isGlow })
    return db.addPts(uid, pts)
  },

  // ── Glow Hours ────────────────────────────────────────────────
  isGlowHourNow: async () => {
    const now = new Date()
    const day = now.getDay()
    const time = now.toTimeString().slice(0, 5)
    const { data } = await supabase
      .from('glow_hours').select('*').eq('day_of_week', day).eq('active', true)
    return (data || []).some(g => time >= g.start_time && time <= g.end_time)
  },

  // ── Eras ──────────────────────────────────────────────────────
  getEras: async () => {
    const { data } = await supabase.from('era_config').select('*').order('level')
    return data || []
  },

  // ── Admin – gecacht für Performance (FIX: Admin lädt zu lange) ─
  getAllProfiles: async () => {
    return cached('allProfiles', 30000, async () => {
      const { data } = await supabase
        .from('profiles').select('*').order('pts', { ascending: false })
      return data || []
    })
  },

  getAdminProfile: async (uid) => db.getProfileWithRetry(uid, 4),

  searchUsers: async (query) => {
    const { data } = await supabase
      .from('profiles').select('id, name, email, level, pts, avatar_url')
      .ilike('name', `%${query}%`).limit(10)
    return data || []
  },

  // ── Freundschaften ────────────────────────────────────────────
  sendFriendRequest: async (senderId, receiverId) => {
    const { data: existing } = await supabase
      .from('friendships').select('id')
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
      .single()
    if (existing) return { error: 'Anfrage bereits vorhanden' }
    return supabase.from('friendships').insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
  },
  getFriendRequests: async (uid) => {
    const { data } = await supabase
      .from('friendships')
      .select('*, sender:sender_id(id, name, level, pts, avatar_url), receiver:receiver_id(id, name, level, pts, avatar_url)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    return data || []
  },
  respondFriendRequest: async (id, status) => {
    await supabase.from('friendships').update({ status }).eq('id', id)
  },

  // ── Geschenke ─────────────────────────────────────────────────
  sendGift: async (senderId, receiverId, type, amount, itemId, message) => {
    if (type === 'pts' && amount > 0) {
      const month = new Date().toISOString().slice(0, 7)
      const { data: monthly } = await supabase
        .from('monthly_xp_gifts').select('total_sent')
        .eq('sender_id', senderId).eq('month', month).single()
      const sent = monthly?.total_sent || 0
      if (sent + amount > 200) return { error: `Noch ${200 - sent} XP diesen Monat verschenkbar` }
      await supabase.from('monthly_xp_gifts')
        .upsert({ sender_id: senderId, month, total_sent: sent + amount }, { onConflict: 'sender_id,month' })
    }
    return supabase.from('gifts').insert({
      sender_id: senderId, receiver_id: receiverId,
      type, amount: amount || 0, item_id: itemId || null, message: message || ''
    })
  },
  getMyGifts: async (uid) => {
    const { data } = await supabase
      .from('gifts')
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
  getRemainingGiftXP: async (uid) => {
    const month = new Date().toISOString().slice(0, 7)
    const { data } = await supabase
      .from('monthly_xp_gifts').select('total_sent')
      .eq('sender_id', uid).eq('month', month).single()
    return 200 - (data?.total_sent || 0)
  },

  // ── Fun Facts ─────────────────────────────────────────────────
  getFunFacts: async () => {
    const { data } = await supabase.from('fun_facts').select('*').eq('active', true).order('id')
    return data || []
  },
  addFunFact: async (text) => supabase.from('fun_facts').insert({ text }),
  deleteFunFact: async (id) => supabase.from('fun_facts').update({ active: false }).eq('id', id),

  // ── Wheel Prizes ──────────────────────────────────────────────
  getWheelPrizes: async () => {
    const { data } = await supabase
      .from('wheel_prizes').select('*').eq('active', true).order('id')
    return data || []
  },
  updateWheelPrize: async (id, updates) => {
    clearCache('prizes')
    return supabase.from('wheel_prizes').update(updates).eq('id', id)
  },
  addWheelPrize: async (label, value, color) => {
    clearCache('prizes')
    return supabase.from('wheel_prizes').insert({ label, value, color })
  },
  deleteWheelPrize: async (id) => {
    clearCache('prizes')
    return supabase.from('wheel_prizes').update({ active: false }).eq('id', id)
  },

  // ── Visit Intentions ──────────────────────────────────────────
  setVisitIntention: async (uid, date, status) => {
    return supabase.from('visit_intentions').upsert({ user_id: uid, planned_date: date, status })
  },
  getVisitIntention: async (uid, date) => {
    const { data } = await supabase
      .from('visit_intentions').select('*').eq('user_id', uid).eq('planned_date', date).single()
    return data
  },
  getTodayVisitors: async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('visit_intentions')
      .select('*, profile:user_id(name)')
      .eq('planned_date', today).eq('status', 'planned')
    return data || []
  },

  // ── Avatar Upload – FIX #32 ───────────────────────────────────
  uploadAvatar: async (uid, file) => {
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!['jpg','jpeg','png','webp','gif'].includes(ext)) return { error: 'Nur JPG, PNG oder WEBP' }
      if (file.size > 5 * 1024 * 1024) return { error: 'Max. 5 MB' }
      const path = `${uid}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) return { error: upErr.message }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()
      await db.updateProfile(uid, { avatar_url: url })
      return { url }
    } catch (e) { return { error: e.message } }
  },

  // ── Vibe Gallery ──────────────────────────────────────────────
  uploadVibe: async (uid, file) => {
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `${uid}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('vibes').upload(path, file, { upsert: false, contentType: file.type })
      if (upErr) return { error: upErr.message }
      const { data: urlData } = supabase.storage.from('vibes').getPublicUrl(path)
      const url = urlData.publicUrl
      const { data, error } = await supabase
        .from('vibe_photos').insert({ user_id: uid, url, approved: false }).select().single()
      return { data, error, url }
    } catch (e) { return { error: e.message } }
  },
  getApprovedVibes: async () => {
    const { data } = await supabase
      .from('vibe_photos').select('*, profile:user_id(name)')
      .eq('approved', true).order('created_at', { ascending: false }).limit(50)
    return data || []
  },
  getPendingVibes: async () => {
    const { data } = await supabase
      .from('vibe_photos').select('*, profile:user_id(name)')
      .eq('approved', false).order('created_at', { ascending: false })
    return data || []
  },
  approveVibe: async (id, approved) => supabase.from('vibe_photos').update({ approved }).eq('id', id),
}
