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

const DIMENSION_COLORS = {
  'Cognitive': 'bg-blue-500',
  'Moral-Affective': 'bg-pink-500',
  'Cultural-Social': 'bg-purple-500',
  'Embodied-Existential': 'bg-orange-500',
  'Relational': 'bg-violet-500',
}

function ScoreBar({ label, value, maxValue = 10, color }) {
  const percentage = (value / maxValue) * 100
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-slate-600">{value.toFixed(1)}</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function SimilarityPill({ label, value, className = '' }) {
  const pct = (value * 100).toFixed(0)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label} {pct}%
    </span>
  )
}

function DimensionBar({ name, similarity }) {
  const pct = similarity * 100
  const color = DIMENSION_COLORS[name] || 'bg-slate-400'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600 w-28 truncate" title={name}>{name}</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

function MatchCard({ match, rank }) {
  const dimensions = match.dimensions || {}
  const strengths = (match.shared_strengths || []).slice(0, 4)
  const differences = (match.key_differences || []).slice(0, 3)

  return (
    <div className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
            rank === 0 ? 'bg-yellow-500' :
            rank === 1 ? 'bg-slate-400' :
            rank === 2 ? 'bg-amber-600' :
            'bg-slate-300'
          }`}>
            {rank + 1}
          </span>
          <div>
            <h3 className="font-semibold">{match.figure_name}</h3>
            <p className="text-sm text-slate-600 line-clamp-1">{match.bio_short}</p>
          </div>
        </div>
        <span className="text-xl font-bold text-indigo-600 whitespace-nowrap ml-2">
          {(match.overall_similarity * 100).toFixed(0)}%
        </span>
      </div>

      {/* Similarity pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <SimilarityPill label="Overall" value={match.overall_similarity} className="bg-indigo-100 text-indigo-700" />
        <SimilarityPill label="Core" value={match.core_similarity} className="bg-blue-100 text-blue-700" />
        <SimilarityPill label="Heinlein" value={match.heinlein_similarity} className="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Dimension bars */}
      <div className="space-y-1 mb-3">
        {DIMENSION_NAMES.map(dim => (
          <DimensionBar key={dim} name={dim} similarity={dimensions[dim] || 0} />
        ))}
      </div>

      {/* Shared strengths */}
      {strengths.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {strengths.map(s => (
            <span key={s.trait} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {s.trait}
            </span>
          ))}
        </div>
      )}

      {/* Key differences */}
      {differences.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {differences.map(d => (
            <span key={d.trait} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {d.trait} ({d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)})
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          to={`/compare/${match.figure_slug}`}
          className="text-sm px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Compare
        </Link>
        <Link
          to={`/figures/${match.figure_slug}`}
          className="text-sm px-3 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
        >
          View Profile
        </Link>
      </div>
    </div>
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
          getLatestMatches(10)
        ])

        if (!assessmentData) {
          setError('No assessment found. Take the assessment first.')
        } else {
          setAssessment(assessmentData)
          setMatches(matchesData)
        }
      } catch (err) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading results...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-yellow-50 text-yellow-800 p-6 rounded-xl text-center">
          <p className="mb-4">{error}</p>
          <Link
            to="/assessment"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Take Assessment
          </Link>
        </div>
      </div>
    )
  }

  const { trait_scores_0_3, dimension_averages_0_10, heinlein_averages, overall } = assessment

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Your Results</h1>
      <p className="text-slate-600 mb-8">
        Assessment completed on {new Date(assessment.created_at).toLocaleDateString()}
      </p>

      {/* Overall Scores */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl">
          <h3 className="text-lg opacity-90 mb-1">Overall</h3>
          <p className="text-4xl font-bold">{overall?.Overall_Normalized_Equal_Avg?.toFixed(1) || '—'}</p>
          <p className="text-sm opacity-75 mt-1">out of 10</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-6 rounded-xl">
          <h3 className="text-lg opacity-90 mb-1">Core 5D</h3>
          <p className="text-4xl font-bold">{overall?.Core_5D_Avg?.toFixed(1) || '—'}</p>
          <p className="text-sm opacity-75 mt-1">out of 10</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-6 rounded-xl">
          <h3 className="text-lg opacity-90 mb-1">Competency</h3>
          <p className="text-4xl font-bold">{overall?.General_Competency_Avg_10scale?.toFixed(1) || '—'}</p>
          <p className="text-sm opacity-75 mt-1">out of 10</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Core Dimensions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Core Dimensions</h2>
          {dimension_averages_0_10 && DIMENSION_NAMES
            .map(name => (
              <ScoreBar
                key={name}
                label={name}
                value={dimension_averages_0_10[name] ?? 0}
                color="bg-indigo-500"
              />
            ))}
        </div>

        {/* Heinlein Competencies */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Heinlein Competencies</h2>
          <div className="max-h-64 overflow-y-auto pr-2">
            {trait_scores_0_3 && HEINLEIN_TRAIT_NAMES
              .filter(name => trait_scores_0_3[name] != null)
              .map(name => (
                <ScoreBar
                  key={name}
                  label={name}
                  value={trait_scores_0_3[name]}
                  maxValue={3}
                  color="bg-emerald-500"
                />
              ))}
          </div>
        </div>
      </div>

      {/* Historical Matches */}
      {matches?.top_matches && matches.top_matches.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Historical Matches</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {matches.top_matches.map((match, idx) => (
              <MatchCard key={match.figure_slug} match={match} rank={idx} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          to="/assessment"
          className="inline-block border border-indigo-600 text-indigo-600 px-6 py-2 rounded-lg hover:bg-indigo-50"
        >
          Retake Assessment
        </Link>
      </div>
    </div>
  )
}
