import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const navLinkStyle = (path) => ({
    color: isActive(path) ? 'var(--accent)' : 'var(--text-secondary)',
  })

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
          background: 'var(--surface-0)',
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

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/figures"
              className="text-sm font-medium uppercase tracking-[0.06em] transition-colors"
              style={navLinkStyle('/figures')}
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

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile drawer */}
        {menuOpen && (
          <div
            className="md:hidden"
            style={{ borderTop: '1px solid var(--surface-3)', background: 'var(--surface-0)' }}
          >
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
              <Link
                to="/figures"
                className="text-sm font-medium uppercase tracking-[0.06em]"
                style={navLinkStyle('/figures')}
              >
                Figures
              </Link>

              {user ? (
                <>
                  <Link
                    to="/assessment"
                    className="text-sm font-medium uppercase tracking-[0.06em]"
                    style={{ color: isActive('/assessment') || isActive('/results') ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    Assessment
                  </Link>
                  <div style={{ height: '1px', background: 'var(--surface-3)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user.username}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium uppercase tracking-[0.06em] text-left"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium uppercase tracking-[0.06em]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Login
                  </Link>
                  <Link to="/signup" className="btn-primary self-start">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
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
