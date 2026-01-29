import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getFigures } from '../api'

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
      } catch (err) {
        setError('Failed to load figures')
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(loadFigures, 300)
    return () => clearTimeout(debounce)
  }, [search, sort, dir])

  const getSortLabel = () => {
    switch (sort) {
      case 'core': return 'Core Dimensions'
      case 'heinlein': return 'General Competency'
      default: return 'Overall Score'
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Historical Figures</h1>
      <p className="text-slate-600 mb-8">
        Browse and compare personality profiles of historical figures
      </p>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search figures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="overall">Overall Score</option>
            <option value="core">Core Dimensions</option>
            <option value="heinlein">General Competency</option>
          </select>

          <button
            onClick={() => setDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {dir === 'desc' ? '↓ High to Low' : '↑ Low to High'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading figures...</p>
        </div>
      ) : figures.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <p className="text-slate-600">No figures found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {figures.map(figure => (
            <Link
              key={figure.slug}
              to={`/figures/${figure.slug}`}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold mb-2">{figure.name}</h3>
              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {figure.bio_short}
              </p>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className={`p-2 rounded ${sort === 'overall' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                  <p className="font-bold text-indigo-600">
                    {figure.overall_normalized_equal_avg_0_10?.toFixed(1) || '—'}
                  </p>
                  <p className="text-xs text-slate-500">Overall</p>
                </div>
                <div className={`p-2 rounded ${sort === 'core' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                  <p className="font-bold text-blue-600">
                    {figure.core_4d_avg_0_10?.toFixed(1) || '—'}
                  </p>
                  <p className="text-xs text-slate-500">Core</p>
                </div>
                <div className={`p-2 rounded ${sort === 'heinlein' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                  <p className="font-bold text-emerald-600">
                    {figure.general_competency_avg_0_10?.toFixed(1) || '—'}
                  </p>
                  <p className="text-xs text-slate-500">Competency</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
