import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/assessment')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--surface-0)' }}
    >
      <div className="w-full max-w-sm">
        <div className="card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h1
            className="figure-name font-light text-center mb-2"
            style={{ fontSize: '2rem', color: 'var(--text-primary)' }}
          >
            Welcome Back
          </h1>
          <p className="text-center text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
            Continue your journey through history
          </p>

          {error && (
            <div
              className="p-3 mb-6 text-sm"
              style={{ background: '#C2657A18', color: '#C2657A', borderRadius: '2px' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium uppercase tracking-[0.06em] mb-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium uppercase tracking-[0.06em] mb-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6"
              style={{ justifyContent: 'center' }}
            >
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--accent)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
