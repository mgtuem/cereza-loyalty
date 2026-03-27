import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lmspocokowitbbtixugs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtc3BvY29rb3dpdGJidGl4dWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTY1NjcsImV4cCI6MjA5MDAzMjU2N30.8tZUt5a7dwexQUv91zeaTjsAmNfBVhU5gOMU1e5XjG4'
)

export default supabase

// ─── Database Service ───────────────────────────────────────────
export const db = {
  // Auth
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

  // Profile
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
    return db.updateProfile(uid, { pts: profile.pts + pts })
  },

  // Leaderboard
  getLeaderboard: async () => {
    const { data } = await supabase.from('monthly_leaderboard').select('*').limit(10)
    return data || []
  },

  // Missions - load all active
  getMissions: async () => {
    const { data, error } = await supabase.from('missions').select('*').eq('active', true).order('id', { ascending: false })
    if (error) console.error('getMissions error:', error.message)
    return data || []
  },
  getUserMissions: async (uid) => {
    const { data } = await supabase.from('user_missions').select('*, missions(*)').eq('user_id', uid)
    return data || []
  },

  // Shop
  getShopItems: async () => {
    const { data } = await supabase.from('shop_items').select('*').eq('active', true).order('cost')
    return data || []
  },
  redeemItem: async (uid, itemId, cost) => {
    await supabase.from('redemptions').insert({ user_id: uid, item_id: itemId })
    const profile = await db.getProfile(uid)
    return db.updateProfile(uid, { pts: profile.pts - cost })
  },

  // Dishes
  getDishes: async () => {
    const { data, error } = await supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true)
    if (error) console.error('getDishes error:', error.message)
    return (data || []).map(d => ({ ...d, votes: d.dish_votes?.filter(v => v.vote).length || 0 }))
  },
  voteDish: async (uid, dishId, vote) => {
    await supabase.from('dish_votes').upsert({ user_id: uid, dish_id: dishId, vote })
  },

  // Scan
  logScan: async (uid, pts, isGlow) => {
    await supabase.from('scan_log').insert({ user_id: uid, pts_earned: pts, was_glow_hour: isGlow })
    return db.addPts(uid, pts)
  },

  // Glow hours
  isGlowHourNow: async () => {
    const now = new Date()
    const day = now.getDay()
    const time = now.toTimeString().slice(0, 5)
    const { data } = await supabase.from('glow_hours').select('*').eq('day_of_week', day).eq('active', true)
    return (data || []).some(g => time >= g.start_time && time <= g.end_time)
  },

  // Eras
  getEras: async () => {
    const { data } = await supabase.from('era_config').select('*').order('level')
    return data || []
  },

  // Admin
  getAllProfiles: async () => {
    const { data } = await supabase.from('profiles').select('*').eq('is_admin', false).order('pts', { ascending: false })
    return data || []
  },

  // Search users by name
  searchUsers: async (query) => {
    const { data } = await supabase.from('profiles').select('id, name, email, level, pts').ilike('name', `%${query}%`).limit(10)
    return data || []
  },

  // Friendships
  sendFriendRequest: async (senderId, receiverId) => {
    const { data, error } = await supabase.from('friendships').insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
    return { data, error }
  },
  getFriendRequests: async (uid) => {
    const { data } = await supabase.from('friendships').select('*, sender:sender_id(id, name, level, pts), receiver:receiver_id(id, name, level, pts)').or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    return data || []
  },
  respondFriendRequest: async (id, status) => {
    await supabase.from('friendships').update({ status }).eq('id', id)
  },

  // Gifts
  sendGift: async (senderId, receiverId, type, amount, itemId, message) => {
    const { data, error } = await supabase.from('gifts').insert({ sender_id: senderId, receiver_id: receiverId, type, amount: amount || 0, item_id: itemId || null, message: message || '' })
    return { data, error }
  },
  getMyGifts: async (uid) => {
    const { data } = await supabase.from('gifts').select('*, sender:sender_id(name), receiver:receiver_id(name)').or(`sender_id.eq.${uid},receiver_id.eq.${uid}`).order('created_at', { ascending: false })
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
}
