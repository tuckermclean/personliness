import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFigure } from '../api'

const isLoggedIn = () => !!localStorage.getItem('access_token')

function ScoreBar({ label, value, maxValue = 3, color = 'bg-indigo-500' }) {
  const percentage = (value / maxValue) * 100
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-600">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function TraitCard({ name, data }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <div className="flex justify-between items-start mb-1">
        <span className="font-medium text-sm">{name}</span>
        <span className="text-indigo-600 font-bold">{data.score_0_3}/3</span>
      </div>
      <p className="text-xs text-slate-600 mb-1">{data.justification}</p>
      <span className={`text-xs px-2 py-0.5 rounded ${
        data.confidence === 'High' ? 'bg-green-100 text-green-700' :
        data.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
        'bg-slate-100 text-slate-600'
      }`}>
        {data.confidence} confidence
      </span>
    </div>
  )
}

export default function FigureDetail() {
  const { slug } = useParams()
  const [figure, setFigure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('core')

  useEffect(() => {
    async function loadFigure() {
      try {
        const data = await getFigure(slug)
        setFigure(data)
      } catch (err) {
        setError('Failed to load figure')
      } finally {
        setLoading(false)
      }
    }
    loadFigure()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    )
  }

  if (error || !figure) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center">
          <p>{error || 'Figure not found'}</p>
          <Link to="/figures" className="text-indigo-600 hover:underline mt-2 inline-block">
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

  // Extract core dimensions (Cognitive, Moral-Affective, etc.)
  const coreDimensions = ['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential']
    .filter(dim => core[dim])

  // Extract heinlein competencies (excluding 'averages')
  const heinleinCompetencies = Object.entries(heinlein)
    .filter(([key]) => key !== 'averages')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/figures" className="text-indigo-600 hover:underline mb-4 inline-block">
        ← Back to figures
      </Link>

      {/* Header */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{figure.name}</h1>
            <p className="text-lg text-slate-600">{figure.bio_short}</p>
          </div>
          {isLoggedIn() && (
            <Link
              to={`/compare/${slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
            >
              Compare with me
            </Link>
          )}
        </div>

        {/* Overall Scores */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg">
            <p className="text-3xl font-bold">
              {figure.overall_normalized_equal_avg_0_10?.toFixed(1)}
            </p>
            <p className="text-sm opacity-90">Overall</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg">
            <p className="text-3xl font-bold">
              {figure.core_4d_avg_0_10?.toFixed(1)}
            </p>
            <p className="text-sm opacity-90">Core 5D</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-lg">
            <p className="text-3xl font-bold">
              {figure.general_competency_avg_0_10?.toFixed(1)}
            </p>
            <p className="text-sm opacity-90">Competency</p>
          </div>
        </div>

        {/* Summary */}
        {scores.summary && (
          <div className="bg-slate-50 p-4 rounded-lg mb-6">
            <p className="text-slate-700 italic">{scores.summary}</p>
          </div>
        )}

        {/* Bio */}
        <div className="prose max-w-none">
          <p className="text-slate-700 whitespace-pre-line">{figure.bio_long}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('core')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'core'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Core Dimensions
        </button>
        <button
          onClick={() => setActiveTab('heinlein')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'heinlein'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Heinlein Competencies
        </button>
      </div>

      {/* Core Dimensions Tab */}
      {activeTab === 'core' && (
        <div className="space-y-6">
          {/* Dimension Averages */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="text-xl font-semibold mb-4">Dimension Averages (0-10)</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {['Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential', 'Relational'].map(key => (
                <ScoreBar
                  key={key}
                  label={key}
                  value={dimensionAverages[key] ?? 0}
                  maxValue={10}
                  color="bg-indigo-500"
                />
              ))}
            </div>
          </div>

          {/* Individual Dimensions */}
          {coreDimensions.map(dimName => (
            <div key={dimName} className="bg-white p-6 rounded-xl border border-slate-200">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  dimName === 'Cognitive' ? 'bg-blue-500' :
                  dimName === 'Moral-Affective' ? 'bg-pink-500' :
                  dimName === 'Cultural-Social' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`}></span>
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

      {/* Heinlein Competencies Tab */}
      {activeTab === 'heinlein' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Practical Competencies (Heinlein Scale)</h2>

          {/* Averages */}
          {heinlein.averages && (
            <div className="bg-emerald-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {heinlein.averages.General_Competency_Avg_0_3?.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600">Average (0-3)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {heinlein.averages.General_Competency_Avg_10scale?.toFixed(1)}
                  </p>
                  <p className="text-sm text-slate-600">Average (0-10)</p>
                </div>
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

      {/* Source Notes */}
      {figure.source_notes && (
        <div className="bg-slate-50 p-6 rounded-xl mt-8">
          <h2 className="text-lg font-semibold mb-2">Sources</h2>
          <p className="text-sm text-slate-600 whitespace-pre-line">{figure.source_notes}</p>
        </div>
      )}
    </div>
  )
}
