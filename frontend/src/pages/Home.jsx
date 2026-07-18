import RainHero from '../components/RainHero'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <RainHero />
      <h1 className="pointer-events-none relative z-10 animate-fade-up font-display text-5xl font-normal tracking-tight text-ink sm:text-6xl md:text-7xl">
        Parasol
      </h1>
    </main>
  )
}
