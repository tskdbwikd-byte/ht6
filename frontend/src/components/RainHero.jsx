import { useEffect, useRef } from 'react'

const PIXEL = 3
const UMBRELLA_RADIUS = 88
const GRAVITY = 0.045
const DRIFT = 0.012
const FRICTION = 0.985
const REPULSE = 0.55
const TANGENT = 0.38
const CURSOR_LERP = 0.12
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
    vx: (Math.random() - 0.5) * 0.15,
    vy: 0.8 + Math.random() * 1.1,
    size: PIXEL + (Math.random() > 0.7 ? PIXEL : 0),
    length: PIXEL * (1 + Math.floor(Math.random() * 2)),
  }
}

function buildClouds(width) {
  const clouds = []
  const bandHeight = 72
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

  return { clouds, bandHeight }
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

/**
 * Soft dome force: radial push + tangential slide so drops curve around the cursor.
 */
function applyUmbrella(drop, cx, cy, radius, active) {
  if (!active) return

  const dx = drop.x - cx
  const dy = drop.y - cy
  const distSq = dx * dx + dy * dy
  const r = radius
  if (distSq >= r * r || distSq < 0.0001) return

  const dist = Math.sqrt(distSq)
  const nx = dx / dist
  const ny = dy / dist
  // Stronger near the rim contact and softer deeper inside for a dome feel
  const t = 1 - dist / r
  const soft = t * t * (3 - 2 * t) // smoothstep
  const force = soft * REPULSE

  // Radial out (blocked / shed)
  drop.vx += nx * force * 1.15
  drop.vy += ny * force * 0.55

  // Tangential slide so motion curves around instead of bouncing straight back
  const tx = -ny
  const ty = nx
  const side = dx >= 0 ? 1 : -1
  drop.vx += tx * side * soft * TANGENT
  drop.vy += ty * side * soft * TANGENT * 0.35

  // Slightly lift drops that hit the top of the dome so they spill off
  if (dy < 0) {
    drop.vy -= soft * 0.2
  }
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

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0, inside: false }
    const umbrella = { x: 0, y: 0 }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const density = Math.min(140, Math.max(48, Math.floor(width / 10)))
      drops = Array.from({ length: reduced ? Math.floor(density * 0.35) : density }, () =>
        createDrop(width, height, true),
      )
      clouds = buildClouds(width).clouds
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
    }

    const onPointerLeave = () => {
      mouse.inside = false
    }

    const onVisibility = () => {
      running = document.visibilityState === 'visible'
      if (running && !raf) raf = requestAnimationFrame(frame)
    }

    const frame = () => {
      raf = 0
      if (!running) return

      ctx.clearRect(0, 0, width, height)

      // Soft sky wash behind clouds
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
        drop.vy = Math.min(drop.vy, 3.2)
        drop.x += drop.vx
        drop.y += drop.vy

        if (drop.y > height + 12 || drop.x < -20 || drop.x > width + 20) {
          Object.assign(drop, createDrop(width, height, false))
        }

        const px = Math.round(drop.x / PIXEL) * PIXEL
        const py = Math.round(drop.y / PIXEL) * PIXEL
        ctx.fillRect(px, py, drop.size, drop.length)
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
