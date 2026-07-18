import { OpenUmbrellaMark } from './UmbrellaCursor'

export function ParasolMark({ className = 'h-8 w-8', ...props }) {
  return <OpenUmbrellaMark className={className} {...props} />
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
