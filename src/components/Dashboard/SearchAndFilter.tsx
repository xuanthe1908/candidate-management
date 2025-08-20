import { useState } from 'react'

interface SearchAndFilterProps {
  onSearch: (query: string) => void
  onFilterStatus: (status: string) => void
  totalCount: number
}

const SearchAndFilter = ({ onSearch, onFilterStatus, totalCount }: SearchAndFilterProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value
    setSelectedStatus(status)
    onFilterStatus(status)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedStatus('all')
    onSearch('')
    onFilterStatus('all')
  }

  return (
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
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filter by status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
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
          {(searchQuery || selectedStatus !== 'all') && (
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
          <span className="font-medium">{totalCount}</span> ứng viên
        </div>
      </div>
    </div>
  )
}

export default SearchAndFilter