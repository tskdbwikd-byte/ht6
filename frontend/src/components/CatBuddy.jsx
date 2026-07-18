import { useEffect, useState } from 'react'
import { CAT_GROUND_OVERLAP, CAT_PAD_BOTTOM, CAT_RIGHT, CAT_SIZE, GROUND_H } from './catLayout'

const MESSAGES = [
  "I'm so glad you're here!",
  'My name is Patrick. Nice to meet you!',
  'The rain feels softer with a friend.',
]

const SHOW_MS = 5500
const HIDE_MS = 7000

function PixelHeart({ className = '', style }) {
  const p = 2
  const cells = [
    [1, 0],
    [2, 0],
    [4, 0],
    [5, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [2, 4],
    [3, 4],
    [4, 4],
    [3, 5],
  ]

  return (
    <svg
      width={7 * p}
      height={6 * p}
      viewBox={`0 0 ${7 * p} ${6 * p}`}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {cells.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x * p}
          y={y * p}
          width={p}
          height={p}
          fill="#e86b7a"
          shapeRendering="crispEdges"
        />
      ))}
    </svg>
  )
}

export default function CatBuddy({ hovered }) {
  const [index, setIndex] = useState(0)
  const [showing, setShowing] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer = 0

    const run = (showNext) => {
      if (cancelled) return
      if (showNext) {
        setShowing(true)
        timer = window.setTimeout(() => run(false), SHOW_MS)
      } else {
        setShowing(false)
        timer = window.setTimeout(() => {
          if (cancelled) return
          setIndex((value) => (value + 1) % MESSAGES.length)
          run(true)
        }, HIDE_MS)
      }
    }

    run(true)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const catBottom = GROUND_H - CAT_PAD_BOTTOM - CAT_GROUND_OVERLAP

  return (
    <div className="pointer-events-none absolute inset-0 z-[25]" aria-hidden="true">
      {/* Speech bubble — left of cat */}
      <div
        className="absolute transition-opacity duration-300"
        style={{
          right: CAT_RIGHT + CAT_SIZE + 8,
          bottom: catBottom + CAT_SIZE * 0.45,
          opacity: showing ? 1 : 0,
          maxWidth: 168,
        }}
      >
        <div
          className="relative bg-white px-3 py-2.5 text-[#1a2b28]"
          style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 8,
            lineHeight: 1.55,
            border: '3px solid #1a2b28',
            boxShadow: '3px 3px 0 #1a2b28',
            imageRendering: 'pixelated',
          }}
        >
          {MESSAGES[index]}
          {/* Pixel tail pointing toward the cat */}
          <span
            className="absolute top-1/2 -right-[9px] -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '8px solid #1a2b28',
            }}
          />
          <span
            className="absolute top-1/2 -right-[5px] -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderLeft: '6px solid #ffffff',
            }}
          />
        </div>
      </div>

      {/* Hearts — right of cat, only while hovered */}
      {hovered && (
        <div
          className="absolute"
          style={{
            right: 6,
            bottom: catBottom + CAT_SIZE * 0.55,
            width: 28,
            height: 56,
          }}
        >
          <PixelHeart className="absolute animate-cat-heart" style={{ left: 2, bottom: 28 }} />
          <PixelHeart
            className="absolute animate-cat-heart"
            style={{ left: 12, bottom: 40, animationDelay: '0.25s' }}
          />
          <PixelHeart
            className="absolute animate-cat-heart"
            style={{ left: 4, bottom: 48, animationDelay: '0.5s' }}
          />
        </div>
      )}
    </div>
  )
}

/** Hover zone includes a column above the cat so the umbrella can trigger hearts from overhead. */
export function isOverCat(x, y, width, height) {
  const left = width - CAT_RIGHT - CAT_SIZE * 0.92
  const right = width - CAT_RIGHT + 8
  const catTop = height - GROUND_H - CAT_SIZE * 0.78
  const top = catTop - 130
  const bottom = height - GROUND_H + CAT_GROUND_OVERLAP + 8
  return x >= left && x <= right && y >= top && y <= bottom
}
