import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Constants ──────────────────────────────────────────────────────────────────

const CONSTELLATION_NAMES = [
  'Aristotle', 'Marie Curie', 'Leonardo da Vinci', 'Frederick Douglass',
  'Hypatia', 'Nikola Tesla', 'Marcus Aurelius', 'Ada Lovelace',
  'Harriet Tubman', 'Ibn Khaldun', 'Simone de Beauvoir', 'Galileo',
  'Florence Nightingale', 'Socrates', 'Mary Wollstonecraft', 'Darwin',
]

const DIMENSION_ORDER = [
  'Cognitive', 'Moral-Affective', 'Cultural-Social', 'Embodied-Existential', 'Relational',
]

const DIMENSIONS = [
  {
    key: 'Cognitive',
    color: 'var(--dim-cognitive)',
    tagline: 'How you think',
    traits: ['Strategic Intelligence', 'Ethical / Philosophical Insight', 'Creative / Innovative Thinking', 'Administrative / Legislative Skill'],
    body: 'Strategic intelligence, philosophical depth, creative originality, and the ability to build and sustain systems.',
  },
  {
    key: 'Moral-Affective',
    color: 'var(--dim-moral)',
    tagline: 'What you stand for',
    traits: ['Compassion / Empathy', 'Courage / Resilience', 'Justice Orientation', 'Moral Fallibility & Growth'],
    body: 'Compassion, courage, justice, and the willingness to grow when you are wrong.',
  },
  {
    key: 'Cultural-Social',
    color: 'var(--dim-cultural)',
    tagline: 'How you move others',
    traits: ['Leadership / Influence', 'Institution-Building', 'Impact Legacy', 'Archetype Resonance', 'Relatability / Cultural Embeddedness'],
    body: 'Leadership, legacy, institution-building — the traces you leave in the world beyond yourself.',
  },
  {
    key: 'Embodied-Existential',
    color: 'var(--dim-embodied)',
    tagline: 'How you inhabit life',
    traits: ['Physical Endurance / Skill', 'Hardship Tolerance', 'Joy / Play / Aesthetic Appreciation', 'Mortality Acceptance', 'Paradox Integration'],
    body: 'Physical endurance, tolerance for hardship, capacity for joy, and the integration of paradox.',
  },
  {
    key: 'Relational',
    color: 'var(--dim-relational)',
    tagline: 'How you love',
    traits: ['Spousal / Partner Quality', 'Parental / Mentoring Quality', 'Relational Range'],
    body: 'The quality of your partnerships, your mentorship, and the range of your human connections.',
  },
]

