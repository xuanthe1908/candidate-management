import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to upload file
export const uploadFile = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  
  const { error } = await supabase.storage
    .from('resumes')
    .upload(fileName, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('resumes')
    .getPublicUrl(fileName)

  return data.publicUrl
}