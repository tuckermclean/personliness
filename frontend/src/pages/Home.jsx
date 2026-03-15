import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CONSTELLATION_NAMES = [
  'Aristotle', 'Marie Curie', 'Leonardo da Vinci', 'Frederick Douglass',
  'Hypatia', 'Nikola Tesla', 'Marcus Aurelius', 'Ada Lovelace',
  'Harriet Tubman', 'Ibn Khaldun', 'Simone de Beauvoir', 'Galileo',
  'Florence Nightingale', 'Socrates', 'Mary Wollstonecraft', 'Darwin',
]

const FEATURES = [
  {
    dim: 'cognitive',
    color: 'var(--dim-cognitive)',
    title: 'Core Dimensions',
    body: 'Assess your strategic intelligence, moral orientation, cultural influence, embodied resilience, and relational depth.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    dim: 'competency',
    color: 'var(--dim-competency)',
    title: 'Practical Competencies',
    body: 'Measure your general competency across 15 practical skills from navigation to medical aid to culinary arts.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    dim: 'relational',
    color: 'var(--dim-relational)',
    title: 'Historical Matches',
    body: 'Discover which historical figures share your personality profile using mean absolute difference similarity matching.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Radial glow behind hero */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, var(--accent-glow) 0%, transparent 70%)',
          }}
        />

        {/* Constellation background names */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
          {CONSTELLATION_NAMES.map((name, i) => (
            <span
              key={name}
              className="figure-name absolute text-xs font-light"
              style={{
                color: 'var(--text-primary)',
                opacity: 0.04 + (i % 4) * 0.01,
                top: `${8 + (i * 13) % 85}%`,
                left: `${(i * 17 + 5) % 90}%`,
                fontSize: `${0.65 + (i % 3) * 0.15}rem`,
                transform: `rotate(${-8 + (i % 5) * 4}deg)`,
              }}
            >
              {name}
            </span>
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-28 md:py-36">
          {/* Eyebrow badge */}
          <div className="flex justify-center mb-10">
            <span
              className="inline-block px-4 py-1 text-xs font-medium uppercase tracking-[0.12em]"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-tertiary)',
                borderRadius: '2px',
                border: '1px solid var(--surface-3)',
              }}
            >
              Personality Assessment
            </span>
          </div>

          {/* Hero copy — staggered fade-up */}
          <div className="text-center max-w-3xl mx-auto">
            <h1
              className="figure-name font-light mb-10"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              <span className="block animate-fade-up" style={{ animationDelay: '0ms' }}>
                Some qualities are ancient.
              </span>
            </h1>

            <div
              className="space-y-3 mb-12 text-left max-w-lg mx-auto animate-fade-up"
              style={{ animationDelay: '300ms', opacity: 0, animationFillMode: 'forwards' }}
            >
              <p className="figure-name font-light text-xl italic" style={{ color: 'var(--text-secondary)' }}>
                Aristotle's capacity for structured thought.
              </p>
              <p className="figure-name font-light text-xl italic" style={{ color: 'var(--text-secondary)' }}>
                Curie's refusal to accept the limits of her field.
              </p>
              <p className="mt-6 text-base font-light leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                These are not biographical facts.<br />
                They are recurring patterns — in minds like yours.
              </p>
            </div>

            <div
              className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-up"
              style={{ animationDelay: '600ms', opacity: 0, animationFillMode: 'forwards' }}
            >
              {user ? (
                <Link to="/assessment" className="btn-primary">
                  Take Assessment
                </Link>
              ) : (
                <Link to="/signup" className="btn-primary">
                  Get Started
                </Link>
              )}
              <Link to="/figures" className="btn-secondary">
                Browse Figures
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="dim-card card"
              style={{ borderLeftColor: f.color }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center mb-4"
                style={{
                  background: `${f.color}18`,
                  color: f.color,
                  borderRadius: '2px',
                }}
              >
                {f.icon}
              </div>
              <h3
                className="figure-name text-xl font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
