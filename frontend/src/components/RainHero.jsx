import { useEffect, useRef, useState } from 'react'
import UmbrellaCursor, { UMBRELLA_HOTSPOT } from './UmbrellaCursor'
import CatBuddy, { isOverCat } from './CatBuddy'
import {
  CAT_GROUND_OVERLAP,
  CAT_PAD_BOTTOM,
  CAT_RIGHT,
  CAT_SIZE,
  GROUND_COLOR,
  GROUND_H,
} from './catLayout'

const PIXEL = 3
const DROP_W = 3
const DROP_H = 7
const UMBRELLA_P = 3
const UMBRELLA_RX = 9 * UMBRELLA_P
const UMBRELLA_RY = 5 * UMBRELLA_P
const UMBRELLA_DRY = 11 * UMBRELLA_P
const GRAVITY = 0.085
const DRIFT = 0.012
const FRICTION = 0.992
const CURSOR_LERP = 0.18
const CLOUD_COLORS = ['#d4e6ee', '#c5dce8', '#b8d4e2', '#a9cbdc']
const RAIN_COLOR = 'rgba(110, 150, 170, 0.28)'

export { GROUND_H, CAT_SIZE, CAT_RIGHT } from './catLayout'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
}

function cloudEmitBounds(cloud) {
  const p = cloud.p
  let minOx = Infinity
  let maxOx = -Infinity
  let maxBottom = -Infinity
  for (const blob of cloud.blobs) {
    minOx = Math.min(minOx, blob.ox)
    maxOx = Math.max(maxOx, blob.ox + blob.w)
    maxBottom = Math.max(maxBottom, blob.oy + blob.h)
  }
  return {
    left: cloud.x + minOx * p + p * 2,
    right: cloud.x + maxOx * p - p * 2,
    bottom: cloud.y + maxBottom * p,
  }
}

function createDrop(clouds, width, height, scatter = false) {
  if (!clouds.length) {
    return { x: 0, y: -10, vx: 0, vy: 1.5 }
  }

  const xTarget = Math.random() * width
  let cloud = clouds.find((c) => {
    const b = cloudEmitBounds(c)
    return xTarget >= b.left && xTarget <= b.right
  })
  if (!cloud) {
    cloud = clouds.reduce((best, c) => {
      const mid = cloudEmitBounds(c)
      const dist = Math.abs((mid.left + mid.right) / 2 - xTarget)
      if (!best || dist < best.dist) return { cloud: c, dist }
      return best
    }, null).cloud
  }

  const { left, right, bottom } = cloudEmitBounds(cloud)
  const span = Math.max(8, right - left)
  const x = left + Math.random() * span
  const fallRoom = Math.max(48, height - GROUND_H - bottom - 8)
  const y = scatter ? bottom + Math.random() * fallRoom : bottom + Math.random() * 6
  // Keep initial scatter above the ground
  const clampedY = Math.min(y, height - GROUND_H - DROP_H - 4)

  return {
    x,
    y: clampedY,
    vx: (Math.random() - 0.5) * 0.15,
    vy: 1.55 + Math.random() * 0.55,
  }
}

function buildClouds(width) {
  const clouds = []
  const cloudWidth = 40 * 3
  const step = Math.floor(cloudWidth * 0.62)
  let x = -cloudWidth * 0.35
  const driftDir = Math.random() < 0.5 ? -1 : 1

  while (x < width + cloudWidth) {
    const p = 3
    const blobs = [
      { ox: 0, oy: 10, w: 10, h: 6 },
      { ox: 5, oy: 5, w: 12, h: 8 },
      { ox: 12, oy: 1, w: 14, h: 10 },
      { ox: 22, oy: 4, w: 12, h: 9 },
      { ox: 30, oy: 9, w: 10, h: 7 },
      { ox: 6, oy: 11, w: 30, h: 7 },
      { ox: 10, oy: 7, w: 22, h: 8 },
      { ox: 16, oy: 3, w: 10, h: 6 },
    ]

    clouds.push({
      x: Math.round(x),
      y: Math.round(2 + Math.random() * 88),
      p,
      color: CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)],
      drift: driftDir * (0.1 + Math.random() * 0.05),
      blobs,
    })

    x += step
  }

  return clouds
}

