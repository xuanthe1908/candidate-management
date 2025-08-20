import { useAuth } from '../../contexts/AuthContext'

interface HeaderProps {
  title?: string
  subtitle?: string
  showUserInfo?: boolean
}

const Header = ({ 
  title = "Quản lý Ứng viên", 
  subtitle = "Hệ thống quản lý hồ sơ ứng viên",
  showUserInfo = true 
}: HeaderProps) => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      try {
        await signOut()
      } catch (error) {
        console.error('Lỗi khi đăng xuất:', error)
        alert('Có lỗi xảy ra khi đăng xuất')
      }
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          {/* Left side - Title */}
          <div className="flex items-center space-x-4">
            {/* Logo/Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            
            {/* Title and subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right side - User info and actions */}
          {showUserInfo && user && (
            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="hidden sm:block text-right">
                <p className="text-sm text-gray-600">Xin chào,</p>
                <p className="font-medium text-gray-900 truncate max-w-xs">
                  {user.email}
                </p>
              </div>

              {/* User avatar */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header