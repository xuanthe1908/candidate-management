import React from 'react'
import { Candidate } from '../../types'

interface CandidateListProps {
  candidates: Candidate[]
  onUpdateStatus: (candidateId: string, newStatus: string) => Promise<void>
  onDelete: (candidateId: string) => Promise<void>
  loading?: boolean
}

const CandidateList: React.FC<CandidateListProps> = ({ 
  candidates, 
  onUpdateStatus, 
  onDelete,
  loading = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800'
      case 'Interviewing': return 'bg-yellow-100 text-yellow-800'
      case 'Hired': return 'bg-green-100 text-green-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'New': return 'Mới'
      case 'Interviewing': return 'Phỏng vấn'
      case 'Hired': return 'Đã tuyển'
      case 'Rejected': return 'Từ chối'
      default: return status
    }
  }

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await onUpdateStatus(candidateId, newStatus)
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error)
      alert('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleDelete = async (candidateId: string, candidateName: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa ứng viên "${candidateName}"?`)) {
      try {
        await onDelete(candidateId)
      } catch (error) {
        console.error('Lỗi khi xóa ứng viên:', error)
        alert('Có lỗi xảy ra khi xóa ứng viên')
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2">Đang tải danh sách ứng viên...</span>
        </div>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Chưa có ứng viên nào</h3>
        <p>Hãy thêm ứng viên đầu tiên bằng form bên trái.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {candidates.map((candidate) => (
        <div key={candidate.id} className="p-6 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {candidate.full_name}
                </h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                  {getStatusText(candidate.status)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Vị trí:</span> {candidate.applied_position}
              </p>
              
              <p className="text-xs text-gray-500 mb-3">
                Ứng tuyển: {new Date(candidate.created_at).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>

              {candidate.resume_url && (
                <a
                  href={candidate.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-3 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Xem CV
                </a>
              )}

              {/* Status Update Controls */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Cập nhật trạng thái:</label>
                <select
                  value={candidate.status}
                  onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="New">Mới</option>
                  <option value="Interviewing">Phỏng vấn</option>
                  <option value="Hired">Đã tuyển</option>
                  <option value="Rejected">Từ chối</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleDelete(candidate.id, candidate.full_name)}
                className="text-red-600 hover:text-red-800 p-1 transition-colors"
                title="Xóa ứng viên"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CandidateList