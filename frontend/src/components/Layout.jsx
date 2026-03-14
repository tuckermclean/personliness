import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            Personliness
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/figures" className="text-slate-600 hover:text-slate-900">
              Figures
            </Link>

            {user ? (
              <>
                <Link to="/assessment" className="text-slate-600 hover:text-slate-900">
                  Assessment
                </Link>
                <span className="text-slate-500">|</span>
                <span className="text-slate-600">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
          Personliness - Discover your personality through the lens of history
        </div>
      </footer>
    </div>
  )
}
