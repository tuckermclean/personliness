import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFigure, getLatestAssessment } from '../api'
import { useAuth } from '../context/AuthContext'

const DIM_CSS_VARS = {
  'Cognitive':            'var(--dim-cognitive)',
  'Moral-Affective':      'var(--dim-moral)',
  'Cultural-Social':      'var(--dim-cultural)',
  'Embodied-Existential': 'var(--dim-embodied)',
  'Relational':           'var(--dim-relational)',
}

function AnimatedScoreBar({ label, value, maxValue = 3, color, delay = 0, italic = false }) {
  const ref = useRef()
  const [inView, setInView] = useState(false)
  const pct = (value / maxValue) * 100

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1" style={{ fontSize: '1rem' }}>
        <span
          className={italic ? 'figure-name font-light italic' : ''}
          style={{ color: 'var(--text-secondary)', fontSize: italic ? '0.95rem' : '0.875rem' }}
        >
          {label}
        </span>
        <span
          className="font-mono font-medium text-xs"
          style={{ color: 'var(--accent-figure)' }}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div ref={ref} className="score-track">
        <div
          className="score-fill"
          style={{
            '--bar-target': `${pct}%`,
            animationDelay: `${(80 + delay) / 1000}s`,
            animationPlayState: inView ? 'running' : 'paused',
            background: `linear-gradient(to right, ${color}, color-mix(in srgb, ${color} 60%, transparent))`,
          }}
        />
      </div>
    </div>
  )
}

function TraitCard({ name, data }) {
  const confColor = {
    High:   { bg: '#4BA88818', text: '#4BA888' },
    Medium: { bg: '#D4824A18', text: '#D4824A' },
    Low:    { bg: 'var(--surface-2)', text: 'var(--text-tertiary)' },
  }[data.confidence] || { bg: 'var(--surface-2)', text: 'var(--text-tertiary)' }

  return (
    <div className="p-3" style={{ background: 'var(--surface-2)', borderRadius: '2px' }}>
      <div className="flex justify-between items-start mb-1">
        <span
          className="figure-name font-light italic text-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          {name}
        </span>
        <span
          className="font-mono font-medium text-base ml-2 shrink-0"
          style={{ color: 'var(--accent-figure)' }}
        >
          {data.score_0_3}/3
        </span>
      </div>
      <p className="text-base mb-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {data.justification}
      </p>
      <span
        className="text-sm px-2 py-0.5 font-medium"
        style={{
          background: confColor.bg,
          color: confColor.text,
          borderRadius: '2px',
        }}
      >
        {data.confidence} confidence
      </span>
    </div>
  )
}

