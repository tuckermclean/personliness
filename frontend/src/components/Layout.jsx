import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Top accent gradient line */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(to right, var(--dim-cognitive), var(--dim-moral), var(--dim-cultural), var(--dim-embodied), var(--dim-relational))' }}
      />

      <header
        className="sticky top-0 z-40 transition-all duration-200"
        style={{
          background: scrolled ? 'var(--surface-0)' : 'var(--surface-0)',
          borderBottom: `1px solid ${scrolled ? 'var(--surface-3)' : 'transparent'}`,
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="figure-name text-2xl font-light tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Personliness
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/figures"
              className="text-sm font-medium uppercase tracking-[0.06em] transition-colors"
              style={{ color: isActive('/figures') ? 'var(--accent)' : 'var(--text-secondary)' }}
            >
              Figures
            </Link>

            {user ? (
              <>
                <Link
                  to="/assessment"
                  className="text-sm font-medium uppercase tracking-[0.06em] transition-colors"
                  style={{ color: isActive('/assessment') || isActive('/results') ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Assessment
                </Link>
                <span style={{ color: 'var(--surface-3)' }}>|</span>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium uppercase tracking-[0.06em] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium uppercase tracking-[0.06em] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-sharp transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer
        className="py-6"
        style={{ borderTop: '1px solid var(--surface-3)' }}
      >
        <div className="max-w-6xl mx-auto px-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span className="figure-name">Personliness</span>
          {' '}— Discover your personality through the lens of history
        </div>
      </footer>
    </div>
  )
}
