import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getQuestions, submitAssessment, getLatestAssessment, getLatestMatches } from '../api'

const LIKERT_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Sometimes' },
  { value: 2, label: 'Often' },
  { value: 3, label: 'Always' },
]

const QUESTIONS_PER_PAGE = 5

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

const FAMOUS_NAMES = [
  'Aristotle', 'Marie Curie', 'Leonardo da Vinci',
  'Harriet Tubman', 'Marcus Aurelius', 'Ada Lovelace',
  'Frederick Douglass', 'Hypatia', 'Nikola Tesla',
  'Simone de Beauvoir', 'Ibn Khaldun', 'Florence Nightingale',
  'Galileo Galilei', 'Mary Wollstonecraft',
]

// ── Calculating overlay ────────────────────────────────────────────────────────
function CalculatingOverlay() {
  const [nameIdx, setNameIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setNameIdx(i => (i + 1) % FAMOUS_NAMES.length)
        setVisible(true)
      }, 200)
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'var(--surface-0)' }}
    >
      {/* Radial pulse ring */}
      <div
        className="absolute"
        style={{
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          border: '1px solid var(--surface-3)',
          animation: 'radial-pulse 2.5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <p
        className="text-xs uppercase tracking-[0.15em] mb-10"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Calibrating your profile
      </p>
      <p
        className="figure-name font-light transition-opacity duration-200"
        style={{
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          color: 'var(--text-primary)',
          opacity: visible ? 1 : 0,
        }}
      >
        {FAMOUS_NAMES[nameIdx]}
      </p>
      <p
        className="mt-10 text-xs uppercase tracking-[0.15em]"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.15em' }}
      >
        Comparing across 34 traits
      </p>
    </div>
  )
}

