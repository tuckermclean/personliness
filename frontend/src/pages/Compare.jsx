import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getComparison } from '../api'

const DIMENSION_NAMES = ['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential', 'Relational']

const CORE_DIMENSIONS = {
  'Cognitive': [
    'Strategic Intelligence',
    'Ethical / Philosophical Insight',
    'Creative / Innovative Thinking',
    'Administrative / Legislative Skill',
  ],
  'Moral-Affective': [
    'Compassion / Empathy',
    'Courage / Resilience',
    'Justice Orientation',
    'Moral Fallibility & Growth',
  ],
  'Cultural-Social': [
    'Leadership / Influence',
    'Institution-Building',
    'Impact Legacy',
    'Archetype Resonance',
    'Relatability / Cultural Embeddedness',
  ],
  'Embodied-Existential': [
    'Physical Endurance / Skill',
    'Hardship Tolerance',
    'Joy / Play / Aesthetic Appreciation',
    'Mortality Acceptance',
    'Paradox Integration',
  ],
  'Relational': [
    'Spousal / Partner Quality',
    'Parental / Mentoring Quality',
    'Relational Range',
  ],
}

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

const DIMENSION_COLORS = {
  'Cognitive':            'var(--dim-cognitive)',
  'Moral-Affective':      'var(--dim-moral)',
  'Cultural-Social':      'var(--dim-cultural)',
  'Embodied-Existential': 'var(--dim-embodied)',
  'Relational':           'var(--dim-relational)',
}

const DIMENSION_HEX = {
  'Cognitive':            '#5B9BD5',
  'Moral-Affective':      '#C2657A',
  'Cultural-Social':      '#9B72CF',
  'Embodied-Existential': '#D4824A',
  'Relational':           '#7B88CC',
}

// Radar Chart with draw animation
function RadarChart({ userDimensions, figureDimensions }) {
  const figurePolyRef = useRef()
  const userPolyRef = useRef()
  const size = 300
  const cx = size / 2
  const cy = size / 2
  const maxR = 115
  const gridLevels = [2.5, 5.0, 7.5, 10.0]
  const n = DIMENSION_NAMES.length

  function polarToXY(index, value) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const r = (value / 10) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  function polygonPoints(values) {
    return DIMENSION_NAMES
      .map((dim, i) => {
        const { x, y } = polarToXY(i, values[dim] || 0)
        return `${x},${y}`
      })
      .join(' ')
  }

  const shortLabels = {
    'Cognitive':            'Cognitive',
    'Moral-Affective':      'Moral-Aff.',
    'Cultural-Social':      'Cultural-Soc.',
    'Embodied-Existential': 'Embodied-Ext.',
    'Relational':           'Relational',
  }

  // Draw animation via stroke-dashoffset
  useEffect(() => {
    const fp = figurePolyRef.current
    const up = userPolyRef.current
    if (!fp || !up) return

    const fLen = fp.getTotalLength()
    const uLen = up.getTotalLength()

    fp.style.strokeDasharray = fLen
    fp.style.strokeDashoffset = fLen
    fp.style.transition = 'none'

    up.style.strokeDasharray = uLen
    up.style.strokeDashoffset = uLen
    up.style.transition = 'none'

    // Force reflow
    fp.getBoundingClientRect()
    up.getBoundingClientRect()

    fp.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)'
    fp.style.strokeDashoffset = '0'

    up.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1) 0.25s'
    up.style.strokeDashoffset = '0'
  }, [figureDimensions, userDimensions])

  const figurePoints = polygonPoints(figureDimensions)
  const userPoints = polygonPoints(userDimensions)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto" overflow="visible">
      {/* Grid circles */}
      {gridLevels.map(level => (
        <circle
          key={level}
          cx={cx} cy={cy}
          r={(level / 10) * maxR}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="1"
        />
      ))}

      {/* Grid labels */}
      {gridLevels.map(level => (
        <text key={`lbl-${level}`} x={cx + 3} y={cy - (level / 10) * maxR + 3} fontSize="8" fill="var(--text-tertiary)">
          {level}
        </text>
      ))}

      {/* Axis lines */}
      {DIMENSION_NAMES.map((_, i) => {
        const { x, y } = polarToXY(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--surface-3)" strokeWidth="1" />
      })}

      {/* Overlap glow */}
      <polygon
        points={figurePoints}
        fill="rgba(255,255,255,0.04)"
        stroke="none"
      />

      {/* Figure polygon (draws first) — orange, warm */}
      <polygon
        ref={figurePolyRef}
        points={figurePoints}
        fill="var(--dim-embodied)"
        fillOpacity="0"
        stroke="var(--dim-embodied)"
        strokeWidth="2"
        style={{ animation: 'radar-fill-figure 0.4s ease-out 1.1s both' }}
      />

      {/* User polygon (draws second) — blue, cool */}
      <polygon
        ref={userPolyRef}
        points={userPoints}
        fill="var(--dim-cognitive)"
        fillOpacity="0"
        stroke="var(--dim-cognitive)"
        strokeWidth="2"
        style={{ animation: 'radar-fill-user 0.4s ease-out 1.35s both' }}
      />

      {/* Data points */}
      {DIMENSION_NAMES.map((dim, i) => {
        const fp = polarToXY(i, figureDimensions[dim] || 0)
        const up = polarToXY(i, userDimensions[dim] || 0)
        return (
          <g key={dim}>
            <circle cx={fp.x} cy={fp.y} r="3" fill="var(--dim-embodied)" />
            <circle cx={up.x} cy={up.y} r="3" fill="var(--dim-cognitive)" />
          </g>
        )
      })}

      {/* Axis labels */}
      {DIMENSION_NAMES.map((dim, i) => {
        const { x, y } = polarToXY(i, 13)
        const anchor = x < cx - 10 ? 'end' : x > cx + 10 ? 'start' : 'middle'
        return (
          <text
            key={`ax-${dim}`}
            x={x} y={y}
            fontSize="10"
            fill={DIMENSION_HEX[dim]}
            textAnchor={anchor}
            fontWeight="600"
          >
            {shortLabels[dim]}
          </text>
        )
      })}
    </svg>
  )
}

