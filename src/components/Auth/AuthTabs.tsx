interface AuthTabsProps {
  isLogin: boolean
  onToggle: (isLogin: boolean) => void
}

const AuthTabs = ({ isLogin, onToggle }: AuthTabsProps) => {
  return (
    <div className="flex mb-6">
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
          isLogin
            ? 'border-blue-500 text-blue-600 bg-blue-50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Đăng nhập
      </button>
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
          !isLogin
            ? 'border-green-500 text-green-600 bg-green-50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        Đăng ký
      </button>
    </div>
  )
}

export default AuthTabs