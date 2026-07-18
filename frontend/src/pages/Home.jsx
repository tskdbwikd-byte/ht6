import RainHero from '../components/RainHero'
import { ParasolMark } from '../components/Logo'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <RainHero />
      <div className="relative z-10 flex flex-col items-center gap-5 animate-fade-up">
        <ParasolMark className="h-16 w-16 sm:h-20 sm:w-20" />
        <h1 className="font-display text-5xl font-semibold tracking-tight text-ink sm:text-6xl md:text-7xl">
          Parasol
        </h1>
      </div>
    </main>
  )
}
