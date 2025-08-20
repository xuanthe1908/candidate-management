import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthTabs from '../components/Auth/AuthTabs'
import LoginForm from '../components/Auth/LoginForm'
import SignupForm from '../components/Auth/SignupForm'

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { signIn, signUp } = useAuth()

  const handleAuth = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        setMessage('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Có lỗi xảy ra')
      } else {
        setError('Có lỗi xảy ra')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTabToggle = (newIsLogin: boolean) => {
    setIsLogin(newIsLogin)
    setError(null)
    setMessage(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Hệ thống quản lý ứng viên
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đăng nhập hoặc tạo tài khoản để tiếp tục
          </p>
        </div>

        {/* Auth Tabs */}
        <AuthTabs isLogin={isLogin} onToggle={handleTabToggle} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {/* Auth Form */}
        <div className="mt-8">
          {isLogin ? (
            <LoginForm onSubmit={handleAuth} loading={loading} />
          ) : (
            <SignupForm onSubmit={handleAuth} loading={loading} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Demo Application - Hệ thống quản lý ứng viên</p>
          <p className="mt-1">Xây dựng với React + TypeScript + Supabase</p>
        </div>
      </div>
    </div>
  )
}

export default Auth