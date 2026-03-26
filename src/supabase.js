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

  // Missions
  getMissions: async () => {
    const week = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 604800000)
    const { data } = await supabase.from('missions').select('*').eq('active', true).eq('week_number', week)
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
    const { data } = await supabase.from('dishes').select('*, dish_votes(vote)').eq('active', true)
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
}