function drawCloud(ctx, cloud) {
  const p = cloud.p
  ctx.fillStyle = cloud.color
  for (const blob of cloud.blobs) {
    ctx.fillRect(
      cloud.x + blob.ox * p,
      cloud.y + blob.oy * p,
      blob.w * p,
      blob.h * p,
    )
  }
}

function applyShelter(drop, ox, oy, rx, ry, dryDepth) {
  const dx = drop.x - ox
  const dy = drop.y - oy

  if (dy > 0 && dy < dryDepth && Math.abs(dx) < rx * 0.92) {
    const side = Math.sign(dx) || Math.sign(drop.vx) || (Math.random() < 0.5 ? -1 : 1)
    drop.x = ox + side * rx * 0.98
    drop.vx = side * (1.1 + Math.abs(drop.vy) * 0.35)
    drop.vy = Math.max(drop.vy * 0.85, 0.7)
    return
  }

  if (dy > ry * 0.2) return

  const nx = dx / rx
  const ny = dy / ry
  const mag = nx * nx + ny * ny
  if (mag >= 1 || mag < 0.00001) return

  const dist = Math.sqrt(mag)
  const unx = nx / dist
  const uny = ny / dist

  drop.x = ox + unx * rx
  drop.y = oy + uny * ry

  const side = Math.sign(dx) || Math.sign(drop.vx) || (Math.random() < 0.5 ? -1 : 1)
  let tx = -uny * (ry / rx)
  let ty = unx * (rx / ry)
  const tlen = Math.hypot(tx, ty) || 1
  tx /= tlen
  ty /= tlen
  if (tx * side < 0) {
    tx = -tx
    ty = -ty
  }

  const fallSpeed = Math.max(drop.vy, 0.7)
  const slide = fallSpeed * 1.05 + 0.2

  drop.vx = tx * slide
  drop.vy = Math.max(ty * slide, 0.5)
  drop.vx += side * 0.22
}

function applyUmbrella(drop, cx, cy, active) {
  if (!active) return
  applyShelter(drop, cx, cy - UMBRELLA_P * 0.5, UMBRELLA_RX, UMBRELLA_RY, UMBRELLA_DRY)
}

/** Cat head/shoulders shelter — tuned for the sitting pixel cat. */
function applyCat(drop, width, height) {
  const size = CAT_SIZE
  const left = width - CAT_RIGHT - size
  // Feet sit on the ground line; head hotspot above that
  const groundY = height - GROUND_H
  const ox = left + size * 0.42
  const oy = groundY - size * 0.58
  const rx = size * 0.3
  const ry = size * 0.2
  const dry = size * 0.55
  applyShelter(drop, ox, oy, rx, ry, dry)
}

