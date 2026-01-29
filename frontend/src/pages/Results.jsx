import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getLatestAssessment, getLatestMatches } from '../api'

const CORE_DIMENSIONS = [
  { key: 'strategic_intelligence', label: 'Strategic Intelligence', color: 'bg-blue-500' },
  { key: 'leadership_influence', label: 'Leadership / Influence', color: 'bg-purple-500' },
  { key: 'compassion_empathy', label: 'Compassion / Empathy', color: 'bg-pink-500' },
  { key: 'courage_resilience', label: 'Courage / Resilience', color: 'bg-orange-500' },
]

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
          getLatestMatches(5)
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

  const { dimension_averages_0_10, heinlein_averages, overall } = assessment

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Your Results</h1>
      <p className="text-slate-600 mb-8">
        Assessment completed on {new Date(assessment.created_at).toLocaleDateString()}
      </p>

      {/* Overall Scores */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-xl">
          <h3 className="text-lg opacity-90 mb-1">Overall Score</h3>
          <p className="text-4xl font-bold">{overall?.overall_normalized_equal_avg_0_10?.toFixed(1) || '—'}</p>
          <p className="text-sm opacity-75 mt-1">out of 10</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-6 rounded-xl">
          <h3 className="text-lg opacity-90 mb-1">Core Dimensions</h3>
          <p className="text-4xl font-bold">{overall?.core_4d_avg_0_10?.toFixed(1) || '—'}</p>
          <p className="text-sm opacity-75 mt-1">out of 10</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-6 rounded-xl">
          <h3 className="text-lg opacity-90 mb-1">General Competency</h3>
          <p className="text-4xl font-bold">{overall?.general_competency_avg_0_10?.toFixed(1) || '—'}</p>
          <p className="text-sm opacity-75 mt-1">out of 10</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* Core Dimensions */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Core Dimensions</h2>
          {dimension_averages_0_10?.core_4d && Object.entries(dimension_averages_0_10.core_4d).map(([key, value]) => (
            <ScoreBar
              key={key}
              label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              value={value}
              color="bg-indigo-500"
            />
          ))}
        </div>

        {/* Heinlein Competencies */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Practical Competencies</h2>
          <div className="max-h-64 overflow-y-auto pr-2">
            {heinlein_averages && Object.entries(heinlein_averages).slice(0, 10).map(([key, value]) => (
              <ScoreBar
                key={key}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={value}
                color="bg-emerald-500"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Historical Matches */}
      {matches?.top_matches && matches.top_matches.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Your Historical Matches</h2>
          <div className="space-y-4">
            {matches.top_matches.map((match, idx) => (
              <Link
                key={match.slug}
                to={`/figures/${match.slug}`}
                className="block p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      idx === 0 ? 'bg-yellow-500' :
                      idx === 1 ? 'bg-slate-400' :
                      idx === 2 ? 'bg-amber-600' :
                      'bg-slate-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{match.figure}</h3>
                      <p className="text-sm text-slate-600 line-clamp-1">{match.bio_short}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-indigo-600">
                      {(match.similarity * 100).toFixed(1)}%
                    </span>
                    <p className="text-xs text-slate-500">similarity</p>
                  </div>
                </div>
              </Link>
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
