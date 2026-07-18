import { useOutletContext } from 'react-router-dom'

function friendlySiteName(domain) {
  if (!domain) return null
  return domain.replace(/^www\./, '')
}

function KidsHome() {
  const { data } = useOutletContext()
  const {
    power = true,
    uniqueDomains = 0,
    totals = {},
    topDomains = [],
    topBlockedDomains = [],
    blockedEvents = [],
  } = data ?? {}

  const blockedCount = totals.blocked ?? 0
  const topSite = friendlySiteName(topDomains?.[0]?.domain)
  const topSiteCount = topDomains?.[0]?.count ?? 0
  const topWarning =
    friendlySiteName(topBlockedDomains?.[0]?.domain) ||
    friendlySiteName(blockedEvents?.[0]?.domain)
  const warningCount = topBlockedDomains?.[0]?.count

  const notes = []

  if (topWarning) {
    notes.push({
      key: 'warning',
      tone: 'warning',
      label: 'Warning',
      title: topWarning,
      detail:
        warningCount > 1
          ? `Parasol stopped this ${warningCount} times`
          : 'Parasol stopped this',
    })
  }

  if (topSite) {
    notes.push({
      key: 'top-site',
      tone: 'info',
      label: 'Top site',
      title: topSite,
      detail:
        topSiteCount > 1
          ? `Visited about ${topSiteCount} times`
          : 'Visited recently',
    })
  }

  if (notes.length < 3) {
    if (blockedCount > 0 && !topWarning) {
      notes.push({
        key: 'stopped',
        tone: 'warning',
        label: 'Stopped',
        title: `${blockedCount} risky thing${blockedCount === 1 ? '' : 's'}`,
        detail: 'Parasol kept them away',
      })
    } else if (uniqueDomains > 0) {
      notes.push({
        key: 'places',
        tone: 'ok',
        label: 'Today',
        title: `${uniqueDomains} place${uniqueDomains === 1 ? '' : 's'} visited`,
        detail: power ? 'Everything looks okay' : 'Shield is paused',
      })
    } else {
      notes.push({
        key: 'quiet',
        tone: 'ok',
        label: 'Status',
        title: 'All quiet',
        detail: 'No visits or warnings yet',
      })
    }
  }

  const shown = notes.slice(0, 3)

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#eef6f3] md:w-[320px] lg:w-[340px]">
      <div className="shrink-0 border-b border-hairline px-5 py-5">
        <p className="text-base font-bold uppercase tracking-wider text-brand">Your shield</p>
        <p className="mt-1 font-display text-4xl leading-tight text-ink">{power ? 'On' : 'Paused'}</p>
        <p className="mt-1 text-lg leading-snug text-ink-secondary">
          {power
            ? 'Parasol is watching out for you.'
            : 'A grown-up turned the shield off.'}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
        <h2 className="font-display text-3xl text-ink">What’s up</h2>
        <p className="mt-1 text-lg leading-snug text-ink-secondary">
          A quick look at your home internet.
        </p>

        <ul className="mt-4 space-y-3 overflow-y-auto pb-2">
          {shown.map((note) => (
            <li
              key={note.key}
              className={`rounded-2xl border-2 px-4 py-3.5 ${
                note.tone === 'warning'
                  ? 'border-[#f0c9c9] bg-[#fff7f7]'
                  : note.tone === 'info'
                    ? 'border-brand/20 bg-white'
                    : 'border-transparent bg-white/80'
              }`}
            >
              <p
                className={`text-base font-bold uppercase tracking-wide ${
                  note.tone === 'warning' ? 'text-critical' : 'text-brand'
                }`}
              >
                {note.label}
              </p>
              <p className="mt-1 text-xl font-semibold leading-snug text-ink">{note.title}</p>
              <p className="mt-0.5 text-lg text-ink-secondary">{note.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

export default KidsHome