export default function FigureDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [figure, setFigure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('core')
  // null = loading, true = has assessment, false = no assessment
  const [hasAssessment, setHasAssessment] = useState(null)

  useEffect(() => {
    async function loadFigure() {
      try {
        const data = await getFigure(slug)
        setFigure(data)
      } catch {
        setError('Failed to load figure')
      } finally {
        setLoading(false)
      }
    }
    loadFigure()
  }, [slug])

  // Check assessment status only when logged in
  useEffect(() => {
    if (!user) return
    getLatestAssessment()
      .then(a => setHasAssessment(!!a))
      .catch(() => setHasAssessment(false))
  }, [user])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--surface-3)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    )
  }

  if (error || !figure) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="p-6 text-center" style={{ background: '#C2657A12', borderRadius: '2px' }}>
          <p style={{ color: '#C2657A' }}>{error || 'Figure not found'}</p>
          <Link to="/figures" className="text-sm mt-3 inline-block" style={{ color: 'var(--accent)' }}>
            Back to figures
          </Link>
        </div>
      </div>
    )
  }

  const scores = figure.score_json || {}
  const core = scores.core || {}
  const heinlein = scores.heinlein_competency || {}
  const dimensionAverages = core.dimension_averages_0_10 || {}
  const coreDimensions = ['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential', 'Relational']
    .filter(dim => core[dim])
  const heinleinCompetencies = Object.entries(heinlein)
    .filter(([, data]) => data && typeof data === 'object' && 'score_0_3' in data)

  // Aggregate all citations from score_json (deduplicated)
  const allCitations = (() => {
    const seen = new Set()
    const out = []
    const add = (list) => {
      if (!Array.isArray(list)) return
      list.forEach(c => { if (c && !seen.has(c) && !/no citation/i.test(c)) { seen.add(c); out.push(c) } })
    }
    Object.values(core).forEach(dimData => {
      if (typeof dimData !== 'object' || dimData === null) return
      Object.values(dimData).forEach(td => { if (td?.citations) add(td.citations) })
    })
    Object.values(heinlein).forEach(td => { if (td?.citations) add(td.citations) })
    return out.sort((a, b) => a.localeCompare(b))
  })()

  // 3-state CTA
  let compareButton = null
  if (!user) {
    compareButton = (
      <Link to="/signup" className="btn-secondary whitespace-nowrap">Sign in to compare</Link>
    )
  } else if (hasAssessment !== false) {
    // null (loading) shows optimistically as "Compare with me"
    compareButton = (
      <Link to={`/compare/${slug}`} className="btn-primary whitespace-nowrap">Compare with me</Link>
    )
  } else {
    compareButton = (
      <Link to="/assessment" className="btn-secondary whitespace-nowrap">Take assessment to compare</Link>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        to="/figures"
        className="text-sm uppercase tracking-[0.06em] font-medium mb-6 inline-block"
        style={{ color: 'var(--accent)' }}
      >
        ← Figures
      </Link>

      {/* Header card */}
      <div className="card mb-6 relative overflow-hidden" style={{ padding: 0 }}>
        <div className="flex flex-col sm:flex-row">

          {/* Left: all content */}
          <div style={{ flex: 1, minWidth: 0, padding: '1.5rem' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1
                className="figure-name font-light"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
              >
                {figure.name}
              </h1>
              {compareButton}
            </div>

            {figure.image && (
              <img
                src={figure.image}
                alt={figure.name}
                className="block sm:hidden mb-4 w-full"
                style={{ maxHeight: '300px', objectFit: 'contain', borderRadius: '2px' }}
              />
            )}

            {figure.bio_long && (
              <p className="text-base font-light mb-6" style={{ color: 'var(--text-secondary)' }}>
                {figure.bio_long.split('\n\n')[0]}
              </p>
            )}

            {/* Overall score tiles */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Overall', value: figure.overall_normalized_equal_avg_0_10, color: 'var(--accent)' },
                { label: 'Core 5D', value: figure.core_4d_avg_0_10, color: 'var(--dim-cognitive)' },
                { label: 'Competency', value: figure.general_competency_avg_0_10, color: 'var(--dim-competency)' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="text-center p-4"
                  style={{ background: 'var(--surface-2)', borderRadius: '2px', borderLeft: `3px solid ${color}` }}
                >
                  <p className="font-mono font-medium text-3xl" style={{ color }}>
                    {value?.toFixed(2) ?? '—'}
                  </p>
                  <p className="text-sm mt-1 uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: portrait image — natural aspect ratio, prominent */}
          {figure.image && (
            <div style={{ flexShrink: 0, width: '260px' }} className="hidden sm:block">
              <img
                src={figure.image}
                alt={figure.name}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '2px' }}
              />
            </div>
          )}
        </div>

        <div style={{ padding: '0 1.5rem 1.5rem' }}>
        {scores.summary && (
          <p className="text-base font-light mb-5" style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            {scores.summary}
          </p>
        )}
        {figure.bio_long && figure.bio_long.split('\n\n').slice(1).map((paragraph, i) => (
          <p
            key={i}
            className="mb-5"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '1.0625rem',
              lineHeight: 1.75,
              maxWidth: '68ch',
              color: 'var(--text-secondary)',
            }}
          >
            {paragraph}
          </p>
        ))}
        </div>{/* end padded content below flex row */}
      </div>

      {/* Tab bar */}
      <div
        className="flex mb-6"
        style={{ borderBottom: '1px solid var(--surface-3)' }}
      >
        {[
          { key: 'core', label: 'Core Dimensions' },
          { key: 'heinlein', label: 'Heinlein Competencies' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-5 py-3 text-base font-medium uppercase tracking-[0.06em] transition-all"
            style={{
              color: activeTab === key ? 'var(--accent)' : 'var(--text-tertiary)',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Core Dimensions Tab */}
      {activeTab === 'core' && (
        <div className="space-y-6">
          {/* Dimension averages */}
          <div className="card">
            <h2
              className="figure-name font-medium mb-4"
              style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}
            >
              Dimension Averages
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential', 'Relational'].map((key, i) => (
                <AnimatedScoreBar
                  key={key}
                  label={key}
                  value={dimensionAverages[key] ?? 0}
                  maxValue={10}
                  color={DIM_CSS_VARS[key] || 'var(--accent)'}
                  delay={i * 60}
                />
              ))}
            </div>
          </div>

          {/* Individual dimension cards */}
          {coreDimensions.map((dimName) => (
            <div
              key={dimName}
              className="card"
              style={{ borderLeft: `3px solid ${DIM_CSS_VARS[dimName] || 'var(--accent)'}` }}
            >
              <h2
                className="figure-name font-medium mb-4"
                style={{ fontSize: '1.375rem', color: DIM_CSS_VARS[dimName] || 'var(--text-primary)' }}
              >
                {dimName}
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(core[dimName]).map(([traitName, traitData]) => (
                  <TraitCard key={traitName} name={traitName} data={traitData} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heinlein Tab */}
      {activeTab === 'heinlein' && (
        <div className="card">
          <h2
            className="figure-name font-medium mb-4"
            style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}
          >
            Practical Competencies
          </h2>

          {heinlein.averages && (
            <div
              className="p-4 mb-6 grid grid-cols-2 gap-4 text-center"
              style={{ background: 'var(--surface-2)', borderRadius: '2px', borderLeft: '3px solid var(--dim-competency)' }}
            >
              <div>
                <p className="font-mono font-medium text-2xl" style={{ color: 'var(--dim-competency)' }}>
                  {heinlein.averages.General_Competency_Avg_0_3?.toFixed(2)}
                </p>
                <p className="text-xs mt-1 uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                  Average (0–3)
                </p>
              </div>
              <div>
                <p className="font-mono font-medium text-2xl" style={{ color: 'var(--dim-competency)' }}>
                  {heinlein.averages.General_Competency_Avg_10scale?.toFixed(2)}
                </p>
                <p className="text-xs mt-1 uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                  Average (0–10)
                </p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {heinleinCompetencies.map(([name, data]) => (
              <TraitCard key={name} name={name} data={data} />
            ))}
          </div>
        </div>
      )}

      {/* Sources — alphabetical, at the bottom */}
      {(allCitations.length > 0 || figure.source_notes) && (
        <div className="mt-8 p-5" style={{ background: 'var(--surface-1)', borderRadius: '2px', border: '1px solid var(--surface-3)' }}>
          <h2
            className="text-sm font-medium uppercase tracking-[0.06em] mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sources
          </h2>
          {allCitations.length > 0 && (
            <ul className="space-y-1 mb-3">
              {allCitations.map((c, i) => (
                <li key={i} className="figure-name text-base" style={{ fontStyle: 'italic' }}>
                  <a
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(c)}${import.meta.env.VITE_AMAZON_TAG ? `&tag=${import.meta.env.VITE_AMAZON_TAG}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textDecorationColor: 'var(--surface-3)', textUnderlineOffset: '3px' }}
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {figure.source_notes && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {figure.source_notes.startsWith('http') ? (
                <a href={figure.source_notes} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                  {figure.source_notes}
                </a>
              ) : figure.source_notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
