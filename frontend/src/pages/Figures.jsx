import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getFigures } from '../api'

const DIM_COLORS = ['#5B9BD5', '#C2657A', '#9B72CF', '#D4824A', '#7B88CC', '#4BA888']

function slugHash(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) - h) + slug.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function dimColorForSlug(slug) {
  return DIM_COLORS[slugHash(slug) % DIM_COLORS.length]
}

function eraWarmCool(slug) {
  return slugHash(slug) % 2 === 0
    ? 'rgba(154, 123, 79, 0.06)'
    : 'rgba(91, 155, 213, 0.06)'
}

function FigureCard({ figure, sortKey }) {
  const [hovered, setHovered] = useState(false)
  const dimColor = dimColorForSlug(figure.slug)
  const tint = eraWarmCool(figure.slug)

  return (
    <Link
      to={`/figures/${figure.slug}`}
      className="block relative dim-card"
      style={{
        borderLeftColor: dimColor,
        background: hovered ? `var(--surface-2)` : 'var(--surface-1)',
        border: '1px solid var(--surface-3)',
        borderLeft: `3px solid ${dimColor}`,
        borderRadius: '2px',
        padding: '1.5rem',
        transition: 'background 0.2s ease, border-left-width 0.15s ease, box-shadow 0.2s ease',
        ...(hovered && {
          borderLeftWidth: '5px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          background: `color-mix(in srgb, var(--surface-2) 92%, ${tint})`,
        }),
        textDecoration: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <h3
        className="figure-name text-xl font-medium mb-1 transition-transform duration-150"
        style={{
          color: 'var(--text-primary)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        {figure.name}
      </h3>
      <p
        className="text-sm mb-4 line-clamp-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        {figure.bio_short}
      </p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <ScorePill
          label="Overall"
          value={figure.overall_normalized_equal_avg_0_10}
          active={sortKey === 'overall'}
        />
        <ScorePill
          label="Core"
          value={figure.core_4d_avg_0_10}
          active={sortKey === 'core'}
        />
        <ScorePill
          label="Competency"
          value={figure.general_competency_avg_0_10}
          active={sortKey === 'heinlein'}
        />
      </div>
    </Link>
  )
}

function ScorePill({ label, value, active }) {
  return (
    <div
      className="p-2"
      style={{
        background: active ? `var(--accent)18` : 'var(--surface-2)',
        borderRadius: '2px',
      }}
    >
      <p
        className="font-mono font-medium text-base"
        style={{ color: active ? 'var(--accent)' : 'var(--accent-figure)' }}
      >
        {value?.toFixed(2) ?? '—'}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
    </div>
  )
}

export default function Figures() {
  const [figures, setFigures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('overall')
  const [dir, setDir] = useState('desc')

  useEffect(() => {
    async function loadFigures() {
      setLoading(true)
      try {
        const data = await getFigures(search, sort, dir)
        setFigures(data)
      } catch {
        setError('Failed to load figures')
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(loadFigures, 300)
    return () => clearTimeout(t)
  }, [search, sort, dir])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1
        className="figure-name font-normal mb-1"
        style={{ fontSize: '2.75rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
      >
        Historical Figures
      </h1>
      <p className="mb-8 text-base font-light" style={{ color: 'var(--text-secondary)' }}>
        Browse and compare personality profiles of historical figures
      </p>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search figures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
          >
            <option value="overall">Overall Score</option>
            <option value="core">Core Dimensions</option>
            <option value="heinlein">General Competency</option>
          </select>
          <button
            onClick={() => setDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="btn-secondary"
          >
            {dir === 'desc' ? '↓ High' : '↑ Low'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="p-4 mb-6 text-sm"
          style={{ background: '#C2657A18', color: '#C2657A', borderRadius: '2px' }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: 'var(--surface-3)', borderTopColor: 'var(--accent)' }}
          />
          <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading figures…</p>
        </div>
      ) : figures.length === 0 ? (
        <div
          className="text-center py-12"
          style={{ background: 'var(--surface-1)', borderRadius: '2px' }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>No figures found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {figures.map(figure => (
            <FigureCard key={figure.slug} figure={figure} sortKey={sort} />
          ))}
        </div>
      )}
    </div>
  )
}
