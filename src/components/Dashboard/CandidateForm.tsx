import React, { useState } from 'react'
import { CandidateFormData } from '../../types'

interface CandidateFormProps {
  onSubmit: (data: CandidateFormData) => Promise<void>
  loading?: boolean
}

const CandidateForm: React.FC<CandidateFormProps> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    applied_position: '',
    status: 'New' as const
  })
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    
    // Validate file type
    if (selectedFile && !selectedFile.type.includes('pdf') && 
        !selectedFile.type.includes('doc') && 
        !selectedFile.type.includes('docx')) {
      alert('Vui lòng upload file PDF hoặc Word')
      return
    }
    
    // Validate file size (5MB max)
    if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
      alert('Kích thước file phải nhỏ hơn 5MB')
      return
    }
    
    setFile(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name.trim() || !formData.applied_position.trim()) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({
        ...formData,
        file
      })
      
      // Reset form
      setFormData({
        full_name: '',
        applied_position: '',
        status: 'New'
      })
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('resume') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      console.error('Lỗi khi thêm ứng viên:', error)
      alert('Có lỗi xảy ra khi thêm ứng viên')
    } finally {
      setSubmitting(false)
    }
  }

  const isLoading = loading || submitting

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
          Tên đầy đủ *
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          placeholder="Nhập tên đầy đủ của ứng viên"
        />
      </div>

      <div>
        <label htmlFor="applied_position" className="block text-sm font-medium text-gray-700 mb-1">
          Vị trí ứng tuyển *
        </label>
        <input
          type="text"
          id="applied_position"
          name="applied_position"
          value={formData.applied_position}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          placeholder="VD: Frontend Developer"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Trạng thái
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="New">Mới</option>
          <option value="Interviewing">Phỏng vấn</option>
          <option value="Hired">Đã tuyển</option>
          <option value="Rejected">Từ chối</option>
        </select>
      </div>

      <div>
        <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-1">
          CV/Hồ sơ
        </label>
        <input
          type="file"
          id="resume"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Định dạng hỗ trợ: PDF, DOC, DOCX (Tối đa 5MB)
        </p>
        {file && (
          <p className="text-sm text-green-600 mt-1">
            Đã chọn: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang thêm ứng viên...
          </span>
        ) : (
          'Thêm ứng viên'
        )}
      </button>
    </form>
  )
}

export default CandidateForm