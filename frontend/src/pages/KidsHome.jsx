import { useOutletContext } from 'react-router-dom'

function friendlySiteName(domain) {
  if (!domain) return 'Unknown site'
  return domain.replace(/^www\./, '')
}

function KidsHome() {
  const { data } = useOutletContext()
  const {
    power = true,
    uniqueDomains = 0,
    topDomains = [],
    topBlockedDomains = [],
    totals = {},
    blockedEvents = [],
  } = data ?? {}

  const blockedCount = totals.blocked ?? 0
  const topSites = (topDomains ?? []).slice(0, 6)
  const warnings = (topBlockedDomains ?? []).slice(0, 5)
  const recentBlocks = (blockedEvents ?? []).slice(0, 4)

  let summary
  if (!uniqueDomains && !blockedCount) {
    summary = 'Things look quiet so far. When you browse, Patrick will show what happened here in simple words.'
  } else if (blockedCount > 0) {
    summary = `Parasol has been watching your home internet. You’ve visited about ${uniqueDomains} place${
      uniqueDomains === 1 ? '' : 's'
    }, and Parasol stopped ${blockedCount} risky or blocked thing${blockedCount === 1 ? '' : 's'} for you.`
  } else {
    summary = `You’ve been to about ${uniqueDomains} place${
      uniqueDomains === 1 ? '' : 's'
    } online. Nothing scary was blocked yet — keep making smart choices!`
  }

  return (
    <main className="flex-1 overflow-y-auto px-5 py-8 md:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start gap-4">
          <img
            src="/cat.gif"
            alt=""
            className="hidden h-16 w-16 shrink-0 sm:block"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Kids dashboard</p>
            <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Hey there!</h1>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-secondary">{summary}</p>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-hairline bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Shield</p>
            <p className="mt-2 font-display text-2xl text-ink">{power ? 'On' : 'Paused'}</p>
            <p className="mt-1 text-sm text-ink-secondary">
              {power ? 'Parasol is protecting you.' : 'A grown-up turned protection off.'}
            </p>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Places visited</p>
            <p className="mt-2 font-display text-2xl text-ink">{uniqueDomains}</p>
            <p className="mt-1 text-sm text-ink-secondary">Different sites your home reached.</p>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Stopped</p>
            <p className="mt-2 font-display text-2xl text-ink">{blockedCount}</p>
            <p className="mt-1 text-sm text-ink-secondary">Times Parasol blocked something.</p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">Top sites</h2>
          <p className="mt-1 text-sm text-ink-secondary">Places your devices visited the most lately.</p>
          {topSites.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {topSites.map((site, index) => (
                <li
                  key={site.domain}
                  className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-mist text-sm font-semibold text-brand">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-medium text-ink">{friendlySiteName(site.domain)}</p>
                  </div>
                  <p className="shrink-0 text-xs text-ink-muted">{site.count} visit{site.count === 1 ? '' : 's'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-hairline bg-white/60 px-4 py-6 text-sm text-ink-muted">
              No site visits yet — go explore (safely!), then check back.
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">Warnings</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Stuff Parasol stopped — ask Patrick if you want to know why.
          </p>
          {warnings.length > 0 || recentBlocks.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {warnings.map((site) => (
                <li
                  key={`warn-${site.domain}`}
                  className="rounded-xl border border-[#f0c9c9] bg-[#fff7f7] px-4 py-3"
                >
                  <p className="text-sm font-medium text-ink">{friendlySiteName(site.domain)}</p>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    Blocked {site.count} time{site.count === 1 ? '' : 's'}
                  </p>
                </li>
              ))}
              {warnings.length === 0 &&
                recentBlocks.map((event, index) => (
                  <li
                    key={`block-${event.domain}-${index}`}
                    className="rounded-xl border border-[#f0c9c9] bg-[#fff7f7] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-ink">{friendlySiteName(event.domain)}</p>
                    <p className="mt-0.5 text-xs text-ink-secondary">Parasol blocked this recently</p>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-hairline bg-white/60 px-4 py-6 text-sm text-ink-muted">
              No warnings right now. Nice work staying safe!
            </p>
          )}
        </section>

        <p className="mt-12 text-center text-sm text-ink-muted">
          Curious about something? Ask Patrick in the chat →
        </p>
      </div>
    </main>
  )
}

export default KidsHome