export default function RainHero({ closed = false }) {
  const canvasRef = useRef(null)
  const cursorRef = useRef(null)
  const closedRef = useRef(closed)
  const [catHovered, setCatHovered] = useState(false)

  useEffect(() => {
    closedRef.current = closed
  }, [closed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduced = prefersReducedMotion()
    const touch = isCoarsePointer()
    const interactive = !reduced && !touch

    let width = 0
    let height = 0
    let dpr = 1
    let drops = []
    let clouds = []
    let raf = 0
    let running = true
    let wasOverCat = false

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, inside: false, seen: false }
    const umbrella = { x: 0, y: 0 }

    const root = canvas.parentElement

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      clouds = buildClouds(width)
      const density = Math.min(180, Math.max(64, Math.floor(width / 8)))
      drops = Array.from({ length: reduced ? Math.floor(density * 0.35) : density }, () =>
        createDrop(clouds, width, height, true),
      )
      umbrella.x = width * 0.5
      umbrella.y = height * 0.45
      mouse.targetX = umbrella.x
      mouse.targetY = umbrella.y
      mouse.x = umbrella.x
      mouse.y = umbrella.y
    }

    const onPointerMove = (event) => {
      if (!interactive) return
      mouse.targetX = event.clientX
      mouse.targetY = event.clientY
      mouse.inside = true
      mouse.seen = true
    }

    const onPointerLeave = () => {
      mouse.inside = false
      if (wasOverCat) {
        wasOverCat = false
        setCatHovered(false)
      }
    }

    const onVisibility = () => {
      running = document.visibilityState === 'visible'
      if (running && !raf) raf = requestAnimationFrame(frame)
    }

    if (interactive && root) {
      root.classList.add('cursor-none')
    }

    const frame = () => {
      raf = 0
      if (!running) return

      ctx.clearRect(0, 0, width, height)

      const grad = ctx.createLinearGradient(0, 0, 0, 200)
      grad.addColorStop(0, 'rgba(200, 224, 234, 0.35)')
      grad.addColorStop(1, 'rgba(200, 224, 234, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, 220)

      for (const cloud of clouds) {
        cloud.x += cloud.drift
        const wrap = width + 200
        if (cloud.x > width + 100) cloud.x -= wrap
        if (cloud.x < -120) cloud.x += wrap
        drawCloud(ctx, cloud)
      }

      if (interactive) {
        mouse.x += (mouse.targetX - mouse.x) * CURSOR_LERP
        mouse.y += (mouse.targetY - mouse.y) * CURSOR_LERP
        umbrella.x = mouse.x
        umbrella.y = mouse.y

        const el = cursorRef.current
        if (el && mouse.seen) {
          el.style.opacity = '1'
          el.style.transform = `translate3d(${umbrella.x - UMBRELLA_HOTSPOT.x}px, ${umbrella.y - UMBRELLA_HOTSPOT.y}px, 0)`
        } else if (el) {
          el.style.opacity = '0'
        }

        const over = mouse.inside && isOverCat(umbrella.x, umbrella.y, width, height)
        if (over !== wasOverCat) {
          wasOverCat = over
          setCatHovered(over)
        }
      }

      const groundY = height - GROUND_H
      const activeUmbrella = interactive && mouse.inside && !closedRef.current

      ctx.fillStyle = RAIN_COLOR
      for (const drop of drops) {
        drop.vy += GRAVITY
        drop.vx += (Math.random() - 0.5) * DRIFT

        applyUmbrella(drop, umbrella.x, umbrella.y, activeUmbrella)
        applyCat(drop, width, height)

        drop.vx *= FRICTION
        drop.vy = Math.min(Math.max(drop.vy, 0.05), 4.5)
        if (drop.vy < 0) drop.vy = 0.25

        drop.x += drop.vx
        drop.y += drop.vy

        if (drop.y + DROP_H >= groundY || drop.x < -20 || drop.x > width + 20) {
          Object.assign(drop, createDrop(clouds, width, height, false))
          continue
        }

        const px = Math.round(drop.x / PIXEL) * PIXEL
        const py = Math.round(drop.y / PIXEL) * PIXEL
        ctx.fillRect(px, py, DROP_W, DROP_H)
      }

      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      if (root) root.classList.remove('cursor-none')
    }
  }, [])

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5]"
        style={{ height: GROUND_H, backgroundColor: GROUND_COLOR }}
        aria-hidden="true"
      />

      <img
        src="/cat.gif"
        alt=""
        width={CAT_SIZE}
        height={CAT_SIZE}
        className="pointer-events-none absolute z-[15] select-none"
        style={{
          right: CAT_RIGHT,
          bottom: GROUND_H - CAT_PAD_BOTTOM - CAT_GROUND_OVERLAP,
          width: CAT_SIZE,
          height: CAT_SIZE,
          imageRendering: 'pixelated',
        }}
        aria-hidden="true"
        draggable={false}
      />

      <CatBuddy hovered={catHovered} />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        aria-hidden="true"
      />
      <UmbrellaCursor ref={cursorRef} closed={closed} />
    </>
  )
}