// ── Sub-components for results view ───────────────────────────────────────────
function AnimatedBar({ value, maxValue = 10, color, delay = 0 }) {
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
    <div ref={ref} className="score-track">
      <div
        className="score-fill"
        style={{
          '--bar-target': `${pct}%`,
          animationDelay: `${(100 + delay) / 1000}s`,
          animationPlayState: inView ? 'running' : 'paused',
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

// ── CountUp ───────────────────────────────────────────────────────────────────
function CountUp({ target, duration = 1200 }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf
    function step(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return <>{value}</>
}

// ── SVG arc score tile ────────────────────────────────────────────────────────
function ArcTile({ label, value, color }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const [displayedArc, setDisplayedArc] = useState(0)
  useEffect(() => {
    const arc = value ? (value / 10) * circumference : 0
    const t = setTimeout(() => setDisplayedArc(arc), 200)
    return () => clearTimeout(t)
  }, [value, circumference])
  return (
    <div className="flex flex-col items-center p-4" style={{ background: 'var(--surface-1)', borderRadius: '2px' }}>
      <div className="relative mb-2" style={{ width: '72px', height: '72px' }}>
        <svg viewBox="0 0 72 72" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${displayedArc} ${circumference}`}
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono font-medium" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', color }}>
            {value?.toFixed(1) ?? '—'}
          </span>
        </div>
      </div>
      <p className="text-xs uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
  )
}

function DifferenceLegend() {
  return (
    <div className="flex items-center gap-4 mb-2 text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--dim-cognitive)' }} />
        You score higher
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--dim-embodied)' }} />
        They score higher
      </span>
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

function MatchCard({ match, rank, isTop }) {
  const dimensions = match.dimensions || {}
  const strengths = (match.shared_strengths || []).slice(0, 4)
  const differences = (match.key_differences || []).slice(0, 3)
  const overallPct = Math.round(match.overall_similarity * 100)

  if (isTop) {
    return (
      <div
        className="card col-span-full mb-8"
        style={{
          borderLeft: '3px solid var(--accent)',
          background: 'color-mix(in srgb, var(--accent-figure) 5%, var(--surface-1))',
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Link to={`/figures/${match.figure_slug}`} className="shrink-0">
              {match.image ? (
                <img
                  src={match.image}
                  alt={match.figure_name}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 15%', display: 'block' }}
                />
              ) : (
                <div
                  className="flex items-center justify-center figure-name font-light"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-figure)', color: 'var(--surface-0)', fontSize: '1.75rem' }}
                >
                  {match.figure_name?.[0]}
                </div>
              )}
            </Link>
            <div className="min-w-0">
              <Link to={`/figures/${match.figure_slug}`} style={{ textDecoration: 'none' }}>
                <h3 className="figure-name text-2xl font-light" style={{ color: 'var(--text-primary)' }}>{match.figure_name}</h3>
              </Link>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{match.bio_intro || match.bio_short}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono font-medium" style={{ fontSize: 'clamp(2rem, 8vw, 4rem)', color: 'var(--accent)', lineHeight: 1 }}>
              <CountUp target={overallPct} />%
            </p>
            <p className="text-xs uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>overall match</p>
          </div>
        </div>
        <div style={{ height: '1px', background: 'var(--surface-3)', margin: '0 0 1rem' }} />
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
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className="w-8 h-8 flex items-center justify-center font-mono text-sm font-medium shrink-0"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-tertiary)',
              borderRadius: '50%',
            }}
          >
            {rank + 1}
          </span>
          <div className="min-w-0">
            <Link to={`/figures/${match.figure_slug}`} style={{ textDecoration: 'none' }}>
              <h3 className="figure-name text-lg font-light" style={{ color: 'var(--text-primary)' }}>
                {match.figure_name}
              </h3>
            </Link>
            <p className="text-sm line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
              {match.bio_intro || match.bio_short}
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
        <>
          <DifferenceLegend />
          <div className="flex flex-wrap gap-1 mb-3">
            {differences.map(d => (
              <span
                key={d.trait}
                className="text-xs px-2 py-0.5 font-medium"
                style={{
                  background: d.delta > 0 ? 'rgba(91,155,213,0.12)' : 'rgba(212,130,74,0.12)',
                  color: d.delta > 0 ? 'var(--dim-cognitive)' : 'var(--dim-embodied)',
                  borderRadius: '2px',
                }}
              >
                {d.trait} ({d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)})
              </span>
            ))}
          </div>
        </>
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function Assessment() {
  const [view, setView] = useState('loading')
  const [retakePrompt, setRetakePrompt] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [matches, setMatches] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentPage, setCurrentPage] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [clickAnim, setClickAnim] = useState(null)
  const navigatingBack = useRef(false)

  useEffect(() => {
    async function init() {
      try {
        const [assessmentData, questionsData] = await Promise.all([
          getLatestAssessment(),
          getQuestions(),
        ])
        setQuestions(questionsData)
        if (assessmentData) {
          setAssessment(assessmentData)
          const matchesData = await getLatestMatches(10)
          setMatches(matchesData)
          setView('results')
        } else {
          setView('intro')
        }
      } catch {
        setError('Failed to load. Please try again.')
        setView('intro')
      }
    }
    init()
  }, [])

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE)
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE,
  )
  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const canGoNext = currentQuestions.every(q => answers[q.id] !== undefined)
  const isLastPage = currentPage === totalPages - 1
  const allAnswered = answeredCount === questions.length

  // Auto-advance after all questions on page answered (suppressed when navigating backward)
  useEffect(() => {
    if (canGoNext && !isLastPage && !navigatingBack.current) {
      const t = setTimeout(() => setCurrentPage(p => p + 1), 400)
      return () => clearTimeout(t)
    }
  }, [canGoNext, isLastPage])

  // Progress bar color: interpolate from blue to amber as progress increases
  const progressHue = Math.round(220 - (progress / 100) * 165)
  const progressColor = `hsl(${progressHue}, 65%, 52%)`

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setClickAnim(`${questionId}-${value}`)
    setTimeout(() => setClickAnim(null), 200)
  }

  const handleSubmit = async () => {
    if (!allAnswered) {
      setError('Please answer all questions before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitAssessment(answers)
      const [assessmentData, matchesData] = await Promise.all([
        getLatestAssessment(),
        getLatestMatches(10),
      ])
      setAssessment(assessmentData)
      setMatches(matchesData)
      setView('results')
    } catch {
      setError('Failed to submit assessment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const startRetake = () => {
    setRetakePrompt(false)
    setAnswers({})
    setCurrentPage(0)
    setError('')
    setView('questionnaire')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--surface-3)', borderTopColor: 'var(--accent)' }}
        />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
      </div>
    )
  }

  // ── Calculating overlay ──────────────────────────────────────────────────────
  if (submitting) return <CalculatingOverlay />

  // ── Intro screen ─────────────────────────────────────────────────────────────
  if (view === 'intro') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1
          className="figure-name font-normal mb-4"
          style={{ fontSize: '2.75rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
        >
          Personality Assessment
        </h1>
        <p className="text-base mb-2" style={{ color: 'var(--text-secondary)' }}>
          19 core personality traits across 5 dimensions, plus 15 practical competencies.
        </p>
        <p className="text-sm mb-10" style={{ color: 'var(--text-tertiary)' }}>
          {questions.length > 0 ? `${questions.length} questions` : 'Loading questions…'} · ~15 minutes
        </p>
        {error && (
          <div
            className="p-4 mb-6 text-sm"
            style={{ background: '#C2657A18', color: '#C2657A', borderRadius: '2px' }}
          >
            {error}
          </div>
        )}
        <button
          onClick={() => setView('questionnaire')}
          className="btn-primary"
          disabled={questions.length === 0}
        >
          Begin Assessment
        </button>
      </div>
    )
  }

  // ── Questionnaire ────────────────────────────────────────────────────────────
  if (view === 'questionnaire') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Thin progress line at very top of content */}
        <div
          className="w-full mb-8 relative"
          style={{ height: '2px', background: 'var(--surface-2)', borderRadius: '1px' }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progress}%`,
              background: progressColor,
              borderRadius: '1px',
              transition: 'width 0.4s ease, background 0.6s ease',
            }}
          />
        </div>

        <div className="mb-8">
          <h1
            className="figure-name font-normal mb-2"
            style={{ fontSize: '2.75rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            Personality Assessment
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Answer each question based on how often you exhibit the behavior described.
          </p>
        </div>

        <div className="flex justify-between text-xs mb-6 uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
          <span>{answeredCount} of {questions.length} answered</span>
          <span>Page {currentPage + 1} of {totalPages}</span>
        </div>

        {error && (
          <div
            className="p-4 mb-6 text-sm"
            style={{ background: '#C2657A18', color: '#C2657A', borderRadius: '2px' }}
          >
            {error}
          </div>
        )}

        <div className="space-y-6">
          {currentQuestions.map((question, idx) => {
            const qNumber = currentPage * QUESTIONS_PER_PAGE + idx + 1
            return (
              <div
                key={question.id}
                className="card relative overflow-hidden"
              >
                {/* Question number watermark */}
                <div
                  className="absolute top-3 right-4 figure-name font-light pointer-events-none select-none"
                  style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)', color: 'var(--surface-2)', lineHeight: 1 }}
                  aria-hidden
                >
                  {qNumber}
                </div>

                <h3
                  className="figure-name font-semibold mb-5 relative"
                  style={{ fontSize: 'clamp(1.125rem, 3.5vw, 1.25rem)', color: 'var(--text-primary)', lineHeight: 1.4 }}
                >
                  {question.text}
                </h3>

                <div className="flex flex-col gap-2">
                  {LIKERT_OPTIONS.map(option => {
                    const isSelected = answers[question.id] === option.value
                    const animKey = `${question.id}-${option.value}`
                    const isAnimating = clickAnim === animKey
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleAnswer(question.id, option.value)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all min-h-[44px]"
                        style={{
                          background: isSelected ? `var(--accent)14` : 'var(--surface-2)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--surface-3)'}`,
                          borderRadius: '2px',
                          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transform: isAnimating ? 'scale(1.03)' : 'scale(1)',
                          transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                        }}
                      >
                        {/* Marginalia dot for selected */}
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '1px',
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            border: isSelected ? 'none' : '1px solid var(--surface-3)',
                            flexShrink: 0,
                            transition: 'background 0.15s ease',
                          }}
                        />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between mt-8 gap-3">
          <button
            onClick={() => {
              navigatingBack.current = true
              setCurrentPage(p => p - 1)
              setTimeout(() => { navigatingBack.current = false }, 500)
            }}
            disabled={currentPage === 0}
            className="btn-secondary"
            style={{ opacity: currentPage === 0 ? 0.4 : 1 }}
          >
            Previous
          </button>

          {isLastPage ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="btn-primary"
              style={{ opacity: !allAnswered ? 0.5 : 1 }}
            >
              Submit Assessment
            </button>
          ) : (
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!canGoNext}
              className="btn-primary"
              style={{ opacity: !canGoNext ? 0.5 : 1 }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  const { trait_scores_0_3, dimension_averages_0_10, overall } = assessment
  const topMatch = matches?.top_matches?.[0]
  const remainingMatches = matches?.top_matches?.slice(1) || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1
        className="figure-name font-normal mb-1"
        style={{ fontSize: '2.75rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
      >
        Your Results
      </h1>
      <div className="flex flex-wrap items-center gap-2 mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
        <span>Assessed on {new Date(assessment.created_at).toLocaleDateString()}</span>
        <span>·</span>
        {retakePrompt ? (
          <span className="flex flex-wrap items-center gap-2">
            <span style={{ color: 'var(--text-secondary)' }}>This will replace your current results.</span>
            <button onClick={startRetake} className="font-medium underline underline-offset-2" style={{ color: '#C2657A' }}>
              Start over
            </button>
            <button onClick={() => setRetakePrompt(false)} style={{ color: 'var(--text-tertiary)' }}>
              Never mind
            </button>
          </span>
        ) : (
          <button onClick={() => setRetakePrompt(true)} className="transition-colors hover:text-accent" style={{ color: 'var(--text-tertiary)' }}>
            Retake assessment
          </button>
        )}
      </div>

      {/* 1. Featured top match hero */}
      {topMatch && <MatchCard match={topMatch} rank={0} isTop={true} />}

      {/* 2. Arc score tiles */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10">
        <ArcTile label="Overall" value={overall?.Overall_Normalized_Equal_Avg} color="var(--accent)" />
        <ArcTile label="Core 5D" value={overall?.Core_5D_Avg} color="var(--dim-cognitive)" />
        <ArcTile label="Competency" value={overall?.General_Competency_Avg_10scale} color="var(--dim-competency)" />
      </div>

      {/* 3. Dimension breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="card">
          <h2 className="figure-name font-medium mb-4" style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}>
            Core Dimensions
          </h2>
          {dimension_averages_0_10 && DIMENSION_NAMES.map((name, i) => (
            <ScoreRow key={name} label={name} value={dimension_averages_0_10[name] ?? 0} color={DIM_COLORS[name] || 'var(--accent)'} delay={i * 60} />
          ))}
        </div>
        <div className="card">
          <h2 className="figure-name font-medium mb-4" style={{ fontSize: '1.375rem', color: 'var(--text-primary)' }}>
            Heinlein Competencies
          </h2>
          <div className="max-h-72 overflow-y-auto pr-2">
            {trait_scores_0_3 && HEINLEIN_TRAIT_NAMES
              .filter(name => trait_scores_0_3[name] != null)
              .map((name, i) => (
                <ScoreRow key={name} label={name} value={trait_scores_0_3[name]} maxValue={3} color="var(--dim-competency)" delay={i * 40} />
              ))}
          </div>
        </div>
      </div>

      {/* 4. Remaining matches */}
      {remainingMatches.length > 0 && (
        <div>
          <h2 className="figure-name font-medium mb-6" style={{ fontSize: '1.875rem', color: 'var(--text-primary)' }}>
            More Matches
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {remainingMatches.map((match, idx) => (
              <MatchCard key={match.figure_slug} match={match} rank={idx + 1} isTop={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
