import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await signup(username, email, password)
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
            Create Account
          </h1>
          <p className="text-center text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
            Begin your historical self-discovery
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
            {[
              { label: 'Username', type: 'text', value: username, setter: setUsername },
              { label: 'Email', type: 'email', value: email, setter: setEmail },
              { label: 'Password', type: 'password', value: password, setter: setPassword },
              { label: 'Confirm Password', type: 'password', value: confirmPassword, setter: setConfirmPassword },
            ].map(({ label, type, value, setter }) => (
              <div key={label}>
                <label
                  className="block text-xs font-medium uppercase tracking-[0.06em] mb-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="input"
                  required
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-6"
              style={{ justifyContent: 'center' }}
            >
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
