import React, { useState, useEffect } from 'react'
import { supabase, Candidate } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CandidateFormData } from '../types'
import CandidateForm from '../components/Dashboard/CandidateForm'
import CandidateList from '../components/Dashboard/CandidateList'

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial candidates
  useEffect(() => {
    if (user) {
      fetchCandidates()
    }
  }, [user])

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return

    const subscription = supabase
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'candidates',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Realtime update:', payload)
          
          if (payload.eventType === 'INSERT') {
            setCandidates(prev => [payload.new as Candidate, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCandidates(prev => 
              prev.map(candidate => 
                candidate.id === payload.new.id ? payload.new as Candidate : candidate
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setCandidates(prev => 
              prev.filter(candidate => candidate.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCandidates(data || [])
    } catch (err) {
      console.error('Lỗi khi tải danh sách ứng viên:', err)
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCandidate = async (candidateData: CandidateFormData) => {
    if (!user) return

    try {
      setAddingCandidate(true)
      let resume_url = null

      // Upload resume if provided
      if (candidateData.file) {
        const fileExt = candidateData.file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, candidateData.file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName)

        resume_url = data.publicUrl
      }

      // Call Edge Function to add candidate
      const { data, error } = await supabase.functions.invoke('add-candidate', {
        body: {
          full_name: candidateData.full_name,
          applied_position: candidateData.applied_position,
          status: candidateData.status,
          resume_url
        }
      })

      if (error) throw error
      
      // Realtime subscription will handle adding to the UI
      console.log('✅ Candidate added successfully:', data)
      
    } catch (err) {
      console.error('Lỗi khi thêm ứng viên:', err)
      setError(err instanceof Error ? err.message : 'Không thể thêm ứng viên')
    } finally {
      setAddingCandidate(false)
    }
  }

  const handleUpdateStatus = async (candidateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', candidateId)

      if (error) throw error
      
      // Realtime subscription will handle the UI update
      console.log('✅ Status updated successfully')
      
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái:', err)
      throw err
    }
  }

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId)

      if (error) throw error
      
      // Realtime subscription will handle removing from the UI
      console.log('✅ Candidate deleted successfully')
      
    } catch (err) {
      console.error('Lỗi khi xóa ứng viên:', err)
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Quản lý Ứng viên
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Hệ thống quản lý hồ sơ ứng viên
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Xin chào,</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Candidate Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Thêm ứng viên mới
              </h2>
              <CandidateForm 
                onSubmit={handleAddCandidate} 
                loading={addingCandidate}
              />
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Thống kê</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng ứng viên:</span>
                  <span className="font-semibold">{candidates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mới:</span>
                  <span className="font-semibold text-blue-600">
                    {candidates.filter(c => c.status === 'New').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phỏng vấn:</span>
                  <span className="font-semibold text-yellow-600">
                    {candidates.filter(c => c.status === 'Interviewing').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Đã tuyển:</span>
                  <span className="font-semibold text-green-600">
                    {candidates.filter(c => c.status === 'Hired').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Từ chối:</span>
                  <span className="font-semibold text-red-600">
                    {candidates.filter(c => c.status === 'Rejected').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Candidates List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Danh sách ứng viên ({candidates.length})
                  </h2>
                  <button
                    onClick={fetchCandidates}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    🔄 Làm mới
                  </button>
                </div>
              </div>
              <CandidateList 
                candidates={candidates}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteCandidate}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard