import { forwardRef } from 'react'

const COLORS = {
  tip: '#2f6f64',
  light: '#5BB3A3',
  mid: '#4A9B8C',
  deep: '#3D8A7C',
  dark: '#357a6e',
  rib: '#2f6f64',
  pole: '#6B7C85',
  poleShade: '#5a6a72',
  handle: '#4a5960',
}

const P = 3

function Pixel({ x, y, w = 1, h = 1, fill }) {
  return (
    <rect
      x={x * P}
      y={y * P}
      width={w * P}
      height={h * P}
      fill={fill}
      shapeRendering="crispEdges"
    />
  )
}

function OpenUmbrellaArt() {
  return (
    <>
      <Pixel x={7} y={0} w={2} fill={COLORS.tip} />
      <Pixel x={5} y={1} w={6} fill={COLORS.light} />
      <Pixel x={3} y={2} w={10} fill={COLORS.mid} />
      <Pixel x={2} y={3} w={12} fill={COLORS.mid} />
      <Pixel x={1} y={4} w={14} fill={COLORS.deep} />
      <Pixel x={0} y={5} w={16} fill={COLORS.deep} />
      <Pixel x={0} y={6} w={16} fill={COLORS.dark} />

      <Pixel x={4} y={2} h={4} fill={COLORS.rib} />
      <Pixel x={8} y={1} h={5} fill={COLORS.rib} />
      <Pixel x={11} y={2} h={4} fill={COLORS.rib} />

      <Pixel x={0} y={7} w={3} fill={COLORS.rib} />
      <Pixel x={3} y={7} fill={COLORS.dark} />
      <Pixel x={4} y={7} w={3} fill={COLORS.rib} />
      <Pixel x={7} y={7} w={2} fill={COLORS.dark} />
      <Pixel x={9} y={7} w={3} fill={COLORS.rib} />
      <Pixel x={12} y={7} fill={COLORS.dark} />
      <Pixel x={13} y={7} w={3} fill={COLORS.rib} />

      <Pixel x={7} y={8} w={2} h={7} fill={COLORS.pole} />
      <Pixel x={7} y={8} h={7} fill={COLORS.poleShade} />

      <Pixel x={7} y={15} w={2} fill={COLORS.poleShade} />
      <Pixel x={5} y={16} w={4} fill={COLORS.handle} />
      <Pixel x={4} y={15} w={2} fill={COLORS.handle} />
      <Pixel x={4} y={14} fill={COLORS.handle} />
    </>
  )
}

function ClosedUmbrellaArt() {
  return (
    <>
      <Pixel x={7} y={0} w={2} fill={COLORS.tip} />
      <Pixel x={6} y={1} w={4} fill={COLORS.light} />
      <Pixel x={6} y={2} w={4} fill={COLORS.mid} />
      <Pixel x={5} y={3} w={6} fill={COLORS.mid} />
      <Pixel x={5} y={4} w={6} fill={COLORS.deep} />
      <Pixel x={6} y={5} w={4} fill={COLORS.deep} />
      <Pixel x={6} y={6} w={4} fill={COLORS.dark} />
      <Pixel x={6} y={7} w={4} fill={COLORS.rib} />

      <Pixel x={7} y={1} h={7} fill={COLORS.rib} />
      <Pixel x={8} y={2} h={5} fill={COLORS.dark} />

      <Pixel x={7} y={8} w={2} h={7} fill={COLORS.pole} />
      <Pixel x={7} y={8} h={7} fill={COLORS.poleShade} />

      <Pixel x={7} y={15} w={2} fill={COLORS.poleShade} />
      <Pixel x={5} y={16} w={4} fill={COLORS.handle} />
      <Pixel x={4} y={15} w={2} fill={COLORS.handle} />
      <Pixel x={4} y={14} fill={COLORS.handle} />
    </>
  )
}

export const UMBRELLA_VIEW_W = 16 * P
export const UMBRELLA_VIEW_H = 17 * P
export const UMBRELLA_HOTSPOT = { x: 8 * P, y: 4 * P }

const UmbrellaCursor = forwardRef(function UmbrellaCursor({ closed = false }, ref) {
  return (
    <svg
      ref={ref}
      width={UMBRELLA_VIEW_W}
      height={UMBRELLA_VIEW_H}
      viewBox={`0 0 ${UMBRELLA_VIEW_W} ${UMBRELLA_VIEW_H}`}
      className="pointer-events-none fixed left-0 top-0 z-50"
      style={{ opacity: 0, willChange: 'transform' }}
      aria-hidden="true"
    >
      {closed ? <ClosedUmbrellaArt /> : <OpenUmbrellaArt />}
    </svg>
  )
})

export default UmbrellaCursor
