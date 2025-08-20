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

export interface CandidateFormData {
  full_name: string
  applied_position: string
  status: 'New' | 'Interviewing' | 'Hired' | 'Rejected'
  file: File | null
}

export interface AuthUser {
  id: string
  email: string
  created_at: string
}