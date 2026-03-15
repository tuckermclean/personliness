import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getLatestAssessment, getLatestMatches } from '../api'

const DIMENSION_NAMES = ['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential', 'Relational']

const HEINLEIN_TRAIT_NAMES = [
  'Caregiving & Nurture', 'Strategic Planning & Command',
  'Animal & Food Processing', 'Navigation & Wayfinding',
  'Construction & Fabrication', 'Artistic & Cultural Expression',
  'Numerical & Analytical Reasoning', 'Manual Craft & Repair',
  'Medical Aid & Emergency Response', 'Leadership & Followership',
  'Agricultural & Resource Management', 'Culinary Skill',
  'Combat & Defense', 'Technical & Systemic Problem-Solving',
  'Existential Composure',
]

const DIM_COLORS = {
  'Cognitive':            'var(--dim-cognitive)',
  'Moral-Affective':      'var(--dim-moral)',
  'Cultural-Social':      'var(--dim-cultural)',
  'Embodied-Existential': 'var(--dim-embodied)',
  'Relational':           'var(--dim-relational)',
}

function AnimatedBar({ value, maxValue = 10, color, delay = 0 }) {
  const pct = (value / maxValue) * 100
  return (
    <div className="score-track">
      <div
        className="score-fill"
        style={{
          '--bar-target': `${pct}%`,
          animationDelay: `${(100 + delay) / 1000}s`,
          background: `linear-gradient(to right, ${color}, color-mix(in srgb, ${color} 60%, transparent))`,
        }}
      />
    </div>
  )
}

function ScoreRow({ label, value, maxValue = 10, color, delay }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="font-mono text-xs font-medium" style={{ color: 'var(--accent-figure)' }}>
          {value.toFixed(2)}
        </span>
      </div>
      <AnimatedBar value={value} maxValue={maxValue} color={color} delay={delay} />
    </div>
  )
}

