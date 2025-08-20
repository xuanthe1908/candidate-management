import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types - Export as types only
export interface Candidate {
  id: string
  user_id: string
  full_name: string
  applied_position: string
  status: 'New' | 'Interviewing' | 'Hired' | 'Rejected'
  resume_url: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}