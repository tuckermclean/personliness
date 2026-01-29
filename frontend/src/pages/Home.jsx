import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-slate-900 mb-6">
          Discover Your Inner
          <span className="text-indigo-600"> Historical Figure</span>
        </h1>

        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Take a comprehensive personality assessment based on core dimensions
          and practical competencies, then find which historical figures share
          your traits.
        </p>

        <div className="flex justify-center gap-4">
          {user ? (
            <Link
              to="/assessment"
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition"
            >
              Take Assessment
            </Link>
          ) : (
            <Link
              to="/signup"
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700 transition"
            >
              Get Started
            </Link>
          )}
          <Link
            to="/figures"
            className="border border-slate-300 text-slate-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-50 transition"
          >
            Browse Figures
          </Link>
        </div>
      </div>

      <div className="mt-24 grid md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Core Dimensions</h3>
          <p className="text-slate-600">
            Assess your strategic intelligence, leadership, compassion, and courage
            - the four fundamental personality dimensions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Practical Competencies</h3>
          <p className="text-slate-600">
            Measure your general competency across 20+ practical skills from
            navigation to medical aid to culinary arts.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Historical Matches</h3>
          <p className="text-slate-600">
            Discover which historical figures share your personality profile
            using cosine similarity matching.
          </p>
        </div>
      </div>
    </div>
  )
}