function DimensionBar({ name, similarity, delay }) {
  const pct = similarity * 100
  const color = DIM_COLORS[name] || 'var(--accent)'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-28 truncate" title={name} style={{ color: 'var(--text-tertiary)' }}>{name}</span>
      <div className="flex-1 score-track" style={{ height: '6px' }}>
        <div
          className="score-fill"
          style={{
            '--bar-target': `${pct}%`,
            animationDelay: `${(150 + delay) / 1000}s`,
            background: `linear-gradient(to right, ${color}, color-mix(in srgb, ${color} 60%, transparent))`,
          }}
        />
      </div>
      <span className="font-mono text-xs w-8 text-right" style={{ color: 'var(--text-tertiary)' }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function CountUp({ target, duration = 1200 }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf
    function step(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return <>{value}</>
}

function MatchCard({ match, rank, isTop }) {
  const dimensions = match.dimensions || {}
  const strengths = (match.shared_strengths || []).slice(0, 4)
  const differences = (match.key_differences || []).slice(0, 3)
  const overallPct = Math.round(match.overall_similarity * 100)

  if (isTop) {
    return (
      <div
        className="card col-span-full animate-fade-up"
        style={{
          borderLeft: '3px solid var(--accent)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Rank badge */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 flex items-center justify-center font-mono font-medium text-sm animate-ring-pulse"
              style={{
                background: 'var(--accent)',
                color: 'var(--surface-0)',
                borderRadius: '50%',
              }}
            >
              1
            </span>
            <div>
              <h3
                className="figure-name text-2xl font-light"
                style={{ color: 'var(--text-primary)' }}
              >
                {match.figure_name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {match.bio_short}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="font-mono font-medium"
              style={{ fontSize: '2.5rem', color: 'var(--accent)', lineHeight: 1 }}
            >
              <CountUp target={overallPct} />%
            </p>
            <p className="text-xs uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
              overall match
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <SimilarityPill label="Core" value={match.core_similarity} color="var(--dim-cognitive)" />
          <SimilarityPill label="Heinlein" value={match.heinlein_similarity} color="var(--dim-competency)" />
        </div>

        <div className="space-y-1 mb-4">
          {DIMENSION_NAMES.map((dim, i) => (
            <DimensionBar key={dim} name={dim} similarity={dimensions[dim] || 0} delay={i * 60} />
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Link to={`/compare/${match.figure_slug}`} className="btn-primary">Compare</Link>
          <Link to={`/figures/${match.figure_slug}`} className="btn-secondary">View Profile</Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="card"
      style={{ borderLeft: '3px solid var(--surface-3)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 flex items-center justify-center font-mono text-sm font-medium"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-tertiary)',
              borderRadius: '50%',
            }}
          >
            {rank + 1}
          </span>
          <div>
            <h3 className="figure-name text-lg font-light" style={{ color: 'var(--text-primary)' }}>
              {match.figure_name}
            </h3>
            <p className="text-sm line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
              {match.bio_short}
            </p>
          </div>
        </div>
        <span className="font-mono font-medium text-xl ml-2 whitespace-nowrap" style={{ color: 'var(--accent-figure)' }}>
          {overallPct}%
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <SimilarityPill label="Overall" value={match.overall_similarity} color="var(--accent)" />
        <SimilarityPill label="Core" value={match.core_similarity} color="var(--dim-cognitive)" />
        <SimilarityPill label="Heinlein" value={match.heinlein_similarity} color="var(--dim-competency)" />
      </div>

      <div className="space-y-1 mb-3">
        {DIMENSION_NAMES.map((dim, i) => (
          <DimensionBar key={dim} name={dim} similarity={dimensions[dim] || 0} delay={i * 40} />
        ))}
      </div>

      {strengths.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {strengths.map(s => (
            <span key={s.trait} className="text-xs px-2 py-0.5 font-medium" style={{ background: '#4BA88818', color: '#4BA888', borderRadius: '2px' }}>
              {s.trait}
            </span>
          ))}
        </div>
      )}

      {differences.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {differences.map(d => (
            <span key={d.trait} className="text-xs px-2 py-0.5 font-medium" style={{ background: '#D4824A18', color: '#D4824A', borderRadius: '2px' }}>
              {d.trait} ({d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)})
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Link to={`/compare/${match.figure_slug}`} className="btn-primary" style={{ padding: '0.375rem 0.875rem' }}>
          Compare
        </Link>
        <Link to={`/figures/${match.figure_slug}`} className="btn-secondary" style={{ padding: '0.375rem 0.875rem' }}>
          View Profile
        </Link>
      </div>
    </div>
  )
}

function SimilarityPill({ label, value, color }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium font-mono"
      style={{ background: `${color}18`, color, borderRadius: '2px' }}
    >
      {label} {(value * 100).toFixed(0)}%
    </span>
  )
}

export default function Results() {
  const [assessment, setAssessment] = useState(null)
  const [matches, setMatches] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadResults() {
      try {
        const [assessmentData, matchesData] = await Promise.all([
          getLatestAssessment(),
          getLatestMatches(10),
        ])
        if (!assessmentData) {
          setError('No assessment found. Take the assessment first.')
        } else {
          setAssessment(assessmentData)
          setMatches(matchesData)
        }
      } catch {
        setError('Failed to load results')
      } finally {
        setLoading(false)
      }
    }
    loadResults()
  }, [])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--surface-3)', borderTopColor: 'var(--accent)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading results…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="p-6 text-center" style={{ background: '#D4824A12', borderRadius: '2px' }}>
          <p className="mb-4" style={{ color: '#D4824A' }}>{error}</p>
          <Link to="/assessment" className="btn-primary">Take Assessment</Link>
        </div>
      </div>
    )
  }

  const { trait_scores_0_3, dimension_averages_0_10, overall } = assessment

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1
        className="figure-name font-normal mb-1"
        style={{ fontSize: '2.75rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
      >
        Your Results
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-tertiary)' }}>
        Assessment completed on {new Date(assessment.created_at).toLocaleDateString()}
      </p>

      {/* Overall score tiles */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Overall', value: overall?.Overall_Normalized_Equal_Avg, color: 'var(--accent)' },
          { label: 'Core 5D', value: overall?.Core_5D_Avg, color: 'var(--dim-cognitive)' },
          { label: 'Competency', value: overall?.General_Competency_Avg_10scale, color: 'var(--dim-competency)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="p-6"
            style={{ background: 'var(--surface-1)', borderRadius: '2px', borderLeft: `3px solid ${color}` }}
          >
            <p className="text-xs uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            <p className="font-mono font-medium" style={{ fontSize: '2.5rem', color, lineHeight: 1 }}>
              {value?.toFixed(2) ?? '—'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>out of 10</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Core Dimensions */}
        <div className="card">
          <h2 className="figure-name font-medium mb-4" style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}>
            Core Dimensions
          </h2>
          {dimension_averages_0_10 && DIMENSION_NAMES.map((name, i) => (
            <ScoreRow
              key={name}
              label={name}
              value={dimension_averages_0_10[name] ?? 0}
              color={DIM_COLORS[name] || 'var(--accent)'}
              delay={i * 60}
            />
          ))}
        </div>

        {/* Heinlein Competencies */}
        <div className="card">
          <h2 className="figure-name font-medium mb-4" style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}>
            Heinlein Competencies
          </h2>
          <div className="max-h-72 overflow-y-auto pr-2">
            {trait_scores_0_3 && HEINLEIN_TRAIT_NAMES
              .filter(name => trait_scores_0_3[name] != null)
              .map((name, i) => (
                <ScoreRow
                  key={name}
                  label={name}
                  value={trait_scores_0_3[name]}
                  maxValue={3}
                  color="var(--dim-competency)"
                  delay={i * 40}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Historical Matches */}
      {matches?.top_matches && matches.top_matches.length > 0 && (
        <div>
          <h2
            className="figure-name font-medium mb-6"
            style={{ fontSize: '1.875rem', color: 'var(--text-primary)' }}
          >
            Your Historical Matches
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {matches.top_matches.map((match, idx) => (
              <MatchCard key={match.figure_slug} match={match} rank={idx} isTop={idx === 0} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/assessment" className="btn-secondary">Retake Assessment</Link>
      </div>
    </div>
  )
}
