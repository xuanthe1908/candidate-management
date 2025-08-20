import { Candidate } from '../../types'
import CandidateItem from './CandidateItem'

interface CandidateListProps {
  candidates: Candidate[]
  onUpdateStatus: (candidateId: string, newStatus: string) => Promise<void>
  onDelete: (candidateId: string) => Promise<void>
  loading?: boolean
}

const CandidateList = ({ candidates, onUpdateStatus, onDelete, loading = false }: CandidateListProps) => {
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Đang tải danh sách ứng viên...</p>
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
        <CandidateItem
          key={candidate.id}
          candidate={candidate}
          onUpdateStatus={onUpdateStatus}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default CandidateList