import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQuestions, submitAssessment } from '../api'

const LIKERT_OPTIONS = [
  { value: 0, label: 'Never', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
  { value: 1, label: 'Rarely', color: 'bg-orange-100 hover:bg-orange-200 border-orange-300' },
  { value: 2, label: 'Sometimes', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
  { value: 3, label: 'Often', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
]

export default function Assessment() {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const QUESTIONS_PER_PAGE = 5

  useEffect(() => {
    async function loadQuestions() {
      try {
        const data = await getQuestions()
        setQuestions(data)
      } catch (err) {
        setError('Failed to load questions')
      } finally {
        setLoading(false)
      }
    }
    loadQuestions()
  }, [])

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE)
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  )

  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const canGoNext = currentQuestions.every(q => answers[q.id] !== undefined)
  const isLastPage = currentPage === totalPages - 1
  const allAnswered = answeredCount === questions.length

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError('Please answer all questions before submitting')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await submitAssessment(answers)
      navigate('/results')
    } catch (err) {
      setError('Failed to submit assessment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading questions...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Personality Assessment</h1>
        <p className="text-slate-600">
          Answer each question based on how often you exhibit the behavior described.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>{answeredCount} of {questions.length} answered</span>
          <span>Page {currentPage + 1} of {totalPages}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-8">
        {currentQuestions.map((question, idx) => (
          <div key={question.id} className="bg-white p-6 rounded-xl border border-slate-200">
            <p className="text-lg font-medium mb-4">
              <span className="text-indigo-600 mr-2">
                {currentPage * QUESTIONS_PER_PAGE + idx + 1}.
              </span>
              {question.text}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LIKERT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(question.id, option.value)}
                  className={`p-3 rounded-lg border-2 transition font-medium ${
                    answers[question.id] === option.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : `border-slate-200 ${option.color}`
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 0}
          className="px-6 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          Previous
        </button>

        {isLastPage ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="px-8 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={!canGoNext}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
