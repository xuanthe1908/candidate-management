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

  // Setup realtime subscription with improved error handling
  useEffect(() => {
    if (!user) return

    console.log('Setting up realtime subscription for user:', user.id)

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
          console.log('Realtime update received:', payload)
          
          try {
            if (payload.eventType === 'INSERT') {
              const newCandidate = payload.new as Candidate
              console.log('Adding new candidate to list:', newCandidate.full_name)
              
              setCandidates(prev => {
                // Check if candidate already exists to avoid duplicates
                const exists = prev.some(c => c.id === newCandidate.id)
                if (exists) {
                  console.log('Candidate already exists, skipping duplicate')
                  return prev
                }
                console.log('Successfully added candidate to list')
                return [newCandidate, ...prev]
              })
              
              setSuccess(`Đã thêm ứng viên "${newCandidate.full_name}" thành công!`)
              
            } else if (payload.eventType === 'UPDATE') {
              const updatedCandidate = payload.new as Candidate
              console.log('Updating candidate in list:', updatedCandidate.full_name)
              
              setCandidates(prev => 
                prev.map(candidate => 
                  candidate.id === updatedCandidate.id ? updatedCandidate : candidate
                )
              )
              
              setSuccess(`Đã cập nhật ứng viên "${updatedCandidate.full_name}" thành công!`)
              
            } else if (payload.eventType === 'DELETE') {
              const deletedCandidate = payload.old as Candidate
              console.log('Removing candidate from list:', deletedCandidate.full_name)
              
              setCandidates(prev => 
                prev.filter(candidate => candidate.id !== deletedCandidate.id)
              )
              
              setSuccess('Đã xóa ứng viên thành công!')
            }
          } catch (error) {
            console.error('Error processing realtime update:', error)
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error')
        }
      })

    return () => {
      console.log('Cleaning up realtime subscription')
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
      
      console.log('Fetching candidates for user:', user?.id)
      
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching candidates:', error)
        throw error
      }

      console.log('Fetched candidates:', data?.length || 0)
      setCandidates(data || [])
    } catch (err: unknown) {
      console.error('Error in fetchCandidates:', err)
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
      
      console.log('Adding new candidate:', candidateData.full_name)
      
      let resume_url = null

      // Upload resume if provided
      if (candidateData.file) {
        console.log('Uploading resume file:', candidateData.file.name)
        try {
          resume_url = await uploadFile(candidateData.file, user.id)
          console.log('Resume uploaded successfully:', resume_url)
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError)
          throw new Error('Lỗi khi upload file CV. Vui lòng thử lại.')
        }
      }

      // Try using Edge Function first, fallback to direct insert if needed
      let candidateAdded = false

      try {
        console.log('Calling Edge Function to add candidate')
        const { data, error } = await supabase.functions.invoke('add-candidate', {
          body: {
            full_name: candidateData.full_name,
            applied_position: candidateData.applied_position,
            status: candidateData.status,
            resume_url
          }
        })

        if (error) {
          console.error('Edge Function error:', error)
          throw new Error('Edge Function failed')
        }

        console.log('Candidate added successfully via Edge Function:', data)
        candidateAdded = true
        
      } catch (edgeFunctionError) {
        console.log('Edge Function failed, trying direct insert...')
        
        // Fallback to direct database insert
        const { data, error } = await supabase
          .from('candidates')
          .insert([
            {
              user_id: user.id,
              full_name: candidateData.full_name,
              applied_position: candidateData.applied_position,
              status: candidateData.status,
              resume_url
            }
          ])
          .select()
          .single()

        if (error) {
          console.error('Direct insert error:', error)
          throw new Error(error.message || 'Lỗi khi thêm ứng viên vào database')
        }

        console.log('Candidate added successfully via direct insert:', data)
        candidateAdded = true
        
        // Since we're doing direct insert, we might need to manually trigger the realtime update
        // The realtime subscription should handle this automatically, but let's add a small delay
        // to ensure the UI updates
        setTimeout(() => {
          if (!candidates.some(c => c.id === data.id)) {
            console.log('Manually adding candidate to list (realtime might be delayed)')
            setCandidates(prev => [data, ...prev])
            setSuccess(`Đã thêm ứng viên "${data.full_name}" thành công!`)
          }
        }, 1000)
      }

      if (candidateAdded) {
        console.log('Candidate successfully added, waiting for realtime update...')
        // The realtime subscription will handle updating the UI
        // We don't manually update the candidates list here to avoid duplicates
      }
      
    } catch (err: unknown) {
      console.error('Error in handleAddCandidate:', err)
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
      console.log(`Updating candidate ${candidateId} status to ${newStatus}`)
      
      // Optimistic update
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === candidateId 
            ? { ...candidate, status: newStatus as any, updated_at: new Date().toISOString() }
            : candidate
        )
      )
      
      const { error } = await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', candidateId)

      if (error) {
        console.error('Error updating status:', error)
        // Revert optimistic update on error
        await fetchCandidates()
        throw error
      }
      
      console.log('Status updated successfully')
      
    } catch (err: unknown) {
      console.error('Error in handleUpdateStatus:', err)
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
      console.log(`Deleting candidate ${candidateId}`)
      
      // Find candidate for optimistic update
      const candidateToDelete = candidates.find(c => c.id === candidateId)
      
      // Optimistic update
      setCandidates(prev => prev.filter(candidate => candidate.id !== candidateId))
      
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId)

      if (error) {
        console.error('Error deleting candidate:', error)
        // Revert optimistic update on error
        if (candidateToDelete) {
          setCandidates(prev => [candidateToDelete, ...prev])
        }
        throw error
      }
      
      console.log('Candidate deleted successfully')
      
    } catch (err: unknown) {
      console.error('Error in handleDeleteCandidate:', err)
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
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vui lòng đăng nhập</h2>
          <p className="text-gray-600">Bạn cần đăng nhập để truy cập trang này</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Success Toast */}
        {success && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
              <button 
                onClick={() => setSuccess(null)}
                className="ml-4 text-white hover:text-gray-200 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-white hover:text-gray-200 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm ứng viên..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ color: '#1a202c', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ color: '#1a202c', backgroundColor: '#ffffff' }}
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

            {/* Stats */}
            <div className="text-sm font-medium text-gray-600">
              {filteredCandidates.length} / {stats.total} ứng viên
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column - Form and Stats */}
          <div className="xl:col-span-1 space-y-8">
            {/* Add Candidate Form */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Thêm ứng viên mới</h2>
              </div>
              <CandidateForm 
                onSubmit={handleAddCandidate} 
                loading={addingCandidate}
              />
            </div>

            {/* Statistics */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Thống kê</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Tổng số</span>
                  <span className="font-bold text-2xl text-gray-900">{stats.total}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">Mới</span>
                  <span className="font-bold text-2xl text-blue-600">{stats.new}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-700 font-medium">Phỏng vấn</span>
                  <span className="font-bold text-2xl text-yellow-600">{stats.interviewing}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="text-green-700 font-medium">Đã tuyển</span>
                  <span className="font-bold text-2xl text-green-600">{stats.hired}</span>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="text-red-700 font-medium">Từ chối</span>
                  <span className="font-bold text-2xl text-red-600">{stats.rejected}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div className="space-y-3">
                <button
                  onClick={fetchCandidates}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                >
                  <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Đang tải...' : 'Làm mới danh sách'}
                </button>
                <button
                  onClick={clearFilters}
                  disabled={!searchQuery && statusFilter === 'all'}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Candidates List */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Danh sách ứng viên ({filteredCandidates.length})
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Quản lý và theo dõi tiến trình ứng viên
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Realtime indicator */}
                    <div className="flex items-center text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Live
                    </div>
                    <button
                      onClick={fetchCandidates}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                    >
                      <svg className={`w-4 h-4 mr-2 inline ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {loading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Loading indicator for adding candidate */}
              {addingCandidate && (
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center text-blue-700">
                    <svg className="w-5 h-5 mr-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="font-medium">Đang thêm ứng viên mới...</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">Danh sách sẽ tự động cập nhật khi hoàn thành</p>
                </div>
              )}
              
              {/* Candidates List */}
              <CandidateList 
                candidates={filteredCandidates}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteCandidate}
                loading={loading}
              />
              
              {/* Empty state when filtered */}
              {!loading && candidates.length > 0 && filteredCandidates.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <div className="mb-4">
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy ứng viên</h3>
                  <p className="text-gray-500 mb-4">Không có ứng viên nào phù hợp với bộ lọc hiện tại.</p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 space-y-2">
              <div className="flex items-center justify-center space-x-4">
                <span>Version 1.0.0</span>
                <span>•</span>
                <span>User: {user.email}</span>
                <span>•</span>
                <span>Tổng ứng viên: {stats.total}</span>
              </div>
              <p className="text-gray-400">
                © 2025 Candidate Management System - Realtime Updates Enabled
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard