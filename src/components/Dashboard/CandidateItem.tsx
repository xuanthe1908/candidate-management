import { Candidate } from '../../types'

interface CandidateItemProps {
  candidate: Candidate
  onUpdateStatus: (candidateId: string, newStatus: string) => Promise<void>
  onDelete: (candidateId: string) => Promise<void>
}

const CandidateItem = ({ candidate, onUpdateStatus, onDelete }: CandidateItemProps) => {
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onUpdateStatus(candidate.id, newStatus)
    } catch {
      alert('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`Bạn có chắc muốn xóa ứng viên "${candidate.full_name}"?`)) {
      try {
        await onDelete(candidate.id)
      } catch {
        alert('Có lỗi xảy ra khi xóa ứng viên')
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0">
      <div className="flex items-start justify-between">
        {/* Left side - Main info */}
        <div className="flex-1 min-w-0">
          {/* Name and Status Row */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {candidate.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {candidate.full_name}
              </h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                {getStatusText(candidate.status)}
              </span>
            </div>
          </div>
          
          {/* Position */}
          <div className="mb-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Vị trí ứng tuyển:</span>{' '}
              <span className="text-gray-900">{candidate.applied_position}</span>
            </p>
          </div>
          
          {/* Application Date */}
          <div className="mb-3">
            <p className="text-xs text-gray-500">
              <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Ứng tuyển lúc: {formatDate(candidate.created_at)}
            </p>
            {candidate.updated_at !== candidate.created_at && (
              <p className="text-xs text-gray-500 mt-1">
                <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Cập nhật lần cuối: {formatDate(candidate.updated_at)}
              </p>
            )}
          </div>

          {/* Resume Link */}
          {candidate.resume_url && (
            <div className="mb-4">
              <a
                href={candidate.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Xem CV/Hồ sơ
              </a>
            </div>
          )}

          {/* Status Update Controls */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">
              Cập nhật trạng thái:
            </label>
            <select
              value={candidate.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="New">Mới</option>
              <option value="Interviewing">Phỏng vấn</option>
              <option value="Hired">Đã tuyển</option>
              <option value="Rejected">Từ chối</option>
            </select>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-start space-x-2 ml-6">
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            title="Xóa ứng viên"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CandidateItem