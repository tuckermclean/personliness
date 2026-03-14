import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getComparison } from '../api'

const DIMENSION_NAMES = ['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential']

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
    'Ambition / Self-Assertion',
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
  'Cognitive': '#3b82f6',
  'Moral-Affective': '#ec4899',
  'Cultural-Social': '#a855f7',
  'Embodied-Existential': '#f97316',
}

// --- Radar Chart (inline SVG, no library) ---
function RadarChart({ userDimensions, figureDimensions }) {
  const size = 300
  const cx = size / 2
  const cy = size / 2
  const maxR = 120
  const gridLevels = [2.5, 5.0, 7.5, 10.0]
  const axes = DIMENSION_NAMES
  const n = axes.length

  function polarToXY(index, value) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const r = (value / 10) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  function polygonPoints(values) {
    return axes
      .map((dim, i) => {
        const { x, y } = polarToXY(i, values[dim] || 0)
        return `${x},${y}`
      })
      .join(' ')
  }

  // Short labels
  const shortLabels = {
    'Cognitive': 'Cognitive',
    'Moral-Affective': 'Moral-Aff.',
    'Cultural-Social': 'Cultural-Soc.',
    'Embodied-Existential': 'Embodied-Ext.',
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
      {/* Grid circles */}
      {gridLevels.map(level => {
        const r = (level / 10) * maxR
        return (
          <circle key={level} cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="1" />
        )
      })}

      {/* Grid level labels */}
      {gridLevels.map(level => {
        const r = (level / 10) * maxR
        return (
          <text key={`label-${level}`} x={cx + 3} y={cy - r + 3} fontSize="8" fill="#94a3b8">
            {level}
          </text>
        )
      })}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const { x, y } = polarToXY(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1" />
      })}

      {/* Figure polygon */}
      <polygon
        points={polygonPoints(figureDimensions)}
        fill="rgba(245, 158, 11, 0.15)"
        stroke="#f59e0b"
        strokeWidth="2"
      />

      {/* User polygon */}
      <polygon
        points={polygonPoints(userDimensions)}
        fill="rgba(99, 102, 241, 0.15)"
        stroke="#6366f1"
        strokeWidth="2"
      />

      {/* Data points */}
      {axes.map((dim, i) => {
        const fp = polarToXY(i, figureDimensions[dim] || 0)
        const up = polarToXY(i, userDimensions[dim] || 0)
        return (
          <g key={dim}>
            <circle cx={fp.x} cy={fp.y} r="3" fill="#f59e0b" />
            <circle cx={up.x} cy={up.y} r="3" fill="#6366f1" />
          </g>
        )
      })}

      {/* Axis labels */}
      {axes.map((dim, i) => {
        const { x, y } = polarToXY(i, 12.2)
        const anchor = x < cx - 10 ? 'end' : x > cx + 10 ? 'start' : 'middle'
        return (
          <text key={`ax-${dim}`} x={x} y={y} fontSize="10" fill={DIMENSION_COLORS[dim]} textAnchor={anchor} fontWeight="600">
            {shortLabels[dim]}
          </text>
        )
      })}
    </svg>
  )
}

// --- Side-by-side trait bar ---
function TraitCompareBar({ trait, userScore, figureScore, maxValue = 3 }) {
  const uPct = (userScore / maxValue) * 100
  const fPct = (figureScore / maxValue) * 100
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700 truncate mr-2">{trait}</span>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          <span className="text-indigo-600">{userScore.toFixed(1)}</span>
          {' / '}
          <span className="text-amber-600">{figureScore.toFixed(1)}</span>
        </span>
      </div>
      <div className="flex gap-1">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${uPct}%` }} />
        </div>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fPct}%` }} />
        </div>
      </div>
    </div>
  )
}

function SimilarityCard({ label, value, gradient }) {
  const pct = (value * 100).toFixed(1)
  return (
    <div className={`p-4 rounded-xl text-white ${gradient}`}>
      <p className="text-3xl font-bold">{pct}%</p>
      <p className="text-sm opacity-90">{label}</p>
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
      } catch (err) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading comparison...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center">
          <p className="mb-4">{error || 'Comparison not available'}</p>
          <Link to="/results" className="text-indigo-600 hover:underline">Back to results</Link>
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
        <Link to="/results" className="text-indigo-600 hover:underline">Back to results</Link>
        <Link to={`/figures/${slug}`} className="text-indigo-600 hover:underline">View full profile</Link>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{figure.name}</h1>
            <p className="text-slate-600 mt-1">{figure.bio_short}</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-indigo-600">{(match.overall_similarity * 100).toFixed(0)}%</p>
            <p className="text-sm text-slate-500">overall match</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-500"></span> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span> {figure.name}
        </span>
      </div>

      {/* Radar + Similarity Cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-center">Core Dimensions</h2>
          <RadarChart userDimensions={userDim} figureDimensions={figureDim} />
        </div>

        <div className="grid grid-cols-1 gap-4 content-center">
          <SimilarityCard label="Overall Similarity" value={match.overall_similarity} gradient="bg-gradient-to-br from-indigo-500 to-purple-600" />
          <SimilarityCard label="Core 4D Similarity" value={match.core_similarity} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" />
          <SimilarityCard label="Heinlein Competency Similarity" value={match.heinlein_similarity} gradient="bg-gradient-to-br from-emerald-500 to-teal-500" />
        </div>
      </div>

      {/* Core Traits by Dimension */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Core Traits</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {DIMENSION_NAMES.map(dim => {
            const dimSim = match.dimensions?.[dim]
            const dimPct = dimSim != null ? (dimSim * 100).toFixed(0) : '—'
            return (
              <div key={dim} className="bg-white p-5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold" style={{ color: DIMENSION_COLORS[dim] }}>{dim}</h3>
                  <span className="text-sm text-slate-500">{dimPct}% match</span>
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

      {/* Heinlein Traits */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Heinlein Competencies</h2>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
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

      {/* Shared Strengths & Key Differences */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {match.shared_strengths?.length > 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-green-700 mb-3">Shared Strengths</h3>
            <p className="text-sm text-slate-600 mb-3">Traits where you both score 2.0+ out of 3</p>
            <div className="flex flex-wrap gap-2">
              {match.shared_strengths.map(s => (
                <span key={s.trait} className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-700">
                  {s.trait}
                  <span className="ml-1 text-xs opacity-75">({s.avg.toFixed(1)})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {match.key_differences?.length > 0 && (
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-amber-700 mb-3">Key Differences</h3>
            <p className="text-sm text-slate-600 mb-3">Traits with 1.0+ point gap (positive = you score higher)</p>
            <div className="flex flex-wrap gap-2">
              {match.key_differences.map(d => (
                <span key={d.trait} className={`text-sm px-3 py-1 rounded-full ${
                  d.delta > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                }`}>
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
        <Link
          to="/results"
          className="px-6 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
        >
          Back to results
        </Link>
        <Link
          to={`/figures/${slug}`}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          View full profile
        </Link>
      </div>
    </div>
  )
}
