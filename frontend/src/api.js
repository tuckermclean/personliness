const API_BASE = '/api'

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('access_token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  })

  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      })

      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        localStorage.setItem('access_token', data.access)
        headers['Authorization'] = `Bearer ${data.access}`
        return fetch(`${API_BASE}${url}`, { ...options, headers })
      }
    }

    // Clear tokens and redirect to login
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('username')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  return response
}

export async function getQuestions() {
  const response = await fetchWithAuth('/questions/')
  if (!response.ok) throw new Error('Failed to fetch questions')
  return response.json()
}

export async function submitAssessment(answers) {
  const response = await fetchWithAuth('/assessments/', {
    method: 'POST',
    body: JSON.stringify({ answers })
  })
  if (!response.ok) throw new Error('Failed to submit assessment')
  return response.json()
}

export async function getLatestAssessment() {
  const response = await fetchWithAuth('/assessments/latest/')
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to fetch assessment')
  return response.json()
}

export async function getLatestMatches(top = 10) {
  const response = await fetchWithAuth(`/matches/latest/?top=${top}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to fetch matches')
  return response.json()
}

export async function getFigures(search = '', sort = 'overall', dir = 'desc') {
  const params = new URLSearchParams({ search, sort, dir })
  const response = await fetchWithAuth(`/figures/?${params}`)
  if (!response.ok) throw new Error('Failed to fetch figures')
  return response.json()
}

export async function getFigure(slug) {
  const response = await fetchWithAuth(`/figures/${slug}/`)
  if (!response.ok) throw new Error('Failed to fetch figure')
  return response.json()
}