function TraitCompareBar({ trait, userScore, figureScore, maxValue = 3 }) {
  const uPct = (userScore / maxValue) * 100
  const fPct = (figureScore / maxValue) * 100
  const delta = userScore - figureScore
  const showDelta = Math.abs(delta) >= 0.5
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="truncate mr-2" style={{ color: 'var(--text-secondary)' }}>{trait}</span>
        <span className="text-xs whitespace-nowrap font-mono flex items-center gap-1.5">
          <span style={{ color: 'var(--dim-cognitive)' }}>{userScore.toFixed(1)}</span>
          {' / '}
          <span style={{ color: 'var(--dim-embodied)' }}>{figureScore.toFixed(1)}</span>
          {showDelta && (
            <span
              className="px-1 py-0.5 text-[10px] font-medium"
              style={{
                background: delta > 0 ? 'rgba(91,155,213,0.15)' : 'rgba(212,130,74,0.15)',
                color: delta > 0 ? 'var(--dim-cognitive)' : 'var(--dim-embodied)',
                borderRadius: '2px',
              }}
            >
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <div className="flex gap-1">
        <div className="flex-1 score-track">
          <div
            className="score-fill"
            style={{ '--bar-target': `${uPct}%`, animationDelay: '0.15s', background: 'var(--dim-cognitive)' }}
          />
        </div>
        <div className="flex-1 score-track">
          <div
            className="score-fill"
            style={{ '--bar-target': `${fPct}%`, animationDelay: '0.15s', background: 'var(--dim-embodied)' }}
          />
        </div>
      </div>
    </div>
  )
}

function SimilarityCard({ label, value, color }) {
  return (
    <div
      className="p-5"
      style={{
        background: `${color}14`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '2px',
      }}
    >
      <p className="font-mono font-medium" style={{ fontSize: '2rem', color, lineHeight: 1 }}>
        {(value * 100).toFixed(1)}%
      </p>
      <p className="text-xs uppercase tracking-[0.06em] mt-1" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
    </div>
  )
}

export default function Compare() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const result = await getComparison(slug)
        setData(result)
      } catch {
        setError('Failed to load comparison. Make sure you have completed an assessment.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--surface-3)', borderTopColor: 'var(--accent)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading comparison…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="p-6 text-center" style={{ background: '#C2657A12', borderRadius: '2px' }}>
          <p className="mb-4" style={{ color: '#C2657A' }}>{error || 'Comparison not available'}</p>
          <Link to="/results" style={{ color: 'var(--accent)' }}>Back to results</Link>
        </div>
      </div>
    )
  }

  const { figure, user, match } = data
  const userDim = user.dimension_averages_0_10 || {}
  const figureDim = figure.dimension_averages_0_10 || {}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Nav */}
      <div className="flex gap-4 mb-6 text-sm">
        <Link to="/results" style={{ color: 'var(--accent)' }}>← Back to results</Link>
        <Link to={`/figures/${slug}`} style={{ color: 'var(--accent)' }}>View full profile</Link>
      </div>

      {/* Header */}
      <div className="card mb-8" style={{ borderLeft: '3px solid var(--accent-figure)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1
              className="figure-name font-light"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {figure.name}
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{figure.bio_short}</p>
          </div>
          <div className="text-right">
            <p className="font-mono font-medium" style={{ fontSize: '2.5rem', color: 'var(--accent)', lineHeight: 1 }}>
              {(match.overall_similarity * 100).toFixed(0)}%
            </p>
            <p className="text-xs uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>overall match</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mb-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: 'var(--dim-cognitive)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>You</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-2 rounded-sm inline-block" style={{ background: 'var(--dim-embodied)' }} />
          <span className="figure-name font-light" style={{ color: 'var(--text-secondary)' }}>{figure.name}</span>
        </span>
      </div>

      {/* Radar + similarity cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2
            className="figure-name font-medium text-center mb-4"
            style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}
          >
            Core Dimensions
          </h2>
          <RadarChart userDimensions={userDim} figureDimensions={figureDim} />
        </div>

        <div className="flex flex-col gap-4 justify-center">
          <SimilarityCard label="Overall Similarity" value={match.overall_similarity} color="var(--accent)" />
          <SimilarityCard label="Core 5D Similarity" value={match.core_similarity} color="var(--dim-cognitive)" />
          <SimilarityCard label="Heinlein Competency" value={match.heinlein_similarity} color="var(--dim-competency)" />
        </div>
      </div>

      {/* Core traits by dimension */}
      <div className="mb-8">
        <h2
          className="figure-name font-medium mb-4"
          style={{ fontSize: '1.875rem', color: 'var(--text-primary)' }}
        >
          Core Traits
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          {DIMENSION_NAMES.map(dim => {
            const dimSim = match.dimensions?.[dim]
            return (
              <div
                key={dim}
                className="card"
                style={{ borderLeft: `3px solid ${DIMENSION_HEX[dim]}` }}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3
                    className="figure-name font-medium"
                    style={{ fontSize: '1.1rem', color: DIMENSION_HEX[dim] }}
                  >
                    {dim}
                  </h3>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {dimSim != null ? `${(dimSim * 100).toFixed(0)}% match` : '—'}
                  </span>
                </div>
                {CORE_DIMENSIONS[dim].map(trait => (
                  <TraitCompareBar
                    key={trait}
                    trait={trait}
                    userScore={user.trait_scores_0_3?.[trait] || 0}
                    figureScore={figure.trait_scores_0_3?.[trait] || 0}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Heinlein traits */}
      <div className="mb-8">
        <h2
          className="figure-name font-medium mb-4"
          style={{ fontSize: '1.875rem', color: 'var(--text-primary)' }}
        >
          Heinlein Competencies
        </h2>
        <div className="card">
          <div className="grid md:grid-cols-2 gap-x-8">
            {HEINLEIN_TRAIT_NAMES.map(trait => (
              <TraitCompareBar
                key={trait}
                trait={trait}
                userScore={user.trait_scores_0_3?.[trait] || 0}
                figureScore={figure.trait_scores_0_3?.[trait] || 0}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Shared strengths & differences */}
      <div className="grid md:grid-cols-2 gap-5 mb-8">
        {match.shared_strengths?.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid #4BA888' }}>
            <h3
              className="figure-name font-medium mb-1"
              style={{ color: '#4BA888', fontSize: '1.1rem' }}
            >
              Shared Strengths
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Traits where you both score 2.0+ out of 3
            </p>
            <div className="flex flex-wrap gap-2">
              {match.shared_strengths.map(s => (
                <span
                  key={s.trait}
                  className="text-sm px-3 py-1 font-medium"
                  style={{ background: '#4BA88818', color: '#4BA888', borderRadius: '2px' }}
                >
                  {s.trait}
                  <span className="ml-1 text-xs opacity-75">({s.avg.toFixed(1)})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {match.key_differences?.length > 0 && (
          <div className="card" style={{ borderLeft: '3px solid var(--dim-embodied)' }}>
            <h3
              className="figure-name font-medium mb-1"
              style={{ color: 'var(--dim-embodied)', fontSize: '1.1rem' }}
            >
              Key Differences
            </h3>
            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Traits with 1.0+ point gap
            </p>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--dim-cognitive)' }} />
                You score higher
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--dim-embodied)' }} />
                They score higher
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {match.key_differences.map(d => (
                <span
                  key={d.trait}
                  className="text-sm px-3 py-1 font-medium"
                  style={{
                    background: d.delta > 0 ? 'rgba(91,155,213,0.1)' : 'rgba(212,130,74,0.1)',
                    color: d.delta > 0 ? 'var(--dim-cognitive)' : 'var(--dim-embodied)',
                    borderRadius: '2px',
                  }}
                >
                  {d.trait}
                  <span className="ml-1 text-xs opacity-75">({d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex gap-4 justify-center">
        <Link to="/results" className="btn-secondary">Back to results</Link>
        <Link to={`/figures/${slug}`} className="btn-primary">View full profile</Link>
      </div>
    </div>
  )
}
