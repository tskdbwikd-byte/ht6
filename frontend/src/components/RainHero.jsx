import { useEffect, useRef } from 'react'

const PIXEL = 3
const DROP_W = 2
const DROP_H = 5
const UMBRELLA_RADIUS = 110
const GRAVITY = 0.055
const DRIFT = 0.01
const FRICTION = 0.992
const CURSOR_LERP = 0.18
const CLOUD_COLORS = ['#d4e6ee', '#c5dce8', '#b8d4e2', '#a9cbdc']
const RAIN_COLOR = 'rgba(110, 150, 170, 0.45)'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
}

function createDrop(width, height, randomY = false) {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -Math.random() * 40 - 8,
    vx: (Math.random() - 0.5) * 0.12,
    vy: 1.0 + Math.random() * 0.35,
  }
}

function buildClouds(width) {
  const clouds = []
  let x = -40

  while (x < width + 80) {
    const baseY = 8 + Math.random() * 28
    const scale = 0.7 + Math.random() * 0.55
    const color = CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)]
    const blobs = [
      { ox: 0, oy: 10, w: 10, h: 6 },
      { ox: 6, oy: 4, w: 12, h: 8 },
      { ox: 14, oy: 0, w: 14, h: 10 },
      { ox: 24, oy: 4, w: 12, h: 8 },
      { ox: 32, oy: 10, w: 10, h: 6 },
      { ox: 8, oy: 12, w: 28, h: 6 },
    ]

    clouds.push({
      x,
      y: baseY,
      scale,
      color,
      drift: (Math.random() - 0.5) * 0.08,
      blobs,
    })

    x += 48 + Math.random() * 36
  }

  return clouds
}

function drawCloud(ctx, cloud) {
  const p = PIXEL
  ctx.fillStyle = cloud.color
  for (const blob of cloud.blobs) {
    ctx.fillRect(
      Math.round(cloud.x + blob.ox * cloud.scale * p),
      Math.round(cloud.y + blob.oy * cloud.scale * p),
      Math.round(blob.w * cloud.scale * p),
      Math.round(blob.h * cloud.scale * p),
    )
  }
}

/** Pixel umbrella drawn with hotspot at canopy center (cx, cy). */
function drawUmbrellaCursor(ctx, cx, cy) {
  const p = 5
  const ox = Math.round(cx - 7 * p)
  const oy = Math.round(cy - 3 * p)

  const fill = (x, y, w, h, color) => {
    ctx.fillStyle = color
    ctx.fillRect(ox + x * p, oy + y * p, w * p, h * p)
  }

  fill(6, 0, 2, 1, '#3D8A7C') // tip
  fill(2, 3, 1, 1, '#4A9B8C')
  fill(3, 2, 1, 1, '#5BB3A3')
  fill(4, 1, 1, 1, '#4A9B8C')
  fill(5, 1, 4, 1, '#5BB3A3')
  fill(9, 1, 1, 1, '#4A9B8C')
  fill(10, 2, 1, 1, '#5BB3A3')
  fill(11, 3, 1, 1, '#4A9B8C')
  fill(2, 3, 10, 1, '#3D8A7C')
  fill(3, 4, 8, 1, '#357a6e')
  fill(6, 5, 2, 8, '#6B7C85') // pole
}

/**
 * Canopy collision: drops stay on the dome surface and slide downhill
 * (outward + downward). Never bounce upward.
 */
function applyUmbrella(drop, cx, cy, radius, active) {
  if (!active) return

  const dx = drop.x - cx
  const dy = drop.y - cy

  // Only the canopy (upper dome). Below the rim, rain falls freely.
  if (dy > radius * 0.2) return

  const distSq = dx * dx + dy * dy
  const r = radius
  if (distSq >= r * r) return

  const dist = Math.sqrt(distSq) || 0.0001
  const nx = dx / dist
  const ny = dy / dist

  // Past the lower sides of the circle → shed outward and fall
  if (ny > 0.05) {
    const side = Math.sign(dx) || Math.sign(drop.vx) || 1
    drop.vx += side * 0.35
    drop.vy = Math.max(drop.vy, 0.85)
    return
  }

  // Snap to outer surface (blocked by fabric)
  const surface = r + 0.75
  drop.x = cx + nx * surface
  drop.y = cy + ny * surface

  // Downhill tangent: slide away from the apex along the dome
  const side = Math.sign(dx) || Math.sign(drop.vx) || (Math.random() < 0.5 ? -1 : 1)
  let tx = -ny
  let ty = nx
  if (tx * side < 0) {
    tx = -tx
    ty = -ty
  }

  // Keep motion along the canopy, always with a downward component
  const fallSpeed = Math.max(drop.vy, 0.55)
  const slide = fallSpeed * 1.05 + 0.15

  drop.vx = tx * slide
  drop.vy = Math.max(ty * slide, 0.4)

  // Extra outward slip so drops clear the rim instead of oscillating
  drop.vx += side * 0.15
}

export default function RainHero() {
  const canvasRef = useRef(null)

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

      const density = Math.min(180, Math.max(64, Math.floor(width / 8)))
      drops = Array.from({ length: reduced ? Math.floor(density * 0.35) : density }, () =>
        createDrop(width, height, true),
      )
      clouds = buildClouds(width)
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

      const grad = ctx.createLinearGradient(0, 0, 0, 120)
      grad.addColorStop(0, 'rgba(200, 224, 234, 0.35)')
      grad.addColorStop(1, 'rgba(200, 224, 234, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, 140)

      for (const cloud of clouds) {
        cloud.x += cloud.drift
        if (cloud.x > width + 60) cloud.x = -80
        if (cloud.x < -90) cloud.x = width + 40
        drawCloud(ctx, cloud)
      }

      if (interactive) {
        mouse.x += (mouse.targetX - mouse.x) * CURSOR_LERP
        mouse.y += (mouse.targetY - mouse.y) * CURSOR_LERP
        umbrella.x = mouse.x
        umbrella.y = mouse.y
      }

      const activeUmbrella = interactive && mouse.inside

      ctx.fillStyle = RAIN_COLOR
      for (const drop of drops) {
        drop.vy += GRAVITY
        drop.vx += (Math.random() - 0.5) * DRIFT

        applyUmbrella(drop, umbrella.x, umbrella.y, UMBRELLA_RADIUS, activeUmbrella)

        drop.vx *= FRICTION
        drop.vy = Math.min(Math.max(drop.vy, 0.05), 3.4)
        // Hard rule: after umbrella contact handling, never allow upward motion
        if (drop.vy < 0) drop.vy = 0.25

        drop.x += drop.vx
        drop.y += drop.vy

        if (drop.y > height + 12 || drop.x < -20 || drop.x > width + 20) {
          Object.assign(drop, createDrop(width, height, false))
        }

        const px = Math.round(drop.x / PIXEL) * PIXEL
        const py = Math.round(drop.y / PIXEL) * PIXEL
        ctx.fillRect(px, py, DROP_W, DROP_H)
      }

      if (interactive && mouse.seen) {
        drawUmbrellaCursor(ctx, umbrella.x, umbrella.y)
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
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}