const HEINLEIN_COMPETENCIES = [
  {
    name: 'Caregiving & Nurture',
    desc: 'Tending to the young, old, or ill with skill and steadiness.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    name: 'Strategic Planning & Command',
    desc: 'Coordinating complex operations toward clear objectives.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    name: 'Animal & Food Processing',
    desc: 'Husbandry, slaughter, and the practical work of sustenance.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    name: 'Navigation & Wayfinding',
    desc: 'Moving through space with purpose, skill, and orientation.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    name: 'Construction & Fabrication',
    desc: 'Building structures and physical systems from raw materials.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: 'Artistic & Cultural Expression',
    desc: 'Creating works that endure or move others across time.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    name: 'Numerical & Analytical Reasoning',
    desc: 'Mathematics, accounting, and logical inference under pressure.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.616 4.5 4.667V19.5a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5V4.667c0-1.052-.807-1.967-1.907-2.096A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
  {
    name: 'Manual Craft & Repair',
    desc: 'Maintaining, fixing, and making things by hand with care.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    name: 'Medical Aid & Emergency Response',
    desc: 'Treating wounds, illness, and urgent crises with composure.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    name: 'Leadership & Followership',
    desc: 'Command, cooperation, and knowing when each applies.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    name: 'Agricultural & Resource Management',
    desc: 'Cultivating land, managing animals, and stewarding stores.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    name: 'Culinary Skill',
    desc: 'Preparing food with competence, care, and creativity.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 4.5a1.5 1.5 0 01-3 0v-5.25a1.5 1.5 0 013 0v5.25zm12 0a1.5 1.5 0 01-3 0v-5.25a1.5 1.5 0 013 0v5.25zM6 13.121V18.75a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-5.629" />
      </svg>
    ),
  },
  {
    name: 'Combat & Defense',
    desc: 'Physical self-defense and tactical engagement under duress.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    name: 'Technical & Systemic Problem-Solving',
    desc: 'Engineering, diagnosis, and systematic debugging of complex systems.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    name: 'Existential Composure',
    desc: 'Facing uncertainty, suffering, and death without collapse.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
]

const TEASER_FIGURES = [
  {
    name: 'Harriet Tubman',
    slug: 'harriet-tubman',
    image: 'figures/330px-Carte-de-visite_portrait_of_Harriet_Tubman_28cropped29.jpg',
    overall: 6.94,
    peakDim: 'Moral-Affective',
    highlightColor: 'var(--dim-moral)',
    tagline: 'Conductor, soldier, suffragist',
    dims: {
      'Cognitive': 5.5,
      'Moral-Affective': 8.5,
      'Cultural-Social': 7.0,
      'Embodied-Existential': 8.0,
      'Relational': 5.5,
    },
  },
  {
    name: 'Frederick Douglass',
    slug: 'frederick-douglass',
    image: 'figures/330px-Frederick_Douglass_28circa_187929_28cropped29.jpg',
    overall: 7.31,
    peakDim: 'Moral-Affective',
    highlightColor: 'var(--dim-moral)',
    tagline: 'Orator, abolitionist, autobiographer',
    dims: {
      'Cognitive': 8.5,
      'Moral-Affective': 8.0,
      'Cultural-Social': 7.5,
      'Embodied-Existential': 6.0,
      'Relational': 6.5,
    },
  },
  {
    name: 'Benjamin Franklin',
    slug: 'benjamin-franklin',
    image: 'figures/330px-Joseph_Siffrein_Duplessis_-_Benjamin_Franklin_-_Google_Art_Project.jpg',
    overall: 7.41,
    peakDim: 'Cultural-Social',
    highlightColor: 'var(--dim-cultural)',
    tagline: 'Printer, diplomat, natural philosopher',
    dims: {
      'Cognitive': 8.5,
      'Moral-Affective': 6.5,
      'Cultural-Social': 8.5,
      'Embodied-Existential': 7.0,
      'Relational': 6.5,
    },
  },
  {
    name: 'Theodore Roosevelt',
    slug: 'theodore-roosevelt',
    image: 'figures/330px-Theodore_Roosevelt_by_the_Pach_Bros_284x5_cropped29_o01LWqU.jpg',
    overall: 7.96,
    peakDim: 'Embodied-Existential',
    highlightColor: 'var(--dim-embodied)',
    tagline: 'Soldier, naturalist, president',
    dims: {
      'Cognitive': 7.5,
      'Moral-Affective': 7.0,
      'Cultural-Social': 8.5,
      'Embodied-Existential': 9.0,
      'Relational': 7.0,
    },
  },
]

// ── Inline helpers ─────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef()
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

function SectionLabel({ children }) {
  return (
    <span
      className="inline-block px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] mb-6"
      style={{
        background: 'var(--surface-2)',
        color: 'var(--text-tertiary)',
        borderRadius: '2px',
        border: '1px solid var(--surface-3)',
      }}
    >
      {children}
    </span>
  )
}

function MiniRadar({ dims }) {
  const size = 120
  const cx = size / 2
  const cy = size / 2
  const maxR = 45
  const n = DIMENSION_ORDER.length
  const gridRings = [0.25, 0.5, 0.75, 1.0]

  function polarToXY(index, value) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const r = (value / 10) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  function axisEnd(index) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) }
  }

  const polygonPoints = DIMENSION_ORDER
    .map((dim, i) => {
      const { x, y } = polarToXY(i, dims[dim] || 0)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      style={{ display: 'block', margin: '0 auto' }}
    >
      {/* Grid rings */}
      {gridRings.map((frac) => {
        const pts = DIMENSION_ORDER
          .map((_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2
            const r = frac * maxR
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
          })
          .join(' ')
        return (
          <polygon
            key={frac}
            points={pts}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth="0.75"
          />
        )
      })}
      {/* Axis lines */}
      {DIMENSION_ORDER.map((_, i) => {
        const { x, y } = axisEnd(i)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={x} y2={y}
            stroke="var(--surface-3)"
            strokeWidth="0.75"
          />
        )
      })}
      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="var(--accent-figure)"
        fillOpacity={0.15}
        stroke="var(--accent-figure)"
        strokeWidth="1.5"
        strokeOpacity={0.7}
      />
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()

  // Section-level inView refs
  const [sec1Ref, sec1In] = useInView()
  const [sec2RightRef, sec2RightIn] = useInView()
  const [sec3GridRef, sec3GridIn] = useInView()
  const [sec4GridRef, sec4GridIn] = useInView()
  const [sec5Ref, sec5In] = useInView(0.1)
  const [sec6GridRef, sec6GridIn] = useInView()
  const [sec7Ref, sec7In] = useInView(0.1)

  return (
    <div>

      {/* ── 0 · Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, var(--accent-glow) 0%, transparent 70%)',
          }}
        />
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
                <Link to="/assessment" className="btn-primary">Take Assessment</Link>
              ) : (
                <Link to="/signup" className="btn-primary">Get Started</Link>
              )}
              <Link to="/figures" className="btn-secondary">Browse Figures</Link>
            </div>

            <div
              className="flex justify-center gap-2 mt-8 animate-fade-up"
              style={{ animationDelay: '900ms', opacity: 0, animationFillMode: 'forwards' }}
              aria-hidden
            >
              <span
                className="font-mono text-sm"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}
              >
                62 questions · 36 traits · 5 dimensions · 15 competencies · ~15 min
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1 · What is Personliness? ─────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--surface-1)',
          borderTop: '1px solid var(--surface-3)',
          borderBottom: '1px solid var(--surface-3)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-20 md:py-28 text-center">
          <SectionLabel>The Concept</SectionLabel>
          <h2
            className="figure-name font-light mb-8"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
          >
            Personality is not a type. It is a terrain.
          </h2>
          <div className="text-left space-y-5 mb-12" style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '1.0rem' }}>
            <p>
              Psychological tests have long tried to fit people into categories: introverts and extroverts, thinkers and feelers, analysts and diplomats. But the categories reveal as much about the test as the person.
            </p>
            <p>
              Personliness takes a different approach. Instead of assigning you a type, it maps your actual trait profile across 36 measured dimensions — and then finds the historical figures whose profiles most closely resemble yours.
            </p>
            <p>
              The match is not metaphorical. It is mathematical: your scores are compared trait-by-trait against figures scored using the same rubric. The result is a portrait — not a label.
            </p>
          </div>

          {/* Dimension boxes */}
          <div ref={sec1Ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DIMENSIONS.map((dim, i) => (
              <div
                key={dim.key}
                style={{
                  background: `${dim.color}12`,
                  borderTop: `3px solid ${dim.color}`,
                  borderRadius: '2px',
                  padding: '0.75rem',
                  opacity: sec1In ? 1 : 0,
                  transform: sec1In ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
                }}
              >
                <div className="figure-name text-sm italic mb-1" style={{ color: 'var(--text-primary)' }}>
                  {dim.key}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {dim.tagline}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2 · The Five Dimensions ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-0)' }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-5 gap-12">
            {/* Left copy */}
            <div className="md:col-span-2">
              <SectionLabel>The Rubric</SectionLabel>
              <h2
                className="figure-name font-light mb-6"
                style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
              >
                Five lenses.<br />Twenty-one traits.
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  The core rubric maps five dimensions of personhood that recur across cultures and centuries. Within each dimension, specific sub-traits are scored independently — no halo effects, no inference from fame.
                </p>
                <p>
                  Each trait is scored 0–3 based on documented evidence: 0 is absent, 1 is episodic, 2 is consistent, 3 is exceptional and defining.
                </p>
              </div>
            </div>

            {/* Right stacked cards */}
            <div ref={sec2RightRef} className="md:col-span-3 space-y-3">
              {DIMENSIONS.map((dim, i) => (
                <div
                  key={dim.key}
                  className="dim-card card"
                  style={{
                    borderLeftColor: dim.color,
                    opacity: sec2RightIn ? 1 : 0,
                    transform: sec2RightIn ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
                  }}
                >
                  <div
                    className="figure-name font-medium mb-1"
                    style={{ color: dim.color }}
                  >
                    {dim.key}
                  </div>
                  <div
                    className="text-xs uppercase tracking-wide mb-3"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {dim.tagline}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dim.traits.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: `${dim.color}15`,
                          color: dim.color,
                          borderRadius: '2px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{dim.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 · Heinlein Competencies ────────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-0)', borderTop: '1px solid var(--surface-3)' }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mb-12">
            <SectionLabel>Practical Wisdom</SectionLabel>
            <h2
              className="figure-name font-light mb-6"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
            >
              What can you actually do?
            </h2>
            <blockquote
              className="figure-name italic mb-8"
              style={{
                borderLeft: '3px solid var(--dim-competency)',
                paddingLeft: '1.25rem',
                fontSize: '1.15rem',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}
            >
              "A human being should be able to change a diaper, plan an invasion, butcher a hog, conn a ship, design a building, write a sonnet, balance accounts, build a wall, set a bone, comfort the dying..."
              <footer className="mt-2 text-sm not-italic" style={{ color: 'var(--text-tertiary)' }}>
                — Robert A. Heinlein, <em>Time Enough for Love</em>
              </footer>
            </blockquote>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>
                Most personality assessments ignore practical competency entirely. But a person's relationship to practical skill tells us something real about how they inhabit the world.
              </p>
              <p>
                Personliness includes 15 Heinlein competencies, each assessed through targeted questions and compared against figures like Benjamin Franklin — printer, inventor, diplomat, writer — whose competency range was as remarkable as his moral character.
              </p>
            </div>
          </div>

          <div ref={sec3GridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HEINLEIN_COMPETENCIES.map((c, i) => (
              <div
                key={c.name}
                className="dim-card card"
                style={{
                  borderLeftColor: 'var(--dim-competency)',
                  opacity: sec3GridIn ? 1 : 0,
                  transform: sec3GridIn ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.4s ease ${i * 40}ms, transform 0.4s ease ${i * 40}ms`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      color: 'var(--dim-competency)',
                      flexShrink: 0,
                      width: '16px',
                      height: '16px',
                      marginTop: '2px',
                    }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      {c.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {c.desc}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4 · How It Works ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--surface-1)',
          borderTop: '1px solid var(--surface-3)',
          borderBottom: '1px solid var(--surface-3)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-12">
            <SectionLabel>The Process</SectionLabel>
            <h2
              className="figure-name font-light"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
            >
              From questions to self-knowledge.
            </h2>
          </div>

          <div ref={sec4GridRef} className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Take the Assessment',
                body: '62 questions. Four response levels, from Never to Often. Questions probe specific traits — you will sense which aspect of character each is measuring. Approximately 15 minutes.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                ),
              },
              {
                num: '02',
                title: 'Receive Your Profile',
                body: 'Your answers are scored into 36 traits. Each trait flows into one of five dimensions or fifteen competencies. The result is a quantitative personality profile — not a type, but a terrain.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                ),
              },
              {
                num: '03',
                title: 'Meet Your Matches',
                body: 'Your profile is compared against every figure in the database using mean absolute difference similarity. You receive your top ten matches, ranked by overall similarity, with per-dimension breakdowns and shared strengths.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
            ].map((step, i) => (
              <div
                key={step.num}
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: '2px',
                  padding: '1.5rem',
                  opacity: sec4GridIn ? 1 : 0,
                  transform: sec4GridIn ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.6s ease ${i * 200}ms, transform 0.6s ease ${i * 200}ms`,
                }}
              >
                <div
                  className="font-mono font-light mb-4"
                  style={{ fontSize: '3rem', lineHeight: 1, color: 'var(--surface-3)' }}
                  aria-hidden
                >
                  {step.num}
                </div>
                <div className="mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  {step.icon}
                </div>
                <h3
                  className="figure-name text-xl font-medium mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5 · Why It Matters ───────────────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-0)' }}>
        <div className="max-w-3xl mx-auto px-4 py-20 md:py-28">
          <SectionLabel>The Argument</SectionLabel>
          <h2
            className="figure-name font-light mb-8"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
          >
            Self-knowledge is not navel-gazing.
          </h2>

          <div
            ref={sec5Ref}
            style={{
              position: 'relative',
              paddingLeft: '1.5rem',
              opacity: sec5In ? 1 : 0,
              transform: sec5In ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            {/* Gradient left border */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                background: `linear-gradient(to bottom,
                  var(--dim-cognitive),
                  var(--dim-moral),
                  var(--dim-cultural),
                  var(--dim-embodied),
                  var(--dim-relational)
                )`,
              }}
            />
            <div className="space-y-5 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>
                There is a long tradition — from Plutarch's <em>Parallel Lives</em> to William James's psychology of character — that holds that understanding yourself through comparison with others is not vanity but method. We understand what we are by seeing it in another, more clearly, across the distance of time.
              </p>
              <p>
                History provides characters at sufficient remove that we can evaluate them with some objectivity. We know what Harriet Tubman did under conditions of extreme duress, and we know what Frederick Douglass managed to build with the minimal resources a hostile society provided. These are data points about what humans, under various conditions, are capable of.
              </p>
              <p>
                Personliness asks: which of those patterns live in you? Not to flatter or reassure — but to orient. To know what you share with people who managed to act with courage, build with care, and think with rigor, in times that demanded it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 · Meet a Few Figures ───────────────────────────────────────────── */}
      <section
        style={{
          background: 'var(--surface-1)',
          borderTop: '1px solid var(--surface-3)',
          borderBottom: '1px solid var(--surface-3)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center mb-12">
            <SectionLabel>The Figures</SectionLabel>
            <h2
              className="figure-name font-light mb-3"
              style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
            >
              People who left a record.
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)', maxWidth: '40rem', margin: '0 auto' }}>
              Browse a growing library of historical figures, each scored across all 36 traits using a rigorous, evidence-based rubric.
            </p>
          </div>

          <div ref={sec6GridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {TEASER_FIGURES.map((fig, i) => (
              <Link
                key={fig.slug}
                to={`/figures/${fig.slug}`}
                className="dim-card card"
                style={{
                  borderLeftColor: fig.highlightColor,
                  textDecoration: 'none',
                  display: 'block',
                  opacity: sec6GridIn ? 1 : 0,
                  transform: sec6GridIn ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={`/media/${fig.image}`}
                    alt={fig.name}
                    loading="lazy"
                    style={{
                      width: '56px',
                      height: '56px',
                      objectFit: 'cover',
                      borderRadius: '2px',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div className="figure-name text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                      {fig.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {fig.tagline}
                    </div>
                  </div>
                </div>

                <MiniRadar dims={fig.dims} />

                <div className="flex items-center justify-between mt-4">
                  <span
                    className="font-mono text-xs px-2 py-1"
                    style={{
                      background: `${fig.highlightColor}18`,
                      color: fig.highlightColor,
                      borderRadius: '2px',
                    }}
                  >
                    {fig.overall.toFixed(2)} / 10
                  </span>
                  <span className="text-xs" style={{ color: 'var(--accent)' }}>
                    View Profile →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link to="/figures" className="btn-secondary">
              Explore all figures →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7 · Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 100%, var(--accent-glow) 0%, transparent 70%)',
          }}
        />
        <div
          ref={sec7Ref}
          className="relative max-w-3xl mx-auto px-4 py-24 md:py-32 text-center"
          style={{
            opacity: sec7In ? 1 : 0,
            transform: sec7In ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <h2
            className="figure-name font-light mb-6"
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'var(--text-primary)',
            }}
          >
            The record is long.<br />Your place in it is specific.
          </h2>
          <p
            className="text-base mb-10 leading-relaxed"
            style={{ color: 'var(--text-secondary)', maxWidth: '32rem', margin: '0 auto 2.5rem' }}
          >
            Fifteen minutes. Sixty-two questions. A profile built on 36 measured traits — and the historical figures who share them. This is not a quiz. It is a reckoning.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {user ? (
              <Link to="/assessment" className="btn-primary">Begin the Assessment</Link>
            ) : (
              <Link to="/signup" className="btn-primary">Begin the Assessment</Link>
            )}
            <Link to="/figures" className="btn-secondary">Browse Figures First</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
