import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://trsbjjagrpvlzvcveiph.supabase.co'
const SUPABASE_KEY = 'sb_publishable_unJoCAXBOTCiLpLkFCG2oA_SdRcKHit'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Auth helpers ──────────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
}

// ── Profile ───────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// ── Agency ────────────────────────────────────────────────

export async function getUserAgency(userId) {
  try {
    // Primero obtener el membership sin JOIN a agencies
    const { data: member, error: memErr } = await supabase
      .from('agency_members')
      .select('role, agency_id, status')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (memErr || !member) return null

    // Después obtener la agencia por separado
    const { data: agency, error: agErr } = await supabase
      .from('agencies')
      .select('id, nombre, plan')
      .eq('id', member.agency_id)
      .maybeSingle()

    if (agErr || !agency) return null

    return {
      role: member.role,
      status: member.status,
      agencies: agency
    }
  } catch {
    return null
  }
}

// ── Detectar si el usuario es cliente del portal ──────────

export async function isClientUser(userId) {
  try {
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return false
    return !!data
  } catch {
    return false
  }
}

// ── Route guard ───────────────────────────────────────────

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    window.location.href = 'index.html'
    return null
  }
  return session
}

export async function redirectIfAuth() {
  const session = await getSession()
  if (!session) return

  // Primero verificar si es miembro de agencia (tiene prioridad)
  const agency = await getUserAgency(session.user.id)
  if (agency) {
    window.location.href = 'dashboard.html'
    return
  }

  // Si no es de agencia, verificar si es cliente del portal
  const isClient = await isClientUser(session.user.id)
  if (isClient) {
    window.location.href = 'client-portal.html'
    return
  }

  // No es ninguno de los dos — ir a onboarding
  window.location.href = 'onboarding.html'
}

// ── Generate slug ─────────────────────────────────────────

export function toSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Generate invite code ──────────────────────────────────

export function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
