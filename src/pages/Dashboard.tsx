import { useState, useEffect, useMemo } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Candidate, CandidateFormData } from '../types'
import Header from '../components/Layout/Header'
import CandidateForm from '../components/Dashboard/CandidateForm'
import CandidateList from '../components/Dashboard/CandidateList'

const Dashboard = () => {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filter candidates based on search and status
  const filteredCandidates = useMemo(() => {
    let filtered = candidates

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(candidate => 
        candidate.full_name.toLowerCase().includes(query) ||
        candidate.applied_position.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.status === statusFilter)
    }

    return filtered
  }, [candidates, searchQuery, statusFilter])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: candidates.length,
      new: candidates.filter(c => c.status === 'New').length,
      interviewing: candidates.filter(c => c.status === 'Interviewing').length,
      hired: candidates.filter(c => c.status === 'Hired').length,
      rejected: candidates.filter(c => c.status === 'Rejected').length,
    }
  }, [candidates])

  // Fetch initial candidates
  useEffect(() => {
    if (user) {
      fetchCandidates()
    }
  }, [user])

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return

    console.log('🔄 Setting up realtime subscription for user:', user.id)

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
          console.log('🔄 Realtime update received:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newCandidate = payload.new as Candidate
            setCandidates(prev => {
              // Check if candidate already exists to avoid duplicates
              const exists = prev.some(c => c.id === newCandidate.id)
              if (exists) return prev
              return [newCandidate, ...prev]
            })
            setSuccess(`Đã thêm ứng viên "${newCandidate.full_name}" thành công!`)
          } else if (payload.eventType === 'UPDATE') {
            const updatedCandidate = payload.new as Candidate
            setCandidates(prev => 
              prev.map(candidate => 
                candidate.id === updatedCandidate.id ? updatedCandidate : candidate
              )
            )
            setSuccess(`Đã cập nhật ứng viên "${updatedCandidate.full_name}" thành công!`)
          } else if (payload.eventType === 'DELETE') {
            const deletedCandidate = payload.old as Candidate
            setCandidates(prev => 
              prev.filter(candidate => candidate.id !== deletedCandidate.id)
            )
            setSuccess('Đã xóa ứng viên thành công!')
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Subscription status:', status)
      })

    return () => {
      console.log('🔄 Cleaning up realtime subscription')
      supabase.removeChannel(subscription)
    }
  }, [user])

  // Auto clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Auto clear error message
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📊 Fetching candidates for user:', user?.id)
      
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching candidates:', error)
        throw error
      }

      console.log('✅ Fetched candidates:', data?.length || 0)
      setCandidates(data || [])
    } catch (err: unknown) {
      console.error('❌ Error in fetchCandidates:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Có lỗi xảy ra khi tải danh sách ứng viên')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddCandidate = async (candidateData: CandidateFormData) => {
    if (!user) {
      setError('Bạn cần đăng nhập để thực hiện thao tác này')
      return
    }

    try {
      setAddingCandidate(true)
      setError(null)
      
      console.log('📝 Adding new candidate:', candidateData.full_name)
      
      let resume_url = null

      // Upload resume if provided
      if (candidateData.file) {
        console.log('📁 Uploading resume file:', candidateData.file.name)
        try {
          resume_url = await uploadFile(candidateData.file, user.id)
          console.log('✅ Resume uploaded successfully:', resume_url)
        } catch (uploadError) {
          console.error('❌ Error uploading file:', uploadError)
          throw new Error('Lỗi khi upload file CV. Vui lòng thử lại.')
        }
      }

      // Call Edge Function to add candidate
      console.log('🚀 Calling Edge Function to add candidate')
      const { data, error } = await supabase.functions.invoke('add-candidate', {
        body: {
          full_name: candidateData.full_name,
          applied_position: candidateData.applied_position,
          status: candidateData.status,
          resume_url
        }
      })

      if (error) {
        console.error('❌ Edge Function error:', error)
        throw new Error(error.message || 'Lỗi từ server khi thêm ứng viên')
      }

      console.log('✅ Candidate added successfully via Edge Function:', data)
      
      // Success message will be shown via realtime update
      
    } catch (err: unknown) {
      console.error('❌ Error in handleAddCandidate:', err)
      if (err instanceof Error) {
        setError(err.message || 'Không thể thêm ứng viên. Vui lòng thử lại.')
      } else {
        setError('Không thể thêm ứng viên. Vui lòng thử lại.')
      }
    } finally {
      setAddingCandidate(false)
    }
  }

  const handleUpdateStatus = async (candidateId: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating candidate ${candidateId} status to ${newStatus}`)
      
      const { error } = await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', candidateId)

      if (error) {
        console.error('❌ Error updating status:', error)
        throw error
      }
      
      console.log('✅ Status updated successfully')
      // Success message will be shown via realtime update
      
    } catch (err: unknown) {
      console.error('❌ Error in handleUpdateStatus:', err)
      if (err instanceof Error) {
        setError(err.message || 'Không thể cập nhật trạng thái')
        throw err
      } else {
        setError('Không thể cập nhật trạng thái')
        throw new Error('Không thể cập nhật trạng thái')
      }
    }
  }

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      console.log(`🗑️ Deleting candidate ${candidateId}`)
      
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId)

      if (error) {
        console.error('❌ Error deleting candidate:', error)
        throw error
      }
      
      console.log('✅ Candidate deleted successfully')
      // Success message will be shown via realtime update
      
    } catch (err: unknown) {
      console.error('❌ Error in handleDeleteCandidate:', err)
      if (err instanceof Error) {
        setError(err.message || 'Không thể xóa ứng viên')
        throw err
      } else {
        setError('Không thể xóa ứng viên')
        throw new Error('Không thể xóa ứng viên')
      }
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFilterStatus = (status: string) => {
    setStatusFilter(status)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Vui lòng đăng nhập</h2>
          <p className="text-gray-600 mt-2">Bạn cần đăng nhập để truy cập trang này</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-700 hover:text-green-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm ứng viên..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter by status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterStatus(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="New">Mới</option>
                  <option value="Interviewing">Phỏng vấn</option>
                  <option value="Hired">Đã tuyển</option>
                  <option value="Rejected">Từ chối</option>
                </select>
              </div>

              {/* Clear filters */}
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {/* Total count */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredCandidates.length}</span> / {stats.total} ứng viên
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form and Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Add Candidate Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Thêm ứng viên mới
              </h2>
              <CandidateForm 
                onSubmit={handleAddCandidate} 
                loading={addingCandidate}
              />
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Thống kê
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Tổng ứng viên:</span>
                  <span className="font-bold text-lg text-gray-900">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">Mới:</span>
                  <span className="font-bold text-lg text-blue-600">{stats.new}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-700 font-medium">Phỏng vấn:</span>
                  <span className="font-bold text-lg text-yellow-600">{stats.interviewing}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700 font-medium">Đã tuyển:</span>
                  <span className="font-bold text-lg text-green-600">{stats.hired}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700 font-medium">Từ chối:</span>
                  <span className="font-bold text-lg text-red-600">{stats.rejected}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Thao tác nhanh</h3>
              <div className="space-y-2">
                <button
                  onClick={fetchCandidates}
                  disabled={loading}
                  className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                >
                  🔄 Làm mới danh sách
                </button>
                <button
                  onClick={clearFilters}
                  disabled={!searchQuery && statusFilter === 'all'}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                >
                  🧹 Xóa bộ lọc
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  🖨️ In danh sách
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Candidates List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Danh sách ứng viên ({filteredCandidates.length})
                  </h2>
                  <div className="flex items-center space-x-2">
                    {/* Realtime indicator */}
                    <div className="flex items-center text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      Live
                    </div>
                    <button
                      onClick={fetchCandidates}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center disabled:opacity-50"
                    >
                      <svg className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {loading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                  </div>
                </div>
                
                {/* Filter summary */}
                {(searchQuery || statusFilter !== 'all') && (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                    <span>Bộ lọc đang áp dụng:</span>
                    {searchQuery && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        Tìm kiếm: "{searchQuery}"
                      </span>
                    )}
                    {statusFilter !== 'all' && (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                        Trạng thái: {statusFilter === 'New' ? 'Mới' : 
                                   statusFilter === 'Interviewing' ? 'Phỏng vấn' :
                                   statusFilter === 'Hired' ? 'Đã tuyển' : 'Từ chối'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Candidates List */}
              <CandidateList 
                candidates={filteredCandidates}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteCandidate}
                loading={loading}
              />
              
              {/* Empty state when filtered */}
              {!loading && candidates.length > 0 && filteredCandidates.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Không tìm thấy ứng viên</h3>
                  <p>Không có ứng viên nào phù hợp với bộ lọc hiện tại.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>© 2024 Candidate Management System - Built with React + TypeScript + Supabase</p>
          <p className="mt-1">
            Version 1.0.0 | 
            <span className="ml-1">User: {user.email}</span> | 
            <span className="ml-1">Total Candidates: {stats.total}</span>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Dashboard