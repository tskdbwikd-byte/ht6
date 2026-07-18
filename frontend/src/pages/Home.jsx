import { useState } from 'react'
import { Link } from 'react-router-dom'
import RainHero from '../components/RainHero'

export default function Home() {
  const [umbrellaClosed, setUmbrellaClosed] = useState(false)

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <RainHero closed={umbrellaClosed} />
      <div className="relative z-30 flex flex-col items-center gap-8 animate-fade-up">
        <h1 className="pointer-events-none font-display text-6xl font-normal tracking-tight text-ink sm:text-7xl md:text-8xl">
          Parasol
        </h1>
        <Link
          to="/kids"
          className="cursor-none rounded-xl bg-brand px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover"
          onMouseEnter={() => setUmbrellaClosed(true)}
          onMouseLeave={() => setUmbrellaClosed(false)}
          onFocus={() => setUmbrellaClosed(true)}
          onBlur={() => setUmbrellaClosed(false)}
        >
          Begin
        </Link>
      </div>
    </main>
  )
}
