export function ParasolMark({ className = 'h-8 w-8', ...props }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" fill="#E8F4F1" />
      <rect x="6" y="8" width="4" height="4" fill="#4A9B8C" />
      <rect x="10" y="6" width="4" height="4" fill="#5BB3A3" />
      <rect x="14" y="4" width="4" height="4" fill="#4A9B8C" />
      <rect x="18" y="6" width="4" height="4" fill="#5BB3A3" />
      <rect x="22" y="8" width="4" height="4" fill="#4A9B8C" />
      <rect x="8" y="10" width="16" height="4" fill="#3D8A7C" />
      <rect x="14" y="14" width="4" height="12" fill="#6B7C85" />
      <rect x="10" y="26" width="12" height="2" fill="#8A9AA3" />
    </svg>
  )
}

export function Logo({ size = 'md', showWordmark = true, className = '' }) {
  const markSize = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <ParasolMark className={markSize} />
      {showWordmark && (
        <span className={`font-display font-normal tracking-tight text-ink ${textSize}`}>
          Parasol
        </span>
      )}
    </span>
  )
}
